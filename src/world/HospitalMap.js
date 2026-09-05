import * as THREE from 'three';
import { TextureGenerator } from '../textures/TextureGenerator.js';

export class HospitalMap {
  constructor(scene) {
    this.scene = scene;
    this.interactives = [];
    this.colliders = [];
    this.monsterWaypoints = [];
    this.flickerLights = [];

    this.initMaterials();
    this.buildSanatorium();
  }

  initMaterials() {
    const wallTextures = TextureGenerator.createHospitalWall();
    this.wallMaterial = new THREE.MeshStandardMaterial({
      map: wallTextures.map,
      roughnessMap: wallTextures.roughnessMap,
      roughness: 0.8,
      metalness: 0.1
    });
    wallTextures.map.repeat.set(2, 1);
    wallTextures.roughnessMap.repeat.set(2, 1);

    const floorTextures = TextureGenerator.createHospitalFloor();
    this.floorMaterial = new THREE.MeshStandardMaterial({
      map: floorTextures.map,
      roughnessMap: floorTextures.roughnessMap,
      roughness: 0.6,
      metalness: 0.15
    });
    floorTextures.map.repeat.set(8, 16);
    floorTextures.roughnessMap.repeat.set(8, 16);

    const ceilingTex = TextureGenerator.createConcreteCeiling();
    ceilingTex.repeat.set(4, 10);
    this.ceilingMaterial = new THREE.MeshStandardMaterial({
      map: ceilingTex,
      roughness: 0.9,
      metalness: 0.05
    });

    const metalTex = TextureGenerator.createRustyMetal();
    this.metalMaterial = new THREE.MeshStandardMaterial({
      map: metalTex,
      roughness: 0.5,
      metalness: 0.6
    });
  }

  buildSanatorium() {
    // 1. Floors and Ceilings
    this.createFloorAndCeiling(0, 0, 5, 44);
    this.createFloorAndCeiling(-7, -8, 8, 10); // Ward 104 (start)
    this.createFloorAndCeiling(-7, 8, 8, 10);  // Treatment Room
    this.createFloorAndCeiling(7, -6, 8, 10);  // Doctor's Office
    this.createFloorAndCeiling(7, 8, 8, 10);   // Archive

    // 2. Main Corridor Walls
    this.createWallSegment(-2.5, -18, 0.4, 6);
    this.createDoorway(-2.5, -8, 'ПАЛАТА 104', '104', 'door-ward104');
    this.createWallSegment(-2.5, -2, 0.4, 6);
    this.createDoorway(-2.5, 8, 'ПРОЦЕДУРНАЯ', '102', 'door-treatment');
    this.createWallSegment(-2.5, 16, 0.4, 6);

    this.createWallSegment(2.5, -18, 0.4, 8);
    this.createDoorway(2.5, -6, 'ОРДИНАТОРСКАЯ', '101', 'door-office');
    this.createWallSegment(2.5, 2, 0.4, 6);
    this.createDoorway(2.5, 8, 'АРХИВ', '103', 'door-archive');
    this.createWallSegment(2.5, 16, 0.4, 6);

    // South End Collapsed Wall
    this.createWallSegment(0, -22, 5.4, 0.4);
    this.addRubbleDebris(0, -20.5);

    // North End Exit Gate
    this.createExitGateStructure(0, 22);

    // 3. Room Walls
    this.createWallSegment(-7, -13, 8, 0.4);
    this.createWallSegment(-11, -8, 0.4, 10);
    this.createWallSegment(-7, -3, 8, 0.4);

    this.createWallSegment(-7, 3, 8, 0.4);
    this.createWallSegment(-11, 8, 0.4, 10);
    this.createWallSegment(-7, 13, 8, 0.4);

    this.createWallSegment(7, -11, 8, 0.4);
    this.createWallSegment(11, -6, 0.4, 10);
    this.createWallSegment(7, -1, 8, 0.4);

    this.createWallSegment(7, 3, 8, 0.4);
    this.createWallSegment(11, 8, 0.4, 10);
    this.createWallSegment(7, 13, 8, 0.4);

    // 4. Props & Furniture
    this.setupWard104();
    this.setupDoctorOffice();
    this.setupArchive();
    this.setupTreatmentRoom();
    this.setupCorridorLightingAndProps();

    // 5. Monster Patrol Waypoints (Starts far away in the North wing!)
    this.monsterWaypoints = [
      new THREE.Vector3(0, 0, 16),   // North exit gate
      new THREE.Vector3(6, 0, 8),    // Archive
      new THREE.Vector3(0, 0, 8),    // Corridor North
      new THREE.Vector3(-6, 0, 8),   // Treatment room
      new THREE.Vector3(0, 0, 2),    // Corridor Mid
      new THREE.Vector3(6, 0, -6),   // Doctor's office
      new THREE.Vector3(0, 0, -6)    // Corridor South
    ];
  }

