const express = require('express');
const router = express.Router();

// Database instance
const db = require('../server').db;

// Request withdrawal
router.post('/request', async (req, res) => {
    const { userId, amount, binanceUid } = req.body;

    try {
        // Check user balance
        const user = await getUser(userId);
        if (!user) {
            return res.json({ success: false, error: 'User not found' });
        }

        if (user.coins < amount) {
            return res.json({ success: false, error: 'Insufficient balance' });
        }

        if (amount < 1000) {
            return res.json({ success: false, error: 'Minimum withdrawal: 1000 coins' });
        }

        // Create payment request
        const paymentId = await createPaymentRequest(userId, amount, binanceUid);
        
        // Deduct coins from user
        await updateUserCoins(userId, -amount);
        
        res.json({
            success: true,
            message: 'Withdrawal request submitted successfully',
            paymentId: paymentId
        });

    } catch (error) {
        res.json({ success: false, error: error.message });
    }
});

// Get payment history for user
router.get('/history/:userId', async (req, res) => {
    const userId = req.params.userId;
    
    try {
        const history = await getPaymentHistory(userId);
        res.json({ success: true, history: history });
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

function updateUserCoins(userId, coins) {
    return new Promise((resolve, reject) => {
        db.run(
            'UPDATE users SET coins = coins + ? WHERE telegram_id = ?',
            [coins, userId],
            (err) => {
                if (err) reject(err);
                else resolve();
            }
        );
    });
}

function createPaymentRequest(userId, amount, binanceUid) {
    return new Promise((resolve, reject) => {
        db.run(
            `INSERT INTO payments (user_id, amount, binance_uid, status) 
             VALUES ((SELECT id FROM users WHERE telegram_id = ?), ?, ?, 'pending')`,
            [userId, amount, binanceUid],
            function(err) {
                if (err) reject(err);
                else resolve(this.lastID);
            }
        );
    });
}

function getPaymentHistory(userId) {
    return new Promise((resolve, reject) => {
        db.all(
            `SELECT * FROM payments WHERE user_id = (SELECT id FROM users WHERE telegram_id = ?) 
             ORDER BY created_at DESC LIMIT 10`,
            [userId],
            (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            }
        );
    });
}

module.exports = router;
