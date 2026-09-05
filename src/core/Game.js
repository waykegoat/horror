import * as THREE from 'three';
import { EffectComposer } from '../postprocessing/EffectComposer.js';
import { RenderPass } from '../postprocessing/RenderPass.js';
import { ShaderPass } from '../postprocessing/ShaderPass.js';

import { VHSShader } from '../shaders/VHSShader.js';
import { HorrorAudio } from '../audio/HorrorAudio.js';
import { RoomScene } from '../world/RoomScene.js';
import { RoomPlayer } from '../entities/RoomPlayer.js';
import { Tablet3D } from '../entities/Tablet3D.js';

export class Game {
  constructor() {
    this.container = document.getElementById('game-container');
    this.canvas = document.getElementById('webgl-canvas');

    // 1. Core Three.js Setup (Realistic PBR, soft shadows, ACES filmic tone mapping)
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x0e1319, 0.012);

    this.camera = new THREE.PerspectiveCamera(72, window.innerWidth / window.innerHeight, 0.05, 40);
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
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.12;

    // 2. Post-Processing Pipeline (Curved CRT Monitor look)
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

    // 5. Game State & Hardcore Shift Mechanics (00:00 -> 06:00)
    this.state = 'MENU'; // 'MENU', 'PLAYING', 'PAUSED', 'GAMEOVER', 'VICTORY'
    this.shiftDuration = 240; // 240 seconds total
    this.elapsedShiftTime = 0;
    this.anomaliesCleared = 0;
    this.currentThreat = 0; // 0.0 to 1.0
    this.isDying = false;

    // Anomaly Tracking Timers (seconds active)
    this.activeAnomalies = {
      tv: 0,
      window: 0,
      door: 0,
      fuse: 0
    };

    this.nextAnomalyCountdown = 10.0; // Rapid first event
    this.doorKnockCooldown = 0;

    // UI & 3D Tilt Elements
    this.terminalContainer = document.getElementById('crt-terminal-container');
    this.chassisElem = document.getElementById('crt-chassis');
    this.gameHud = document.getElementById('game-hud');
    this.enable3DTilt = true;

    this.subtitleTimeout = null;

    this.initWorld();
    this.setupSpatial3DMarkers();
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

