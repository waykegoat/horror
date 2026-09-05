import * as THREE from 'three';
import { TextureGenerator } from '../textures/TextureGenerator.js';

export class RoomScene {
  constructor(scene) {
    this.scene = scene;
    this.colliders = [];
    this.interactives = [];

    // Interactive State Properties
    this.isTVOn = false;
    this.isCurtainClosed = false;
    this.isDoorLatched = false;
    this.isFuseSparking = false;
    this.hasMonsterAtWindow = false;
    this.isBlackout = false;

    // Dynamic Canvas Textures
    this.tvCanvas = TextureGenerator.createTVScreenCanvas();
    this.tvTexture = new THREE.CanvasTexture(this.tvCanvas);

    this.windowCanvas = TextureGenerator.createWindowCanvas();
    this.windowTexture = new THREE.CanvasTexture(this.windowCanvas);

    this.fuseBoxTexture = TextureGenerator.createFuseBox(false);
    this.doorTexture = TextureGenerator.createDoorTexture(false);
    this.clockTexture = TextureGenerator.createClockTexture(0, 0);

    // Desk Surveillance Terminal Canvas (256x256)
    this.terminalCanvas = document.createElement('canvas');
    this.terminalCanvas.width = 256;
    this.terminalCanvas.height = 256;
    this.terminalCtx = this.terminalCanvas.getContext('2d');
    this.terminalTexture = new THREE.CanvasTexture(this.terminalCanvas);

    // Lights
    this.ambientLight = null;
    this.chandelierLight = null;
    this.emergencyRedLight = null;
    this.tvLight = null;
    this.deskLight = null;
    this.fuseSparkLight = null;
    this.sunlight = null;

    // Meshes
    this.curtainLeft = null;
    this.curtainRight = null;
    this.doorBoltMesh = null;
    this.fuseBoxMesh = null;
    this.clockMesh = null;
    this.chandelierBulb = null;
    this.dustParticles = null;
    this.dustCoords = null;

    this.buildRoom();
  }

  buildRoom() {
    const w = 7.0;
    const d = 7.0;
    const h = 3.2;

    // 1. Lighting Setup (Atmospheric PBR with soft shadows)
    this.ambientLight = new THREE.AmbientLight(0xffedd8, 0.75);
    this.scene.add(this.ambientLight);

    // Main Chandelier Point Light (warm incandescent 2700K)
    this.chandelierLight = new THREE.PointLight(0xffe8c2, 2.4, 16, 1.3);
    this.chandelierLight.position.set(0, 2.75, 0);
    this.chandelierLight.castShadow = true;
    this.chandelierLight.shadow.mapSize.width = 1024;
    this.chandelierLight.shadow.mapSize.height = 1024;
    this.chandelierLight.shadow.bias = -0.0015;
    this.scene.add(this.chandelierLight);

    // Emergency Red Beacon Light (activates during blackout)
    this.emergencyRedLight = new THREE.PointLight(0xff1100, 0, 10, 1.8);
    this.emergencyRedLight.position.set(0, 2.9, 0);
    this.scene.add(this.emergencyRedLight);

    // Chandelier Ceiling Fixture (Cord, Cap, Socket, Bulb)
    this.setupChandelierFixture();

    // 2. Room Shell (Floor, Ceiling, Walls)
    const floorTex = TextureGenerator.createWoodFloor();
    floorTex.repeat.set(3, 3);
    const floorMat = new THREE.MeshStandardMaterial({
      map: floorTex,
      roughness: 0.35,
      metalness: 0.15
    });

    const floor = new THREE.Mesh(new THREE.PlaneGeometry(w, d), floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(0, 0, 0);
    floor.receiveShadow = true;
    this.scene.add(floor);

    // Soviet Medallion Wool Rug in center of room
    const rugTex = TextureGenerator.createRug();
    const rugMat = new THREE.MeshStandardMaterial({
      map: rugTex,
      roughness: 0.95,
      metalness: 0.05
    });
    const rug = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 2.4), rugMat);
    rug.rotation.x = -Math.PI / 2;
    rug.position.set(0, 0.005, 0.2);
    rug.receiveShadow = true;
    this.scene.add(rug);

