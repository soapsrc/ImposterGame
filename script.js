// Game State
let gameState = {
    categories: {},
    selectedCategories: [],
    customWords: [],
    players: [],
    imposters: [],
    secretWord: '',
    imposterHint: '',
    hintEnabled: true,
    chaosMode: false,
    showImposterCount: false,
    startingPlayer: null,
    revealedPlayers: new Set(),
    votedOutPlayers: [],
    votesRemaining: 0,
    votes: {},
    leaderboard: JSON.parse(localStorage.getItem('imposterLeaderboard')) || {}
};

// Screen Management
function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
    });
    document.getElementById(screenId).classList.add('active');
}

// Load Categories from JSON
async function loadCategories() {
    try {
        const response = await fetch('words.json');
        const data = await response.json();
        gameState.categories = data.categories;
        renderCategories();
    } catch (error) {
        console.error('Error loading categories:', error);
        alert('Error loading word categories. Please refresh the page.');
    }
}

// Render Category Filters
function renderCategories() {
    const container = document.getElementById('category-filters');
    container.innerHTML = '';
    
    Object.keys(gameState.categories).forEach(category => {
        const div = document.createElement('div');
        div.className = 'category-item';
        div.textContent = category;
        div.addEventListener('click', () => toggleCategory(category, div));
        container.appendChild(div);
    });
}

// Toggle Category Selection
function toggleCategory(category, element) {
    if (gameState.selectedCategories.includes(category)) {
        gameState.selectedCategories = gameState.selectedCategories.filter(c => c !== category);
        element.classList.remove('selected');
    } else {
        gameState.selectedCategories.push(category);
        element.classList.add('selected');
    }
}

// Home Screen Event Listeners
document.getElementById('hint-toggle').addEventListener('change', (e) => {
    gameState.hintEnabled = e.target.checked;
});

document.getElementById('chaos-toggle').addEventListener('change', (e) => {
    gameState.chaosMode = e.target.checked;
    // Show/hide imposter count toggle based on chaos mode
    const imposterCountContainer = document.getElementById('show-imposter-count-container');
    if (e.target.checked) {
        imposterCountContainer.style.display = 'block';
    } else {
        imposterCountContainer.style.display = 'none';
    }
});

document.getElementById('show-imposter-count-toggle').addEventListener('change', (e) => {
    gameState.showImposterCount = e.target.checked;
});

document.getElementById('start-btn').addEventListener('click', () => {
    if (gameState.selectedCategories.length === 0 && gameState.customWords.length === 0) {
        alert('Please select at least one category or add custom words! 🎯');
        return;
    }
    showScreen('player-setup-screen');
});

// Custom Words
document.getElementById('custom-word-input').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        document.getElementById('add-custom-word-btn').click();
    }
});

document.getElementById('add-custom-word-btn').addEventListener('click', () => {
    const input = document.getElementById('custom-word-input');
    const word = input.value.trim();
    
    if (!word) {
        alert('Please enter a word! ✏️');
        return;
    }
    
    if (gameState.customWords.includes(word)) {
        alert('This word is already added! 🔄');
        return;
    }
    
    gameState.customWords.push(word);
    input.value = '';
    renderCustomWordsList();
});

function renderCustomWordsList() {
    const container = document.getElementById('custom-words-list');
    container.innerHTML = '';
    
    gameState.customWords.forEach(word => {
        const div = document.createElement('div');
        div.className = 'custom-word-item';
        div.innerHTML = `
            <span class="custom-word-text">✏️ ${word}</span>
            <button class="remove-word-btn" onclick="removeCustomWord('${word}')">❌</button>
        `;
        container.appendChild(div);
    });
}

function removeCustomWord(word) {
    gameState.customWords = gameState.customWords.filter(w => w !== word);
    renderCustomWordsList();
}

// Player Setup
document.getElementById('player-name-input').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        document.getElementById('add-player-btn').click();
    }
});

document.getElementById('add-player-btn').addEventListener('click', () => {
    const input = document.getElementById('player-name-input');
    const name = input.value.trim();
    
    if (!name) {
        alert('Please enter a player name! 👤');
        return;
    }
    
    if (gameState.players.includes(name)) {
        alert('This player is already added! 🔄');
        return;
    }
    
    gameState.players.push(name);
    input.value = '';
    renderPlayersList();
    updatePlayerCount();
});

