import * as THREE from 'three';

export class Player {
  constructor(camera, scene, audio) {
    this.camera = camera;
    this.audio = audio;
    this.position = new THREE.Vector3(-7.5, 1.7, -9.5); // Center of Ward 104
    this.camera.position.copy(this.position);

    // Initial orientation: facing into the room and table
    this.yaw = -Math.PI * 0.35;
    this.pitch = -0.15; // looking slightly down at the nightstand and room

    // Speeds
    this.moveSpeed = 3.4;
    this.sprintSpeed = 5.8;
    this.crouchSpeed = 1.8;
    this.velocity = new THREE.Vector3();

    // Heights
    this.standHeight = 1.7;
    this.crouchHeight = 0.95;
    this.currentHeight = 1.7;

    // Bobbing & steps
    this.bobCycle = 0;
    this.lastStepCycle = 0;

    // States
    this.isSprinting = false;
    this.isCrouching = false;
    this.isHiding = false;
    this.hidingLockerPos = null;

    this.stamina = 100;
    this.maxStamina = 100;

    // Flashlight
    this.hasFlashlight = true;
    this.isFlashlightOn = true;
    this.battery = 100;

    // Inputs
    this.keys = {};
    this.mouseSensitivity = 0.0022;
    this.touchMove = new THREE.Vector2(0, 0);

    // Flashlight: wide, bright, soft-edged halogen beam
    this.flashlight = new THREE.SpotLight(0xfffaea, 2.8, 25, Math.PI / 4, 0.7, 1.4);
    this.flashlight.castShadow = true;
    this.flashlight.shadow.mapSize.width = 1024;
    this.flashlight.shadow.mapSize.height = 1024;
    this.flashlight.shadow.camera.near = 0.2;
    this.flashlight.shadow.camera.far = 25;

    this.flashlightTarget = new THREE.Object3D();
    scene.add(this.flashlightTarget);
    this.flashlight.target = this.flashlightTarget;
    scene.add(this.flashlight);

    this.setupDesktopInputs();
  }

  setupDesktopInputs() {
    window.addEventListener('keydown', (e) => {
      this.keys[e.code] = true;

      if (e.code === 'KeyF' && this.hasFlashlight && !this.isHiding) {
        this.toggleFlashlight();
      }

      if (e.code === 'KeyC') {
        this.isCrouching = !this.isCrouching;
      }
    });

    window.addEventListener('keyup', (e) => {
      this.keys[e.code] = false;
    });

    window.addEventListener('mousemove', (e) => {
      if (document.pointerLockElement && !this.isHiding) {
        this.yaw -= e.movementX * this.mouseSensitivity;
        this.pitch -= e.movementY * this.mouseSensitivity;
        this.pitch = Math.max(-Math.PI * 0.44, Math.min(Math.PI * 0.44, this.pitch));
      }
    });
  }

  toggleFlashlight() {
    if (!this.hasFlashlight || this.battery <= 0) return;
    this.isFlashlightOn = !this.isFlashlightOn;
    this.audio.playFlashlightClick();
  }

  addBattery(amount = 40) {
    this.battery = Math.min(100, this.battery + amount);
    this.audio.playItemPickup();
  }

  enterHiding(lockerPos) {
    this.isHiding = true;
    this.hidingLockerPos = lockerPos.clone();
    if (this.isFlashlightOn) {
      this.isFlashlightOn = false;
    }
  }

  exitHiding() {
    this.isHiding = false;
    this.hidingLockerPos = null;
  }