  createFloorAndCeiling(x, z, w, d) {
    const geo = new THREE.PlaneGeometry(w, d);

    const floor = new THREE.Mesh(geo, this.floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(x, 0, z);
    floor.receiveShadow = true;
    this.scene.add(floor);

    const ceiling = new THREE.Mesh(geo, this.ceilingMaterial);
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.set(x, 3.4, z);
    ceiling.receiveShadow = true;
    this.scene.add(ceiling);
  }

  createWallSegment(x, z, w, d) {
    const h = 3.4;
    const geo = new THREE.BoxGeometry(w, h, d);
    const wall = new THREE.Mesh(geo, this.wallMaterial);
    wall.position.set(x, h / 2, z);
    wall.castShadow = true;
    wall.receiveShadow = true;
    this.scene.add(wall);

    const halfW = w / 2 + 0.35;
    const halfD = d / 2 + 0.35;
    this.colliders.push({
      min: new THREE.Vector2(x - halfW, z - halfD),
      max: new THREE.Vector2(x + halfW, z + halfD)
    });
  }

  createDoorway(x, z, title, num, id) {
    const doorW = 1.4;
    const doorH = 2.6;
    const doorTex = TextureGenerator.createHospitalDoor(title, num);
    const doorMat = new THREE.MeshStandardMaterial({
      map: doorTex,
      roughness: 0.7,
      metalness: 0.2
    });

    const pivot = new THREE.Group();
    pivot.position.set(x, 0, z - doorW / 2);

    const doorMesh = new THREE.Mesh(new THREE.BoxGeometry(0.08, doorH, doorW), doorMat);
    doorMesh.position.set(0, doorH / 2, doorW / 2);
    doorMesh.castShadow = true;
    doorMesh.receiveShadow = true;
    pivot.add(doorMesh);
    this.scene.add(pivot);

    const lintelH = 3.4 - doorH;
    const lintel = new THREE.Mesh(new THREE.BoxGeometry(0.4, lintelH, doorW), this.wallMaterial);
    lintel.position.set(x, doorH + lintelH / 2, z);
    this.scene.add(lintel);

    const interactive = {
      id,
      type: 'door',
      mesh: pivot,
      promptText: 'Открыть дверь',
      isOpen: false,
      position: new THREE.Vector3(x, 1.2, z),
      onInteract: () => {
        interactive.isOpen = !interactive.isOpen;
        interactive.promptText = interactive.isOpen ? 'Закрыть дверь' : 'Открыть дверь';
        pivot.rotation.y = interactive.isOpen ? -Math.PI / 2 : 0;
      }
    };

    this.interactives.push(interactive);
  }

  createExitGateStructure(x, z) {
    const w = 4.8;
    const h = 3.4;
    const gateTex = TextureGenerator.createExitGate();
    const gateMat = new THREE.MeshStandardMaterial({
      map: gateTex,
      roughness: 0.6,
      metalness: 0.7
    });

    const gateMesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.4), gateMat);
    gateMesh.position.set(x, h / 2, z);
    gateMesh.castShadow = true;
    gateMesh.receiveShadow = true;
    this.scene.add(gateMesh);

    const redLight = new THREE.PointLight(0xff3322, 2.0, 8, 2);
    redLight.position.set(x, 3.1, z - 0.6);
    this.scene.add(redLight);