    // Ceiling with Plaster
    const ceilingTex = TextureGenerator.createCeiling();
    ceilingTex.repeat.set(4, 4);
    const ceilingMat = new THREE.MeshStandardMaterial({
      map: ceilingTex,
      roughness: 0.92
    });
    const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(w, d), ceilingMat);
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.set(0, h, 0);
    this.scene.add(ceiling);

    // Walls (North, South, West, East)
    const wallTex = TextureGenerator.createRoomWall();
    wallTex.repeat.set(2, 1);
    const wallMat = new THREE.MeshStandardMaterial({
      map: wallTex,
      roughness: 0.8
    });

    // North Wall (Door)
    this.createWall(0, h / 2, -d / 2, w, h, 0.3, wallMat);
    // South Wall (TV)
    this.createWall(0, h / 2, d / 2, w, h, 0.3, wallMat);
    // West Wall (Window)
    this.createWall(-w / 2, h / 2, 0, 0.3, h, d, wallMat);
    // East Wall (Desk & Fuse Box)
    this.createWall(w / 2, h / 2, 0, 0.3, h, d, wallMat);

    // Outer Room Colliders for Player (box bounds [-3.1, 3.1])
    this.colliders.push({ min: new THREE.Vector2(-3.2, -3.2), max: new THREE.Vector2(3.2, 3.2) });

    // 3. Realistic Interactive Objects
    this.setupTV();
    this.setupWindow();
    this.setupRadiator();
    this.setupDoor();
    this.setupFuseBox();
    this.setupDeskAndTerminal();
    this.setupSofaAndClock();

    // 4. Atmospheric Floating Dust Particle System
    this.setupDustParticles();
  }

  createWall(x, y, z, width, height, depth, material) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material);
    mesh.position.set(x, y, z);
    mesh.receiveShadow = true;
    mesh.castShadow = true;
    this.scene.add(mesh);
  }

  setupChandelierFixture() {
    const group = new THREE.Group();
    group.position.set(0, 3.2, 0);

    // Hanging black electrical cord
    const cordMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.9 });
    const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.45, 8), cordMat);
    cord.position.y = -0.225;
    group.add(cord);

    // Vintage brass lampshade cone
    const shadeMat = new THREE.MeshStandardMaterial({
      color: 0x9e7b41,
      metalness: 0.7,
      roughness: 0.35,
      side: THREE.DoubleSide
    });
    const shade = new THREE.Mesh(new THREE.ConeGeometry(0.32, 0.18, 16, 1, true), shadeMat);
    shade.position.y = -0.45;
    group.add(shade);

    // Glowing Filament Bulb Mesh
    const bulbMat = new THREE.MeshBasicMaterial({ color: 0xfff6dd });
    this.chandelierBulb = new THREE.Mesh(new THREE.SphereGeometry(0.05, 12, 12), bulbMat);
    this.chandelierBulb.position.y = -0.48;
    group.add(this.chandelierBulb);

    this.scene.add(group);
  }

  setupTV() {
    const tvGroup = new THREE.Group();
    tvGroup.position.set(0, 0, 3.1);

    // Wooden TV Stand Cabinet with front cabinet doors
    const standMat = new THREE.MeshStandardMaterial({ color: 0x4a2a12, roughness: 0.65 });
    const stand = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.75, 0.8), standMat);
    stand.position.y = 0.375;
    stand.castShadow = true;
    stand.receiveShadow = true;
    tvGroup.add(stand);

    // TV Body (Soviet "Рубин") with wooden veneer
    const tvBodyMat = new THREE.MeshStandardMaterial({ color: 0x302015, roughness: 0.55 });
    const tvBody = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.8, 0.7), tvBodyMat);
    tvBody.position.set(0, 1.15, -0.05);
    tvBody.castShadow = true;
    tvGroup.add(tvBody);

    // Speaker grill on right side
    const grillMat = new THREE.MeshStandardMaterial({ color: 0x1b140e, roughness: 0.9 });
    const grill = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.55, 0.02), grillMat);
    grill.position.set(0.38, 1.15, -0.41);
    tvGroup.add(grill);

    // TV Screen face (Convex CRT bulb)
    TextureGenerator.drawTVScreen(this.tvCanvas, false);
    const screenMat = new THREE.MeshBasicMaterial({ map: this.tvTexture });
    const screenMesh = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.58, 0.04), screenMat);
    screenMesh.position.set(-0.12, 1.15, -0.41);
    tvGroup.add(screenMesh);

    // Tuning knobs
    const knobMat = new THREE.MeshStandardMaterial({ color: 0xd9c298, metalness: 0.6, roughness: 0.3 });
    const knob1 = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.03, 12), knobMat);
    knob1.rotation.x = Math.PI / 2;
    knob1.position.set(0.38, 1.35, -0.42);
    tvGroup.add(knob1);

    const knob2 = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.03, 12), knobMat);
    knob2.rotation.x = Math.PI / 2;
    knob2.position.set(0.38, 1.22, -0.42);
    tvGroup.add(knob2);

    // Blue flickering glow emitted from TV when ON
    this.tvLight = new THREE.PointLight(0x4499ff, 0, 7, 2);
    this.tvLight.position.set(0, 1.2, -0.7);
    tvGroup.add(this.tvLight);

    this.scene.add(tvGroup);

    this.interactives.push({
      id: 'tv',
      name: 'Телевизор "Рубин"',
      position: new THREE.Vector3(0, 1.1, 2.5),
      getPrompt: () => this.isTVOn ? 'ВЫКЛЮЧИТЬ ТЕЛЕВИЗОР' : 'Телевизор (выключен)',
      canInteract: () => this.isTVOn,
      action: () => this.setTVState(false)
    });
  }

  setTVState(isOn) {
    this.isTVOn = isOn;
    TextureGenerator.drawTVScreen(this.tvCanvas, isOn);
    this.tvTexture.needsUpdate = true;
    this.tvLight.intensity = isOn ? 2.2 : 0;
  }

  setupWindow() {
    const winGroup = new THREE.Group();
    winGroup.position.set(-3.35, 1.7, 0);

    // Window Wooden Frame with sill
    const frameMat = new THREE.MeshStandardMaterial({ color: 0xdfd9cf, roughness: 0.65 });
    const frame = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.85, 1.85), frameMat);
    winGroup.add(frame);

    // Wide window sill
    const sill = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.06, 2.0), frameMat);
    sill.position.set(0.08, -0.92, 0);
    sill.castShadow = true;
    winGroup.add(sill);

    // Glass panel showing outside night or monster
    TextureGenerator.drawWindow(this.windowCanvas, false);
    const glassMat = new THREE.MeshBasicMaterial({ map: this.windowTexture });
    const glass = new THREE.Mesh(new THREE.BoxGeometry(0.02, 1.65, 1.65), glassMat);
    glass.position.x = 0.04;
    winGroup.add(glass);

    // Heavy velvet curtains (Left & Right panels)
    const curtainMat = new THREE.MeshStandardMaterial({ color: 0x781919, roughness: 0.95 });
    this.curtainLeft = new THREE.Mesh(new THREE.BoxGeometry(0.09, 1.95, 0.38), curtainMat);
    this.curtainLeft.position.set(0.12, 0, -0.72);
    winGroup.add(this.curtainLeft);

    this.curtainRight = new THREE.Mesh(new THREE.BoxGeometry(0.09, 1.95, 0.38), curtainMat);
    this.curtainRight.position.set(0.12, 0, 0.72);
    winGroup.add(this.curtainRight);

    this.scene.add(winGroup);

    this.interactives.push({
      id: 'window',
      name: 'Окно в сад',
      position: new THREE.Vector3(-2.6, 1.6, 0),
      getPrompt: () => this.isCurtainClosed ? 'ОТКРЫТЬ ШТОРЫ' : 'ЗАДЕРНУТЬ ШТОРЫ',
      canInteract: () => true,
      action: () => this.toggleCurtains()
    });
  }

  setupRadiator() {
    // Cast-iron Ribbed Radiator Heater under the window
    const radMat = new THREE.MeshStandardMaterial({
      map: TextureGenerator.createRadiator(),
      roughness: 0.75,
      metalness: 0.25
    });
    const radMesh = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.75, 1.5), radMat);
    radMesh.position.set(-3.22, 0.42, 0);
    radMesh.castShadow = true;
    this.scene.add(radMesh);
  }

  setWindowMonster(state) {
    this.hasMonsterAtWindow = state;
    TextureGenerator.drawWindow(this.windowCanvas, state);
    this.windowTexture.needsUpdate = true;
  }

  toggleCurtains() {
    this.isCurtainClosed = !this.isCurtainClosed;
    const targetScaleZ = this.isCurtainClosed ? 2.45 : 1.0;
    const targetOffsetZ = this.isCurtainClosed ? 0.42 : 0.72;

    this.curtainLeft.scale.z = targetScaleZ;
    this.curtainLeft.position.z = -targetOffsetZ;

    this.curtainRight.scale.z = targetScaleZ;
    this.curtainRight.position.z = targetOffsetZ;

    if (this.isCurtainClosed && this.hasMonsterAtWindow) {
      setTimeout(() => {
        this.setWindowMonster(false);
      }, 2500);
    }
  }

  setupDoor() {
    const doorGroup = new THREE.Group();
    doorGroup.position.set(0, 1.3, -3.35);

    // Heavy Industrial Steel Door Slab
    const doorMat = new THREE.MeshStandardMaterial({
      map: this.doorTexture,
      roughness: 0.65,
      metalness: 0.35
    });
    const doorMesh = new THREE.Mesh(new THREE.BoxGeometry(1.4, 2.6, 0.1), doorMat);
    doorMesh.receiveShadow = true;
    doorGroup.add(doorMesh);

    // 3D Sliding Steel Deadbolt
    const boltMat = new THREE.MeshStandardMaterial({ color: 0x9aa6ac, metalness: 0.85, roughness: 0.25 });
    this.doorBoltMesh = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.09, 0.07), boltMat);
    this.doorBoltMesh.position.set(-0.1, 0.1, 0.08);
    doorGroup.add(this.doorBoltMesh);

    this.scene.add(doorGroup);

    this.interactives.push({
      id: 'door',
      name: 'Бронированная дверь',
      position: new THREE.Vector3(0, 1.3, -2.6),
      getPrompt: () => this.isDoorLatched ? 'ОТКРЫТЬ ЗАСОВ' : 'ЗАКРЫТЬ ЗАСОВ',
      canInteract: () => true,
      action: () => this.toggleDoorLatch()
    });
  }

  toggleDoorLatch() {
    this.isDoorLatched = !this.isDoorLatched;
    this.doorBoltMesh.position.x = this.isDoorLatched ? -0.34 : -0.1;
    this.doorTexture = TextureGenerator.createDoorTexture(this.isDoorLatched);
  }

  setupFuseBox() {
    const boxGroup = new THREE.Group();
    boxGroup.position.set(3.35, 1.6, 1.5);

    const boxMat = new THREE.MeshStandardMaterial({
      map: this.fuseBoxTexture,
      roughness: 0.6,
      metalness: 0.4
    });
    this.fuseBoxMesh = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.05, 0.65), boxMat);
    this.fuseBoxMesh.castShadow = true;
    boxGroup.add(this.fuseBoxMesh);

    // Spark flicker light
    this.fuseSparkLight = new THREE.PointLight(0xff6600, 0, 6, 2);
    this.fuseSparkLight.position.set(-0.25, 0, 0);
    boxGroup.add(this.fuseSparkLight);

    this.scene.add(boxGroup);

    this.interactives.push({
      id: 'fuse',
      name: 'Электрощиток',
      position: new THREE.Vector3(2.6, 1.6, 1.5),
      getPrompt: () => this.isFuseSparking ? 'ПЕРЕЗАПУСТИТЬ ЩИТОК' : 'Щиток (норма)',
      canInteract: () => this.isFuseSparking,
      action: () => this.setFuseState(false)
    });
  }

  setFuseState(isSparking) {
    this.isFuseSparking = isSparking;
    this.fuseBoxTexture = TextureGenerator.createFuseBox(isSparking);
    this.fuseBoxMesh.material.map = this.fuseBoxTexture;
    this.fuseBoxMesh.material.needsUpdate = true;
    this.fuseSparkLight.intensity = isSparking ? 3.0 : 0;
  }

  setupDeskAndTerminal() {
    const deskGroup = new THREE.Group();
    deskGroup.position.set(2.6, 0, -1.0);

    // Solid Wood Office Desk with drawers
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x50321a, roughness: 0.7 });
    const top = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.08, 2.0), woodMat);
    top.position.y = 0.76;
    top.castShadow = true;
    top.receiveShadow = true;
    deskGroup.add(top);

    // Left & Right drawer pedestals
    const ped1 = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.72, 0.5), woodMat);
    ped1.position.set(0, 0.36, -0.65);
    ped1.castShadow = true;
    deskGroup.add(ped1);

    const ped2 = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.72, 0.5), woodMat);
    ped2.position.set(0, 0.36, 0.65);
    ped2.castShadow = true;
    deskGroup.add(ped2);

    // Desk Lamp
    const lampMat = new THREE.MeshStandardMaterial({ color: 0x222, metalness: 0.7, roughness: 0.3 });
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.03, 16), lampMat);
    base.position.set(0.1, 0.815, -0.7);
    deskGroup.add(base);

    const shadeMat = new THREE.MeshStandardMaterial({ color: 0x1d4a2c, roughness: 0.3 });
    const shade = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.15, 0.14, 16), shadeMat);
    shade.position.set(0.1, 1.05, -0.7);
    deskGroup.add(shade);

    this.deskLight = new THREE.PointLight(0xffdf99, 1.5, 5, 2);
    this.deskLight.position.set(0.1, 1.0, -0.7);
    this.deskLight.castShadow = true;
    deskGroup.add(this.deskLight);

    // Soviet Rotary Telephone "ТА-68"
    const phoneMat = new THREE.MeshStandardMaterial({
      map: TextureGenerator.createTelephoneTexture(),
      roughness: 0.5
    });
    const phone = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.1, 0.24), phoneMat);
    phone.position.set(-0.25, 0.85, -0.6);
    phone.castShadow = true;
    deskGroup.add(phone);

    // Dedicated Physical 3D Desk Surveillance Monitor "ДОЗОР-4"
    const monMat = new THREE.MeshStandardMaterial({ color: 0x2d3336, roughness: 0.6 });
    const monBody = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.34, 0.3), monMat);
    monBody.position.set(0.05, 0.97, 0.1);
    monBody.rotation.y = -Math.PI / 6; // angled toward player chair
    monBody.castShadow = true;
    deskGroup.add(monBody);

    // Monitor screen face with live CanvasTexture
    const screenMat = new THREE.MeshBasicMaterial({ map: this.terminalTexture });
    const screenMesh = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.24), screenMat);
    screenMesh.position.set(-0.06, 0.98, 0.23);
    screenMesh.rotation.y = -Math.PI / 6;
    deskGroup.add(screenMesh);

    // Office Chair
    const chairMat = new THREE.MeshStandardMaterial({ color: 0x3d2716, roughness: 0.8 });
    const chair = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.85, 0.55), chairMat);
    chair.position.set(1.8, 0.425, -1.0);
    chair.castShadow = true;
    this.scene.add(chair);

    this.scene.add(deskGroup);
  }

  setupSofaAndClock() {
    // Soviet Velvet Sofa on West wall
    const sofaMat = new THREE.MeshStandardMaterial({ color: 0x2b4632, roughness: 0.95 });
    const sofa = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.78, 2.3), sofaMat);
    sofa.position.set(-2.6, 0.39, 1.5);
    sofa.castShadow = true;
    sofa.receiveShadow = true;
    this.scene.add(sofa);

    // Wall Clock "Янтарь" mounted on North wall
    const clockMat = new THREE.MeshBasicMaterial({ map: this.clockTexture });
    this.clockMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.06, 24), clockMat);
    this.clockMesh.rotation.x = Math.PI / 2;
    this.clockMesh.position.set(1.5, 2.4, -3.32);
    this.scene.add(this.clockMesh);
  }

  setupDustParticles() {
    const particleCount = 400;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    this.dustCoords = [];

    for (let i = 0; i < particleCount; i++) {
      const x = (Math.random() - 0.5) * 6.0;
      const y = 0.2 + Math.random() * 2.8;
      const z = (Math.random() - 0.5) * 6.0;

      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;

      this.dustCoords.push({
        baseX: x,
        baseY: y,
        baseZ: z,
        speed: 0.2 + Math.random() * 0.4,
        phase: Math.random() * Math.PI * 2
      });
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const material = new THREE.PointsMaterial({
      color: 0xfff0d0,
      size: 0.025,
      transparent: true,
      opacity: 0.45,
      blending: THREE.AdditiveBlending
    });

    this.dustParticles = new THREE.Points(geometry, material);
    this.scene.add(this.dustParticles);
  }

  updateClock(hour, minute) {
    this.clockTexture = TextureGenerator.createClockTexture(hour, minute);
    if (this.clockMesh) {
      this.clockMesh.material.map = this.clockTexture;
      this.clockMesh.material.needsUpdate = true;
    }
  }

  update(delta, time, gameData) {
    // 1. Dust Particles gentle drift
    if (this.dustParticles && this.dustCoords) {
      const posAttr = this.dustParticles.geometry.attributes.position;
      const arr = posAttr.array;

      for (let i = 0; i < this.dustCoords.length; i++) {
        const d = this.dustCoords[i];
        arr[i * 3] = d.baseX + Math.sin(time * d.speed + d.phase) * 0.2;
        arr[i * 3 + 1] = d.baseY + Math.cos(time * d.speed * 0.8 + d.phase) * 0.15;
        arr[i * 3 + 2] = d.baseZ + Math.sin(time * d.speed * 0.6 + d.phase) * 0.2;
      }
      posAttr.needsUpdate = true;
    }

    // 2. Blackout & Chandelier Lighting logic
    if (this.isFuseSparking) {
      // Sparking flicker
      const flicker = Math.sin(time * 30.0) * Math.cos(time * 15.0);
      if (this.isBlackout) {
        // Full blackout: chandelier cuts out completely!
        this.chandelierLight.intensity = 0.05;
        this.chandelierBulb.material.color.setHex(0x332211);
        this.ambientLight.intensity = 0.15;

        // Emergency Red beacon pulses in the dark
        const redPulse = Math.sin(time * 4.0) * 0.5 + 0.5;
        this.emergencyRedLight.intensity = 1.6 * redPulse;
      } else {
        this.chandelierLight.intensity = flicker > 0.25 ? 0.3 : 2.2;
        this.fuseSparkLight.intensity = Math.random() > 0.3 ? 3.2 : 0.3;
        this.emergencyRedLight.intensity = 0;
      }
    } else {
      this.isBlackout = false;
      this.chandelierLight.intensity = 2.4;
      this.chandelierBulb.material.color.setHex(0xfff6dd);
      this.ambientLight.intensity = 0.75;
      this.emergencyRedLight.intensity = 0;
    }

    // 3. TV Screen update when on
    if (this.isTVOn) {
      TextureGenerator.drawTVScreen(this.tvCanvas, true);
      this.tvTexture.needsUpdate = true;
      this.tvLight.intensity = 1.6 + Math.random() * 0.9;
    }

    // 4. Desk Surveillance Monitor Live Radar & Telemetry
    if (gameData) {
      this.renderDeskTerminal(gameData, time);
      this.terminalTexture.needsUpdate = true;
    }
  }

  renderDeskTerminal(data, time) {
    const ctx = this.terminalCtx;
    const size = 256;

    ctx.fillStyle = '#051009';
    ctx.fillRect(0, 0, size, size);

    // Green CRT grid
    ctx.strokeStyle = '#092615';
    ctx.lineWidth = 1;
    for (let x = 0; x < size; x += 32) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, size);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, x);
      ctx.lineTo(size, x);
      ctx.stroke();
    }

    // Header
    ctx.fillStyle = '#00ff66';
    ctx.font = 'bold 12px monospace';
    ctx.fillText(`СМЕНА: ${data.clock} / 06:00`, 10, 20);

    // Radar circle in center
    const cx = size / 2;
    const cy = 110;
    ctx.strokeStyle = '#00aa44';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(cx, cy, 55, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx, cy, 30, 0, Math.PI * 2);
    ctx.stroke();

    // Radar sweep hand
    const sweepAngle = time * 2.5;
    ctx.strokeStyle = 'rgba(0, 255, 100, 0.7)';
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(sweepAngle) * 55, cy + Math.sin(sweepAngle) * 55);
    ctx.stroke();

    // Anomaly status alerts at bottom
    ctx.font = 'bold 10px monospace';
    const drawItem = (label, alert, y) => {
      ctx.fillStyle = alert ? '#ff2222' : '#00ff66';
      ctx.fillText(`${label}: ${alert ? 'ТРЕВОГА!' : 'НОРМА'}`, 14, y);
    };

    drawItem('ТВ [РУБИН]', data.anomalies.tv, 185);
    drawItem('ОКНО [САД]', data.anomalies.window, 202);
    drawItem('ДВЕРЬ [ПОСТ]', data.anomalies.door, 219);
    drawItem('СЕТЬ [220V]', data.anomalies.fuse, 236);

    // Threat badge
    ctx.fillStyle = data.threat > 0.5 ? '#ff2222' : '#ffaa00';
    ctx.fillRect(size - 75, 10, 65, 18);
    ctx.fillStyle = '#000';
    ctx.font = 'bold 10px monospace';
    ctx.fillText(`УГРОЗА ${Math.round(data.threat * 100)}%`, size - 70, 23);
  }

  setSunriseLighting() {
    if (this.isCurtainClosed) {
      this.toggleCurtains();
    }

    this.setWindowMonster('dawn');

    if (this.ambientLight) {
      this.ambientLight.color.setHex(0xffebd2);
      this.ambientLight.intensity = 1.35;
    }

    if (this.chandelierLight) {
      this.chandelierLight.color.setHex(0xfff5e6);
      this.chandelierLight.intensity = 1.8;
    }

    if (!this.sunlight) {
      this.sunlight = new THREE.DirectionalLight(0xffb703, 3.2);
      this.sunlight.position.set(-5.5, 2.8, 0);
      this.sunlight.target.position.set(0, 1.0, 0);
      this.sunlight.castShadow = true;
      this.scene.add(this.sunlight);
      this.scene.add(this.sunlight.target);
    }
  }
}
