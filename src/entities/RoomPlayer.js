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

    // Subtle immersive head bobbing
    this.headBobTimer = 0;
    this.baseCameraY = 1.7;

    this.setupDesktopInputs();
  }

  setupDesktopInputs() {
    window.addEventListener('keydown', (e) => {
      this.keys[e.code] = true;
    });

    window.addEventListener('keyup', (e) => {
      this.keys[e.code] = false;
    });

    window.addEventListener('mousemove', (e) => {
      if (document.pointerLockElement) {
        this.yaw -= e.movementX * this.mouseSensitivity;
        this.pitch -= e.movementY * this.mouseSensitivity;
        this.pitch = Math.max(-Math.PI * 0.42, Math.min(Math.PI * 0.42, this.pitch));
      }
    });
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

    // Head bob calculation
    const currentSpeed = this.velocity.length();
    if (currentSpeed > 0.3) {
      this.headBobTimer += delta * 9;
      this.position.y = this.baseCameraY + Math.sin(this.headBobTimer) * 0.03;
    } else {
      this.position.y = THREE.MathUtils.lerp(this.position.y, this.baseCameraY, delta * 8);
    }

    this.camera.position.copy(this.position);
    this.camera.rotation.set(this.pitch, this.yaw, 0, 'YXZ');
  }
}
