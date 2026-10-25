// Web Audio API Synthesizer - Self-contained audio feedback without external audio files

class SoundFX {
  constructor() {
    this.ctx = null;
    this.enabled = true;
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  playTone(freq, type = 'sine', duration = 0.15, gainVal = 0.15) {
    if (!this.enabled) return;
    try {
      this.init();
      if (!this.ctx) return;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);

      gain.gain.setValueAtTime(gainVal, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + duration);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + duration);
    } catch (e) {
      console.warn("Audio playback error:", e);
    }
  }

  // Timer started
  start() {
    if (!this.enabled) return;
    this.playTone(587.33, 'sine', 0.08, 0.1); // D5
    setTimeout(() => {
      this.playTone(880, 'sine', 0.1, 0.12); // A5
    }, 60);
  }

  // Timer paused
  pause() {
    if (!this.enabled) return;
    this.playTone(880, 'sine', 0.08, 0.1);
    setTimeout(() => {
      this.playTone(587.33, 'sine', 0.1, 0.08);
    }, 60);
  }

  // Button click / tick
  tick() {
    this.playTone(880, 'sine', 0.05, 0.08);
  }

  // Lap split recorded
  lap() {
    if (!this.enabled) return;
    this.playTone(523.25, 'triangle', 0.08, 0.12); // C5
    setTimeout(() => {
      this.playTone(659.25, 'triangle', 0.12, 0.12); // E5
    }, 90);
  }

  // Time warning (e.g. 5m or 1m left)
  warning() {
    if (!this.enabled) return;
    this.playTone(440, 'sine', 0.12, 0.15); // A4
    setTimeout(() => {
      this.playTone(440, 'sine', 0.18, 0.18);
    }, 180);
  }

  // Target countdown finished
  finish() {
    if (!this.enabled) return;
    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
    notes.forEach((freq, idx) => {
      setTimeout(() => {
        this.playTone(freq, 'sine', 0.35, 0.2);
      }, idx * 130);
    });
  }
}

// Global instance
window.soundFX = new SoundFX();
