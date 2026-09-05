import * as THREE from 'three';

/**
 * Diegetic 3D In-Hand Tactical Terminal / Tablet "ДОЗОР-4"
 * Renders in-game HUD as a real physical 3D device attached to the camera,
 * complete with spring sway lag, dynamic CanvasTexture, ECG heartbeat, and telemetry.
 */
export class Tablet3D {
  constructor(camera) {
    this.camera = camera;
    this.group = new THREE.Group();

    // Tablet state
    this.isInspecting = false;
    this.sway = new THREE.Vector2(0, 0);
    this.swayTarget = new THREE.Vector2(0, 0);

    // Canvas Texture for 3D Screen (512x512)
    this.canvas = document.createElement('canvas');
    this.canvas.width = 512;
    this.canvas.height = 512;
    this.ctx = this.canvas.getContext('2d');
    this.texture = new THREE.CanvasTexture(this.canvas);
    this.texture.minFilter = THREE.LinearFilter;
    this.texture.magFilter = THREE.LinearFilter;

    // ECG pulse state
    this.ecgPoints = [];
    for (let i = 0; i < 60; i++) {
      this.ecgPoints.push(0);
    }
    this.ecgTimer = 0;

    // Base transform relative to camera
    // Normal held position (bottom right)
    this.defaultPos = new THREE.Vector3(0.38, -0.32, -0.65);
    this.defaultRot = new THREE.Euler(-0.25, -0.28, 0.08);

    // Inspect position (raised in front of camera)
    this.inspectPos = new THREE.Vector3(0.0, -0.06, -0.42);
    this.inspectRot = new THREE.Euler(-0.08, 0.0, 0.0);

    this.currentPos = this.defaultPos.clone();
    this.currentRot = this.defaultRot.clone();

    this.onToggleInspect = null;

    this.build3DModel();
    this.camera.add(this.group);

    // Key toggle listener: TAB or Q to inspect tablet
    window.addEventListener('keydown', (e) => {
      if (e.code === 'Tab' || e.code === 'KeyQ') {
        e.preventDefault();
        this.toggleInspect();
      }
    });
  }

  toggleInspect() {
    this.isInspecting = !this.isInspecting;
    if (this.onToggleInspect) {
      this.onToggleInspect(this.isInspecting);
    }
    return this.isInspecting;
  }

