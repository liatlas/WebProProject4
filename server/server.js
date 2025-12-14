const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const { body, validationResult } = require("express-validator");
require("dotenv").config();

const { db } = require("./database");
const {
  generateToken,
  generateRefreshToken,
  authenticateToken,
  authenticateSocket,
  optionalAuth,
  hashPassword,
  comparePassword,
  validatePasswordStrength,
  isValidEmail,
  validateUsername,
  sanitizeInput,
} = require("./auth");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    methods: ["GET", "POST"],
    credentials: true,
  },
});

const PORT = process.env.PORT || 5000;

// Security headers
app.use(helmet());

// CORS
app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    credentials: true,
  }),
);

// Body parsing
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Rate limiting - global
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    success: false,
    message: "Too many requests, please try again later",
  },
});
app.use("/api/", limiter);

// Request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Register new user
app.post(
  "/api/auth/register",
  [
    body("username").trim().isLength({ min: 3, max: 20 }),
    body("email").isEmail().normalizeEmail(),
    body("password").isLength({ min: 8 }),
    body("displayName").optional().trim().isLength({ max: 100 }),
  ],
  async (req, res) => {
    try {
      // Validate input
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: errors.array(),
        });
      }

      const { username, email, password, displayName } = req.body;

      // Additional validation
      const usernameValidation = validateUsername(username);
      if (!usernameValidation.valid) {
        return res.status(400).json({
          success: false,
          message: usernameValidation.errors[0],
        });
      }

      const passwordValidation = validatePasswordStrength(password);
      if (!passwordValidation.valid) {
        return res.status(400).json({
          success: false,
          message: passwordValidation.errors[0],
        });
      }

      // Check if user already exists
      const existingUser = await db.findUserByUsername(username);
      if (existingUser) {
        return res.status(409).json({
          success: false,
          message: "Username already taken",
        });
      }

      const existingEmail = await db.findUserByEmail(email);
      if (existingEmail) {
        return res.status(409).json({
          success: false,
          message: "Email already registered",
        });
      }

      // Hash password
      const passwordHash = await hashPassword(password);

      // Create user
      const userId = await db.createUser(
        username,
        email,
        passwordHash,
        displayName ? sanitizeInput(displayName) : username,
      );

      // Initialize achievements for new user
      await db.initializeUserAchievements(userId);

      // Get complete user data
      const user = await db.getUserById(userId);

      // Generate tokens
      const token = generateToken(user);
      const refreshToken = generateRefreshToken(user);

      res.status(201).json({
        success: true,
        message: "Registration successful",
        token,
        refreshToken,
        user: {
          userId: user.user_id,
          username: user.username,
          displayName: user.display_name,
          email: user.email,
          level: user.level,
          avatarUrl: user.avatar_url,
        },
      });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({
        success: false,
        message: "Server error during registration",
      });
    }
  },
);

// Login
app.post(
  "/api/auth/login",
  [body("username").trim().notEmpty(), body("password").notEmpty()],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: "Username and password required",
        });
      }

      const { username, password } = req.body;

      // Find user
      const user = await db.findUserByUsername(username);
      if (!user) {
        return res.status(401).json({
          success: false,
          message: "Invalid username or password",
        });
      }

      // Verify password
      const isValidPassword = await comparePassword(
        password,
        user.password_hash,
      );
      if (!isValidPassword) {
        return res.status(401).json({
          success: false,
          message: "Invalid username or password",
        });
      }

      // Update last login
      await db.updateLastLogin(user.user_id);

      // Get complete user data with stats
      const userData = await db.getUserById(user.user_id);

      // Generate tokens
      const token = generateToken(user);
      const refreshToken = generateRefreshToken(user);

      res.json({
        success: true,
        message: "Login successful",
        token,
        refreshToken,
        user: {
          userId: userData.user_id,
          username: userData.username,
          displayName: userData.display_name,
          email: userData.email,
          level: userData.level,
          experiencePoints: userData.experience_points,
          avatarUrl: userData.avatar_url,
          currentTheme: userData.current_theme,
          stats: {
            totalGames: userData.total_games,
            totalWins: userData.total_wins,
            winRate: userData.win_rate,
            eloRating: userData.elo_rating,
            rankPosition: userData.rank_position,
          },
        },
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({
        success: false,
        message: "Server error during login",
      });
    }
  },
);

