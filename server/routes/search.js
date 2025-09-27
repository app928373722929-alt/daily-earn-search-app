const express = require('express');
const router = express.Router();
const db = require('./db'); // ডাটাবেস ইম্পোর্ট যোগ করুন

// পপুলার সার্চ ক্যাটেগরিস
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

// ডাটাবেস ফাংশনগুলো
function recordSearch(userId, query, category, coinsEarned) {
    return new Promise((resolve, reject) => {
        db.run(
            `INSERT INTO searches (user_id, query, category, coins_earned) 
             VALUES ((SELECT id FROM users WHERE telegram_id = ?), ?, ?, ?)`,
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
            `UPDATE users SET balance = balance + ?, total_earnings = total_earnings + ?, 
             last_active = CURRENT_TIMESTAMP WHERE telegram_id = ?`,
            [coins, coins, userId],
            (err) => {
                if (err) reject(err);
                else resolve();
            }
        );
    });
}

function detectCategory(query) {
    const lowerQuery = query.toLowerCase();
    
    for (const [category, data] of Object.entries(SEARCH_CATEGORIES)) {
        if (data.keywords.some(keyword => lowerQuery.includes(keyword))) {
            return category;
        }
    }
    return 'general';
}

function getSearchResults(query, category) {
    // সিমুলেটেড সার্চ রেজাল্ট
    const results = {
        crypto: [
            { title: 'Bitcoin (BTC) Price', value: '$42,150', change: '+2.5%' },
            { title: 'Ethereum (ETH) Price', value: '$2,850', change: '+1.8%' },
            { title: 'BNB Price', value: '$310', change: '+0.9%' }
        ],
        weather: [
            { title: 'Dhaka Weather', value: '28°C', detail: 'Partly Cloudy' },
            { title: 'Chittagong', value: '30°C', detail: 'Sunny' },
            { title: 'Tomorrow Forecast', value: '27°C', detail: 'Possible Rain' }
        ],
        news: [
            { title: 'Breaking News', value: 'Important update', detail: '2 hours ago' },
            { title: 'Sports News', value: 'Match results', detail: 'Latest' },
            { title: 'Technology', value: 'New gadget launch', detail: 'Today' }
        ]
    };

    return Promise.resolve(results[category] || [{ title: 'Search Results', value: 'Information', detail: 'Relevant data' }]);
}

// সার্চ করে কয়েন আর্ন করুন
router.post('/earn', async (req, res) => {
    const { userId, query } = req.body;

    if (!userId || !query) {
        return res.status(400).json({ success: false, error: 'User ID and query are required' });
    }

    try {
        // ক্যাটেগরি ডিটেক্ট করুন
        const category = detectCategory(query);
        const coinsEarned = SEARCH_CATEGORIES[category]?.coins || 2;

        // সার্চ রেকর্ড করুন
        await recordSearch(userId, query, category, coinsEarned);

        // ইউজার কয়েন আপডেট করুন
        await updateUserCoins(userId, coinsEarned);

        // সার্চ রেজাল্ট পান
        const searchResults = await getSearchResults(query, category);

        res.json({
            success: true,
            coinsEarned: coinsEarned,
            category: category,
            results: searchResults,
            message: `You earned ${coinsEarned} coins for searching!`
        });

    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ডেইলি পপুলার সার্চেস পান
router.get('/popular', (req, res) => {
    const popularSearches = [
        { query: 'Bitcoin price today', category: 'crypto', coins: 3 },
        { query: 'Weather in Dhaka', category: 'weather', coins: 2 },
        { query: 'Latest cricket scores', category: 'sports', coins: 3 },
        { query: 'New movie releases', category: 'movies', coins: 3 },
        { query: 'iPhone price Bangladesh', category: 'shopping', coins: 3 }
    ];

    res.json({ success: true, popular: popularSearches });
});

module.exports = router;