  build3DModel() {
    // 1. Tablet Main Chassis (Heavy ruggedized polymer body)
    const bodyGeo = new THREE.BoxGeometry(0.34, 0.28, 0.035);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0x1f2427,
      roughness: 0.65,
      metalness: 0.25
    });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.castShadow = true;
    this.group.add(body);

    // 2. Rubber Side Grips (Left & Right)
    const gripMat = new THREE.MeshStandardMaterial({
      color: 0x121415,
      roughness: 0.95
    });
    const gripL = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.29, 0.04), gripMat);
    gripL.position.x = -0.175;
    this.group.add(gripL);

    const gripR = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.29, 0.04), gripMat);
    gripR.position.x = 0.175;
    this.group.add(gripR);

    // 3. Antenna Stub on top
    const antMat = new THREE.MeshStandardMaterial({ color: 0x222, metalness: 0.8 });
    const ant = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.07, 8), antMat);
    ant.position.set(-0.13, 0.17, 0);
    this.group.add(ant);

    // 4. Hardware Power & Dial knobs at bottom right
    const dialMat = new THREE.MeshStandardMaterial({ color: 0x8899aa, metalness: 0.7, roughness: 0.3 });
    const dial1 = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.015, 12), dialMat);
    dial1.rotation.x = Math.PI / 2;
    dial1.position.set(0.12, -0.115, 0.02);
    this.group.add(dial1);

    // 5. Hardware Status LEDs
    const ledGreenMat = new THREE.MeshBasicMaterial({ color: 0x00ff66 });
    this.statusLED = new THREE.Mesh(new THREE.SphereGeometry(0.006, 8, 8), ledGreenMat);
    this.statusLED.position.set(0.14, 0.12, 0.02);
    this.group.add(this.statusLED);

    // 6. Glowing 3D Screen Surface (CanvasTexture)
    const screenGeo = new THREE.PlaneGeometry(0.27, 0.21);
    const screenMat = new THREE.MeshBasicMaterial({
      map: this.texture,
      transparent: true
    });
    this.screenMesh = new THREE.Mesh(screenGeo, screenMat);
    this.screenMesh.position.set(-0.015, 0.005, 0.019);
    this.group.add(this.screenMesh);

    // Initial position
    this.group.position.copy(this.defaultPos);
    this.group.rotation.copy(this.defaultRot);
  }

  addMouseSway(deltaX, deltaY) {
    this.swayTarget.x = THREE.MathUtils.clamp(this.swayTarget.x - deltaX * 0.0003, -0.06, 0.06);
    this.swayTarget.y = THREE.MathUtils.clamp(this.swayTarget.y + deltaY * 0.0003, -0.06, 0.06);
  }

  update(delta, time, gameData) {
    // 1. Smooth Spring Sway interpolation
    this.sway.x = THREE.MathUtils.lerp(this.sway.x, this.swayTarget.x, delta * 8.0);
    this.sway.y = THREE.MathUtils.lerp(this.sway.y, this.swayTarget.y, delta * 8.0);
    this.swayTarget.x = THREE.MathUtils.lerp(this.swayTarget.x, 0, delta * 6.0);
    this.swayTarget.y = THREE.MathUtils.lerp(this.swayTarget.y, 0, delta * 6.0);

    // 2. Smooth Inspect Lerp (Raised vs Default)
    const targetP = this.isInspecting ? this.inspectPos : this.defaultPos;
    const targetR = this.isInspecting ? this.inspectRot : this.defaultRot;

    this.currentPos.lerp(targetP, delta * 7.0);
    this.currentRot.x = THREE.MathUtils.lerp(this.currentRot.x, targetR.x, delta * 7.0);
    this.currentRot.y = THREE.MathUtils.lerp(this.currentRot.y, targetR.y, delta * 7.0);
    this.currentRot.z = THREE.MathUtils.lerp(this.currentRot.z, targetR.z, delta * 7.0);

    // Natural subtle breathing idle bobbing
    const breathY = Math.sin(time * 2.2) * 0.003;
    const breathRot = Math.cos(time * 1.8) * 0.004;

    this.group.position.set(
      this.currentPos.x + this.sway.x,
      this.currentPos.y + this.sway.y + breathY,
      this.currentPos.z
    );

    this.group.rotation.set(
      this.currentRot.x - this.sway.y * 1.2,
      this.currentRot.y + this.sway.x * 1.5,
      this.currentRot.z + breathRot
    );

    // 3. Update Status LED color based on Threat Level
    if (this.statusLED) {
      if (gameData.threat > 0.6) {
        // Rapid flashing red
        const flash = Math.sin(time * 20.0) > 0;
        this.statusLED.material.color.setHex(flash ? 0xff0000 : 0x440000);
      } else if (gameData.threat > 0.3) {
        this.statusLED.material.color.setHex(0xffaa00);
      } else {
        this.statusLED.material.color.setHex(0x00ff66);
      }
    }

    // 4. Update ECG Heartbeat Line
    const bpmSpeed = 2.0 + gameData.threat * 4.0; // 60 BPM to 180 BPM
    this.ecgTimer += delta * bpmSpeed;

    let ecgSample = 0;
    const cycle = this.ecgTimer % 1.0;
    if (cycle > 0.15 && cycle < 0.22) {
      ecgSample = 1.0; // QRS spike
    } else if (cycle > 0.22 && cycle < 0.28) {
      ecgSample = -0.4;
    } else if (cycle > 0.45 && cycle < 0.58) {
      ecgSample = 0.25; // T wave
    }

    this.ecgPoints.shift();
    this.ecgPoints.push(ecgSample + (Math.random() - 0.5) * 0.08);

    // 5. Draw Live Telemetry Screen
    this.renderScreen(gameData, time);
    this.texture.needsUpdate = true;
  }

  renderScreen(data, time) {
    const ctx = this.ctx;
    const w = 512;
    const h = 512;

    // Dark Phosphor Glass Background
    ctx.fillStyle = '#060d09';
    ctx.fillRect(0, 0, w, h);

    // CRT Scanlines
    ctx.fillStyle = 'rgba(0, 20, 10, 0.4)';
    for (let y = 0; y < h; y += 4) {
      ctx.fillRect(0, y, w, 2);
    }

    // Top Header Bar
    ctx.fillStyle = '#0e2316';
    ctx.fillRect(0, 0, w, 52);

    // Blinking REC Indicator
    const blink = Math.sin(time * 6.0) > 0;
    ctx.fillStyle = blink ? '#ff2222' : '#551111';
    ctx.beginPath();
    ctx.arc(26, 26, 8, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#00ff77';
    ctx.font = 'bold 18px monospace';
    ctx.textAlign = 'left';
    ctx.fillText('ДОЗОР-4 // ПОСТ 104', 44, 33);

    // Battery meter in header
    const battW = 34;
    const battH = 16;
    const bx = w - 160;
    const by = 18;
    ctx.strokeStyle = '#00aa55';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(bx, by, battW, battH);
    ctx.fillStyle = '#00aa55';
    ctx.fillRect(bx + battW, by + 4, 3, 8); // nipple
    ctx.fillStyle = '#00ff77';
    ctx.fillRect(bx + 2, by + 2, (battW - 4) * 0.82, battH - 4);

    ctx.fillStyle = '#88c999';
    ctx.font = '12px monospace';
    ctx.textAlign = 'right';
    ctx.fillText('12.4V', w - 16, 33);

    // Shift Clock 00:00 -> 06:00
    ctx.fillStyle = '#102619';
    ctx.fillRect(20, 68, w - 40, 72);
    ctx.strokeStyle = '#00aa55';
    ctx.lineWidth = 2;
    ctx.strokeRect(20, 68, w - 40, 72);

    ctx.fillStyle = '#99ccaa';
    ctx.font = '14px monospace';
    ctx.textAlign = 'left';
    ctx.fillText('ВРЕМЯ СМЕНЫ:', 34, 90);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 36px monospace';
    ctx.fillText(`${data.clock} `, 34, 126);

    ctx.fillStyle = '#558866';
    ctx.font = '22px monospace';
    ctx.fillText('/ 06:00', 170, 124);

    // Shift Progress Bar
    const progW = 160;
    ctx.fillStyle = '#0a170f';
    ctx.fillRect(w - 190, 84, progW, 16);
    ctx.fillStyle = '#00ff77';
    ctx.fillRect(w - 190, 84, progW * data.progress, 16);
    ctx.strokeStyle = '#008844';
    ctx.strokeRect(w - 190, 84, progW, 16);

    // Threat Level Barometer
    const threatPct = Math.round(data.threat * 100);
    const threatColor = data.threat > 0.6 ? '#ff2222' : (data.threat > 0.35 ? '#ffaa00' : '#00ff77');

    ctx.fillStyle = '#102619';
    ctx.fillRect(20, 154, w - 40, 66);
    ctx.strokeStyle = threatColor;
    ctx.lineWidth = 2;
    ctx.strokeRect(20, 154, w - 40, 66);

    ctx.fillStyle = threatColor;
    ctx.font = 'bold 16px monospace';
    ctx.fillText(`УРОВЕНЬ УГРОЗЫ: [${threatPct}%]`, 34, 178);

    // 10 Threat LED segments
    const segCount = 10;
    const segW = 41;
    const litSegs = Math.round(data.threat * segCount);

    for (let s = 0; s < segCount; s++) {
      const sx = 34 + s * (segW + 5);
      const sy = 188;
      const isLit = s < litSegs;

      if (isLit) {
        if (s < 4) ctx.fillStyle = '#00ff77';
        else if (s < 7) ctx.fillStyle = '#ffbb00';
        else ctx.fillStyle = '#ff2222';
      } else {
        ctx.fillStyle = '#09150d';
      }

      ctx.fillRect(sx, sy, segW, 20);
      ctx.strokeStyle = '#052b14';
      ctx.strokeRect(sx, sy, segW, 20);
    }

    // 4 Sector Sensors Checklist Grid (2x2)
    const sensors = [
      { name: '📺 ТЕЛЕВИЗОР', alert: data.anomalies.tv, okText: 'ВЫКЛ', alertText: 'СТАТИКА!' },
      { name: '🪟 ОКНО В САД', alert: data.anomalies.window, okText: 'ЧИСТО', alertText: 'ДВИЖЕНИЕ!' },
      { name: '🚪 ВХОД. ДВЕРЬ', alert: data.anomalies.door, okText: 'ЗАСОВ', alertText: 'УДАРЫ!' },
      { name: '⚡ ЭЛЕКТРОСЕТЬ', alert: data.anomalies.fuse, okText: '220V ОК', alertText: 'СБОЙ СЕТИ!' }
    ];

    const startGridY = 236;
    sensors.forEach((s, idx) => {
      const col = idx % 2;
      const row = Math.floor(idx / 2);
      const bx = 20 + col * 242;
      const by = startGridY + row * 82;
      const bw = 230;
      const bh = 72;

      ctx.fillStyle = s.alert ? '#260a0a' : '#0c1a11';
      ctx.fillRect(bx, by, bw, bh);
      ctx.strokeStyle = s.alert ? '#ff2222' : '#00aa55';
      ctx.lineWidth = s.alert ? 2 : 1;
      ctx.strokeRect(bx, by, bw, bh);

      // Sensor Name
      ctx.fillStyle = '#c0d4c6';
      ctx.font = 'bold 15px monospace';
      ctx.fillText(s.name, bx + 12, by + 26);

      // Status Badge
      const badgeText = s.alert ? `⚠ ${s.alertText}` : `● ${s.okText}`;
      ctx.fillStyle = s.alert ? '#ff3333' : '#00ff77';
      ctx.font = 'bold 16px monospace';
      ctx.fillText(badgeText, bx + 12, by + 54);
    });

    // Bottom ECG Heart Rate Monitor & EMF Detector
    ctx.fillStyle = '#06130b';
    ctx.fillRect(20, 412, w - 40, 80);
    ctx.strokeStyle = '#00552b';
    ctx.lineWidth = 1;
    ctx.strokeRect(20, 412, w - 40, 80);

    ctx.fillStyle = '#77aa88';
    ctx.font = '13px monospace';
    ctx.fillText('ПУЛЬС ОПЕРАТОРА (ЭКГ):', 34, 432);

    const bpm = Math.round(65 + data.threat * 115);
    ctx.fillStyle = data.threat > 0.6 ? '#ff3333' : '#00ff77';
    ctx.font = 'bold 16px monospace';
    ctx.textAlign = 'right';
    ctx.fillText(`${bpm} BPM`, w - 34, 432);
    ctx.textAlign = 'left';

    // Draw ECG Curve
    ctx.strokeStyle = data.threat > 0.6 ? '#ff2222' : '#00ff88';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    const len = this.ecgPoints.length;
    const step = (w - 68) / len;

    for (let i = 0; i < len; i++) {
      const ex = 34 + i * step;
      const ey = 464 - this.ecgPoints[i] * 24;
      if (i === 0) ctx.moveTo(ex, ey);
      else ctx.lineTo(ex, ey);
    }
    ctx.stroke();

    // Physical Glass Surface Scratches & Micro-Glints
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(35, 110);
    ctx.lineTo(140, 195);
    ctx.moveTo(380, 240);
    ctx.lineTo(470, 310);
    ctx.moveTo(210, 380);
    ctx.lineTo(260, 430);
    ctx.stroke();
  }
}
