const mysql = require("mysql2/promise");
require("dotenv").config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "reindeer_puzzle",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
});

// Test database connection on startup
pool
  .getConnection()
  .then((connection) => {
    console.log(" Database connected successfully");
    connection.release();
  })
  .catch((err) => {
    console.error(" Database connection failed:", err.message);
    process.exit(1);
  });

const db = {
  // Create new user with hashed password
  async createUser(username, email, passwordHash, displayName) {
    const [result] = await pool.execute(
      `INSERT INTO users (username, email, password_hash, display_name) 
             VALUES (?, ?, ?, ?)`,
      [username, email, passwordHash, displayName || username],
    );
    return result.insertId;
  },

  // Find user by username for login
  async findUserByUsername(username) {
    const [rows] = await pool.execute(
      `SELECT * FROM users WHERE username = ? AND is_active = TRUE`,
      [username],
    );
    return rows[0];
  },

  // Find user by email
  async findUserByEmail(email) {
    const [rows] = await pool.execute(
      `SELECT * FROM users WHERE email = ? AND is_active = TRUE`,
      [email],
    );
    return rows[0];
  },

  // Get user by ID with stats
  async getUserById(userId) {
    const [rows] = await pool.execute(
      `SELECT u.*, us.* 
             FROM users u
             LEFT JOIN user_stats us ON u.user_id = us.user_id
             WHERE u.user_id = ?`,
      [userId],
    );
    return rows[0];
  },

  // Update user profile
  async updateUserProfile(userId, updates) {
    const allowedFields = [
      "display_name",
      "avatar_url",
      "bio",
      "current_theme",
    ];
    const fields = [];
    const values = [];

    Object.keys(updates).forEach((key) => {
      if (allowedFields.includes(key)) {
        fields.push(`${key} = ?`);
        values.push(updates[key]);
      }
    });

    if (fields.length === 0) return false;

    values.push(userId);
    await pool.execute(
      `UPDATE users SET ${fields.join(", ")} WHERE user_id = ?`,
      values,
    );
    return true;
  },

  // Update last login timestamp
  async updateLastLogin(userId) {
    await pool.execute(
      `UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE user_id = ?`,
      [userId],
    );
  },

  // Add experience points and level up
  async addExperience(userId, xp) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      // Get current XP and level
      const [user] = await connection.execute(
        `SELECT level, experience_points FROM users WHERE user_id = ?`,
        [userId],
      );

      const currentLevel = user[0].level;
      const currentXP = user[0].experience_points;
      const newXP = currentXP + xp;

      // Calculate new level (100 XP per level, scaling)
      const xpForNextLevel = currentLevel * 100;
      let newLevel = currentLevel;
      let remainingXP = newXP;

      while (remainingXP >= newLevel * 100) {
        remainingXP -= newLevel * 100;
        newLevel++;
      }

      // Update user
      await connection.execute(
        `UPDATE users SET level = ?, experience_points = ? WHERE user_id = ?`,
        [newLevel, remainingXP, userId],
      );

      await connection.commit();
      return {
        oldLevel: currentLevel,
        newLevel,
        leveledUp: newLevel > currentLevel,
      };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  },

  async getUserStats(userId) {
    const [rows] = await pool.execute(
      `SELECT * FROM user_stats WHERE user_id = ?`,
      [userId],
    );
    return rows[0];
  },

  // Update stats after game (uses stored procedure)
  async updateUserStatsAfterGame(
    userId,
    isWin,
    completionTime,
    moveCount,
    boardSize,
    gameMode,
  ) {
    await pool.execute(`CALL sp_update_user_stats(?, ?, ?, ?, ?, ?)`, [
      userId,
      isWin,
      completionTime,
      moveCount,
      boardSize,
      gameMode,
    ]);
  },

  async getUserPreferences(userId) {
    const [rows] = await pool.execute(
      `SELECT * FROM user_preferences WHERE user_id = ?`,
      [userId],
    );
    return rows[0];
  },

  async updateUserPreferences(userId, preferences) {
    const allowedFields = [
      "selected_theme",
      "sound_enabled",
      "music_enabled",
      "sound_volume",
      "music_volume",
      "default_board_size",
      "default_game_mode",
      "show_move_counter",
      "show_timer",
      "enable_animations",
      "animation_speed",
      "show_hints",
      "auto_matchmaking",
      "receive_notifications",
      "profile_public",
      "show_online_status",
      "allow_friend_requests",
    ];

    const fields = [];
    const values = [];

    Object.keys(preferences).forEach((key) => {
      if (allowedFields.includes(key)) {
        fields.push(`${key} = ?`);
        values.push(preferences[key]);
      }
    });

    if (fields.length === 0) return false;

    values.push(userId);
    await pool.execute(
      `UPDATE user_preferences SET ${fields.join(", ")} WHERE user_id = ?`,
      values,
    );
    return true;
  },

  async unlockTheme(userId, themeName) {
    const [current] = await pool.execute(
      `SELECT unlocked_themes FROM user_preferences WHERE user_id = ?`,
      [userId],
    );

    let themes = [];
    if (current[0].unlocked_themes) {
      themes = JSON.parse(current[0].unlocked_themes);
    }

    if (!themes.includes(themeName)) {
      themes.push(themeName);
      await pool.execute(
        `UPDATE user_preferences SET unlocked_themes = ? WHERE user_id = ?`,
        [JSON.stringify(themes), userId],
      );
    }

    return themes;
  },

  async createGameSession(
    player1Id,
    player2Id,
    boardSize,
    gameMode,
    puzzleConfigId,
  ) {
    const [result] = await pool.execute(
      `INSERT INTO game_sessions (player1_id, player2_id, board_size, game_mode, puzzle_config_id)
             VALUES (?, ?, ?, ?, ?)`,
      [player1Id, player2Id, boardSize, gameMode, puzzleConfigId],
    );
    return result.insertId;
  },

  async getGameSession(sessionId) {
    const [rows] = await pool.execute(
      `SELECT * FROM game_sessions WHERE session_id = ?`,
      [sessionId],
    );
    return rows[0];
  },

  async updateGameSession(sessionId, updates) {
    const allowedFields = [
      "status",
      "winner_id",
      "completion_time",
      "move_count",
      "player1_moves",
      "player1_time",
      "player1_elo_change",
      "player1_powerups_used",
      "player2_moves",
      "player2_time",
      "player2_elo_change",
      "player2_powerups_used",
      "perfect_game",
      "speed_bonus",
    ];

    const fields = [];
    const values = [];

    Object.keys(updates).forEach((key) => {
      if (allowedFields.includes(key)) {
        fields.push(`${key} = ?`);
        if (key.includes("powerups_used") && typeof updates[key] === "object") {
          values.push(JSON.stringify(updates[key]));
        } else {
          values.push(updates[key]);
        }
      }
    });

    if (updates.status === "completed") {
      fields.push("completed_at = CURRENT_TIMESTAMP");
    }

    if (fields.length === 0) return false;

    values.push(sessionId);
    await pool.execute(
      `UPDATE game_sessions SET ${fields.join(", ")} WHERE session_id = ?`,
      values,
    );
    return true;
  },

  async getUserGameHistory(userId, limit = 50) {
    const [rows] = await pool.execute(
      `SELECT gs.*, 
                    u1.username as player1_username,
                    u2.username as player2_username,
                    uw.username as winner_username
             FROM game_sessions gs
             JOIN users u1 ON gs.player1_id = u1.user_id
             LEFT JOIN users u2 ON gs.player2_id = u2.user_id
             LEFT JOIN users uw ON gs.winner_id = uw.user_id
             WHERE gs.player1_id = ? OR gs.player2_id = ?
             ORDER BY gs.started_at DESC
             LIMIT ?`,
      [userId, userId, limit],
    );
    return rows;
  },

  async recordMove(
    sessionId,
    userId,
    moveNumber,
    tilePos,
    emptyPos,
    direction,
    boardState,
    timeElapsed,
  ) {
    await pool.execute(
      `INSERT INTO game_moves 
             (session_id, user_id, move_number, tile_position, empty_position, direction, board_state, time_elapsed)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        sessionId,
        userId,
        moveNumber,
        tilePos,
        emptyPos,
        direction,
        JSON.stringify(boardState),
        timeElapsed,
      ],
    );
  },

  async getSessionMoves(sessionId) {
    const [rows] = await pool.execute(
      `SELECT * FROM game_moves WHERE session_id = ? ORDER BY move_number ASC`,
      [sessionId],
    );
    return rows;
  },

  async createPuzzleConfig(
    boardSize,
    initialState,
    solutionState,
    minimumMoves,
    difficulty,
    isol,
    invCount,
  ) {
    const [result] = await pool.execute(
      `INSERT INTO puzzle_configs 
             (board_size, initial_state, solution_state, minimum_moves, difficulty_rating, is_solvable, inversion_count)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        boardSize,
        JSON.stringify(initialState),
        JSON.stringify(solutionState),
        minimumMoves,
        difficulty,
        isSol,
        invCount,
      ],
    );
    return result.insertId;
  },

  async getPuzzleConfig(configId) {
    const [rows] = await pool.execute(
      `SELECT * FROM puzzle_configs WHERE config_id = ?`,
      [configId],
    );
    return rows[0];
  },

  async getRandomPuzzleConfig(boardSize, difficulty) {
    const query = difficulty
      ? `SELECT * FROM puzzle_configs WHERE board_size = ? AND difficulty_rating = ? AND is_solvable = TRUE ORDER BY RAND() LIMIT 1`
      : `SELECT * FROM puzzle_configs WHERE board_size = ? AND is_solvable = TRUE ORDER BY RAND() LIMIT 1`;

    const params = difficulty ? [boardSize, difficulty] : [boardSize];
    const [rows] = await pool.execute(query, params);
    return rows[0];
  },

  async updatePuzzleStats(configId) {
    await pool.execute(
      `UPDATE puzzle_configs SET times_played = times_played + 1 WHERE config_id = ?`,
      [configId],
    );
  },

  async markPuzzleCompleted(configId, completionTime) {
    await pool.execute(
      `UPDATE puzzle_configs 
             SET times_completed = times_completed + 1,
                 completion_rate = (times_completed + 1) * 100.0 / times_played,
                 average_completion_time = (average_completion_time * times_completed + ?) / (times_completed + 1)
             WHERE config_id = ?`,
      [completionTime, configId],
    );
  },

  async getLeaderboard(category, season = "all_time", limit = 100) {
    const [rows] = await pool.execute(
      `SELECT l.*, u.username, u.display_name, u.avatar_url
             FROM leaderboards l
             JOIN users u ON l.user_id = u.user_id
             WHERE l.category = ? AND l.season = ?
             ORDER BY l.rank_position ASC
             LIMIT ?`,
      [category, season, limit],
    );
    return rows;
  },

  async updateLeaderboardEntry(
    userId,
    category,
    score,
    eloRating,
    season = "all_time",
  ) {
    // Check if entry exists
    const [existing] = await pool.execute(
      `SELECT * FROM leaderboards WHERE user_id = ? AND category = ? AND season = ?`,
      [userId, category, season],
    );

    if (existing.length > 0) {
      // Update if better score
      const shouldUpdate = category.includes("speed")
        ? score < existing[0].score // Lower time is better
        : score < existing[0].score; // Fewer moves is better

      if (shouldUpdate) {
        await pool.execute(
          `UPDATE leaderboards 
                     SET score = ?, elo_rating = ?, last_updated = CURRENT_TIMESTAMP
                     WHERE user_id = ? AND category = ? AND season = ?`,
          [score, eloRating, userId, category, season],
        );
      }
    } else {
      // Create new entry
      await pool.execute(
        `INSERT INTO leaderboards (user_id, category, score, elo_rating, season, rank_position)
                 VALUES (?, ?, ?, ?, ?, 0)`,
        [userId, category, score, eloRating, season],
      );
    }

    // Recalculate rankings for this category
    await this.recalculateLeaderboardRanks(category, season);
  },

  async recalculateLeaderboardRanks(category, season) {
    const orderBy =
      category.includes("speed") || category.includes("moves") ? "ASC" : "DESC";

    await pool.execute(
      `SET @rank = 0;
             UPDATE leaderboards 
             SET rank_position = (@rank := @rank + 1)
             WHERE category = ? AND season = ?
             ORDER BY score ${orderBy}`,
      [category, season],
    );
  },

  async getUserLeaderboardPosition(userId, category, season = "all_time") {
    const [rows] = await pool.execute(
      `SELECT rank_position, score FROM leaderboards 
             WHERE user_id = ? AND category = ? AND season = ?`,
      [userId, category, season],
    );
    return rows[0];
  },

  async getAllAchievements() {
    const [rows] = await pool.execute(
      `SELECT * FROM achievements ORDER BY category, requirement_value ASC`,
    );
    return rows;
  },

  async getUserAchievements(userId) {
    const [rows] = await pool.execute(
      `SELECT ua.*, a.* 
             FROM user_achievements ua
             JOIN achievements a ON ua.achievement_id = a.achievement_id
             WHERE ua.user_id = ?
             ORDER BY ua.unlocked_at DESC`,
      [userId],
    );
    return rows;
  },

  async initializeUserAchievements(userId) {
    const achievements = await this.getAllAchievements();

    const values = achievements
      .map(
        (a) =>
          `(${userId}, ${a.achievement_id}, 0, ${a.requirement_value}, FALSE)`,
      )
      .join(",");

    await pool.execute(
      `INSERT INTO user_achievements (user_id, achievement_id, current_progress, required_progress, is_completed)
             VALUES ${values}
             ON DUPLICATE KEY UPDATE user_id = user_id`,
    );
  },

  async updateAchievementProgress(userId, achievementKey, progress) {
    const [result] = await pool.execute(
      `UPDATE user_achievements ua
             JOIN achievements a ON ua.achievement_id = a.achievement_id
             SET ua.current_progress = ?,
                 ua.is_completed = (? >= ua.required_progress),
                 ua.unlocked_at = IF(? >= ua.required_progress AND ua.unlocked_at IS NULL, CURRENT_TIMESTAMP, ua.unlocked_at)
             WHERE ua.user_id = ? AND a.achievement_key = ?`,
      [progress, progress, progress, userId, achievementKey],
    );

    // Check if achievement was just completed
    const [achievement] = await pool.execute(
      `SELECT ua.*, a.* 
             FROM user_achievements ua
             JOIN achievements a ON ua.achievement_id = a.achievement_id
             WHERE ua.user_id = ? AND a.achievement_key = ? AND ua.is_completed = TRUE`,
      [userId, achievementKey],
    );

    if (achievement.length > 0 && achievement[0].unlocked_at) {
      const unlockTime = new Date(achievement[0].unlocked_at);
      const justUnlocked = Date.now() - unlockTime.getTime() < 5000; // Within 5 seconds

      if (justUnlocked) {
        // Increment times unlocked counter
        await pool.execute(
          `UPDATE achievements SET times_unlocked = times_unlocked + 1 WHERE achievement_id = ?`,
          [achievement[0].achievement_id],
        );

        return achievement[0]; // Return newly unlocked achievement
      }
    }

    return null;
  },

  async checkMultipleAchievements(userId, checks) {
    const unlocked = [];

    for (const check of checks) {
      const result = await this.updateAchievementProgress(
        userId,
        check.key,
        check.value,
      );
      if (result) unlocked.push(result);
    }

    return unlocked;
  },

  async getAllPowerups() {
    const [rows] = await pool.execute(
      `SELECT * FROM powerups ORDER BY rarity, name`,
    );
    return rows;
  },

  async getUserPowerups(userId) {
    const [rows] = await pool.execute(
      `SELECT up.*, p.*
             FROM user_powerups up
             JOIN powerups p ON up.powerup_id = p.powerup_id
             WHERE up.user_id = ? AND up.quantity > 0
             ORDER BY p.rarity, p.name`,
      [userId],
    );
    return rows;
  },

  async addPowerupToUser(userId, powerupKey, quantity = 1) {
    const [powerup] = await pool.execute(
      `SELECT powerup_id FROM powerups WHERE powerup_key = ?`,
      [powerupKey],
    );

    if (powerup.length === 0) return false;

    await pool.execute(
      `INSERT INTO user_powerups (user_id, powerup_id, quantity)
             VALUES (?, ?, ?)
             ON DUPLICATE KEY UPDATE quantity = quantity + ?`,
      [userId, powerup[0].powerup_id, quantity, quantity],
    );

    return true;
  },

  async usePowerup(userId, powerupKey) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      // Get powerup and user inventory
      const [powerup] = await connection.execute(
        `SELECT p.powerup_id, up.quantity
                 FROM powerups p
                 LEFT JOIN user_powerups up ON p.powerup_id = up.powerup_id AND up.user_id = ?
                 WHERE p.powerup_key = ?`,
        [userId, powerupKey],
      );

      if (
        powerup.length === 0 ||
        !powerup[0].quantity ||
        powerup[0].quantity <= 0
      ) {
        await connection.rollback();
        return false;
      }

      // Decrement quantity
      await connection.execute(
        `UPDATE user_powerups 
                 SET quantity = quantity - 1, 
                     times_used = times_used + 1, 
                     last_used_at = CURRENT_TIMESTAMP
                 WHERE user_id = ? AND powerup_id = ?`,
        [userId, powerup[0].powerup_id],
      );

      // Update global usage stats
      await connection.execute(
        `UPDATE powerups SET times_used = times_used + 1 WHERE powerup_id = ?`,
        [powerup[0].powerup_id],
      );

      await connection.commit();
      return true;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  },

  async calculateAndUpdateELO(player1Id, player2Id, winnerId) {
    const [result] = await pool.execute(`CALL sp_update_elo(?, ?, ?)`, [
      player1Id,
      player2Id,
      winnerId,
    ]);
    return result[0][0]; // Returns { player1_change, player2_change }
  },

  async getSystemStats() {
    const [stats] = await pool.execute(`
            SELECT 
                (SELECT COUNT(*) FROM users WHERE is_active = TRUE) as total_users,
                (SELECT COUNT(*) FROM game_sessions) as total_games,
                (SELECT COUNT(*) FROM game_sessions WHERE status = 'in_progress') as active_games,
                (SELECT AVG(completion_time) FROM game_sessions WHERE status = 'completed') as avg_completion_time,
                (SELECT COUNT(*) FROM game_sessions WHERE DATE(started_at) = CURDATE()) as games_today,
                (SELECT COUNT(*) FROM users WHERE DATE(created_at) = CURDATE()) as new_users_today
        `);
    return stats[0];
  },

  async getPopularBoardSizes() {
    const [rows] = await pool.execute(`
            SELECT board_size, COUNT(*) as count
            FROM game_sessions
            WHERE started_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
            GROUP BY board_size
            ORDER BY count DESC
        `);
    return rows;
  },

  async getPeakPlayTimes() {
    const [rows] = await pool.execute(`
            SELECT HOUR(started_at) as hour, COUNT(*) as games_count
            FROM game_sessions
            WHERE started_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
            GROUP BY HOUR(started_at)
            ORDER BY games_count DESC
            LIMIT 5
        `);
    return rows;
  },
};

module.exports = { pool, db };
