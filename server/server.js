const express = require('express');
const router = express.Router();
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Database connection
const dbPath = path.join(__dirname, '..', 'database.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database:', err.message);
    } else {
        console.log('Connected to SQLite database for search routes');
    }
});

// Popular search categories
const SEARCH_CATEGORIES = {
    'crypto': {
        name: 'Cryptocurrency Prices',
        keywords: ['bitcoin', 'ethereum', 'bnb', 'solana', 'crypto', 'price'],
        coins: 3
    },
    'weather': {
        name: 'Weather Updates',
        keywords: ['weather', 'temperature', 'rain', 'sunny', 'forecast'],
        coins: 2
    },
    'news': {
        name: 'Latest News',
        keywords: ['news', 'update', 'latest', 'breaking', 'headlines'],
        coins: 4
    },
    'sports': {
        name: 'Sports Scores',
        keywords: ['cricket', 'football', 'score', 'match', 'live'],
        coins: 3
    },
    'movies': {
        name: 'Movies & Entertainment',
        keywords: ['movie', 'film', 'trailer', 'hollywood', 'bollywood'],
        coins: 3
    },
    'shopping': {
        name: 'Product Prices',
        keywords: ['price', 'buy', 'shop', 'amazon', 'daraz', 'cost'],
        coins: 3
    },
    'technology': {
        name: 'Tech News',
        keywords: ['tech', 'technology', 'smartphone', 'laptop', 'gadget'],
        coins: 3
    },
    'health': {
        name: 'Health & Fitness',
        keywords: ['health', 'fitness', 'exercise', 'diet', 'yoga'],
        coins: 2
    }
};

// Process search and earn coins
router.post('/earn', async (req, res) => {
    const { userId, query } = req.body;

    if (!userId || !query) {
        return res.json({ 
            success: false, 
            error: 'User ID and query are required' 
        });
    }

    try {
        // Check if user exists
        const user = await getUser(userId);
        if (!user) {
            return res.json({ 
                success: false, 
                error: 'User not found' 
            });
        }

        // Detect category
        const category = detectCategory(query);
        const coinsEarned = SEARCH_CATEGORIES[category]?.coins || 2;

        // Record search
        await recordSearch(userId, query, category, coinsEarned);

        // Update user coins
        await updateUserCoins(userId, coinsEarned);

        // Get search results (simulated)
        const searchResults = getSearchResults(query, category);

        res.json({
            success: true,
            coinsEarned: coinsEarned,
            category: SEARCH_CATEGORIES[category]?.name || 'General Search',
            results: searchResults,
            message: `You earned ${coinsEarned} coins for searching!`,
            userBalance: user.coins + coinsEarned
        });

    } catch (error) {
        console.error('Search error:', error);
        res.json({ 
            success: false, 
            error: 'Internal server error' 
        });
    }
});

// Get user's search history
router.get('/history/:userId', async (req, res) => {
    const userId = req.params.userId;

    try {
        const history = await getSearchHistory(userId);
        res.json({
            success: true,
            history: history
        });
    } catch (error) {
        console.error('History error:', error);
        res.json({ 
            success: false, 
            error: 'Failed to fetch history' 
        });
    }
});

// Get daily popular searches
router.get('/popular', (req, res) => {
    const popularSearches = [
        { query: 'Bitcoin price today', category: 'crypto', coins: 3 },
        { query: 'Weather in Dhaka', category: 'weather', coins: 2 },
        { query: 'Latest cricket scores', category: 'sports', coins: 3 },
        { query: 'New movie releases', category: 'movies', coins: 3 },
        { query: 'iPhone price Bangladesh', category: 'shopping', coins: 3 },
        { query: 'Tech news today', category: 'technology', coins: 3 },
        { query: 'Fitness tips', category: 'health', coins: 2 },
        { query: 'Breaking news', category: 'news', coins: 4 }
    ];

    res.json({ 
        success: true, 
        popular: popularSearches 
    });
});

// Get user statistics
router.get('/stats/:userId', async (req, res) => {
    const userId = req.params.userId;

    try {
        const stats = await getUserSearchStats(userId);
        res.json({
            success: true,
            stats: stats
        });
    } catch (error) {
        console.error('Stats error:', error);
        res.json({ 
            success: false, 
            error: 'Failed to fetch stats' 
        });
    }
});

