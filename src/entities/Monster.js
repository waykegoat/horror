import * as THREE from 'three';

export class Monster {
  constructor(scene, waypoints, player, audio) {
    this.scene = scene;
    this.waypoints = waypoints;
    this.player = player;
    this.audio = audio;

    // Start at waypoint 0 (North wing, far away)
    this.position = waypoints[0].clone();
    this.targetPos = waypoints[1].clone();
    this.state = 'PATROL';

    this.group = new THREE.Group();
    this.group.position.copy(this.position);

    this.currentWaypointIndex = 0;
    this.patrolSpeed = 1.6; // Calm, steady menacing patrol
    this.chaseSpeed = 4.4;
    this.currentSpeed = 1.6;

    this.stateTimer = 0;
    this.stepTimer = 0;
    this.twitchTimer = 0;
    this.hasScreechedInChase = false;

    // Procedural Horror Model Construction
    const skinMat = new THREE.MeshStandardMaterial({
      color: 0x3d4447,
      roughness: 0.9,
      metalness: 0.1
    });

    this.torso = new THREE.Mesh(new THREE.BoxGeometry(0.5, 1.1, 0.25), skinMat);
    this.torso.position.y = 1.65;
    this.torso.castShadow = true;
    this.group.add(this.torso);

    this.head = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.42, 0.35), skinMat);
    this.head.position.set(0, 2.4, 0.05);
    this.head.castShadow = true;
    this.group.add(this.head);

    const eyeMat = new THREE.MeshBasicMaterial({ color: 0xeeffff });
    const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 8), eyeMat);
    eyeL.position.set(-0.09, 2.45, 0.23);
    const eyeR = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 8), eyeMat);
    eyeR.position.set(0.09, 2.45, 0.23);
    this.group.add(eyeL);
    this.group.add(eyeR);

    this.eyeLights = new THREE.PointLight(0xddeeff, 1.0, 5, 2);
    this.eyeLights.position.set(0, 2.45, 0.3);
    this.group.add(this.eyeLights);

    const armGeo = new THREE.BoxGeometry(0.12, 1.3, 0.12);
    this.leftArm = new THREE.Mesh(armGeo, skinMat);
    this.leftArm.position.set(-0.35, 1.4, 0);
    this.leftArm.castShadow = true;
    this.group.add(this.leftArm);

    this.rightArm = new THREE.Mesh(armGeo, skinMat);
    this.rightArm.position.set(0.35, 1.4, 0);
    this.rightArm.castShadow = true;
    this.group.add(this.rightArm);

    const legGeo = new THREE.BoxGeometry(0.14, 1.2, 0.14);
    this.leftLeg = new THREE.Mesh(legGeo, skinMat);
    this.leftLeg.position.set(-0.16, 0.6, 0);
    this.leftLeg.castShadow = true;
    this.group.add(this.leftLeg);

    this.rightLeg = new THREE.Mesh(legGeo, skinMat);
    this.rightLeg.position.set(0.16, 0.6, 0);
    this.rightLeg.castShadow = true;
    this.group.add(this.rightLeg);

    scene.add(this.group);
  }

  update(delta, onPlayerCaught) {
    const distToPlayer = this.position.distanceTo(this.player.position);

    this.evaluatePlayerSensory(distToPlayer);

    switch (this.state) {
      case 'PATROL':
        this.currentSpeed = this.patrolSpeed;
        this.moveTowardsTarget(delta);
        if (this.position.distanceTo(this.targetPos) < 1.0) {
          this.pickNextWaypoint();
        }
        break;

      case 'INVESTIGATE':
        this.currentSpeed = this.patrolSpeed * 1.15;
        this.moveTowardsTarget(delta);
        this.stateTimer -= delta;
        if (this.stateTimer <= 0 || this.position.distanceTo(this.targetPos) < 1.5) {
          this.state = 'PATROL';
          this.pickNextWaypoint();
        }
        break;

      case 'CHASE':
        this.currentSpeed = this.chaseSpeed;
        this.targetPos.copy(this.player.position);
        this.moveTowardsTarget(delta);

        // If player hid inside locker
        if (this.player.isHiding) {
          this.state = 'SEARCH';
          this.stateTimer = 5.0;
          this.hasScreechedInChase = false;
        } else if (distToPlayer < 1.4) {
          onPlayerCaught();
        }
        break;

      case 'SEARCH':
        this.currentSpeed = 0.8;
        this.stateTimer -= delta;
        if (this.stateTimer <= 0) {
          this.state = 'PATROL';
          this.pickNextWaypoint();
        }
        break;
    }

    // Only step sound when moving
    this.stepTimer += delta * (this.currentSpeed / 2.0);
    if (this.stepTimer > 0.75) {
      this.stepTimer = 0;
      this.audio.playMonsterStep(distToPlayer);
    }

    this.animateMonster(delta);
  }

  evaluatePlayerSensory(distToPlayer) {
    if (this.player.isHiding) {
      return;
    }

    // Vision: only if facing player and player is in front
    const toPlayer = this.player.position.clone().sub(this.position).normalize();
    const monsterForward = new THREE.Vector3(0, 0, 1).applyQuaternion(this.group.quaternion);
    const dot = monsterForward.dot(toPlayer);

    // If player's flashlight is on, monster can see beam from further away
    let visualRange = 10.0;
    if (this.player.isFlashlightOn) {
      visualRange = 18.0;
    } else if (this.player.isCrouching) {
      visualRange = 4.5;
    }

    // Vision cone (dot > 0.4 = ~65 degree cone)
    if (dot > 0.4 && distToPlayer < visualRange) {
      this.triggerChase();
      return;
    }

    // Hearing: only if player is sprinting and within 9 meters
    if (this.player.isSprinting && distToPlayer < 9.0) {
      this.investigatePosition(this.player.position);
    }
  }

  triggerChase() {
    if (this.state !== 'CHASE') {
      this.state = 'CHASE';
      if (!this.hasScreechedInChase) {
        this.audio.playMonsterRoar();
        this.hasScreechedInChase = true;
      }
    }
  }

  investigatePosition(pos) {
    if (this.state !== 'CHASE') {
      this.state = 'INVESTIGATE';
      this.targetPos.copy(pos);
      this.stateTimer = 5.0;
    }
  }

  moveTowardsTarget(delta) {
    const dir = this.targetPos.clone().sub(this.position);
    dir.y = 0;
    const dist = dir.length();

    if (dist > 0.05) {
      dir.normalize();
      const targetAngle = Math.atan2(dir.x, dir.z);
      this.group.rotation.y = THREE.MathUtils.lerp(this.group.rotation.y, targetAngle, Math.min(1, delta * 5));
      this.position.addScaledVector(dir, this.currentSpeed * delta);
      this.group.position.copy(this.position);
    }
  }

  pickNextWaypoint() {
    this.currentWaypointIndex = (this.currentWaypointIndex + 1) % this.waypoints.length;
    this.targetPos.copy(this.waypoints[this.currentWaypointIndex]);
  }

  animateMonster(delta) {
    this.twitchTimer += delta;

    if (Math.random() > 0.92) {
      this.head.rotation.z = (Math.random() - 0.5) * 0.5;
      this.head.rotation.y = (Math.random() - 0.5) * 0.4;
    }

    const swing = Math.sin(this.twitchTimer * (this.currentSpeed * 3.2));
    this.leftArm.rotation.x = swing * 0.5;
    this.rightArm.rotation.x = -swing * 0.5;
    this.leftLeg.rotation.x = -swing * 0.6;
    this.rightLeg.rotation.x = swing * 0.6;

    this.torso.position.y = 1.65 + Math.sin(this.twitchTimer * 1.8) * 0.025;
  }
}