function renderPlayersList() {
    const container = document.getElementById('players-list');
    container.innerHTML = '';
    
    gameState.players.forEach(player => {
        const div = document.createElement('div');
        div.className = 'player-item';
        div.innerHTML = `
            <span class="player-name">👤 ${player}</span>
            <button class="remove-player-btn" onclick="removePlayer('${player}')">❌</button>
        `;
        container.appendChild(div);
    });
}

function removePlayer(playerName) {
    gameState.players = gameState.players.filter(p => p !== playerName);
    renderPlayersList();
    updatePlayerCount();
}

function updatePlayerCount() {
    const count = gameState.players.length;
    document.getElementById('player-count').textContent = count;
    document.getElementById('continue-to-reveal-btn').disabled = count < 3;
}

document.getElementById('continue-to-reveal-btn').addEventListener('click', async () => {
    if (gameState.players.length < 3) {
        alert('Need at least 3 players to play! 👥');
        return;
    }
    await setupGame();
    showScreen('word-reveal-screen');
});

// Generate AI hint using backend proxy
async function generateAIHint(secretWord) {
    try {
        const response = await fetch('/api/generate-hint', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                secretWord: secretWord
            })
        });
        
        if (!response.ok) {
            throw new Error('API request failed');
        }
        
        const data = await response.json();
        // Extract just the first word from the response
        const hint = data.text.trim().split(/[\s\n,.!?]+/)[0];
        
        // Validate it's actually a single word
        if (hint && hint.length > 0 && hint.length < 30) {
            return hint;
        } else {
            throw new Error('Invalid hint format');
        }
    } catch (error) {
        console.error('Error generating AI hint:', error);
        // Fallback to generic hints
        return generateFallbackHint(secretWord);
    }
}

function generateFallbackHint(word) {
    console.log('Using fallback hint for:', word);
    console.log('Selected categories:', gameState.selectedCategories);
    console.log('Custom words:', gameState.customWords);
    
    // Generate contextually relevant hints based on common categories
    const categoryHints = {
        'Food': ['Tasty', 'Eating', 'Meal', 'Cuisine', 'Kitchen'],
        'Animals': ['Creature', 'Living', 'Wild', 'Nature', 'Species'],
        'School & Learning': ['Education', 'Study', 'Learning', 'Academic', 'Class'],
        'Objects & Things': ['Item', 'Useful', 'Object', 'Thing', 'Equipment'],
        'Places': ['Location', 'Area', 'Destination', 'Space', 'Site'],
        'Activities & Sports': ['Activity', 'Action', 'Exercise', 'Movement', 'Game'],
        'Emotions': ['Feeling', 'Emotion', 'Mood', 'State', 'Sense'],
        'Weather & Nature': ['Natural', 'Outside', 'Environment', 'Element', 'Earth'],
        'Colors': ['Shade', 'Hue', 'Tone', 'Color', 'Bright'],
        'Professions': ['Career', 'Occupation', 'Professional', 'Work', 'Job'],
        'Relationships & Love': ['Romantic', 'Personal', 'Connection', 'Together', 'Heart']
    };
    
    // Try to find which category this word belongs to
    for (const category of gameState.selectedCategories) {
        const wordsInCategory = gameState.categories[category] || [];
        if (wordsInCategory.includes(word)) {
            console.log('Found word in category:', category);
            if (categoryHints[category]) {
                const hints = categoryHints[category];
                const hint = hints[Math.floor(Math.random() * hints.length)];
                console.log('Generated fallback hint:', hint);
                return hint;
            }
        }
    }
    
    // Check if it's a custom word
    if (gameState.customWords.includes(word)) {
        console.log('Word is a custom word, using "Custom word" hint');
        return 'Custom word';
    }
    
    // If not found in any selected category, use first selected category
    for (const category of gameState.selectedCategories) {
        if (categoryHints[category]) {
            const hints = categoryHints[category];
            const hint = hints[Math.floor(Math.random() * hints.length)];
            console.log('Using first category hint:', hint);
            return hint;
        }
    }
    
    // Generic fallback
    console.log('Using generic fallback');
    return ['Common', 'Familiar', 'Known', 'Popular', 'Typical'][Math.floor(Math.random() * 5)];
}

