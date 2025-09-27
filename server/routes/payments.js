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

function updateUserCoins(userId, coins) {
    return new Promise((resolve, reject) => {
        db.run(
            'UPDATE users SET balance = balance + ? WHERE telegram_id = ?',
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

// উইথড্রয়াল রিকোয়েস্ট করুন
router.post('/request', async (req, res) => {
    const { userId, amount, binanceUid } = req.body;

    if (!userId || !amount || !binanceUid) {
        return res.status(400).json({ success: false, error: 'Missing required fields' });
    }

    try {
        // ইউজার ব্যালেন্স চেক করুন
        const user = await getUser(userId);
        if (!user) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }

        if (user.balance < amount) {
            return res.status(400).json({ success: false, error: 'Insufficient balance' });
        }

        if (amount < 1000) {
            return res.status(400).json({ success: false, error: 'Minimum withdrawal: 1000 coins' });
        }

        // পেমেন্ট রিকোয়েস্ট তৈরি করুন
        const paymentId = await createPaymentRequest(userId, amount, binanceUid);
        
        // ইউজার থেকে কয়েন কাটুন
        await updateUserCoins(userId, -amount);
        
        res.json({
            success: true,
            message: 'Withdrawal request submitted successfully',
            paymentId: paymentId
        });

    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ইউজারের পেমেন্ট হিস্ট্রি পান
router.get('/history/:userId', async (req, res) => {
    const userId = req.params.userId;
    
    if (!userId) {
        return res.status(400).json({ success: false, error: 'User ID is required' });
    }
    
    try {
        const history = await getPaymentHistory(userId);
        res.json({ success: true, history: history });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;