    // Diegetic 3D In-Hand Tactical Terminal
    this.tablet = new Tablet3D(this.camera);
    this.player.onMouseMove = (mx, my) => {
      this.tablet.addMouseSway(mx, my);
    };
  }

  // --- SPATIAL 3D WORLD MARKERS OVER INTERACTIVE OBJECTS ---
  setupSpatial3DMarkers() {
    this.spatialMarkers = {};

    const createMarker = (x, y, z, id) => {
      const group = new THREE.Group();
      group.position.set(x, y, z);

      // Inner glowing ring
      const ringGeo = new THREE.RingGeometry(0.08, 0.12, 24);
      const ringMat = new THREE.MeshBasicMaterial({
        color: 0x00ff77,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.8
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      group.add(ring);

      // Outer alert diamond
      const diaGeo = new THREE.RingGeometry(0.15, 0.18, 4);
      const diaMat = new THREE.MeshBasicMaterial({
        color: 0x00ff77,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.6
      });
      const diamond = new THREE.Mesh(diaGeo, diaMat);
      diamond.rotation.z = Math.PI / 4;
      group.add(diamond);

      this.scene.add(group);
      return { group, ring, diamond, ringMat, diaMat };
    };

    this.spatialMarkers.tv = createMarker(0, 1.85, 2.7, 'tv');
    this.spatialMarkers.window = createMarker(-2.9, 2.25, 0, 'window');
    this.spatialMarkers.door = createMarker(0, 2.3, -2.85, 'door');
    this.spatialMarkers.fuse = createMarker(2.9, 2.1, 1.5, 'fuse');
  }

  updateSpatialMarkers(time) {
    const camPos = this.camera.position;

    for (const key in this.spatialMarkers) {
      const m = this.spatialMarkers[key];
      // Face the player camera
      m.group.lookAt(camPos);

      // Check if this station is in alert
      let isAlert = false;
      if (key === 'tv') isAlert = this.room.isTVOn;
      else if (key === 'window') isAlert = this.room.hasMonsterAtWindow && !this.room.isCurtainClosed;
      else if (key === 'door') isAlert = this.doorKnockCooldown > 0 && !this.room.isDoorLatched;
      else if (key === 'fuse') isAlert = this.room.isFuseSparking;

      const color = isAlert ? 0xff2222 : 0x00ff77;
      m.ringMat.color.setHex(color);
      m.diaMat.color.setHex(color);

      // Pulse animation
      const pulse = isAlert ? Math.sin(time * 12.0) * 0.4 + 1.2 : Math.sin(time * 3.0) * 0.15 + 1.0;
      m.group.scale.set(pulse, pulse, pulse);

      // Distance fading
      const dist = m.group.position.distanceTo(camPos);
      const alpha = THREE.MathUtils.clamp(1.0 - (dist - 1.5) / 3.0, 0.2, 0.9);
      m.ringMat.opacity = isAlert ? 0.95 : alpha * 0.6;
      m.diaMat.opacity = isAlert ? 0.9 : alpha * 0.4;
    }
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
    this.nextAnomalyCountdown = 10.0;
    this.isDying = false;

    // Reset room
    this.room.setTVState(false);
    this.room.setWindowMonster(false);
    this.room.isDoorLatched = false;
    this.room.doorBoltMesh.position.x = -0.1;
    this.room.setFuseState(false);
    this.room.isBlackout = false;
    this.activeAnomalies = { tv: 0, window: 0, door: 0, fuse: 0 };

    this.clock.start();

    this.terminalContainer?.classList.add('hidden');
    this.gameHud?.classList.remove('hidden');

    this.requestPointerLock();
    this.showSubtitle('СМЕНА НАЧАЛАСЬ [00:00]. Следите за 3D-планшетом [TAB/Q] и продержитесь до 06:00!', 5000);

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
      this.audio.updateListener(this.camera);

      // Prepare live game telemetry packet
      const progress = Math.min(1.0, this.elapsedShiftTime / this.shiftDuration);
      const totalMinutes = progress * 360;
      const inGameHour = Math.floor(totalMinutes / 60).toString().padStart(2, '0');
      const inGameMin = Math.floor(totalMinutes % 60).toString().padStart(2, '0');

      const gameData = {
        clock: `${inGameHour}:${inGameMin}`,
        progress: progress,
        threat: this.currentThreat,
        anomalies: {
          tv: this.room.isTVOn,
          window: this.room.hasMonsterAtWindow && !this.room.isCurtainClosed,
          door: this.doorKnockCooldown > 0 && !this.room.isDoorLatched,
          fuse: this.room.isFuseSparking
        }
      };

      // 3D Room & World updates
      this.room.update(delta, time, gameData);

      // 3D Diegetic Tactical Tablet update
      this.tablet.update(delta, time, gameData);

      // 3D In-World Spatial Markers
      this.updateSpatialMarkers(time);

      // Game Logic & Difficulty Progression
      this.updateShiftProgression(delta);
      this.updateAnomalyDirector(delta);
      this.updateInteractions();
      this.updateAtmosphereAndVignette(delta, time);
      this.updateHUD();
    }

    this.composer.render();
  }

  // --- SHIFT PROGRESSION ---
  updateShiftProgression(delta) {
    this.elapsedShiftTime += delta;

    const progress = Math.min(1.0, this.elapsedShiftTime / this.shiftDuration);
    const totalMinutes = progress * 360;
    const inGameHour = Math.floor(totalMinutes / 60);
    const inGameMin = Math.floor(totalMinutes % 60);

    // Update 3D Wall Clock
    this.room.updateClock(inGameHour, inGameMin);

    // Update 2D HUD Clock
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

  // --- HARDCORE ANOMALY DIRECTOR (High suspense, multi-anomalies, blackout) ---
  updateAnomalyDirector(delta) {
    if (this.isDying) return;

    this.nextAnomalyCountdown -= delta;

    const progress = this.elapsedShiftTime / this.shiftDuration;
    // Interval shortens from 12s down to 6s
    const intervalBase = THREE.MathUtils.lerp(13.0, 6.0, progress);

    // Max concurrent anomalies scales from 1 up to 3!
    let maxConcurrent = 1;
    if (progress > 0.3) maxConcurrent = 2;
    if (progress > 0.65) maxConcurrent = 3;

    let activeCount = 0;
    if (this.room.isTVOn) activeCount++;
    if (this.room.hasMonsterAtWindow && !this.room.isCurtainClosed) activeCount++;
    if (this.doorKnockCooldown > 0 && !this.room.isDoorLatched) activeCount++;
    if (this.room.isFuseSparking) activeCount++;

    if (this.nextAnomalyCountdown <= 0 && activeCount < maxConcurrent) {
      this.triggerRandomAnomaly();
      this.nextAnomalyCountdown = intervalBase + Math.random() * 4.0;
    }

    // 1. TV Anomaly Timer (Fatal at 10.0s)
    if (this.room.isTVOn) {
      this.activeAnomalies.tv += delta;
      if (this.activeAnomalies.tv > 10.0) {
        this.triggerJumpscareGameOver('Сущность пробила стекло кинескопа телевизора "Рубин"...', new THREE.Vector3(0, 1.1, 2.8));
        return;
      }
    } else {
      this.activeAnomalies.tv = 0;
    }

    // 2. Window Anomaly Timer (Fatal at 9.0s)
    if (this.room.hasMonsterAtWindow === true) {
      if (!this.room.isCurtainClosed) {
        this.activeAnomalies.window += delta;
        if (this.activeAnomalies.window > 9.0) {
          this.audio.playGlassShatter();
          this.triggerJumpscareGameOver('Сущность за окном разбила стекло и утащила оператора в темноту...', new THREE.Vector3(-2.8, 1.6, 0));
          return;
        }
      } else {
        this.activeAnomalies.window = 0;
      }
    } else {
      this.activeAnomalies.window = 0;
    }

    // 3. Door Anomaly Timer (Fatal at 8.5s)
    if (this.doorKnockCooldown > 0) {
      this.doorKnockCooldown -= delta;
      if (!this.room.isDoorLatched) {
        this.activeAnomalies.door += delta;
        if (this.activeAnomalies.door > 8.5) {
          this.audio.playMetalGateSlam();
          this.triggerJumpscareGameOver('Дверь сорвало с петель. Незапертый засов не остановил монстра...', new THREE.Vector3(0, 1.3, -3.0));
          return;
        }
      } else {
        this.activeAnomalies.door = 0;
      }
    } else {
      this.activeAnomalies.door = 0;
    }

    // 4. Fuse Box Anomaly Timer (Blackout at 4.0s, Fatal at 11.5s)
    if (this.room.isFuseSparking) {
      this.activeAnomalies.fuse += delta;

      // Blackout triggered!
      if (this.activeAnomalies.fuse > 4.0 && !this.room.isBlackout) {
        this.room.isBlackout = true;
        this.audio.playBlackoutPowerDown();
        this.player.triggerCameraShake(0.6);
        this.showSubtitle('🚨 БЛЭКАУТ! Свет полностью погас! Срочно восстановите щиток [E]!', 4000);
      }

      if (this.activeAnomalies.fuse > 11.5) {
        this.triggerJumpscareGameOver('Полный отказ электросети. Во тьме сущность нанесла смертельный удар...', new THREE.Vector3(2.6, 1.6, 1.5));
        return;
      }
    } else {
      this.activeAnomalies.fuse = 0;
      this.room.isBlackout = false;
    }

    // --- Dynamic Threat Calculation ---
    let threatDelta = -0.05 * delta; // slow passive decay when calm

    if (activeCount > 0) {
      // +10% threat per active anomaly per second
      let rate = activeCount * 0.12;
      // In blackout, threat escalates 2.5x faster!
      if (this.room.isBlackout) rate *= 2.5;

      threatDelta = rate * delta;
    }

    this.currentThreat = THREE.MathUtils.clamp(this.currentThreat + threatDelta, 0.0, 1.0);
    this.audio.setThreatLevel(this.currentThreat);

    // Fatal Threat Overflow (100% -> sudden death)
    if (this.currentThreat >= 1.0) {
      this.triggerJumpscareGameOver('Критический уровень паранормальной активности. Рассудок сломлен...', null);
      return;
    }

    // High Threat warning siren & camera pulse
    if (this.currentThreat > 0.55 && Math.random() < delta * 0.9) {
      this.audio.playWarningAlert();
      this.player.triggerCameraShake(0.15);
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
        this.player.triggerCameraShake(0.25);
        this.showSubtitle('⚠ Телевизор зашипел! Заглушите его клавишей [E]!', 3500);
        break;

      case 'window':
        this.room.setWindowMonster(true);
        this.audio.playWindowScratch();
        this.player.triggerCameraShake(0.35);
        this.showSubtitle('⚠ Тварь за окном скребет стекло! Задерните шторы [E]!', 3500);
        break;

      case 'door':
        this.doorKnockCooldown = 14.0;
        this.room.isDoorLatched = false;
        this.room.doorBoltMesh.position.x = -0.1;
        this.audio.playDoorBang();
        this.player.triggerCameraShake(0.5);
        this.showSubtitle('⚠ В дверь яростно ломятся! Закройте засов [E]!', 3500);
        break;

      case 'fuse':
        this.room.setFuseState(true);
        this.audio.playSparkZap();
        this.player.triggerCameraShake(0.3);
        this.showSubtitle('⚠ Щиток искрит! Напряжение падает! Перезапустите автомат [E]!', 3500);
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
    if (this.state !== 'PLAYING' || !this.currentInteractive || this.isDying) return;

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
        this.room.isBlackout = false;
        this.anomaliesCleared++;
        this.showSubtitle('Щиток перезапущен. Электросеть стабилизирована.', 3000);
      }
    }

    this.updateHUDChecklist();
  }

  // --- HUD UPDATES ---
  updateHUD() {
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
    this.vhsPass.uniforms.uGlitchIntensity.value = this.currentThreat * 0.75;

    const vignette = document.getElementById('danger-vignette');
    if (vignette) {
      if (this.currentThreat > 0.35 || this.room.isBlackout) {
        const pulse = Math.sin(time * 8.0) * 0.5 + 0.5;
        const base = this.room.isBlackout ? 0.4 : 0;
        vignette.style.opacity = Math.min(1.0, base + (this.currentThreat * 0.7 * pulse)).toFixed(2);
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

  // --- HARDCORE JUMPSCARE & GAME OVER ---
  triggerJumpscareGameOver(reason, targetPos) {
    if (this.isDying) return;
    this.isDying = true;

    // 1. Violent camera jolt and scream audio
    this.player.triggerCameraShake(1.0);
    this.audio.playJumpscare();
    this.audio.setThreatLevel(1.0);
    this.vhsPass.uniforms.uGlitchIntensity.value = 1.0;

    // Flash danger vignette blood red
    const vignette = document.getElementById('danger-vignette');
    if (vignette) {
      vignette.style.opacity = '1.0';
      vignette.style.background = 'radial-gradient(circle, rgba(255,0,0,0.4) 0%, rgba(180,0,0,0.9) 80%, black 100%)';
    }

    // Snap camera view toward the attacker if targetPos exists
    if (targetPos) {
      const dir = targetPos.clone().sub(this.camera.position).normalize();
      this.player.yaw = Math.atan2(-dir.x, -dir.z);
      this.player.pitch = Math.asin(dir.y);
    }

    // 2. Transition to 3D Game Over screen after jumpscare impact
    setTimeout(() => {
      this.state = 'GAMEOVER';
      document.exitPointerLock?.();

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

      this.gameHud?.classList.add('hidden');
      this.showScreenView('screen-gameover');
      this.terminalContainer?.classList.remove('hidden');

      if (vignette) {
        vignette.style.opacity = '0';
        vignette.style.background = '';
      }
    }, 1300);
  }

  triggerVictory() {
    this.state = 'VICTORY';
    document.exitPointerLock?.();

    this.room.setSunriseLighting();
    this.audio.playMorningVictory();
    this.audio.setThreatLevel(0);
    this.vhsPass.uniforms.uGlitchIntensity.value = 0;

    const anomStat = document.getElementById('victory-anomalies-stat');
    if (anomStat) anomStat.textContent = this.anomaliesCleared.toString();

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

  showScreenView(viewId) {
    const views = document.querySelectorAll('.terminal-screen-view');
    views.forEach(v => v.classList.add('hidden'));

    const target = document.getElementById(viewId);
    if (target) target.classList.remove('hidden');

    this.audio.playInteractionClick();
  }

  setup3DConsoleTilt() {
    window.addEventListener('mousemove', (e) => {
      if (!this.enable3DTilt || this.state === 'PLAYING' || !this.chassisElem) return;

      const cx = window.innerWidth / 2;
      const cy = window.innerHeight / 2;
      const rotY = ((e.clientX - cx) / cx) * 4.5;
      const rotX = -((e.clientY - cy) / cy) * 4.5;

      this.chassisElem.style.transform = `rotateX(${rotX.toFixed(2)}deg) rotateY(${rotY.toFixed(2)}deg)`;
    });

    setInterval(() => {
      const now = new Date();
      const h = now.getHours().toString().padStart(2, '0');
      const m = now.getMinutes().toString().padStart(2, '0');
      const s = now.getSeconds().toString().padStart(2, '0');
      const clockElem = document.getElementById('menu-sys-time');
      if (clockElem) clockElem.textContent = `${h}:${m}:${s}`;
    }, 1000);
  }

  setupUIEvents() {
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

    document.querySelectorAll('.btn-back-menu').forEach(btn => {
      btn.addEventListener('click', () => {
        this.showScreenView('screen-main-menu');
      });
    });

    const bindClick = (id, handler) => {
      document.getElementById(id)?.addEventListener('click', handler);
    };

    bindClick('btn-resume', () => this.resume());
    bindClick('btn-pause-resume', () => this.resume());
    bindClick('btn-pause-restart', () => this.startShift());

    bindClick('btn-restart-death', () => this.startShift());
    bindClick('btn-gameover-restart', () => this.startShift());

    bindClick('btn-restart-victory', () => this.startShift());
    bindClick('btn-victory-restart', () => this.startShift());

    bindClick('btn-menu-from-death', () => {
      this.state = 'MENU';
      this.showScreenView('screen-main-menu');
    });

    bindClick('btn-menu-from-victory', () => {
      this.state = 'MENU';
      this.showScreenView('screen-main-menu');
    });

    bindClick('btn-menu-from-pause', () => {
      this.state = 'MENU';
      this.showScreenView('screen-main-menu');
    });

    // Mobile interact button
    document.getElementById('btn-interact')?.addEventListener('click', () => {
      this.interact();
    });

    // Interaction Key: [E] and Pause: [Escape]
    window.addEventListener('keydown', (e) => {
      if (e.code === 'KeyE') {
        this.interact();
      } else if (e.code === 'Escape') {
        if (this.state === 'PLAYING') {
          this.pause();
        } else if (this.state === 'PAUSED') {
          this.resume();
        }
      }
    });

    // Re-lock mouse on canvas click
    this.canvas.addEventListener('click', () => {
      if (this.state === 'PLAYING' && !document.pointerLockElement) {
        this.requestPointerLock();
      }
    });
  }

  setupMobileControls() {
    const mobileUI = document.getElementById('mobile-controls');
    if (!('ontouchstart' in window) && window.innerWidth > 900) {
      mobileUI?.classList.add('hidden');
      return;
    }

    mobileUI?.classList.remove('hidden');

    const touchArea = document.getElementById('touch-look-area');
    let lastTouchX = 0;
    let lastTouchY = 0;

    touchArea?.addEventListener('touchstart', (e) => {
      if (e.touches.length > 0) {
        lastTouchX = e.touches[0].clientX;
        lastTouchY = e.touches[0].clientY;
      }
    }, { passive: true });

    touchArea?.addEventListener('touchmove', (e) => {
      if (e.touches.length > 0) {
        const touch = e.touches[0];
        const dx = touch.clientX - lastTouchX;
        const dy = touch.clientY - lastTouchY;
        lastTouchX = touch.clientX;
        lastTouchY = touch.clientY;

        this.player.yaw -= dx * 0.005;
        this.player.pitch -= dy * 0.005;
        this.player.pitch = Math.max(-Math.PI * 0.42, Math.min(Math.PI * 0.42, this.player.pitch));
      }
    }, { passive: true });

    document.getElementById('btn-touch-interact')?.addEventListener('touchstart', (e) => {
      e.preventDefault();
      this.interact();
    });

    document.getElementById('btn-touch-tablet')?.addEventListener('touchstart', (e) => {
      e.preventDefault();
      if (this.tablet) {
        this.tablet.isInspecting = !this.tablet.isInspecting;
      }
    });
  }

  onResize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();

    this.renderer.setSize(w, h);
    this.composer.setSize(w, h);
    this.vhsPass.uniforms.uResolution.value.set(w, h);
  }
}
