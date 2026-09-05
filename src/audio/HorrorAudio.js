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

    // 3D Spatial Panners
    this.panners = {
      tv: null,
      door: null,
      window: null,
      fuse: null,
      radio: null
    };

    this.radioInterval = null;
    this.currentRadioChannel = 0;
  }

  createPanner(x, y, z) {
    if (!this.ctx) return null;
    const panner = this.ctx.createPanner();
    panner.panningModel = 'HRTF';
    panner.distanceModel = 'inverse';
    panner.refDistance = 1.8;
    panner.maxDistance = 18;
    panner.rolloffFactor = 1.0;
    panner.coneInnerAngle = 360;

    if (panner.positionX) {
      panner.positionX.setValueAtTime(x, this.ctx.currentTime);
      panner.positionY.setValueAtTime(y, this.ctx.currentTime);
      panner.positionZ.setValueAtTime(z, this.ctx.currentTime);
    } else {
      panner.setPosition(x, y, z);
    }

    panner.connect(this.masterGain);
    return panner;
  }

  init() {
    if (this.isInitialized) return;

    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioContextClass();

      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(0.7, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);

      // Initialize 3D Panners for spatial anomalies and props
      this.panners.tv = this.createPanner(0, 1.1, 2.8);
      this.panners.door = this.createPanner(0, 1.3, -3.2);
      this.panners.window = this.createPanner(-3.2, 1.6, 0);
      this.panners.fuse = this.createPanner(3.2, 1.6, 1.5);
      this.panners.radio = this.createPanner(2.4, 1.0, -1.15);

      this.initRoomAmbience();
      this.startHeartbeatSystem();

      this.isInitialized = true;
    } catch (e) {
      console.warn('AudioContext failed:', e);
    }
  }

  updateListener(camera) {
    if (!this.ctx || !this.isInitialized) return;
    const listener = this.ctx.listener;
    const p = camera.position;
    const dir = new THREE.Vector3();
    camera.getWorldDirection(dir);
    const up = camera.up;

    if (listener.positionX) {
      listener.positionX.setValueAtTime(p.x, this.ctx.currentTime);
      listener.positionY.setValueAtTime(p.y, this.ctx.currentTime);
      listener.positionZ.setValueAtTime(p.z, this.ctx.currentTime);
      listener.forwardX.setValueAtTime(dir.x, this.ctx.currentTime);
      listener.forwardY.setValueAtTime(dir.y, this.ctx.currentTime);
      listener.forwardZ.setValueAtTime(dir.z, this.ctx.currentTime);
      listener.upX.setValueAtTime(up.x, this.ctx.currentTime);
      listener.upY.setValueAtTime(up.y, this.ctx.currentTime);
      listener.upZ.setValueAtTime(up.z, this.ctx.currentTime);
    } else if (listener.setPosition) {
      listener.setPosition(p.x, p.y, p.z);
      listener.setOrientation(dir.x, dir.y, dir.z, up.x, up.y, up.z);
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
    this.tvNoiseGain.connect(this.panners.tv || this.masterGain);

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

  // --- Heavy Door Banging (Spatial North) ---
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
      gain.connect(this.panners.door || this.masterGain);

      osc.start(t);
      osc.stop(t + 0.17);
    }
  }

  // --- Window Glass Scratching (Spatial West) ---
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
    gain.connect(this.panners.window || this.masterGain);

    osc.start(now);
    osc.stop(now + 0.76);
  }

  // --- Electric Sparks & Zap (Spatial East) ---
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
      gain.connect(this.panners.fuse || this.masterGain);

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

  // --- Flashlight Switch Click ---
  playFlashlightClick() {
    if (!this.ctx || !this.masterGain || this.isMuted) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(1200, now);
    osc.frequency.exponentialRampToValueAtTime(140, now + 0.04);

    gain.gain.setValueAtTime(0.35, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.045);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.05);
  }

  // --- Tablet Raise / Holster Beep ---
  playTabletHolster(isRaising) {
    if (!this.ctx || !this.masterGain || this.isMuted) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    const startFreq = isRaising ? 440 : 880;
    const endFreq = isRaising ? 880 : 440;
    osc.frequency.setValueAtTime(startFreq, now);
    osc.frequency.exponentialRampToValueAtTime(endFreq, now + 0.06);

    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.08);
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

  // --- Blackout Power Down Sound (Spatial East) ---
  playBlackoutPowerDown() {
    if (!this.ctx || !this.masterGain || this.isMuted) return;

    const now = this.ctx.currentTime;

    const click = this.ctx.createOscillator();
    const clickGain = this.ctx.createGain();
    click.type = 'triangle';
    click.frequency.setValueAtTime(220, now);
    click.frequency.exponentialRampToValueAtTime(40, now + 0.08);
    clickGain.gain.setValueAtTime(0.5, now);
    clickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
    click.connect(clickGain);
    clickGain.connect(this.panners.fuse || this.masterGain);
    click.start(now);
    click.stop(now + 0.1);

    const whine = this.ctx.createOscillator();
    const whineGain = this.ctx.createGain();
    whine.type = 'sawtooth';
    whine.frequency.setValueAtTime(440, now);
    whine.frequency.exponentialRampToValueAtTime(30, now + 1.6);
    whineGain.gain.setValueAtTime(0.3, now);
    whineGain.gain.exponentialRampToValueAtTime(0.001, now + 1.65);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(800, now);
    filter.frequency.exponentialRampToValueAtTime(120, now + 1.6);

    whine.connect(filter);
    filter.connect(whineGain);
    whineGain.connect(this.panners.fuse || this.masterGain);
    whine.start(now);
    whine.stop(now + 1.7);
  }

  // --- Glass Shatter Sound (Spatial West) ---
  playGlassShatter() {
    if (!this.ctx || !this.masterGain || this.isMuted) return;

    const now = this.ctx.currentTime;
    for (let i = 0; i < 8; i++) {
      const t = now + Math.random() * 0.18;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(2400 + Math.random() * 3000, t);
      osc.frequency.exponentialRampToValueAtTime(300, t + 0.25);

      gain.gain.setValueAtTime(0.35, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);

      osc.connect(gain);
      gain.connect(this.panners.window || this.masterGain);
      osc.start(t);
      osc.stop(t + 0.32);
    }
  }

  // --- Metal Door Slam (Spatial North) ---
  playMetalGateSlam() {
    if (!this.ctx || !this.masterGain || this.isMuted) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(80, now);
    osc.frequency.exponentialRampToValueAtTime(18, now + 0.4);

    gain.gain.setValueAtTime(0.7, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

    osc.connect(gain);
    gain.connect(this.panners.door || this.masterGain);
    osc.start(now);
    osc.stop(now + 0.48);
  }

  // --- Distant & Close Thunderclap with Sub-bass Roll ---
  playThunderClap(distance = 1.0) {
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    const now = this.ctx.currentTime;
    const panner = this.panners.window || this.masterGain;

    // 1. Initial high-frequency crackle / snap
    const snapLen = Math.floor(this.ctx.sampleRate * 0.12);
    const snapBuffer = this.ctx.createBuffer(1, snapLen, this.ctx.sampleRate);
    const snapData = snapBuffer.getChannelData(0);
    for (let i = 0; i < snapLen; i++) {
      snapData[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * 0.03));
    }
    const snapSrc = this.ctx.createBufferSource();
    snapSrc.buffer = snapBuffer;

    const snapFilter = this.ctx.createBiquadFilter();
    snapFilter.type = 'highpass';
    snapFilter.frequency.setValueAtTime(1400, now);

    const snapGain = this.ctx.createGain();
    snapGain.gain.setValueAtTime(0.32 / distance, now);
    snapGain.gain.exponentialRampToValueAtTime(0.001, now + 0.11);

    snapSrc.connect(snapFilter);
    snapFilter.connect(snapGain);
    snapGain.connect(panner);
    snapSrc.start(now);

    // 2. Long low-pass filtered sub-bass thunder rumble
    const dur = 3.6;
    const rumbleLen = Math.floor(this.ctx.sampleRate * dur);
    const rumbleBuffer = this.ctx.createBuffer(1, rumbleLen, this.ctx.sampleRate);
    const rData = rumbleBuffer.getChannelData(0);
    for (let i = 0; i < rumbleLen; i++) {
      const t = i / this.ctx.sampleRate;
      const env = t < 0.22 ? (t / 0.22) : Math.exp(-(t - 0.22) / 1.15);
      rData[i] = (Math.random() * 2 - 1) * env;
    }
    const rSrc = this.ctx.createBufferSource();
    rSrc.buffer = rumbleBuffer;

    const rFilter = this.ctx.createBiquadFilter();
    rFilter.type = 'lowpass';
    rFilter.frequency.setValueAtTime(160, now);
    rFilter.frequency.exponentialRampToValueAtTime(38, now + dur);

    const rGain = this.ctx.createGain();
    rGain.gain.setValueAtTime(0.55 / distance, now);
    rGain.gain.exponentialRampToValueAtTime(0.001, now + dur - 0.05);

    rSrc.connect(rFilter);
    rFilter.connect(rGain);
    rGain.connect(panner);
    rSrc.start(now + 0.04);

    // Sub oscillator vibration
    const subOsc = this.ctx.createOscillator();
    const subGain = this.ctx.createGain();
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(58, now + 0.04);
    subOsc.frequency.exponentialRampToValueAtTime(22, now + dur * 0.7);

    subGain.gain.setValueAtTime(0.38 / distance, now + 0.04);
    subGain.gain.exponentialRampToValueAtTime(0.001, now + dur * 0.7);

    subOsc.connect(subGain);
    subGain.connect(this.masterGain);
    subOsc.start(now + 0.04);
    subOsc.stop(now + dur * 0.7 + 0.08);
  }

  // --- Floorboard Creak / Footstep Feedback ---
  playFootstepCreak() {
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    const baseFreq = 110 + Math.random() * 60;
    osc.frequency.setValueAtTime(baseFreq, now);
    osc.frequency.exponentialRampToValueAtTime(baseFreq * (0.8 + Math.random() * 0.35), now + 0.065);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(420, now);
    filter.Q.setValueAtTime(3.0, now);

    gain.gain.setValueAtTime(0.06 + Math.random() * 0.04, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.075);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.08);
  }

  // --- Soviet Military Radio R-326 Broadcasts ---
  setRadioChannel(ch) {
    this.currentRadioChannel = ch;
    if (this.radioInterval) {
      clearInterval(this.radioInterval);
      clearTimeout(this.radioInterval);
      this.radioInterval = null;
    }

    if (!this.ctx || !this.masterGain || this.isMuted || ch === 0) return;

    const panner = this.panners.radio || this.masterGain;

    if (ch === 1) {
      // UVB-76 "The Buzzer" (Russian military numbers station 4625 kHz)
      const playBuzz = () => {
        if (!this.ctx || this.currentRadioChannel !== 1) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(378, now);
        osc.frequency.exponentialRampToValueAtTime(365, now + 0.85);

        // AM pulse
        const lfo = this.ctx.createOscillator();
        const lfoGain = this.ctx.createGain();
        lfo.type = 'square';
        lfo.frequency.setValueAtTime(24, now);
        lfoGain.gain.setValueAtTime(0.45, now);
        lfo.connect(gain.gain);
        lfo.start(now);
        lfo.stop(now + 0.85);

        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.88);

        osc.connect(gain);
        gain.connect(panner);
        osc.start(now);
        osc.stop(now + 0.89);
      };

      playBuzz();
      this.radioInterval = setInterval(playBuzz, 1380);
    } else if (ch === 2) {
      // Morse Code SOS (... --- ...)
      const pattern = [
        0.1, 0.1, 0.1, 0.1, 0.1, 0.28,
        0.28, 0.1, 0.28, 0.1, 0.28, 0.28,
        0.1, 0.1, 0.1, 0.1, 0.1, 1.4
      ];

      let pIdx = 0;
      const playBeep = (dur) => {
        if (!this.ctx || this.currentRadioChannel !== 2) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(740, now);

        gain.gain.setValueAtTime(0.16, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + dur - 0.015);

        osc.connect(gain);
        gain.connect(panner);
        osc.start(now);
        osc.stop(now + dur);
      };

      const stepMorse = () => {
        if (this.currentRadioChannel !== 2) return;
        const dur = pattern[pIdx];
        const isBeep = pIdx % 2 === 0;
        if (isBeep) {
          playBeep(dur);
        }
        pIdx = (pIdx + 1) % pattern.length;
        this.radioInterval = setTimeout(stepMorse, dur * 1000);
      };

      stepMorse();
    } else if (ch === 3) {
      // Shortwave Static & Whistle
      const playStatic = () => {
        if (!this.ctx || this.currentRadioChannel !== 3) return;
        const now = this.ctx.currentTime;
        const buf = this.ctx.createBuffer(1, Math.floor(this.ctx.sampleRate * 0.45), this.ctx.sampleRate);
        const data = buf.getChannelData(0);
        for (let i = 0; i < data.length; i++) {
          data[i] = (Math.random() * 2 - 1) * 0.14;
        }
        const src = this.ctx.createBufferSource();
        src.buffer = buf;
        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.42);
        src.connect(gain);
        gain.connect(panner);
        src.start(now);
      };

      playStatic();
      this.radioInterval = setInterval(playStatic, 580);
    }
  }

  setThreatLevel(threat) {
    this.threatLevel = Math.max(0, Math.min(1, threat));
  }

  startHeartbeatSystem() {
    const tick = () => {
      if (this.threatLevel > 0.35 && this.ctx && !this.isMuted) {
        const now = this.ctx.currentTime;

        // Double thud: lub-dub
        const playThud = (timeOffset, freq, vol) => {
          const t = now + timeOffset;
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();

          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, t);
          osc.frequency.exponentialRampToValueAtTime(20, t + 0.11);

          gain.gain.setValueAtTime(this.threatLevel * vol, t);
          gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);

          osc.connect(gain);
          gain.connect(this.masterGain);
          osc.start(t);
          osc.stop(t + 0.13);
        };

        playThud(0, 58, 0.45);      // lub
        playThud(0.12, 48, 0.35);   // dub
      }

      const bpm = 65 + this.threatLevel * 105;
      const interval = 60 / bpm;
      this.heartbeatTimer = setTimeout(tick, interval * 1000);
    };

    tick();
  }
}
