const jwt = require("jsonwebtoken");
require("dotenv").config();

const JWT_SECRET =
  process.env.JWT_SECRET || "your-secret-key-change-this-in-production";
const JWT_EXPIRATION = process.env.JWT_EXPIRATION || "7d";

/**
 * Generate JWT token for authenticated user
 * @param {Object} user - User object with id and username
 * @returns {String} JWT token
 */
function generateToken(user) {
  const payload = {
    userId: user.user_id,
    username: user.username,
    email: user.email,
  };

  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRATION,
    issuer: "reindeer-puzzle",
    audience: "reindeer-puzzle-client",
  });
}

/**
 * Generate refresh token with longer expiration
 * @param {Object} user - User object
 * @returns {String} Refresh token
 */
function generateRefreshToken(user) {
  const payload = {
    userId: user.user_id,
    type: "refresh",
  };

  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: "30d",
    issuer: "reindeer-puzzle",
  });
}

/**
 * Verify JWT token and attach user info to request
 * Usage: app.get('/protected', authenticateToken, (req, res) => {...})
 */
function authenticateToken(req, res, next) {
  // Get token from Authorization header or query parameter
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({
      success: false,
      message: "Access token required",
    });
  }

  // Verify token
  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      if (err.name === "TokenExpiredError") {
        return res.status(401).json({
          success: false,
          message: "Token expired",
          expired: true,
        });
      }

      return res.status(403).json({
        success: false,
        message: "Invalid token",
      });
    }

    // Attach user info to request object
    req.user = {
      userId: decoded.userId,
      username: decoded.username,
      email: decoded.email,
    };

    next();
  });
}

/**
 * Optional authentication - doesn't fail if no token provided
 * Useful for endpoints that work for both authenticated and guest users
 */
function optionalAuth(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    req.user = null;
    return next();
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      req.user = null;
    } else {
      req.user = {
        userId: decoded.userId,
        username: decoded.username,
        email: decoded.email,
      };
    }
    next();
  });
}

/**
 * Verify refresh token and return decoded payload
 * @param {String} refreshToken - The refresh token to verify
 * @returns {Object|null} Decoded payload or null if invalid
 */
function verifyRefreshToken(refreshToken) {
  try {
    const decoded = jwt.verify(refreshToken, JWT_SECRET);
    if (decoded.type !== "refresh") {
      return null;
    }
    return decoded;
  } catch (error) {
    return null;
  }
}

/**
 * Extract user ID from token without full verification
 * Useful for WebSocket authentication
 * @param {String} token - JWT token
 * @returns {Number|null} User ID or null
 */
function extractUserIdFromToken(token) {
  try {
    const decoded = jwt.decode(token);
    return decoded ? decoded.userId : null;
  } catch (error) {
    return null;
  }
}

/**
 * Authenticate Socket.IO connection using token
 * Usage: io.use(authenticateSocket)
 */
function authenticateSocket(socket, next) {
  const token = socket.handshake.auth.token || socket.handshake.query.token;

  if (!token) {
    return next(new Error("Authentication token required"));
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      return next(new Error("Invalid or expired token"));
    }

    // Attach user info to socket
    socket.userId = decoded.userId;
    socket.username = decoded.username;

    next();
  });
}

/**
 * Create a simple in-memory rate limiter
 * @param {Number} maxRequests - Maximum requests allowed
 * @param {Number} windowMs - Time window in milliseconds
 * @returns {Function} Middleware function
 */
function createRateLimiter(maxRequests = 100, windowMs = 15 * 60 * 1000) {
  const requests = new Map();

  // Clean up old entries every minute
  setInterval(() => {
    const now = Date.now();
    for (const [key, data] of requests.entries()) {
      if (now - data.resetTime > windowMs) {
        requests.delete(key);
      }
    }
  }, 60000);

  return function rateLimiter(req, res, next) {
    const identifier = req.user ? req.user.userId : req.ip;
    const now = Date.now();

    if (!requests.has(identifier)) {
      requests.set(identifier, {
        count: 1,
        resetTime: now,
      });
      return next();
    }

    const data = requests.get(identifier);

    if (now - data.resetTime > windowMs) {
      // Reset window
      data.count = 1;
      data.resetTime = now;
      return next();
    }

    if (data.count >= maxRequests) {
      return res.status(429).json({
        success: false,
        message: "Too many requests, please try again later",
        retryAfter: Math.ceil((windowMs - (now - data.resetTime)) / 1000),
      });
    }

    data.count++;
    next();
  };
}

const bcrypt = require("bcrypt");
const SALT_ROUNDS = 10;

/**
 * Hash password using bcrypt
 * @param {String} password - Plain text password
 * @returns {Promise<String>} Hashed password
 */
async function hashPassword(password) {
  return await bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Compare password with hash
 * @param {String} password - Plain text password
 * @param {String} hash - Hashed password
 * @returns {Promise<Boolean>} True if match
 */
async function comparePassword(password, hash) {
  return await bcrypt.compare(password, hash);
}

/**
 * Validate password strength
 * @param {String} password - Password to validate
 * @returns {Object} Validation result
 */
function validatePasswordStrength(password) {
  const errors = [];

  if (password.length < 8) {
    errors.push("Password must be at least 8 characters long");
  }

  if (!/[A-Z]/.test(password)) {
    errors.push("Password must contain at least one uppercase letter");
  }

  if (!/[a-z]/.test(password)) {
    errors.push("Password must contain at least one lowercase letter");
  }

  if (!/[0-9]/.test(password)) {
    errors.push("Password must contain at least one number");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate email format
 * @param {String} email - Email to validate
 * @returns {Boolean} True if valid
 */
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate username format
 * @param {String} username - Username to validate
 * @returns {Object} Validation result
 */
function validateUsername(username) {
  const errors = [];

  if (username.length < 3 || username.length > 20) {
    errors.push("Username must be between 3 and 20 characters");
  }

  if (!/^[a-zA-Z0-9_]+$/.test(username)) {
    errors.push("Username can only contain letters, numbers, and underscores");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Sanitize user input to prevent XSS
 * @param {String} input - Input to sanitize
 * @returns {String} Sanitized input
 */
function sanitizeInput(input) {
  if (typeof input !== "string") return input;

  return input
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;")
    .replace(/\//g, "&#x2F;");
}

module.exports = {
  // Token functions
  generateToken,
  generateRefreshToken,
  verifyRefreshToken,
  extractUserIdFromToken,

  // Middleware
  authenticateToken,
  optionalAuth,
  authenticateSocket,
  createRateLimiter,

  // Password utilities
  hashPassword,
  comparePassword,
  validatePasswordStrength,

  // Validation
  isValidEmail,
  validateUsername,
  sanitizeInput,

  // Constants
  JWT_SECRET,
  JWT_EXPIRATION,
};
