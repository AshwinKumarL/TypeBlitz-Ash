import * as THREE from 'three';

// ---------------------------------------------------------------------------
// STRAIGHT ROAD CONSTANTS
// ---------------------------------------------------------------------------
export const ROAD_WIDTH = 10.0;
export const ROAD_HALF_WIDTH = ROAD_WIDTH / 2; // 5.0m
export const CHUNK_LENGTH = 100.0;
export const NUM_CHUNKS = 18;

export class StraightWorld {
  constructor(scene) {
    this.scene = scene;

    // 1. Bright Blue Sky & Atmospheric Fog
    this._setupBlueSky();

    // 2. Consistent Sunlight & Ambient Lighting
    this._setupLighting();

    // 3. Continuous Flat Green Terrain
    this._setupGround();

    // 4. Distant Low-Poly Mountains & Hills
    this._setupMountains();

    // 5. Straight Road Chunks & Scenery Pool
    this._setupChunks();
  }

  // -------------------------------------------------------------------------
  // 1. Blue Sky & Atmospheric Depth
  // -------------------------------------------------------------------------
  _setupBlueSky() {
    if (typeof document !== 'undefined') {
      const canvas = document.createElement('canvas');
      canvas.width = 32;
      canvas.height = 512;
      const ctx = canvas.getContext('2d');

      const grad = ctx.createLinearGradient(0, 0, 0, 512);
      grad.addColorStop(0.0, '#1d4ed8'); // rich cobalt blue zenith
      grad.addColorStop(0.35, '#38bdf8'); // vibrant sky blue
      grad.addColorStop(0.75, '#93c5fd'); // soft atmospheric cyan
      grad.addColorStop(1.0, '#dbeafe'); // bright horizon haze

      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 32, 512);

      const bgTexture = new THREE.CanvasTexture(canvas);
      bgTexture.colorSpace = THREE.SRGBColorSpace;
      this.scene.background = bgTexture;
    } else {
      this.scene.background = new THREE.Color(0x38bdf8);
    }

