import * as THREE from 'three';

// ---------------------------------------------------------------------------
// STRAIGHT ROAD CONSTANTS & 4-LANE HIGHWAY GEOMETRY
// ---------------------------------------------------------------------------
export const ROAD_WIDTH = 20.0;
export const ROAD_HALF_WIDTH = ROAD_WIDTH / 2; // 10.0m
export const CHUNK_LENGTH = 100.0;
export const NUM_CHUNKS = 18;
export const FINISH_LINE_Z = 1250.0;
export const LANE_CENTERS = [-4.8, 0.0, 4.8, 9.2];

export class StraightWorld {
  constructor(scene) {
    this.scene = scene;
    this.finishLineZ = FINISH_LINE_Z;

    // 1. Bright Blue Sky & Atmospheric Fog
    this._setupBlueSky();

    // 2. Consistent Sunlight & Ambient Lighting
    this._setupLighting();

    // 3. Continuous Flat Green Terrain
    this._setupGround();

    // 4. Distant Low-Poly Mountains & Hills
    this._setupMountains();

    // 5. Straight Road Chunks & Scenery Pool (Expanded 20m Highway)
    this._setupChunks();

    // 6. Finish Line Arch / Gantry, Checkered Stripe & Grandstands at FINISH_LINE_Z
    this._setupFinishLine();
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
    this.scene.fog = new THREE.Fog(fogColor, 250, 1400);
  }

