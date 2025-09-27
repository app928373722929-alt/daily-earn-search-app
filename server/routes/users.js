const express = require('express');
const router = express.Router();

// Get user data
router.post('/data', async (req, res) => {
    const { userId, userData } = req.body;

    try {
        let user = await getUser(userId);
        
        if (!user) {
            // Create new user
            user = await createUser(userId, userData);
        } else {
            // Update last active
            await updateLastActive(userId);
        }

        res.json({ success: true, user: user });
    } catch (error) {
        res.json({ success: false, error: error.message });
    }
});

// Update user coins
router.post('/update-coins', async (req, res) => {
    const { userId, coins } = req.body;

    try {
        await updateUserCoins(userId, coins);
        res.json({ success: true, message: 'Coins updated' });
    } catch (error) {
        res.json({ success: false, error: error.message });
    }
});

// Database functions
function getUser(userId) {
    return new Promise((resolve, reject) => {
        db.get('SELECT * FROM users WHERE telegram_id = ?', [userId], (err, row) => {
            if (err) reject(err);
            else resolve(row);
        });
    });
}

function createUser(userId, userData) {
    return new Promise((resolve, reject) => {
        db.run(
            `INSERT INTO users (telegram_id, username, first_name, last_name, coins, total_earned, daily_streak, last_active) 
             VALUES (?, ?, ?, ?, 0, 0, 0, CURRENT_TIMESTAMP)`,
            [userId, userData.username, userData.first_name, userData.last_name],
            function(err) {
                if (err) reject(err);
                else resolve({
                    telegram_id: userId,
                    username: userData.username,
                    first_name: userData.first_name,
                    coins: 0,
                    daily_streak: 0
                });
            }
        );
    });
}

function updateLastActive(userId) {
    return new Promise((resolve, reject) => {
        db.run('UPDATE users SET last_active = CURRENT_TIMESTAMP WHERE telegram_id = ?', [userId], (err) => {
            if (err) reject(err);
            else resolve();
        });
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

module.exports = router;
