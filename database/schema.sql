
-- Drop existing tables in reverse dependency order
DROP TABLE IF EXISTS user_powerups;
DROP TABLE IF EXISTS powerups;
DROP TABLE IF EXISTS user_achievements;
DROP TABLE IF EXISTS achievements;
DROP TABLE IF EXISTS leaderboards;
DROP TABLE IF EXISTS game_moves;
DROP TABLE IF EXISTS game_sessions;
DROP TABLE IF EXISTS puzzle_configs;
DROP TABLE IF EXISTS user_preferences;
DROP TABLE IF EXISTS user_stats;
DROP TABLE IF EXISTS users;

CREATE TABLE users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    display_name VARCHAR(100),
    avatar_url VARCHAR(255) DEFAULT '/images/default-avatar.png',
    bio TEXT,
    
    -- Game progression
    level INT DEFAULT 1,
    experience_points INT DEFAULT 0,
    current_theme VARCHAR(50) DEFAULT 'dasher',
    
    -- Account status
    is_active BOOLEAN DEFAULT TRUE,
    is_verified BOOLEAN DEFAULT FALSE,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Indexes for performance
    INDEX idx_username (username),
    INDEX idx_email (email),
    INDEX idx_level (level),
    INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE user_stats (
    stat_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    
    -- Overall game statistics
    total_games INT DEFAULT 0,
    total_wins INT DEFAULT 0,
    total_losses INT DEFAULT 0,
    total_draws INT DEFAULT 0,
    win_rate DECIMAL(5,2) DEFAULT 0.00,
    
    -- Performance metrics
    average_completion_time INT DEFAULT 0, -- in seconds
    best_completion_time INT DEFAULT 0,
    average_moves DECIMAL(8,2) DEFAULT 0.00,
    best_move_count INT DEFAULT 0,
    
    -- Competitive stats
    elo_rating INT DEFAULT 1000,
    rank_position INT DEFAULT 0,
    current_win_streak INT DEFAULT 0,
    current_loss_streak INT DEFAULT 0,
    best_win_streak INT DEFAULT 0,
    
    -- Mode-specific stats
    speed_mode_wins INT DEFAULT 0,
    fewest_moves_wins INT DEFAULT 0,
    multiplayer_wins INT DEFAULT 0,
    practice_games INT DEFAULT 0,
    
    -- Board size statistics
    games_3x3 INT DEFAULT 0,
    games_4x4 INT DEFAULT 0,
    games_6x6 INT DEFAULT 0,
    games_8x8 INT DEFAULT 0,
    games_10x10 INT DEFAULT 0,
    
    -- Timestamps
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Foreign key and indexes
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_stat (user_id),
    INDEX idx_elo (elo_rating),
    INDEX idx_rank (rank_position),
    INDEX idx_win_rate (win_rate)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE user_preferences (
    preference_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    
    -- Theme preferences
    selected_theme VARCHAR(50) DEFAULT 'dasher',
    unlocked_themes JSON, -- Array of unlocked theme names
    
    -- Audio settings
    sound_enabled BOOLEAN DEFAULT TRUE,
    music_enabled BOOLEAN DEFAULT TRUE,
    sound_volume DECIMAL(3,2) DEFAULT 0.70,
    music_volume DECIMAL(3,2) DEFAULT 0.50,
    
    -- Gameplay preferences
    default_board_size INT DEFAULT 4,
    default_game_mode VARCHAR(50) DEFAULT 'speed',
    show_move_counter BOOLEAN DEFAULT TRUE,
    show_timer BOOLEAN DEFAULT TRUE,
    enable_animations BOOLEAN DEFAULT TRUE,
    animation_speed VARCHAR(20) DEFAULT 'normal', -- slow, normal, fast
    
    -- UI preferences
    show_hints BOOLEAN DEFAULT TRUE,
    auto_matchmaking BOOLEAN DEFAULT FALSE,
    receive_notifications BOOLEAN DEFAULT TRUE,
    
    -- Privacy settings
    profile_public BOOLEAN DEFAULT TRUE,
    show_online_status BOOLEAN DEFAULT TRUE,
    allow_friend_requests BOOLEAN DEFAULT TRUE,
    
    -- Timestamps
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Foreign key and indexes
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_pref (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE puzzle_configs (
    config_id INT AUTO_INCREMENT PRIMARY KEY,
    
    -- Puzzle details
    board_size INT NOT NULL,
    initial_state JSON NOT NULL, -- Array of tile positions
    solution_state JSON NOT NULL, -- Solved state
    
    -- Difficulty metrics
    difficulty_rating VARCHAR(20), -- 'easy', 'medium', 'hard', 'expert'
    minimum_moves INT NOT NULL, -- Theoretical minimum to solve
    average_completion_time INT DEFAULT 0, -- Average from all attempts
    
    -- Usage statistics
    times_played INT DEFAULT 0,
    times_completed INT DEFAULT 0,
    completion_rate DECIMAL(5,2) DEFAULT 0.00,
    
    -- Solvability verification
    is_solvable BOOLEAN DEFAULT TRUE,
    inversion_count INT NOT NULL,
    
    -- Image reference (if using custom images)
    image_url VARCHAR(255),
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Indexes
    INDEX idx_board_size (board_size),
    INDEX idx_difficulty (difficulty_rating),
    INDEX idx_times_played (times_played)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE game_sessions (
    session_id INT AUTO_INCREMENT PRIMARY KEY,
    
    -- Player information
    player1_id INT NOT NULL,
    player2_id INT NULL, -- NULL for single player
    winner_id INT NULL,
    
    -- Game configuration
    board_size INT NOT NULL,
    game_mode VARCHAR(50) NOT NULL, -- 'speed', 'fewest_moves', 'multiplayer', 'practice'
    puzzle_config_id INT NULL,
    
    -- Game results
    status VARCHAR(20) DEFAULT 'in_progress', -- in_progress, completed, abandoned, draw
    completion_time INT NULL, -- in seconds
    move_count INT DEFAULT 0,
    
    -- Player 1 metrics
    player1_moves INT DEFAULT 0,
    player1_time INT DEFAULT 0,
    player1_elo_change INT DEFAULT 0,
    player1_powerups_used JSON, -- Array of powerup IDs used
    
    -- Player 2 metrics (for multiplayer)
    player2_moves INT NULL,
    player2_time INT NULL,
    player2_elo_change INT DEFAULT 0,
    player2_powerups_used JSON,
    
    -- Performance tracking
    perfect_game BOOLEAN DEFAULT FALSE, -- Completed with minimum moves
    speed_bonus BOOLEAN DEFAULT FALSE, -- Completed under time threshold
    
    -- Timestamps
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP NULL,
    
    -- Foreign keys and indexes
    FOREIGN KEY (player1_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (player2_id) REFERENCES users(user_id) ON DELETE SET NULL,
    FOREIGN KEY (winner_id) REFERENCES users(user_id) ON DELETE SET NULL,
    FOREIGN KEY (puzzle_config_id) REFERENCES puzzle_configs(config_id) ON DELETE SET NULL,
    
    INDEX idx_player1 (player1_id),
    INDEX idx_player2 (player2_id),
    INDEX idx_status (status),
    INDEX idx_mode (game_mode),
    INDEX idx_started (started_at),
    INDEX idx_board_size (board_size)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE game_moves (
    move_id INT AUTO_INCREMENT PRIMARY KEY,
    session_id INT NOT NULL,
    user_id INT NOT NULL,
    
    -- Move details
    move_number INT NOT NULL,
    tile_position INT NOT NULL, -- Original tile position (0-based index)
    empty_position INT NOT NULL, -- Empty space position before move
    direction VARCHAR(10) NOT NULL, -- 'up', 'down', 'left', 'right'
    
    -- Board state after move (JSON array of tile positions)
    board_state JSON NOT NULL,
    
    -- Timing
    time_elapsed INT NOT NULL, -- Milliseconds since game start
    move_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign keys and indexes
    FOREIGN KEY (session_id) REFERENCES game_sessions(session_id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    
    INDEX idx_session (session_id),
    INDEX idx_user (user_id),
    INDEX idx_move_number (move_number)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE leaderboards (
    leaderboard_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    
    -- Ranking categories
    category VARCHAR(50) NOT NULL, -- 'speed_overall', 'moves_overall', 'speed_4x4', etc.
    board_size INT,
    
    -- Ranking metrics
    rank_position INT NOT NULL,
    score DECIMAL(12,2) NOT NULL, -- Time in seconds or move count
    elo_rating INT DEFAULT 1000,
    
    -- Additional stats
    total_games INT DEFAULT 0,
    win_rate DECIMAL(5,2) DEFAULT 0.00,
    
    -- Time period
    season VARCHAR(50) DEFAULT 'all_time', -- 'all_time', 'monthly', 'weekly'
    season_start DATE NULL,
    season_end DATE NULL,
    
    -- Timestamps
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Foreign keys and indexes
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    
    UNIQUE KEY unique_ranking (user_id, category, season),
    INDEX idx_category (category),
    INDEX idx_rank (rank_position),
    INDEX idx_score (score),
    INDEX idx_season (season)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE achievements (
    achievement_id INT AUTO_INCREMENT PRIMARY KEY,
    
    -- Achievement details
    achievement_key VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    
    -- Requirements
    category VARCHAR(50) NOT NULL, -- 'gameplay', 'speed', 'efficiency', 'competitive', 'special'
    requirement_type VARCHAR(50) NOT NULL, -- 'games_played', 'wins', 'perfect_games', 'time', etc.
    requirement_value INT NOT NULL,
    
    -- Rewards
    xp_reward INT DEFAULT 0,
    powerup_reward VARCHAR(50) NULL,
    theme_unlock VARCHAR(50) NULL,
    
    -- Display
    icon_url VARCHAR(255),
    badge_color VARCHAR(20) DEFAULT 'gold',
    rarity VARCHAR(20) DEFAULT 'common', -- common, rare, epic, legendary
    
    -- Statistics
    times_unlocked INT DEFAULT 0,
    unlock_percentage DECIMAL(5,2) DEFAULT 0.00,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Indexes
    INDEX idx_category (category),
    INDEX idx_rarity (rarity)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE user_achievements (
    user_achievement_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    achievement_id INT NOT NULL,
    
    -- Progress tracking
    current_progress INT DEFAULT 0,
    required_progress INT NOT NULL,
    is_completed BOOLEAN DEFAULT FALSE,
    
    -- Timestamps
    unlocked_at TIMESTAMP NULL,
    progress_updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Foreign keys and indexes
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (achievement_id) REFERENCES achievements(achievement_id) ON DELETE CASCADE,
    
    UNIQUE KEY unique_user_achievement (user_id, achievement_id),
    INDEX idx_user (user_id),
    INDEX idx_completed (is_completed),
    INDEX idx_unlocked (unlocked_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE powerups (
    powerup_id INT AUTO_INCREMENT PRIMARY KEY,
    
    -- Power-up details
    powerup_key VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    
    -- Mechanics
    effect_type VARCHAR(50) NOT NULL, -- 'hint', 'time_freeze', 'auto_solve', etc.
    duration INT DEFAULT 0, -- in seconds, 0 for instant effects
    cooldown INT DEFAULT 0, -- in seconds
    
    -- Availability
    rarity VARCHAR(20) DEFAULT 'common',
    cost_type VARCHAR(20) DEFAULT 'earned', -- 'earned', 'purchased', 'achievement'
    
    -- Usage restrictions
    usable_in_multiplayer BOOLEAN DEFAULT TRUE,
    usable_in_competitive BOOLEAN DEFAULT FALSE,
    max_per_game INT DEFAULT 1,
    
    -- Display
    icon_url VARCHAR(255),
    color VARCHAR(20) DEFAULT 'blue',
    
    -- Statistics
    times_used INT DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Indexes
    INDEX idx_rarity (rarity)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE user_powerups (
    user_powerup_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    powerup_id INT NOT NULL,
    
    -- Inventory
    quantity INT DEFAULT 0,
    times_used INT DEFAULT 0,
    
    -- Timestamps
    first_acquired_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_used_at TIMESTAMP NULL,
    
    -- Foreign keys and indexes
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (powerup_id) REFERENCES powerups(powerup_id) ON DELETE CASCADE,
    
    UNIQUE KEY unique_user_powerup (user_id, powerup_id),
    INDEX idx_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO achievements (achievement_key, name, description, category, requirement_type, requirement_value, xp_reward, rarity) VALUES
-- Gameplay achievements
('first_steps', 'First Steps', 'Complete your first puzzle', 'gameplay', 'games_completed', 1, 100, 'common'),
('puzzle_enthusiast', 'Puzzle Enthusiast', 'Complete 10 puzzles', 'gameplay', 'games_completed', 10, 250, 'common'),
('puzzle_master', 'Puzzle Master', 'Complete 50 puzzles', 'gameplay', 'games_completed', 50, 500, 'rare'),
('puzzle_legend', 'Puzzle Legend', 'Complete 100 puzzles', 'gameplay', 'games_completed', 100, 1000, 'epic'),
('puzzle_god', 'Puzzle God', 'Complete 500 puzzles', 'gameplay', 'games_completed', 500, 5000, 'legendary'),

-- Speed achievements
('speed_demon', 'Speed Demon', 'Complete a 4x4 puzzle in under 60 seconds', 'speed', 'completion_time', 60, 300, 'rare'),
('lightning_fast', 'Lightning Fast', 'Complete a 4x4 puzzle in under 30 seconds', 'speed', 'completion_time', 30, 500, 'epic'),
('time_master', 'Time Master', 'Complete a 4x4 puzzle in under 20 seconds', 'speed', 'completion_time', 20, 1000, 'legendary'),

-- Efficiency achievements
('efficient_solver', 'Efficient Solver', 'Complete a puzzle with minimum moves', 'efficiency', 'perfect_games', 1, 400, 'rare'),
('perfectionist', 'Perfectionist', 'Complete 5 puzzles with minimum moves', 'efficiency', 'perfect_games', 5, 800, 'epic'),
('move_optimizer', 'Move Optimizer', 'Complete 20 puzzles with minimum moves', 'efficiency', 'perfect_games', 20, 2000, 'legendary'),

-- Competitive achievements
('first_victory', 'First Victory', 'Win your first multiplayer match', 'competitive', 'multiplayer_wins', 1, 200, 'common'),
('champion', 'Champion', 'Win 10 multiplayer matches', 'competitive', 'multiplayer_wins', 10, 500, 'rare'),
('grand_champion', 'Grand Champion', 'Win 50 multiplayer matches', 'competitive', 'multiplayer_wins', 50, 1500, 'epic'),
('win_streak_3', 'Hat Trick', 'Win 3 matches in a row', 'competitive', 'win_streak', 3, 300, 'rare'),
('win_streak_5', 'Unstoppable', 'Win 5 matches in a row', 'competitive', 'win_streak', 5, 600, 'epic'),
('win_streak_10', 'Legendary Streak', 'Win 10 matches in a row', 'competitive', 'win_streak', 10, 2000, 'legendary'),
('elo_1500', 'Rising Star', 'Reach 1500 ELO rating', 'competitive', 'elo_rating', 1500, 400, 'rare'),
('elo_1800', 'Elite Player', 'Reach 1800 ELO rating', 'competitive', 'elo_rating', 1800, 800, 'epic'),
('elo_2200', 'Master Rank', 'Reach 2200 ELO rating', 'competitive', 'elo_rating', 2200, 2000, 'legendary'),

-- Reindeer-themed special achievements
('dasher_devotee', 'Dasher Devotee', 'Complete 25 puzzles with Dasher theme', 'special', 'themed_games', 25, 300, 'rare'),
('prancer_pro', 'Prancer Pro', 'Unlock and use the Prancer theme', 'special', 'theme_unlock', 1, 400, 'rare'),
('comet_collector', 'Comet Collector', 'Unlock and use the Comet theme', 'special', 'theme_unlock', 1, 600, 'epic'),
('blitzen_master', 'Blitzen Master', 'Unlock and use the Blitzen theme', 'special', 'theme_unlock', 1, 800, 'epic'),
('rudolph_rider', 'Rudolph Rider', 'Unlock the legendary Rudolph theme', 'special', 'theme_unlock', 1, 1500, 'legendary'),
('aurora_achiever', 'Aurora Achiever', 'Unlock the mystical Aurora theme', 'special', 'theme_unlock', 1, 2000, 'legendary'),

-- Board size achievements
('tiny_titan', 'Tiny Titan', 'Complete 20 puzzles on 3x3 board', 'gameplay', 'board_size_3x3', 20, 200, 'common'),
('classic_champion', 'Classic Champion', 'Complete 50 puzzles on 4x4 board', 'gameplay', 'board_size_4x4', 50, 300, 'rare'),
('mega_master', 'Mega Master', 'Complete 30 puzzles on 6x6 board', 'gameplay', 'board_size_6x6', 30, 500, 'epic'),
('giant_genius', 'Giant Genius', 'Complete 20 puzzles on 8x8 board', 'gameplay', 'board_size_8x8', 20, 800, 'epic'),
('colossal_conqueror', 'Colossal Conqueror', 'Complete 10 puzzles on 10x10 board', 'gameplay', 'board_size_10x10', 10, 1500, 'legendary');

INSERT INTO powerups (powerup_key, name, description, effect_type, duration, cooldown, rarity, usable_in_competitive, max_per_game, color) VALUES
('peek', 'Peek', 'Briefly show the solution for 3 seconds', 'peek', 3, 60, 'common', FALSE, 2, 'cyan'),
('hint', 'Hint', 'Highlight the correct next move', 'hint', 0, 45, 'common', TRUE, 3, 'green'),
('shuffle_helper', 'Shuffle Helper', 'Organize all corner pieces automatically', 'auto_arrange', 0, 90, 'rare', FALSE, 1, 'purple'),
('time_freeze', 'Time Freeze', 'Pause the timer for 10 seconds', 'time_freeze', 10, 120, 'rare', FALSE, 1, 'blue'),
('auto_solve_3', 'Auto-Solve 3', 'Automatically solve 3 random pieces', 'auto_solve', 0, 180, 'epic', FALSE, 1, 'gold'),
('undo_move', 'Undo', 'Reverse your last move', 'undo', 0, 30, 'common', TRUE, 5, 'orange'),
('slow_motion', 'Slow Motion', 'Reduce opponent speed by 30% for 15 seconds', 'debuff_opponent', 15, 120, 'epic', TRUE, 1, 'red'),
('ghost_tile', 'Ghost Tile', 'Make a tile semi-transparent to see placement', 'visual_aid', 5, 60, 'rare', TRUE, 2, 'silver');


-- View: Top players by ELO
CREATE OR REPLACE VIEW v_top_players AS
SELECT 
    u.user_id,
    u.username,
    u.display_name,
    u.level,
    us.elo_rating,
    us.total_wins,
    us.win_rate,
    us.best_completion_time,
    us.rank_position
FROM users u
JOIN user_stats us ON u.user_id = us.user_id
WHERE u.is_active = TRUE
ORDER BY us.elo_rating DESC
LIMIT 100;

-- View: Recent game activity
CREATE OR REPLACE VIEW v_recent_games AS
SELECT 
    gs.session_id,
    gs.game_mode,
    gs.board_size,
    gs.status,
    u1.username AS player1_username,
    u2.username AS player2_username,
    uw.username AS winner_username,
    gs.completion_time,
    gs.move_count,
    gs.started_at,
    gs.completed_at
FROM game_sessions gs
JOIN users u1 ON gs.player1_id = u1.user_id
LEFT JOIN users u2 ON gs.player2_id = u2.user_id
LEFT JOIN users uw ON gs.winner_id = uw.user_id
ORDER BY gs.started_at DESC
LIMIT 50;

-- View: Achievement completion rates
CREATE OR REPLACE VIEW v_achievement_stats AS
SELECT 
    a.achievement_id,
    a.name,
    a.category,
    a.rarity,
    a.times_unlocked,
    ROUND((a.times_unlocked * 100.0 / (SELECT COUNT(*) FROM users)), 2) AS unlock_percentage
FROM achievements a
ORDER BY unlock_percentage DESC;


DELIMITER //

-- Procedure: Update user statistics after game completion
CREATE PROCEDURE sp_update_user_stats(
    IN p_user_id INT,
    IN p_is_win BOOLEAN,
    IN p_completion_time INT,
    IN p_move_count INT,
    IN p_board_size INT,
    IN p_game_mode VARCHAR(50)
)
BEGIN
    DECLARE current_streak INT;
    
    -- Update basic stats
    UPDATE user_stats 
    SET 
        total_games = total_games + 1,
        total_wins = total_wins + IF(p_is_win, 1, 0),
        total_losses = total_losses + IF(p_is_win, 0, 1),
        win_rate = ROUND((total_wins + IF(p_is_win, 1, 0)) * 100.0 / (total_games + 1), 2),
        average_completion_time = ROUND((average_completion_time * total_games + p_completion_time) / (total_games + 1)),
        best_completion_time = IF(p_completion_time > 0 AND (best_completion_time = 0 OR p_completion_time < best_completion_time), p_completion_time, best_completion_time),
        average_moves = ROUND((average_moves * total_games + p_move_count) / (total_games + 1), 2),
        best_move_count = IF(best_move_count = 0 OR p_move_count < best_move_count, p_move_count, best_move_count),
        current_win_streak = IF(p_is_win, current_win_streak + 1, 0),
        current_loss_streak = IF(p_is_win, 0, current_loss_streak + 1),
        best_win_streak = GREATEST(best_win_streak, IF(p_is_win, current_win_streak + 1, current_win_streak))
    WHERE user_id = p_user_id;
    
    -- Update mode-specific stats
    IF p_game_mode = 'speed' THEN
        UPDATE user_stats SET speed_mode_wins = speed_mode_wins + IF(p_is_win, 1, 0) WHERE user_id = p_user_id;
    ELSEIF p_game_mode = 'fewest_moves' THEN
        UPDATE user_stats SET fewest_moves_wins = fewest_moves_wins + IF(p_is_win, 1, 0) WHERE user_id = p_user_id;
    ELSEIF p_game_mode = 'multiplayer' THEN
        UPDATE user_stats SET multiplayer_wins = multiplayer_wins + IF(p_is_win, 1, 0) WHERE user_id = p_user_id;
    ELSEIF p_game_mode = 'practice' THEN
        UPDATE user_stats SET practice_games = practice_games + 1 WHERE user_id = p_user_id;
    END IF;
    
    -- Update board size stats
    UPDATE user_stats
    SET
        games_3x3 = games_3x3 + IF(p_board_size = 3, 1, 0),
        games_4x4 = games_4x4 + IF(p_board_size = 4, 1, 0),
        games_6x6 = games_6x6 + IF(p_board_size = 6, 1, 0),
        games_8x8 = games_8x8 + IF(p_board_size = 8, 1, 0),
        games_10x10 = games_10x10 + IF(p_board_size = 10, 1, 0)
    WHERE user_id = p_user_id;
END //

-- Procedure: Calculate and update ELO ratings
CREATE PROCEDURE sp_update_elo(
    IN p_player1_id INT,
    IN p_player2_id INT,
    IN p_winner_id INT
)
BEGIN
    DECLARE player1_elo INT;
    DECLARE player2_elo INT;
    DECLARE expected1 DECIMAL(5,4);
    DECLARE expected2 DECIMAL(5,4);
    DECLARE actual1 DECIMAL(5,4);
    DECLARE actual2 DECIMAL(5,4);
    DECLARE k_factor INT DEFAULT 32;
    DECLARE elo_change1 INT;
    DECLARE elo_change2 INT;
    
    -- Get current ELO ratings
    SELECT elo_rating INTO player1_elo FROM user_stats WHERE user_id = p_player1_id;
    SELECT elo_rating INTO player2_elo FROM user_stats WHERE user_id = p_player2_id;
    
    -- Calculate expected scores
    SET expected1 = 1 / (1 + POW(10, (player2_elo - player1_elo) / 400.0));
    SET expected2 = 1 / (1 + POW(10, (player1_elo - player2_elo) / 400.0));
    
    -- Determine actual scores
    IF p_winner_id = p_player1_id THEN
        SET actual1 = 1.0;
        SET actual2 = 0.0;
    ELSEIF p_winner_id = p_player2_id THEN
        SET actual1 = 0.0;
        SET actual2 = 1.0;
    ELSE
        -- Draw
        SET actual1 = 0.5;
        SET actual2 = 0.5;
    END IF;
    
    -- Calculate ELO changes
    SET elo_change1 = ROUND(k_factor * (actual1 - expected1));
    SET elo_change2 = ROUND(k_factor * (actual2 - expected2));
    
    -- Update ELO ratings (min 800, max 3000)
    UPDATE user_stats 
    SET elo_rating = GREATEST(800, LEAST(3000, elo_rating + elo_change1))
    WHERE user_id = p_player1_id;
    
    UPDATE user_stats 
    SET elo_rating = GREATEST(800, LEAST(3000, elo_rating + elo_change2))
    WHERE user_id = p_player2_id;
    
    -- Return ELO changes
    SELECT elo_change1 AS player1_change, elo_change2 AS player2_change;
END //

DELIMITER ;


-- Trigger: Create user stats when new user is created
DELIMITER //
CREATE TRIGGER tr_create_user_stats
AFTER INSERT ON users
FOR EACH ROW
BEGIN
    INSERT INTO user_stats (user_id) VALUES (NEW.user_id);
    INSERT INTO user_preferences (user_id) VALUES (NEW.user_id);
END //
DELIMITER ;

-- Additional composite indexes for common query patterns
CREATE INDEX idx_game_sessions_player_status ON game_sessions(player1_id, status);
CREATE INDEX idx_game_sessions_mode_completed ON game_sessions(game_mode, completed_at);
CREATE INDEX idx_leaderboards_category_rank ON leaderboards(category, rank_position);
CREATE INDEX idx_user_achievements_user_completed ON user_achievements(user_id, is_completed);

-- Full-text search indexes
ALTER TABLE users ADD FULLTEXT INDEX ft_username_display (username, display_name);