  update(delta, colliders) {
    if (this.isHiding && this.hidingLockerPos) {
      this.position.set(this.hidingLockerPos.x, this.standHeight, this.hidingLockerPos.z);
      this.camera.position.copy(this.position);
      this.camera.rotation.set(0, this.yaw, 0, 'YXZ');
      this.flashlight.intensity = 0;
      return;
    }

    const wantSprint = (this.keys['ShiftLeft'] || this.keys['ShiftRight']) && !this.isCrouching && this.stamina > 5;
    this.isSprinting = wantSprint;

    if (this.isSprinting && (this.velocity.lengthSq() > 0.1)) {
      this.stamina = Math.max(0, this.stamina - delta * 20);
    } else {
      this.stamina = Math.min(this.maxStamina, this.stamina + delta * 12);
    }

    const targetHeight = (this.isCrouching || this.keys['ControlLeft'] || this.keys['ControlRight']) ? this.crouchHeight : this.standHeight;
    this.currentHeight += (targetHeight - this.currentHeight) * Math.min(1, delta * 10);

    const forward = new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw)).normalize();
    const right = new THREE.Vector3(Math.cos(this.yaw), 0, -Math.sin(this.yaw)).normalize();

    let inputX = 0;
    let inputZ = 0;

    if (this.keys['KeyW'] || this.keys['ArrowUp']) inputZ += 1;
    if (this.keys['KeyS'] || this.keys['ArrowDown']) inputZ -= 1;
    if (this.keys['KeyA'] || this.keys['ArrowLeft']) inputX -= 1;
    if (this.keys['KeyD'] || this.keys['ArrowRight']) inputX += 1;

    inputX += this.touchMove.x;
    inputZ += this.touchMove.y;

    const moveDir = new THREE.Vector3();
    moveDir.addScaledVector(forward, inputZ);
    moveDir.addScaledVector(right, inputX);

    if (moveDir.lengthSq() > 1) {
      moveDir.normalize();
    }

    let speed = this.moveSpeed;
    if (this.isSprinting) speed = this.sprintSpeed;
    else if (this.isCrouching) speed = this.crouchSpeed;

    const targetVelocity = moveDir.clone().multiplyScalar(speed);
    this.velocity.lerp(targetVelocity, Math.min(1, delta * 14));

    const newPos = this.position.clone();
    const displacement = this.velocity.clone().multiplyScalar(delta);

    newPos.x += displacement.x;
    if (!this.checkCollisions(newPos.x, this.position.z, colliders)) {
      this.position.x = newPos.x;
    }

    newPos.z += displacement.z;
    if (!this.checkCollisions(this.position.x, newPos.z, colliders)) {
      this.position.z = newPos.z;
    }

    const horizontalSpeed = Math.sqrt(this.velocity.x * this.velocity.x + this.velocity.z * this.velocity.z);
    if (horizontalSpeed > 0.3) {
      const bobFreq = this.isSprinting ? 14 : (this.isCrouching ? 6 : 9.5);
      this.bobCycle += delta * bobFreq;

      const bobY = Math.sin(this.bobCycle) * (this.isSprinting ? 0.08 : 0.04);
      const bobX = Math.cos(this.bobCycle * 0.5) * 0.025;

      this.camera.position.set(this.position.x + bobX, this.currentHeight + bobY, this.position.z);

      if (Math.sin(this.bobCycle) < -0.92 && (this.bobCycle - this.lastStepCycle) > 1.8) {
        this.lastStepCycle = this.bobCycle;
        this.audio.playFootstep(this.isSprinting, this.isCrouching);
      }
    } else {
      this.bobCycle = 0;
      this.camera.position.set(this.position.x, this.currentHeight, this.position.z);
    }

    this.camera.rotation.set(this.pitch, this.yaw, 0, 'YXZ');
    this.updateFlashlight(delta);
  }

  checkCollisions(x, z, colliders) {
    const radius = 0.35;
    for (const c of colliders) {
      if (x + radius > c.min.x && x - radius < c.max.x &&
          z + radius > c.min.y && z - radius < c.max.y) {
        return true;
      }
    }
    return false;
  }

  updateFlashlight(delta) {
    if (!this.hasFlashlight || !this.isFlashlightOn || this.battery <= 0) {
      this.flashlight.intensity = 0;
      return;
    }

    this.battery = Math.max(0, this.battery - delta * 0.33);

    const camDir = new THREE.Vector3();
    this.camera.getWorldDirection(camDir);

    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(this.camera.quaternion);
    const down = new THREE.Vector3(0, -1, 0).applyQuaternion(this.camera.quaternion);

    const torchPos = this.camera.position.clone()
      .addScaledVector(right, 0.2)
      .addScaledVector(down, 0.15)
      .addScaledVector(camDir, 0.2);

    this.flashlight.position.copy(torchPos);

    const targetPos = this.camera.position.clone().addScaledVector(camDir, 10);
    this.flashlightTarget.position.copy(targetPos);

    let flicker = 1.0;
    if (this.battery < 20) {
      flicker = Math.random() > 0.3 ? 0.4 + Math.random() * 0.6 : 0.1;
    }
    this.flashlight.intensity = 2.8 * flicker * (Math.max(0.3, this.battery / 100));
  }
}