// Refresh token
app.post("/api/auth/refresh", async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        message: "Refresh token required",
      });
    }

    const decoded = verifyRefreshToken(refreshToken);
    if (!decoded) {
      return res.status(403).json({
        success: false,
        message: "Invalid refresh token",
      });
    }

    const user = await db.getUserById(decoded.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const newToken = generateToken(user);

    res.json({
      success: true,
      token: newToken,
    });
  } catch (error) {
    console.error("Token refresh error:", error);
    res.status(500).json({
      success: false,
      message: "Server error during token refresh",
    });
  }
});

// Verify token (check if still valid)
app.get("/api/auth/verify", authenticateToken, async (req, res) => {
  try {
    const user = await db.getUserById(req.user.userId);

    res.json({
      success: true,
      valid: true,
      user: {
        userId: user.user_id,
        username: user.username,
        displayName: user.display_name,
        level: user.level,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error during verification",
    });
  }
});

// Get user profile
app.get("/api/users/:userId", optionalAuth, async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await db.getUserById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Get preferences to check if profile is public
    const preferences = await db.getUserPreferences(userId);

    // If profile is private and requester is not the owner, return limited info
    if (
      !preferences.profile_public &&
      (!req.user || req.user.userId != userId)
    ) {
      return res.json({
        success: true,
        user: {
          userId: user.user_id,
          username: user.username,
          displayName: user.display_name,
          level: user.level,
          avatarUrl: user.avatar_url,
          private: true,
        },
      });
    }

    res.json({
      success: true,
      user: {
        userId: user.user_id,
        username: user.username,
        displayName: user.display_name,
        bio: user.bio,
        level: user.level,
        experiencePoints: user.experience_points,
        avatarUrl: user.avatar_url,
        currentTheme: user.current_theme,
        createdAt: user.created_at,
        stats: {
          totalGames: user.total_games,
          totalWins: user.total_wins,
          totalLosses: user.total_losses,
          winRate: user.win_rate,
          eloRating: user.elo_rating,
          rankPosition: user.rank_position,
          bestCompletionTime: user.best_completion_time,
          bestMoveCount: user.best_move_count,
          currentWinStreak: user.current_win_streak,
          bestWinStreak: user.best_win_streak,
        },
      },
    });
  } catch (error) {
    console.error("Get user error:", error);
    res.status(500).json({
      success: false,
      message: "Server error fetching user",
    });
  }
});

// Update user profile
app.put("/api/users/profile", authenticateToken, async (req, res) => {
  try {
    const allowedUpdates = ["displayName", "bio", "avatarUrl"];
    const updates = {};

    Object.keys(req.body).forEach((key) => {
      if (allowedUpdates.includes(key)) {
        updates[key] = sanitizeInput(req.body[key]);
      }
    });

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        message: "No valid updates provided",
      });
    }

    await db.updateUserProfile(req.user.userId, updates);

    const user = await db.getUserById(req.user.userId);

    res.json({
      success: true,
      message: "Profile updated successfully",
      user: {
        userId: user.user_id,
        username: user.username,
        displayName: user.display_name,
        bio: user.bio,
        avatarUrl: user.avatar_url,
      },
    });
  } catch (error) {
    console.error("Update profile error:", error);
    res.status(500).json({
      success: false,
      message: "Server error updating profile",
    });
  }
});

// Get user statistics
app.get("/api/users/:userId/stats", async (req, res) => {
  try {
    const { userId } = req.params;
    const stats = await db.getUserStats(userId);

    if (!stats) {
      return res.status(404).json({
        success: false,
        message: "Stats not found",
      });
    }

    res.json({
      success: true,
      stats,
    });
  } catch (error) {
    console.error("Get stats error:", error);
    res.status(500).json({
      success: false,
      message: "Server error fetching stats",
    });
  }
});

