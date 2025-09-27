// Admin Panel Configuration
const CONFIG = {
    API_BASE: '../api',
    ADMIN_PASSWORD: 'admin123' // Production এ change করুন
};

// Utility Functions
const Utils = {
    escapeHTML: (str) => {
        if (!str) return '';
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    },
    
    showLoading: (element) => {
        if (element) {
            element.innerHTML = '<div class="loading">⏳ Loading...</div>';
        }
    }
};

class AdminPanel {
    constructor() {
        this.authToken = 'admin123';
        this.currentPayment = null;
        this.currentUser = null;
        this.allPayments = [];
        this.allUsers = [];
        this.init();
    }

    async init() {
        if (!this.isAuthenticated()) {
            this.showLogin();
            return;
        }

        await this.loadAllData();
        this.setupEventListeners();
    }

    isAuthenticated() {
        return localStorage.getItem('adminAuthenticated') === 'true';
    }

    showLogin() {
        const loginHTML = `
            <div class="login-container">
                <div class="login-form">
                    <h2>🔒 Admin Login</h2>
                    <input type="password" id="adminPassword" placeholder="Enter admin password">
                    <button onclick="admin.login()">Login</button>
                    <p class="login-hint">Default password: admin123</p>
                </div>
            </div>
        `;
        document.querySelector('.admin-container').innerHTML = loginHTML;
    }

    login() {
        const password = document.getElementById('adminPassword').value;
        if (password === CONFIG.ADMIN_PASSWORD) {
            localStorage.setItem('adminAuthenticated', 'true');
            location.reload();
        } else {
            alert('Invalid password!');
        }
    }

    logout() {
        localStorage.removeItem('adminAuthenticated');
        location.reload();
    }

    async loadAllData() {
        await this.loadStats();
        await this.loadPendingPayments();
        await this.loadAllUsers();
        await this.loadPaymentHistory();
    }

    async makeApiCall(endpoint) {
        try {
            // Mock data for demonstration - Replace with actual API calls
            return await this.getMockData(endpoint);
        } catch (error) {
            console.error('API Error:', error);
            return { success: false, error: error.message };
        }
    }

    // Mock data for demonstration
    async getMockData(endpoint) {
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const mockData = {
            '/admin/stats': {
                success: true,
                stats: {
                    total_users: 150,
                    total_coins: 45000,
                    total_earned: 1200
                }
            },
            '/admin/payments/pending': {
                success: true,
                payments: [
                    {
                        id: 1,
                        telegram_id: 123456789,
                        first_name: 'John',
                        amount: 1000,
                        binance_uid: 'UID123456789',
                        created_at: new Date().toISOString()
                    },
                    {
                        id: 2,
                        telegram_id: 987654321,
                        first_name: 'Alice',
                        amount: 1500,
                        binance_uid: 'UID987654321',
                        created_at: new Date().toISOString()
                    }
                ]
            },
            '/admin/users/all': {
                success: true,
                users: [
                    {
                        telegram_id: 123456789,
                        first_name: 'John',
                        last_name: 'Doe',
                        username: 'johndoe',
                        coins: 500,
                        total_earned: 1500,
                        daily_streak: 7,
                        binance_uid: 'UID123456789',
                        created_at: new Date().toISOString(),
                        last_active: new Date().toISOString()
                    },
                    {
                        telegram_id: 987654321,
                        first_name: 'Alice',
                        last_name: 'Smith',
                        username: 'alicesmith',
                        coins: 1200,
                        total_earned: 2700,
                        daily_streak: 14,
                        binance_uid: 'UID987654321',
                        created_at: new Date().toISOString(),
                        last_active: new Date().toISOString()
                    }
                ]
            },
            '/admin/payments/history': {
                success: true,
                history: [
                    {
                        id: 1001,
                        user_id: 111222333,
                        first_name: 'Bob',
                        amount: 1000,
                        binance_uid: 'UID111222333',
                        status: 'completed',
                        processed_at: new Date().toISOString()
                    }
                ]
            }
        };

        return mockData[endpoint] || { success: false, error: 'Endpoint not found' };
    }

    async loadStats() {
        try {
            const data = await this.makeApiCall('/admin/stats');
            if (data.success) {
                this.updateStats(data.stats);
            }
        } catch (error) {
            this.showNotification('❌ Error loading stats', 'error');
        }
    }

