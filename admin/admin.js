class AdminPanel {
    constructor() {
        this.authToken = 'admin123';
        this.init();
    }

    async init() {
        await this.loadStats();
        await this.loadPendingPayments();
        this.setupEventListeners();
    }

    async loadStats() {
        try {
            const response = await fetch('/admin/users/all', {
                headers: { 'Authorization': this.authToken }
            });
            const data = await response.json();
            
            if (data.success) {
                document.getElementById('totalUsers').textContent = data.users.length;
                
                const totalCoins = data.users.reduce((sum, user) => sum + user.coins, 0);
                document.getElementById('totalCoins').textContent = totalCoins.toLocaleString();
            }
        } catch (error) {
            console.error('Error loading stats:', error);
        }
    }

    async loadPendingPayments() {
        try {
            const response = await fetch('/admin/payments/pending', {
                headers: { 'Authorization': this.authToken }
            });
            const data = await response.json();
            
            if (data.success) {
                this.renderPayments(data.payments);
            }
        } catch (error) {
            console.error('Error loading payments:', error);
        }
    }

    renderPayments(payments) {
        const container = document.getElementById('paymentsList');
        
        if (payments.length === 0) {
            container.innerHTML = '<p class="no-data">No pending payments</p>';
            return;
        }

        container.innerHTML = payments.map(payment => `
            <div class="payment-item">
                <div class="payment-info">
                    <strong>${payment.first_name} (ID: ${payment.telegram_id})</strong>
                    <span class="amount">${payment.amount} coins</span>
                </div>
                <div class="payment-details">
                    <p>Binance UID: <code>${payment.binance_uid}</code></p>
                    <p>Requested: ${new Date(payment.created_at).toLocaleString()}</p>
                </div>
                <div class="payment-actions">
                    <button onclick="admin.markAsPaid(${payment.id})" class="btn-paid">
                        ✅ Mark as Paid
                    </button>
                    <button onclick="admin.copyUID('${payment.binance_uid}')" class="btn-copy">
                        📋 Copy UID
                    </button>
                </div>
            </div>
        `).join('');
    }

    async markAsPaid(paymentId) {
        if (!confirm('Mark this payment as completed?')) return;

        try {
            const response = await fetch('/admin/payments/mark-paid', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': this.authToken
                },
                body: JSON.stringify({ paymentId: paymentId })
            });

            const result = await response.json();
            
            if (result.success) {
                alert('Payment marked as completed!');
                this.loadPendingPayments();
                this.loadStats();
            } else {
                alert('Error: ' + result.error);
            }
        } catch (error) {
            alert('Error: ' + error.message);
        }
    }

    copyUID(uid) {
        navigator.clipboard.writeText(uid).then(() => {
            alert('Binance UID copied to clipboard!');
        });
    }
}

// Initialize admin panel
const admin = new AdminPanel();