// Helper functions
function detectCategory(query) {
    const lowerQuery = query.toLowerCase();
    
    for (const [category, data] of Object.entries(SEARCH_CATEGORIES)) {
        if (data.keywords.some(keyword => lowerQuery.includes(keyword))) {
            return category;
        }
    }
    return 'general';
}

function getUser(userId) {
    return new Promise((resolve, reject) => {
        db.get(
            `SELECT * FROM users WHERE telegram_id = ?`,
            [userId],
            (err, row) => {
                if (err) reject(err);
                else resolve(row);
            }
        );
    });
}

function recordSearch(userId, query, category, coinsEarned) {
    return new Promise((resolve, reject) => {
        db.run(
            `INSERT INTO searches (user_id, query, category, coins_earned, created_at) 
             VALUES (?, ?, ?, ?, datetime('now'))`,
            [userId, query, category, coinsEarned],
            function(err) {
                if (err) reject(err);
                else resolve(this.lastID);
            }
        );
    });
}

function updateUserCoins(userId, coins) {
    return new Promise((resolve, reject) => {
        db.run(
            `UPDATE users SET 
                coins = coins + ?, 
                total_earned = total_earned + ?, 
                last_active = datetime('now') 
             WHERE telegram_id = ?`,
            [coins, coins, userId],
            function(err) {
                if (err) reject(err);
                else resolve(this.changes);
            }
        );
    });
}

function getSearchHistory(userId) {
    return new Promise((resolve, reject) => {
        db.all(
            `SELECT query, category, coins_earned, created_at 
             FROM searches 
             WHERE user_id = ? 
             ORDER BY created_at DESC 
             LIMIT 50`,
            [userId],
            (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            }
        );
    });
}

function getUserSearchStats(userId) {
    return new Promise((resolve, reject) => {
        db.get(
            `SELECT 
                COUNT(*) as total_searches,
                SUM(coins_earned) as total_coins_earned,
                COUNT(DISTINCT category) as unique_categories
             FROM searches 
             WHERE user_id = ?`,
            [userId],
            (err, row) => {
                if (err) reject(err);
                else resolve(row);
            }
        );
    });
}

function getSearchResults(query, category) {
    // Simulated search results based on category
    const results = {
        crypto: [
            { 
                title: 'Bitcoin (BTC) Price', 
                value: '$42,150', 
                change: '+2.5%',
                source: 'CoinMarketCap'
            },
            { 
                title: 'Ethereum (ETH) Price', 
                value: '$2,850', 
                change: '+1.8%',
                source: 'CoinGecko'
            },
            { 
                title: 'BNB Price', 
                value: '$310', 
                change: '+0.9%',
                source: 'Binance'
            }
        ],
        weather: [
            { 
                title: 'Dhaka Weather', 
                value: '28°C', 
                detail: 'Partly Cloudy',
                humidity: '65%'
            },
            { 
                title: 'Chittagong', 
                value: '30°C', 
                detail: 'Sunny',
                humidity: '70%'
            },
            { 
                title: 'Tomorrow Forecast', 
                value: '27°C', 
                detail: 'Possible Rain',
                humidity: '80%'
            }
        ],
        news: [
            { 
                title: 'Breaking News', 
                value: 'Important update', 
                detail: '2 hours ago',
                source: 'BBC News'
            },
            { 
                title: 'Sports News', 
                value: 'Match results', 
                detail: 'Latest',
                source: 'ESPN'
            },
            { 
                title: 'Technology', 
                value: 'New gadget launch', 
                detail: 'Today',
                source: 'TechCrunch'
            }
        ],
        sports: [
            {
                title: 'Cricket Match',
                value: 'Bangladesh vs India',
                detail: 'Live Score: 245/3',
                time: '45th over'
            },
            {
                title: 'Football',
                value: 'Premier League',
                detail: 'Manchester United 2-1',
                time: 'Full Time'
            }
        ],
        movies: [
            {
                title: 'New Releases',
                value: 'Action Movie 2024',
                detail: 'Rating: 8.5/10',
                genre: 'Action'
            }
        ],
        general: [
            { 
                title: 'Search Results for: ' + query, 
                value: 'Information found', 
                detail: 'Relevant data based on your query',
                source: 'Search Engine'
            }
        ]
    };

    return results[category] || results.general;
}

// Error handling middleware
router.use((error, req, res, next) => {
    console.error('Search route error:', error);
    res.json({ 
        success: false, 
        error: 'Internal server error' 
    });
});

module.exports = router;
