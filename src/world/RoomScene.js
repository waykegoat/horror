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

    // Dynamic Canvas Textures
    this.tvCanvas = TextureGenerator.createTVScreenCanvas();
    this.tvTexture = new THREE.CanvasTexture(this.tvCanvas);

    this.windowCanvas = TextureGenerator.createWindowCanvas();
    this.windowTexture = new THREE.CanvasTexture(this.windowCanvas);

    this.fuseBoxTexture = TextureGenerator.createFuseBox(false);
    this.doorTexture = TextureGenerator.createDoorTexture(false);

    this.clockTexture = TextureGenerator.createClockTexture(0, 0);

    // Dynamic Meshes & Lights
    this.tvLight = null;
    this.chandelierLight = null;
    this.fuseSparkLight = null;
    this.curtainLeft = null;
    this.curtainRight = null;
    this.doorBoltMesh = null;
    this.fuseBoxMesh = null;
    this.clockMesh = null;

    this.buildRoom();
  }

  buildRoom() {
    const w = 7.0;
    const d = 7.0;
    const h = 3.2;

    // 1. Bright Ambient & Chandelier Lighting (100% CLEAR VISIBILITY)
    this.ambientLight = new THREE.AmbientLight(0xfff5ea, 0.85);
    this.scene.add(this.ambientLight);
    this.sunlight = null;

    this.chandelierLight = new THREE.PointLight(0xfff0d0, 2.2, 14, 1.4);
    this.chandelierLight.position.set(0, 2.9, 0);
    this.chandelierLight.castShadow = true;
    this.scene.add(this.chandelierLight);

    // Chandelier Lamp Mesh
    const chGeo = new THREE.CylinderGeometry(0.3, 0.4, 0.25, 12);
    const chMat = new THREE.MeshBasicMaterial({ color: 0xfff6dd });
    const chandelier = new THREE.Mesh(chGeo, chMat);
    chandelier.position.set(0, 3.0, 0);
    this.scene.add(chandelier);

    // 2. Room Shell (Floor, Ceiling, Walls)
    const floorMat = new THREE.MeshStandardMaterial({
      map: TextureGenerator.createWoodFloor(),
      roughness: 0.4,
      metalness: 0.1
    });
    floorMat.map.repeat.set(4, 4);

    const floor = new THREE.Mesh(new THREE.PlaneGeometry(w, d), floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(0, 0, 0);
    floor.receiveShadow = true;
    this.scene.add(floor);

    const ceilingMat = new THREE.MeshStandardMaterial({
      map: TextureGenerator.createCeiling(),
      roughness: 0.9
    });
    const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(w, d), ceilingMat);
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.set(0, h, 0);
    this.scene.add(ceiling);

    const wallTex = TextureGenerator.createRoomWall();
    wallTex.repeat.set(2, 1);
    const wallMat = new THREE.MeshStandardMaterial({ map: wallTex, roughness: 0.75 });

    // North Wall (Door)
    this.createWall(0, h / 2, -d / 2, w, h, 0.3, wallMat);
    // South Wall (TV)
    this.createWall(0, h / 2, d / 2, w, h, 0.3, wallMat);
    // West Wall (Window)
    this.createWall(-w / 2, h / 2, 0, 0.3, h, d, wallMat);
    // East Wall (Fuse Box & Desk)
    this.createWall(w / 2, h / 2, 0, 0.3, h, d, wallMat);

    // Outer Room Colliders for Player (box bounds [-3.1, 3.1])
    this.colliders.push({ min: new THREE.Vector2(-3.2, -3.2), max: new THREE.Vector2(3.2, 3.2) });

    // 3. Object 1: CRT TV "Рубин" on South Wall
    this.setupTV();

    // 4. Object 2: Window with Heavy Curtains on West Wall
    this.setupWindow();

    // 5. Object 3: Heavy Security Door with Deadbolt on North Wall
    this.setupDoor();

    // 6. Object 4: Electric Fuse Box on East Wall
    this.setupFuseBox();

    // 7. Desk, Chair, Table Lamp, Wall Clock
    this.setupFurnitureAndClock();
  }

  createWall(x, y, z, width, height, depth, material) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material);
    mesh.position.set(x, y, z);
    mesh.receiveShadow = true;
    mesh.castShadow = true;
    this.scene.add(mesh);
  }

  setupTV() {
    const tvGroup = new THREE.Group();
    tvGroup.position.set(0, 0, 3.1);

    // Wooden stand table
    const standMat = new THREE.MeshStandardMaterial({ color: 0x4a2e16, roughness: 0.6 });
    const stand = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.75, 0.8), standMat);
    stand.position.y = 0.375;
    stand.castShadow = true;
    tvGroup.add(stand);

    // TV Body (Soviet "Рубин")
    const tvBodyMat = new THREE.MeshStandardMaterial({ color: 0x2a221b, roughness: 0.5 });
    const tvBody = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.8, 0.7), tvBodyMat);
    tvBody.position.set(0, 1.15, -0.05);
    tvBody.castShadow = true;
    tvGroup.add(tvBody);

    // Curved TV Screen face
    TextureGenerator.drawTVScreen(this.tvCanvas, false);
    const screenMat = new THREE.MeshBasicMaterial({ map: this.tvTexture });
    const screenMesh = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.6, 0.05), screenMat);
    screenMesh.position.set(-0.08, 1.15, -0.41);
    tvGroup.add(screenMesh);

    // TV Knobs
    const knobMat = new THREE.MeshStandardMaterial({ color: 0x111 });
    const knob1 = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.04, 8), knobMat);
    knob1.rotation.x = Math.PI / 2;
    knob1.position.set(0.42, 1.25, -0.41);
    tvGroup.add(knob1);

    // Blue flickering light emitted into the room when TV is ON
    this.tvLight = new THREE.PointLight(0x4488ff, 0, 6, 2);
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
    this.tvLight.intensity = isOn ? 1.8 : 0;
  }

  setupWindow() {
    const winGroup = new THREE.Group();
    winGroup.position.set(-3.35, 1.7, 0);

    // Window frame
    const frameMat = new THREE.MeshStandardMaterial({ color: 0xdedede, roughness: 0.6 });
    const frame = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.8, 1.8), frameMat);
    winGroup.add(frame);

    // Glass panel showing outside night or monster
    TextureGenerator.drawWindow(this.windowCanvas, false);
    const glassMat = new THREE.MeshBasicMaterial({ map: this.windowTexture });
    const glass = new THREE.Mesh(new THREE.BoxGeometry(0.04, 1.6, 1.6), glassMat);
    glass.position.x = 0.04;
    winGroup.add(glass);

    // Heavy fabric curtains (two panels that slide together/apart)
    const curtainMat = new THREE.MeshStandardMaterial({ color: 0x8b1e1e, roughness: 0.9 });
    this.curtainLeft = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.9, 0.35), curtainMat);
    this.curtainLeft.position.set(0.1, 0, -0.7);
    winGroup.add(this.curtainLeft);

    this.curtainRight = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.9, 0.35), curtainMat);
    this.curtainRight.position.set(0.1, 0, 0.7);
    winGroup.add(this.curtainRight);

    this.scene.add(winGroup);

    this.interactives.push({
      id: 'window',
      name: 'Окно',
      position: new THREE.Vector3(-2.6, 1.6, 0),
      getPrompt: () => this.isCurtainClosed ? 'ОТКРЫТЬ ШТОРЫ' : 'ЗАДЕРНУТЬ ШТОРЫ',
      canInteract: () => true,
      action: () => this.toggleCurtains()
    });
  }

  setWindowMonster(hasMonster) {
    this.hasMonsterAtWindow = hasMonster;
    TextureGenerator.drawWindow(this.windowCanvas, hasMonster);
    this.windowTexture.needsUpdate = true;
  }

  toggleCurtains() {
    this.isCurtainClosed = !this.isCurtainClosed;
    // Animate curtain positions
    const targetScaleZ = this.isCurtainClosed ? 2.4 : 1.0;
    const targetOffsetZ = this.isCurtainClosed ? 0.42 : 0.7;

    this.curtainLeft.scale.z = targetScaleZ;
    this.curtainLeft.position.z = -targetOffsetZ;

    this.curtainRight.scale.z = targetScaleZ;
    this.curtainRight.position.z = targetOffsetZ;

    // If curtain is closed, monster can't see the player
    if (this.isCurtainClosed && this.hasMonsterAtWindow) {
      setTimeout(() => {
        this.setWindowMonster(false);
      }, 3000);
    }
  }

  setupDoor() {
    const doorGroup = new THREE.Group();
    doorGroup.position.set(0, 1.3, -3.35);

    // Door slab
    const doorMat = new THREE.MeshStandardMaterial({
      map: this.doorTexture,
      roughness: 0.65
    });
    const doorMesh = new THREE.Mesh(new THREE.BoxGeometry(1.4, 2.6, 0.1), doorMat);
    doorGroup.add(doorMesh);

    // 3D Deadbolt bar on the door
    const boltMat = new THREE.MeshStandardMaterial({ color: 0x909fa6, metalness: 0.8, roughness: 0.3 });
    this.doorBoltMesh = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.08, 0.06), boltMat);
    this.doorBoltMesh.position.set(-0.1, 0.1, 0.08); // unlatched position
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
    this.doorBoltMesh.position.x = this.isDoorLatched ? -0.32 : -0.1;
    this.doorTexture = TextureGenerator.createDoorTexture(this.isDoorLatched);
  }

  setupFuseBox() {
    const boxGroup = new THREE.Group();
    boxGroup.position.set(3.35, 1.6, 1.5);

    const boxMat = new THREE.MeshStandardMaterial({
      map: this.fuseBoxTexture,
      roughness: 0.6,
      metalness: 0.3
    });
    this.fuseBoxMesh = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.0, 0.6), boxMat);
    boxGroup.add(this.fuseBoxMesh);

    // Spark flicker light
    this.fuseSparkLight = new THREE.PointLight(0xff8822, 0, 5, 2);
    this.fuseSparkLight.position.set(-0.2, 0, 0);
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
    this.fuseSparkLight.intensity = isSparking ? 2.5 : 0;
  }

  setupFurnitureAndClock() {
    // Desk on East wall
    const deskMat = new THREE.MeshStandardMaterial({ color: 0x5c3a21, roughness: 0.7 });
    const desk = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.8, 2.0), deskMat);
    desk.position.set(2.6, 0.4, -1.0);
    desk.castShadow = true;
    this.scene.add(desk);

    // Desk Lamp
    const lampMat = new THREE.MeshBasicMaterial({ color: 0xffeebb });
    const deskLamp = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.2, 0.2, 8), lampMat);
    deskLamp.position.set(2.4, 0.95, -0.6);
    this.scene.add(deskLamp);

    const deskLight = new THREE.PointLight(0xffe2b0, 1.2, 6, 2);
    deskLight.position.set(2.4, 1.1, -0.6);
    this.scene.add(deskLight);

    // Chair
    const chair = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.9, 0.6), deskMat);
    chair.position.set(1.8, 0.45, -1.0);
    chair.castShadow = true;
    this.scene.add(chair);

    // Wall Clock "Янтарь" mounted on North wall
    const clockMat = new THREE.MeshBasicMaterial({ map: this.clockTexture });
    this.clockMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.06, 24), clockMat);
    this.clockMesh.rotation.x = Math.PI / 2;
    this.clockMesh.position.set(1.5, 2.4, -3.32);
    this.scene.add(this.clockMesh);

    // Cozy Soviet Sofa on West wall
    const sofaMat = new THREE.MeshStandardMaterial({ color: 0x3d5a45, roughness: 0.9 });
    const sofa = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.75, 2.2), sofaMat);
    sofa.position.set(-2.6, 0.38, 1.5);
    sofa.castShadow = true;
    this.scene.add(sofa);
  }

  updateClock(hour, minute) {
    this.clockTexture = TextureGenerator.createClockTexture(hour, minute);
    if (this.clockMesh) {
      this.clockMesh.material.map = this.clockTexture;
      this.clockMesh.material.needsUpdate = true;
    }
  }

  update(delta, time) {
    // If fuse is sparking, room chandelier flickers
    if (this.isFuseSparking) {
      const flicker = Math.sin(time * 30.0) * Math.cos(time * 15.0);
      this.chandelierLight.intensity = flicker > 0.3 ? 0.4 : 2.0;
      this.fuseSparkLight.intensity = Math.random() > 0.4 ? 2.5 : 0.2;
    } else {
      this.chandelierLight.intensity = 2.2;
    }

    // If TV is on, update random static noise on canvas texture
    if (this.isTVOn) {
      TextureGenerator.drawTVScreen(this.tvCanvas, true);
      this.tvTexture.needsUpdate = true;
      this.tvLight.intensity = 1.4 + Math.random() * 0.8;
    }
  }

  setSunriseLighting() {
    // 1. Open curtains if closed
    if (this.isCurtainClosed) {
      this.toggleCurtains();
    }

    // 2. Set window view to sunrise dawn
    this.setWindowMonster('dawn');

    // 3. Golden morning ambient light
    if (this.ambientLight) {
      this.ambientLight.color.setHex(0xffecd2);
      this.ambientLight.intensity = 1.25;
    }

    if (this.chandelierLight) {
      this.chandelierLight.color.setHex(0xfff5e6);
      this.chandelierLight.intensity = 1.6;
    }

    // 4. Directional morning sun stream from window (West -> East)
    if (!this.sunlight) {
      this.sunlight = new THREE.DirectionalLight(0xffb703, 2.8);
      this.sunlight.position.set(-5.0, 2.5, 0);
      this.sunlight.target.position.set(0, 1.0, 0);
      this.scene.add(this.sunlight);
      this.scene.add(this.sunlight.target);
    }
  }
}
