import axios from "axios";

const API_BASE_URL =
  process.env.REACT_APP_API_URL || "http://localhost:5000/api";

// Create axios instance with defaults
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 10000,
});

// Request interceptor - add auth token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("authToken");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

// Response interceptor - handle errors
apiClient.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response) {
      // Handle token expiration
      if (error.response.status === 401 && error.response.data.expired) {
        // Try to refresh token
        return refreshTokenAndRetry(error.config);
      }

      // Handle other errors
      const message = error.response.data.message || "An error occurred";
      return Promise.reject(new Error(message));
    } else if (error.request) {
      return Promise.reject(new Error("No response from server"));
    } else {
      return Promise.reject(new Error("Request setup error"));
    }
  },
);

/**
 * Refresh token and retry failed request
 */
async function refreshTokenAndRetry(originalRequest) {
  try {
    const refreshToken = localStorage.getItem("refreshToken");
    if (!refreshToken) throw new Error("No refresh token");

    const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
      refreshToken,
    });

    const newToken = response.data.token;
    localStorage.setItem("authToken", newToken);

    // Retry original request
    originalRequest.headers.Authorization = `Bearer ${newToken}`;
    return axios(originalRequest);
  } catch (error) {
    // Refresh failed, logout user
    localStorage.removeItem("authToken");
    localStorage.removeItem("refreshToken");
    window.location.href = "/";
    return Promise.reject(error);
  }
}

export const authAPI = {
  register: (username, email, password, displayName) =>
    apiClient.post("/auth/register", {
      username,
      email,
      password,
      displayName,
    }),

  login: (username, password) =>
    apiClient.post("/auth/login", { username, password }),

  refresh: (refreshToken) => apiClient.post("/auth/refresh", { refreshToken }),

  verify: () => apiClient.get("/auth/verify"),
};

export const userAPI = {
  getProfile: (userId) => apiClient.get(`/users/${userId}`),

  updateProfile: (updates) => apiClient.put("/users/profile", updates),

  getStats: (userId) => apiClient.get(`/users/${userId}/stats`),

  getHistory: (userId, limit = 50) =>
    apiClient.get(`/users/${userId}/history?limit=${limit}`),

  getPreferences: () => apiClient.get("/users/preferences"),

  updatePreferences: (preferences) =>
    apiClient.put("/users/preferences", preferences),

  unlockTheme: (themeName) => apiClient.post(`/users/themes/${themeName}`),
};

export const gameAPI = {
  create: (boardSize, gameMode, opponentId = null) =>
    apiClient.post("/games/create", { boardSize, gameMode, opponentId }),

  get: (sessionId) => apiClient.get(`/games/${sessionId}`),

  complete: (sessionId, data) =>
    apiClient.post(`/games/${sessionId}/complete`, data),

  recordMove: (sessionId, moveData) =>
    apiClient.post(`/games/${sessionId}/moves`, moveData),

  getMoves: (sessionId) => apiClient.get(`/games/${sessionId}/moves`),
};

export const leaderboardAPI = {
  get: (category, season = "all_time", limit = 100) =>
    apiClient.get(`/leaderboards/${category}?season=${season}&limit=${limit}`),

  getPosition: (category, season = "all_time") =>
    apiClient.get(`/leaderboards/${category}/position?season=${season}`),
};

export const achievementAPI = {
  getAll: () => apiClient.get("/achievements"),

  getUserAchievements: (userId) =>
    apiClient.get(`/users/${userId}/achievements`),
};

export const powerupAPI = {
  getAll: () => apiClient.get("/powerups"),

  getUserPowerups: () => apiClient.get("/users/powerups"),

  use: (powerupKey) => apiClient.post(`/powerups/${powerupKey}/use`),
};

export const analyticsAPI = {
  getSystemStats: () => apiClient.get("/analytics/system"),
};

/**
 * Save auth tokens to localStorage
 */
export function saveTokens(token, refreshToken) {
  localStorage.setItem("authToken", token);
  localStorage.setItem("refreshToken", refreshToken);
}

/**
 * Remove auth tokens from localStorage
 */
export function clearTokens() {
  localStorage.removeItem("authToken");
  localStorage.removeItem("refreshToken");
}

/**
 * Check if user is authenticated
 */
export function isAuthenticated() {
  return !!localStorage.getItem("authToken");
}

/**
 * Get current auth token
 */
export function getToken() {
  return localStorage.getItem("authToken");
}

export default apiClient;
