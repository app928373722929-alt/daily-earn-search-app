class MiniGames {
    constructor() {
        this.currentGame = null;
        this.gameInterval = null;
    }

    // Clicker Game
    startClickerGame() {
        this.currentGame = 'clicker';
        let clickCount = 0;
        let coinsEarned = 0;
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
                        CLICK ME!<br>
                        <small>+1 coin per click</small>
                    </button>
                </div>
                <button class="btn-exit" onclick="games.exitGame()">Exit Game</button>
            </div>
        `;
        
        // Create game container if not exists
        let gameContainer = document.getElementById('gameContainer');
        if (!gameContainer) {
            gameContainer = document.createElement('div');
            gameContainer.id = 'gameContainer';
            document.body.appendChild(gameContainer);
        }
        
        gameContainer.innerHTML = gameHTML;
        gameContainer.style.display = 'block';
        
        // Start timer
        this.startTimer(timeLeft);
        
        // Update app game count
        if (window.app) {
            window.app.updateGameProgress();
        }
    }

    handleClick() {
        if (this.currentGame === 'clicker') {
            const clickCountElem = document.getElementById('clickCount');
            const coinsElem = document.getElementById('coinsEarned');
            
            let clicks = parseInt(clickCountElem.textContent) + 1;
            let coins = parseInt(coinsElem.textContent) + 1;
            
            clickCountElem.textContent = clicks;
            coinsElem.textContent = coins;
            
            // Add click animation
            this.showClickAnimation();
        }
    }

    startTimer(seconds) {
        const timerElem = document.getElementById('timeLeft');
        let timeLeft = seconds;
        
        this.gameInterval = setInterval(() => {
            timeLeft--;
            timerElem.textContent = timeLeft;
            
            if (timeLeft <= 0) {
                clearInterval(this.gameInterval);
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
                <div class="result-stats">
                    <p>Total Clicks: <strong>${clicks}</strong></p>
                    <p>Coins Earned: <strong>${coins}</strong> 🪙</p>
                </div>
                <div class="result-actions">
                    <button class="btn-claim" onclick="games.claimCoins(${coins})">Claim Coins</button>
                    <button class="btn-restart" onclick="games.restartGame()">Play Again</button>
                </div>
            </div>
        `;
        
        document.querySelector('.game-area').innerHTML = resultsHTML;
    }

    async saveGameResult(gameType, score, coinsEarned) {
        try {
            const response = await fetch('/api/games/save', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: window.app.user.id,
                    gameType: gameType,
                    score: score,
                    coinsEarned: coinsEarned
                })
            });
            return await response.json();
        } catch (error) {
            console.error('Error saving game:', error);
        }
    }

    async claimCoins(coins) {
        if (window.app) {
            await window.app.updateUserCoins(coins);
            this.exitGame();
        }
    }

    restartGame() {
        this.exitGame();
        setTimeout(() => this.startClickerGame(), 500);
    }

    exitGame() {
        const gameContainer = document.getElementById('gameContainer');
        if (gameContainer) {
            gameContainer.style.display = 'none';
            gameContainer.innerHTML = '';
        }
        
        if (this.gameInterval) {
            clearInterval(this.gameInterval);
        }
        
        this.currentGame = null;
        
        // Refresh user data
        if (window.app) {
            window.app.loadUserData();
            window.app.loadGameStats();
        }
    }

    showClickAnimation() {
        const animation = document.createElement('div');
        animation.className = 'click-animation';
        animation.textContent = '+1 🪙';
        
        const gameArea = document.querySelector('.game-area');
        if (gameArea) {
            gameArea.appendChild(animation);
            
            setTimeout(() => {
                if (animation.parentNode) {
                    animation.parentNode.removeChild(animation);
                }
            }, 1000);
        }
    }

    // Typing Game (Basic version)
    startTypingGame() {
        this.currentGame = 'typing';
        
        const words = [
            'javascript', 'telegram', 'crypto', 'bitcoin', 'ethereum',
            'programming', 'website', 'mobile', 'computer', 'internet'
        ];
        
        const gameHTML = `
            <div class="game-screen">
                <div class="game-header">
                    <h3>⌨️ Typing Race</h3>
                    <div class="game-stats">
                        <span>Words: <span id="wordsTyped">0</span>/10</span>
                        <span>Coins: <span id="typingCoins">0</span></span>
                    </div>
                </div>
                <div class="game-area">
                    <div class="word-display" id="currentWord">${words[0]}</div>
                    <input type="text" id="wordInput" placeholder="Type the word..." autocomplete="off">
                    <div class="typing-instructions">
                        Type the word correctly to earn 2 coins!
                    </div>
                </div>
                <button class="btn-exit" onclick="games.exitGame()">Exit Game</button>
            </div>
        `;
        
        let gameContainer = document.getElementById('gameContainer');
        if (!gameContainer) {
            gameContainer = document.createElement('div');
            gameContainer.id = 'gameContainer';
            document.body.appendChild(gameContainer);
        }
        
        gameContainer.innerHTML = gameHTML;
        gameContainer.style.display = 'block';
        
        // Setup typing game
        this.setupTypingGame(words);
        
        // Update app game count
        if (window.app) {
            window.app.updateGameProgress();
        }
    }

    setupTypingGame(words) {
        let currentIndex = 0;
        let wordsTyped = 0;
        let coinsEarned = 0;
        
        const wordDisplay = document.getElementById('currentWord');
        const wordInput = document.getElementById('wordInput');
        const wordsTypedElem = document.getElementById('wordsTyped');
        const coinsElem = document.getElementById('typingCoins');
        
        wordInput.focus();
        
        wordInput.addEventListener('input', () => {
            if (wordInput.value.toLowerCase() === words[currentIndex]) {
                // Correct word typed
                wordsTyped++;
                coinsEarned += 2;
                
                wordsTypedElem.textContent = wordsTyped;
                coinsElem.textContent = coinsEarned;
                
                // Show animation
                this.showTypingAnimation();
                
                // Next word or end game
                if (currentIndex < words.length - 1) {
                    currentIndex++;
                    wordDisplay.textContent = words[currentIndex];
                    wordInput.value = '';
                } else {
                    this.endTypingGame(wordsTyped, coinsEarned);
                }
            }
        });
    }

    async endTypingGame(wordsTyped, coinsEarned) {
        await this.saveGameResult('typing', wordsTyped, coinsEarned);
        
        const resultsHTML = `
            <div class="game-results">
                <h3>🎉 Typing Complete!</h3>
                <div class="result-stats">
                    <p>Words Typed: <strong>${wordsTyped}</strong></p>
                    <p>Coins Earned: <strong>${coinsEarned}</strong> 🪙</p>
                </div>
                <div class="result-actions">
                    <button class="btn-claim" onclick="games.claimCoins(${coinsEarned})">Claim Coins</button>
                    <button class="btn-restart" onclick="games.restartTypingGame()">Play Again</button>
                </div>
            </div>
        `;
        
        document.querySelector('.game-area').innerHTML = resultsHTML;
    }

    restartTypingGame() {
        this.exitGame();
        setTimeout(() => this.startTypingGame(), 500);
    }

    showTypingAnimation() {
        const animation = document.createElement('div');
        animation.className = 'typing-animation';
        animation.textContent = '+2 🪙';
        
        const gameArea = document.querySelector('.game-area');
        if (gameArea) {
            gameArea.appendChild(animation);
            
            setTimeout(() => {
                if (animation.parentNode) {
                    animation.parentNode.removeChild(animation);
                }
            }, 1000);
        }
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
        default:
            console.log('Game not implemented:', gameType);
    }
}

// Initialize games
let games;
