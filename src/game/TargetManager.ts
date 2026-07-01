import * as THREE from "three";

export interface TargetData {
  mesh: THREE.Group; // Group containing the circular bullseye and the vertical support post
  box: THREE.Box3;
  railZ: number;      // Distance plane (Z coordinate)
  railY: number;      // Vertical height of the rail (Y coordinate)
  direction: number;  // -1 (moving left) or 1 (moving right)
  speed: number;      // movement velocity
}

export class TargetManager {
  private scene: THREE.Scene;
  public targets: TargetData[] = [];
  private spawnTimer = 0;
  private maxTargets = 8;

  // Real-life range configuration
  private rails = [
    { z: -12, y: 1.5, speed: 4.5 }, // Near Rail (fast targets, low height)
    { z: -22, y: 2.8, speed: 3.5 }, // Medium Rail (medium targets, medium height)
    { z: -32, y: 4.2, speed: 2.2 }, // Far Rail (slow targets, high height)
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
      
      // Move horizontally
      t.mesh.position.x += t.direction * t.speed * deltaTime;

      // Rotate the target disc slightly for an organic mechanical wobble
      const wobble = Math.sin(Date.now() * 0.005 + i) * 0.05;
      t.mesh.rotation.y = wobble;

      // Calculate bounding box mathematically for 100% precise, zero-latency hitbox tracking
      t.box.min.set(t.mesh.position.x - 0.6, t.mesh.position.y - 0.8, t.mesh.position.z - 0.2);
      t.box.max.set(t.mesh.position.x + 0.6, t.mesh.position.y + 0.6, t.mesh.position.z + 0.2);

      // Bounce/Reverse direction if target hits horizontal boundary walls (X = -20 to +20)
      if (t.mesh.position.x > 20) {
        t.mesh.position.x = 20;
        t.direction = -1; // Move left
      } else if (t.mesh.position.x < -20) {
        t.mesh.position.x = -20;
        t.direction = 1; // Move right
      }
    }
  }

  private spawnGalleryTarget() {
    const group = new THREE.Group();

    // Select a random rail track for this target
    const railIdx = Math.floor(Math.random() * this.rails.length);
    const rail = this.rails[railIdx];

    // 1. Vertical support post (mechanical metal leg)
    const postGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.8, 6);
    const postMat = new THREE.MeshStandardMaterial({
      color: 0x55555f,
      roughness: 0.5,
      metalness: 0.8,
    });
    const post = new THREE.Mesh(postGeo, postMat);
    post.position.set(0, -0.4, 0); // Position below the target disc center
    group.add(post);

    // 2. Circular Bullseye plate
    const outerGeo = new THREE.CylinderGeometry(0.5, 0.5, 0.05, 16);
    outerGeo.rotateX(Math.PI / 2); // Rotate to face player directly
    const outerMat = new THREE.MeshStandardMaterial({
      color: 0xff0000, // Red outer ring
      roughness: 0.2,
      metalness: 0.5,
    });
    const targetOuter = new THREE.Mesh(outerGeo, outerMat);
    group.add(targetOuter);

    const innerGeo = new THREE.CylinderGeometry(0.3, 0.3, 0.06, 16);
    innerGeo.rotateX(Math.PI / 2);
    const innerMat = new THREE.MeshStandardMaterial({
      color: 0xffea00, // Yellow inner ring
      roughness: 0.2,
      metalness: 0.5,
    });
    const targetInner = new THREE.Mesh(innerGeo, innerMat);
    group.add(targetInner);

    const bullseyeGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.07, 16);
    bullseyeGeo.rotateX(Math.PI / 2);
    const bullseyeMat = new THREE.MeshStandardMaterial({
      color: 0xffffff, // White center bullseye
      roughness: 0.1,
      metalness: 0.3,
    });
    const bullseye = new THREE.Mesh(bullseyeGeo, bullseyeMat);
    group.add(bullseye);

    // 3. Set spawn coordinates exactly on the track
    const spawnX = (Math.random() - 0.5) * 36; // Spawn between -18 and +18 on X
    group.position.set(spawnX, rail.y + 0.4, rail.z); // Offset Y slightly to sit post on track

    // Enable shadows for the entire target group
    group.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });

    this.scene.add(group);

    const box = new THREE.Box3().setFromObject(group);

    this.targets.push({
      mesh: group,
      box,
      railZ: rail.z,
      railY: rail.y,
      direction: Math.random() < 0.5 ? -1 : 1, // Random starting direction
      speed: rail.speed * (Math.random() * 0.4 + 0.8), // Add subtle speed variance (+/- 20%)
    });
  }

  public removeTarget(index: number) {
    const t = this.targets[index];
    if (!t) return; // Robustness Guard: Prevents crashes on index-shifts

    this.scene.remove(t.mesh);

    t.mesh.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        if (Array.isArray(child.material)) {
          child.material.forEach((m) => m.dispose());
        } else if (child.material) {
          child.material.dispose();
        }
      }
    });

    this.targets.splice(index, 1);
  }

  /**
   * Safe, race-condition proof removal of a target by its unique Three.js UUID.
   * This completely prevents array index-shift crashes during multi-shot frames.
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
