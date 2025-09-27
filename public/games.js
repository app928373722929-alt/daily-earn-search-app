class MiniGames {
    constructor() {
        this.games = {
            clicker: {
                name: "Click Master",
                coinsPerClick: 1,
                highScore: 0
            },
            typing: {
                name: "Typing Race", 
                coinsPerWord: 2,
                highScore: 0
            },
            memory: {
                name: "Memory Game",
                coinsPerMatch: 5,
                highScore: 0
            }
        };
        this.currentGame = null;
    }

    // Clicker Game
    startClickerGame() {
        this.currentGame = 'clicker';
        let clickCount = 0;
        let timeLeft = 30;
        
        const gameHTML = `
            <div class="game-screen">
                <div class="game-header">
                    <h3>🎯 Click Master</h3>
                    <div class="game-stats">
                        <span>Time: <span id="timeLeft">30</span>s</span>
                        <span>Clicks: <span id="clickCount">0</span></span>
                        <span>Coins: <span id="coinsEarned">0</span></span>
                    </div>
                </div>
                <div class="game-area">
                    <button class="click-target" onclick="games.handleClick()">
                        CLICK ME!<br>+1 coin per click
                    </button>
                </div>
                <button class="btn-exit" onclick="games.exitGame()">Exit Game</button>
            </div>
        `;
        
        document.getElementById('gameContainer').innerHTML = gameHTML;
        this.startTimer(timeLeft);
    }

    handleClick() {
        if (this.currentGame === 'clicker') {
            const clickCountElem = document.getElementById('clickCount');
            const coinsElem = document.getElementById('coinsEarned');
            
            let clicks = parseInt(clickCountElem.textContent) + 1;
            let coins = parseInt(coinsElem.textContent) + 1;
            
            clickCountElem.textContent = clicks;
            coinsElem.textContent = coins;
            
            // Add animation
            this.showClickAnimation();
        }
    }

    startTimer(seconds) {
        const timerElem = document.getElementById('timeLeft');
        let timeLeft = seconds;
        
        const timer = setInterval(() => {
            timeLeft--;
            timerElem.textContent = timeLeft;
            
            if (timeLeft <= 0) {
                clearInterval(timer);
                this.endGame();
            }
        }, 1000);
    }

    async endGame() {
        const clicks = parseInt(document.getElementById('clickCount').textContent);
        const coins = parseInt(document.getElementById('coinsEarned').textContent);
        
        // Save game result
        await this.saveGameResult('clicker', clicks, coins);
        
        // Show results
        const resultsHTML = `
            <div class="game-results">
                <h3>🎉 Game Over!</h3>
                <p>Total Clicks: <strong>${clicks}</strong></p>
                <p>Coins Earned: <strong>${coins}</strong> 🪙</p>
                <button onclick="games.claimCoins(${coins})">Claim Coins</button>
                <button onclick="games.restartGame()">Play Again</button>
            </div>
        `;
        
        document.querySelector('.game-area').innerHTML = resultsHTML;
    }

    async saveGameResult(gameType, score, coins) {
        try {
            const response = await fetch('/api/games/save', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: window.app.user.id,
                    gameType: gameType,
                    score: score,
                    coinsEarned: coins
                })
            });
            return await response.json();
        } catch (error) {
            console.error('Error saving game:', error);
        }
    }

    async claimCoins(coins) {
        await window.app.updateUserCoins(coins);
        this.exitGame();
    }

    exitGame() {
        document.getElementById('gameContainer').innerHTML = '';
        this.currentGame = null;
        window.app.loadUserData(); // Refresh balance
    }

    showClickAnimation() {
        const animation = document.createElement('div');
        animation.className = 'click-animation';
        animation.textContent = '+1 🪙';
        document.querySelector('.game-area').appendChild(animation);
        
        setTimeout(() => animation.remove(), 1000);
    }
}

// Global game functions
function startGame(gameType) {
    if (!window.games) {
        window.games = new MiniGames();
    }
    
    switch(gameType) {
        case 'clicker':
            window.games.startClickerGame();
            break;
        case 'typing':
            window.games.startTypingGame();
            break;
        case 'memory':
            window.games.startMemoryGame();
            break;
    }
}

// Initialize games
let games;
