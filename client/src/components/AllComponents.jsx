import React, { useState } from "react";

export function NotificationToast({ message, type, onClose }) {
  return (
    <div className={`notification-toast ${type}`} onClick={onClose}>
      <div className="toast-icon">
        {type === "success" && "✅"}
        {type === "error" && "❌"}
        {type === "warning" && "⚠️"}
        {type === "info" && "ℹ️"}
        {type === "achievement" && "🎖️"}
        {type === "levelup" && "⬆️"}
      </div>
      <div className="toast-message">{message}</div>
    </div>
  );
}

export function Matchmaking({ boardSize, gameMode, onCancel }) {
  return (
    <div className="matchmaking-screen">
      <div className="matchmaking-content">
        <div className="searching-animation">
          <div className="reindeer-searching">🦌</div>
          <div className="search-ripple"></div>
        </div>

        <h2>Searching for Opponent...</h2>
        <p className="matchmaking-info">
          Mode: {gameMode} | Board: {boardSize}x{boardSize}
        </p>

        <div className="matchmaking-tips">
          <h3>Quick Tips:</h3>
          <ul>
            <li>⚡ Plan your moves ahead</li>
            <li>🎯 Focus on corner pieces first</li>
            <li>🔄 Work systematically row by row</li>
            <li>✨ Save powerups for crucial moments</li>
          </ul>
        </div>

        <button className="btn btn-secondary btn-large" onClick={onCancel}>
          Cancel Search
        </button>
      </div>
    </div>
  );
}

export function VictoryScreen({ data, onClose, onPlayAgain }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal victory-modal" onClick={(e) => e.stopPropagation()}>
        <div className="victory-header">
          <h1>🎉 Puzzle Solved! 🎉</h1>
        </div>

        <div className="victory-stats">
          <div className="victory-stat">
            <div className="stat-label">Time</div>
            <div className="stat-value">
              {Math.floor(data.time / 60)}:
              {(data.time % 60).toString().padStart(2, "0")}
            </div>
          </div>
          <div className="victory-stat">
            <div className="stat-label">Moves</div>
            <div className="stat-value">{data.moves}</div>
          </div>
          <div className="victory-stat">
            <div className="stat-label">XP Gained</div>
            <div className="stat-value">+{data.xpGained}</div>
          </div>
        </div>

        <div className="victory-badges">
          {data.perfectGame && (
            <div className="badge perfect-badge">🎯 Perfect Game!</div>
          )}
          {data.speedBonus && (
            <div className="badge speed-badge">⚡ Speed Bonus!</div>
          )}
          {data.leveledUp && (
            <div className="badge levelup-badge">⬆️ Level {data.newLevel}!</div>
          )}
        </div>

        {data.unlockedAchievements?.length > 0 && (
          <div className="unlocked-achievements">
            <h3>New Achievements!</h3>
            {data.unlockedAchievements.map((ach, i) => (
              <div key={i} className="achievement-item">
                🎖️ {ach.name}
              </div>
            ))}
          </div>
        )}

        <div className="victory-actions">
          <button className="btn btn-primary" onClick={onPlayAgain}>
            Play Again
          </button>
          <button className="btn btn-secondary" onClick={onClose}>
            Main Menu
          </button>
        </div>
      </div>
    </div>
  );
}

export function StoryModal({ segment, onClose }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal story-modal" onClick={(e) => e.stopPropagation()}>
        <div className="story-header">
          <h2>
            Act {segment.act}: {segment.title}
          </h2>
        </div>

        <div className="story-content">
          <p>{segment.content}</p>
        </div>

        <button className="btn btn-primary" onClick={onClose}>
          Continue
        </button>
      </div>
    </div>
  );
}