    const exitSignGeo = new THREE.BoxGeometry(0.8, 0.3, 0.15);
    const exitSignMat = new THREE.MeshBasicMaterial({ color: 0xff4433 });
    const exitSign = new THREE.Mesh(exitSignGeo, exitSignMat);
    exitSign.position.set(x, 3.1, z - 0.2);
    this.scene.add(exitSign);

    this.colliders.push({
      min: new THREE.Vector2(x - w / 2 - 0.35, z - 0.5),
      max: new THREE.Vector2(x + w / 2 + 0.35, z + 0.5)
    });

    this.interactives.push({
      id: 'main-exit-gate',
      type: 'exit',
      mesh: gateMesh,
      promptText: 'Эвакуационный гермозатвор [Нужны 3 предмета]',
      position: new THREE.Vector3(x, 1.4, z - 1.2)
    });
  }

  createLocker(x, z, rotY = 0) {
    const w = 1.0;
    const h = 2.4;
    const d = 0.9;

    const lockerGroup = new THREE.Group();
    lockerGroup.position.set(x, 0, z);
    lockerGroup.rotation.y = rotY;

    const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), this.metalMaterial);
    body.position.y = h / 2;
    body.castShadow = true;
    body.receiveShadow = true;
    lockerGroup.add(body);

    const slitMat = new THREE.MeshBasicMaterial({ color: 0x050505 });
    for (let i = 0; i < 4; i++) {
      const slit = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.04, 0.02), slitMat);
      slit.position.set(0, 1.6 + i * 0.1, d / 2 + 0.01);
      lockerGroup.add(slit);
    }

    this.scene.add(lockerGroup);

    this.colliders.push({
      min: new THREE.Vector2(x - w / 2 - 0.2, z - d / 2 - 0.2),
      max: new THREE.Vector2(x + w / 2 + 0.2, z + d / 2 + 0.2)
    });

    this.interactives.push({
      id: `locker-${x}-${z}`,
      type: 'locker',
      mesh: lockerGroup,
      promptText: 'Спрятаться в шкафу',
      position: new THREE.Vector3(x, 1.2, z)
    });
  }

  setupWard104() {
    // Starting hospital bed
    const bedGroup = new THREE.Group();
    bedGroup.position.set(-8, 0, -10);

    const frame = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.6, 2.4), this.metalMaterial);
    frame.position.y = 0.3;
    frame.castShadow = true;
    bedGroup.add(frame);

    const matMat = new THREE.MeshStandardMaterial({ color: 0x908980, roughness: 0.85 });
    const mattress = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.25, 2.3), matMat);
    mattress.position.y = 0.65;
    bedGroup.add(mattress);

    const pillow = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.15, 0.5), matMat);
    pillow.position.set(0, 0.8, -0.8);
    bedGroup.add(pillow);

    this.scene.add(bedGroup);

    // Bedside Nightstand
    const stand = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.8, 0.8), this.metalMaterial);
    stand.position.set(-6.5, 0.4, -10.5);
    stand.castShadow = true;
    this.scene.add(stand);

    // Warm table/wall lamp in Ward 104 so the starting room is clearly visible & atmospheric
    const lampGeo = new THREE.CylinderGeometry(0.08, 0.14, 0.2, 10);
    const lampMat = new THREE.MeshBasicMaterial({ color: 0xffeebb });
    const lamp = new THREE.Mesh(lampGeo, lampMat);
    lamp.position.set(-6.5, 0.9, -10.5);
    this.scene.add(lamp);

    const roomLight = new THREE.PointLight(0xffe8c0, 1.8, 12, 1.6);
    roomLight.position.set(-6.5, 1.5, -10.5);
    this.scene.add(roomLight);

    // Flashlight resting on nightstand
    const torchGeo = new THREE.CylinderGeometry(0.04, 0.06, 0.24, 12);
    const torchMat = new THREE.MeshStandardMaterial({ color: 0x222222, metalness: 0.8, roughness: 0.3 });
    const torchMesh = new THREE.Mesh(torchGeo, torchMat);
    torchMesh.rotation.z = Math.PI / 2;
    torchMesh.position.set(-6.2, 0.88, -10.3);
    this.scene.add(torchMesh);

    this.interactives.push({
      id: 'item-flashlight',
      type: 'flashlight',
      mesh: torchMesh,
      promptText: 'Взять фонарик',
      position: new THREE.Vector3(-6.2, 0.9, -10.3)
    });

    this.createLocker(-10, -4, Math.PI / 2);
  }

  setupDoctorOffice() {
    const desk = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.85, 1.2), this.metalMaterial);
    desk.position.set(7, 0.42, -6);
    desk.castShadow = true;
    this.scene.add(desk);

    const chair = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.9, 0.6), this.metalMaterial);
    chair.position.set(7, 0.45, -7.2);
    this.scene.add(chair);

    const cabinet = new THREE.Mesh(new THREE.BoxGeometry(1.0, 2.0, 0.6), this.metalMaterial);
    cabinet.position.set(10.2, 1.0, -9.5);
    cabinet.castShadow = true;
    this.scene.add(cabinet);

    // Doctor Office Lamp
    const officeLight = new THREE.PointLight(0xfff0d0, 1.4, 10, 2);
    officeLight.position.set(7, 2.0, -6);
    this.scene.add(officeLight);

    this.createLocker(10.2, -3, -Math.PI / 2);

    const cardGeo = new THREE.BoxGeometry(0.2, 0.02, 0.3);
    const cardMat = new THREE.MeshStandardMaterial({ color: 0x3182ce, roughness: 0.4, metalness: 0.3 });
    const cardMesh = new THREE.Mesh(cardGeo, cardMat);
    cardMesh.position.set(6.8, 0.87, -6);
    this.scene.add(cardMesh);

    this.interactives.push({
      id: 'quest-keycard',
      type: 'item',
      itemKey: 'keycard',
      mesh: cardMesh,
      promptText: 'Взять: Ключ-карта дежурного',
      position: new THREE.Vector3(6.8, 0.87, -6)
    });

    this.createBatteryItem(7.4, 0.87, -5.8);
  }

  setupArchive() {
    for (let r = 0; r < 2; r++) {
      const shelf = new THREE.Mesh(new THREE.BoxGeometry(4.0, 2.4, 0.7), this.metalMaterial);
      shelf.position.set(7.5, 1.2, 5.5 + r * 3.5);
      shelf.castShadow = true;
      this.scene.add(shelf);
    }

    const xrayTex = TextureGenerator.createXRayTexture();
    const boxMat = new THREE.MeshBasicMaterial({ map: xrayTex });
    const xrayBox = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.4, 0.1), boxMat);
    xrayBox.position.set(10.9, 1.8, 8);
    this.scene.add(xrayBox);

    const xrayLight = new THREE.PointLight(0x7ed6df, 1.8, 8, 2);
    xrayLight.position.set(10.2, 1.8, 8);
    this.scene.add(xrayLight);

    this.createLocker(4.5, 12, 0);

    const ampGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.2, 8);
    const ampMat = new THREE.MeshStandardMaterial({
      color: 0xffdd55,
      roughness: 0.1,
      metalness: 0.8,
      transparent: true,
      opacity: 0.85
    });
    const ampMesh = new THREE.Mesh(ampGeo, ampMat);
    ampMesh.position.set(8.5, 1.3, 5.5);
    this.scene.add(ampMesh);

    this.interactives.push({
      id: 'quest-ampoule',
      type: 'item',
      itemKey: 'ampoule',
      mesh: ampMesh,
      promptText: 'Взять: Ампула реанимации',
      position: new THREE.Vector3(8.5, 1.3, 5.5)
    });
  }

  setupTreatmentRoom() {
    const gurney = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.8, 2.6), this.metalMaterial);
    gurney.position.set(-7, 0.4, 8);
    gurney.castShadow = true;
    this.scene.add(gurney);

    const trolley = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.9, 1.0), this.metalMaterial);
    trolley.position.set(-9.8, 0.45, 11);
    this.scene.add(trolley);

    // Treatment Room Lamp
    const treatLight = new THREE.PointLight(0xd5eff5, 1.5, 10, 2);
    treatLight.position.set(-7, 2.5, 8);
    this.scene.add(treatLight);

    this.createLocker(-10, 4, Math.PI / 2);

    const casTex = TextureGenerator.createCassetteTexture();
    const casMat = new THREE.MeshStandardMaterial({ map: casTex, roughness: 0.4 });
    const casMesh = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.04, 0.16), casMat);
    casMesh.position.set(-7, 0.84, 8);
    this.scene.add(casMesh);

    this.interactives.push({
      id: 'quest-cassette',
      type: 'item',
      itemKey: 'cassette',
      mesh: casMesh,
      promptText: 'Взять: Аудиокассета №3 [Свидетельство]',
      position: new THREE.Vector3(-7, 0.84, 8)
    });

    this.createBatteryItem(-9.8, 0.92, 11);
  }

  createBatteryItem(x, y, z) {
    const batGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.14, 8);
    const batMat = new THREE.MeshStandardMaterial({ color: 0xcca300, metalness: 0.7, roughness: 0.3 });
    const batMesh = new THREE.Mesh(batGeo, batMat);
    batMesh.position.set(x, y, z);
    this.scene.add(batMesh);

    this.interactives.push({
      id: `battery-${x}-${z}`,
      type: 'item',
      itemKey: 'battery',
      mesh: batMesh,
      promptText: 'Взять: Батарейка "Крона"',
      position: new THREE.Vector3(x, y, z)
    });
  }

  addRubbleDebris(x, z) {
    const rubbleMat = new THREE.MeshStandardMaterial({ color: 0x4a4742, roughness: 0.9 });
    for (let i = 0; i < 12; i++) {
      const rx = (Math.random() - 0.5) * 4;
      const rz = (Math.random() - 0.5) * 2;
      const scale = 0.4 + Math.random() * 0.8;
      const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(scale, 0), rubbleMat);
      rock.position.set(x + rx, scale / 2, z + rz);
      rock.rotation.set(Math.random(), Math.random(), Math.random());
      rock.castShadow = true;
      this.scene.add(rock);
    }
    this.colliders.push({
      min: new THREE.Vector2(x - 2.5, z - 1.5),
      max: new THREE.Vector2(x + 2.5, z + 1.5)
    });
  }

  setupCorridorLightingAndProps() {
    const lightZPositions = [-12, 0, 12];
    lightZPositions.forEach((lz, idx) => {
      const fixGeo = new THREE.BoxGeometry(0.3, 0.1, 1.8);
      const fixMat = new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.8 });
      const fixture = new THREE.Mesh(fixGeo, fixMat);
      fixture.position.set(0, 3.35, lz);
      this.scene.add(fixture);

      const bulbGeo = new THREE.CylinderGeometry(0.04, 0.04, 1.7, 8);
      const bulbMat = new THREE.MeshBasicMaterial({ color: 0xeeffff });
      const bulb = new THREE.Mesh(bulbGeo, bulbMat);
      bulb.rotation.x = Math.PI / 2;
      bulb.position.set(0, 3.28, lz);
      this.scene.add(bulb);

      const pointLight = new THREE.PointLight(0xd5eff5, 1.5, 11, 2);
      pointLight.position.set(0, 3.0, lz);
      this.scene.add(pointLight);

      this.flickerLights.push({
        light: pointLight,
        baseIntensity: 1.5,
        mesh: bulb
      });
    });

    // Elevated ambient light so shadows are soft navy/gray, completely readable!
    const ambientLight = new THREE.AmbientLight(0x202b33, 0.7);
    this.scene.add(ambientLight);
  }

  updateFlicker(time, onPop) {
    this.flickerLights.forEach((item, idx) => {
      const noiseVal = Math.sin(time * 8.0 + idx * 3.7) * Math.cos(time * 16.0 + idx);
      const isFlickering = noiseVal > 0.90;

      if (isFlickering) {
        item.light.intensity = item.baseIntensity * 0.35;
        item.mesh.material.color.setHex(0x556666);
        if (Math.random() > 0.97 && onPop) {
          onPop();
        }
      } else {
        item.light.intensity = item.baseIntensity;
        item.mesh.material.color.setHex(0xeeffff);
      }
    });
  }
}
