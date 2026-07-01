import * as THREE from "three";

export interface TargetData {
  mesh: THREE.Mesh; // Single sphere mesh representing the glowing plasma orb
  position: THREE.Vector3;
  uuid: string;
  direction: number;  // -1 (moving left) or 1 (moving right)
  speed: number;      // movement velocity
  timer: number;      // lifetime timer
}

export class TargetManager {
  private scene: THREE.Scene;
  public targets: TargetData[] = [];
  private spawnTimer = 0;
  private maxTargets = 8;

  // Real-life range configuration
  private rails = [
    { z: -12, y: 1.5, speed: 4.5 }, // Near Rail (fast targets)
    { z: -22, y: 2.8, speed: 3.5 }, // Medium Rail (medium targets)
    { z: -32, y: 4.2, speed: 2.2 }, // Far Rail (slow targets)
  ];

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  public update(deltaTime: number) {
    // 1. Keep the gallery populated with targets up to our limit
    if (this.targets.length < this.maxTargets) {
      this.spawnTimer -= deltaTime;
      if (this.spawnTimer <= 0) {
        this.spawnGalleryTarget();
        this.spawnTimer = Math.random() * 0.5 + 0.3; // Rapid populate
      }
    }

    // 2. Slide targets along their respective tracks
    for (let i = this.targets.length - 1; i >= 0; i--) {
      const t = this.targets[i];
      t.timer -= deltaTime;
      
      // Move horizontally
      t.mesh.position.x += t.direction * t.speed * deltaTime;

      // Pulse the scale slightly to make them look alive and organic
      const pulse = 1.0 + Math.sin(Date.now() * 0.008 + i) * 0.1;
      t.mesh.scale.set(pulse, pulse, pulse);

      // Bounce/Reverse direction if target hits horizontal boundary walls (X = -20 to +20)
      if (t.mesh.position.x > 20) {
        t.mesh.position.x = 20;
        t.direction = -1; // Move left
      } else if (t.mesh.position.x < -20) {
        t.mesh.position.x = -20;
        t.direction = 1; // Move right
      }

      // Despawn if time runs out
      if (t.timer <= 0) {
        this.removeTarget(i);
      }
    }
  }

  private spawnGalleryTarget() {
    // Select a random rail track for this target
    const railIdx = Math.floor(Math.random() * this.rails.length);
    const rail = this.rails[railIdx];

    // Create a beautiful, floating glowing energy orb (Sphere)
    const geo = new THREE.SphereGeometry(0.55, 16, 16);
    const mat = new THREE.MeshStandardMaterial({
      color: 0xff7700, // Deep warm amber
      emissive: 0xffaa00, // Highly glowing neon core
      emissiveIntensity: 1.5,
      roughness: 0.1,
      metalness: 0.9,
    });
    
    const mesh = new THREE.Mesh(geo, mat);

    // Set spawn coordinates exactly on the track
    const spawnX = (Math.random() - 0.5) * 36; // Spawn between -18 and +18 on X
    mesh.position.set(spawnX, rail.y, rail.z);

    mesh.castShadow = true;
    mesh.receiveShadow = true;

    this.scene.add(mesh);

    this.targets.push({
      mesh,
      position: mesh.position,
      uuid: mesh.uuid,
      direction: Math.random() < 0.5 ? -1 : 1, // Random starting direction
      speed: rail.speed * (Math.random() * 0.4 + 0.8), // Add subtle speed variance (+/- 20%)
      timer: 4.5, // Exists for 4.5 seconds
    });
  }

  public removeTarget(index: number) {
    const t = this.targets[index];
    if (!t) return;

    this.scene.remove(t.mesh);
    t.mesh.geometry.dispose();
    if (Array.isArray(t.mesh.material)) {
      t.mesh.material.forEach((m) => m.dispose());
    } else if (t.mesh.material) {
      t.mesh.material.dispose();
    }

    this.targets.splice(index, 1);
  }

  /**
   * Safe, race-condition proof removal of a target by its unique Three.js UUID.
   */
  public removeTargetByUUID(uuid: string) {
    const idx = this.targets.findIndex((t) => t.mesh.uuid === uuid);
    if (idx !== -1) {
      this.removeTarget(idx);
    }
  }

  public clearAll() {
    for (let i = this.targets.length - 1; i >= 0; i--) {
      this.removeTarget(i);
    }
  }
}
