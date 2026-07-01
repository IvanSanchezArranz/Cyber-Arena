import * as THREE from "three";
import { ArenaObstacle } from "./SceneBuilder";
import { WeaponSystem } from "./WeaponSystem";

export class PlayerController {
  private camera: THREE.Camera;
  private weaponSystem: WeaponSystem;
  private obstacles: ArenaObstacle[];

  // Player State
  public position = new THREE.Vector3(0, 1.8, 25); // Player eye height around 1.8m, spawn at Z=25
  public rotation = new THREE.Euler(0, 0, 0, "YXZ"); // Start looking North (towards Z=0)
  public health = 100;
  public shield = 100;
  public score = 0;
  public isDead = false;

  // Blaster gun model variables (held in player hand)
  public gunMesh!: THREE.Group;
  private gunMuzzleFlash!: THREE.PointLight;
  private muzzleFlashTimer = 0;

  // Keyboard controls tracking
  private keys: Record<string, boolean> = {};
  
  // Physics & Settings
  private moveSpeed = 16; // meters per second
  private rotationSpeed = 2.0; // radians per second (arrow keys)
  private playerRadius = 1.0;
  private fireCooldown = 0.25; // s between shots
  private fireTimer = 0;

  constructor(camera: THREE.Camera, weaponSystem: WeaponSystem, obstacles: ArenaObstacle[]) {
    this.camera = camera;
    this.weaponSystem = weaponSystem;
    this.obstacles = obstacles;

    this.initControls();
    this.createBlasterModel();
  }

  private initControls() {
    window.addEventListener("keydown", (e) => {
      this.keys[e.code] = true;
      
      // Prevent browser default scrolling when using Arrow keys or Space
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(e.code)) {
        e.preventDefault();
      }
    });

    window.addEventListener("keyup", (e) => {
      this.keys[e.code] = false;
    });

    // Support mouse look dragging on the canvas
    let isDragging = false;
    let prevMouseX = 0;
    let prevMouseY = 0;

    window.addEventListener("mousedown", (e) => {
      // If click on canvas
      if ((e.target as HTMLElement).tagName === "CANVAS") {
        isDragging = true;
        prevMouseX = e.clientX;
        prevMouseY = e.clientY;
      }
    });

    window.addEventListener("mousemove", (e) => {
      if (isDragging) {
        const deltaX = e.clientX - prevMouseX;
        const deltaY = e.clientY - prevMouseY;

        const sensitivity = 0.003;
        this.rotation.y -= deltaX * sensitivity;
        this.rotation.x -= deltaY * sensitivity;

        // Clamp vertical look (pitch) between -85 and +85 degrees
        this.rotation.x = Math.max(-Math.PI / 2.2, Math.min(Math.PI / 2.2, this.rotation.x));

        prevMouseX = e.clientX;
        prevMouseY = e.clientY;
      }
    });