// Get user game history
app.get("/api/users/:userId/history", authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    const limit = parseInt(req.query.limit) || 50;

    // Only allow users to see their own history
    if (req.user.userId != userId) {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    const history = await db.getUserGameHistory(userId, limit);

    res.json({
      success: true,
      games: history,
    });
  } catch (error) {
    console.error("Get history error:", error);
    res.status(500).json({
      success: false,
      message: "Server error fetching history",
    });
  }
});

// Get user preferences
app.get("/api/users/preferences", authenticateToken, async (req, res) => {
  try {
    const preferences = await db.getUserPreferences(req.user.userId);

    // Parse JSON fields
    if (preferences.unlocked_themes) {
      preferences.unlocked_themes = JSON.parse(preferences.unlocked_themes);
    }

    res.json({
      success: true,
      preferences,
    });
  } catch (error) {
    console.error("Get preferences error:", error);
    res.status(500).json({
      success: false,
      message: "Server error fetching preferences",
    });
  }
});

// Update user preferences
app.put("/api/users/preferences", authenticateToken, async (req, res) => {
  try {
    await db.updateUserPreferences(req.user.userId, req.body);

    const preferences = await db.getUserPreferences(req.user.userId);

    res.json({
      success: true,
      message: "Preferences updated successfully",
      preferences,
    });
  } catch (error) {
    console.error("Update preferences error:", error);
    res.status(500).json({
      success: false,
      message: "Server error updating preferences",
    });
  }
});

// Unlock theme
app.post(
  "/api/users/themes/:themeName",
  authenticateToken,
  async (req, res) => {
    try {
      const { themeName } = req.params;
      const themes = await db.unlockTheme(req.user.userId, themeName);

      res.json({
        success: true,
        message: `Theme "${themeName}" unlocked`,
        unlockedThemes: themes,
      });
    } catch (error) {
      console.error("Unlock theme error:", error);
      res.status(500).json({
        success: false,
        message: "Server error unlocking theme",
      });
    }
  },
);

// Create new game session
app.post("/api/games/create", authenticateToken, async (req, res) => {
  try {
    const { boardSize, gameMode, opponentId } = req.body;

    // Validate board size
    const validSizes = [3, 4, 6, 8, 10];
    if (!validSizes.includes(boardSize)) {
      return res.status(400).json({
        success: false,
        message: "Invalid board size",
      });
    }

    // Create or get puzzle configuration
    let puzzleConfig = await db.getRandomPuzzleConfig(boardSize, null);

    const sessionId = await db.createGameSession(
      req.user.userId,
      opponentId || null,
      boardSize,
      gameMode,
      puzzleConfig ? puzzleConfig.config_id : null,
    );

    res.json({
      success: true,
      sessionId,
      puzzleConfig: puzzleConfig
        ? {
            initialState: JSON.parse(puzzleConfig.initial_state),
            minimumMoves: puzzleConfig.minimum_moves,
          }
        : null,
    });
  } catch (error) {
    console.error("Create game error:", error);
    res.status(500).json({
      success: false,
      message: "Server error creating game",
    });
  }
});

// Get game session
app.get("/api/games/:sessionId", authenticateToken, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const session = await db.getGameSession(sessionId);

    if (!session) {
      return res.status(404).json({
        success: false,
        message: "Game session not found",
      });
    }

    res.json({
      success: true,
      session,
    });
  } catch (error) {
    console.error("Get game error:", error);
    res.status(500).json({
      success: false,
      message: "Server error fetching game",
    });
  }
});

