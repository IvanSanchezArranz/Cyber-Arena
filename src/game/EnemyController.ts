import * as THREE from "three";
import { ArenaObstacle } from "./SceneBuilder";
import { WeaponSystem } from "./WeaponSystem";
import { sounds } from "./SoundEffects";

export enum EnemyState {
  PATROL,
  CHASE,
  RETREAT
}

export enum AttackPattern {
  TRIPLE_BURST,
  SPREAD_SHOT,
  CHARGED_PULSE
}

export class EnemyController {
  private scene: THREE.Scene;
  private weaponSystem: WeaponSystem;
  private obstacles: ArenaObstacle[];

  // Enemy Drone Mesh & Parts
  public mesh!: THREE.Group;
  private coreMesh!: THREE.Mesh;
  private lensMesh!: THREE.Mesh;
  private lensLight!: THREE.PointLight;
  private ringZ!: THREE.Mesh;

  // AI State
  public state: EnemyState = EnemyState.PATROL;
  public position = new THREE.Vector3(0, 2.5, -25); // Hover height 2.5m, spawns at North Z=-25
  public health = 100;
  public maxHealth = 100;
  public isDead = false;
  
  // Patrol Targets
  private patrolTarget = new THREE.Vector3();
  private patrolTimer = 0;

  // AI Tuning
  private speed = 9.0; // m/s (slightly faster for a better challenge)
  private detectionRadius = 38; // Distance at which drone spots player
  private preferredShootDist = 18; // Tries to stop and shoot at this distance
  private shootCooldown = 1.1; // base s between attack actions
  private shootTimer = 0;
  private flashTimer = 0; // Visual flash when hit

  // Advanced Combat States
  private isCharging = false;
  private chargeTimer = 0;
  private burstCount = 0;
  private burstSubTimer = 0;
  private levelMultiplier = 1.0;

  constructor(scene: THREE.Scene, weaponSystem: WeaponSystem, obstacles: ArenaObstacle[]) {
    this.scene = scene;
    this.weaponSystem = weaponSystem;
    this.obstacles = obstacles;

    this.createDroneModel();
    this.pickNewPatrolTarget();
  }

  private createDroneModel() {
    this.mesh = new THREE.Group();
    this.mesh.position.copy(this.position);

    // 1. Drone core body - dark carbon-fiber steel sphere
    const coreGeo = new THREE.SphereGeometry(0.7, 16, 16);
    const coreMat = new THREE.MeshStandardMaterial({
      color: 0x080914,
      roughness: 0.1,
      metalness: 0.9,
    });
    this.coreMesh = new THREE.Mesh(coreGeo, coreMat);
    this.mesh.add(this.coreMesh);

    // 2. Circular rotating Gimbal ring around the core (smoothly circular, magenta)
    const ringGeoZ = new THREE.TorusGeometry(1.25, 0.04, 16, 64); // Increased segments for a perfect circular shape
    const ringMatZ = new THREE.MeshStandardMaterial({
      color: 0xff00ff,
      roughness: 0.3,
      metalness: 0.7,
    });
    this.ringZ = new THREE.Mesh(ringGeoZ, ringMatZ);
    this.mesh.add(this.ringZ);

    // 3. Glowing Sensor Lens / Scanner Eye in front
    const lensGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.15, 12);
    lensGeo.rotateX(Math.PI / 2);
    const lensMat = new THREE.MeshBasicMaterial({ color: 0x00ff00 }); // Green for patrolling state
    this.lensMesh = new THREE.Mesh(lensGeo, lensMat);
    this.lensMesh.position.set(0, 0, -0.65);
    this.mesh.add(this.lensMesh);

    // 4. Attach red light point to lens
    this.lensLight = new THREE.PointLight(0x00ff00, 1.2, 12);
    this.lensLight.position.set(0, 0, -0.7);
    this.mesh.add(this.lensLight);

    // Ensure it casts shadows
    this.coreMesh.castShadow = true;
    this.coreMesh.receiveShadow = true;