    window.addEventListener("mouseup", () => {
      isDragging = false;
    });
  }

  private createBlasterModel() {
    this.gunMesh = new THREE.Group();

    // Gun body - metallic cyan barrel
    const bodyGeo = new THREE.BoxGeometry(0.12, 0.12, 0.7);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0x111625,
      roughness: 0.1,
      metalness: 0.8,
    });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.set(0, 0, -0.3);
    this.gunMesh.add(body);

    // Glowing emitter barrel
    const muzzleGeo = new THREE.CylinderGeometry(0.05, 0.05, 0.25, 8);
    muzzleGeo.rotateX(Math.PI / 2);
    const muzzleMat = new THREE.MeshBasicMaterial({ color: 0x00ffff });
    const muzzle = new THREE.Mesh(muzzleGeo, muzzleMat);
    muzzle.position.set(0, 0, -0.65);
    this.gunMesh.add(muzzle);

    // Tech handle
    const handleGeo = new THREE.BoxGeometry(0.08, 0.22, 0.1);
    const handle = new THREE.Mesh(handleGeo, bodyMat);
    handle.position.set(0, -0.15, -0.15);
    this.gunMesh.add(handle);

    // Dynamic light point on muzzle for firing flash
    this.gunMuzzleFlash = new THREE.PointLight(0x00ffff, 0, 5);
    this.gunMuzzleFlash.position.set(0, 0, -0.7);
    this.gunMesh.add(this.gunMuzzleFlash);

    // Position weapon in lower right corner of viewport
    this.gunMesh.position.set(0.35, -0.25, -0.6);
  }

  public takeDamage(amount: number) {
    if (this.isDead) return;

    if (this.shield > 0) {
      const shieldDmg = Math.min(this.shield, amount * 0.7); // Shields absorb 70% of damage
      this.shield -= shieldDmg;
      this.health -= (amount - shieldDmg);
    } else {
      this.health -= amount;
    }

    this.health = Math.max(0, this.health);
    if (this.health <= 0) {
      this.isDead = true;
    }
  }

  public heal(amount: number) {
    if (this.isDead) return;
    this.health = Math.min(100, this.health + amount);
    this.shield = Math.min(100, this.shield + amount * 0.5);
  }

  public reset() {
    this.position.set(0, 1.8, 25);
    this.rotation.set(0, 0, 0, "YXZ"); // Align looking North
    this.health = 100;
    this.shield = 100;
    this.score = 0;
    this.isDead = false;
    this.fireTimer = 0;
  }

  public update(deltaTime: number) {
    if (this.isDead) return;

    // 1. Cooldown timers
    if (this.fireTimer > 0) this.fireTimer -= deltaTime;

    if (this.muzzleFlashTimer > 0) {
      this.muzzleFlashTimer -= deltaTime;
      if (this.muzzleFlashTimer <= 0) {
        this.gunMuzzleFlash.intensity = 0;
      }
    }

    // 2. Camera rotation using keyboard arrow keys (Horizontal: Left/Right, Vertical: Up/Down)
    const rotAmount = this.rotationSpeed * deltaTime;
    if (this.keys["ArrowLeft"]) {
      this.rotation.y += rotAmount;
    }
    if (this.keys["ArrowRight"]) {
      this.rotation.y -= rotAmount;
    }
    if (this.keys["ArrowUp"]) {
      this.rotation.x += rotAmount * 0.8;
    }
    if (this.keys["ArrowDown"]) {
      this.rotation.x -= rotAmount * 0.8;
    }
    // Clamp vertical looking to prevent flipping upside down
    this.rotation.x = Math.max(-Math.PI / 2.2, Math.min(Math.PI / 2.2, this.rotation.x));

    // Update camera matrix orientation from pitch/yaw Euler
    this.camera.quaternion.setFromEuler(this.rotation);

    // 3. Movement using keyboard (WASD and / or Arrow keys if not rotating camera)
    // Note: To make arrow keys dual purpose, we let WASD handle translation while Arrow Keys rotate,
    // which is the standard, most comfortable FPS layout.
    const forwardVec = new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion);
    const rightVec = new THREE.Vector3(1, 0, 0).applyQuaternion(this.camera.quaternion);
    
    // Flatten vectors to ground plane Z/X
    forwardVec.y = 0;
    forwardVec.normalize();
    rightVec.y = 0;
    rightVec.normalize();

    const moveDirection = new THREE.Vector3(0, 0, 0);

    // WASD movement inputs
    if (this.keys["KeyW"]) {
      moveDirection.add(forwardVec);
    }
    if (this.keys["KeyS"]) {
      moveDirection.add(forwardVec.clone().negate());
    }
    if (this.keys["KeyA"]) {
      moveDirection.add(rightVec.clone().negate());
    }
    if (this.keys["KeyD"]) {
      moveDirection.add(rightVec);
    }

    // Apply movement & check collisions with obstacles (sliding collision)
    if (moveDirection.lengthSq() > 0) {
      moveDirection.normalize().multiplyScalar(this.moveSpeed * deltaTime);
      this.moveWithCollision(moveDirection);
    }

    // Keep camera positioned exactly at player's eye coordinates
    this.camera.position.copy(this.position);

    // 4. Fire blaster
    if ((this.keys["Space"] || this.keys["Click"]) && this.fireTimer <= 0) {
      this.shoot();
    }

    // 5. Idle breathing wave for weapon mesh to look organic and "alive"
    const wave = Math.sin(Date.now() * 0.003) * 0.008;
    const sway = Math.cos(Date.now() * 0.0015) * 0.005;
    this.gunMesh.position.y = -0.25 + wave;
    this.gunMesh.position.x = 0.35 + sway;
  }

  private moveWithCollision(velocity: THREE.Vector3) {
    // We check collision along the X and Z axes independently to allow sliding along walls
    
    // Try moving X first
    const nextPosX = this.position.clone();
    nextPosX.x += velocity.x;
    if (!this.checkPlayerCollision(nextPosX)) {
      this.position.x = nextPosX.x;
    }

    // Try moving Z next
    const nextPosZ = this.position.clone();
    nextPosZ.z += velocity.z;
    if (!this.checkPlayerCollision(nextPosZ)) {
      this.position.z = nextPosZ.z;
    }
  }

  private checkPlayerCollision(newPosition: THREE.Vector3): boolean {
    // Generate a bounding box representing the player at the candidate position
    const pBox = new THREE.Box3(
      new THREE.Vector3(newPosition.x - this.playerRadius, 0, newPosition.z - this.playerRadius),
      new THREE.Vector3(newPosition.x + this.playerRadius, 3.0, newPosition.z + this.playerRadius) // Height 3.0m
    );

    // Verify if it collides with any solid obstacle in the arena
    for (const obs of this.obstacles) {
      if (obs.boundingBox.intersectsBox(pBox)) {
        return true;
      }
    }
    return false;
  }

  private shoot() {
    this.fireTimer = this.fireCooldown;
    
    // Calculate muzzle position directly from camera vectors to ensure 100% reliable coordinates
    const muzzlePosition = this.camera.position.clone();
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion);
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(this.camera.quaternion);

    // Offset 0.8m forward, 0.35m to the right, and 0.25m down to align perfectly with the blaster model
    muzzlePosition.add(forward.multiplyScalar(0.8));
    muzzlePosition.add(right.multiplyScalar(0.35));
    muzzlePosition.y -= 0.25;

    // Direct shot vector pointing straight from crosshair
    const shootDirection = forward.clone().normalize();

    this.weaponSystem.fire(muzzlePosition, shootDirection, true);

    // Apply shooting recoil to weapon model (kick back to -0.45)
    this.gunMesh.position.z = -0.45;
    this.gunMuzzleFlash.intensity = 2.5;
    this.muzzleFlashTimer = 0.06;

    // Smoothly lerp weapon back to -0.6 rest position over subsequent frames
    const animateRecoil = () => {
      if (this.isDead) return;

      // Move weapon back towards -0.6 rest position
      this.gunMesh.position.z += (-0.6 - this.gunMesh.position.z) * 0.15;

      // Continue frame animation until fully recovered
      if (Math.abs(this.gunMesh.position.z - (-0.6)) > 0.002) {
        requestAnimationFrame(animateRecoil);
      } else {
        this.gunMesh.position.z = -0.6; // Secure rest position
      }
    };
    animateRecoil();
  }
}