    // Soft atmospheric horizon fog
    const fogColor = new THREE.Color(0xcbe6fd);
    this.scene.fog = new THREE.Fog(fogColor, 200, 1100);
  }

  // -------------------------------------------------------------------------
  // 2. Consistent Natural Sunlight & Hemisphere Ambient
  // -------------------------------------------------------------------------
  _setupLighting() {
    // Natural hemisphere ambient light (bright sky, soft grass bounce)
    const hemiLight = new THREE.HemisphereLight(0xe0f2fe, 0x4d7c0f, 0.75);
    this.scene.add(hemiLight);

    // Warm natural sun casting crisp, low-poly shadows
    this.sun = new THREE.DirectionalLight(0xfffbeb, 1.3);
    this.sun.position.set(-50, 65, -40);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.width = 2048;
    this.sun.shadow.mapSize.height = 2048;
    this.sun.shadow.camera.near = 10;
    this.sun.shadow.camera.far = 400;
    const shadowSpan = 70;
    this.sun.shadow.camera.left = -shadowSpan;
    this.sun.shadow.camera.right = shadowSpan;
    this.sun.shadow.camera.top = shadowSpan;
    this.sun.shadow.camera.bottom = -shadowSpan;
    this.sun.shadow.bias = -0.0003;
    this.scene.add(this.sun);

    this.sunTarget = new THREE.Object3D();
    this.scene.add(this.sunTarget);
    this.sun.target = this.sunTarget;
  }

  // -------------------------------------------------------------------------
  // 3. Continuous Flat Green Terrain
  // -------------------------------------------------------------------------
  _setupGround() {
    const groundGeo = new THREE.PlaneGeometry(3000, 3000);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x4ade80, // vibrant lush green field
      roughness: 0.9,
      metalness: 0.05,
      flatShading: true,
    });
    this.ground = new THREE.Mesh(groundGeo, groundMat);
    this.ground.rotation.x = -Math.PI / 2;
    this.ground.position.set(0, 0, 0); // flush at y = 0
    this.ground.receiveShadow = true;
    this.scene.add(this.ground);
  }

  // -------------------------------------------------------------------------
  // 4. Distant Mountains and Hills
  // -------------------------------------------------------------------------
  _setupMountains() {
    this.mountainGroup = new THREE.Group();

    const mountainMat = new THREE.MeshStandardMaterial({
      color: 0x475569, // slate mountain base
      roughness: 0.95,
      metalness: 0.1,
      flatShading: true,
    });
    const snowMat = new THREE.MeshStandardMaterial({
      color: 0xffffff, // crisp snowcaps
      roughness: 0.5,
      flatShading: true,
    });

    const mountainConfigs = [
      { x: -550, z: 250, r: 160, h: 260 },
      { x: -650, z: 650, r: 190, h: 320 },
      { x: -520, z: 1050, r: 150, h: 250 },
      { x: -620, z: 1450, r: 180, h: 310 },
      { x: 550, z: 350, r: 150, h: 250 },
      { x: 650, z: 750, r: 190, h: 320 },
      { x: 530, z: 1150, r: 160, h: 270 },
      { x: 640, z: 1550, r: 200, h: 330 },
    ];

    mountainConfigs.forEach(m => {
      const geo = new THREE.ConeGeometry(m.r, m.h, 7);
      const mesh = new THREE.Mesh(geo, mountainMat);
      mesh.position.set(m.x, m.h / 2, m.z);
      this.mountainGroup.add(mesh);

      const snowGeo = new THREE.ConeGeometry(m.r * 0.4, m.h * 0.4, 7);
      const snow = new THREE.Mesh(snowGeo, snowMat);
      snow.position.set(m.x, m.h - (m.h * 0.4) / 2, m.z);
      this.mountainGroup.add(snow);
    });

    this.scene.add(this.mountainGroup);
  }

  // -------------------------------------------------------------------------
  // 5. Straight Road Chunks & Scenery
  // -------------------------------------------------------------------------
  _setupChunks() {
    this.chunks = [];

    // Shared Materials
    this.matAsphalt = new THREE.MeshStandardMaterial({
      color: 0x1f242c, // smooth dark highway asphalt
      roughness: 0.78,
      metalness: 0.15,
      flatShading: true,
    });

    this.matWhiteLine = new THREE.MeshBasicMaterial({ color: 0xffffff });
    this.matShoulder = new THREE.MeshStandardMaterial({
      color: 0x524e46,
      roughness: 0.9,
      flatShading: true,
    });

    this.matTrunk = new THREE.MeshStandardMaterial({ color: 0x452b1a, roughness: 0.95, flatShading: true });
    this.matFoliage1 = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.85, flatShading: true });
    this.matFoliage2 = new THREE.MeshStandardMaterial({ color: 0x166534, roughness: 0.85, flatShading: true });
    this.matRock = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.9, flatShading: true });

    // Speed marker poles
    this.matPole = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.4, metalness: 0.6 });
    this.matReflector = new THREE.MeshBasicMaterial({ color: 0xef4444 });

    for (let i = 0; i < NUM_CHUNKS; i++) {
      const chunkZ = (i - 2) * CHUNK_LENGTH;
      const chunkGroup = this._createChunkMesh();
      chunkGroup.position.set(0, 0, chunkZ);
      this._populateScenery(chunkGroup, i);
      this.scene.add(chunkGroup);
      this.chunks.push({ group: chunkGroup, zIndex: i });
    }
  }

  _createChunkMesh() {
    const group = new THREE.Group();

    // 1. Asphalt Road Surface (10m wide, flush at y = 0.005)
    const roadGeo = new THREE.PlaneGeometry(ROAD_WIDTH, CHUNK_LENGTH);
    const roadMesh = new THREE.Mesh(roadGeo, this.matAsphalt);
    roadMesh.rotation.x = -Math.PI / 2;
    roadMesh.position.set(0, 0.005, CHUNK_LENGTH / 2);
    roadMesh.receiveShadow = true;
    group.add(roadMesh);

    // 2. Road Shoulders (0.6m wide along both edges)
    const shoulderGeo = new THREE.PlaneGeometry(0.6, CHUNK_LENGTH);
    [-ROAD_HALF_WIDTH - 0.3, ROAD_HALF_WIDTH + 0.3].forEach(x => {
      const sMesh = new THREE.Mesh(shoulderGeo, this.matShoulder);
      sMesh.rotation.x = -Math.PI / 2;
      sMesh.position.set(x, 0.006, CHUNK_LENGTH / 2);
      group.add(sMesh);
    });

    // 3. Solid White Outer Boundary Lines
    const edgeLineGeo = new THREE.PlaneGeometry(0.18, CHUNK_LENGTH);
    [-ROAD_HALF_WIDTH + 0.25, ROAD_HALF_WIDTH - 0.25].forEach(x => {
      const edgeLine = new THREE.Mesh(edgeLineGeo, this.matWhiteLine);
      edgeLine.rotation.x = -Math.PI / 2;
      edgeLine.position.set(x, 0.008, CHUNK_LENGTH / 2);
      group.add(edgeLine);
    });

    // 4. Dashed Center White Line (4m dash, 4m gap)
    const dashLength = 4.0;
    const dashSpacing = 8.0;
    const numDashes = Math.floor(CHUNK_LENGTH / dashSpacing);
    const dashGeo = new THREE.PlaneGeometry(0.18, dashLength);

    for (let d = 0; d < numDashes; d++) {
      const dashMesh = new THREE.Mesh(dashGeo, this.matWhiteLine);
      dashMesh.rotation.x = -Math.PI / 2;
      dashMesh.position.set(0, 0.008, d * dashSpacing + dashLength / 2 + 2.0);
      group.add(dashMesh);
    }

    return group;
  }

  // -------------------------------------------------------------------------
  // Populate Roadside Scenery (Trees, Rocks, Speed Marker Poles)
  // -------------------------------------------------------------------------
  _populateScenery(chunkGroup, zIndex) {
    const existing = chunkGroup.getObjectByName('scenery');
    if (existing) {
      chunkGroup.remove(existing);
      existing.traverse(obj => {
        if (obj.geometry) obj.geometry.dispose();
      });
    }

    const scenery = new THREE.Group();
    scenery.name = 'scenery';

    // Seeded pseudo-random placement
    const seed = Math.abs(zIndex * 49297 + 104729);
    const pseudoRand = (n) => {
      const x = Math.sin(seed + n * 91.3) * 10000;
      return x - Math.floor(x);
    };

    // 1. Roadside Pine Trees (sit flush at y = 0)
    for (let t = 0; t < 12; t++) {
      const side = pseudoRand(t * 3) > 0.5 ? 1 : -1;
      const x = side * (ROAD_HALF_WIDTH + 3.0 + pseudoRand(t * 3 + 1) * 32.0);
      const z = pseudoRand(t * 3 + 2) * CHUNK_LENGTH;
      const scale = 0.8 + pseudoRand(t * 7) * 0.7;

      const tree = this._createLowPolyPineTree(scale);
      tree.position.set(x, 0, z);
      scenery.add(tree);
    }

    // 2. Roadside Rocks & Small Hills
    for (let r = 0; r < 5; r++) {
      const side = pseudoRand(r * 4 + 50) > 0.5 ? 1 : -1;
      const x = side * (ROAD_HALF_WIDTH + 4.0 + pseudoRand(r * 4 + 51) * 24.0);
      const z = pseudoRand(r * 4 + 52) * CHUNK_LENGTH;
      const rockScale = 0.6 + pseudoRand(r * 4 + 53) * 0.9;

      const rockGeo = new THREE.DodecahedronGeometry(rockScale, 0);
      const rock = new THREE.Mesh(rockGeo, this.matRock);
      rock.position.set(x, rockScale * 0.4, z);
      rock.rotation.set(pseudoRand(r * 2), pseudoRand(r * 3), pseudoRand(r * 4));
      rock.castShadow = true;
      rock.receiveShadow = true;
      scenery.add(rock);
    }

    // 3. Distance Marker Poles Every 50m (Streaks past car giving speed sensation)
    [25.0, 75.0].forEach(zPos => {
      [-ROAD_HALF_WIDTH - 0.8, ROAD_HALF_WIDTH + 0.8].forEach(xPos => {
        const pole = new THREE.Group();
        const pMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.2, 8), this.matPole);
        pMesh.position.set(0, 0.6, 0);
        pMesh.castShadow = true;
        pole.add(pMesh);

        const refMesh = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.16, 0.14), this.matReflector);
        refMesh.position.set(0, 1.0, 0);
        pole.add(refMesh);

        pole.position.set(xPos, 0, zPos);
        scenery.add(pole);
      });
    });

    chunkGroup.add(scenery);
  }

  _createLowPolyPineTree(scale = 1.0) {
    const group = new THREE.Group();

    // Trunk
    const trunkH = 1.8 * scale;
    const trunkR = 0.22 * scale;
    const trunkGeo = new THREE.CylinderGeometry(trunkR * 0.7, trunkR, trunkH, 6);
    const trunk = new THREE.Mesh(trunkGeo, this.matTrunk);
    trunk.position.set(0, trunkH / 2, 0);
    trunk.castShadow = true;
    group.add(trunk);

    // 3-tier foliage cones
    const tiers = [
      { r: 1.8 * scale, h: 2.4 * scale, y: trunkH * 0.65, mat: this.matFoliage1 },
      { r: 1.4 * scale, h: 2.0 * scale, y: trunkH * 0.65 + 1.4 * scale, mat: this.matFoliage2 },
      { r: 0.9 * scale, h: 1.7 * scale, y: trunkH * 0.65 + 2.7 * scale, mat: this.matFoliage1 },
    ];

    tiers.forEach(t => {
      const coneGeo = new THREE.ConeGeometry(t.r, t.h, 6);
      const cone = new THREE.Mesh(coneGeo, t.mat);
      cone.position.set(0, t.y + t.h / 2, 0);
      cone.castShadow = true;
      cone.receiveShadow = true;
      group.add(cone);
    });

    return group;
  }

  // -------------------------------------------------------------------------
  // Update Loop: Smooth Parallax and Infinite Road Recycling
  // -------------------------------------------------------------------------
  update(carZ) {
    // Keep continuous ground centered with car
    this.ground.position.z = carZ;

    // Follow sunlight
    this.sun.position.z = carZ - 40;
    this.sunTarget.position.z = carZ + 30;

    // Distant mountain parallax
    this.mountainGroup.position.z = carZ * 0.35;

    // Seamless chunk recycling ahead of car
    for (const chunk of this.chunks) {
      const chunkZ = chunk.group.position.z;

      if (chunkZ + CHUNK_LENGTH < carZ - 180.0) {
        let maxZ = -Infinity;
        for (const c of this.chunks) {
          if (c.group.position.z > maxZ) {
            maxZ = c.group.position.z;
          }
        }
        const newZ = maxZ + CHUNK_LENGTH;
        chunk.group.position.z = newZ;
        const newIndex = Math.round(newZ / CHUNK_LENGTH);
        chunk.zIndex = newIndex;
        this._populateScenery(chunk.group, newIndex);
      }
    }
  }

  reset() {
    for (let i = 0; i < NUM_CHUNKS; i++) {
      const chunkZ = (i - 2) * CHUNK_LENGTH;
      this.chunks[i].group.position.set(0, 0, chunkZ);
      this.chunks[i].zIndex = i;
      this._populateScenery(this.chunks[i].group, i);
    }
    this.ground.position.set(0, 0, 0);
    this.mountainGroup.position.set(0, 0, 0);
  }
}

export { StraightWorld as TrackEnvironment };
