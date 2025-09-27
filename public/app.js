class DailyEarnApp {
    constructor() {
        this.tg = window.Telegram.WebApp;
        this.user = this.tg.initDataUnsafe?.user;
        this.userData = null;
        this.searchCount = 0;
        this.gameCount = 0;
        this.init();
    }

    async init() {
        this.tg.expand();
        this.tg.enableClosingConfirmation();
        
        if (this.user) {
            await this.loadUserData();
            await this.loadPopularSearches();
            await this.loadGameStats();
            this.setupDailyWelcome();
            this.setupEventListeners();
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

    async loadGameStats() {
        try {
            const response = await fetch(`/api/games/stats/${this.user.id}`);
            const data = await response.json();
            
            if (data.success) {
                this.updateGameStats(data.stats);
            }
        } catch (error) {
            console.error('Error loading game stats:', error);
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
                await this.loadUserData();
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
                <p>You earned <strong>${result.coinsEarned} coins</strong> for ${result.category} search</p>
                <div class="search-results">
                    ${result.results.map(item => `
                        <div class="result-item">
                            <strong>${item.title}</strong>
                            <span class="value">${item.value}</span>
                            <small>${item.detail}</small>
                        </div>
                    `).join('')}
                </div>
                <button class="btn-close" onclick="closeResults()">Continue Searching</button>
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
                console.log('Popular searches loaded');
            }
        } catch (error) {
            console.error('Error loading popular searches:', error);
        }
    }

    updateUI() {
        if (this.userData) {
            document.getElementById('userCoins').textContent = this.userData.coins.toLocaleString();
            document.getElementById('streakDays').textContent = this.userData.daily_streak || 0;
            
            // Update streak progress
            const streakProgress = document.getElementById('streakProgress');
            streakProgress.value = this.userData.daily_streak || 0;
            
            if (this.userData.daily_streak >= 3) {
                document.getElementById('streakRewardBtn').disabled = false;
            }
        }
    }

    updateGameStats(stats) {
        stats.forEach(stat => {
            if (stat.game_type === 'clicker') {
                document.getElementById('clickerHighScore').textContent = stat.high_score || 0;
            } else if (stat.game_type === 'typing') {
                document.getElementById('typingHighScore').textContent = stat.high_score || 0;
            }
        });
    }

    updateSearchProgress() {
        const progress = document.getElementById('searchProgress');
        progress.value = this.searchCount;
        
        if (this.searchCount >= 5) {
            document.getElementById('searchRewardBtn').disabled = false;
        }
    }

    updateGameProgress() {
        this.gameCount++;
        const progress = document.getElementById('gameProgress');
        progress.value = this.gameCount;
        
        if (this.gameCount >= 2) {
            document.getElementById('gameRewardBtn').disabled = false;
        }
    }

    async claimReward(type) {
        const rewards = {
            search: { coins: 25, message: 'Search mission completed!' },
            games: { coins: 20, message: 'Game mission completed!' },
            streak: { coins: 50, message: '3-day streak achieved!' }
        };

        const reward = rewards[type];
        if (!reward) return;

        try {
            const response = await fetch('/api/users/update-coins', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: this.user.id,
                    coins: reward.coins
                })
            });

            const result = await response.json();
            
            if (result.success) {
                this.showSuccess(reward.message + ` +${reward.coins} coins!`);
                await this.loadUserData();
            }
        } catch (error) {
            this.showError('Failed to claim reward');
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

    showSuccess(message) {
        this.tg.showPopup({
            title: '✅ Success',
            message: message,
            buttons: [{ type: 'default', text: 'OK' }]
        });
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

    setupEventListeners() {
        // Enter key for search
        document.getElementById('searchInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.performSearch(e.target.value);
            }
        });
    }
}

// Global functions
function handleKeyPress(event) {
    if (event.key === 'Enter') {
        performSearch();
    }
}

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

function openService(service) {
    quickSearch(service + ' today');
}

function showComingSoon() {
    if (window.app) {
        window.app.showError('This game is coming soon!');
    }
}

function claimReward(type) {
    if (window.app) {
        window.app.claimReward(type);
    }
}

async function requestWithdrawal() {
    const amount = parseInt(document.getElementById('withdrawAmount').value);
    const uid = document.getElementById('binanceUid').value.trim();

    if (!amount || amount < 1000) {
        alert('Minimum withdrawal: 1000 coins ($1)');
        return;
    }

    if (!uid) {
        alert('Please enter your Binance UID');
        return;
    }

    if (!window.app || !window.app.userData) {
        alert('Please wait, loading user data...');
        return;
    }

    if (amount > window.app.userData.coins) {
        alert('Insufficient balance');
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