    this.scene.add(this.mesh);
  }

  public takeDamage(amount: number) {
    if (this.isDead) return;

    this.health -= amount;
    this.flashTimer = 0.12; // Flash white
    
    // Switch to chase mode instantly when damaged
    this.state = EnemyState.CHASE;

    if (this.health <= 0) {
      this.die();
    }
  }

  private die() {
    this.isDead = true;
    sounds.playExplosion();
    this.scene.remove(this.mesh);
    this.isCharging = false;
    this.burstCount = 0;
  }

  public respawn(levelMultiplier = 1.0) {
    this.levelMultiplier = levelMultiplier;
    this.health = Math.round(100 * levelMultiplier);
    this.maxHealth = this.health;
    this.isDead = false;
    this.state = EnemyState.PATROL;
    this.isCharging = false;
    this.burstCount = 0;
    
    // Spawn at a random position away from center
    const rx = (Math.random() - 0.5) * 60;
    const rz = (Math.random() - 0.5) * 60;
    this.position.set(rx, 2.5, rz);
    this.mesh.position.copy(this.position);
    this.scene.add(this.mesh);

    // Reset eye to patrol green
    const lensMat = this.lensMesh.material as THREE.MeshBasicMaterial;
    lensMat.color.setHex(0x00ff00);
    this.lensLight.color.setHex(0x00ff00);
    this.lensLight.intensity = 1.2;

    this.pickNewPatrolTarget();
  }

  public update(deltaTime: number, playerPosition: THREE.Vector3) {
    if (this.isDead) return;

    // 1. Hover bobs up and down organically
    const hoverOffset = Math.sin(Date.now() * 0.002) * 0.005;
    this.position.y = 2.5 + hoverOffset * 10;

    // 2. Gimbal ring rotation animation (smooth magenta ring)
    this.ringZ.rotation.y += 1.2 * deltaTime;
    this.ringZ.rotation.x += 0.8 * deltaTime;

    // 3. Update active visual states and sub-timers
    const lensMat = this.lensMesh.material as THREE.MeshBasicMaterial;

    if (this.flashTimer > 0) {
      this.flashTimer -= deltaTime;
      if (this.flashTimer <= 0) {
        // Restore color based on state
        if (this.isCharging) {
          lensMat.color.setHex(0xffea00); // Back to charge yellow
        } else {
          lensMat.color.setHex(this.state === EnemyState.CHASE ? 0xff0000 : 0x00ff00);
          this.lensLight.color.setHex(this.state === EnemyState.CHASE ? 0xff0000 : 0x00ff00);
        }
      } else {
        // Flash bright white on damage
        lensMat.color.setHex(0xffffff);
      }
    } else if (this.isCharging) {
      // Flashes between magenta and bright yellow rapidly to indicate heavy laser charging
      const isAlt = Math.floor(Date.now() / 50) % 2 === 0;
      const col = isAlt ? 0xff00ff : 0xffea00;
      lensMat.color.setHex(col);
      this.lensLight.color.setHex(col);
      this.lensLight.intensity = 3.0; // Intense bright warning flare
    }

    // 4. Update core shooting mechanics
    if (this.isCharging) {
      this.chargeTimer -= deltaTime;
      if (this.chargeTimer <= 0) {
        this.fireChargedPulse(playerPosition);
      }
    } else if (this.burstCount > 0) {
      this.burstSubTimer -= deltaTime;
      if (this.burstSubTimer <= 0) {
        this.fireBurstLaser(playerPosition);
      }
    } else {
      if (this.shootTimer > 0) this.shootTimer -= deltaTime;
    }

    // 5. State Machine processing
    const distToPlayer = this.position.distanceTo(playerPosition);

    if (this.state === EnemyState.PATROL) {
      // PATROL STATE: Roam around cover spots
      this.patrolTimer -= deltaTime;
      
      const targetDist = this.position.distanceTo(this.patrolTarget);
      if (targetDist < 2.0 || this.patrolTimer <= 0) {
        this.pickNewPatrolTarget();
      }

      // Move toward patrol target
      const dir = this.patrolTarget.clone().sub(this.position).normalize();
      this.moveWithCollision(dir.multiplyScalar(this.speed * 0.6 * deltaTime));

      // Slowly look towards patrol path
      const targetLook = this.position.clone().add(dir);
      this.mesh.lookAt(targetLook.x, this.position.y, targetLook.z);

      // Check if Player gets close or is visible
      if (distToPlayer < this.detectionRadius) {
        this.state = EnemyState.CHASE;
        lensMat.color.setHex(0xff0000); // Alert red
        this.lensLight.color.setHex(0xff0000);
        this.lensLight.intensity = 1.6;
      }
    } 
    else if (this.state === EnemyState.CHASE) {
      // CHASE STATE: Pursue player and deploy multi-pattern barrages
      
      // Face the player directly (smooth rotation)
      this.mesh.lookAt(playerPosition.x, this.position.y, playerPosition.z);

      if (distToPlayer > this.detectionRadius + 12) {
        // Lost track of player, return to patrol
        this.state = EnemyState.PATROL;
        lensMat.color.setHex(0x00ff00); // Relaxed green
        this.lensLight.color.setHex(0x00ff00);
        this.lensLight.intensity = 1.2;
        this.pickNewPatrolTarget();
      } else {
        const dir = playerPosition.clone().sub(this.position);
        dir.y = 0; // Maintain constant hover plane height

        const velocity = new THREE.Vector3(0, 0, 0);

        // Move closer or backwards based on distance parameters
        if (distToPlayer > this.preferredShootDist) {
          const fwd = dir.clone().normalize();
          velocity.add(fwd.multiplyScalar(this.speed));
        } else if (distToPlayer < this.preferredShootDist - 6) {
          const bck = dir.clone().normalize().negate();
          velocity.add(bck.multiplyScalar(this.speed * 0.5));
        }

        // --- EVASIVE MANEUVER STRAFE ---
        // Side-to-side slithering (weave left and right using sine oscillation)
        // Drone locks movement while charging the heavy blast to offer pilot a split-second gap to shoot
        if (!this.isCharging) {
          const right = new THREE.Vector3(-dir.z, 0, dir.x).normalize();
          const strafeSpeedFactor = Math.sin(Date.now() * 0.003) * this.speed * 0.85;
          velocity.add(right.multiplyScalar(strafeSpeedFactor));
        }

        // Apply physical movements clamping with obstacles
        if (velocity.lengthSq() > 0) {
          this.moveWithCollision(velocity.multiplyScalar(deltaTime));
        }

        // Trigger combat shooting patterns
        if (this.shootTimer <= 0 && !this.isCharging && this.burstCount === 0) {
          this.triggerAttackPattern(playerPosition);
        }
      }
    }

    // Sync mesh coordinates
    this.mesh.position.copy(this.position);
  }

  private moveWithCollision(velocity: THREE.Vector3) {
    const radius = 1.2; // Bounding sphere radius

    // Test X axis movement
    const nextPosX = this.position.clone();
    nextPosX.x += velocity.x;
    if (!this.checkCollision(nextPosX, radius)) {
      this.position.x = nextPosX.x;
    }

    // Test Z axis movement
    const nextPosZ = this.position.clone();
    nextPosZ.z += velocity.z;
    if (!this.checkCollision(nextPosZ, radius)) {
      this.position.z = nextPosZ.z;
    }
  }

  private checkCollision(newPosition: THREE.Vector3, radius: number): boolean {
    const box = new THREE.Box3(
      new THREE.Vector3(newPosition.x - radius, 0, newPosition.z - radius),
      new THREE.Vector3(newPosition.x + radius, 5.0, newPosition.z + radius)
    );

    // Collides with arena walls/obstacles?
    for (const obs of this.obstacles) {
      if (obs.boundingBox.intersectsBox(box)) {
        return true;
      }
    }
    return false;
  }

  private pickNewPatrolTarget() {
    const size = 30; // Roam within central 60x60 space
    this.patrolTarget.set(
      (Math.random() - 0.5) * size * 2,
      2.5,
      (Math.random() - 0.5) * size * 2
    );
    this.patrolTimer = Math.random() * 4 + 4; // Roam to target up to 4-8 seconds
  }

  /**
   * Orchestrates the active combat action cycle.
   */
  private triggerAttackPattern(playerPosition: THREE.Vector3) {
    // Pick a random attack pattern: Triple Burst (0), Fan Spread (1), Heavy Charge (2)
    const patterns = [AttackPattern.TRIPLE_BURST, AttackPattern.SPREAD_SHOT, AttackPattern.CHARGED_PULSE];
    const roll = Math.floor(Math.random() * patterns.length);
    const chosenPattern = patterns[roll];

    if (chosenPattern === AttackPattern.TRIPLE_BURST) {
      this.burstCount = 3;
      this.burstSubTimer = 0; // Fire first burst shot instantly
    } 
    else if (chosenPattern === AttackPattern.SPREAD_SHOT) {
      this.fireFanSpread(playerPosition);
      // Reload cooldown scales with level multiplier (faster reloads on higher levels)
      this.shootTimer = (this.shootCooldown * 1.2) / this.levelMultiplier;
    } 
    else if (chosenPattern === AttackPattern.CHARGED_PULSE) {
      this.isCharging = true;
      this.chargeTimer = 0.85; // Charge up for 0.85s
    }
  }

  /**
   * Pattern 1: Rapid Triple Burst
   */
  private fireBurstLaser(playerPosition: THREE.Vector3) {
    const muzzlePosition = this.getMuzzlePosition();
    const direction = this.getVectorToPlayer(muzzlePosition, playerPosition);

    // Fire laser (12 damage, speed 50)
    this.weaponSystem.fire(muzzlePosition, direction, false, 12, 50, 0xff3333, 0.95);

    this.burstCount--;
    if (this.burstCount > 0) {
      this.burstSubTimer = 0.12; // Rapid fire interval
    } else {
      this.shootTimer = (this.shootCooldown * 1.1) / this.levelMultiplier; // Action reload cooldown
    }
  }

  /**
   * Pattern 2: 3-Way Horizontal Fan Spread
   */
  private fireFanSpread(playerPosition: THREE.Vector3) {
    const muzzlePosition = this.getMuzzlePosition();
    const centerDir = this.getVectorToPlayer(muzzlePosition, playerPosition);

    // Standard Center Laser
    this.weaponSystem.fire(muzzlePosition, centerDir, false, 15, 45, 0xff00ff, 1.0);

    // Angled Left Laser (+12 degrees on horizontal plane)
    const leftDir = centerDir.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 15);
    this.weaponSystem.fire(muzzlePosition, leftDir, false, 12, 42, 0xff00ff, 0.9);

    // Angled Right Laser (-12 degrees on horizontal plane)
    const rightDir = centerDir.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), -Math.PI / 15);
    this.weaponSystem.fire(muzzlePosition, rightDir, false, 12, 42, 0xff00ff, 0.9);
  }

  /**
   * Pattern 3: Telegraphing Heavy Charged Laser
   */
  private fireChargedPulse(playerPosition: THREE.Vector3) {
    this.isCharging = false;

    const muzzlePosition = this.getMuzzlePosition();
    const direction = this.getVectorToPlayer(muzzlePosition, playerPosition);

    // Spawn massive heavy yellow-orange plasma ball (35 damage, high speed 80, large size scale 1.85)
    this.weaponSystem.fire(muzzlePosition, direction, false, 35, 80, 0xffaa00, 1.85);

    this.shootTimer = (this.shootCooldown * 1.6) / this.levelMultiplier; // Long reload time for heavy blast

    // Reset eye visual to normal attack red
    const lensMat = this.lensMesh.material as THREE.MeshBasicMaterial;
    lensMat.color.setHex(0xff0000);
    this.lensLight.color.setHex(0xff0000);
    this.lensLight.intensity = 1.6;
  }

  private getMuzzlePosition(): THREE.Vector3 {
    const muzzlePosition = this.position.clone();
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.mesh.quaternion);
    return muzzlePosition.add(forward.multiplyScalar(0.8));
  }

  private getVectorToPlayer(muzzle: THREE.Vector3, player: THREE.Vector3): THREE.Vector3 {
    const targetChest = player.clone();
    targetChest.y = 1.25; // Aim at player center body height (1.25m)
    return targetChest.sub(muzzle).normalize();
  }

  public getBoundingBox(): THREE.Box3 {
    return new THREE.Box3(
      new THREE.Vector3(this.position.x - 0.8, this.position.y - 0.8, this.position.z - 0.8),
      new THREE.Vector3(this.position.x + 0.8, this.position.y + 0.8, this.position.z + 0.8)
    );
  }
}
