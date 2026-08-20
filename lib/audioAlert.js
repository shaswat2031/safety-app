// Web Audio API emergency siren generator
class EmergencyAudioEngine {
  constructor() {
    this.audioCtx = null;
    this.oscillator = null;
    this.gainNode = null;
    this.isPlaying = false;
    this.intervalId = null;
    this.isMuted = true; // Sound starting me OFF by default
  }

  init() {
    if (!this.audioCtx && typeof window !== "undefined") {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) {
        this.audioCtx = new AudioContext();
      }
    }
  }

  playSiren() {
    if (this.isPlaying || this.isMuted) return;
    try {
      this.init();
      if (!this.audioCtx) return;

      if (this.audioCtx.state === "suspended") {
        this.audioCtx.resume();
      }

      this.oscillator = this.audioCtx.createOscillator();
      this.gainNode = this.audioCtx.createGain();

      this.oscillator.type = "sawtooth";
      this.gainNode.gain.setValueAtTime(0.08, this.audioCtx.currentTime);

      this.oscillator.connect(this.gainNode);
      this.gainNode.connect(this.audioCtx.destination);

      this.oscillator.start();
      this.isPlaying = true;

      // Frequency modulation for industrial emergency warble (600Hz <-> 950Hz)
      let high = false;
      this.intervalId = setInterval(() => {
        if (!this.oscillator || !this.audioCtx) return;
        const now = this.audioCtx.currentTime;
        const targetFreq = high ? 650 : 960;
        this.oscillator.frequency.setTargetAtTime(targetFreq, now, 0.15);
        high = !high;
      }, 400);
    } catch (e) {
      console.warn("Audio Context playback prevented or not initialized yet", e);
    }
  }

  stopSiren() {
    if (!this.isPlaying) return;
    try {
      if (this.intervalId) {
        clearInterval(this.intervalId);
        this.intervalId = null;
      }
      if (this.oscillator) {
        this.oscillator.stop();
        this.oscillator.disconnect();
        this.oscillator = null;
      }
      this.isPlaying = false;
    } catch (e) {
      console.warn("Error stopping audio", e);
    }
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    if (this.isMuted && this.isPlaying) {
      this.stopSiren();
    }
    return this.isMuted;
  }
}

export const audioEngine = new EmergencyAudioEngine();
