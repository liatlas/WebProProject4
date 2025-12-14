import React, { useState, useEffect } from 'react';

function GameBoard({
    board,
    boardSize,
    gameMode,
    moveCount,
    gameTime,
    isActive,
    isPaused,
    opponent,
    opponentBoard,
    userPowerups,
    onTileClick,
    onUsePowerup,
    onPause,
    onQuit,
    currentTheme,
    preferences
}) {

    console.log('Board:', board);
    console.log('Board size:', boardSize);
    console.log('Board length:', board.length);

    const [hintTile, setHintTile] = useState(null);
    const [showSolution, setShowSolution] = useState(false);
    const [selectedPowerup, setSelectedPowerup] = useState(null);

    // Format time as MM:SS
    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    // Get tile position styles
    const getTileStyle = (index) => {
        const row = Math.floor(index / boardSize);
        const col = index % boardSize;
        const tileSize = 100 / boardSize;

        return {
            position: 'absolute',
            width: `calc(${tileSize}% - 4px)`,
            height: `calc(${tileSize}% - 4px)`,
            left: `${col * tileSize}%`,
            top: `${row * tileSize}%`,
            transition: 'all 0.3s ease',
            border: '2px solid rgba(212, 175, 55, 0.3)',
            boxSizing: 'border-box',
            overflow: 'hidden'
        };
    };

    const getImagePosition = (tileValue) => {
        if (tileValue === 0) return {}; // empty tile

        const percentPerTile = 100 / boardSize;
        const tileIndex = tileValue - 1;
        const row = Math.floor(tileIndex / boardSize);
        const col = tileIndex % boardSize;

        return {
            backgroundImage: `url(/images/puzzle-complete.jpg)`,
            backgroundPosition: `${col * percentPerTile}% ${row * percentPerTile}%`,
            backgroundSize: `${boardSize * 100}% ${boardSize * 100}%`,
            backgroundRepeat: 'no-repeat',
            width: '100%',
            height: '100%',
        };
    };




    // Handle powerup usage
    const handlePowerupClick = (powerupKey) => {
        if (selectedPowerup === powerupKey) {
            setSelectedPowerup(null);
        } else {
            setSelectedPowerup(powerupKey);

            // Auto-activate certain powerups
            if (powerupKey === 'peek') {
                onUsePowerup(powerupKey);
                setShowSolution(true);
                setTimeout(() => setShowSolution(false), 3000);
            } else if (powerupKey === 'hint') {
                onUsePowerup(powerupKey);
                // Hint logic handled in parent
            } else {
                onUsePowerup(powerupKey);
            }
        }
    };

    return (
        <div className="game-screen">
            {/* Game Header */}
            <header className="game-header">
                <div className="header-left">
                    <button className="btn btn-secondary" onClick={onQuit}>
                        ← Back
                    </button>
                    <div className="game-mode-badge">
                        {gameMode === 'speed' && '⚡ Speed Mode'}
                        {gameMode === 'fewest_moves' && '🎯 Fewest Moves'}
                        {gameMode === 'practice' && '📚 Practice'}
                        {gameMode === 'multiplayer' && '⚔️ Multiplayer'}
                    </div>
                </div>

                <div className="header-center">
                    <div className="game-stats">
                        {preferences?.show_timer && (
                            <div className="stat-item">
                                <span className="stat-icon">⏱️</span>
                                <span className="stat-value">{formatTime(gameTime)}</span>
                            </div>
                        )}

                        {preferences?.show_move_counter && (
                            <div className="stat-item">
                                <span className="stat-icon">🔢</span>
                                <span className="stat-value">{moveCount} moves</span>
                            </div>
                        )}
                    </div>
                </div>

                <div className="header-right">
                    <button
                        className="btn btn-secondary"
                        onClick={onPause}
                        disabled={!isActive}
                    >
                        {isPaused ? '▶️ Resume' : '⏸️ Pause'}
                    </button>
                </div>
            </header>

            {/* Main Game Area */}
            <div className="game-content">
                {/* Opponent Board (Multiplayer) */}
                {gameMode === 'multiplayer' && opponent && (
                    <div className="opponent-area">
                        <div className="opponent-header">
                            <div className="opponent-name">{opponent.username}</div>
                            <div className="opponent-status">Playing...</div>
                        </div>
                        <div className={`puzzle-board mini-board size-${boardSize}`}>
                            {opponentBoard.map((tile, index) => (
                                tile !== 0 && (
                                    <div
                                        key={index}
                                        className="puzzle-tile mini-tile"
                                        style={getTileStyle(index)}
                                    >
                                        <div
                                            className="tile-image"
                                            style={{
                                                ...getImagePosition(tile),
                                                backgroundImage: `url(/images/puzzle-complete.jpg)`
                                            }}
                                        />
                                    </div>
                                )
                            ))}
                        </div>
                    </div>
                )}

                {/* Main Puzzle Board */}
                <div className="puzzle-container">
                    <div className={`puzzle-board size-${boardSize} ${showSolution ? 'show-solution' : ''}`}>
                        {board.map((tile, index) => {
                            if (tile === 0) return null; // Empty space

                            const isHinted = hintTile === index;

                            return (
                                <div
                                    key={index}
                                    className={`puzzle-tile ${isHinted ? 'hinted' : ''} ${!isActive || isPaused ? 'disabled' : ''}`}
                                    style={getTileStyle(index)}
                                    onClick={() => onTileClick(index)}
                                >
                                    <div
                                        className="tile-image"
                                        style={getImagePosition(tile)}
                                    />
                                    {preferences?.show_move_counter && (
                                        <div className="tile-number">{tile}</div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                    {/* Pause Overlay */}
                    {isPaused && (
                        <div className="pause-overlay">
                            <div className="pause-content">
                                <h2>⏸️ Paused</h2>
                                <p>Click Resume to continue</p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Powerups Panel */}
                <div className="powerups-panel">
                    <h3 className="panel-title">Powerups</h3>
                    <div className="powerups-list">
                        {userPowerups.length === 0 ? (
                            <div className="no-powerups">
                                <p>No powerups available</p>
                                <small>Win games to earn powerups</small>
                            </div>
                        ) : (
                            userPowerups.map(powerup => (
                                <button
                                    key={powerup.powerup_key}
                                    className={`powerup-btn ${powerup.quantity <= 0 ? 'disabled' : ''} ${selectedPowerup === powerup.powerup_key ? 'selected' : ''}`}
                                    onClick={() => handlePowerupClick(powerup.powerup_key)}
                                    disabled={powerup.quantity <= 0 || !isActive || isPaused}
                                    title={powerup.description}
                                >
                                    <div className="powerup-icon">{getPowerupIcon(powerup.powerup_key)}</div>
                                    <div className="powerup-name">{powerup.name}</div>
                                    <div className="powerup-quantity">×{powerup.quantity}</div>
                                </button>
                            ))
                        )}
                    </div>

                    {/* Powerup Info */}
                    {selectedPowerup && (
                        <div className="powerup-info">
                            <h4>{userPowerups.find(p => p.powerup_key === selectedPowerup)?.name}</h4>
                            <p>{userPowerups.find(p => p.powerup_key === selectedPowerup)?.description}</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// Helper function to get powerup icons
function getPowerupIcon(key) {
    const icons = {
        'peek': '👁️',
        'hint': '💡',
        'shuffle_helper': '🔄',
        'time_freeze': '⏰',
        'auto_solve_3': '🎯',
        'undo_move': '↩️',
        'slow_motion': '🐌',
        'ghost_tile': '👻'
    };
    return icons[key] || '✨';
}

export default GameBoard;
