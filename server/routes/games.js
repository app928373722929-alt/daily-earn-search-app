const express = require('express');
const router = express.Router();
const db = require('./db'); // সরাসরি ডাটাবেস ইম্পোর্ট

// ডাটাবেস ফাংশনগুলো
function saveGameResult(userId, gameType, score, coinsEarned) {
    return new Promise((resolve, reject) => {
        db.run(
            `INSERT INTO games (user_id, game_type, score, coins_earned) 
             VALUES ((SELECT id FROM users WHERE telegram_id = ?), ?, ?, ?)`,
            [userId, gameType, score, coinsEarned],
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
            'UPDATE users SET balance = balance + ?, total_earnings = total_earnings + ? WHERE telegram_id = ?',
            [coins, coins, userId],
            (err) => {
                if (err) reject(err);
                else resolve();
            }
        );
    });
}

function getGameStats(userId) {
    return new Promise((resolve, reject) => {
        db.all(
            `SELECT game_type, COUNT(*) as plays, SUM(coins_earned) as total_coins, MAX(score) as high_score
             FROM games WHERE user_id = (SELECT id FROM users WHERE telegram_id = ?)
             GROUP BY game_type`,
            [userId],
            (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            }
        );
    });
}

// গেম রেজাল্ট সেভ করুন
router.post('/save', async (req, res) => {
    const { userId, gameType, score, coinsEarned } = req.body;

    if (!userId || !gameType || score === undefined) {
        return res.status(400).json({ success: false, error: 'Missing required fields' });
    }

    try {
        await saveGameResult(userId, gameType, score, coinsEarned || 0);
        await updateUserCoins(userId, coinsEarned || 0);
        
        res.json({
            success: true,
            message: 'Game result saved successfully',
            coinsEarned: coinsEarned || 0
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ইউজার গেম স্ট্যাটিস্টিক্স পান
router.get('/stats/:userId', async (req, res) => {
    const userId = req.params.userId;
    
    if (!userId) {
        return res.status(400).json({ success: false, error: 'User ID is required' });
    }
    
    try {
        const stats = await getGameStats(userId);
        res.json({ success: true, stats: stats });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;