    async loadPendingPayments() {
        try {
            Utils.showLoading(document.getElementById('paymentsList'));
            const data = await this.makeApiCall('/admin/payments/pending');
            
            if (data.success) {
                this.allPayments = data.payments;
                this.renderPayments(this.allPayments);
                document.getElementById('pendingPayments').textContent = data.payments.length;
            }
        } catch (error) {
            this.showNotification('❌ Error loading payments', 'error');
        }
    }

    async loadAllUsers() {
        try {
            Utils.showLoading(document.getElementById('usersList'));
            const data = await this.makeApiCall('/admin/users/all');
            
            if (data.success) {
                this.allUsers = data.users;
                this.renderUsers(this.allUsers);
            }
        } catch (error) {
            this.showNotification('❌ Error loading users', 'error');
        }
    }

    async loadPaymentHistory() {
        try {
            Utils.showLoading(document.getElementById('paymentHistory'));
            const data = await this.makeApiCall('/admin/payments/history');
            
            if (data.success) {
                this.renderPaymentHistory(data.history);
            }
        } catch (error) {
            this.showNotification('❌ Error loading history', 'error');
        }
    }

    updateStats(stats) {
        document.getElementById('totalUsers').textContent = stats.total_users || 0;
        document.getElementById('totalCoins').textContent = (stats.total_coins || 0).toLocaleString();
        document.getElementById('totalEarned').textContent = (stats.total_earned || 0).toLocaleString();
    }

    renderPayments(payments) {
        const container = document.getElementById('paymentsList');
        
        if (!payments || payments.length === 0) {
            container.innerHTML = `
                <div class="no-data">
                    <p>🎉 No pending payments!</p>
                    <p>All payments have been processed.</p>
                </div>
            `;
            return;
        }

        container.innerHTML = payments.map(payment => `
            <div class="payment-item" data-user-id="${Utils.escapeHTML(payment.telegram_id.toString())}">
                <div class="payment-header">
                    <div class="user-info">
                        <strong>${Utils.escapeHTML(payment.first_name || 'User')} (ID: ${payment.telegram_id})</strong>
                        <span class="payment-date">${new Date(payment.created_at).toLocaleString()}</span>
                    </div>
                    <div class="payment-amount">${payment.amount} coins</div>
                </div>
                
                <div class="payment-details">
                    <p><strong>Binance UID:</strong> 
                        <code class="binance-uid">${Utils.escapeHTML(payment.binance_uid)}</code>
                        <button class="btn-copy" onclick="admin.copyToClipboard('${Utils.escapeHTML(payment.binance_uid)}')">📋 Copy</button>
                    </p>
                    <p><strong>Status:</strong> <span class="status-pending">⏳ Pending</span></p>
                </div>

                <div class="payment-actions">
                    <button class="btn-process" onclick="admin.processPayment(${payment.id})">
                        💰 Process Payment
                    </button>
                    <button class="btn-details" onclick="admin.viewUserDetails(${payment.telegram_id})">
                        👁️ User Details
                    </button>
                </div>
            </div>
        `).join('');
    }

    renderUsers(users) {
        const container = document.getElementById('usersList');
        if (!container) return;
        
        if (!users || users.length === 0) {
            container.innerHTML = '<div class="no-data">No users found.</div>';
            return;
        }

        container.innerHTML = users.map(user => `
            <div class="user-card">
                <div class="user-header">
                    <div class="user-avatar">${Utils.escapeHTML(user.first_name ? user.first_name.charAt(0).toUpperCase() : 'U')}</div>
                    <div class="user-info">
                        <strong>${Utils.escapeHTML(user.first_name || 'User')} ${Utils.escapeHTML(user.last_name || '')}</strong>
                        <span>@${Utils.escapeHTML(user.username || 'no-username')}</span>
                        <small>ID: ${user.telegram_id}</small>
                    </div>
                </div>
                
                <div class="user-stats">
                    <div class="stat">
                        <span>Coins</span>
                        <strong>${user.coins}</strong>
                    </div>
                    <div class="stat">
                        <span>Earned</span>
                        <strong>${user.total_earned}</strong>
                    </div>
                    <div class="stat">
                        <span>Streak</span>
                        <strong>${user.daily_streak || 0}d</strong>
                    </div>
                </div>

                <div class="user-actions">
                    <button class="btn-info" onclick="admin.viewUserDetails(${user.telegram_id})">
                        📊 Details
                    </button>
                    ${user.coins >= 1000 ? `
                        <button class="btn-payment" onclick="admin.createPaymentRequest(${user.telegram_id})">
                            💸 Create Payment
                        </button>
                    ` : ''}
                </div>
            </div>
        `).join('');
    }

