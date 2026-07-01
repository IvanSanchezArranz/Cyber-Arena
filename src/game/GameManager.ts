import * as THREE from "three";
import { SceneBuilder } from "./SceneBuilder";
import { WeaponSystem } from "./WeaponSystem";
import { PlayerController } from "./PlayerController";
import { EnemyController, EnemyState } from "./EnemyController";
import { sounds } from "./SoundEffects";

export interface GameUIState {
  playerHealth: number;
  playerShield: number;
  playerScore: number;
  enemyHealth: number;
  enemyState: string;
  gameStatus: "START" | "PLAYING" | "PAUSED" | "GAMEOVER" | "VICTORY";
  droneKills: number;
  playerX: number;
  playerZ: number;
  enemyX: number;
  enemyZ: number;
}

export class GameManager {
  private container: HTMLDivElement;
  private canvas: HTMLCanvasElement;
  private onUIUpdate: (state: GameUIState) => void;

  // Three.js Core
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private clock!: THREE.Clock;
  private isLoopRunning = false;

  // Game Systems
  private sceneBuilder!: SceneBuilder;
  private weaponSystem!: WeaponSystem;
  public player!: PlayerController;
  public enemy!: EnemyController;

  // State
  private gameStatus: GameUIState["gameStatus"] = "START";
  private droneKills = 0;
  private levelMultiplier = 1.0;

  constructor(
    container: HTMLDivElement,
    canvas: HTMLCanvasElement,
    onUIUpdate: (state: GameUIState) => void
  ) {
    this.container = container;
    this.canvas = canvas;
    this.onUIUpdate = onUIUpdate;

    this.initThree();
    this.buildWorld();
    this.syncUI();
  }

  private initThree() {
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x0a0d24, 0.004); // Lighter, thinner fog for clear vision across the arena

    // Perspective Camera
    this.camera = new THREE.PerspectiveCamera(
      70,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );

    // Renderer
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      powerPreference: "high-performance",
    });
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;

    this.clock = new THREE.Clock();

    window.addEventListener("resize", this.handleResize);
  }

  private buildWorld() {
    // 1. SceneBuilder
    this.sceneBuilder = new SceneBuilder(this.scene);
    this.sceneBuilder.build();

    // 2. WeaponSystem
    this.weaponSystem = new WeaponSystem(this.scene, this.sceneBuilder.getObstacles());

    // 3. PlayerController
    this.player = new PlayerController(
      this.camera,
      this.weaponSystem,
      this.sceneBuilder.getObstacles()
    );
    // Attach weapon mesh strictly to the camera viewport so it stays in the bottom right corner
    this.camera.add(this.player.gunMesh);
    this.scene.add(this.camera);

    // 4. EnemyController
    this.enemy = new EnemyController(
      this.scene,
      this.weaponSystem,
      this.sceneBuilder.getObstacles()
    );
  }

  public startGame() {
    sounds.startAmbientHum();
    this.gameStatus = "PLAYING";
    this.clock.getDelta(); // Reset clock delta
    this.isLoopRunning = true;
    this.renderer.setAnimationLoop(this.tick);
    this.syncUI();
  }

  public pauseGame() {
    this.gameStatus = "PAUSED";
    this.isLoopRunning = false;
    this.renderer.setAnimationLoop(null);
    sounds.stopAmbientHum();
    this.syncUI();
  }

  public resumeGame() {
    sounds.startAmbientHum();
    this.gameStatus = "PLAYING";
    this.clock.getDelta();
    this.isLoopRunning = true;
    this.renderer.setAnimationLoop(this.tick);
    this.syncUI();
  }

  public restartGame() {
    this.levelMultiplier = 1.0;
    this.droneKills = 0;
    this.player.reset();
    this.weaponSystem.clearAll();
    
    if (this.enemy.isDead) {
      this.enemy.respawn(this.levelMultiplier);
    } else {
      this.enemy.position.set(0, 2.5, -25);
      this.enemy.health = 100;
      this.enemy.maxHealth = 100;
      this.enemy.state = EnemyState.PATROL;
    }

    this.startGame();
  }

  private tick = () => {
    if (!this.isLoopRunning) return;

    let deltaTime = this.clock.getDelta();
    // Clamp delta to prevent huge leaps on tab switches
    if (deltaTime > 0.1) deltaTime = 0.1;

    // 1. Update Player Controls & Camera
    this.player.update(deltaTime);

    // 2. Update Enemy AI Drone
    if (!this.enemy.isDead) {
      this.enemy.update(deltaTime, this.player.position);
    } else {
      // Handles respawning after 3 seconds with higher difficulty!
      setTimeout(() => {
        if (this.enemy.isDead && this.gameStatus === "PLAYING") {
          this.levelMultiplier += 0.15; // +15% HP per kill
          this.enemy.respawn(this.levelMultiplier);
          this.syncUI();
        }
      }, 3000);
    }

    // 3. Update Projectiles & Particles & check damage hits
    this.weaponSystem.update(
      deltaTime,
      (damage) => {
        this.player.takeDamage(damage);
        this.syncUI();
        if (this.player.isDead) {
          this.handleGameOver();
        }
      },
      (damage) => {
        this.enemy.takeDamage(damage);
        this.syncUI();
        if (this.enemy.isDead) {
          this.droneKills += 1;
          this.player.score += 250; // Points for drone elimination
          this.player.heal(30); // Regain health/shields on victory
          
          if (this.droneKills >= 5) { // 5 Drone kills = Ultimate Victory!
            this.handleVictory();
          }
          this.syncUI();
        }
      },
      this.player.position,
      this.enemy.isDead ? null : this.enemy.getBoundingBox()
    );

    // 4. Render 3D Frame
    this.renderer.render(this.scene, this.camera);
  };

  private handleGameOver() {
    this.gameStatus = "GAMEOVER";
    this.isLoopRunning = false;
    this.renderer.setAnimationLoop(null);
    sounds.stopAmbientHum();
    sounds.playDefeatTune();
    this.syncUI();
  }

  private handleVictory() {
    this.gameStatus = "VICTORY";
    this.isLoopRunning = false;
    this.renderer.setAnimationLoop(null);
    sounds.stopAmbientHum();
    sounds.playVictoryTune();
    this.syncUI();
  }

  private handleResize = () => {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();

    this.renderer.setSize(width, height);
  };

  private syncUI() {
    this.onUIUpdate({
      playerHealth: this.player.health,
      playerShield: this.player.shield,
      playerScore: this.player.score,
      enemyHealth: this.enemy.isDead ? 0 : Math.round((this.enemy.health / this.enemy.maxHealth) * 100),
      enemyState: this.enemy.isDead ? "DESTROYED" : EnemyState[this.enemy.state],
      gameStatus: this.gameStatus,
      droneKills: this.droneKills,
      playerX: this.player.position.x,
      playerZ: this.player.position.z,
      enemyX: this.enemy.position.x,
      enemyZ: this.enemy.position.z,
    });
  }

  public dispose() {
    this.isLoopRunning = false;
    this.renderer.setAnimationLoop(null);
    window.removeEventListener("resize", this.handleResize);
    sounds.stopAmbientHum();

    // Dispose Geometries/Materials
    this.scene.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        if (object.geometry) object.geometry.dispose();
        if (Array.isArray(object.material)) {
          object.material.forEach((mat) => mat.dispose());
        } else if (object.material) {
          object.material.dispose();
        }
      }
    });

    this.renderer.dispose();
  }
}
