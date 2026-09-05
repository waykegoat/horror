import * as THREE from 'three';
import { EffectComposer } from '../postprocessing/EffectComposer.js';
import { RenderPass } from '../postprocessing/RenderPass.js';
import { ShaderPass } from '../postprocessing/ShaderPass.js';

import { VHSShader } from '../shaders/VHSShader.js';
import { HorrorAudio } from '../audio/HorrorAudio.js';
import { RoomScene } from '../world/RoomScene.js';
import { RoomPlayer } from '../entities/RoomPlayer.js';

export class Game {
  constructor() {
    this.container = document.getElementById('game-container');
    this.canvas = document.getElementById('webgl-canvas');

    // 1. Core Three.js Setup (Bright, clear, atmospheric fog)
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x10161d, 0.015);

    this.camera = new THREE.PerspectiveCamera(72, window.innerWidth / window.innerHeight, 0.1, 40);
    this.clock = new THREE.Clock();

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: false,
      powerPreference: 'high-performance'
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // 2. Post-Processing Pipeline (Clear CRT Monitor look)
    this.composer = new EffectComposer(this.renderer);
    const renderPass = new RenderPass(this.scene, this.camera);
    this.composer.addPass(renderPass);

    this.vhsPass = new ShaderPass(VHSShader);
    this.vhsPass.uniforms.uResolution.value.set(window.innerWidth, window.innerHeight);
    this.composer.addPass(this.vhsPass);

    // 3. Audio Subsystem
    this.audio = new HorrorAudio();

    // 4. Raycaster for Interaction
    this.raycaster = new THREE.Raycaster();
    this.raycaster.far = 2.8;
    this.currentInteractive = null;

    // 5. Game State & Shift Mechanics (00:00 -> 06:00)
    this.state = 'MENU'; // 'MENU', 'PLAYING', 'PAUSED', 'GAMEOVER', 'VICTORY'
    this.shiftDuration = 240; // 240 seconds total (4 minutes = 40 sec / hour)
    this.elapsedShiftTime = 0;
    this.anomaliesCleared = 0;
    this.currentThreat = 0; // 0.0 to 1.0

    // Anomaly Tracking Timers (seconds active)
    this.activeAnomalies = {
      tv: 0,
      window: 0,
      door: 0,
      fuse: 0
    };

    this.nextAnomalyCountdown = 16.0; // First event triggers after ~16s
    this.doorKnockCooldown = 0;

    // UI & 3D Tilt Elements
    this.terminalContainer = document.getElementById('crt-terminal-container');
    this.chassisElem = document.getElementById('crt-chassis');
    this.gameHud = document.getElementById('game-hud');
    this.enable3DTilt = true;

    this.subtitleTimeout = null;

    this.initWorld();
    this.setupUIEvents();
    this.setup3DConsoleTilt();
    this.setupMobileControls();

    window.addEventListener('resize', this.onResize.bind(this));