// Setup Game
async function setupGame() {
    // Select secret word
    const availableWords = [];
    gameState.selectedCategories.forEach(category => {
        availableWords.push(...gameState.categories[category]);
    });
    // Add custom words to the pool
    availableWords.push(...gameState.customWords);
    gameState.secretWord = availableWords[Math.floor(Math.random() * availableWords.length)];
    
    // Generate AI hint for imposters if hint is enabled
    if (gameState.hintEnabled) {
        gameState.imposterHint = await generateAIHint(gameState.secretWord);
    }
    
    // Determine number of imposters
    let numImposters = 1;
    if (gameState.chaosMode) {
        if (gameState.showImposterCount) {
            // If showing imposter count, must have at least 1 imposter
            numImposters = Math.floor(Math.random() * gameState.players.length) + 1; // 1 to all players
        } else {
            // If hiding imposter count, can have 0 imposters
            numImposters = Math.floor(Math.random() * (gameState.players.length + 1)); // 0 to all players
        }
    }
    
    // Select imposters randomly
    const shuffled = [...gameState.players].sort(() => Math.random() - 0.5);
    gameState.imposters = shuffled.slice(0, numImposters);
    
    // Select random starting player
    gameState.startingPlayer = gameState.players[Math.floor(Math.random() * gameState.players.length)];
    
    // Reset revealed players
    gameState.revealedPlayers.clear();
    
    renderRevealPlayersList();
}

function renderRevealPlayersList() {
    const container = document.getElementById('reveal-players-list');
    container.innerHTML = '';
    
    gameState.players.forEach(player => {
        const div = document.createElement('div');
        div.className = 'reveal-player-card';
        div.dataset.player = player;
        if (player === gameState.startingPlayer) {
            div.classList.add('starting-player');
        }
        if (!gameState.revealedPlayers.has(player)) {
            div.classList.add('untapped');
        }
        div.textContent = player;
        div.addEventListener('click', () => revealWord(player, div));
        container.appendChild(div);
    });
}

function revealWord(player, element) {
    const modal = document.getElementById('word-modal');
    const modalPlayerName = document.getElementById('modal-player-name');
    const modalWord = document.getElementById('modal-word');
    const modalHint = document.getElementById('modal-hint');
    const modalCloseBtn = document.getElementById('modal-close-btn');
    
    modalPlayerName.textContent = player;
    
    // Hide Got It button initially
    modalCloseBtn.style.display = 'none';
    
    // Function to create pixel effect
    const createPixelEffect = () => {
        const pixelContainer = document.createElement('div');
        pixelContainer.className = 'pixel-container';
        
        const colors = ['white', 'white', 'white', 'pastel-pink', 'pastel-blue', 'pastel-purple', 'pastel-green', 'pastel-yellow'];
        
        // Create 400 pixel divs (20x20 grid)
        for (let i = 0; i < 400; i++) {
            const pixel = document.createElement('div');
            const randomColor = colors[Math.floor(Math.random() * colors.length)];
            pixel.className = `pixel ${randomColor}`;
            pixel.style.animationDelay = Math.ceil(Math.random() * 1500) + 'ms';
            pixelContainer.appendChild(pixel);
        }
        
        return pixelContainer;
    };
    
    // First click: Show censored
    if (gameState.imposters.includes(player)) {
        modalWord.textContent = '';
        modalWord.className = 'revealed-word censored';
        modalWord.style.cursor = 'pointer';
        modalWord.setAttribute('data-text', '█████████████████');
        modalWord.appendChild(createPixelEffect());
        modalHint.textContent = '👆 Tap the censored area to reveal your role';
        modalHint.style.display = 'block';
    } else {
        modalWord.textContent = '';
        modalWord.className = 'revealed-word censored';
        modalWord.style.cursor = 'pointer';
        modalWord.setAttribute('data-text', '█████████████████');
        modalWord.appendChild(createPixelEffect());
        modalHint.textContent = '👆 Tap the censored area to reveal your word';
        modalHint.style.display = 'block';
    }
    
    modal.classList.add('active');
    
    // Second click on censored area: Reveal actual role
    const revealActualRole = () => {
        // Show the Got It button
        modalCloseBtn.style.display = 'block';
        
        if (gameState.imposters.includes(player)) {
            modalWord.textContent = '🕵️ IMPOSTER! 🕵️';
            modalWord.className = 'revealed-word imposter';
            modalWord.removeAttribute('data-text');
            
            if (gameState.hintEnabled && gameState.imposterHint) {
                const hintText = gameState.imposters.length > 1 
                    ? `💡 Your clue word: "${gameState.imposterHint}" (All imposters have the same clue!)`
                    : `💡 Your clue word: "${gameState.imposterHint}" (Use this to blend in!)`;
                modalHint.textContent = hintText;
                modalHint.style.display = 'block';
            } else {
                modalHint.style.display = 'none';
            }
        } else {
            modalWord.textContent = gameState.secretWord;
            modalWord.className = 'revealed-word';
            modalWord.removeAttribute('data-text');
            modalHint.style.display = 'none';
        }
        modalWord.style.cursor = 'default';
        modalWord.removeEventListener('click', revealActualRole);
    };
    
    modalWord.addEventListener('click', revealActualRole);
    
    modalCloseBtn.onclick = () => {
        modal.classList.remove('active');
        modalWord.removeEventListener('click', revealActualRole);
        
        // Mark as revealed for first-time reveals
        if (!gameState.revealedPlayers.has(player)) {
            gameState.revealedPlayers.add(player);
            element.classList.remove('untapped');
            element.classList.add('tapped');
            checkAllRevealed();
        }
    };
}

