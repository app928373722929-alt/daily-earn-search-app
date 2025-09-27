const express = require('express');
const router = express.Router();

// Database instance
const db = require('../server').db;

// Admin authentication middleware
const adminAuth = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (authHeader === 'admin123') {
        next();
    } else {
        res.status(401).json({ success: false, error: 'Unauthorized' });
    }
};

// Get all pending payments
router.get('/payments/pending', adminAuth, async (req, res) => {
    try {
        const payments = await getPendingPayments();
        res.json({ success: true, payments: payments });
    } catch (error) {
        res.json({ success: false, error: error.message });
    }
});

// Get all users
router.get('/users/all', adminAuth, async (req, res) => {
    try {
        const users = await getAllUsers();
        res.json({ success: true, users: users });
    } catch (error) {
        res.json({ success: false, error: error.message });
    }
});

// Get payment history
router.get('/payments/history', adminAuth, async (req, res) => {
    try {
        const history = await getPaymentHistory();
        res.json({ success: true, history: history });
    } catch (error) {
        res.json({ success: false, error: error.message });
    }
});

// Mark payment as paid
router.post('/payments/mark-paid', adminAuth, async (req, res) => {
    const { paymentId } = req.body;
    
    try {
        await markPaymentAsPaid(paymentId);
        res.json({ success: true, message: 'Payment marked as completed' });
    } catch (error) {
        res.json({ success: false, error: error.message });
    }
});

// Get system statistics
router.get('/stats', adminAuth, async (req, res) => {
    try {
        const stats = await getSystemStats();
        res.json({ success: true, stats: stats });
    } catch (error) {
        res.json({ success: false, error: error.message });
    }
});

// Database functions
function getPendingPayments() {
    return new Promise((resolve, reject) => {
        db.all(`
            SELECT p.*, u.username, u.first_name, u.telegram_id 
            FROM payments p 
            JOIN users u ON p.user_id = u.id 
            WHERE p.status = 'pending'
            ORDER BY p.created_at DESC
        `, (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
}

function getAllUsers() {
    return new Promise((resolve, reject) => {
        db.all('SELECT * FROM users ORDER BY created_at DESC', (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
}

function getPaymentHistory() {
    return new Promise((resolve, reject) => {
        db.all(`
            SELECT p.*, u.username, u.first_name 
            FROM payments p 
            JOIN users u ON p.user_id = u.id 
            WHERE p.status = 'completed'
            ORDER BY p.processed_at DESC 
            LIMIT 50
        `, (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
}

function markPaymentAsPaid(paymentId) {
    return new Promise((resolve, reject) => {
        db.run(
            'UPDATE payments SET status = "completed", processed_at = CURRENT_TIMESTAMP WHERE id = ?',
            [paymentId],
            (err) => {
                if (err) reject(err);
                else resolve();
            }
        );
    });
}

function getSystemStats() {
    return new Promise((resolve, reject) => {
        db.get(`
            SELECT 
                COUNT(*) as total_users,
                SUM(coins) as total_coins,
                SUM(total_earned) as total_earned,
                COUNT(DISTINCT user_id) as active_today
            FROM users
        `, (err, row) => {
            if (err) reject(err);
            else resolve(row);
        });
    });
}

module.exports = router;