    renderPaymentHistory(history) {
        const container = document.getElementById('paymentHistory');
        if (!container) return;
        
        if (!history || history.length === 0) {
            container.innerHTML = '<div class="no-data">No payment history found.</div>';
            return;
        }

        container.innerHTML = history.map(payment => `
            <div class="history-item">
                <div class="history-main">
                    <div class="user-info">
                        <strong>${Utils.escapeHTML(payment.first_name || 'User')} (ID: ${payment.user_id})</strong>
                        <span class="amount">${payment.amount} coins</span>
                    </div>
                    <span class="status-completed">✅ Paid</span>
                </div>
                <div class="history-details">
                    <span><strong>UID:</strong> ${Utils.escapeHTML(payment.binance_uid)}</span>
                    <span><strong>Date:</strong> ${new Date(payment.processed_at).toLocaleString()}</span>
                    <span><strong>Transaction:</strong> #${payment.id}</span>
                </div>
            </div>
        `).join('');
    }

    async processPayment(paymentId) {
        const payment = this.allPayments.find(p => p.id === paymentId);
        if (!payment) return;

        this.currentPayment = payment;

        const modalHTML = `
            <div class="payment-summary">
                <h4>Payment Processing</h4>
                <div class="summary-item">
                    <strong>User:</strong> ${Utils.escapeHTML(payment.first_name)} (ID: ${payment.telegram_id})
                </div>
                <div class="summary-item">
                    <strong>Amount:</strong> ${payment.amount} coins ($${(payment.amount/1000).toFixed(2)})
                </div>
                <div class="summary-item">
                    <strong>Binance UID:</strong> 
                    <div class="uid-display">
                        <code>${Utils.escapeHTML(payment.binance_uid)}</code>
                        <button class="btn-copy-large" onclick="admin.copyToClipboard('${Utils.escapeHTML(payment.binance_uid)}')">
                            📋 Copy UID
                        </button>
                    </div>
                </div>
            </div>
            
            <div class="payment-instructions">
                <h5>📋 Processing Instructions:</h5>
                <ol>
                    <li>Copy the Binance UID above</li>
                    <li>Open your Binance app</li>
                    <li>Send $${(payment.amount/1000).toFixed(2)} USDT to this UID</li>
                    <li>Confirm the transaction is successful</li>
                    <li>Click "Mark as Paid" below</li>
                </ol>
            </div>

            <div class="payment-notes">
                <label for="adminNotes">Admin Notes (optional):</label>
                <textarea id="adminNotes" placeholder="Add any notes about this payment..."></textarea>
            </div>
        `;

        document.getElementById('paymentDetails').innerHTML = modalHTML;
        document.getElementById('paymentModal').style.display = 'block';
    }

    async markAsPaid() {
        if (!this.currentPayment) return;

        const adminNotes = document.getElementById('adminNotes').value;

        try {
            // Simulate API call
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            this.showNotification('✅ Payment marked as completed!');
            this.closePaymentModal();
            await this.loadAllData();
        } catch (error) {
            this.showNotification('❌ Error: ' + error.message, 'error');
        }
    }

    async viewUserDetails(userId) {
        try {
            const user = this.allUsers.find(u => u.telegram_id === userId);
            if (!user) return;

            this.currentUser = user;
            const paymentHistory = await this.getUserPaymentHistory(userId);

            const modalHTML = `
                <h3>User Details: ${Utils.escapeHTML(user.first_name)}</h3>
                <div class="user-details-grid">
                    <div class="detail-item">
                        <strong>Telegram ID:</strong> ${user.telegram_id}
                    </div>
                    <div class="detail-item">
                        <strong>Username:</strong> @${Utils.escapeHTML(user.username || 'N/A')}
                    </div>
                    <div class="detail-item">
                        <strong>Binance UID:</strong> ${Utils.escapeHTML(user.binance_uid || 'Not set')}
                    </div>
                    <div class="detail-item">
                        <strong>Current Balance:</strong> ${user.coins} coins
                    </div>
                    <div class="detail-item">
                        <strong>Total Earned:</strong> ${user.total_earned} coins
                    </div>
                    <div class="detail-item">
                        <strong>Daily Streak:</strong> ${user.daily_streak || 0} days
                    </div>
                    <div class="detail-item">
                        <strong>Joined:</strong> ${new Date(user.created_at).toLocaleDateString()}
                    </div>
                    <div class="detail-item">
                        <strong>Last Active:</strong> ${new Date(user.last_active).toLocaleDateString()}
                    </div>
                </div>

                <div class="payment-history">
                    <h4>Payment History:</h4>
                    ${paymentHistory.length > 0 ? `
                        <div class="history-mini">
                            ${paymentHistory.map(payment => `
                                <div class="history-item-mini">
                                    <span>${payment.amount} coins</span>
                                    <span class="status-${payment.status}">${payment.status}</span>
                                    <small>${new Date(payment.created_at).toLocaleDateString()}</small>
                                </div>
                            `).join('')}
                        </div>
                    ` : '<p>No payment history</p>'}
                </div>
            `;

            document.getElementById('userDetails').innerHTML = modalHTML;
            document.getElementById('userModal').style.display = 'block';

        } catch (error) {
            this.showNotification('Error loading user details', 'error');
        }
    }

