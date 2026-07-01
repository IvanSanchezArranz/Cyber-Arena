import * as THREE from "three";
import { ArenaObstacle } from "./SceneBuilder";
import { sounds } from "./SoundEffects";

export interface Projectile {
  mesh: THREE.Mesh;
  direction: THREE.Vector3;
  speed: number;
  isPlayerOwned: boolean;
  damage: number;
  light?: THREE.PointLight;
}

interface SplashParticle {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  life: number; // 0 to 1
  decay: number;
}

export class WeaponSystem {
  private scene: THREE.Scene;
  private projectiles: Projectile[] = [];
  private particles: SplashParticle[] = [];
  private obstacles: ArenaObstacle[] = [];

  constructor(scene: THREE.Scene, obstacles: ArenaObstacle[]) {
    this.scene = scene;
    this.obstacles = obstacles;
  }

  public fire(
    position: THREE.Vector3,
    direction: THREE.Vector3,
    isPlayerOwned: boolean,
    damage = 25,
    customSpeed?: number,
    customColor?: number,
    customScale = 1.0
  ) {
    // 1. Create a glowing cylinder representing the plasma bolt with custom scale
    const radius = 0.08 * customScale;
    const length = 0.8 * customScale;
    const geo = new THREE.CylinderGeometry(radius, radius, length, 5);
    geo.rotateX(Math.PI / 2); // Align cylinder pointing forward

    const color = customColor !== undefined ? customColor : (isPlayerOwned ? 0x00ffff : 0xff3333);
    const mat = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.9,
    });

    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(position);

    // Orient the projectile mesh towards its flight direction
    const targetPos = position.clone().add(direction);
    mesh.lookAt(targetPos);

    this.scene.add(mesh);

    // 2. Play appropriate sound
    if (isPlayerOwned) {
      sounds.playPlayerShoot();
    } else {
      sounds.playEnemyShoot();
    }

    // 3. Add dynamic light to player or heavy shots
    let light: THREE.PointLight | undefined;
    if (isPlayerOwned || customScale > 1.2) {
      light = new THREE.PointLight(color, isPlayerOwned ? 1.5 : 2.5, isPlayerOwned ? 6 : 10);
      light.position.copy(position);
      this.scene.add(light);
    }

    this.projectiles.push({
      mesh,
      direction: direction.clone().normalize(),
      speed: customSpeed !== undefined ? customSpeed : (isPlayerOwned ? 70 : 45),
      isPlayerOwned,
      damage,
      light,
    });
  }

  public update(
    deltaTime: number,
    onPlayerHit: (damage: number) => void,
    onEnemyHit: (damage: number) => void,
    onTargetHit: (uuid: string) => void,
    playerPosition: THREE.Vector3,
    enemyBoundingBox: THREE.Box3 | null,
    targets: { uuid: string; box: THREE.Box3 }[]
  ) {
    // 1. Update Projectiles
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const proj = this.projectiles[i];
      const prevPosition = proj.mesh.position.clone();
      
      // Move projectile forward
      const movement = proj.direction.clone().multiplyScalar(proj.speed * deltaTime);
      proj.mesh.position.add(movement);

      if (proj.light) {
        proj.light.position.copy(proj.mesh.position);
      }

      let hit = false;

      // A. Collision with Obstacles/Arena Walls
      for (const obs of this.obstacles) {
        // Simple check if projectile's current position lies inside obstacle AABB
        if (obs.boundingBox.containsPoint(proj.mesh.position)) {
          this.createExplosionSparks(proj.mesh.position, proj.isPlayerOwned ? 0x00ffff : 0xff3333);
          hit = true;
          break;
        }
      }

      if (hit) {
        this.destroyProjectile(i);
        continue;
      }

      // B. Collision with Players (if opponent projectile)
      if (!proj.isPlayerOwned) {
        // Player's head is around height 1.8, check capsule collision
        const dist = proj.mesh.position.distanceTo(playerPosition);
        if (dist < 1.6) { // Collision radius around player
          onPlayerHit(proj.damage);
          sounds.playPlayerHit();
          this.createExplosionSparks(proj.mesh.position, 0xff3333);
          this.destroyProjectile(i);
          continue;
        }
      }

      // C. Collision with AI Enemy Drone (if player projectile)
      if (proj.isPlayerOwned && enemyBoundingBox) {
        if (enemyBoundingBox.containsPoint(proj.mesh.position)) {
          onEnemyHit(proj.damage);
          sounds.playEnemyDamageBeep();
          this.createExplosionSparks(proj.mesh.position, 0x00ffff);
          this.destroyProjectile(i);
          continue;
        }
      }

      // D. Collision with Targets (if player projectile in Shooting Gallery)
      if (proj.isPlayerOwned && targets.length > 0) {
        // Compute projectile bounding box to prevent fast laser tunneling
        const projBox = new THREE.Box3().setFromObject(proj.mesh);
        
        for (let j = 0; j < targets.length; j++) {
          if (projBox.intersectsBox(targets[j].box)) {
            onTargetHit(targets[j].uuid);
            sounds.playEnemyDamageBeep();
            this.createExplosionSparks(proj.mesh.position, 0xffaa00); // Orange glowing sparks
            this.destroyProjectile(i);
            hit = true;
            break;
          }
        }
        if (hit) continue;
      }

      // E. Out of bounds check (clean up stray bullets)
      if (prevPosition.lengthSq() > 3000) {
        this.destroyProjectile(i);
      }
    }

    // 2. Update Splash Particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.mesh.position.add(p.velocity.clone().multiplyScalar(deltaTime));
      
      // Rotate particle slightly
      p.mesh.rotation.x += 0.05;
      p.mesh.rotation.y += 0.05;

      p.life -= p.decay * deltaTime;

      // Fade out material
      const mat = p.mesh.material as THREE.MeshBasicMaterial;
      mat.opacity = p.life;

      if (p.life <= 0) {
        this.scene.remove(p.mesh);
        p.mesh.geometry.dispose();
        (p.mesh.material as THREE.Material).dispose();
        this.particles.splice(i, 1);
      }
    }
  }

  private destroyProjectile(index: number) {
    const proj = this.projectiles[index];
    this.scene.remove(proj.mesh);
    proj.mesh.geometry.dispose();
    (proj.mesh.material as THREE.Material).dispose();

    if (proj.light) {
      this.scene.remove(proj.light);
      proj.light.dispose();
    }

    this.projectiles.splice(index, 1);
  }

  private createExplosionSparks(position: THREE.Vector3, color: number) {
    const count = 12;
    const particleGeo = new THREE.BoxGeometry(0.1, 0.1, 0.1);

    for (let i = 0; i < count; i++) {
      const mat = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 1.0,
      });
      const mesh = new THREE.Mesh(particleGeo, mat);
      mesh.position.copy(position);
      this.scene.add(mesh);

      // Random explosion velocity vector
      const velocity = new THREE.Vector3(
        (Math.random() - 0.5) * 15,
        (Math.random() - 0.2) * 10 + 2, // Slight upward bias
        (Math.random() - 0.5) * 15
      );

      this.particles.push({
        mesh,
        velocity,
        life: 1.0,
        decay: Math.random() * 2.0 + 2.0, // Decay in 0.25 to 0.5s
      });
    }
  }

  public clearAll() {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      this.destroyProjectile(i);
    }
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      this.scene.remove(p.mesh);
      p.mesh.geometry.dispose();
      (p.mesh.material as THREE.Material).dispose();
    }
    this.particles = [];
  }
}
