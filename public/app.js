class DailyEarnApp {
    constructor() {
        this.tg = window.Telegram.WebApp;
        this.user = this.tg.initDataUnsafe?.user;
        this.userData = null;
        this.searchCount = 0;
        this.init();
    }

    async init() {
        this.tg.expand();
        this.tg.enableClosingConfirmation();
        
        if (this.user) {
            await this.loadUserData();
            await this.loadPopularSearches();
            this.setupDailyWelcome();
        }
    }

    async loadUserData() {
        try {
            const response = await fetch('/api/users/data', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: this.user.id,
                    userData: this.user
                })
            });
            
            const data = await response.json();
            if (data.success) {
                this.userData = data.user;
                this.updateUI();
            }
        } catch (error) {
            console.error('Error loading user data:', error);
        }
    }

    async performSearch(query) {
        if (!query.trim()) {
            this.showError('Please enter a search query');
            return;
        }

        this.showLoading('Searching...');

        try {
            const response = await fetch('/api/search/earn', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: this.user.id,
                    query: query
                })
            });

            const result = await response.json();
            this.hideLoading();

            if (result.success) {
                this.searchCount++;
                this.updateSearchProgress();
                this.showSearchResults(result);
                this.showCoinsAnimation(result.coinsEarned);
                await this.loadUserData(); // Refresh balance
            } else {
                this.showError(result.error);
            }
        } catch (error) {
            this.hideLoading();
            this.showError('Search failed. Please try again.');
        }
    }

    showSearchResults(result) {
        const resultsHTML = `
            <div class="search-success">
                <h3>✅ Search Successful!</h3>
                <p>You earned <strong>${result.coinsEarned} coins</strong></p>
                <div class="search-results">
                    ${result.results.map(item => `
                        <div class="result-item">
                            <strong>${item.title}</strong>
                            <span>${item.value}</span>
                            <small>${item.detail}</small>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;

        document.getElementById('searchResults').innerHTML = resultsHTML;
        document.getElementById('resultsModal').style.display = 'block';
    }

    async loadPopularSearches() {
        try {
            const response = await fetch('/api/search/popular');
            const data = await response.json();
            
            if (data.success) {
                // Popular searches are already in HTML
                console.log('Popular searches loaded:', data.popular);
            }
        } catch (error) {
            console.error('Error loading popular searches:', error);
        }
    }

    updateUI() {
        if (this.userData) {
            document.getElementById('userCoins').textContent = this.userData.coins;
            document.getElementById('streakDays').textContent = this.userData.daily_streak;
        }
    }

    updateSearchProgress() {
        const progress = document.getElementById('searchProgress');
        progress.value = this.searchCount;
        
        if (this.searchCount >= 5) {
            document.querySelector('[onclick="claimReward(\'search\')"]').disabled = false;
        }
    }

    showCoinsAnimation(coins) {
        const animation = document.createElement('div');
        animation.className = 'coins-animation';
        animation.textContent = `+${coins} 🪙`;
        document.body.appendChild(animation);

        setTimeout(() => animation.remove(), 2000);
    }

    showLoading(message) {
        this.tg.showPopup({
            title: '⏳',
            message: message,
            buttons: []
        });
    }

    hideLoading() {
        this.tg.closePopup();
    }

    showError(message) {
        this.tg.showPopup({
            title: '❌ Error',
            message: message,
            buttons: [{ type: 'default', text: 'OK' }]
        });
    }

    setupDailyWelcome() {
        const messages = [
            `Welcome back, ${this.user.first_name}! Ready to earn?`,
            "Daily bonuses are waiting for you!",
            "What would you like to search today?",
            "Complete missions and earn extra coins!"
        ];

        const randomMsg = messages[Math.floor(Math.random() * messages.length)];
        
        setTimeout(() => {
            this.tg.showPopup({
                title: '👋 Hello!',
                message: randomMsg,
                buttons: [{ type: 'default', text: "Let's Go! 🚀" }]
            });
        }, 1500);
    }
}

// Global functions
function performSearch() {
    const query = document.getElementById('searchInput').value;
    if (window.app) {
        window.app.performSearch(query);
    }
}

function quickSearch(query) {
    document.getElementById('searchInput').value = query;
    performSearch();
}

function closeResults() {
    document.getElementById('resultsModal').style.display = 'none';
}

function openWithdrawal() {
    document.getElementById('withdrawalModal').style.display = 'block';
}

function closeWithdrawal() {
    document.getElementById('withdrawalModal').style.display = 'none';
}

async function requestWithdrawal() {
    const amount = parseInt(document.getElementById('withdrawAmount').value);
    const uid = document.getElementById('binanceUid').value;

    if (amount < 1000) {
        alert('Minimum withdrawal: 1000 coins');
        return;
    }

    if (!uid) {
        alert('Please enter your Binance UID');
        return;
    }

    try {
        const response = await fetch('/api/payments/request', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                userId: window.app.user.id,
                amount: amount,
                binanceUid: uid
            })
        });

        const result = await response.json();
        
        if (result.success) {
            alert('Withdrawal request submitted! Admin will process it within 24 hours.');
            closeWithdrawal();
            window.app.loadUserData();
        } else {
            alert('Error: ' + result.error);
        }
    } catch (error) {
        alert('Network error. Please try again.');
    }
}

// Initialize app
let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new DailyEarnApp();
    window.app = app;
});
