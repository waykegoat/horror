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

    this.fuseBoxPBR = TextureGenerator.createFuseBoxPBR(false);
    this.doorPBR = TextureGenerator.createDoorPBR(false);
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

    // Volumetric Cone & FX
    this.volumetricCone = null;
    this.curtainLeftGroup = null;
    this.curtainRightGroup = null;
    this.doorBoltMesh = null;
    this.fuseBoxMesh = null;
    this.doorMesh = null;
    this.clockMesh = null;
    this.chandelierBulb = null;
    this.filamentMesh = null;

    // Particle Systems
    this.dustParticles = null;
    this.dustCoords = null;
    this.smokeParticles = null;
    this.smokeCoords = null;

    this.buildRoom();
  }

  buildRoom() {
    const w = 7.0;
    const d = 7.0;
    const h = 3.2;

    // 1. Lighting Setup (Atmospheric PBR with soft shadows)
    this.ambientLight = new THREE.AmbientLight(0xffedd8, 0.72);
    this.scene.add(this.ambientLight);

    // Main Chandelier Point Light (warm incandescent 2700K)
    this.chandelierLight = new THREE.PointLight(0xffe6bd, 2.5, 16, 1.4);
    this.chandelierLight.position.set(0, 2.72, 0);
    this.chandelierLight.castShadow = true;
    this.chandelierLight.shadow.mapSize.width = 2048;
    this.chandelierLight.shadow.mapSize.height = 2048;
    this.chandelierLight.shadow.bias = -0.001;
    this.scene.add(this.chandelierLight);

    // Emergency Red Beacon Light (activates during blackout)
    this.emergencyRedLight = new THREE.PointLight(0xff1800, 0, 11, 1.8);
    this.emergencyRedLight.position.set(0, 2.9, 0);
    this.scene.add(this.emergencyRedLight);

    // Chandelier Ceiling Fixture (Cord, Cap, Socket, Bulb, Volumetric Beam)
    this.setupChandelierFixture();

    // 2. Room Shell (Floor, Ceiling, Walls with PBR Normal & Roughness maps)
    const floorPBR = TextureGenerator.createWoodFloorPBR();
    floorPBR.map.repeat.set(3, 3);
    floorPBR.normalMap.repeat.set(3, 3);
    floorPBR.roughnessMap.repeat.set(3, 3);

    const floorMat = new THREE.MeshStandardMaterial({
      map: floorPBR.map,
      normalMap: floorPBR.normalMap,
      roughnessMap: floorPBR.roughnessMap,
      roughness: 0.35,
      metalness: 0.12
    });
    floorMat.normalScale.set(1.4, 1.4);

    const floor = new THREE.Mesh(new THREE.PlaneGeometry(w, d), floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(0, 0, 0);
    floor.receiveShadow = true;
    this.scene.add(floor);

    // Soviet Medallion Wool Rug with PBR
    const rugPBR = TextureGenerator.createRugPBR();
    const rugMat = new THREE.MeshStandardMaterial({
      map: rugPBR.map,
      normalMap: rugPBR.normalMap,
      roughnessMap: rugPBR.roughnessMap,
      roughness: 0.95,
      metalness: 0.04
    });
    rugMat.normalScale.set(1.0, 1.0);

    const rug = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 2.4), rugMat);
    rug.rotation.x = -Math.PI / 2;
    rug.position.set(0, 0.005, 0.2);
    rug.receiveShadow = true;
    this.scene.add(rug);

    // Ceiling with Plaster PBR
    const ceilingPBR = TextureGenerator.createCeilingPBR();
    ceilingPBR.map.repeat.set(4, 4);
    ceilingPBR.normalMap.repeat.set(4, 4);
    ceilingPBR.roughnessMap.repeat.set(4, 4);

    const ceilingMat = new THREE.MeshStandardMaterial({
      map: ceilingPBR.map,
      normalMap: ceilingPBR.normalMap,
      roughnessMap: ceilingPBR.roughnessMap,
      roughness: 0.92
    });
    const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(w, d), ceilingMat);
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.set(0, h, 0);
    this.scene.add(ceiling);

    // Walls with Wallpaper PBR
    const wallPBR = TextureGenerator.createRoomWallPBR();
    wallPBR.map.repeat.set(2, 1);
    wallPBR.normalMap.repeat.set(2, 1);
    wallPBR.roughnessMap.repeat.set(2, 1);

    const wallMat = new THREE.MeshStandardMaterial({
      map: wallPBR.map,
      normalMap: wallPBR.normalMap,
      roughnessMap: wallPBR.roughnessMap,
      roughness: 0.78
    });
    wallMat.normalScale.set(1.2, 1.2);

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

    // 3. Architectural Moldings (Skirting boards & Crown moldings)
    this.setupArchitecturalMoldings(w, d, h);

    // 4. Electrical Conduits, Junction Boxes & Wall Switch
    this.setupElectricalConduits();

    // 5. Realistic Interactive Objects & Furniture
    this.setupTV();
    this.setupWindow();
    this.setupRadiator();
    this.setupDoor();
    this.setupFuseBox();
    this.setupDeskAndTerminal();
    this.setupSofaAndClock();

    // 6. Particle Systems (Dust motes & Cigarette smoke)
    this.setupDustParticles();
    this.setupSmokeParticles();
  }

  createWall(x, y, z, width, height, depth, material) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material);
    mesh.position.set(x, y, z);
    mesh.receiveShadow = true;
    mesh.castShadow = true;
    this.scene.add(mesh);
  }

  setupArchitecturalMoldings(w, d, h) {
    const moldMat = new THREE.MeshStandardMaterial({
      color: 0x382010,
      roughness: 0.45,
      metalness: 0.1
    });

    const crownMat = new THREE.MeshStandardMaterial({
      color: 0xe6e0d4,
      roughness: 0.85
    });

    // Baseboard Skirting along 4 walls (Height: 0.12m)
    const skH = 0.12;
    const skD = 0.035;

    // North & South Baseboards
    const skNSGeo = new THREE.BoxGeometry(w - 0.2, skH, skD);
    const skN = new THREE.Mesh(skNSGeo, moldMat);
    skN.position.set(0, skH / 2, -d / 2 + 0.165);
    skN.receiveShadow = true;
    this.scene.add(skN);

    const skS = new THREE.Mesh(skNSGeo, moldMat);
    skS.position.set(0, skH / 2, d / 2 - 0.165);
    skS.receiveShadow = true;
    this.scene.add(skS);

    // West & East Baseboards
    const skEWGeo = new THREE.BoxGeometry(skD, skH, d - 0.2);
    const skW = new THREE.Mesh(skEWGeo, moldMat);
    skW.position.set(-w / 2 + 0.165, skH / 2, 0);
    skW.receiveShadow = true;
    this.scene.add(skW);

    const skE = new THREE.Mesh(skEWGeo, moldMat);
    skE.position.set(w / 2 - 0.165, skH / 2, 0);
    skE.receiveShadow = true;
    this.scene.add(skE);

    // Ceiling Crown Moldings
    const crH = 0.1;
    const crD = 0.04;

    const crNSGeo = new THREE.BoxGeometry(w - 0.2, crH, crD);
    const crN = new THREE.Mesh(crNSGeo, crownMat);
    crN.position.set(0, h - crH / 2, -d / 2 + 0.165);
    this.scene.add(crN);

    const crS = new THREE.Mesh(crNSGeo, crownMat);
    crS.position.set(0, h - crH / 2, d / 2 - 0.165);
    this.scene.add(crS);

    const crEWGeo = new THREE.BoxGeometry(crD, crH, d - 0.2);
    const crW = new THREE.Mesh(crEWGeo, crownMat);
    crW.position.set(-w / 2 + 0.165, h - crH / 2, 0);
    this.scene.add(crW);

    const crE = new THREE.Mesh(crEWGeo, crownMat);
    crE.position.set(w / 2 - 0.165, h - crH / 2, 0);
    this.scene.add(crE);
  }

  setupElectricalConduits() {
    const pipeMat = new THREE.MeshStandardMaterial({
      color: 0x1c1e20,
      metalness: 0.8,
      roughness: 0.35
    });

    const boxMat = new THREE.MeshStandardMaterial({
      color: 0x2d3236,
      metalness: 0.6,
      roughness: 0.4
    });

    // Conduit pipe running from Fuse Box (3.35, 1.6, 1.5) up to ceiling
    const pipe1 = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 1.5, 8), pipeMat);
    pipe1.position.set(3.32, 2.35, 1.5);
    this.scene.add(pipe1);

    // Junction box near ceiling on East wall
    const jBox1 = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.03, 12), boxMat);
    jBox1.rotation.z = Math.PI / 2;
    jBox1.position.set(3.32, 3.05, 1.5);
    this.scene.add(jBox1);

    // Conduit running along ceiling from East wall to chandelier in center
    const ceilPipe = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 3.3, 8), pipeMat);
    ceilPipe.rotation.z = Math.PI / 2;
    ceilPipe.position.set(1.65, 3.16, 0.75);
    this.scene.add(ceilPipe);

    // Vintage Soviet wall toggle light switch next to the door on North wall
    const swMat = new THREE.MeshStandardMaterial({ color: 0xdfd9cc, roughness: 0.5 });
    const swBase = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.02, 16), swMat);
    swBase.rotation.x = Math.PI / 2;
    swBase.position.set(0.9, 1.4, -3.32);
    this.scene.add(swBase);

    const swToggle = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.03, 0.02), pipeMat);
    swToggle.position.set(0.9, 1.4, -3.3);
    this.scene.add(swToggle);
  }

  setupChandelierFixture() {
    const group = new THREE.Group();
    group.position.set(0, 3.2, 0);

    // Ceiling brass canopy cup
    const cupMat = new THREE.MeshStandardMaterial({ color: 0x8a6d3b, metalness: 0.75, roughness: 0.3 });
    const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.05, 0.06, 16), cupMat);
    cup.position.y = -0.03;
    group.add(cup);

    // Twisted black electrical hanging cable
    const cordMat = new THREE.MeshStandardMaterial({ color: 0x151515, roughness: 0.95 });
    const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.007, 0.46, 8), cordMat);
    cord.position.y = -0.25;
    group.add(cord);

    // Vintage brass lampshade cone
    const shadeMat = new THREE.MeshStandardMaterial({
      color: 0xa48043,
      metalness: 0.7,
      roughness: 0.32,
      side: THREE.DoubleSide
    });
    const shade = new THREE.Mesh(new THREE.ConeGeometry(0.34, 0.2, 20, 1, true), shadeMat);
    shade.position.y = -0.48;
    group.add(shade);

    // Porcelain socket collar
    const socMat = new THREE.MeshStandardMaterial({ color: 0xe8e4d8, roughness: 0.6 });
    const socket = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.06, 12), socMat);
    socket.position.y = -0.44;
    group.add(socket);

    // Clear glass bulb envelope
    const bulbMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.35,
      roughness: 0.1,
      metalness: 0.1
    });
    this.chandelierBulb = new THREE.Mesh(new THREE.SphereGeometry(0.055, 16, 16), bulbMat);
    this.chandelierBulb.position.y = -0.52;
    group.add(this.chandelierBulb);

    // Glowing Tungsten Filament coil inside
    const filMat = new THREE.MeshBasicMaterial({ color: 0xffeedd });
    this.filamentMesh = new THREE.Mesh(new THREE.TorusGeometry(0.015, 0.003, 8, 16), filMat);
    this.filamentMesh.position.y = -0.52;
    group.add(this.filamentMesh);

    // Volumetric Soft Light Cone (Atmospheric dust cone beam)
    const beamTex = TextureGenerator.createLightBeamTexture();
    const beamMat = new THREE.MeshBasicMaterial({
      map: beamTex,
      transparent: true,
      opacity: 0.3,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide
    });
    this.volumetricCone = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 2.3, 2.7, 24, 1, true), beamMat);
    this.volumetricCone.position.y = -1.85;
    group.add(this.volumetricCone);

    this.scene.add(group);
  }

  setupTV() {
    const tvGroup = new THREE.Group();
    tvGroup.position.set(0, 0, 3.1);

    // Contact shadow under TV Stand
    this.addContactShadow(0, 0.006, 3.1, 1.8, 1.1);

    // Wooden TV Stand Cabinet with carved legs and doors
    const standMat = new THREE.MeshStandardMaterial({ color: 0x482910, roughness: 0.65 });
    const stand = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.75, 0.8), standMat);
    stand.position.y = 0.375;
    stand.castShadow = true;
    stand.receiveShadow = true;
    tvGroup.add(stand);

    // TV Body (Soviet "Рубин-714") with rounded wooden veneer casing
    const tvBodyMat = new THREE.MeshStandardMaterial({ color: 0x2e1e12, roughness: 0.55 });
    const tvBody = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.82, 0.72), tvBodyMat);
    tvBody.position.set(0, 1.16, -0.05);
    tvBody.castShadow = true;
    tvGroup.add(tvBody);

    // Speaker grill fabric
    const grillMat = new THREE.MeshStandardMaterial({ color: 0x1a120b, roughness: 0.92 });
    const grill = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.56, 0.02), grillMat);
    grill.position.set(0.39, 1.16, -0.42);
    tvGroup.add(grill);

    // Convex CRT screen face (curved bulb geometry)
    TextureGenerator.drawTVScreen(this.tvCanvas, false);
    const screenMat = new THREE.MeshBasicMaterial({ map: this.tvTexture });
    const screenMesh = new THREE.Mesh(new THREE.BoxGeometry(0.76, 0.6, 0.04), screenMat);
    screenMesh.position.set(-0.13, 1.16, -0.42);
    tvGroup.add(screenMesh);

    // Tuning knobs
    const knobMat = new THREE.MeshStandardMaterial({ color: 0xd9c298, metalness: 0.6, roughness: 0.3 });
    const knob1 = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.03, 16), knobMat);
    knob1.rotation.x = Math.PI / 2;
    knob1.position.set(0.39, 1.36, -0.43);
    tvGroup.add(knob1);

    const knob2 = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.03, 16), knobMat);
    knob2.rotation.x = Math.PI / 2;
    knob2.position.set(0.39, 1.22, -0.43);
    tvGroup.add(knob2);

    // Twin telescopic rabbit-ear antenna
    const antMat = new THREE.MeshStandardMaterial({ color: 0xaaa, metalness: 0.9, roughness: 0.2 });
    const ant1 = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.6, 8), antMat);
    ant1.rotation.z = Math.PI / 6;
    ant1.position.set(-0.15, 1.7, 0.05);
    tvGroup.add(ant1);

    const ant2 = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.6, 8), antMat);
    ant2.rotation.z = -Math.PI / 6;
    ant2.position.set(0.15, 1.7, 0.05);
    tvGroup.add(ant2);

    // Blue flickering TV light
    this.tvLight = new THREE.PointLight(0x4499ff, 0, 7.5, 2);
    this.tvLight.position.set(0, 1.2, -0.75);
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
    this.tvLight.intensity = isOn ? 2.4 : 0;
  }

  setupWindow() {
    const winGroup = new THREE.Group();
    winGroup.position.set(-3.35, 1.7, 0);

    // Wooden Frame with sill
    const frameMat = new THREE.MeshStandardMaterial({ color: 0xddd7cc, roughness: 0.65 });
    const frame = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.88, 1.88), frameMat);
    winGroup.add(frame);

    // Wooden Muntin Dividers (creating 6 window panes)
    const muntinH = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.04, 1.75), frameMat);
    muntinH.position.set(0.02, 0, 0);
    winGroup.add(muntinH);

    const muntinV1 = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.75, 0.04), frameMat);
    muntinV1.position.set(0.02, 0, -0.45);
    winGroup.add(muntinV1);

    const muntinV2 = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.75, 0.04), frameMat);
    muntinV2.position.set(0.02, 0, 0.45);
    winGroup.add(muntinV2);

    // Window sill
    const sill = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.06, 2.1), frameMat);
    sill.position.set(0.09, -0.94, 0);
    sill.castShadow = true;
    winGroup.add(sill);

    // Glass panel
    TextureGenerator.drawWindow(this.windowCanvas, false);
    const glassMat = new THREE.MeshBasicMaterial({ map: this.windowTexture });
    const glass = new THREE.Mesh(new THREE.BoxGeometry(0.02, 1.68, 1.68), glassMat);
    glass.position.x = 0.04;
    winGroup.add(glass);

    // Brass Curtain Rail Rod mounted above the window
    const rodMat = new THREE.MeshStandardMaterial({ color: 0x9b7b3e, metalness: 0.8, roughness: 0.28 });
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 2.3, 16), rodMat);
    rod.rotation.x = Math.PI / 2;
    rod.position.set(0.16, 1.02, 0);
    winGroup.add(rod);

    // Pleated Fabric Curtains (sinusoidal wavy geometry)
    const createPleatedCurtain = () => {
      const pleatGroup = new THREE.Group();
      const numFolds = 5;
      const foldW = 0.08;
      const curH = 1.95;
      const curMat = new THREE.MeshStandardMaterial({ color: 0x731515, roughness: 0.95 });

      for (let i = 0; i < numFolds; i++) {
        const fold = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.03, curH, 12), curMat);
        fold.position.set((i % 2 === 0 ? 0.015 : -0.015), 0, (i - numFolds / 2) * foldW);
        fold.castShadow = true;
        pleatGroup.add(fold);
      }
      return pleatGroup;
    };

    this.curtainLeftGroup = createPleatedCurtain();
    this.curtainLeftGroup.position.set(0.14, 0, -0.68);
    winGroup.add(this.curtainLeftGroup);

    this.curtainRightGroup = createPleatedCurtain();
    this.curtainRightGroup.position.set(0.14, 0, 0.68);
    winGroup.add(this.curtainRightGroup);

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
    const radGroup = new THREE.Group();
    radGroup.position.set(-3.22, 0.42, 0);

    // Contact shadow
    this.addContactShadow(-3.2, 0.006, 0, 0.5, 1.8);

    const finMat = new THREE.MeshStandardMaterial({
      color: 0xb5bac0,
      metalness: 0.35,
      roughness: 0.68
    });

    const pipeMat = new THREE.MeshStandardMaterial({ color: 0x444a50, metalness: 0.7, roughness: 0.4 });

    // 7 detailed 3D radiator fin sections
    const numFins = 7;
    const finSpacing = 0.2;
    const startZ = -(numFins - 1) * finSpacing / 2;

    for (let i = 0; i < numFins; i++) {
      const z = startZ + i * finSpacing;
      // Main fin section
      const fin = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.68, 0.07), finMat);
      fin.position.set(0, 0, z);
      fin.castShadow = true;
      radGroup.add(fin);

      // Hollow cutout inner slot
      const inner = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.52, 0.03), finMat);
      inner.position.set(0, 0, z);
      radGroup.add(inner);
    }

    // Top and bottom manifold connecting pipes
    const topPipe = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.45, 12), pipeMat);
    topPipe.rotation.x = Math.PI / 2;
    topPipe.position.set(0, 0.28, 0);
    radGroup.add(topPipe);

    const botPipe = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.45, 12), pipeMat);
    botPipe.rotation.x = Math.PI / 2;
    botPipe.position.set(0, -0.28, 0);
    radGroup.add(botPipe);

    // Brass air bleed valve
    const valveMat = new THREE.MeshStandardMaterial({ color: 0xaa8833, metalness: 0.8, roughness: 0.25 });
    const valve = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.04, 8), valveMat);
    valve.position.set(0.05, 0.3, 0.7);
    radGroup.add(valve);

    this.scene.add(radGroup);
  }

  setWindowMonster(state) {
    this.hasMonsterAtWindow = state;
    TextureGenerator.drawWindow(this.windowCanvas, state);
    this.windowTexture.needsUpdate = true;
  }

  toggleCurtains() {
    this.isCurtainClosed = !this.isCurtainClosed;

    const targetScaleZ = this.isCurtainClosed ? 2.45 : 1.0;
    const targetOffsetZ = this.isCurtainClosed ? 0.38 : 0.68;

    this.curtainLeftGroup.scale.z = targetScaleZ;
    this.curtainLeftGroup.position.z = -targetOffsetZ;

    this.curtainRightGroup.scale.z = targetScaleZ;
    this.curtainRightGroup.position.z = targetOffsetZ;

    if (this.isCurtainClosed && this.hasMonsterAtWindow) {
      setTimeout(() => {
        this.setWindowMonster(false);
      }, 2500);
    }
  }

  setupDoor() {
    const doorGroup = new THREE.Group();
    doorGroup.position.set(0, 1.3, -3.35);

    // Steel door slab with PBR maps
    const doorMat = new THREE.MeshStandardMaterial({
      map: this.doorPBR.map,
      normalMap: this.doorPBR.normalMap,
      roughnessMap: this.doorPBR.roughnessMap,
      roughness: 0.55,
      metalness: 0.4
    });
    doorMat.normalScale.set(1.4, 1.4);

    this.doorMesh = new THREE.Mesh(new THREE.BoxGeometry(1.4, 2.6, 0.1), doorMat);
    this.doorMesh.receiveShadow = true;
    doorGroup.add(this.doorMesh);

    // 3D Sliding Steel Deadbolt
    const boltMat = new THREE.MeshStandardMaterial({ color: 0x9aa6ac, metalness: 0.85, roughness: 0.25 });
    this.doorBoltMesh = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.09, 0.07), boltMat);
    this.doorBoltMesh.position.set(-0.1, 0.1, 0.08);
    doorGroup.add(this.doorBoltMesh);

    // Heavy Industrial Steel Hinges
    const hingeMat = new THREE.MeshStandardMaterial({ color: 0x1f2224, metalness: 0.9, roughness: 0.3 });
    const hinge1 = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.14, 12), hingeMat);
    hinge1.position.set(-0.7, 0.8, 0.05);
    doorGroup.add(hinge1);

    const hinge2 = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.14, 12), hingeMat);
    hinge2.position.set(-0.7, -0.8, 0.05);
    doorGroup.add(hinge2);

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
    this.doorPBR = TextureGenerator.createDoorPBR(this.isDoorLatched);
    this.doorMesh.material.map = this.doorPBR.map;
    this.doorMesh.material.needsUpdate = true;
  }

  setupFuseBox() {
    const boxGroup = new THREE.Group();
    boxGroup.position.set(3.35, 1.6, 1.5);

    const boxMat = new THREE.MeshStandardMaterial({
      map: this.fuseBoxPBR.map,
      normalMap: this.fuseBoxPBR.normalMap,
      roughnessMap: this.fuseBoxPBR.roughnessMap,
      roughness: 0.48,
      metalness: 0.45
    });
    boxMat.normalScale.set(1.5, 1.5);

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
    this.fuseBoxPBR = TextureGenerator.createFuseBoxPBR(isSparking);
    this.fuseBoxMesh.material.map = this.fuseBoxPBR.map;
    this.fuseBoxMesh.material.needsUpdate = true;
    this.fuseSparkLight.intensity = isSparking ? 3.0 : 0;
  }

  setupDeskAndTerminal() {
    const deskGroup = new THREE.Group();
    deskGroup.position.set(2.6, 0, -1.0);

    // Contact shadows under desk pedestals & chair
    this.addContactShadow(2.6, 0.006, -1.0, 1.4, 2.2);
    this.addContactShadow(1.8, 0.006, -1.0, 0.8, 0.8);

    // Solid Wood Office Desk with drawers and edge bevels
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x4a2d16, roughness: 0.65, metalness: 0.1 });
    const top = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.08, 2.0), woodMat);
    top.position.y = 0.76;
    top.castShadow = true;
    top.receiveShadow = true;
    deskGroup.add(top);

    const ped1 = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.72, 0.5), woodMat);
    ped1.position.set(0, 0.36, -0.65);
    ped1.castShadow = true;
    deskGroup.add(ped1);

    const ped2 = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.72, 0.5), woodMat);
    ped2.position.set(0, 0.36, 0.65);
    ped2.castShadow = true;
    deskGroup.add(ped2);

    // Desk Leather Blotter Pad in front of player
    const blotterMat = new THREE.MeshStandardMaterial({ color: 0x221810, roughness: 0.9 });
    const blotter = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.01, 0.85), blotterMat);
    blotter.position.set(-0.15, 0.805, 0);
    deskGroup.add(blotter);

    // Confidential Folder "СОВЕРШЕННО СЕКРЕТНО"
    const folderMat = new THREE.MeshStandardMaterial({ color: 0xb58b54, roughness: 0.8 });
    const folder = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.02, 0.24), folderMat);
    folder.position.set(-0.2, 0.81, 0.55);
    folder.rotation.y = 0.2;
    deskGroup.add(folder);

    // Faceted Glass Ashtray with glowing cigarette stub
    const ashMat = new THREE.MeshStandardMaterial({ color: 0x8899aa, transparent: true, opacity: 0.6, roughness: 0.2 });
    const ashtray = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.05, 0.025, 12), ashMat);
    ashtray.position.set(-0.25, 0.815, -0.28);
    deskGroup.add(ashtray);

    // Cigarette stub
    const cigMat = new THREE.MeshBasicMaterial({ color: 0xff4400 });
    const cig = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.03, 6), cigMat);
    cig.rotation.z = Math.PI / 4;
    cig.position.set(-0.25, 0.83, -0.28);
    deskGroup.add(cig);

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
      roughness: 0.45
    });
    const phone = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.1, 0.24), phoneMat);
    phone.position.set(-0.25, 0.85, -0.6);
    phone.castShadow = true;
    deskGroup.add(phone);

    // Dedicated Physical 3D Desk Surveillance Monitor "ДОЗОР-4"
    const monMat = new THREE.MeshStandardMaterial({ color: 0x272c30, roughness: 0.6 });
    const monBody = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.34, 0.3), monMat);
    monBody.position.set(0.05, 0.97, 0.1);
    monBody.rotation.y = -Math.PI / 6;
    monBody.castShadow = true;
    deskGroup.add(monBody);

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
    // Contact shadow under sofa
    this.addContactShadow(-2.6, 0.006, 1.5, 1.3, 2.5);

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

  addContactShadow(x, y, z, width, depth) {
    const shadowTex = TextureGenerator.createContactShadowTexture();
    const shadowMat = new THREE.MeshBasicMaterial({
      map: shadowTex,
      transparent: true,
      opacity: 0.65,
      depthWrite: false
    });
    const shadowMesh = new THREE.Mesh(new THREE.PlaneGeometry(width, depth), shadowMat);
    shadowMesh.rotation.x = -Math.PI / 2;
    shadowMesh.position.set(x, y, z);
    this.scene.add(shadowMesh);
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
      color: 0xffeedd,
      size: 0.024,
      transparent: true,
      opacity: 0.45,
      blending: THREE.AdditiveBlending
    });

    this.dustParticles = new THREE.Points(geometry, material);
    this.scene.add(this.dustParticles);
  }

  setupSmokeParticles() {
    const smokeCount = 35;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(smokeCount * 3);
    this.smokeCoords = [];

    const origin = new THREE.Vector3(2.35, 0.83, -1.28); // On the ashtray

    for (let i = 0; i < smokeCount; i++) {
      const progress = i / smokeCount;
      positions[i * 3] = origin.x;
      positions[i * 3 + 1] = origin.y + progress * 0.4;
      positions[i * 3 + 2] = origin.z;

      this.smokeCoords.push({
        originX: origin.x,
        originY: origin.y,
        originZ: origin.z,
        progress: progress,
        driftSpeed: 0.15 + Math.random() * 0.1,
        swayPhase: Math.random() * Math.PI * 2
      });
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const smokeMat = new THREE.PointsMaterial({
      map: TextureGenerator.createSmokeParticleTexture(),
      size: 0.06,
      transparent: true,
      opacity: 0.35,
      depthWrite: false,
      blending: THREE.NormalBlending
    });

    this.smokeParticles = new THREE.Points(geometry, smokeMat);
    this.scene.add(this.smokeParticles);
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

    // 2. Cigarette Smoke wisps
    if (this.smokeParticles && this.smokeCoords) {
      const posAttr = this.smokeParticles.geometry.attributes.position;
      const arr = posAttr.array;

      for (let i = 0; i < this.smokeCoords.length; i++) {
        const s = this.smokeCoords[i];
        s.progress += delta * s.driftSpeed;
        if (s.progress > 1.0) s.progress -= 1.0;

        arr[i * 3] = s.originX + Math.sin(time * 2.0 + s.swayPhase) * (s.progress * 0.05);
        arr[i * 3 + 1] = s.originY + s.progress * 0.45;
        arr[i * 3 + 2] = s.originZ + Math.cos(time * 1.5 + s.swayPhase) * (s.progress * 0.05);
      }
      posAttr.needsUpdate = true;
    }

    // 3. Blackout & Chandelier Lighting logic
    if (this.isFuseSparking) {
      const flicker = Math.sin(time * 30.0) * Math.cos(time * 15.0);
      if (this.isBlackout) {
        // Complete blackout: chandelier shuts off completely!
        this.chandelierLight.intensity = 0.05;
        this.filamentMesh.material.color.setHex(0x221105);
        this.ambientLight.intensity = 0.12;
        if (this.volumetricCone) this.volumetricCone.material.opacity = 0;

        // Emergency Red beacon pulse
        const redPulse = Math.sin(time * 4.0) * 0.5 + 0.5;
        this.emergencyRedLight.intensity = 1.8 * redPulse;
      } else {
        this.chandelierLight.intensity = flicker > 0.25 ? 0.35 : 2.3;
        this.fuseSparkLight.intensity = Math.random() > 0.3 ? 3.5 : 0.3;
        this.emergencyRedLight.intensity = 0;
        if (this.volumetricCone) this.volumetricCone.material.opacity = 0.15;
      }
    } else {
      this.isBlackout = false;
      this.chandelierLight.intensity = 2.5;
      this.filamentMesh.material.color.setHex(0xffeedd);
      this.ambientLight.intensity = 0.72;
      this.emergencyRedLight.intensity = 0;
      if (this.volumetricCone) this.volumetricCone.material.opacity = 0.28;
    }

    // 4. TV Screen update when on
    if (this.isTVOn) {
      TextureGenerator.drawTVScreen(this.tvCanvas, true);
      this.tvTexture.needsUpdate = true;
      this.tvLight.intensity = 1.8 + Math.random() * 0.9;
    }

    // 5. Desk Surveillance Monitor Live Radar & Telemetry
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

    ctx.fillStyle = '#00ff66';
    ctx.font = 'bold 12px monospace';
    ctx.fillText(`СМЕНА: ${data.clock} / 06:00`, 10, 20);

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

    const sweepAngle = time * 2.5;
    ctx.strokeStyle = 'rgba(0, 255, 100, 0.7)';
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(sweepAngle) * 55, cy + Math.sin(sweepAngle) * 55);
    ctx.stroke();

    ctx.font = 'bold 10px monospace';
    const drawItem = (label, alert, y) => {
      ctx.fillStyle = alert ? '#ff2222' : '#00ff66';
      ctx.fillText(`${label}: ${alert ? 'ТРЕВОГА!' : 'НОРМА'}`, 14, y);
    };

    drawItem('ТВ [РУБИН]', data.anomalies.tv, 185);
    drawItem('ОКНО [САД]', data.anomalies.window, 202);
    drawItem('ДВЕРЬ [ПОСТ]', data.anomalies.door, 219);
    drawItem('СЕТЬ [220V]', data.anomalies.fuse, 236);

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
      this.ambientLight.intensity = 1.4;
    }

    if (this.chandelierLight) {
      this.chandelierLight.color.setHex(0xfff5e6);
      this.chandelierLight.intensity = 1.6;
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