function checkAllRevealed() {
    if (gameState.revealedPlayers.size === gameState.players.length) {
        document.getElementById('start-game-btn').style.display = 'block';
    }
}

document.getElementById('start-game-btn').addEventListener('click', () => {
    showGameRules();
});

// Game Rules Screen
function showGameRules() {
    document.getElementById('starting-player-name').textContent = gameState.startingPlayer;
    
    if (gameState.chaosMode) {
        document.getElementById('chaos-voting-rule').style.display = 'list-item';
    } else {
        document.getElementById('chaos-voting-rule').style.display = 'none';
    }
    
    // Initialize voting
    gameState.votedOutPlayers = [];
    
    // Set votes remaining based on mode
    if (gameState.chaosMode) {
        if (gameState.showImposterCount) {
            // In chaos mode with shown count, get X votes where X = imposter count
            gameState.votesRemaining = gameState.imposters.length;
            document.getElementById('votes-remaining').style.display = 'block';
            document.getElementById('votes-remaining').textContent = `Votes Remaining: ${gameState.votesRemaining}`;
        } else {
            // In chaos mode with hidden count, unlimited votes
            gameState.votesRemaining = Infinity;
            document.getElementById('votes-remaining').style.display = 'block';
            document.getElementById('votes-remaining').textContent = 'Vote as many times as you want!';
        }
    } else {
        // Normal mode: 1 vote
        gameState.votesRemaining = 1;
        document.getElementById('votes-remaining').style.display = 'block';
        document.getElementById('votes-remaining').textContent = `Votes Remaining: ${gameState.votesRemaining}`;
    }
    
    renderVotingPlayers();
    showScreen('game-rules-screen');
}

function renderVotingPlayers() {
    const container = document.getElementById('voting-players-list');
    container.innerHTML = '';
    
    // Get active players (not voted out yet)
    const activePlayers = gameState.players.filter(p => !gameState.votedOutPlayers.includes(p));
    
    activePlayers.forEach(player => {
        const div = document.createElement('div');
        div.className = 'voting-player-item';
        div.innerHTML = `
            <span class="voting-player-name">👤 ${player}</span>
            <button class="vote-out-btn" onclick="voteOutPlayer('${player}')">🗳️ Vote Out</button>
        `;
        container.appendChild(div);
    });
    
    // Also show voted out players (greyed out)
    gameState.votedOutPlayers.forEach(player => {
        const div = document.createElement('div');
        div.className = 'voting-player-item voted-out';
        div.innerHTML = `
            <span class="voting-player-name">❌ ${player} (Voted Out)</span>
        `;
        container.appendChild(div);
    });
}