// Complete game session
app.post(
  "/api/games/:sessionId/complete",
  authenticateToken,
  async (req, res) => {
    try {
      const { sessionId } = req.params;
      const { winnerId, completionTime, moveCount, perfectGame, speedBonus } =
        req.body;

      const session = await db.getGameSession(sessionId);

      if (!session) {
        return res.status(404).json({
          success: false,
          message: "Game session not found",
        });
      }

      if (session.status === "completed") {
        return res.status(400).json({
          success: false,
          message: "Game already completed",
        });
      }

      // Update game session
      await db.updateGameSession(sessionId, {
        status: "completed",
        winner_id: winnerId,
        completion_time: completionTime,
        move_count: moveCount,
        perfect_game: perfectGame || false,
        speed_bonus: speedBonus || false,
      });

      // Update user stats
      const isWin = winnerId === req.user.userId;
      await db.updateUserStatsAfterGame(
        req.user.userId,
        isWin,
        completionTime,
        moveCount,
        session.board_size,
        session.game_mode,
      );

      // Calculate ELO if multiplayer
      let eloChanges = null;
      if (session.player2_id) {
        eloChanges = await db.calculateAndUpdateELO(
          session.player1_id,
          session.player2_id,
          winnerId,
        );
      }

      // Award XP
      let xpGained = 50; // Base XP
      if (isWin) xpGained += 25;
      if (perfectGame) xpGained += 50;
      if (speedBonus) xpGained += 30;

      const levelResult = await db.addExperience(req.user.userId, xpGained);

      // Check achievements
      const achievementChecks = [
        { key: "first_steps", value: 1 },
        {
          key: "puzzle_enthusiast",
          value: (await db.getUserStats(req.user.userId)).total_games,
        },
        { key: "speed_demon", value: completionTime },
      ];

      const unlockedAchievements = await db.checkMultipleAchievements(
        req.user.userId,
        achievementChecks,
      );

      // Update leaderboards
      if (session.game_mode === "speed") {
        await db.updateLeaderboardEntry(
          req.user.userId,
          `speed_${session.board_size}x${session.board_size}`,
          completionTime,
          (await db.getUserStats(req.user.userId)).elo_rating,
        );
      }

      res.json({
        success: true,
        message: "Game completed successfully",
        xpGained,
        leveledUp: levelResult.leveledUp,
        newLevel: levelResult.newLevel,
        eloChanges,
        unlockedAchievements,
      });
    } catch (error) {
      console.error("Complete game error:", error);
      res.status(500).json({
        success: false,
        message: "Server error completing game",
      });
    }
  },
);

// Record game move
app.post("/api/games/:sessionId/moves", authenticateToken, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const {
      moveNumber,
      tilePosition,
      emptyPosition,
      direction,
      boardState,
      timeElapsed,
    } = req.body;

    await db.recordMove(
      sessionId,
      req.user.userId,
      moveNumber,
      tilePosition,
      emptyPosition,
      direction,
      boardState,
      timeElapsed,
    );

    res.json({
      success: true,
      message: "Move recorded",
    });
  } catch (error) {
    console.error("Record move error:", error);
    res.status(500).json({
      success: false,
      message: "Server error recording move",
    });
  }
});

// Get game moves (for replay)
app.get("/api/games/:sessionId/moves", authenticateToken, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const moves = await db.getSessionMoves(sessionId);

    res.json({
      success: true,
      moves,
    });
  } catch (error) {
    console.error("Get moves error:", error);
    res.status(500).json({
      success: false,
      message: "Server error fetching moves",
    });
  }
});

// Get leaderboard
app.get("/api/leaderboards/:category", async (req, res) => {
  try {
    const { category } = req.params;
    const season = req.query.season || "all_time";
    const limit = parseInt(req.query.limit) || 100;

    const leaderboard = await db.getLeaderboard(category, season, limit);

    res.json({
      success: true,
      category,
      season,
      leaderboard,
    });
  } catch (error) {
    console.error("Get leaderboard error:", error);
    res.status(500).json({
      success: false,
      message: "Server error fetching leaderboard",
    });
  }
});

