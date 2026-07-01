import * as THREE from "three";
import { SceneBuilder } from "./SceneBuilder";
import { WeaponSystem } from "./WeaponSystem";
import { PlayerController } from "./PlayerController";
import { EnemyController, EnemyState } from "./EnemyController";
import { TargetManager } from "./TargetManager";
import { sounds } from "./SoundEffects";

export interface GameUIState {
  playerHealth: number;
  playerShield: number;
  playerScore: number;
  enemyHealth: number;
  enemyState: string;
  gameStatus: "START" | "PLAYING" | "PAUSED" | "GAMEOVER" | "VICTORY" | "TIMEOUT";
  gameMode: "ARENA" | "GALLERY";
  timeLeft: number;
  highScore: number;
  droneKills: number;
  playerX: number;
  playerZ: number;
  enemyX: number;
  enemyZ: number;
  targetsPos: { x: number; z: number }[];
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
  public targetManager!: TargetManager;

  // State
  private gameStatus: GameUIState["gameStatus"] = "START";
  public gameMode: GameUIState["gameMode"] = "ARENA";
  private timeLeft = 60.0; // 60 seconds time limit for Shooting Gallery
  private highScore = 0;
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

    // Load saved High Score from localStorage
    const savedRecord = localStorage.getItem("gallery_highscore");
    this.highScore = savedRecord ? parseInt(savedRecord) : 0;

    this.initThree();
    this.buildWorld();
    this.syncUI();
  }

  private initThree() {
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x0a0d24, 0.004); // Cyber fog

    // Perspective Camera
    this.camera = new THREE.PerspectiveCamera(
      70,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );

    // WebGL Renderer
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
    // Attach weapon mesh strictly to the camera viewport
    this.camera.add(this.player.gunMesh);
    this.scene.add(this.camera);

    // 4. EnemyController
    this.enemy = new EnemyController(
      this.scene,
      this.weaponSystem,
      this.sceneBuilder.getObstacles()
    );

    // 5. TargetManager for Shooting Gallery Mode
    this.targetManager = new TargetManager(this.scene);
  }

  public startGame(mode: GameUIState["gameMode"] = "ARENA") {
    sounds.startAmbientHum();
    this.gameMode = mode;
    this.gameStatus = "PLAYING";
    this.clock.getDelta(); // Reset clock delta
    this.isLoopRunning = true;

    if (this.gameMode === "GALLERY") {
      this.timeLeft = 60.0; // 60s practice countdown
      this.player.score = 0;
      this.targetManager.clearAll();
      // Remove enemy drone from scene
      this.scene.remove(this.enemy.mesh);
    } else {
      // Re-add enemy drone if we are in Arena mode
      if (!this.enemy.isDead) {
        this.scene.add(this.enemy.mesh);
      }
    }

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

  public restartGame(mode: GameUIState["gameMode"] = "ARENA") {
    this.gameMode = mode;
    this.levelMultiplier = 1.0;
    this.droneKills = 0;
    this.player.reset();
    this.weaponSystem.clearAll();
    this.targetManager.clearAll();
    
    if (this.gameMode === "ARENA") {
      if (this.enemy.isDead) {
        this.enemy.respawn(this.levelMultiplier);
      } else {
        this.enemy.position.set(0, 2.5, -25);
        this.enemy.health = 100;
        this.enemy.maxHealth = 100;
        this.enemy.state = EnemyState.PATROL;
      }
    } else {
      this.enemy.isDead = true;
      this.scene.remove(this.enemy.mesh);
    }

    this.startGame(mode);
  }

  private tick = () => {
    if (!this.isLoopRunning) return;

    let deltaTime = this.clock.getDelta();
    if (deltaTime > 0.1) deltaTime = 0.1;

    // 1. Update Player Controls
    this.player.update(deltaTime);

    // Sync blaster position
    const gunTargetPos = this.camera.position.clone();
    this.player.gunMesh.position.copy(gunTargetPos);
    this.player.gunMesh.rotation.copy(this.camera.rotation);

    // 2. Mode-Specific updates
    if (this.gameMode === "ARENA") {
      // ARENA MODE: Update Combat Drone
      if (!this.enemy.isDead) {
        this.enemy.update(deltaTime, this.player.position);
      } else {
        setTimeout(() => {
          if (this.enemy.isDead && this.gameStatus === "PLAYING" && this.gameMode === "ARENA") {
            this.levelMultiplier += 0.15;
            this.enemy.respawn(this.levelMultiplier);
            this.syncUI();
          }
        }, 3000);
      }
    } else {
      // GALLERY MODE: Update Active Practice Targets & Timer
      this.timeLeft -= deltaTime;
      if (this.timeLeft <= 0) {
        this.timeLeft = 0;
        this.handleTimeout();
        return;
      }
      this.targetManager.update(deltaTime);
    }

    // 3. Update Weapon Projectiles & Particles
    const targetBoxes = this.gameMode === "GALLERY" ? this.targetManager.targets.map(t => t.box) : [];
    
    this.weaponSystem.update(
      deltaTime,
      (damage) => {
        // Player takes damage (only in Arena)
        if (this.gameMode === "ARENA") {
          this.player.takeDamage(damage);
          this.syncUI();
          if (this.player.isDead) {
            this.handleGameOver();
          }
        }
      },
      (damage) => {
        // Enemy drone takes damage (only in Arena)
        if (this.gameMode === "ARENA") {
          this.enemy.takeDamage(damage);
          this.syncUI();
          if (this.enemy.isDead) {
            this.droneKills += 1;
            this.player.score += 250;
            this.player.heal(30);
            
            if (this.droneKills >= 5) {
              this.handleVictory();
            }
            this.syncUI();
          }
        }
      },
      (targetIndex) => {
        // Target is shot (only in Gallery)
        if (this.gameMode === "GALLERY") {
          this.targetManager.removeTarget(targetIndex);
          this.player.score += 100; // 100 points per target hit
          this.syncUI();
        }
      },
      this.player.position,
      (this.gameMode === "ARENA" && !this.enemy.isDead) ? this.enemy.getBoundingBox() : null,
      targetBoxes
    );

    // 4. Render Frame
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

  private handleTimeout() {
    this.gameStatus = "TIMEOUT";
    this.isLoopRunning = false;
    this.renderer.setAnimationLoop(null);
    sounds.stopAmbientHum();
    sounds.playVictoryTune(); // Play victory tune because completing practice is a success!

    // Verify and update scoreboard high record
    if (this.player.score > this.highScore) {
      this.highScore = this.player.score;
      localStorage.setItem("gallery_highscore", this.highScore.toString());
    }

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
      enemyHealth: (this.gameMode === "ARENA" && !this.enemy.isDead) 
        ? Math.round((this.enemy.health / this.enemy.maxHealth) * 100) 
        : 0,
      enemyState: (this.gameMode === "ARENA" && !this.enemy.isDead) 
        ? EnemyState[this.enemy.state] 
        : "DESTROYED",
      gameStatus: this.gameStatus,
      gameMode: this.gameMode,
      timeLeft: this.timeLeft,
      highScore: this.highScore,
      droneKills: this.droneKills,
      playerX: this.player.position.x,
      playerZ: this.player.position.z,
      enemyX: (this.gameMode === "ARENA" && !this.enemy.isDead) ? this.enemy.position.x : 0,
      enemyZ: (this.gameMode === "ARENA" && !this.enemy.isDead) ? this.enemy.position.z : 0,
      targetsPos: this.gameMode === "GALLERY" 
        ? this.targetManager.targets.map(t => ({ x: t.mesh.position.x, z: t.mesh.position.z })) 
        : []
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
