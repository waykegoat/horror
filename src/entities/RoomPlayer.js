import * as THREE from 'three';

export class RoomPlayer {
  constructor(camera) {
    this.camera = camera;
    this.position = new THREE.Vector3(0, 1.7, 0); // Start in center of room
    this.camera.position.copy(this.position);

    this.yaw = 0;
    this.pitch = 0;
    this.moveSpeed = 3.4;
    this.velocity = new THREE.Vector3();

    this.keys = {};
    this.mouseSensitivity = 0.0022;

    // Mobile touch input support
    this.touchMove = new THREE.Vector2(0, 0);

    // Camera bobbing & trauma shake
    this.headBobTimer = 0;
    this.baseCameraY = 1.7;
    this.shakeIntensity = 0;

    this.onMouseMove = null;
    this.onFlashlightToggle = null;
    this.onFootstep = null;

    // Tactical Handheld Spotlight Flashlight
    this.isFlashlightOn = false;
    this.flashlight = new THREE.SpotLight(0xffeedd, 0, 14, Math.PI / 6.5, 0.45, 1.8);
    this.flashlight.position.set(0.16, -0.14, -0.05);
    this.flashlight.target.position.set(0, 0, -5);
    this.flashlight.castShadow = true;
    this.flashlight.shadow.mapSize.width = 1024;
    this.flashlight.shadow.mapSize.height = 1024;
    this.flashlight.shadow.bias = -0.001;

    this.camera.add(this.flashlight);
    this.camera.add(this.flashlight.target);

    this.setupDesktopInputs();
  }

  toggleFlashlight() {
    this.isFlashlightOn = !this.isFlashlightOn;
    this.flashlight.intensity = this.isFlashlightOn ? 3.2 : 0;
    if (this.onFlashlightToggle) {
      this.onFlashlightToggle(this.isFlashlightOn);
    }
    return this.isFlashlightOn;
  }

  setupDesktopInputs() {
    window.addEventListener('keydown', (e) => {
      this.keys[e.code] = true;
      if (e.code === 'KeyF') {
        this.toggleFlashlight();
      }
    });

    window.addEventListener('keyup', (e) => {
      this.keys[e.code] = false;
    });

    window.addEventListener('mousemove', (e) => {
      if (document.pointerLockElement) {
        this.yaw -= e.movementX * this.mouseSensitivity;
        this.pitch -= e.movementY * this.mouseSensitivity;
        this.pitch = Math.max(-Math.PI * 0.42, Math.min(Math.PI * 0.42, this.pitch));

        if (this.onMouseMove) {
          this.onMouseMove(e.movementX, e.movementY);
        }
      }
    });
  }

  triggerCameraShake(amount) {
    this.shakeIntensity = Math.min(1.0, this.shakeIntensity + amount);
  }

  update(delta) {
    const forward = new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw)).normalize();
    const right = new THREE.Vector3(Math.cos(this.yaw), 0, -Math.sin(this.yaw)).normalize();

    let inputX = 0;
    let inputZ = 0;

    // Keyboard inputs
    if (this.keys['KeyW'] || this.keys['ArrowUp']) inputZ += 1;
    if (this.keys['KeyS'] || this.keys['ArrowDown']) inputZ -= 1;
    if (this.keys['KeyA'] || this.keys['ArrowLeft']) inputX -= 1;
    if (this.keys['KeyD'] || this.keys['ArrowRight']) inputX += 1;

    // Mobile touch inputs
    if (Math.abs(this.touchMove.x) > 0.05) inputX += this.touchMove.x;
    if (Math.abs(this.touchMove.y) > 0.05) inputZ += this.touchMove.y;

    const moveDir = new THREE.Vector3();
    moveDir.addScaledVector(forward, inputZ);
    moveDir.addScaledVector(right, inputX);

    const speedSq = moveDir.lengthSq();
    if (speedSq > 1) {
      moveDir.normalize();
    }

    const targetVelocity = moveDir.multiplyScalar(this.moveSpeed);
    this.velocity.lerp(targetVelocity, Math.min(1, delta * 12));

    this.position.addScaledVector(this.velocity, delta);

    // Keep player strictly inside the room boundaries [-2.6, 2.6]
    this.position.x = Math.max(-2.6, Math.min(2.6, this.position.x));
    this.position.z = Math.max(-2.6, Math.min(2.6, this.position.z));

    // Head bob calculation and rhythmic footstep trigger
    const currentSpeed = this.velocity.length();
    if (currentSpeed > 0.35) {
      const prevSine = Math.sin(this.headBobTimer);
      this.headBobTimer += delta * 8.5;
      const curSine = Math.sin(this.headBobTimer);
      this.position.y = this.baseCameraY + curSine * 0.035;

      // Trigger footstep creak on downward impact
      if (prevSine > -0.65 && curSine <= -0.65) {
        if (this.onFootstep) {
          this.onFootstep();
        }
      }
    } else {
      this.position.y = THREE.MathUtils.lerp(this.position.y, this.baseCameraY, delta * 8);
    }

    // Camera shake decay
    let shakeX = 0;
    let shakeY = 0;
    if (this.shakeIntensity > 0.001) {
      shakeX = (Math.random() - 0.5) * 0.08 * this.shakeIntensity;
      shakeY = (Math.random() - 0.5) * 0.08 * this.shakeIntensity;
      this.shakeIntensity = THREE.MathUtils.lerp(this.shakeIntensity, 0, delta * 4.0);
    }

    this.camera.position.set(
      this.position.x + shakeX,
      this.position.y + shakeY,
      this.position.z
    );
    this.camera.rotation.set(this.pitch + shakeY * 0.5, this.yaw + shakeX * 0.5, 0, 'YXZ');
  }
}