    // Render initial frame
    this.composer.render();
  }

  initWorld() {
    this.room = new RoomScene(this.scene);
    this.player = new RoomPlayer(this.camera);
  }

  // --- START NIGHT SHIFT ---
  startShift() {
    this.audio.init();
    this.audio.resume();
    this.audio.playInteractionClick();

    this.state = 'PLAYING';
    this.elapsedShiftTime = 0;
    this.anomaliesCleared = 0;
    this.currentThreat = 0;
    this.nextAnomalyCountdown = 14.0;

    // Reset all anomalies
    this.room.setTVState(false);
    this.room.setWindowMonster(false);
    this.room.isDoorLatched = false;
    this.room.doorBoltMesh.position.x = -0.1;
    this.room.setFuseState(false);
    this.activeAnomalies = { tv: 0, window: 0, door: 0, fuse: 0 };

    this.clock.start();

    // Hide Terminal Screen, show in-game HUD
    this.terminalContainer?.classList.add('hidden');
    this.gameHud?.classList.remove('hidden');

    this.requestPointerLock();
    this.showSubtitle('СМЕНА НАЧАЛАСЬ [00:00]. Контролируйте пост и продержитесь до 06:00 утра...', 5000);

    this.updateHUDChecklist();
    this.animate();
  }

  requestPointerLock() {
    if (!('ontouchstart' in window)) {
      this.canvas.requestPointerLock?.();
    }
  }

  animate() {
    if (this.state === 'MENU') return;

    requestAnimationFrame(this.animate.bind(this));

    const delta = Math.min(this.clock.getDelta(), 0.1);
    const time = this.clock.getElapsedTime();

    if (this.state === 'PLAYING') {
      this.player.update(delta);
      this.room.update(delta, time);

      this.updateShiftProgression(delta);
      this.updateAnomalyDirector(delta);
      this.updateInteractions();
      this.updateAtmosphereAndVignette(delta, time);
      this.updateHUD();
    }

    this.composer.render();
  }

  // --- 00:00 to 06:00 PROGRESSION ---
  updateShiftProgression(delta) {
    this.elapsedShiftTime += delta;

    const progress = Math.min(1.0, this.elapsedShiftTime / this.shiftDuration);
    const totalMinutes = progress * 360; // 6 hours * 60 min
    const inGameHour = Math.floor(totalMinutes / 60);
    const inGameMin = Math.floor(totalMinutes % 60);

    // Update 3D Wall Clock
    this.room.updateClock(inGameHour, inGameMin);

    // Update HUD Clock
    const hStr = inGameHour.toString().padStart(2, '0');
    const mStr = inGameMin.toString().padStart(2, '0');
    const hudClockElem = document.getElementById('hud-clock');
    if (hudClockElem) hudClockElem.textContent = `${hStr}:${mStr}`;

    const fillElem = document.getElementById('shift-progress-fill');
    if (fillElem) fillElem.style.width = `${(progress * 100).toFixed(1)}%`;

    // Check Victory
    if (this.elapsedShiftTime >= this.shiftDuration) {
      this.triggerVictory();
    }
  }

  // --- ANOMALY DIRECTOR ---
  updateAnomalyDirector(delta) {
    this.nextAnomalyCountdown -= delta;

    // Escalation: later hours trigger events faster
    const progress = this.elapsedShiftTime / this.shiftDuration;
    const intervalBase = THREE.MathUtils.lerp(24.0, 14.0, progress);

    if (this.nextAnomalyCountdown <= 0) {
      this.triggerRandomAnomaly();
      this.nextAnomalyCountdown = intervalBase + Math.random() * 8.0;
    }

    // Update active anomaly timers & check failure conditions
    let activeCount = 0;

    // 1. TV Anomaly Timer
    if (this.room.isTVOn) {
      activeCount++;
      this.activeAnomalies.tv += delta;
      if (this.activeAnomalies.tv > 17.0) {
        this.triggerGameOver('Сущность проникла в кабинет через кинескоп включенного телевизора...');
        return;
      }
    } else {
      this.activeAnomalies.tv = 0;
    }

    // 2. Window Anomaly Timer
    if (this.room.hasMonsterAtWindow === true) {
      // If curtains are open, danger ticks fast!
      if (!this.room.isCurtainClosed) {
        activeCount++;
        this.activeAnomalies.window += delta;
        if (this.activeAnomalies.window > 16.0) {
          this.triggerGameOver('Сущность за окном разбила стекло и ворвалась в кабинет...');
          return;
        }
      } else {
        // Curtains closed: monster leaves after 3 seconds
        this.activeAnomalies.window = 0;
      }
    } else {
      this.activeAnomalies.window = 0;
    }

    // 3. Door Anomaly Timer
    if (this.doorKnockCooldown > 0) {
      this.doorKnockCooldown -= delta;
      if (!this.room.isDoorLatched) {
        activeCount++;
        this.activeAnomalies.door += delta;
        if (this.activeAnomalies.door > 14.0) {
          this.triggerGameOver('Дверь выбили снаружи. Незапертый засов не спас...');
          return;
        }
      } else {
        // Door is safely latched!
        this.activeAnomalies.door = 0;
      }
    } else {
      this.activeAnomalies.door = 0;
    }

    // 4. Fuse Box Anomaly Timer
    if (this.room.isFuseSparking) {
      activeCount++;
      this.activeAnomalies.fuse += delta;
      if (this.activeAnomalies.fuse > 19.0) {
        this.triggerGameOver('Полный отказ электросети. В наступившей тьме спасения не было...');
        return;
      }
    } else {
      this.activeAnomalies.fuse = 0;
    }

    // Calculate dynamic threat level (0.0 to 1.0)
    let targetThreat = 0;
    if (activeCount > 0) {
      const maxTimer = Math.max(
        this.activeAnomalies.tv,
        this.activeAnomalies.window,
        this.activeAnomalies.door,
        this.activeAnomalies.fuse
      );
      targetThreat = Math.min(1.0, (activeCount * 0.25) + (maxTimer / 18.0) * 0.5);
    }

    this.currentThreat = THREE.MathUtils.lerp(this.currentThreat, targetThreat, delta * 3.0);
    this.audio.setThreatLevel(this.currentThreat);

    // Audio warning beeps when threat is high (> 50%)
    if (this.currentThreat > 0.55 && Math.random() < delta * 0.6) {
      this.audio.playWarningAlert();
    }
  }

  triggerRandomAnomaly() {
    const candidates = [];

    if (!this.room.isTVOn) candidates.push('tv');
    if (!this.room.hasMonsterAtWindow) candidates.push('window');
    if (this.doorKnockCooldown <= 0) candidates.push('door');
    if (!this.room.isFuseSparking) candidates.push('fuse');

    if (candidates.length === 0) return;

    const chosen = candidates[Math.floor(Math.random() * candidates.length)];

    switch (chosen) {
      case 'tv':
        this.room.setTVState(true);
        this.audio.startTVStatic();
        this.showSubtitle('⚠ Телевизор внезапно включился сам! Заглушите его [E]!', 4000);
        break;

      case 'window':
        this.room.setWindowMonster(true);
        this.audio.playWindowScratch();
        this.showSubtitle('⚠ В окно что-то скребется! Задерните шторы [E]!', 4000);
        break;

      case 'door':
        this.doorKnockCooldown = 15.0;
        this.room.isDoorLatched = false;
        this.room.doorBoltMesh.position.x = -0.1;
        this.audio.playDoorBang();
        this.showSubtitle('⚠ В дверь яростно стучат! Закройте засов [E]!', 4000);
        break;

      case 'fuse':
        this.room.setFuseState(true);
        this.audio.playSparkZap();
        this.showSubtitle('⚠ Электрощиток заискрил! Перезапустите тумблер [E]!', 4000);
        break;
    }

    this.updateHUDChecklist();
  }

  // --- INTERACTION HANDLING ---
  updateInteractions() {
    this.raycaster.setFromCamera(new THREE.Vector2(0, 0), this.camera);

    let closest = null;
    let minDist = 2.8;

    for (const item of this.room.interactives) {
      const dist = this.camera.position.distanceTo(item.position);
      if (dist < minDist) {
        const toObj = item.position.clone().sub(this.camera.position).normalize();
        const camDir = new THREE.Vector3();
        this.camera.getWorldDirection(camDir);

        if (camDir.dot(toObj) > 0.68) {
          minDist = dist;
          closest = item;
        }
      }
    }

    this.currentInteractive = closest;

    if (closest) {
      this.setInteractionPrompt(true, closest.getPrompt());
    } else {
      this.setInteractionPrompt(false, '');
    }
  }

  interact() {
    if (this.state !== 'PLAYING' || !this.currentInteractive) return;

    const item = this.currentInteractive;
    this.audio.playInteractionClick();

    if (item.id === 'tv') {
      if (this.room.isTVOn) {
        this.room.setTVState(false);
        this.audio.stopTVStatic();
        this.anomaliesCleared++;
        this.showSubtitle('Телевизор выключен. Сигнал подавлен.', 2500);
      }
    } else if (item.id === 'window') {
      this.room.toggleCurtains();
      if (this.room.isCurtainClosed) {
        if (this.room.hasMonsterAtWindow) {
          this.anomaliesCleared++;
          this.showSubtitle('Шторы задернуты. Сущность потеряла цель из виду.', 3000);
        } else {
          this.showSubtitle('Шторы задернуты.', 2000);
        }
      } else {
        this.showSubtitle('Шторы открыты.', 2000);
      }
    } else if (item.id === 'door') {
      this.room.toggleDoorLatch();
      if (this.room.isDoorLatched) {
        if (this.doorKnockCooldown > 0) {
          this.anomaliesCleared++;
          this.doorKnockCooldown = 0;
          this.showSubtitle('Засов закрыт! Дверь выдержала натиск.', 3000);
        } else {
          this.showSubtitle('Стальной засов заперт.', 2000);
        }
      } else {
        this.showSubtitle('Засов открыт.', 2000);
      }
    } else if (item.id === 'fuse') {
      if (this.room.isFuseSparking) {
        this.room.setFuseState(false);
        this.anomaliesCleared++;
        this.showSubtitle('Щиток перезапущен. Электросеть стабилизирована.', 3000);
      }
    }

    this.updateHUDChecklist();
  }

  // --- HUD UPDATES ---
  updateHUD() {
    // 1. Threat Barometer segments
    const percentElem = document.getElementById('threat-percent');
    if (percentElem) {
      const pct = Math.round(this.currentThreat * 100);
      percentElem.textContent = `${pct}%`;
      percentElem.style.color = pct > 60 ? '#ef4444' : (pct > 30 ? '#f59e0b' : '#22c55e');
    }

    const segments = document.querySelectorAll('.threat-seg');
    const litCount = Math.round(this.currentThreat * 10);
    segments.forEach((seg, idx) => {
      seg.className = 'threat-seg';
      if (idx < litCount) {
        if (idx < 4) seg.classList.add('active-green');
        else if (idx < 7) seg.classList.add('active-yellow');
        else seg.classList.add('active-red');
      }
    });

    // 2. Hardware Alarm LED on monitor bezel
    const alarmLED = document.getElementById('led-alarm');
    if (alarmLED) {
      if (this.currentThreat > 0.4) {
        alarmLED.classList.add('active');
      } else {
        alarmLED.classList.remove('active');
      }
    }
  }

  updateHUDChecklist() {
    // TV
    const badgeTV = document.getElementById('badge-tv');
    if (badgeTV) {
      if (this.room.isTVOn) {
        badgeTV.className = 'sensor-badge badge-alert';
        badgeTV.textContent = 'СТАТИКА [!]';
      } else {
        badgeTV.className = 'sensor-badge badge-normal';
        badgeTV.textContent = 'ВЫКЛ [OK]';
      }
    }

    // Window
    const badgeWin = document.getElementById('badge-window');
    if (badgeWin) {
      if (this.room.hasMonsterAtWindow && !this.room.isCurtainClosed) {
        badgeWin.className = 'sensor-badge badge-alert';
        badgeWin.textContent = 'ДВИЖЕНИЕ [!]';
      } else {
        badgeWin.className = 'sensor-badge badge-normal';
        badgeWin.textContent = this.room.isCurtainClosed ? 'ЗАКРЫТО [OK]' : 'ЧИСТО [OK]';
      }
    }

    // Door
    const badgeDoor = document.getElementById('badge-door');
    if (badgeDoor) {
      if (this.doorKnockCooldown > 0 && !this.room.isDoorLatched) {
        badgeDoor.className = 'sensor-badge badge-alert';
        badgeDoor.textContent = 'УДАРЫ [!]';
      } else {
        badgeDoor.className = 'sensor-badge badge-normal';
        badgeDoor.textContent = this.room.isDoorLatched ? 'ЗАСОВ [OK]' : 'НОРМА [OK]';
      }
    }

    // Fuse
    const badgeFuse = document.getElementById('badge-fuse');
    if (badgeFuse) {
      if (this.room.isFuseSparking) {
        badgeFuse.className = 'sensor-badge badge-alert';
        badgeFuse.textContent = 'СБОЙ СЕТИ [!]';
      } else {
        badgeFuse.className = 'sensor-badge badge-normal';
        badgeFuse.textContent = '220V [OK]';
      }
    }
  }

  updateAtmosphereAndVignette(delta, time) {
    this.vhsPass.uniforms.uTime.value = time;
    this.vhsPass.uniforms.uGlitchIntensity.value = this.currentThreat * 0.65;

    // Danger Red Vignette Pulse
    const vignette = document.getElementById('danger-vignette');
    if (vignette) {
      if (this.currentThreat > 0.35) {
        const pulse = Math.sin(time * 8.0) * 0.5 + 0.5;
        vignette.style.opacity = (this.currentThreat * 0.7 * pulse).toFixed(2);
      } else {
        vignette.style.opacity = '0';
      }
    }
  }

  setInteractionPrompt(visible, text) {
    const promptElem = document.getElementById('interaction-prompt');
    const promptText = document.getElementById('interaction-text');
    const reticle = document.getElementById('reticle');

    if (promptElem && promptText && reticle) {
      if (visible) {
        promptElem.classList.remove('hidden');
        promptText.textContent = text;
        reticle.classList.add('active');
      } else {
        promptElem.classList.add('hidden');
        reticle.classList.remove('active');
      }
    }
  }

  showSubtitle(text, durationMs = 3000) {
    const sub = document.getElementById('subtitles');
    if (!sub) return;

    if (this.subtitleTimeout) clearTimeout(this.subtitleTimeout);

    sub.textContent = text;
    sub.classList.remove('hidden');

    this.subtitleTimeout = window.setTimeout(() => {
      sub.classList.add('hidden');
    }, durationMs);
  }

  // --- GAME OVER & VICTORY ---
  triggerGameOver(reason) {
    this.state = 'GAMEOVER';
    this.audio.playJumpscare();
    this.audio.setThreatLevel(1.0);
    this.vhsPass.uniforms.uGlitchIntensity.value = 1.0;

    document.exitPointerLock?.();

    // Populate Game Over screen stats
    const reasonElem = document.getElementById('death-reason-text');
    if (reasonElem) reasonElem.textContent = reason;

    const progress = Math.min(1.0, this.elapsedShiftTime / this.shiftDuration);
    const totalMinutes = progress * 360;
    const inGameHour = Math.floor(totalMinutes / 60).toString().padStart(2, '0');
    const inGameMin = Math.floor(totalMinutes % 60).toString().padStart(2, '0');

    const deathTimeElem = document.getElementById('death-time-stat');
    if (deathTimeElem) deathTimeElem.textContent = `${inGameHour}:${inGameMin}`;

    const deathClearedElem = document.getElementById('death-cleared-stat');
    if (deathClearedElem) deathClearedElem.textContent = this.anomaliesCleared.toString();

    // Show Terminal with Game Over View
    this.gameHud?.classList.add('hidden');
    this.showScreenView('screen-gameover');
    this.terminalContainer?.classList.remove('hidden');
  }

  triggerVictory() {
    this.state = 'VICTORY';
    document.exitPointerLock?.();

    this.room.setSunriseLighting();
    this.audio.playMorningVictory();
    this.audio.setThreatLevel(0);
    this.vhsPass.uniforms.uGlitchIntensity.value = 0;

    // Populate Victory Screen stats
    const anomStat = document.getElementById('victory-anomalies-stat');
    if (anomStat) anomStat.textContent = this.anomaliesCleared.toString();

    // Show Terminal with Victory View
    this.gameHud?.classList.add('hidden');
    this.showScreenView('screen-victory');
    this.terminalContainer?.classList.remove('hidden');
  }

  pause() {
    this.state = 'PAUSED';
    document.exitPointerLock?.();
    this.showScreenView('screen-pause');
    this.terminalContainer?.classList.remove('hidden');
  }

  resume() {
    this.state = 'PLAYING';
    this.terminalContainer?.classList.add('hidden');
    this.requestPointerLock();
  }

  // --- SCREEN VIEW MANAGER ---
  showScreenView(viewId) {
    const views = document.querySelectorAll('.terminal-screen-view');
    views.forEach(v => v.classList.add('hidden'));

    const target = document.getElementById(viewId);
    if (target) target.classList.remove('hidden');

    this.audio.playInteractionClick();
  }

  // --- 3D CONSOLE TILT ON MOUSE MOVE ---
  setup3DConsoleTilt() {
    window.addEventListener('mousemove', (e) => {
      if (!this.enable3DTilt || this.state === 'PLAYING' || !this.chassisElem) return;

      const cx = window.innerWidth / 2;
      const cy = window.innerHeight / 2;
      const rotY = ((e.clientX - cx) / cx) * 4.5;
      const rotX = -((e.clientY - cy) / cy) * 4.5;

      this.chassisElem.style.transform = `rotateX(${rotX.toFixed(2)}deg) rotateY(${rotY.toFixed(2)}deg)`;
    });

    // Live terminal clock update
    setInterval(() => {
      const now = new Date();
      const h = now.getHours().toString().padStart(2, '0');
      const m = now.getMinutes().toString().padStart(2, '0');
      const s = now.getSeconds().toString().padStart(2, '0');
      const clockElem = document.getElementById('menu-sys-time');
      if (clockElem) clockElem.textContent = `${h}:${m}:${s}`;
    }, 1000);
  }

  // --- UI EVENT LISTENERS ---
  setupUIEvents() {
    // 1. Menu Navigation Buttons
    document.getElementById('btn-start-shift')?.addEventListener('click', () => {
      this.startShift();
    });

    document.getElementById('btn-open-rules')?.addEventListener('click', () => {
      this.showScreenView('screen-rules');
    });

    document.getElementById('btn-open-lore')?.addEventListener('click', () => {
      this.showScreenView('screen-lore');
    });

    document.getElementById('btn-open-settings')?.addEventListener('click', () => {
      this.showScreenView('screen-settings');
    });

    // Back to main menu buttons
    document.querySelectorAll('.btn-back-menu').forEach(btn => {
      btn.addEventListener('click', () => {
        this.showScreenView('screen-main-menu');
      });
    });

    // Settings
    document.getElementById('btn-sound-toggle')?.addEventListener('click', (e) => {
      const isSoundOn = this.audio.toggleMute();
      e.target.textContent = `ЗВУК: ${isSoundOn ? 'ВКЛЮЧЕН' : 'ВЫКЛЮЧЕН'}`;
    });

    document.getElementById('btn-fullscreen-toggle')?.addEventListener('click', () => {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen?.();
      } else {
        document.exitFullscreen?.();
      }
    });

    document.getElementById('btn-3d-tilt-toggle')?.addEventListener('click', (e) => {
      this.enable3DTilt = !this.enable3DTilt;
      if (!this.enable3DTilt && this.chassisElem) {
        this.chassisElem.style.transform = 'none';
      }
      e.target.textContent = `3D НАКЛОН: ${this.enable3DTilt ? 'ВКЛ' : 'ВЫКЛ'}`;
    });

    // Pause Screen Buttons
    document.getElementById('btn-pause-resume')?.addEventListener('click', () => {
      this.resume();
    });
    document.getElementById('btn-pause-restart')?.addEventListener('click', () => {
      this.startShift();
    });

    // Game Over & Victory Restart Buttons
    document.getElementById('btn-gameover-restart')?.addEventListener('click', () => {
      this.startShift();
    });
    document.getElementById('btn-victory-restart')?.addEventListener('click', () => {
      this.startShift();
    });

    // Keyboard & PointerLock Controls
    window.addEventListener('keydown', (e) => {
      if (e.code === 'KeyE') {
        this.interact();
      }

      if (e.code === 'Escape') {
        if (this.state === 'PLAYING') {
          this.pause();
        } else if (this.state === 'PAUSED') {
          this.resume();
        }
      }
    });

    this.canvas.addEventListener('click', () => {
      if (this.state === 'PLAYING') {
        this.requestPointerLock();
      }
    });
  }

  // --- MOBILE ON-SCREEN CONTROLS ---
  setupMobileControls() {
    const joystickBase = document.getElementById('joystick-base');
    const joystickThumb = document.getElementById('joystick-thumb');
    const touchZone = document.getElementById('touch-joystick-zone');

    let touchId = null;
    let basePos = { x: 0, y: 0 };

    if (touchZone && joystickThumb && joystickBase) {
      touchZone.addEventListener('touchstart', (e) => {
        const touch = e.changedTouches[0];
        touchId = touch.identifier;
        const rect = joystickBase.getBoundingClientRect();
        basePos = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
      }, { passive: false });

      touchZone.addEventListener('touchmove', (e) => {
        e.preventDefault();
        for (let i = 0; i < e.changedTouches.length; i++) {
          const touch = e.changedTouches[i];
          if (touch.identifier === touchId) {
            const dx = touch.clientX - basePos.x;
            const dy = touch.clientY - basePos.y;
            const dist = Math.min(40, Math.hypot(dx, dy));
            const angle = Math.atan2(dy, dx);

            const thumbX = Math.cos(angle) * dist;
            const thumbY = Math.sin(angle) * dist;
            joystickThumb.style.transform = `translate(calc(-50% + ${thumbX}px), calc(-50% + ${thumbY}px))`;

            this.player.touchMove.set(thumbX / 40, -thumbY / 40);
          }
        }
      }, { passive: false });

      const onEnd = () => {
        touchId = null;
        joystickThumb.style.transform = 'translate(-50%, -50%)';
        this.player.touchMove.set(0, 0);
      };

      touchZone.addEventListener('touchend', onEnd);
      touchZone.addEventListener('touchcancel', onEnd);
    }

    let lookTouchId = null;
    let lastLookPos = { x: 0, y: 0 };

    window.addEventListener('touchstart', (e) => {
      for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        if (touch.clientX > window.innerWidth / 2 && lookTouchId === null) {
          lookTouchId = touch.identifier;
          lastLookPos = { x: touch.clientX, y: touch.clientY };
        }
      }
    });

    window.addEventListener('touchmove', (e) => {
      if (this.state !== 'PLAYING') return;
      for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        if (touch.identifier === lookTouchId) {
          const dx = touch.clientX - lastLookPos.x;
          const dy = touch.clientY - lastLookPos.y;
          lastLookPos = { x: touch.clientX, y: touch.clientY };

          this.player.yaw -= dx * 0.004;
          this.player.pitch -= dy * 0.004;
          this.player.pitch = Math.max(-Math.PI * 0.42, Math.min(Math.PI * 0.42, this.player.pitch));
        }
      }
    });

    const onLookEnd = (e) => {
      for (let i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === lookTouchId) {
          lookTouchId = null;
        }
      }
    };
    window.addEventListener('touchend', onLookEnd);
    window.addEventListener('touchcancel', onLookEnd);

    document.getElementById('btn-interact')?.addEventListener('click', () => this.interact());
  }

  onResize() {
    const width = window.innerWidth;
    const height = window.innerHeight;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();

    this.renderer.setSize(width, height);
    this.composer.setSize(width, height);
    this.vhsPass.uniforms.uResolution.value.set(width, height);
  }
}