// Get user leaderboard position
app.get(
  "/api/leaderboards/:category/position",
  authenticateToken,
  async (req, res) => {
    try {
      const { category } = req.params;
      const season = req.query.season || "all_time";

      const position = await db.getUserLeaderboardPosition(
        req.user.userId,
        category,
        season,
      );

      res.json({
        success: true,
        position: position || { rank_position: 0, score: 0 },
      });
    } catch (error) {
      console.error("Get position error:", error);
      res.status(500).json({
        success: false,
        message: "Server error fetching position",
      });
    }
  },
);

// Get all achievements
app.get("/api/achievements", async (req, res) => {
  try {
    const achievements = await db.getAllAchievements();

    res.json({
      success: true,
      achievements,
    });
  } catch (error) {
    console.error("Get achievements error:", error);
    res.status(500).json({
      success: false,
      message: "Server error fetching achievements",
    });
  }
});

// Get user achievements
app.get("/api/users/:userId/achievements", async (req, res) => {
  try {
    const { userId } = req.params;
    const achievements = await db.getUserAchievements(userId);

    res.json({
      success: true,
      achievements,
    });
  } catch (error) {
    console.error("Get user achievements error:", error);
    res.status(500).json({
      success: false,
      message: "Server error fetching user achievements",
    });
  }
});

// Get all powerups
app.get("/api/powerups", async (req, res) => {
  try {
    const powerups = await db.getAllPowerups();

    res.json({
      success: true,
      powerups,
    });
  } catch (error) {
    console.error("Get powerups error:", error);
    res.status(500).json({
      success: false,
      message: "Server error fetching powerups",
    });
  }
});

// Get user powerups
app.get("/api/users/powerups", authenticateToken, async (req, res) => {
  try {
    const powerups = await db.getUserPowerups(req.user.userId);

    res.json({
      success: true,
      powerups,
    });
  } catch (error) {
    console.error("Get user powerups error:", error);
    res.status(500).json({
      success: false,
      message: "Server error fetching user powerups",
    });
  }
});

// Use powerup
app.post(
  "/api/powerups/:powerupKey/use",
  authenticateToken,
  async (req, res) => {
    try {
      const { powerupKey } = req.params;

      const success = await db.usePowerup(req.user.userId, powerupKey);

      if (!success) {
        return res.status(400).json({
          success: false,
          message: "Powerup not available or already used",
        });
      }

      res.json({
        success: true,
        message: "Powerup activated",
      });
    } catch (error) {
      console.error("Use powerup error:", error);
      res.status(500).json({
        success: false,
        message: "Server error using powerup",
      });
    }
  },
);

// Get system statistics
app.get("/api/analytics/system", async (req, res) => {
  try {
    const stats = await db.getSystemStats();
    const boardSizes = await db.getPopularBoardSizes();
    const peakTimes = await db.getPeakPlayTimes();

    res.json({
      success: true,
      stats,
      popularBoardSizes: boardSizes,
      peakPlayTimes: peakTimes,
    });
  } catch (error) {
    console.error("Get system stats error:", error);
    res.status(500).json({
      success: false,
      message: "Server error fetching analytics",
    });
  }
});

// Matchmaking queue
const matchmakingQueue = {
  speed: [],
  fewest_moves: [],
};

// Active games
const activeGames = new Map();

// Socket.IO authentication
io.use(authenticateSocket);