function voteOutPlayer(playerName) {
    if (gameState.votesRemaining <= 0 && gameState.votesRemaining !== Infinity) {
        alert('No votes remaining! Click "Reveal Results" to see the outcome.');
        return;
    }
    
    // Add to voted out players
    gameState.votedOutPlayers.push(playerName);
    
    // Decrease votes remaining (unless infinite)
    if (gameState.votesRemaining !== Infinity) {
        gameState.votesRemaining--;
        document.getElementById('votes-remaining').textContent = `Votes Remaining: ${gameState.votesRemaining}`;
    }
    
    // Re-render the voting list
    renderVotingPlayers();
    
    // Check if we should auto-reveal
    if (gameState.votesRemaining === 0) {
        alert('All votes used! Click "Reveal Results" to see the outcome.');
    }
}

// Voting Screen
function renderVotingList() {
    const container = document.getElementById('voting-list');
    container.innerHTML = '';
    gameState.votes = {};
    
    gameState.players.forEach(player => {
        gameState.votes[player] = 0;
        
        const div = document.createElement('div');
        div.className = 'vote-item';
        div.innerHTML = `
            <span class="vote-label">
                <span class="vote-checkbox"></span>
                <span>${player}</span>
            </span>
        `;
        
        div.addEventListener('click', () => {
            if (gameState.chaosMode) {
                toggleVote(player, div);
            } else {
                selectSingleVote(player, div);
            }
        });
        
        container.appendChild(div);
    });
}

function toggleVote(player, element) {
    const selectedCount = Object.values(gameState.votes).filter(v => v > 0).length;
    
    if (gameState.votes[player] > 0) {
        gameState.votes[player] = 0;
        element.classList.remove('voted');
    } else {
        if (selectedCount >= 3) {
            alert('You can only vote for up to 3 suspects in Chaos Mode! 🎲');
            return;
        }
        gameState.votes[player] = 1;
        element.classList.add('voted');
    }
}

function selectSingleVote(player, element) {
    // Clear all votes
    document.querySelectorAll('.vote-item').forEach(item => {
        item.classList.remove('voted');
    });
    
    // Reset votes
    Object.keys(gameState.votes).forEach(p => {
        gameState.votes[p] = 0;
    });
    
    // Set new vote
    gameState.votes[player] = 1;
    element.classList.add('voted');
}

document.getElementById('reveal-results-btn').addEventListener('click', () => {
    // Auto-award points based on voting results
    autoAwardPointsFromVoting();
    showResults();
});

function autoAwardPointsFromVoting() {
    // Check if any imposters were voted out
    const impostersVotedOut = gameState.votedOutPlayers.filter(p => gameState.imposters.includes(p));
    const crewVotedOut = gameState.votedOutPlayers.filter(p => !gameState.imposters.includes(p));
    
    if (impostersVotedOut.length > 0) {
        // Crew successfully voted out at least one imposter - crew wins
        gameState.players.forEach(player => {
            if (!gameState.imposters.includes(player)) {
                gameState.leaderboard[player] = (gameState.leaderboard[player] || 0) + 1;
            }
        });
        localStorage.setItem('imposterLeaderboard', JSON.stringify(gameState.leaderboard));
    } else if (gameState.votedOutPlayers.length > 0) {
        // Only crew members were voted out - imposters win
        gameState.imposters.forEach(player => {
            gameState.leaderboard[player] = (gameState.leaderboard[player] || 0) + 1;
        });
        localStorage.setItem('imposterLeaderboard', JSON.stringify(gameState.leaderboard));
    }
    // If no one was voted out, no points are awarded
}

// Results Screen
function showResults() {
    // Show imposters
    const imposterReveal = document.getElementById('imposter-reveal');
    if (gameState.imposters.length === 0) {
        imposterReveal.innerHTML = '<div>🎉 NO IMPOSTERS THIS ROUND! 🎉</div>';
    } else {
        imposterReveal.innerHTML = gameState.imposters.map(imp => `<div>🕵️ ${imp}</div>`).join('');
    }
    
    // Show secret word
    document.getElementById('secret-word-reveal').textContent = gameState.secretWord;
    
    // Show voting results
    if (gameState.votedOutPlayers.length > 0) {
        const votingResults = document.createElement('div');
        votingResults.className = 'voting-results';
        votingResults.innerHTML = '<h3>Voted Out:</h3>' + 
            gameState.votedOutPlayers.map(p => {
                const isImposter = gameState.imposters.includes(p);
                return `<div>${isImposter ? '✅' : '❌'} ${p}</div>`;
            }).join('');
        imposterReveal.appendChild(votingResults);
    }
    
    // Show winner selection (optional manual override)
    renderWinnerSelection();
    
    showScreen('results-screen');
}

