const express = require('express');
const router = express.Router();

// Database instance
const db = require('../server').db;

// Save game result
router.post('/save', async (req, res) => {
    const { userId, gameType, score, coinsEarned } = req.body;

    try {
        await saveGameResult(userId, gameType, score, coinsEarned);
        await updateUserCoins(userId, coinsEarned);
        
        res.json({
            success: true,
            message: 'Game result saved successfully',
            coinsEarned: coinsEarned
        });
    } catch (error) {
        res.json({ success: false, error: error.message });
    }
});

// Get user game statistics
router.get('/stats/:userId', async (req, res) => {
    const userId = req.params.userId;
    
    try {
        const stats = await getGameStats(userId);
        res.json({ success: true, stats: stats });
    } catch (error) {
        res.json({ success: false, error: error.message });
    }
});

// Database functions
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
            'UPDATE users SET coins = coins + ?, total_earned = total_earned + ? WHERE telegram_id = ?',
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

module.exports = router;