io.on("connection", (socket) => {
  console.log(`User connected: ${socket.username} (${socket.userId})`);

  // Join matchmaking queue
  socket.on("join_matchmaking", async ({ mode, boardSize }) => {
    const queue = matchmakingQueue[mode] || [];

    // Get user ELO for matchmaking
    const userStats = await db.getUserStats(socket.userId);
    const userElo = userStats.elo_rating;

    // Look for suitable opponent (within 200 ELO)
    const opponentIndex = queue.findIndex(
      (player) =>
        player.boardSize === boardSize && Math.abs(player.elo - userElo) <= 200,
    );

    if (opponentIndex !== -1) {
      // Match found!
      const opponent = queue.splice(opponentIndex, 1)[0];

      // Create game session
      const sessionId = await db.createGameSession(
        socket.userId,
        opponent.userId,
        boardSize,
        mode,
        null,
      );

      // Create game room
      const roomId = `game_${sessionId}`;
      socket.join(roomId);
      opponent.socket.join(roomId);

      // Store active game
      activeGames.set(sessionId, {
        player1: { userId: socket.userId, socket },
        player2: { userId: opponent.userId, socket: opponent.socket },
        boardSize,
        mode,
      });

      // Notify both players
      io.to(roomId).emit("match_found", {
        sessionId,
        boardSize,
        mode,
        player1: {
          userId: socket.userId,
          username: socket.username,
        },
        player2: {
          userId: opponent.userId,
          username: opponent.username,
        },
      });

      console.log(`Match created: ${socket.username} vs ${opponent.username}`);
    } else {
      // Add to queue
      queue.push({
        userId: socket.userId,
        username: socket.username,
        socket,
        boardSize,
        elo: userElo,
        joinedAt: Date.now(),
      });

      matchmakingQueue[mode] = queue;

      socket.emit("matchmaking_joined", {
        position: queue.length,
        mode,
        boardSize,
      });
    }
  });

  // Leave matchmaking queue
  socket.on("leave_matchmaking", ({ mode }) => {
    const queue = matchmakingQueue[mode] || [];
    const index = queue.findIndex((p) => p.userId === socket.userId);

    if (index !== -1) {
      queue.splice(index, 1);
      matchmakingQueue[mode] = queue;
    }

    socket.emit("matchmaking_left");
  });

  // Game move
  socket.on("game_move", ({ sessionId, moveData }) => {
    const roomId = `game_${sessionId}`;

    // Broadcast move to opponent
    socket.to(roomId).emit("opponent_move", moveData);

    // Record move in database (async, don't wait)
    db.recordMove(
      sessionId,
      socket.userId,
      moveData.moveNumber,
      moveData.tilePosition,
      moveData.emptyPosition,
      moveData.direction,
      moveData.boardState,
      moveData.timeElapsed,
    ).catch((err) => console.error("Error recording move:", err));
  });

  // Game completed
  socket.on("game_completed", async ({ sessionId, winnerId, stats }) => {
    const roomId = `game_${sessionId}`;

    io.to(roomId).emit("game_ended", {
      winnerId,
      stats,
    });

    // Clean up
    activeGames.delete(sessionId);
  });

  // Use powerup
  socket.on("use_powerup", ({ sessionId, powerupKey }) => {
    const roomId = `game_${sessionId}`;

    // Notify opponent
    socket.to(roomId).emit("opponent_powerup", {
      powerupKey,
      userId: socket.userId,
    });
  });

  // Disconnect
  socket.on("disconnect", () => {
    console.log(`User disconnected: ${socket.username}`);

    // Remove from matchmaking queues
    Object.keys(matchmakingQueue).forEach((mode) => {
      const queue = matchmakingQueue[mode];
      const index = queue.findIndex((p) => p.userId === socket.userId);
      if (index !== -1) {
        queue.splice(index, 1);
        matchmakingQueue[mode] = queue;
      }
    });

    // Handle active game disconnect
    for (const [sessionId, game] of activeGames.entries()) {
      if (
        game.player1.userId === socket.userId ||
        game.player2.userId === socket.userId
      ) {
        const roomId = `game_${sessionId}`;
        socket.to(roomId).emit("opponent_disconnected");
        activeGames.delete(sessionId);
      }
    }
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Endpoint not found",
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error("Error:", err);
  res.status(500).json({
    success: false,
    message: "Internal server error",
    error: process.env.NODE_ENV === "development" ? err.message : undefined,
  });
});

server.listen(PORT, () => {
  console.log(`
server running on port ${PORT}
environment: ${process.env.NODE_ENV || "development"}
    `);
});

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("SIGTERM received, shutting down gracefully...");
  server.close(() => {
    console.log("Server closed");
    process.exit(0);
  });
});

module.exports = { app, io, server };
