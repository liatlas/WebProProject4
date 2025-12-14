import React, { useState } from 'react';

function MainMenu({ user, stats, onStartGame, onJoinMatchmaking, onNavigate, onLogout, currentTheme }) {
    const [selectedSize, setSelectedSize] = useState(4);
    const [selectedMode, setSelectedMode] = useState('speed');
    const [showModeSelect, setShowModeSelect] = useState(false);

    const boardSizes = [
        { size: 3, label: '3x3', difficulty: 'Beginner' },
        { size: 4, label: '4x4', difficulty: 'Classic' },
        { size: 6, label: '6x6', difficulty: 'Challenge' },
        { size: 8, label: '8x8', difficulty: 'Hard' },
        { size: 10, label: '10x10', difficulty: 'Expert' }
    ];

    const gameModes = [
        { id: 'speed', name: 'Speed Mode', icon: '⚡', desc: 'Race against time' },
        { id: 'fewest_moves', name: 'Fewest Moves', icon: '🎯', desc: 'Optimize your solution' },
        { id: 'practice', name: 'Practice', icon: '📚', desc: 'Play without pressure' }
    ];

    const handlePlay = () => {
        if (selectedMode === 'multiplayer') {
            onJoinMatchmaking(selectedSize, 'multiplayer');
        } else {
            onStartGame(selectedSize, selectedMode);
        }
    };

    return (
        <div className="main-menu">
            {/* Background effects */}
            <div className="menu-background">
                <div className="northern-lights"></div>
                <div className="snow-particles"></div>
            </div>

            {/* Header */}
            <header className="menu-header">
                <div className="header-left">
                    <h1 className="game-logo">
                        <span className="reindeer-icon">🦌</span>
                        Reindeer Puzzle
                    </h1>
                </div>

                <div className="header-right">
                    <div className="user-info" onClick={() => onNavigate('profile')}>
                        <div className="user-avatar">
                            {user.avatarUrl ? (
                                <img src={user.avatarUrl} alt={user.displayName} />
                            ) : (
                                <span className="avatar-placeholder">
                                    {user.displayName.charAt(0).toUpperCase()}
                                </span>
                            )}
                        </div>
                        <div className="user-details">
                            <div className="user-name">{user.displayName}</div>
                            <div className="user-level">Level {user.level}</div>
                        </div>
                    </div>

                    <button className="btn-icon" onClick={() => onNavigate('settings')} title="Settings">
                        ⚙️
                    </button>

                    <button className="btn-icon" onClick={onLogout} title="Logout">
                        🚪
                    </button>
                </div>
            </header>

            {/* Main Content */}
            <div className="menu-content">
                {/* Left Panel - Game Setup */}
                <div className="menu-panel game-setup-panel">
                    <h2 className="panel-title">Start New Game</h2>

                    {/* Board Size Selection */}
                    <div className="setup-section">
                        <h3 className="section-title">Board Size</h3>
                        <div className="board-size-grid">
                            {boardSizes.map(board => (
                                <button
                                    key={board.size}
                                    className={`board-size-option ${selectedSize === board.size ? 'selected' : ''}`}
                                    onClick={() => setSelectedSize(board.size)}
                                >
                                    <div className="size-label">{board.label}</div>
                                    <div className="size-difficulty">{board.difficulty}</div>
                                    <div className="size-preview">
                                        {Array.from({ length: board.size }).map((_, i) => (
                                            <div key={i} className="preview-row">
                                                {Array.from({ length: board.size }).map((_, j) => (
                                                    <div key={j} className="preview-tile"></div>
                                                ))}
                                            </div>
                                        ))}
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Game Mode Selection */}
                    <div className="setup-section">
                        <h3 className="section-title">Game Mode</h3>
                        <div className="game-mode-list">
                            {gameModes.map(mode => (
                                <button
                                    key={mode.id}
                                    className={`game-mode-option ${selectedMode === mode.id ? 'selected' : ''}`}
                                    onClick={() => setSelectedMode(mode.id)}
                                >
                                    <span className="mode-icon">{mode.icon}</span>
                                    <div className="mode-info">
                                        <div className="mode-name">{mode.name}</div>
                                        <div className="mode-desc">{mode.desc}</div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Play Button */}
                    <button className="btn btn-primary btn-large btn-play" onClick={handlePlay}>
                        <span className="btn-icon">🎮</span>
                        Play Now
                    </button>
                </div>

                {/* Center Panel - Stats */}
                <div className="menu-panel stats-panel">
                    <h2 className="panel-title">Your Statistics</h2>

                    <div className="stats-grid">
                        <div className="stat-card">
                            <div className="stat-icon">🎯</div>
                            <div className="stat-value">{stats?.total_games || 0}</div>
                            <div className="stat-label">Games Played</div>
                        </div>

                        <div className="stat-card">
                            <div className="stat-icon">🏆</div>
                            <div className="stat-value">{stats?.total_wins || 0}</div>
                            <div className="stat-label">Wins</div>
                        </div>

                        <div className="stat-card">
                            <div className="stat-icon">📊</div>
                            <div className="stat-value">{stats?.win_rate ? Number(stats.win_rate).toFixed(1) : 0}%</div>
                            <div className="stat-label">Win Rate</div>
                        </div>

                        <div className="stat-card">
                            <div className="stat-icon">⚡</div>
                            <div className="stat-value">{stats?.best_completion_time || 0}s</div>
                            <div className="stat-label">Best Time</div>
                        </div>

                        <div className="stat-card">
                            <div className="stat-icon">🎖️</div>
                            <div className="stat-value">{stats?.elo_rating || 1000}</div>
                            <div className="stat-label">ELO Rating</div>
                        </div>

                        <div className="stat-card">
                            <div className="stat-icon">🔥</div>
                            <div className="stat-value">{stats?.current_win_streak || 0}</div>
                            <div className="stat-label">Win Streak</div>
                        </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="level-progress">
                        <div className="progress-header">
                            <span>Level {user.level}</span>
                            <span>{user.experiencePoints || 0} / {user.level * 100} XP</span>
                        </div>
                        <div className="progress-bar">
                            <div
                                className="progress-fill"
                                style={{ width: `${((user.experiencePoints || 0) / (user.level * 100)) * 100}%` }}
                            ></div>
                        </div>
                    </div>
                </div>

                {/* Right Panel - Quick Actions */}
                <div className="menu-panel actions-panel">
                    <h2 className="panel-title">Quick Access</h2>

                    <div className="action-buttons">
                        <button
                            className="action-btn multiplayer-btn"
                            onClick={() => {
                                setSelectedMode('multiplayer');
                                onJoinMatchmaking(selectedSize, 'multiplayer');
                            }}
                        >
                            <span className="btn-icon">⚔️</span>
                            <div className="btn-content">
                                <div className="btn-title">Multiplayer</div>
                                <div className="btn-subtitle">Find an opponent</div>
                            </div>
                        </button>

                        <button
                            className="action-btn leaderboard-btn"
                            onClick={() => onNavigate('leaderboard')}
                        >
                            <span className="btn-icon">🏅</span>
                            <div className="btn-content">
                                <div className="btn-title">Leaderboards</div>
                                <div className="btn-subtitle">View rankings</div>
                            </div>
                        </button>

                        <button
                            className="action-btn achievements-btn"
                            onClick={() => onNavigate('achievements')}
                        >
                            <span className="btn-icon">🎖️</span>
                            <div className="btn-content">
                                <div className="btn-title">Achievements</div>
                                <div className="btn-subtitle">Track progress</div>
                            </div>
                        </button>

                        <button
                            className="action-btn powerups-btn"
                            onClick={() => onNavigate('powerups')}
                        >
                            <span className="btn-icon">✨</span>
                            <div className="btn-content">
                                <div className="btn-title">Powerups</div>
                                <div className="btn-subtitle">Manage inventory</div>
                            </div>
                        </button>

                        <button
                            className="action-btn profile-btn"
                            onClick={() => onNavigate('profile')}
                        >
                            <span className="btn-icon">👤</span>
                            <div className="btn-content">
                                <div className="btn-title">Profile</div>
                                <div className="btn-subtitle">View & edit</div>
                            </div>
                        </button>
                    </div>

                    {/* Theme Preview */}
                    <div className="current-theme">
                        <div className="theme-label">Current Theme</div>
                        <div className="theme-name">{currentTheme.charAt(0).toUpperCase() + currentTheme.slice(1)}</div>
                        <div className="theme-preview">
                            <div className="theme-color-1"></div>
                            <div className="theme-color-2"></div>
                            <div className="theme-color-3"></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default MainMenu;
