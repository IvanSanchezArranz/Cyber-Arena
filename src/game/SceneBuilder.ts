import * as THREE from "three";

export interface ArenaObstacle {
  mesh: THREE.Mesh;
  boundingBox: THREE.Box3;
}

export class SceneBuilder {
  private scene: THREE.Scene;
  private environmentGroup: THREE.Group;
  private obstacles: ArenaObstacle[] = [];
  public arenaSize = 80;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    // Group all static environment meshes to allow seamless, memory-safe clearing and rebuilding
    this.environmentGroup = new THREE.Group();
    this.scene.add(this.environmentGroup);
  }

  public getObstacles(): ArenaObstacle[] {
    return this.obstacles;
  }

  /**
   * Memory-safe clearing of previous 3D models to prevent GPU memory leaks
   */
  public clear() {
    this.obstacles = [];
    
    while (this.environmentGroup.children.length > 0) {
      const obj = this.environmentGroup.children[0];
      this.environmentGroup.remove(obj);

      if (obj instanceof THREE.Mesh) {
        if (obj.geometry) obj.geometry.dispose();
        if (Array.isArray(obj.material)) {
          obj.material.forEach((mat) => mat.dispose());
        } else if (obj.material) {
          obj.material.dispose();
        }
      }
    }
  }

  /**
   * Dynamically build environment based on active game mode
   */
  public build(mode: "ARENA" | "GALLERY") {
    this.clear();

    if (mode === "ARENA") {
      this.buildArenaEnvironment();
    } else {
      this.buildGalleryEnvironment();
    }

    this.createAmbientParticleStarfield();
  }

  private buildArenaEnvironment() {
    this.createArenaLights();
    this.createArenaFloor();
    this.createBoundaryWalls(0x3e456c, 0x00ffff); // Cyan glowing walls
    this.createArenaObstacles();
  }

  private buildGalleryEnvironment() {
    this.createGalleryLights();
    this.createGalleryFloor();
    this.createBoundaryWalls(0x42381f, 0xffaa00); // Yellow/Orange glowing range tunnel
    this.createGalleryRangeWall();
    this.createGalleryBooth();
  }

  private createGalleryBooth() {
    // 1. Shooting Bench Counter (Right in front of player at Z = 1.5, Y = 0.9m)
    const benchGeo = new THREE.BoxGeometry(3.5, 0.9, 0.8);
    const benchMat = new THREE.MeshStandardMaterial({
      color: 0x1f1910, // Dark copper/carbon
      roughness: 0.6,
      metalness: 0.7
    });
    const bench = new THREE.Mesh(benchGeo, benchMat);
    bench.position.set(0, 0.45, 1.5);
    bench.receiveShadow = true;
    bench.castShadow = true;
    this.environmentGroup.add(bench);

    // 2. Side Stall Divider Panels (X = -1.8m and X = 1.8m)
    const dividerGeo = new THREE.BoxGeometry(0.08, 2.5, 3.0);
    const dividerMat = new THREE.MeshStandardMaterial({
      color: 0x0c0f1d,
      roughness: 0.2,
      metalness: 0.9
    });

    const leftDivider = new THREE.Mesh(dividerGeo, dividerMat);
    leftDivider.position.set(-1.8, 1.25, 1.5);
    leftDivider.castShadow = true;
    leftDivider.receiveShadow = true;
    this.environmentGroup.add(leftDivider);

    const rightDivider = leftDivider.clone();
    rightDivider.position.set(1.8, 1.25, 1.5);
    this.environmentGroup.add(rightDivider);

    // 3. Neon indicator strip on dividers
    const trimGeo = new THREE.BoxGeometry(0.1, 0.05, 3.0);
    const trimMat = new THREE.MeshBasicMaterial({ color: 0xffaa00 });
    const trimL = new THREE.Mesh(trimGeo, trimMat);
    trimL.position.set(-1.78, 2.45, 1.5);
    this.environmentGroup.add(trimL);
    const trimR = trimL.clone();
    trimR.position.set(1.78, 2.45, 1.5);
    this.environmentGroup.add(trimR);
  }

  /* =========================================================================
     1. ARENA COMBAT ENVIRONMENT
     ========================================================================= */

  private createArenaLights() {
    const ambientLight = new THREE.AmbientLight(0xffffff, 2.2);
    this.environmentGroup.add(ambientLight);

    const hemiLight = new THREE.HemisphereLight(0xe5f0ff, 0x3d425c, 2.0);
    this.environmentGroup.add(hemiLight);

    const cyanLight = new THREE.DirectionalLight(0x00ffff, 3.5);
    cyanLight.position.set(-30, 45, -30);
    cyanLight.castShadow = true;
    cyanLight.shadow.mapSize.width = 1024;
    cyanLight.shadow.mapSize.height = 1024;
    this.environmentGroup.add(cyanLight);

    const magentaLight = new THREE.DirectionalLight(0xff00ff, 2.5);
    magentaLight.position.set(30, 30, 30);
    this.environmentGroup.add(magentaLight);

    const centerGlow = new THREE.PointLight(0x00aaff, 3.5, 55);
    centerGlow.position.set(0, 5, 0);
    this.environmentGroup.add(centerGlow);
  }

  private createArenaFloor() {
    const floorGeo = new THREE.PlaneGeometry(this.arenaSize, this.arenaSize);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x1f243d,
      roughness: 0.6,
      metalness: 0.85,
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.environmentGroup.add(floor);

    // Grid Overlay
    const gridHelper = new THREE.GridHelper(this.arenaSize, 40, 0x222a44, 0x0e1122);
    gridHelper.position.y = 0.01;
    this.environmentGroup.add(gridHelper);
  }

  private createArenaObstacles() {
    const obstacleMaterial = new THREE.MeshStandardMaterial({
      color: 0x4f577c,
      roughness: 0.15,
      metalness: 0.85,
    });

    const trimMaterial = new THREE.MeshBasicMaterial({ color: 0xff00ff });

    const layout = [
      { pos: [-20, 0, -20], size: [4, 10, 4] },
      { pos: [20, 0, -20], size: [4, 10, 4] },
      { pos: [-20, 0, 20], size: [4, 10, 4] },
      { pos: [20, 0, 20], size: [4, 10, 4] },
      { pos: [0, 0, -10], size: [10, 6, 2] },
      { pos: [0, 0, 10], size: [10, 6, 2] },
      { pos: [-15, 0, 0], size: [2, 6, 10] },
      { pos: [15, 0, 0], size: [2, 6, 10] },
    ];

    layout.forEach((block, index) => {
      const geo = new THREE.BoxGeometry(block.size[0], block.size[1], block.size[2]);
      const mesh = new THREE.Mesh(geo, obstacleMaterial);
      mesh.position.set(block.pos[0], block.size[1] / 2, block.pos[2]);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      this.environmentGroup.add(mesh);

      const box = new THREE.Box3().setFromObject(mesh);
      this.obstacles.push({ mesh, boundingBox: box });

      const trimGeo = new THREE.BoxGeometry(block.size[0] + 0.1, 0.15, block.size[2] + 0.1);
      const trim = new THREE.Mesh(trimGeo, index % 2 === 0 ? trimMaterial : new THREE.MeshBasicMaterial({ color: 0x00ffff }));
      trim.position.set(block.pos[0], block.size[1], block.pos[2]);
      this.environmentGroup.add(trim);
    });
  }

  /* =========================================================================
     2. SHOOTING GALLERY / AIM practice ENVIRONMENT
     ========================================================================= */

  private createGalleryLights() {
    // Brighter white general lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 2.5);
    this.environmentGroup.add(ambientLight);

    const hemiLight = new THREE.HemisphereLight(0xffea00, 0x1f1805, 2.0); // Warm Amber glow
    this.environmentGroup.add(hemiLight);

    // Dynamic direct spots illuminating the lane
    const keySpot = new THREE.DirectionalLight(0xffaa00, 3.8);
    keySpot.position.set(0, 40, 20);
    this.environmentGroup.add(keySpot);

    const backSpot = new THREE.DirectionalLight(0xff7700, 2.5);
    backSpot.position.set(0, 30, -35);
    this.environmentGroup.add(backSpot);
  }

  private createGalleryFloor() {
    const floorGeo = new THREE.PlaneGeometry(this.arenaSize, this.arenaSize);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x241d0f, // Warm copper-dark floor
      roughness: 0.35,
      metalness: 0.9,
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.environmentGroup.add(floor);

    // Glowing Yellow/Orange training grid floor
    const gridHelper = new THREE.GridHelper(this.arenaSize, 30, 0xffaa00, 0x3d2b05);
    gridHelper.position.y = 0.01;
    this.environmentGroup.add(gridHelper);
  }

  private createGalleryRangeWall() {
    // A huge, bright neon-ring wall at the end of the range (Z = -38)
    const wallGeo = new THREE.PlaneGeometry(this.arenaSize, 12);
    const wallMat = new THREE.MeshStandardMaterial({
      color: 0x15120a,
      roughness: 0.5,
      metalness: 0.8
    });
    const mesh = new THREE.Mesh(wallGeo, wallMat);
    mesh.position.set(0, 6, -this.arenaSize / 2 + 0.1);
    this.environmentGroup.add(mesh);

    // Draw circular high-visibility targeting decals on the back wall
    const colors = [0xff7700, 0xffaa00, 0x222222];
    colors.forEach((col, idx) => {
      const ringGeo = new THREE.RingGeometry(8 - idx * 2.5, 9 - idx * 2.5, 32);
      const ringMat = new THREE.MeshBasicMaterial({ color: col, side: THREE.DoubleSide });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.position.set(0, 6, -this.arenaSize / 2 + 0.2);
      this.environmentGroup.add(ring);
    });
  }

  /* =========================================================================
     3. REUSABLE SHARED GEOMETRIES
     ========================================================================= */

  private createBoundaryWalls(wallColor: number, trimColor: number) {
    const halfSize = this.arenaSize / 2;
    const wallHeight = 12;
    const wallThickness = 2;

    const wallMaterial = new THREE.MeshStandardMaterial({
      color: wallColor,
      roughness: 0.3,
      metalness: 0.8,
    });

    const wallGlowMaterial = new THREE.MeshBasicMaterial({
      color: trimColor,
      side: THREE.DoubleSide,
    });

    const walls = [
      { size: [this.arenaSize + wallThickness * 2, wallHeight, wallThickness], pos: [0, wallHeight / 2, -halfSize] },
      { size: [this.arenaSize + wallThickness * 2, wallHeight, wallThickness], pos: [0, wallHeight / 2, halfSize] },
      { size: [wallThickness, wallHeight, this.arenaSize], pos: [halfSize, wallHeight / 2, 0] },
      { size: [wallThickness, wallHeight, this.arenaSize], pos: [-halfSize, wallHeight / 2, 0] },
    ];

    walls.forEach((w) => {
      const geo = new THREE.BoxGeometry(w.size[0], w.size[1], w.size[2]);
      const mesh = new THREE.Mesh(geo, wallMaterial);
      mesh.position.set(w.pos[0], w.pos[1], w.pos[2]);
      mesh.receiveShadow = true;
      mesh.castShadow = true;
      this.environmentGroup.add(mesh);

      const box = new THREE.Box3().setFromObject(mesh);
      this.obstacles.push({ mesh, boundingBox: box });

      const trimGeo = new THREE.BoxGeometry(w.size[0], 0.2, w.size[2] + 0.1);
      const trim = new THREE.Mesh(trimGeo, wallGlowMaterial);
      trim.position.set(w.pos[0], wallHeight - 0.1, w.pos[2]);
      this.environmentGroup.add(trim);
    });
  }

  private createAmbientParticleStarfield() {
    const starGeo = new THREE.BufferGeometry();
    const count = 400;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 160;
      positions[i * 3 + 1] = Math.random() * 40 + 5;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 160;

      const rand = Math.random();
      if (rand < 0.4) {
        colors[i * 3] = 1.0;
        colors[i * 3 + 1] = 0.7;
        colors[i * 3 + 2] = 0.0; // Warm golden stars
      } else if (rand < 0.8) {
        colors[i * 3] = 1.0;
        colors[i * 3 + 1] = 0.0;
        colors[i * 3 + 2] = 1.0; // Magenta
      } else {
        colors[i * 3] = 0.8;
        colors[i * 3 + 1] = 0.8;
        colors[i * 3 + 2] = 1.0;
      }
    }

    starGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    starGeo.setAttribute("color", new THREE.BufferAttribute(colors, 3));

    const starMat = new THREE.PointsMaterial({
      size: 0.25,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
    });

    const starPoints = new THREE.Points(starGeo, starMat);
    this.environmentGroup.add(starPoints);
  }
}
