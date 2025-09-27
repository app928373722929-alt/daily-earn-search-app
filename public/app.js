class DailyEarnApp {
    constructor() {
        this.tg = window.Telegram?.WebApp;
        this.user = this.tg?.initDataUnsafe?.user;
        this.userData = null;
        this.searchCount = 0;
        this.gameCount = 0;
        this.init();
    }

    async init() {
        if (!this.tg) {
            console.error('Telegram WebApp not available');
            return;
        }

        this.tg.expand();
        if (this.tg.enableClosingConfirmation) {
            this.tg.enableClosingConfirmation();
        }
        
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
        if (!query || !query.trim()) {
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
                this.showCoinsAnimation(result.coinsEarned || 0);
                await this.loadUserData();
            } else {
                this.showError(result.error || 'Search failed');
            }
        } catch (error) {
            this.hideLoading();
            this.showError('Search failed. Please try again.');
        }
    }

    showSearchResults(result) {
        const searchResultsElem = document.getElementById('searchResults');
        const resultsModalElem = document.getElementById('resultsModal');
        
        if (!searchResultsElem || !resultsModalElem) return;

        const results = result.results || [];
        const coinsEarned = result.coinsEarned || 0;
        const category = result.category || 'general';

        const resultsHTML = `
            <div class="search-success">
                <h3>✅ Search Successful!</h3>
                <p>You earned <strong>${coinsEarned} coins</strong> for ${category} search</p>
                <div class="search-results">
                    ${results.length > 0 ? results.map(item => `
                        <div class="result-item">
                            <strong>${item.title || 'Result'}</strong>
                            <span class="value">${item.value || ''}</span>
                            <small>${item.detail || ''}</small>
                        </div>
                    `).join('') : '<p>No results found</p>'}
                </div>
                <button class="btn-close" onclick="closeResults()">Continue Searching</button>
            </div>
        `;

        searchResultsElem.innerHTML = resultsHTML;
        resultsModalElem.style.display = 'block';
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
        if (!this.userData) return;

        const userCoinsElem = document.getElementById('userCoins');
        const streakDaysElem = document.getElementById('streakDays');
        const streakProgressElem = document.getElementById('streakProgress');
        const streakRewardBtnElem = document.getElementById('streakRewardBtn');

        if (userCoinsElem) {
            userCoinsElem.textContent = (this.userData.coins || 0).toLocaleString();
        }
        if (streakDaysElem) {
            streakDaysElem.textContent = this.userData.daily_streak || 0;
        }
        if (streakProgressElem) {
            streakProgressElem.value = this.userData.daily_streak || 0;
        }
        if (streakRewardBtnElem && this.userData.daily_streak >= 3) {
            streakRewardBtnElem.disabled = false;
        }
    }

    updateGameStats(stats) {
        if (!stats || !Array.isArray(stats)) return;

        stats.forEach(stat => {
            if (stat.game_type === 'clicker') {
                const elem = document.getElementById('clickerHighScore');
                if (elem) elem.textContent = stat.high_score || 0;
            } else if (stat.game_type === 'typing') {
                const elem = document.getElementById('typingHighScore');
                if (elem) elem.textContent = stat.high_score || 0;
            }
        });
    }

    updateSearchProgress() {
        const progressElem = document.getElementById('searchProgress');
        const rewardBtnElem = document.getElementById('searchRewardBtn');
        
        if (progressElem) {
            progressElem.value = this.searchCount;
        }
        if (rewardBtnElem && this.searchCount >= 5) {
            rewardBtnElem.disabled = false;
        }
    }

    updateGameProgress() {
        this.gameCount++;
        const progressElem = document.getElementById('gameProgress');
        const rewardBtnElem = document.getElementById('gameRewardBtn');
        
        if (progressElem) {
            progressElem.value = this.gameCount;
        }
        if (rewardBtnElem && this.gameCount >= 2) {
            rewardBtnElem.disabled = false;
        }
    }

    async claimReward(type) {
        const rewards = {
            search: { coins: 25, message: 'Search mission completed!' },
            games: { coins: 20, message: 'Game mission completed!' },
            streak: { coins: 50, message: '3-day streak achieved!' }
        };

        const reward = rewards[type];
        if (!reward || !this.user) return;

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
            } else {
                this.showError('Failed to claim reward');
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

        setTimeout(() => {
            if (animation.parentNode) {
                animation.parentNode.removeChild(animation);
            }
        }, 2000);
    }

    showLoading(message) {
        if (this.tg && this.tg.showPopup) {
            this.tg.showPopup({
                title: '⏳',
                message: message,
                buttons: []
            });
        }
    }

    hideLoading() {
        if (this.tg && this.tg.closePopup) {
            this.tg.closePopup();
        }
    }

    showSuccess(message) {
        if (this.tg && this.tg.showPopup) {
            this.tg.showPopup({
                title: '✅ Success',
                message: message,
                buttons: [{ type: 'default', text: 'OK' }]
            });
        } else {
            alert(message);
        }
    }

    showError(message) {
        if (this.tg && this.tg.showPopup) {
            this.tg.showPopup({
                title: '❌ Error',
                message: message,
                buttons: [{ type: 'default', text: 'OK' }]
            });
        } else {
            alert(message);
        }
    }

    setupDailyWelcome() {
        if (!this.user || !this.tg || !this.tg.showPopup) return;

        const messages = [
            `Welcome back, ${this.user.first_name || 'User'}! Ready to earn?`,
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
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.performSearch(e.target.value);
                }
            });
        }
    }
}

// Global functions
function handleKeyPress(event) {
    if (event.key === 'Enter') {
        performSearch();
    }
}

function performSearch() {
    const searchInput = document.getElementById('searchInput');
    if (!searchInput) return;
    
    const query = searchInput.value;
    if (window.app) {
        window.app.performSearch(query);
    }
}

function quickSearch(query) {
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.value = query;
        performSearch();
    }
}

function closeResults() {
    const resultsModal = document.getElementById('resultsModal');
    if (resultsModal) {
        resultsModal.style.display = 'none';
    }
}

function openWithdrawal() {
    const withdrawalModal = document.getElementById('withdrawalModal');
    if (withdrawalModal) {
        withdrawalModal.style.display = 'block';
    }
}

function closeWithdrawal() {
    const withdrawalModal = document.getElementById('withdrawalModal');
    if (withdrawalModal) {
        withdrawalModal.style.display = 'none';
    }
}

function openService(service) {
    quickSearch(service + ' today');
}

function showComingSoon() {
    if (window.app) {
        window.app.showError('This game is coming soon!');
    } else {
        alert('This game is coming soon!');
    }
}

function claimReward(type) {
    if (window.app) {
        window.app.claimReward(type);
    }
}

async function requestWithdrawal() {
    const amountInput = document.getElementById('withdrawAmount');
    const uidInput = document.getElementById('binanceUid');
    
    if (!amountInput || !uidInput) return;

    const amount = parseInt(amountInput.value);
    const uid = uidInput.value.trim();

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
            if (window.app.loadUserData) {
                window.app.loadUserData();
            }
        } else {
            alert('Error: ' + (result.error || 'Request failed'));
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