  // -------------------------------------------------------------------------
  // 2. Consistent Natural Sunlight & Hemisphere Ambient
  // -------------------------------------------------------------------------
  _setupLighting() {
    const hemiLight = new THREE.HemisphereLight(0xe0f2fe, 0x4d7c0f, 0.75);
    this.scene.add(hemiLight);

    // Warm natural sun casting crisp, low-poly shadows over all 4 lanes
    this.sun = new THREE.DirectionalLight(0xfffbeb, 1.35);
    this.sun.position.set(-60, 75, -40);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.width = 2048;
    this.sun.shadow.mapSize.height = 2048;
    this.sun.shadow.camera.near = 10;
    this.sun.shadow.camera.far = 450;
    const shadowSpan = 85;
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
    const groundGeo = new THREE.PlaneGeometry(3200, 3200);
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
      { x: -600, z: 250, r: 170, h: 280 },
      { x: -700, z: 700, r: 210, h: 340 },
      { x: -560, z: 1150, r: 160, h: 260 },
      { x: -660, z: 1550, r: 190, h: 320 },
      { x: 600, z: 350, r: 160, h: 260 },
      { x: 720, z: 800, r: 210, h: 340 },
      { x: 580, z: 1250, r: 170, h: 280 },
      { x: 680, z: 1680, r: 210, h: 340 },
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
  // 5. Straight Road Chunks (20m Road, 4 Lanes, Dashed Dividers)
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

    // 1. Asphalt Road Surface (20m wide highway, flush at y = 0.005)
    const roadGeo = new THREE.PlaneGeometry(ROAD_WIDTH, CHUNK_LENGTH);
    const roadMesh = new THREE.Mesh(roadGeo, this.matAsphalt);
    roadMesh.rotation.x = -Math.PI / 2;
    roadMesh.position.set(0, 0.005, CHUNK_LENGTH / 2);
    roadMesh.receiveShadow = true;
    group.add(roadMesh);

    // 2. Road Shoulders (1.2m wide along both edges outside road boundaries)
    const shoulderWidth = 1.2;
    const shoulderGeo = new THREE.PlaneGeometry(shoulderWidth, CHUNK_LENGTH);
    [-ROAD_HALF_WIDTH - shoulderWidth / 2, ROAD_HALF_WIDTH + shoulderWidth / 2].forEach(x => {
      const sMesh = new THREE.Mesh(shoulderGeo, this.matShoulder);
      sMesh.rotation.x = -Math.PI / 2;
      sMesh.position.set(x, 0.006, CHUNK_LENGTH / 2);
      group.add(sMesh);
    });

    // 3. Solid White Outer Boundary Lines
    const edgeLineGeo = new THREE.PlaneGeometry(0.24, CHUNK_LENGTH);
    [-ROAD_HALF_WIDTH + 0.3, ROAD_HALF_WIDTH - 0.3].forEach(x => {
      const edgeLine = new THREE.Mesh(edgeLineGeo, this.matWhiteLine);
      edgeLine.rotation.x = -Math.PI / 2;
      edgeLine.position.set(x, 0.008, CHUNK_LENGTH / 2);
      group.add(edgeLine);
    });

    // 4. White Dashed Dividers Separating the 4 Lanes
    // Lane centers are [-4.8, 0.0, 4.8, 9.2].
    // Midpoints between adjacent lanes: (-4.8+0)/2 = -2.4, (0+4.8)/2 = 2.4, (4.8+9.2)/2 = 7.0
    const laneDividers = [-2.4, 2.4, 7.0];
    const dashLength = 4.0;
    const dashSpacing = 8.0;
    const numDashes = Math.floor(CHUNK_LENGTH / dashSpacing);
    const dashGeo = new THREE.PlaneGeometry(0.2, dashLength);

    laneDividers.forEach(divX => {
      for (let d = 0; d < numDashes; d++) {
        const dashMesh = new THREE.Mesh(dashGeo, this.matWhiteLine);
        dashMesh.rotation.x = -Math.PI / 2;
        dashMesh.position.set(divX, 0.008, d * dashSpacing + dashLength / 2 + 2.0);
        group.add(dashMesh);
      }
    });

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

    // 1. Roadside Pine Trees (sit flush at y = 0, placed outside road and grandstand area)
    for (let t = 0; t < 12; t++) {
      const side = pseudoRand(t * 3) > 0.5 ? 1 : -1;
      const x = side * (ROAD_HALF_WIDTH + 3.0 + pseudoRand(t * 3 + 1) * 32.0);
      const z = pseudoRand(t * 3 + 2) * CHUNK_LENGTH;
      const scale = 0.8 + pseudoRand(t * 7) * 0.7;

      // Keep area around finish line gantry & grandstands clear
      const absZ = chunkGroup.position.z + z;
      if (Math.abs(absZ - FINISH_LINE_Z) < 32 && Math.abs(x) < 26) continue;

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

      const absZ = chunkGroup.position.z + z;
      if (Math.abs(absZ - FINISH_LINE_Z) < 32 && Math.abs(x) < 26) continue;

      const rockGeo = new THREE.DodecahedronGeometry(rockScale, 0);
      const rock = new THREE.Mesh(rockGeo, this.matRock);
      rock.position.set(x, rockScale * 0.4, z);
      rock.rotation.set(pseudoRand(r * 2), pseudoRand(r * 3), pseudoRand(r * 4));
      rock.castShadow = true;
      rock.receiveShadow = true;
      scenery.add(rock);
    }

    // 3. Distance Marker Poles Every 50m Outside Shoulders
    [25.0, 75.0].forEach(zPos => {
      const absZ = chunkGroup.position.z + zPos;
      if (Math.abs(absZ - FINISH_LINE_Z) < 20) return; // Keep finish line clear

      [-ROAD_HALF_WIDTH - 1.2, ROAD_HALF_WIDTH + 1.2].forEach(xPos => {
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
  // 6. Finish Line Arch / Gantry, Checkered Stripe & Spectator Stands
  // -------------------------------------------------------------------------
  _setupFinishLine() {
    this.gantryGroup = new THREE.Group();
    this.gantryGroup.name = 'finishLineGantry';

    const gantry = new THREE.Group();
    gantry.position.set(0, 0, FINISH_LINE_Z);

    // -----------------------------------------------------------------------
    // A. Checkered Black & White Finish Line Stripe Across Road
    // -----------------------------------------------------------------------
    const checkMatWhite = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const checkMatDark = new THREE.MeshBasicMaterial({ color: 0x111116 });

    const tileCols = 20; // 1m per column across 20m road
    const tileRows = 2;  // 1m per row along z (-1 to +1)
    const tileW = ROAD_WIDTH / tileCols; // 1.0m
    const tileD = 1.0;

    const tileGeo = new THREE.PlaneGeometry(tileW, tileD);

    for (let r = 0; r < tileRows; r++) {
      const zOffset = (r === 0 ? -0.5 : 0.5) * tileD;
      for (let c = 0; c < tileCols; c++) {
        const xOffset = -ROAD_HALF_WIDTH + (c + 0.5) * tileW;
        const isWhite = (r + c) % 2 === 0;
        const tileMesh = new THREE.Mesh(tileGeo, isWhite ? checkMatWhite : checkMatDark);
        tileMesh.rotation.x = -Math.PI / 2;
        tileMesh.position.set(xOffset, 0.012, zOffset);
        gantry.add(tileMesh);
      }
    }

    // -----------------------------------------------------------------------
    // B. Overhead Metal Truss Arch Across Highway
    // -----------------------------------------------------------------------
    const trussMat = new THREE.MeshStandardMaterial({
      color: 0x334155, // slate dark structural steel
      roughness: 0.4,
      metalness: 0.75,
      flatShading: true,
    });
    const baseMat = new THREE.MeshStandardMaterial({
      color: 0x64748b, // concrete foundation
      roughness: 0.9,
      metalness: 0.1,
      flatShading: true,
    });

    const towerX = 11.8; // Outside the 10m road half-width + shoulder
    const archHeight = 8.2;

    // Concrete Footing & Vertical Lattice Towers
    [-towerX, towerX].forEach(x => {
      // Concrete Base
      const baseGeo = new THREE.BoxGeometry(1.6, 0.7, 2.4);
      const baseMesh = new THREE.Mesh(baseGeo, baseMat);
      baseMesh.position.set(x, 0.35, 0);
      baseMesh.castShadow = true;
      baseMesh.receiveShadow = true;
      gantry.add(baseMesh);

      // 4 Upright Steel Posts
      const postOffsets = [
        { dx: -0.45, dz: -0.6 },
        { dx: 0.45, dz: -0.6 },
        { dx: -0.45, dz: 0.6 },
        { dx: 0.45, dz: 0.6 },
      ];
      const postGeo = new THREE.CylinderGeometry(0.1, 0.1, archHeight, 6);
      postOffsets.forEach(po => {
        const post = new THREE.Mesh(postGeo, trussMat);
        post.position.set(x + po.dx, archHeight / 2 + 0.35, po.dz);
        post.castShadow = true;
        gantry.add(post);
      });

      // Horizontal and Diagonal Rungs
      const rungGeo = new THREE.CylinderGeometry(0.05, 0.05, 1.2, 6);
      for (let y = 1.5; y < archHeight; y += 1.3) {
        const rung = new THREE.Mesh(rungGeo, trussMat);
        rung.rotation.x = Math.PI / 2;
        rung.position.set(x, y, 0);
        gantry.add(rung);
      }

      // Top Pulsing Tower Beacon Light
      const beaconGeo = new THREE.SphereGeometry(0.24, 8, 8);
      const beaconMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
      const beacon = new THREE.Mesh(beaconGeo, beaconMat);
      beacon.position.set(x, archHeight + 0.6, 0);
      gantry.add(beacon);
    });

    // Horizontal Overhead Bridge Truss (Spanning across all 4 lanes)
    const bridgeSpan = towerX * 2 + 1.0;
    const beamGeo = new THREE.CylinderGeometry(0.12, 0.12, bridgeSpan, 8);

    // Upper and lower bridge beams
    [archHeight - 0.2, archHeight + 0.8].forEach(y => {
      [-0.6, 0.6].forEach(z => {
        const beam = new THREE.Mesh(beamGeo, trussMat);
        beam.rotation.z = Math.PI / 2;
        beam.position.set(0, y, z);
        beam.castShadow = true;
        gantry.add(beam);
      });
    });

    // Cross-webbing struts on overhead bridge
    const numWebs = 14;
    const webGeo = new THREE.CylinderGeometry(0.05, 0.05, 1.5, 6);
    for (let w = 0; w <= numWebs; w++) {
      const wx = -bridgeSpan / 2 + (w / numWebs) * bridgeSpan;
      const web = new THREE.Mesh(webGeo, trussMat);
      web.rotation.x = Math.PI / 2;
      web.position.set(wx, archHeight + 0.3, 0);
      gantry.add(web);
    }

    // -----------------------------------------------------------------------
    // C. Overhead Sign with Checkered Borders & Glowing Neon "FINISH"
    // -----------------------------------------------------------------------
    const signW = 12.0;
    const signH = 2.4;
    const signD = 0.45;
    const signY = 6.4;

    // Heavy Sign Casing
    const signCaseGeo = new THREE.BoxGeometry(signW, signH, signD);
    const signCaseMat = new THREE.MeshStandardMaterial({
      color: 0x090d16,
      roughness: 0.6,
      metalness: 0.8,
      flatShading: true,
    });
    const signCase = new THREE.Mesh(signCaseGeo, signCaseMat);
    signCase.position.set(0, signY, 0);
    signCase.castShadow = true;
    gantry.add(signCase);

    // Glowing Neon Sign Faces (Front and Back)
    let signTex = null;
    if (typeof document !== 'undefined') {
      const canvas = document.createElement('canvas');
      canvas.width = 1024;
      canvas.height = 256;
      const ctx = canvas.getContext('2d');

      // Background
      ctx.fillStyle = '#090d16';
      ctx.fillRect(0, 0, 1024, 256);

      // Top & Bottom Checkered Stripes
      const checkSq = 32;
      for (let row of [0, 256 - checkSq]) {
        for (let x = 0; x < 1024; x += checkSq) {
          ctx.fillStyle = (Math.floor(x / checkSq) % 2 === 0) ? '#ffffff' : '#111827';
          ctx.fillRect(x, row, checkSq, checkSq);
        }
      }

      // Neon Border
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 6;
      ctx.strokeRect(12, 38, 1000, 180);

      // Glowing Neon "FINISH" Text
      ctx.font = '900 84px "Impact", "Orbitron", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      // Outer glow
      ctx.shadowColor = '#38bdf8';
      ctx.shadowBlur = 24;
      ctx.fillStyle = '#f0f9ff';
      ctx.fillText('🏁  F I N I S H  🏁', 512, 118);

      // Crisp inner text
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#38bdf8';
      ctx.fillText('🏁  F I N I S H  🏁', 512, 118);

      // Subtitle
      ctx.font = '700 22px "Arial", sans-serif';
      ctx.fillStyle = '#fbbf24';
      ctx.fillText('GRAND PRIX SPEEDWAY • FINAL SECTOR', 512, 178);

      signTex = new THREE.CanvasTexture(canvas);
      signTex.colorSpace = THREE.SRGBColorSpace;
    }

    const faceMat = signTex
      ? new THREE.MeshBasicMaterial({ map: signTex })
      : new THREE.MeshStandardMaterial({
          color: 0x0284c7,
          emissive: 0x38bdf8,
          emissiveIntensity: 0.8,
        });

    const faceGeo = new THREE.PlaneGeometry(signW - 0.2, signH - 0.2);

    // Front Face (Facing approaching cars from -Z)
    const frontFace = new THREE.Mesh(faceGeo, faceMat);
    frontFace.position.set(0, signY, -signD / 2 - 0.01);
    frontFace.rotation.y = Math.PI; // Look towards car (-Z)
    gantry.add(frontFace);

    // Back Face (Facing +Z)
    const backFace = new THREE.Mesh(faceGeo, faceMat);
    backFace.position.set(0, signY, signD / 2 + 0.01);
    gantry.add(backFace);

    // Neon Edge Trim Bars
    const neonBarGeo = new THREE.BoxGeometry(signW, 0.12, 0.12);
    const neonMatCyan = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
    const neonMatAmber = new THREE.MeshBasicMaterial({ color: 0xf59e0b });

    [-1, 1].forEach(sideZ => {
      const topBar = new THREE.Mesh(neonBarGeo, neonMatCyan);
      topBar.position.set(0, signY + signH / 2, sideZ * (signD / 2 + 0.04));
      gantry.add(topBar);

      const btmBar = new THREE.Mesh(neonBarGeo, neonMatAmber);
      btmBar.position.set(0, signY - signH / 2, sideZ * (signD / 2 + 0.04));
      gantry.add(btmBar);
    });

    // Overhead Track Spotlights (4 units illuminating the finish line)
    const spotGeo = new THREE.CylinderGeometry(0.2, 0.32, 0.45, 6);
    const spotMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.5, metalness: 0.8 });
    const spotLensMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });

    [-6.0, -2.0, 2.0, 6.0].forEach(sx => {
      const spot = new THREE.Mesh(spotGeo, spotMat);
      spot.rotation.x = Math.PI * 0.75;
      spot.position.set(sx, archHeight + 0.9, -0.7);
      gantry.add(spot);

      const lens = new THREE.Mesh(new THREE.CircleGeometry(0.28, 8), spotLensMat);
      lens.rotation.x = -Math.PI * 0.25;
      lens.position.set(sx, archHeight + 0.75, -0.85);
      gantry.add(lens);
    });

    // -----------------------------------------------------------------------
    // D. Two Low-Poly Spectator Stands on the Sides
    // -----------------------------------------------------------------------
    [-18.0, 18.0].forEach((standX, idx) => {
      const facing = idx === 0 ? 1 : -1; // Face towards road
      const stand = this._createGrandstand(facing);
      stand.position.set(standX, 0, 0);
      gantry.add(stand);
    });

    // -----------------------------------------------------------------------
    // E. Grandstand Flags Fluttering Along Highway Shoulders
    // -----------------------------------------------------------------------
    const flagZPositions = [-14.0, -5.0, 5.0, 14.0];
    const flagColors = [0xffffff, 0xef4444, 0x38bdf8, 0xf59e0b];

    [-13.2, 13.2].forEach((flagX, sideIdx) => {
      flagZPositions.forEach((fz, fIdx) => {
        const flag = this._createGrandstandFlag(flagColors[fIdx % flagColors.length], sideIdx === 0 ? 1 : -1);
        flag.position.set(flagX, 0, fz);
        gantry.add(flag);
      });
    });

    this.gantryGroup.add(gantry);
    this.scene.add(this.gantryGroup);
  }

  _createGrandstand(facing = 1) {
    const stand = new THREE.Group();

    const frameMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.8, flatShading: true });
    const seatBlue = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.6, flatShading: true });
    const seatRed = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.6, flatShading: true });
    const roofMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.5, metalness: 0.3, flatShading: true });

    const standLength = 28.0;
    const tiers = 4;
    const tierDepth = 1.3;
    const tierHeight = 0.8;

    // Stepped Tiers
    for (let t = 0; t < tiers; t++) {
      const currentX = (t - tiers / 2) * tierDepth * facing;
      const currentY = (t + 1) * tierHeight;

      // Platform
      const platGeo = new THREE.BoxGeometry(tierDepth, tierHeight, standLength);
      const platMesh = new THREE.Mesh(platGeo, frameMat);
      platMesh.position.set(currentX, currentY - tierHeight / 2, 0);
      platMesh.castShadow = true;
      platMesh.receiveShadow = true;
      stand.add(platMesh);

      // Seating Benches
      const seatGeo = new THREE.BoxGeometry(tierDepth * 0.7, 0.15, standLength - 0.4);
      const seatMesh = new THREE.Mesh(seatGeo, t % 2 === 0 ? seatBlue : seatRed);
      seatMesh.position.set(currentX, currentY + 0.08, 0);
      stand.add(seatMesh);

      // Low-Poly Cheering Spectators Scattered on Tiers
      const crowdColors = [0xef4444, 0x3b82f6, 0x10b981, 0xf59e0b, 0xffffff, 0x8b5cf6];
      const numPeople = 10;
      for (let p = 0; p < numPeople; p++) {
        const pz = -standLength / 2 + 1.4 + (p / numPeople) * (standLength - 2.8);
        const person = new THREE.Group();

        // Torso
        const torsoMat = new THREE.MeshStandardMaterial({
          color: crowdColors[(t * 7 + p * 3) % crowdColors.length],
          flatShading: true,
        });
        const torso = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.5, 0.35), torsoMat);
        torso.position.set(0, 0.35, 0);
        person.add(torso);

        // Head
        const headMat = new THREE.MeshStandardMaterial({ color: 0xfbcfe8, flatShading: true });
        const head = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.24, 0.24), headMat);
        head.position.set(0, 0.7, 0);
        person.add(head);

        person.position.set(currentX, currentY + 0.15, pz);
        stand.add(person);
      }
    }

    // Grandstand Canopy Roof
    const roofGeo = new THREE.PlaneGeometry(6.5, standLength + 2.0);
    const roof = new THREE.Mesh(roofGeo, roofMat);
    roof.rotation.x = -Math.PI / 2;
    roof.rotation.y = facing * 0.18; // slightly sloped towards track
    roof.position.set(0, tiers * tierHeight + 2.2, 0);
    roof.castShadow = true;
    stand.add(roof);

    // Roof Support Columns
    const colGeo = new THREE.CylinderGeometry(0.1, 0.1, tiers * tierHeight + 2.2, 6);
    [-standLength / 2 + 1.0, standLength / 2 - 1.0].forEach(cz => {
      [-2.0, 2.0].forEach(cx => {
        const col = new THREE.Mesh(colGeo, frameMat);
        col.position.set(cx, (tiers * tierHeight + 2.2) / 2, cz);
        stand.add(col);
      });
    });

    return stand;
  }

  _createGrandstandFlag(color = 0xffffff, facing = 1) {
    const flagGroup = new THREE.Group();

    // Steel Flagpole
    const poleMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.3, metalness: 0.85 });
    const poleGeo = new THREE.CylinderGeometry(0.08, 0.08, 7.0, 8);
    const pole = new THREE.Mesh(poleGeo, poleMat);
    pole.position.set(0, 3.5, 0);
    pole.castShadow = true;
    flagGroup.add(pole);

    // Flagpole Finial Ball
    const ball = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 8), new THREE.MeshBasicMaterial({ color: 0xf59e0b }));
    ball.position.set(0, 7.05, 0);
    flagGroup.add(ball);

    // Waving Low-Poly Flag Banner
    const flagMat = new THREE.MeshStandardMaterial({
      color,
      roughness: 0.7,
      side: THREE.DoubleSide,
      flatShading: true,
    });
    const flagGeo = new THREE.PlaneGeometry(2.2, 1.3, 3, 2);
    // Add subtle low-poly wave to vertices
    const pos = flagGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const u = pos.getX(i);
      pos.setZ(i, Math.sin(u * 2.5) * 0.2);
    }
    flagGeo.computeVertexNormals();

    const banner = new THREE.Mesh(flagGeo, flagMat);
    banner.position.set(facing * 1.1, 6.2, 0);
    banner.castShadow = true;
    flagGroup.add(banner);

    return flagGroup;
  }

  // -------------------------------------------------------------------------
  // Update Loop: Smooth Parallax, Scenery Continuity & Finish Line Presence
  // -------------------------------------------------------------------------
  update(carZ) {
    // Keep continuous ground centered with car
    this.ground.position.z = carZ;

    // Follow sunlight so all 4 lanes and finish line stay vividly illuminated
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