    async getUserPaymentHistory(userId) {
        try {
            // Mock data - Replace with actual API call
            await new Promise(resolve => setTimeout(resolve, 300));
            return [
                { amount: 1000, status: 'completed', created_at: new Date().toISOString() },
                { amount: 500, status: 'completed', created_at: new Date().toISOString() }
            ];
        } catch (error) {
            return [];
        }
    }

    copyToClipboard(text) {
        navigator.clipboard.writeText(text).then(() => {
            this.showNotification('📋 Copied to clipboard!');
        }).catch(err => {
            this.showNotification('❌ Copy failed', 'error');
        });
    }

    closePaymentModal() {
        document.getElementById('paymentModal').style.display = 'none';
        this.currentPayment = null;
    }

    closeUserModal() {
        document.getElementById('userModal').style.display = 'none';
        this.currentUser = null;
    }

    showNotification(message, type = 'success') {
        // Remove existing notifications
        document.querySelectorAll('.notification').forEach(n => n.remove());
        
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px;
            background: ${type === 'error' ? '#ff4444' : '#4CAF50'};
            color: white;
            border-radius: 5px;
            z-index: 1000;
            animation: slideIn 0.3s ease;
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 3000);
    }

    setupEventListeners() {
        const searchInput = document.getElementById('searchPayment');
        if (searchInput) {
            searchInput.addEventListener('input', this.filterPayments.bind(this));
        }
    }

    filterPayments() {
        const searchTerm = document.getElementById('searchPayment').value.toLowerCase();
        const filteredPayments = this.allPayments.filter(payment => 
            (payment.first_name && payment.first_name.toLowerCase().includes(searchTerm)) ||
            payment.telegram_id.toString().includes(searchTerm) ||
            (payment.binance_uid && payment.binance_uid.toLowerCase().includes(searchTerm))
        );
        this.renderPayments(filteredPayments);
    }
}

// Tab navigation - FIXED
function showTab(tabName, event) {
    // Hide all tabs
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Remove active class from all buttons
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Show selected tab
    const tabElement = document.getElementById(`${tabName}-tab`);
    if (tabElement) {
        tabElement.classList.add('active');
    }
    
    // Activate clicked button
    if (event && event.target) {
        event.target.classList.add('active');
    }
}

// Global functions
function loadPendingPayments() {
    if (window.admin) {
        window.admin.loadPendingPayments();
    }
}

function loadAllUsers() {
    if (window.admin) {
        window.admin.loadAllUsers();
    }
}

function loadPaymentHistory() {
    if (window.admin) {
        window.admin.loadPaymentHistory();
    }
}

function loadDetailedStats() {
    if (window.admin) {
        window.admin.loadStats();
    }
}

function markAsPaid() {
    if (window.admin) {
        window.admin.markAsPaid();
    }
}

function closePaymentModal() {
    if (window.admin) {
        window.admin.closePaymentModal();
    }
}

function closeUserModal() {
    if (window.admin) {
        window.admin.closeUserModal();
    }
}

function logout() {
    if (window.admin) {
        window.admin.logout();
    }
}

// HTML এ event parameter যোগ করুন
document.addEventListener('DOMContentLoaded', () => {
    // HTML buttons update করতে হবে
    const navButtons = document.querySelectorAll('.nav-btn');
    navButtons.forEach(btn => {
        const onclick = btn.getAttribute('onclick');
        if (onclick && onclick.includes('showTab')) {
            const tabName = onclick.match(/showTab\('([^']+)'/)[1];
            btn.setAttribute('onclick', `showTab('${tabName}', event)`);
        }
    });

    admin = new AdminPanel();
    window.admin = admin;
});
