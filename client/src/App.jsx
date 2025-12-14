import React, { useState, useEffect, useCallback } from 'react';
import io from 'socket.io-client';
import './styles/App.css';

// API and utilities
import { authAPI, userAPI, gameAPI, leaderboardAPI, achievementAPI, powerupAPI, saveTokens, clearTokens, isAuthenticated } from './utils/apiClient';
import audioManager from './utils/audioManager';
import * as puzzleLogic from './utils/puzzleLogic';

// Components (will be defined after App)
import LoginScreen from './components/LoginScreen';
import MainMenu from './components/MainMenu';
import GameBoard from './components/GameBoard';
import {
    NotificationToast,
    Matchmaking,
    VictoryScreen,
    StoryModal,
    Leaderboard,
    UserProfile,
    AchievementPanel,
    PowerupInventory,
    SettingsPanel
} from './components/AllComponents';
const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000';

function App() {
    // Authentication & User
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [currentUser, setCurrentUser] = useState(null);
    const [userStats, setUserStats] = useState(null);
    const [userPreferences, setUserPreferences] = useState(null);

    // Navigation
    const [currentScreen, setCurrentScreen] = useState('login');

    // Game State
    const [gameSession, setGameSession] = useState(null);
    const [boardSize, setBoardSize] = useState(4);
    const [gameMode, setGameMode] = useState('speed');
    const [board, setBoard] = useState([]);
    const [moveCount, setMoveCount] = useState(0);
    const [gameTime, setGameTime] = useState(0);
    const [isGameActive, setIsGameActive] = useState(false);
    const [isPaused, setIsPaused] = useState(false);

    // Multiplayer
    const [socket, setSocket] = useState(null);
    const [inMatchmaking, setInMatchmaking] = useState(false);
    const [opponent, setOpponent] = useState(null);
    const [opponentBoard, setOpponentBoard] = useState([]);

    // UI State
    const [achievements, setAchievements] = useState([]);
    const [userAchievements, setUserAchievements] = useState([]);
    const [powerups, setPowerups] = useState([]);
    const [userPowerups, setUserPowerups] = useState([]);
    const [leaderboards, setLeaderboards] = useState({});
    const [notifications, setNotifications] = useState([]);
    const [showVictory, setShowVictory] = useState(false);
    const [victoryData, setVictoryData] = useState(null);
    const [showStory, setShowStory] = useState(false);
    const [storySegment, setStorySegment] = useState(null);
    const [currentTheme, setCurrentTheme] = useState('dasher');

    // Move history for replay
    const [moveHistory, setMoveHistory] = useState([]);

    useEffect(() => {
        initializeApp();

        return () => {
            if (socket) {
                socket.disconnect();
            }
        };
    }, []);

    const initializeApp = async () => {
        // Initialize audio
        await audioManager.initialize();
        audioManager.playMusic('menu');

        // Check if user is already logged in
        if (isAuthenticated()) {
            try {
                const response = await authAPI.verify();
                if (response.success) {
                    setIsLoggedIn(true);
                    setCurrentUser(response.user);
                    await loadUserData(response.user.userId);
                    setCurrentScreen('menu');
                }
            } catch (error) {
                console.error('Token verification failed:', error);
                clearTokens();
            }
        }
    };

    const handleLogin = async (username, password) => {
        try {
            const response = await authAPI.login(username, password);

            if (response.success) {
                saveTokens(response.token, response.refreshToken);
                setIsLoggedIn(true);
                setCurrentUser(response.user);
                await loadUserData(response.user.userId);
                setCurrentScreen('menu');

                // Initialize socket connection
                initializeSocket(response.token);

                showNotification('Welcome back!', 'success');
                audioManager.playSound('notification');
            }
        } catch (error) {
            showNotification(error.message || 'Login failed', 'error');
            throw error;
        }
    };

    const handleRegister = async (username, email, password, displayName) => {
        try {
            const response = await authAPI.register(username, email, password, displayName);

            if (response.success) {
                saveTokens(response.token, response.refreshToken);
                setIsLoggedIn(true);
                setCurrentUser(response.user);
                await loadUserData(response.user.userId);
                setCurrentScreen('menu');

                initializeSocket(response.token);

                showNotification('Account created successfully!', 'success');
                audioManager.playSound('notification');
            }
        } catch (error) {
            showNotification(error.message || 'Registration failed', 'error');
            throw error;
        }
    };

    const handleLogout = () => {
        clearTokens();
        setIsLoggedIn(false);
        setCurrentUser(null);
        setUserStats(null);
        setCurrentScreen('login');

        if (socket) {
            socket.disconnect();
            setSocket(null);
        }

        audioManager.stopMusic();
        audioManager.playMusic('menu');
        showNotification('Logged out successfully', 'info');
    };

    const loadUserData = async (userId) => {
        try {
            // Load user stats
            const statsResponse = await userAPI.getStats(userId);
            if (statsResponse.success) {
                setUserStats(statsResponse.stats);
            }

            // Load preferences
            const prefsResponse = await userAPI.getPreferences();
            if (prefsResponse.success) {
                setUserPreferences(prefsResponse.preferences);
                applyPreferences(prefsResponse.preferences);
            }

            // Load achievements
            const achievementsResponse = await achievementAPI.getUserAchievements(userId);
            if (achievementsResponse.success) {
                setUserAchievements(achievementsResponse.achievements);
            }

            // Load powerups
            const powerupsResponse = await powerupAPI.getUserPowerups();
            if (powerupsResponse.success) {
                setUserPowerups(powerupsResponse.powerups);
            }

            // Load all achievements and powerups for reference
            const allAchievements = await achievementAPI.getAll();
            setAchievements(allAchievements.achievements || []);

            const allPowerups = await powerupAPI.getAll();
            setPowerups(allPowerups.powerups || []);

        } catch (error) {
            console.error('Error loading user data:', error);
        }
    };

    const applyPreferences = (prefs) => {
        if (prefs.sound_enabled !== undefined) {
            audioManager.setSoundEnabled(prefs.sound_enabled);
        }
        if (prefs.music_enabled !== undefined) {
            audioManager.setMusicEnabled(prefs.music_enabled);
        }
        if (prefs.sound_volume !== undefined) {
            audioManager.setSoundVolume(prefs.sound_volume);
        }
        if (prefs.music_volume !== undefined) {
            audioManager.setMusicVolume(prefs.music_volume);
        }
        if (prefs.selected_theme) {
            setCurrentTheme(prefs.selected_theme);
        }
        if (prefs.default_board_size) {
            setBoardSize(prefs.default_board_size);
        }
        if (prefs.default_game_mode) {
            setGameMode(prefs.default_game_mode);
        }
    };

    const initializeSocket = (token) => {
        const newSocket = io(SOCKET_URL, {
            auth: { token }
        });

        newSocket.on('connect', () => {
            console.log('Socket connected');
        });

        newSocket.on('matchmaking_joined', (data) => {
            showNotification(`Searching for opponent... Position: ${data.position}`, 'info');
        });

        newSocket.on('match_found', (data) => {
            handleMatchFound(data);
        });

        newSocket.on('opponent_move', (moveData) => {
            handleOpponentMove(moveData);
        });

        newSocket.on('opponent_powerup', (data) => {
            showNotification(`Opponent used ${data.powerupKey}!`, 'warning');
            audioManager.playSound('powerupActivate');
        });

        newSocket.on('game_ended', (data) => {
            handleGameEnd(data);
        });

        newSocket.on('opponent_disconnected', () => {
            showNotification('Opponent disconnected', 'error');
            endGame(true);
        });

        newSocket.on('disconnect', () => {
            console.log('Socket disconnected');
        });

        setSocket(newSocket);
    };

    const startGame = async (size, mode) => {
        try {
            setBoardSize(size);
            setGameMode(mode);

            // Generate puzzle
            const newBoard = puzzleLogic.generateSolvablePuzzle(size);
            setBoard(newBoard);
            setMoveCount(0);
            setGameTime(0);
            setMoveHistory([]);
            setIsGameActive(true);
            setIsPaused(false);

            // Create game session
            const response = await gameAPI.create(size, mode, null);
            if (response.success) {
                setGameSession(response);
            }

            // Change music based on mode
            if (mode === 'speed' || mode === 'multiplayer') {
                audioManager.playMusic('gameplayIntense');
            } else {
                audioManager.playMusic('gameplayCalm');
            }

            setCurrentScreen('game');
            audioManager.playSound('notification');
        } catch (error) {
            console.error('Error starting game:', error);
            showNotification('Failed to start game', 'error');
        }
    };

    const handleTileClick = (tileIndex) => {
        if (!isGameActive || isPaused) return;

        const emptyIndex = board.indexOf(0);

        // Check if move is valid
        if (!puzzleLogic.canMoveTile(board, tileIndex, boardSize)) {
            audioManager.playSound('tileClick');
            return;
        }

        // Make move
        const newBoard = puzzleLogic.moveTile(board, tileIndex);
        if (!newBoard) return;

        setBoard(newBoard);
        setMoveCount(prev => prev + 1);

        // Record move
        const moveData = {
            moveNumber: moveCount + 1,
            tilePosition: tileIndex,
            emptyPosition: emptyIndex,
            direction: puzzleLogic.getMoveDirection(tileIndex, emptyIndex, boardSize),
            boardState: newBoard,
            timeElapsed: gameTime
        };

        setMoveHistory(prev => [...prev, moveData]);

        // Send move to server if in multiplayer
        if (gameMode === 'multiplayer' && socket && gameSession) {
            socket.emit('game_move', {
                sessionId: gameSession.sessionId,
                moveData
            });
        }

        audioManager.playSound('tileSlide');

        // Check if puzzle is solved
        if (puzzleLogic.isSolved(newBoard)) {
            handlePuzzleSolved();
        }
    };

    const handlePuzzleSolved = async () => {
        setIsGameActive(false);
        audioManager.playSound('puzzleComplete');
        audioManager.playMusic('victory');

        try {
            // Calculate performance metrics
            const minimumMoves = puzzleLogic.calculateMinimumMoves(board, boardSize);
            const isPerfect = puzzleLogic.isPerfectGame(moveCount, minimumMoves);
            const speedBonus = gameMode === 'speed' && gameTime < 60;

            // Complete game on server
            const response = await gameAPI.complete(gameSession.sessionId, {
                winnerId: currentUser.userId,
                completionTime: gameTime,
                moveCount,
                perfectGame: isPerfect,
                speedBonus
            });

            if (response.success) {
                // Update local stats
                await loadUserData(currentUser.userId);

                // Show victory screen
                setVictoryData({
                    time: gameTime,
                    moves: moveCount,
                    perfectGame: isPerfect,
                    speedBonus,
                    xpGained: response.xpGained,
                    leveledUp: response.leveledUp,
                    newLevel: response.newLevel,
                    unlockedAchievements: response.unlockedAchievements || [],
                    eloChange: response.eloChanges?.player1_change || 0
                });

                setShowVictory(true);

                // Show unlocked achievements
                if (response.unlockedAchievements && response.unlockedAchievements.length > 0) {
                    response.unlockedAchievements.forEach(achievement => {
                        setTimeout(() => {
                            showNotification(`Achievement Unlocked: ${achievement.name}!`, 'achievement');
                            audioManager.playSound('achievementUnlock');
                        }, 1000);
                    });
                }

                // Check for level up
                if (response.leveledUp) {
                    setTimeout(() => {
                        showNotification(`Level Up! You are now level ${response.newLevel}!`, 'levelup');
                        audioManager.playSound('levelUp');
                    }, 1500);
                }

                // Check for story progression
                checkStoryProgression(response.newLevel);
            }
        } catch (error) {
            console.error('Error completing game:', error);
            showNotification('Error saving game results', 'error');
        }
    };

    const endGame = (forfeit = false) => {
        setIsGameActive(false);
        setIsPaused(false);
        audioManager.stopMusic();
        audioManager.playMusic('menu');

        if (forfeit) {
            showNotification('Game ended', 'info');
        }
    };

    const joinMatchmaking = (size, mode) => {
        if (!socket) {
            showNotification('Not connected to server', 'error');
            return;
        }

        setBoardSize(size);
        setGameMode(mode);
        setInMatchmaking(true);
        setCurrentScreen('matchmaking');

        socket.emit('join_matchmaking', { mode, boardSize: size });
        audioManager.playSound('notification');
    };

    const leaveMatchmaking = () => {
        if (socket && inMatchmaking) {
            socket.emit('leave_matchmaking', { mode: gameMode });
        }

        setInMatchmaking(false);
        setCurrentScreen('menu');
        showNotification('Left matchmaking', 'info');
    };

    const handleMatchFound = async (data) => {
        setInMatchmaking(false);
        setOpponent(data.player2.userId === currentUser.userId ? data.player1 : data.player2);
        setGameSession({ sessionId: data.sessionId });

        audioManager.playSound('matchFound');
        showNotification('Match found!', 'success');

        // Generate same board for both players
        const newBoard = puzzleLogic.generateSolvablePuzzle(data.boardSize);
        setBoard(newBoard);
        setOpponentBoard(newBoard);
        setMoveCount(0);
        setGameTime(0);
        setMoveHistory([]);

        // Start game after countdown
        setTimeout(() => {
            setIsGameActive(true);
            setCurrentScreen('game');
            audioManager.playMusic('gameplayIntense');
        }, 3000);
    };

    const handleOpponentMove = (moveData) => {
        setOpponentBoard(moveData.boardState);
    };

    const handleGameEnd = (data) => {
        setIsGameActive(false);

        const didWin = data.winnerId === currentUser.userId;

        showNotification(
            didWin ? 'You won!' : 'You lost!',
            didWin ? 'success' : 'error'
        );

        if (didWin) {
            audioManager.playMusic('victory');
            audioManager.playSound('puzzleComplete');
        }
    };

    const usePowerup = async (powerupKey) => {
        if (!isGameActive || isPaused) return;

        try {
            const response = await powerupAPI.use(powerupKey);

            if (response.success) {
                audioManager.playSound('powerupActivate');
                showNotification('Powerup activated!', 'success');

                // Apply powerup effect
                applyPowerupEffect(powerupKey);

                // Notify opponent if multiplayer
                if (gameMode === 'multiplayer' && socket && gameSession) {
                    socket.emit('use_powerup', {
                        sessionId: gameSession.sessionId,
                        powerupKey
                    });
                }

                // Reload powerups
                const powerupsResponse = await powerupAPI.getUserPowerups();
                if (powerupsResponse.success) {
                    setUserPowerups(powerupsResponse.powerups);
                }
            }
        } catch (error) {
            showNotification('Failed to use powerup', 'error');
        }
    };

    const applyPowerupEffect = (powerupKey) => {
        switch (powerupKey) {
            case 'peek':
                // Show solution briefly (handled in GameBoard component)
                break;
            case 'hint':
                const hintTile = puzzleLogic.getHint(board, boardSize);
                if (hintTile !== null) {
                    // Highlight tile (handled in GameBoard component)
                }
                break;
            case 'time_freeze':
                // Pause timer for 10 seconds
                setIsPaused(true);
                setTimeout(() => setIsPaused(false), 10000);
                break;
            case 'undo_move':
                // Undo last move
                if (moveHistory.length > 0) {
                    const previousState = moveHistory[moveHistory.length - 2];
                    if (previousState) {
                        setBoard(previousState.boardState);
                        setMoveCount(prev => Math.max(0, prev - 1));
                        setMoveHistory(prev => prev.slice(0, -1));
                    }
                }
                break;
            default:
                break;
        }
    };

    const checkStoryProgression = (level) => {
        let segment = null;

        if (level === 5) {
            segment = {
                act: 1,
                title: 'The Lost Reindeer',
                content: 'Deep in the Northern forests, a young reindeer has wandered from the herd. The ancient puzzle stones glow with mysterious energy, showing you the way to guide them home...'
            };
        } else if (level === 15) {
            segment = {
                act: 2,
                title: 'The Northern Lights Mystery',
                content: 'The Aurora Borealis dances above as you discover the puzzle stones are connected to the lights themselves. Each solved puzzle makes the lights shine brighter, revealing hidden paths through the winter storm...'
            };
        } else if (level === 30) {
            segment = {
                act: 3,
                title: 'The Winter Festival',
                content: 'The reindeer village prepares for the grand Winter Festival! Your puzzle-solving skills have become legendary. Now the elder reindeer ask for your help to solve the ancient Festival Puzzles...'
            };
        } else if (level === 50) {
            segment = {
                act: 4,
                title: 'The Grand Aurora',
                content: 'At last, you have unlocked the final mystery! The puzzle stones reveal themselves as fragments of an ancient aurora crystal. As you complete the final arrangement, the Northern Lights burst forth in spectacular colors, and the entire reindeer kingdom celebrates your achievement!'
            };
        }

        if (segment) {
            setStorySegment(segment);
            setShowStory(true);
        }
    };

    const changeTheme = async (themeName) => {
        try {
            await userAPI.updatePreferences({ selected_theme: themeName });
            setCurrentTheme(themeName);
            showNotification(`Theme changed to ${themeName}`, 'success');
        } catch (error) {
            showNotification('Failed to change theme', 'error');
        }
    };

    const checkThemeUnlocks = (stats) => {
        const unlocks = [];

        if (stats.total_wins >= 50 && currentTheme === 'dasher') {
            unlocks.push('prancer');
        }
        if (stats.total_wins >= 100) {
            unlocks.push('comet');
        }
        if (stats.total_wins >= 200) {
            unlocks.push('blitzen');
        }
        if (stats.elo_rating >= 1800) {
            unlocks.push('rudolph');
        }
        if (currentUser.level >= 50) {
            unlocks.push('aurora');
        }

        return unlocks;
    };

    const loadLeaderboards = async () => {
        try {
            const categories = [
                'speed_4x4',
                'speed_overall',
                'moves_4x4',
                'moves_overall'
            ];

            const boards = {};
            for (const category of categories) {
                const response = await leaderboardAPI.get(category);
                if (response.success) {
                    boards[category] = response.leaderboard;
                }
            }

            setLeaderboards(boards);
        } catch (error) {
            console.error('Error loading leaderboards:', error);
        }
    };

    const showNotification = (message, type = 'info') => {
        const id = Date.now();
        const notification = { id, message, type };

        setNotifications(prev => [...prev, notification]);

        // Auto-remove after 5 seconds
        setTimeout(() => {
            removeNotification(id);
        }, 5000);
    };

    const removeNotification = (id) => {
        setNotifications(prev => prev.filter(n => n.id !== id));
    };

    useEffect(() => {
        let interval;

        if (isGameActive && !isPaused) {
            interval = setInterval(() => {
                setGameTime(prev => prev + 1);
            }, 1000);
        }

        return () => {
            if (interval) clearInterval(interval);
        };
    }, [isGameActive, isPaused]);

    const navigateTo = (screen) => {
        setCurrentScreen(screen);

        if (screen === 'menu') {
            audioManager.stopMusic();
            audioManager.playMusic('menu');
        }

        if (screen === 'leaderboard') {
            loadLeaderboards();
        }
    };

    return (
        <div className={`app theme-${currentTheme}`}>
            {/* Notifications */}
            <div className="notification-container">
                {notifications.map(notification => (
                    <NotificationToast
                        key={notification.id}
                        message={notification.message}
                        type={notification.type}
                        onClose={() => removeNotification(notification.id)}
                    />
                ))}
            </div>

            {/* Main Content */}
            {!isLoggedIn && (
                <LoginScreen
                    onLogin={handleLogin}
                    onRegister={handleRegister}
                />
            )}

            {isLoggedIn && currentScreen === 'menu' && (
                <MainMenu
                    user={currentUser}
                    stats={userStats}
                    onStartGame={startGame}
                    onJoinMatchmaking={joinMatchmaking}
                    onNavigate={navigateTo}
                    onLogout={handleLogout}
                    currentTheme={currentTheme}
                />
            )}

            {isLoggedIn && currentScreen === 'game' && (
                <GameBoard
                    board={board}
                    boardSize={boardSize}
                    gameMode={gameMode}
                    moveCount={moveCount}
                    gameTime={gameTime}
                    isActive={isGameActive}
                    isPaused={isPaused}
                    opponent={opponent}
                    opponentBoard={opponentBoard}
                    userPowerups={userPowerups}
                    onTileClick={handleTileClick}
                    onUsePowerup={usePowerup}
                    onPause={() => setIsPaused(!isPaused)}
                    onQuit={() => {
                        endGame(true);
                        navigateTo('menu');
                    }}
                    currentTheme={currentTheme}
                    preferences={userPreferences}
                />
            )}

            {isLoggedIn && currentScreen === 'matchmaking' && (
                <Matchmaking
                    boardSize={boardSize}
                    gameMode={gameMode}
                    onCancel={leaveMatchmaking}
                />
            )}

            {isLoggedIn && currentScreen === 'leaderboard' && (
                <Leaderboard
                    leaderboards={leaderboards}
                    currentUser={currentUser}
                    onBack={() => navigateTo('menu')}
                />
            )}

            {isLoggedIn && currentScreen === 'profile' && (
                <UserProfile
                    user={currentUser}
                    stats={userStats}
                    achievements={userAchievements}
                    onBack={() => navigateTo('menu')}
                    onUpdateProfile={async (updates) => {
                        await userAPI.updateProfile(updates);
                        await loadUserData(currentUser.userId);
                    }}
                />
            )}

            {isLoggedIn && currentScreen === 'achievements' && (
                <AchievementPanel
                    achievements={achievements}
                    userAchievements={userAchievements}
                    onBack={() => navigateTo('menu')}
                />
            )}

            {isLoggedIn && currentScreen === 'powerups' && (
                <PowerupInventory
                    powerups={powerups}
                    userPowerups={userPowerups}
                    onBack={() => navigateTo('menu')}
                />
            )}

            {isLoggedIn && currentScreen === 'settings' && (
                <SettingsPanel
                    preferences={userPreferences}
                    currentTheme={currentTheme}
                    onUpdatePreferences={async (prefs) => {
                        await userAPI.updatePreferences(prefs);
                        await loadUserData(currentUser.userId);
                        applyPreferences(prefs);
                    }}
                    onChangeTheme={changeTheme}
                    onBack={() => navigateTo('menu')}
                    availableThemes={checkThemeUnlocks(userStats || {})}
                />
            )}

            {/* Modals */}
            {showVictory && (
                <VictoryScreen
                    data={victoryData}
                    onClose={() => {
                        setShowVictory(false);
                        navigateTo('menu');
                    }}
                    onPlayAgain={() => {
                        setShowVictory(false);
                        startGame(boardSize, gameMode);
                    }}
                />
            )}

            {showStory && (
                <StoryModal
                    segment={storySegment}
                    onClose={() => setShowStory(false)}
                />
            )}
        </div>
    );
}

export default App;
