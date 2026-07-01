import * as THREE from "three";

export interface ArenaObstacle {
  mesh: THREE.Mesh;
  boundingBox: THREE.Box3;
}

export class SceneBuilder {
  private scene: THREE.Scene;
  private obstacles: ArenaObstacle[] = [];
  public arenaSize = 80; // Size of the arena (square: -40 to +40)

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  public build() {
    this.createLights();
    this.createFloor();
    this.createBoundaryWalls();
    this.createObstacles();
    this.createAmbientParticleStarfield();
  }

  public getObstacles(): ArenaObstacle[] {
    return this.obstacles;
  }

  private createLights() {
    // 1. General ambient illumination (high-intensity white)
    const ambientLight = new THREE.AmbientLight(0xffffff, 2.2);
    this.scene.add(ambientLight);

    // 2. Strong HemisphereLight for dual bounce (bright sky to gray-steel ground)
    const hemiLight = new THREE.HemisphereLight(0xe5f0ff, 0x3d425c, 2.0);
    this.scene.add(hemiLight);

    // 3. High-key cyan directional light (highly intense, level 3.5)
    const cyanLight = new THREE.DirectionalLight(0x00ffff, 3.5);
    cyanLight.position.set(-30, 45, -30);
    cyanLight.castShadow = true;
    cyanLight.shadow.mapSize.width = 2048; // Higher resolution shadows
    cyanLight.shadow.mapSize.height = 2048;
    cyanLight.shadow.camera.near = 0.5;
    cyanLight.shadow.camera.far = 150;
    const d = 45;
    cyanLight.shadow.camera.left = -d;
    cyanLight.shadow.camera.right = d;
    cyanLight.shadow.camera.top = d;
    cyanLight.shadow.camera.bottom = -d;
    this.scene.add(cyanLight);

    // 4. Emissive magenta directional light (brighter fill, level 2.5)
    const magentaLight = new THREE.DirectionalLight(0xff00ff, 2.5);
    magentaLight.position.set(30, 30, 30);
    this.scene.add(magentaLight);

    // 5. Center beacon point light (bright center, level 3.5)
    const centerGlow = new THREE.PointLight(0x00aaff, 3.5, 55);
    centerGlow.position.set(0, 5, 0);
    this.scene.add(centerGlow);
  }

  private createFloor() {
    // Ground base plane
    const floorGeo = new THREE.PlaneGeometry(this.arenaSize, this.arenaSize);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x1f243d, // Slate metal gray-blue for excellent light reflections
      roughness: 0.6,
      metalness: 0.85,
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.scene.add(floor);

    // Grid Overlay - Extremely subtle dark slate lines to prevent central line alignment
    const gridHelper = new THREE.GridHelper(this.arenaSize, 40, 0x222a44, 0x0e1122);
    gridHelper.position.y = 0.01; // Slightly above ground to prevent z-fighting
    this.scene.add(gridHelper);
  }

  private createBoundaryWalls() {
    const halfSize = this.arenaSize / 2;
    const wallHeight = 12;
    const wallThickness = 2;

    const wallMaterial = new THREE.MeshStandardMaterial({
      color: 0x3e456c, // Brighter slate-steel for highly defined textures
      roughness: 0.35,
      metalness: 0.75,
    });

    const wallGlowMaterial = new THREE.MeshBasicMaterial({
      color: 0x00ffff,
      side: THREE.DoubleSide,
    });

    // Wall geometries
    const walls = [
      // North
      { size: [this.arenaSize + wallThickness * 2, wallHeight, wallThickness], pos: [0, wallHeight / 2, -halfSize] },
      // South
      { size: [this.arenaSize + wallThickness * 2, wallHeight, wallThickness], pos: [0, wallHeight / 2, halfSize] },
      // East
      { size: [wallThickness, wallHeight, this.arenaSize], pos: [halfSize, wallHeight / 2, 0] },
      // West
      { size: [wallThickness, wallHeight, this.arenaSize], pos: [-halfSize, wallHeight / 2, 0] },
    ];

    walls.forEach((w) => {
      // Create physical wall
      const geo = new THREE.BoxGeometry(w.size[0], w.size[1], w.size[2]);
      const mesh = new THREE.Mesh(geo, wallMaterial);
      mesh.position.set(w.pos[0], w.pos[1], w.pos[2]);
      mesh.receiveShadow = true;
      mesh.castShadow = true;
      this.scene.add(mesh);

      // Add a bounding box for collision detection
      const box = new THREE.Box3().setFromObject(mesh);
      this.obstacles.push({ mesh, boundingBox: box });

      // Create neon trim lights along the wall top
      const trimGeo = new THREE.BoxGeometry(w.size[0], 0.2, w.size[2] + 0.1);
      const trim = new THREE.Mesh(trimGeo, wallGlowMaterial);
      trim.position.set(w.pos[0], wallHeight - 0.1, w.pos[2]);
      this.scene.add(trim);
    });
  }

  private createObstacles() {
    const obstacleMaterial = new THREE.MeshStandardMaterial({
      color: 0x4f577c, // Highly visible metallic blue-steel
      roughness: 0.15,
      metalness: 0.85,
    });

    const trimMaterial = new THREE.MeshBasicMaterial({
      color: 0xff00ff, // Pink neon accents for obstacles
    });

    // Preset positions for tactical cover boxes
    const layout = [
      // Corner columns
      { pos: [-20, 0, -20], size: [4, 10, 4] },
      { pos: [20, 0, -20], size: [4, 10, 4] },
      { pos: [-20, 0, 20], size: [4, 10, 4] },
      { pos: [20, 0, 20], size: [4, 10, 4] },
      // Center partitions
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
      this.scene.add(mesh);

      // Track bounding box for gun projectile and player collision detection
      const box = new THREE.Box3().setFromObject(mesh);
      this.obstacles.push({ mesh, boundingBox: box });

      // Add thin glowing neon lines around the top edges of columns
      const trimGeo = new THREE.BoxGeometry(block.size[0] + 0.1, 0.15, block.size[2] + 0.1);
      const trim = new THREE.Mesh(trimGeo, index % 2 === 0 ? trimMaterial : new THREE.MeshBasicMaterial({ color: 0x00ffff }));
      trim.position.set(block.pos[0], block.size[1], block.pos[2]);
      this.scene.add(trim);
    });
  }

  private createAmbientParticleStarfield() {
    const starGeo = new THREE.BufferGeometry();
    const count = 400;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      // Spawn particles above and around the arena
      positions[i * 3] = (Math.random() - 0.5) * 160;
      positions[i * 3 + 1] = Math.random() * 40 + 5; // Height 5 to 45
      positions[i * 3 + 2] = (Math.random() - 0.5) * 160;

      // Mixture of cyan, magenta, and white particles
      const rand = Math.random();
      if (rand < 0.4) {
        // Cyan
        colors[i * 3] = 0.0;
        colors[i * 3 + 1] = 1.0;
        colors[i * 3 + 2] = 1.0;
      } else if (rand < 0.8) {
        // Magenta
        colors[i * 3] = 1.0;
        colors[i * 3 + 1] = 0.0;
        colors[i * 3 + 2] = 1.0;
      } else {
        // Soft white
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
    this.scene.add(starPoints);
  }
}
