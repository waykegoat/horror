/**
 * Procedural Audio Engine for Night Shift Survival
 * Generates all sound effects directly via Web Audio API:
 * - Room ambient hum & ticking clock
 * - TV static noise blast
 * - Heavy door pounding
 * - Window glass scratching
 * - Electric breaker spark/zap
 * - Alarm warning beep
 * - 06:00 Morning Victory Chime
 */
export class HorrorAudio {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.isMuted = false;
    this.isInitialized = false;

    // Sustained nodes
    this.tvNoiseNode = null;
    this.tvNoiseGain = null;

    this.sparkGain = null;
    this.sparkOsc = null;

    this.heartbeatTimer = null;
    this.threatLevel = 0;
  }

  init() {
    if (this.isInitialized) return;

    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioContextClass();

      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(0.7, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);

      this.initRoomAmbience();
      this.startHeartbeatSystem();

      this.isInitialized = true;
    } catch (e) {
      console.warn('AudioContext failed:', e);
    }
  }

  resume() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  toggleMute() {
    if (!this.masterGain || !this.ctx) return false;
    this.isMuted = !this.isMuted;
    this.masterGain.gain.setTargetAtTime(this.isMuted ? 0 : 0.7, this.ctx.currentTime, 0.05);
    return !this.isMuted;
  }

  // Soft room tone (warm, gentle, NOT disturbing)
  initRoomAmbience() {
    if (!this.ctx || !this.masterGain) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(50, this.ctx.currentTime);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(80, this.ctx.currentTime);

    gain.gain.setValueAtTime(0.04, this.ctx.currentTime);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc.start();
  }

  // --- Clock Tick ---
  playClockTick() {
    if (!this.ctx || !this.masterGain || this.isMuted) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(650, now);
    osc.frequency.exponentialRampToValueAtTime(120, now + 0.03);

    gain.gain.setValueAtTime(0.06, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.035);
  }

  // --- CRT TV Static Blast ---
  startTVStatic() {
    if (!this.ctx || !this.masterGain || this.tvNoiseGain) return;

    const bufferSize = this.ctx.sampleRate * 2;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    this.tvNoiseNode = this.ctx.createBufferSource();
    this.tvNoiseNode.buffer = buffer;
    this.tvNoiseNode.loop = true;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1400, this.ctx.currentTime);
    filter.Q.setValueAtTime(1.2, this.ctx.currentTime);

    this.tvNoiseGain = this.ctx.createGain();
    this.tvNoiseGain.gain.setValueAtTime(0.28, this.ctx.currentTime);

    this.tvNoiseNode.connect(filter);
    filter.connect(this.tvNoiseGain);
    this.tvNoiseGain.connect(this.masterGain);

    this.tvNoiseNode.start();
  }

  stopTVStatic() {
    if (this.tvNoiseGain && this.ctx) {
      this.tvNoiseGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.05);
      setTimeout(() => {
        try {
          this.tvNoiseNode?.stop();
          this.tvNoiseNode?.disconnect();
          this.tvNoiseGain?.disconnect();
        } catch (_) {}
        this.tvNoiseNode = null;
        this.tvNoiseGain = null;
      }, 60);
    }
  }

  // --- Heavy Door Banging ---
  playDoorBang() {
    if (!this.ctx || !this.masterGain || this.isMuted) return;

    const now = this.ctx.currentTime;
    // 3 heavy rapid thuds
    for (let i = 0; i < 3; i++) {
      const t = now + i * 0.18;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(60, t);
      osc.frequency.exponentialRampToValueAtTime(18, t + 0.14);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(160, t);

      gain.gain.setValueAtTime(0.45, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.16);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);

      osc.start(t);
      osc.stop(t + 0.17);
    }
  }

  // --- Window Glass Scratching ---
  playWindowScratch() {
    if (!this.ctx || !this.masterGain || this.isMuted) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(1800, now);
    osc.frequency.linearRampToValueAtTime(800, now + 0.35);
    osc.frequency.linearRampToValueAtTime(2200, now + 0.7);

    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.75);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.76);
  }

  // --- Electric Sparks & Zap ---
  playSparkZap() {
    if (!this.ctx || !this.masterGain || this.isMuted) return;

    const now = this.ctx.currentTime;
    for (let i = 0; i < 4; i++) {
      const t = now + Math.random() * 0.15;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'square';
      osc.frequency.setValueAtTime(120 + Math.random() * 400, t);
      osc.frequency.exponentialRampToValueAtTime(30, t + 0.05);

      gain.gain.setValueAtTime(0.2, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(t);
      osc.stop(t + 0.06);
    }
  }

  // --- Switch / Deadbolt Interaction Click ---
  playInteractionClick() {
    if (!this.ctx || !this.masterGain || this.isMuted) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(750, now);
    osc.frequency.exponentialRampToValueAtTime(180, now + 0.06);

    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.07);
  }

  // --- Anomaly Alert Beep ---
  playWarningAlert() {
    if (!this.ctx || !this.masterGain || this.isMuted) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, now);
    osc.frequency.setValueAtTime(1174, now + 0.1);

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.26);
  }

  // --- Morning Triumph 06:00 Chime ---
  playMorningVictory() {
    if (!this.ctx || !this.masterGain || this.isMuted) return;

    const now = this.ctx.currentTime;
    // Bright triumphant melodic chime (C - E - G - C5)
    const notes = [523.25, 659.25, 783.99, 1046.50];
    notes.forEach((freq, idx) => {
      const t = now + idx * 0.22;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);

      gain.gain.setValueAtTime(0.25, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 1.2);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(t);
      osc.stop(t + 1.25);
    });
  }

  // --- Jumpscare Screech ---
  playJumpscare() {
    if (!this.ctx || !this.masterGain || this.isMuted) return;

    const now = this.ctx.currentTime;
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc1.type = 'sawtooth';
    osc1.frequency.setValueAtTime(90, now);
    osc1.frequency.linearRampToValueAtTime(550, now + 0.2);

    osc2.type = 'square';
    osc2.frequency.setValueAtTime(120, now);
    osc2.frequency.linearRampToValueAtTime(700, now + 0.2);

    gain.gain.setValueAtTime(0.8, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 1.2);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(this.masterGain);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 1.2);
    osc2.stop(now + 1.2);
  }

  setThreatLevel(threat) {
    this.threatLevel = Math.max(0, Math.min(1, threat));
  }

  startHeartbeatSystem() {
    const tick = () => {
      if (this.threatLevel > 0.4 && this.ctx && !this.isMuted) {
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(55, now);
        osc.frequency.exponentialRampToValueAtTime(25, now + 0.12);

        gain.gain.setValueAtTime(this.threatLevel * 0.4, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.13);

        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(now);
        osc.stop(now + 0.14);
      }

      const bpm = 60 + this.threatLevel * 80;
      const interval = 60 / bpm;
      this.heartbeatTimer = setTimeout(tick, interval * 1000);
    };

    tick();
  }
}