function renderWinnerSelection() {
    const container = document.getElementById('winner-selection-list');
    container.innerHTML = '';
    
    const crewBtn = document.createElement('button');
    crewBtn.className = 'winner-btn';
    crewBtn.textContent = '👥 Crew Wins!';
    crewBtn.addEventListener('click', () => awardPoints('crew'));
    container.appendChild(crewBtn);
    
    if (gameState.imposters.length > 0) {
        const imposterBtn = document.createElement('button');
        imposterBtn.className = 'winner-btn';
        imposterBtn.textContent = '🕵️ Imposter Wins!';
        imposterBtn.addEventListener('click', () => awardPoints('imposters'));
        container.appendChild(imposterBtn);
    }
}

function awardPoints(winner) {
    // Disable all winner buttons to prevent multiple clicks
    const winnerButtons = document.querySelectorAll('.winner-btn');
    winnerButtons.forEach(btn => {
        btn.disabled = true;
        btn.style.opacity = '0.5';
        btn.style.cursor = 'not-allowed';
    });
    
    if (winner === 'crew') {
        gameState.players.forEach(player => {
            if (!gameState.imposters.includes(player)) {
                gameState.leaderboard[player] = (gameState.leaderboard[player] || 0) + 1;
            }
        });
    } else {
        gameState.imposters.forEach(player => {
            gameState.leaderboard[player] = (gameState.leaderboard[player] || 0) + 1;
        });
    }
    
    localStorage.setItem('imposterLeaderboard', JSON.stringify(gameState.leaderboard));
    alert(`Points awarded to ${winner === 'crew' ? 'Crew' : 'Imposters'}! 🏆`);
}

document.getElementById('next-round-btn').addEventListener('click', async () => {
    // Keep players and leaderboard, reset game state for next round
    gameState.imposters = [];
    gameState.secretWord = '';
    gameState.imposterHint = '';
    gameState.startingPlayer = null;
    gameState.revealedPlayers.clear();
    gameState.votedOutPlayers = [];
    gameState.votes = {};
    
    // Start a new round with same settings
    await setupGame();
    showScreen('word-reveal-screen');
});

document.getElementById('new-game-btn').addEventListener('click', () => {
    // Reset everything and return to home screen
    gameState.imposters = [];
    gameState.secretWord = '';
    gameState.imposterHint = '';
    gameState.startingPlayer = null;
    gameState.revealedPlayers.clear();
    gameState.votedOutPlayers = [];
    gameState.votes = {};
    
    // Return to home screen
    showScreen('home-screen');
});

document.getElementById('view-leaderboard-btn').addEventListener('click', () => {
    renderLeaderboard();
    showScreen('leaderboard-screen');
});

// Leaderboard Screen
function renderLeaderboard() {
    const container = document.getElementById('leaderboard-table');
    container.innerHTML = '';
    
    const sortedLeaderboard = Object.entries(gameState.leaderboard)
        .sort((a, b) => b[1] - a[1]);
    
    if (sortedLeaderboard.length === 0) {
        container.innerHTML = '<p style="text-align: center; padding: 20px;">No scores yet! Play a game to start tracking points! 🎮</p>';
        return;
    }
    
    sortedLeaderboard.forEach(([player, score], index) => {
        const div = document.createElement('div');
        div.className = 'leaderboard-item';
        
        if (index === 0) div.classList.add('first');
        else if (index === 1) div.classList.add('second');
        else if (index === 2) div.classList.add('third');
        
        const rankEmoji = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`;
        
        div.innerHTML = `
            <span class="leaderboard-rank">${rankEmoji}</span>
            <span class="leaderboard-name">${player}</span>
            <span class="leaderboard-score">${score} pts</span>
        `;
        container.appendChild(div);
    });
}

document.getElementById('back-to-results-btn').addEventListener('click', () => {
    showScreen('results-screen');
});

document.getElementById('reset-leaderboard-btn').addEventListener('click', () => {
    if (confirm('Are you sure you want to reset all scores? This cannot be undone! 🗑️')) {
        gameState.leaderboard = {};
        localStorage.removeItem('imposterLeaderboard');
        renderLeaderboard();
        alert('Leaderboard reset! ✅');
    }
});

// Initialize
loadCategories();
