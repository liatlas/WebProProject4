class AudioManager {
  constructor() {
    this.musicTracks = {};
    this.soundEffects = {};
    this.currentMusic = null;
    this.musicVolume = 0.5;
    this.soundVolume = 0.7;
    this.musicEnabled = true;
    this.soundEnabled = true;
    this.initialized = false;
  }

  /**
   * Initialize audio manager and preload all audio files
   */
  async initialize() {
    if (this.initialized) return;

    try {
      // Preload music tracks
      this.musicTracks = {
        menu: this.loadAudio("/audio/menu-theme.mp3", true),
        gameplayCalm: this.loadAudio("/audio/gameplay-calm.mp3", true),
        gameplayIntense: this.loadAudio("/audio/gameplay-intense.mp3", true),
        victory: this.loadAudio("/audio/victory-theme.mp3", false),
      };

      // Preload sound effects
      this.soundEffects = {
        tileSlide: this.loadAudio("/audio/tile-slide.mp3"),
        tileClick: this.loadAudio("/audio/tile-click.mp3"),
        matchFound: this.loadAudio("/audio/match-found.mp3"),
        puzzleComplete: this.loadAudio("/audio/puzzle-complete.mp3"),
        achievementUnlock: this.loadAudio("/audio/achievement-unlock.mp3"),
        powerupActivate: this.loadAudio("/audio/powerup-activate.mp3"),
        powerupEarned: this.loadAudio("/audio/powerup-earned.mp3"),
        levelUp: this.loadAudio("/audio/level-up.mp3"),
        countdown: this.loadAudio("/audio/countdown.mp3"),
        notification: this.loadAudio("/audio/notification.mp3"),
      };

      // Set initial volumes
      Object.values(this.musicTracks).forEach((audio) => {
        if (audio) audio.volume = this.musicVolume;
      });

      Object.values(this.soundEffects).forEach((audio) => {
        if (audio) audio.volume = this.soundVolume;
      });

      this.initialized = true;
      console.log("🔊 Audio Manager initialized");
    } catch (error) {
      console.error("Error initializing audio:", error);
    }
  }

  /**
   * Load an audio file
   * @param {string} path - Path to audio file
   * @param {boolean} loop - Whether to loop the audio
   * @returns {HTMLAudioElement|null}
   */
  loadAudio(path, loop = false) {
    try {
      const audio = new Audio(path);
      audio.loop = loop;
      audio.preload = "auto";

      // Handle load errors gracefully
      audio.addEventListener("error", (e) => {
        console.warn(`Failed to load audio: ${path}`);
      });

      return audio;
    } catch (error) {
      console.warn(`Error creating audio: ${path}`, error);
      return null;
    }
  }

  /**
   * Play background music
   * @param {string} trackName - Name of the track
   */
  playMusic(trackName) {
    if (!this.musicEnabled || !this.initialized) return;

    // Stop current music
    if (this.currentMusic) {
      this.currentMusic.pause();
      this.currentMusic.currentTime = 0;
    }

    // Play new music
    const track = this.musicTracks[trackName];
    if (track) {
      track.volume = this.musicVolume;
      track.play().catch((err) => console.warn("Music play failed:", err));
      this.currentMusic = track;
    }
  }

  /**
   * Play a sound effect
   * @param {string} soundName - Name of the sound effect
   */
  playSound(soundName) {
    if (!this.soundEnabled || !this.initialized) return;

    const sound = this.soundEffects[soundName];
    if (sound) {
      // Clone the audio to allow overlapping sounds
      const soundClone = sound.cloneNode();
      soundClone.volume = this.soundVolume;
      soundClone.play().catch((err) => console.warn("Sound play failed:", err));
    }
  }

  /**
   * Stop all music
   */
  stopMusic() {
    if (this.currentMusic) {
      this.currentMusic.pause();
      this.currentMusic.currentTime = 0;
      this.currentMusic = null;
    }
  }

  /**
   * Set music volume
   * @param {number} volume - Volume level (0-1)
   */
  setMusicVolume(volume) {
    this.musicVolume = Math.max(0, Math.min(1, volume));

    Object.values(this.musicTracks).forEach((audio) => {
      if (audio) audio.volume = this.musicVolume;
    });

    if (this.currentMusic) {
      this.currentMusic.volume = this.musicVolume;
    }
  }

  /**
   * Set sound effects volume
   * @param {number} volume - Volume level (0-1)
   */
  setSoundVolume(volume) {
    this.soundVolume = Math.max(0, Math.min(1, volume));

    Object.values(this.soundEffects).forEach((audio) => {
      if (audio) audio.volume = this.soundVolume;
    });
  }

  /**
   * Enable/disable music
   * @param {boolean} enabled
   */
  setMusicEnabled(enabled) {
    this.musicEnabled = enabled;

    if (!enabled && this.currentMusic) {
      this.stopMusic();
    }
  }

  /**
   * Enable/disable sound effects
   * @param {boolean} enabled
   */
  setSoundEnabled(enabled) {
    this.soundEnabled = enabled;
  }

  /**
   * Get current music state
   * @returns {object}
   */
  getState() {
    return {
      musicVolume: this.musicVolume,
      soundVolume: this.soundVolume,
      musicEnabled: this.musicEnabled,
      soundEnabled: this.soundEnabled,
      currentTrack: this.currentMusic ? "playing" : "stopped",
    };
  }
}

// Create singleton instance
const audioManager = new AudioManager();

export default audioManager;