export function Leaderboard({ leaderboards, currentUser, onBack }) {
  const [selectedCategory, setSelectedCategory] = useState("speed_4x4");

  const categories = [
    { id: "speed_4x4", name: "Speed - 4x4", icon: "⚡" },
    { id: "speed_overall", name: "Speed - Overall", icon: "⚡" },
    { id: "moves_4x4", name: "Moves - 4x4", icon: "🎯" },
    { id: "moves_overall", name: "Moves - Overall", icon: "🎯" },
  ];

  const currentLeaderboard = leaderboards[selectedCategory] || [];

  return (
    <div className="leaderboard-screen">
      <header className="screen-header">
        <button className="btn btn-secondary" onClick={onBack}>
          ← Back
        </button>
        <h1>🏆 Leaderboards</h1>
      </header>

      <div className="leaderboard-tabs">
        {categories.map((cat) => (
          <button
            key={cat.id}
            className={`tab ${selectedCategory === cat.id ? "active" : ""}`}
            onClick={() => setSelectedCategory(cat.id)}
          >
            {cat.icon} {cat.name}
          </button>
        ))}
      </div>

      <div className="leaderboard-list">
        {currentLeaderboard.length === 0 ? (
          <div className="empty-state">
            <p>No rankings yet</p>
          </div>
        ) : (
          currentLeaderboard.map((entry, index) => (
            <div
              key={entry.user_id}
              className={`leaderboard-entry ${entry.user_id === currentUser?.userId ? "current-user" : ""}`}
            >
              <div className="entry-rank">
                {index === 0 && "🥇"}
                {index === 1 && "🥈"}
                {index === 2 && "🥉"}
                {index > 2 && `#${index + 1}`}
              </div>
              <div className="entry-user">
                <div className="user-name">
                  {entry.display_name || entry.username}
                </div>
                <div className="user-stats">ELO: {entry.elo_rating}</div>
              </div>
              <div className="entry-score">
                {selectedCategory.includes("speed")
                  ? `${entry.score}s`
                  : `${entry.score} moves`}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export function UserProfile({
  user,
  stats,
  achievements,
  onBack,
  onUpdateProfile,
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    displayName: user.displayName,
    bio: user.bio || "",
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onUpdateProfile(formData);
    setIsEditing(false);
  };

  const completedAchievements =
    achievements?.filter((a) => a.is_completed) || [];

  return (
    <div className="profile-screen">
      <header className="screen-header">
        <button className="btn btn-secondary" onClick={onBack}>
          ← Back
        </button>
        <h1>Profile</h1>
      </header>

      <div className="profile-content">
        <div className="profile-card">
          <div className="profile-avatar">
            {user.avatarUrl ? (
              <img src={user.avatarUrl} alt={user.displayName} />
            ) : (
              <div className="avatar-placeholder">
                {user.displayName.charAt(0).toUpperCase()}
              </div>
            )}
          </div>

          {!isEditing ? (
            <>
              <h2>{user.displayName}</h2>
              <p className="username">@{user.username}</p>
              {user.bio && <p className="bio">{user.bio}</p>}
              <button
                className="btn btn-secondary"
                onClick={() => setIsEditing(true)}
              >
                Edit Profile
              </button>
            </>
          ) : (
            <form onSubmit={handleSubmit} className="edit-form">
              <input
                type="text"
                value={formData.displayName}
                onChange={(e) =>
                  setFormData({ ...formData, displayName: e.target.value })
                }
                placeholder="Display Name"
              />
              <textarea
                value={formData.bio}
                onChange={(e) =>
                  setFormData({ ...formData, bio: e.target.value })
                }
                placeholder="Bio"
                rows={3}
              />
              <div className="form-actions">
                <button type="submit" className="btn btn-primary">
                  Save
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setIsEditing(false)}
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>

        <div className="profile-stats">
          <h3>Statistics</h3>
          <div className="stats-grid">
            <div className="stat">
              <div className="stat-value">{user.level}</div>
              <div className="stat-label">Level</div>
            </div>
            <div className="stat">
              <div className="stat-value">{stats?.total_games || 0}</div>
              <div className="stat-label">Games</div>
            </div>
            <div className="stat">
              <div className="stat-value">{stats?.total_wins || 0}</div>
              <div className="stat-label">Wins</div>
            </div>
            <div className="stat">
              <div className="stat-value">{stats?.elo_rating || 1000}</div>
              <div className="stat-label">ELO</div>
            </div>
          </div>
        </div>

        <div className="profile-achievements">
          <h3>Recent Achievements ({completedAchievements.length})</h3>
          <div className="achievements-list">
            {completedAchievements.slice(0, 6).map((ach) => (
              <div key={ach.achievement_id} className="achievement-badge">
                🎖️ {ach.name}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function AchievementPanel({ achievements, userAchievements, onBack }) {
  const categories = [
    "all",
    "gameplay",
    "speed",
    "efficiency",
    "competitive",
    "special",
  ];
  const [selectedCategory, setSelectedCategory] = useState("all");

  const filteredAchievements =
    selectedCategory === "all"
      ? achievements
      : achievements.filter((a) => a.category === selectedCategory);

  const getUserProgress = (achievementId) => {
    return userAchievements.find((ua) => ua.achievement_id === achievementId);
  };

  return (
    <div className="achievements-screen">
      <header className="screen-header">
        <button className="btn btn-secondary" onClick={onBack}>
          ← Back
        </button>
        <h1>🎖️ Achievements</h1>
      </header>

      <div className="achievement-tabs">
        {categories.map((cat) => (
          <button
            key={cat}
            className={`tab ${selectedCategory === cat ? "active" : ""}`}
            onClick={() => setSelectedCategory(cat)}
          >
            {cat.charAt(0).toUpperCase() + cat.slice(1)}
          </button>
        ))}
      </div>

      <div className="achievements-grid">
        {filteredAchievements.map((achievement) => {
          const progress = getUserProgress(achievement.achievement_id);
          const isCompleted = progress?.is_completed || false;
          const currentProgress = progress?.current_progress || 0;
          const percentage =
            (currentProgress / achievement.requirement_value) * 100;

          return (
            <div
              key={achievement.achievement_id}
              className={`achievement-card ${isCompleted ? "completed" : ""} rarity-${achievement.rarity}`}
            >
              <div className="achievement-icon">
                {isCompleted ? "✅" : "🔒"}
              </div>
              <div className="achievement-info">
                <h3>{achievement.name}</h3>
                <p>{achievement.description}</p>
                {!isCompleted && (
                  <div className="progress-bar">
                    <div
                      className="progress-fill"
                      style={{ width: `${percentage}%` }}
                    ></div>
                    <span className="progress-text">
                      {currentProgress} / {achievement.requirement_value}
                    </span>
                  </div>
                )}
                {isCompleted && progress.unlocked_at && (
                  <div className="unlock-date">
                    Unlocked:{" "}
                    {new Date(progress.unlocked_at).toLocaleDateString()}
                  </div>
                )}
              </div>
              <div className="achievement-reward">
                +{achievement.xp_reward} XP
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function PowerupInventory({ powerups, userPowerups, onBack }) {
  return (
    <div className="powerups-screen">
      <header className="screen-header">
        <button className="btn btn-secondary" onClick={onBack}>
          ← Back
        </button>
        <h1>✨ Powerups</h1>
      </header>

      <div className="powerups-grid">
        {powerups.map((powerup) => {
          const userPowerup = userPowerups.find(
            (up) => up.powerup_id === powerup.powerup_id,
          );
          const quantity = userPowerup?.quantity || 0;

          return (
            <div
              key={powerup.powerup_id}
              className={`powerup-card rarity-${powerup.rarity}`}
            >
              <div className="powerup-header">
                <div className="powerup-icon-large">
                  {getPowerupIcon(powerup.powerup_key)}
                </div>
                <div className="powerup-quantity">×{quantity}</div>
              </div>
              <h3>{powerup.name}</h3>
              <p>{powerup.description}</p>
              <div className="powerup-meta">
                <span className="rarity">{powerup.rarity}</span>
                {powerup.usable_in_multiplayer && (
                  <span className="tag">Multiplayer</span>
                )}
                {powerup.usable_in_competitive && (
                  <span className="tag">Competitive</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function getPowerupIcon(key) {
  const icons = {
    peek: "👁️",
    hint: "💡",
    shuffle_helper: "🔄",
    time_freeze: "⏰",
    auto_solve_3: "🎯",
    undo_move: "↩️",
    slow_motion: "🐌",
    ghost_tile: "👻",
  };
  return icons[key] || "✨";
}

export function SettingsPanel({
  preferences,
  currentTheme,
  onUpdatePreferences,
  onChangeTheme,
  onBack,
  availableThemes,
}) {
  const [prefs, setPrefs] = useState(preferences || {});

  const handleSave = () => {
    onUpdatePreferences(prefs);
    onBack();
  };

  const themes = ["dasher", "prancer", "comet", "blitzen", "rudolph", "aurora"];

  return (
    <div className="settings-screen">
      <header className="screen-header">
        <button className="btn btn-secondary" onClick={onBack}>
          ← Back
        </button>
        <h1>⚙️ Settings</h1>
      </header>

      <div className="settings-content">
        <div className="settings-section">
          <h2>Audio</h2>
          <label className="setting-item">
            <span>Music</span>
            <input
              type="checkbox"
              checked={prefs.music_enabled}
              onChange={(e) =>
                setPrefs({ ...prefs, music_enabled: e.target.checked })
              }
            />
          </label>
          <label className="setting-item">
            <span>Sound Effects</span>
            <input
              type="checkbox"
              checked={prefs.sound_enabled}
              onChange={(e) =>
                setPrefs({ ...prefs, sound_enabled: e.target.checked })
              }
            />
          </label>
          <label className="setting-item">
            <span>Music Volume</span>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={prefs.music_volume}
              onChange={(e) =>
                setPrefs({ ...prefs, music_volume: parseFloat(e.target.value) })
              }
            />
          </label>
          <label className="setting-item">
            <span>Sound Volume</span>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={prefs.sound_volume}
              onChange={(e) =>
                setPrefs({ ...prefs, sound_volume: parseFloat(e.target.value) })
              }
            />
          </label>
        </div>

        <div className="settings-section">
          <h2>Gameplay</h2>
          <label className="setting-item">
            <span>Show Timer</span>
            <input
              type="checkbox"
              checked={prefs.show_timer}
              onChange={(e) =>
                setPrefs({ ...prefs, show_timer: e.target.checked })
              }
            />
          </label>
          <label className="setting-item">
            <span>Show Move Counter</span>
            <input
              type="checkbox"
              checked={prefs.show_move_counter}
              onChange={(e) =>
                setPrefs({ ...prefs, show_move_counter: e.target.checked })
              }
            />
          </label>
          <label className="setting-item">
            <span>Animations</span>
            <input
              type="checkbox"
              checked={prefs.enable_animations}
              onChange={(e) =>
                setPrefs({ ...prefs, enable_animations: e.target.checked })
              }
            />
          </label>
        </div>

        <div className="settings-section">
          <h2>Theme</h2>
          <div className="theme-selector">
            {themes.map((theme) => (
              <button
                key={theme}
                className={`theme-option ${currentTheme === theme ? "selected" : ""} ${!availableThemes.includes(theme) ? "locked" : ""}`}
                onClick={() =>
                  availableThemes.includes(theme) && onChangeTheme(theme)
                }
                disabled={!availableThemes.includes(theme)}
              >
                {theme.charAt(0).toUpperCase() + theme.slice(1)}
                {!availableThemes.includes(theme) && " 🔒"}
              </button>
            ))}
          </div>
        </div>

        <button className="btn btn-primary btn-large" onClick={handleSave}>
          Save Settings
        </button>
      </div>
    </div>
  );
}

export default {
  NotificationToast,
  Matchmaking,
  VictoryScreen,
  StoryModal,
  Leaderboard,
  UserProfile,
  AchievementPanel,
  PowerupInventory,
  SettingsPanel,
};
