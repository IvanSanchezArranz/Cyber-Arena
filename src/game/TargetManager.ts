import * as THREE from "three";

export interface TargetData {
  mesh: THREE.Mesh;
  box: THREE.Box3;
  timer: number;
}

export class TargetManager {
  private scene: THREE.Scene;
  public targets: TargetData[] = [];
  private spawnTimer = 0;
  private arenaSize = 70; // Keep slightly within the 80x80 arena bounds

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  public update(deltaTime: number) {
    // 1. Spawn new targets periodically
    this.spawnTimer -= deltaTime;
    if (this.spawnTimer <= 0) {
      this.spawnTarget();
      this.spawnTimer = Math.random() * 0.8 + 0.4; // Rapid spawn rate (0.4s to 1.2s)
    }

    // 2. Animate and despawn old targets
    for (let i = this.targets.length - 1; i >= 0; i--) {
      const t = this.targets[i];
      t.timer -= deltaTime;
      
      // Floating animation
      t.mesh.rotation.x += deltaTime * 2.0;
      t.mesh.rotation.y += deltaTime * 3.0;
      t.mesh.position.y += Math.sin(Date.now() * 0.005 + i) * 0.02; 
      
      // Update collision bounds
      t.box.setFromObject(t.mesh);

      // Despawn if time runs out
      if (t.timer <= 0) {
        this.removeTarget(i);
      }
    }
  }

  private spawnTarget() {
    // Create a bright orange glowing octahedron
    const geo = new THREE.OctahedronGeometry(0.8, 0);
    const mat = new THREE.MeshStandardMaterial({
      color: 0xffaa00,
      roughness: 0.1,
      metalness: 0.9,
      emissive: 0xff5500,
      emissiveIntensity: 0.8
    });
    const mesh = new THREE.Mesh(geo, mat);

    // Spawn at random coordinates inside the arena, avoiding the exact center spawn
    let x = 0;
    let z = 0;
    while (Math.abs(x) < 5 && Math.abs(z) < 5) {
      x = (Math.random() - 0.5) * this.arenaSize;
      z = (Math.random() - 0.5) * this.arenaSize;
    }
    const y = Math.random() * 8 + 2; // Height between 2 and 10m

    mesh.position.set(x, y, z);
    this.scene.add(mesh);

    const box = new THREE.Box3().setFromObject(mesh);
    this.targets.push({ mesh, box, timer: 3.5 }); // Targets exist for only 3.5 seconds
  }

  public removeTarget(index: number) {
    const t = this.targets[index];
    this.scene.remove(t.mesh);
    t.mesh.geometry.dispose();
    (t.mesh.material as THREE.Material).dispose();
    this.targets.splice(index, 1);
  }

  public clearAll() {
    for (let i = this.targets.length - 1; i >= 0; i--) {
      this.removeTarget(i);
    }
  }
}
