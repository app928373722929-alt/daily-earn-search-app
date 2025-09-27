const express = require('express');
const router = express.Router();
const db = require('./db'); // সরাসরি ডাটাবেস ইম্পোর্ট

// ডাটাবেস ফাংশনগুলো
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
            `INSERT INTO users (telegram_id, username, first_name, last_name, balance, total_earnings, daily_streak, last_active) 
             VALUES (?, ?, ?, ?, 0, 0, 0, CURRENT_TIMESTAMP)`,
            [userId, userData?.username, userData?.first_name, userData?.last_name],
            function(err) {
                if (err) reject(err);
                else {
                    // ক্রিয়েটেড ইউজার রিটার্ন করুন
                    db.get('SELECT * FROM users WHERE telegram_id = ?', [userId], (err, row) => {
                        if (err) reject(err);
                        else resolve(row);
                    });
                }
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
            'UPDATE users SET balance = balance + ?, total_earnings = total_earnings + ? WHERE telegram_id = ?',
            [coins, coins, userId],
            (err) => {
                if (err) reject(err);
                else resolve();
            }
        );
    });
}

// ইউজার ডাটা পান
router.post('/data', async (req, res) => {
    const { userId, userData } = req.body;

    if (!userId) {
        return res.status(400).json({ success: false, error: 'User ID is required' });
    }

    try {
        let user = await getUser(userId);
        
        if (!user) {
            // নতুন ইউজার তৈরি করুন
            if (!userData) {
                return res.status(400).json({ success: false, error: 'User data is required for new user' });
            }
            user = await createUser(userId, userData);
        } else {
            // লাস্ট অ্যাক্টিভ আপডেট করুন
            await updateLastActive(userId);
        }

        res.json({ success: true, user: user });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ইউজার কয়েন আপডেট করুন
router.post('/update-coins', async (req, res) => {
    const { userId, coins } = req.body;

    if (!userId || coins === undefined) {
        return res.status(400).json({ success: false, error: 'User ID and coins are required' });
    }

    try {
        await updateUserCoins(userId, coins);
        const user = await getUser(userId);
        res.json({ success: true, user: user });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;
