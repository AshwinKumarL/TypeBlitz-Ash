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

// ---------------------------------------------------------------------------
// 3 PLAYABLE MAP THEMES & PRESETS
// ---------------------------------------------------------------------------
export const MAP_PRESETS = {
  alpine: {
    id: 'alpine',
    name: 'Alpine Valley',
    subtitle: 'Sunny Mountain Pass',
    badge: 'Default',
    icon: '🏔️',
    skyTop: '#1d4ed8',
    skyMid1: '#38bdf8',
    skyMid2: '#93c5fd',
    skyBottom: '#dbeafe',
    fogColor: 0xcbe6fd,
    fogNear: 250,
    fogFar: 1400,
    hemiSky: 0xe0f2fe,
    hemiGround: 0x4d7c0f,
    hemiIntensity: 0.75,
    sunColor: 0xfffbeb,
    sunIntensity: 1.35,
    groundColor: 0x4ade80,
    asphaltColor: 0x1f242c,
    whiteLineColor: 0xffffff,
    shoulderColor: 0x524e46,
    hasGuardrails: false,
    neonGlow: false,
  },
  forest: {
    id: 'forest',
    name: 'Redwood Forest',
    subtitle: 'Misty Ancient Canopy',
    badge: 'Dense Foliage',
    icon: '🌲',
    skyTop: '#06170f',
    skyMid1: '#0e2d1f',
    skyMid2: '#1b4d36',
    skyBottom: '#2d6a4f',
    fogColor: 0x143425,
    fogNear: 70,
    fogFar: 500,
    hemiSky: 0x86efac,
    hemiGround: 0x14532d,
    hemiIntensity: 0.65,
    sunColor: 0xfef08a,
    sunIntensity: 1.15,
    groundColor: 0x143823,
    asphaltColor: 0x18201a,
    whiteLineColor: 0xfef3c7,
    shoulderColor: 0x2e2318,
    hasGuardrails: true,
    guardrailType: 'timber',
    neonGlow: false,
  },
  nightcity: {
    id: 'nightcity',
    name: 'Neon Metropolis',
    subtitle: 'Cyberpunk Night City',
    badge: 'Night City Vibe',
    icon: '🌆',
    skyTop: '#04040c',
    skyMid1: '#130826',
    skyMid2: '#2a0e44',
    skyBottom: '#101c36',
    fogColor: 0x0a081c,
    fogNear: 85,
    fogFar: 700,
    hemiSky: 0xa855f7,
    hemiGround: 0x06b6d4,
    hemiIntensity: 0.60,
    sunColor: 0x38bdf8,
    sunIntensity: 0.95,
    groundColor: 0x080a10,
    asphaltColor: 0x0c0f16,
    whiteLineColor: 0x00f0ff, // glowing neon cyan
    shoulderColor: 0x111622,
    hasGuardrails: true,
    guardrailType: 'neon',
    neonGlow: true,
  },
};

export class StraightWorld {
  constructor(scene, initialMapId = 'alpine') {
    this.scene = scene;
    this.finishLineZ = FINISH_LINE_Z;
    this.currentMapId = MAP_PRESETS[initialMapId] ? initialMapId : 'alpine';

    // Shared Road Materials
    this.matAsphalt = new THREE.MeshStandardMaterial({
      color: 0x1f242c,
      roughness: 0.78,
      metalness: 0.15,
      flatShading: true,
    });

    this.matWhiteLine = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      polygonOffset: true,
      polygonOffsetFactor: -3.0,
      polygonOffsetUnits: -6.0,
    });

    this.matShoulder = new THREE.MeshStandardMaterial({
      color: 0x524e46,
      roughness: 0.9,
      flatShading: true,
      polygonOffset: true,
      polygonOffsetFactor: -1.0,
      polygonOffsetUnits: -2.0,
    });

    // 1. Sky & Atmospheric Fog
    this._setupSky();

    // 2. Sunlight & Ambient Lighting
    this._setupLighting();

    // 3. Continuous Flat Ground Terrain
    this._setupGround();

    // 4. Background (Mountains / Forest Ridges / Cyber Skyline)
    this.backgroundGroup = new THREE.Group();
    this.scene.add(this.backgroundGroup);
    this._buildBackground();

    // 5. Straight Road Chunks & Scenery Pool
    this._setupChunks();

    // 6. Finish Line Arch / Gantry
    this.finishLineGroup = new THREE.Group();
    this.scene.add(this.finishLineGroup);
    this._buildFinishLine();

    // Apply the initial map preset
    this.setMap(this.currentMapId);
  }

  // -------------------------------------------------------------------------
  // 1. Sky & Atmospheric Depth
  // -------------------------------------------------------------------------
  _setupSky() {
    this._applySky();
  }

  _applySky() {
    const preset = MAP_PRESETS[this.currentMapId] || MAP_PRESETS.alpine;

    if (typeof document !== 'undefined') {
      const canvas = document.createElement('canvas');
      canvas.width = 32;
      canvas.height = 512;
      const ctx = canvas.getContext('2d');

      const grad = ctx.createLinearGradient(0, 0, 0, 512);
      grad.addColorStop(0.0, preset.skyTop);
      grad.addColorStop(0.35, preset.skyMid1);
      grad.addColorStop(0.75, preset.skyMid2);
      grad.addColorStop(1.0, preset.skyBottom);

      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 32, 512);

      const bgTexture = new THREE.CanvasTexture(canvas);
      bgTexture.colorSpace = THREE.SRGBColorSpace;
      this.scene.background = bgTexture;
    } else {
      this.scene.background = new THREE.Color(preset.fogColor);
    }

    const fogColor = new THREE.Color(preset.fogColor);
    this.scene.fog = new THREE.Fog(fogColor, preset.fogNear, preset.fogFar);
  }

  // -------------------------------------------------------------------------
  // 2. Sunlight & Ambient Lighting
  // -------------------------------------------------------------------------
  _setupLighting() {
    const preset = MAP_PRESETS[this.currentMapId] || MAP_PRESETS.alpine;

    this.hemiLight = new THREE.HemisphereLight(preset.hemiSky, preset.hemiGround, preset.hemiIntensity);
    this.scene.add(this.hemiLight);

    this.sun = new THREE.DirectionalLight(preset.sunColor, preset.sunIntensity);
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

  _applyLighting() {
    const preset = MAP_PRESETS[this.currentMapId] || MAP_PRESETS.alpine;
    if (this.hemiLight) {
      this.hemiLight.color.setHex(preset.hemiSky);
      this.hemiLight.groundColor.setHex(preset.hemiGround);
      this.hemiLight.intensity = preset.hemiIntensity;
    }
    if (this.sun) {
      this.sun.color.setHex(preset.sunColor);
      this.sun.intensity = preset.sunIntensity;
    }
  }

  // -------------------------------------------------------------------------
  // 3. Continuous Flat Ground Terrain
  // -------------------------------------------------------------------------
  _setupGround() {
    const preset = MAP_PRESETS[this.currentMapId] || MAP_PRESETS.alpine;
    const groundGeo = new THREE.PlaneGeometry(3200, 3200);
    const groundMat = new THREE.MeshStandardMaterial({
      color: preset.groundColor,
      roughness: 0.9,
      metalness: 0.05,
      flatShading: true,
    });
    this.ground = new THREE.Mesh(groundGeo, groundMat);
    this.ground.rotation.x = -Math.PI / 2;
    this.ground.position.set(0, 0, 0);
    this.ground.receiveShadow = true;
    this.scene.add(this.ground);
  }

  // -------------------------------------------------------------------------
  // 4. Background Management (Mountains / Forest Ridges / Cyber Skyline)
  // -------------------------------------------------------------------------
  _buildBackground() {
    // Clear existing background
    while (this.backgroundGroup.children.length > 0) {
      const child = this.backgroundGroup.children[0];
      this.backgroundGroup.remove(child);
      child.traverse(obj => {
        if (obj.geometry) obj.geometry.dispose();
      });
    }

    if (this.currentMapId === 'forest') {
      this._buildForestRidges();
    } else if (this.currentMapId === 'nightcity') {
      this._buildCyberSkyline();
    } else {
      this._buildAlpineMountains();
    }
  }

  // A. Alpine Low-Poly Mountains
  _buildAlpineMountains() {
    const createLowPolyMountain = (radius, height, segments = 8) => {
      const geo = new THREE.ConeGeometry(radius, height, segments, 5, false);
      geo.translate(0, height / 2, 0);

      const pos = geo.attributes.position;
      const count = pos.count;
      const colors = new Float32Array(count * 3);

      const cValley = new THREE.Color(0x335c2b);
      const cRock = new THREE.Color(0x475569);
      const cSnow = new THREE.Color(0xffffff);

      for (let i = 0; i < count; i++) {
        const py = pos.getY(i);
        const hRatio = Math.max(0, Math.min(1, py / height));
        const color = new THREE.Color();

        if (hRatio < 0.22) {
          color.lerpColors(cValley, cRock, hRatio / 0.22);
        } else if (hRatio < 0.62) {
          color.copy(cRock);
        } else {
          const snowFactor = Math.min(1.0, (hRatio - 0.62) / 0.38);
          color.lerpColors(cRock, cSnow, snowFactor);
        }

        colors[i * 3]     = color.r;
        colors[i * 3 + 1] = color.g;
        colors[i * 3 + 2] = color.b;
      }

      geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
      geo.computeVertexNormals();

      const mat = new THREE.MeshStandardMaterial({
        vertexColors: true,
        flatShading: true,
        roughness: 0.88,
        metalness: 0.08,
      });

      const mesh = new THREE.Mesh(geo, mat);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      return mesh;
    };

    const mountainConfigs = [
      { x: -580, z: 200,  r: 160, h: 260, segs: 9 },
      { x: -720, z: 550,  r: 220, h: 340, segs: 8 },
      { x: -540, z: 900,  r: 150, h: 240, segs: 7 },
      { x: -680, z: 1250, r: 210, h: 330, segs: 9 },
      { x: -600, z: 1650, r: 180, h: 290, segs: 8 },
      { x: -750, z: 2050, r: 230, h: 350, segs: 9 },

      { x:  580, z: 300,  r: 160, h: 250, segs: 8 },
      { x:  720, z: 650,  r: 220, h: 340, segs: 9 },
      { x:  550, z: 1050, r: 150, h: 230, segs: 7 },
      { x:  700, z: 1450, r: 210, h: 330, segs: 8 },
      { x:  620, z: 1850, r: 190, h: 300, segs: 9 },
      { x:  740, z: 2250, r: 240, h: 360, segs: 8 },
    ];

    mountainConfigs.forEach(m => {
      const mesh = createLowPolyMountain(m.r, m.h, m.segs);
      mesh.position.set(m.x, 0, m.z);
      this.backgroundGroup.add(mesh);
    });
  }

  // B. Redwood Forest Mountain Ridges
  _buildForestRidges() {
    const matRidgeDark = new THREE.MeshStandardMaterial({
      color: 0x0f2b1d,
      roughness: 0.95,
      flatShading: true,
    });
    const matRidgeMid = new THREE.MeshStandardMaterial({
      color: 0x16422e,
      roughness: 0.9,
      flatShading: true,
    });

    const createRidgeCone = (r, h, mat) => {
      const geo = new THREE.ConeGeometry(r, h, 7, 3);
      geo.translate(0, h / 2, 0);
      const mesh = new THREE.Mesh(geo, mat);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      return mesh;
    };

    const ridgeConfigs = [
      { x: -480, z: 180, r: 140, h: 210, mat: matRidgeMid },
      { x: -620, z: 450, r: 190, h: 280, mat: matRidgeDark },
      { x: -440, z: 750, r: 130, h: 190, mat: matRidgeMid },
      { x: -580, z: 1100, r: 180, h: 270, mat: matRidgeDark },
      { x: -520, z: 1500, r: 160, h: 240, mat: matRidgeMid },
      { x: -650, z: 1900, r: 200, h: 300, mat: matRidgeDark },

      { x:  480, z: 250, r: 140, h: 210, mat: matRidgeMid },
      { x:  620, z: 550, r: 190, h: 270, mat: matRidgeDark },
      { x:  460, z: 900, r: 130, h: 185, mat: matRidgeMid },
      { x:  600, z: 1250, r: 180, h: 260, mat: matRidgeDark },
      { x:  540, z: 1650, r: 160, h: 230, mat: matRidgeMid },
      { x:  680, z: 2050, r: 210, h: 310, mat: matRidgeDark },
    ];

    ridgeConfigs.forEach(rc => {
      const ridge = createRidgeCone(rc.r, rc.h, rc.mat);
      ridge.position.set(rc.x, 0, rc.z);
      this.backgroundGroup.add(ridge);
    });
  }

  // C. Cyberpunk Night City Skyline (Low-Poly Skyscrapers with Glowing Window Grids)
  _buildCyberSkyline() {
    const matBuildingDark = new THREE.MeshStandardMaterial({
      color: 0x0a0d16,
      roughness: 0.6,
      metalness: 0.5,
      flatShading: true,
    });
    const matBuildingSlate = new THREE.MeshStandardMaterial({
      color: 0x111827,
      roughness: 0.5,
      metalness: 0.6,
      flatShading: true,
    });

    const windowColors = [0x00f0ff, 0xff007f, 0xfacc15, 0x38bdf8, 0xa855f7];

    const createSkyscraper = (w, d, h, hasSpire = false) => {
      const tower = new THREE.Group();

      // Main tower body
      const bodyGeo = new THREE.BoxGeometry(w, h, d);
      const bodyMat = Math.random() > 0.5 ? matBuildingDark : matBuildingSlate;
      const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
      bodyMesh.position.set(0, h / 2, 0);
      bodyMesh.castShadow = true;
      bodyMesh.receiveShadow = true;
      tower.add(bodyMesh);

      // Glowing horizontal/vertical window accent strips
      const numBands = Math.floor(h / 24);
      for (let b = 1; b <= numBands; b++) {
        if (Math.random() < 0.7) {
          const bandColor = windowColors[Math.floor(Math.random() * windowColors.length)];
          const bandMat = new THREE.MeshBasicMaterial({ color: bandColor });
          const bandH = 1.2 + Math.random() * 2.0;
          const bandGeo = new THREE.BoxGeometry(w * 1.01, bandH, d * 1.01);
          const bandMesh = new THREE.Mesh(bandGeo, bandMat);
          bandMesh.position.set(0, b * 22, 0);
          tower.add(bandMesh);
        }
      }

      // Roof Spire with glowing red warning beacon
      if (hasSpire) {
        const spireH = 30 + Math.random() * 35;
        const spireGeo = new THREE.CylinderGeometry(0.5, 1.8, spireH, 6);
        const spireMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.8 });
        const spire = new THREE.Mesh(spireGeo, spireMat);
        spire.position.set(0, h + spireH / 2, 0);
        tower.add(spire);

        const beacon = new THREE.Mesh(
          new THREE.SphereGeometry(1.8, 6, 6),
          new THREE.MeshBasicMaterial({ color: 0xef4444 })
        );
        beacon.position.set(0, h + spireH, 0);
        tower.add(beacon);
      }

      return tower;
    };

    // Flanking clusters of skyscrapers along left and right horizons
    const towerConfigs = [
      // Left side skyline
      { x: -380, z: 150,  w: 65, d: 70, h: 220, spire: true },
      { x: -480, z: 350,  w: 80, d: 90, h: 320, spire: false },
      { x: -340, z: 600,  w: 55, d: 60, h: 180, spire: true },
      { x: -440, z: 850,  w: 75, d: 80, h: 280, spire: true },
      { x: -360, z: 1150, w: 60, d: 65, h: 210, spire: false },
      { x: -490, z: 1450, w: 85, d: 95, h: 340, spire: true },
      { x: -370, z: 1750, w: 70, d: 75, h: 240, spire: false },
      { x: -460, z: 2050, w: 80, d: 85, h: 310, spire: true },

      // Right side skyline
      { x:  380, z: 220,  w: 70, d: 75, h: 230, spire: true },
      { x:  490, z: 450,  w: 85, d: 90, h: 330, spire: false },
      { x:  350, z: 720,  w: 60, d: 65, h: 190, spire: true },
      { x:  460, z: 980,  w: 75, d: 85, h: 290, spire: true },
      { x:  370, z: 1280, w: 65, d: 70, h: 220, spire: false },
      { x:  480, z: 1580, w: 90, d: 95, h: 350, spire: true },
      { x:  360, z: 1880, w: 65, d: 70, h: 230, spire: false },
      { x:  470, z: 2180, w: 80, d: 85, h: 300, spire: true },
    ];

    towerConfigs.forEach(tc => {
      const bldg = createSkyscraper(tc.w, tc.d, tc.h, tc.spire);
      bldg.position.set(tc.x, 0, tc.z);
      this.backgroundGroup.add(bldg);
    });
  }

  // -------------------------------------------------------------------------
  // 5. Straight Road Chunks Setup
  // -------------------------------------------------------------------------
  _setupChunks() {
    this.chunks = [];

    // Shared Forest & Alpine Scenery Materials
    this.matTrunk = new THREE.MeshStandardMaterial({ color: 0x452b1a, roughness: 0.95, flatShading: true });
    this.matFoliage1 = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.85, flatShading: true });
    this.matFoliage2 = new THREE.MeshStandardMaterial({ color: 0x166534, roughness: 0.85, flatShading: true });
    this.matFoliageForest1 = new THREE.MeshStandardMaterial({ color: 0x0f3923, roughness: 0.90, flatShading: true });
    this.matFoliageForest2 = new THREE.MeshStandardMaterial({ color: 0x14532d, roughness: 0.88, flatShading: true });
    this.matFern = new THREE.MeshStandardMaterial({ color: 0x22c55e, roughness: 0.8, flatShading: true });
    this.matLog = new THREE.MeshStandardMaterial({ color: 0x3f2817, roughness: 0.92, flatShading: true });
    this.matRock = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.9, flatShading: true });
    this.matMossRock = new THREE.MeshStandardMaterial({ color: 0x334a36, roughness: 0.9, flatShading: true });
    this.matPole = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.4, metalness: 0.6 });
    this.matReflector = new THREE.MeshBasicMaterial({ color: 0xef4444 });

    // Cyber Scenery Materials
    this.matNeonCyan = new THREE.MeshBasicMaterial({ color: 0x00f0ff });
    this.matNeonMagenta = new THREE.MeshBasicMaterial({ color: 0xff007f });
    this.matCyberBarrier = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.6, metalness: 0.5 });
    this.matCyberPole = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.3, metalness: 0.8 });

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

    // 1. Asphalt Road Surface (20m wide highway, flush at y = 0.02)
    const roadGeo = new THREE.PlaneGeometry(ROAD_WIDTH, CHUNK_LENGTH);
    const roadMesh = new THREE.Mesh(roadGeo, this.matAsphalt);
    roadMesh.rotation.x = -Math.PI / 2;
    roadMesh.position.set(0, 0.02, CHUNK_LENGTH / 2);
    roadMesh.receiveShadow = true;
    group.add(roadMesh);

    // 2. Road Shoulders (1.2m wide along both edges outside road boundaries)
    const shoulderWidth = 1.2;
    const shoulderGeo = new THREE.PlaneGeometry(shoulderWidth, CHUNK_LENGTH);
    [-ROAD_HALF_WIDTH - shoulderWidth / 2, ROAD_HALF_WIDTH + shoulderWidth / 2].forEach(x => {
      const sMesh = new THREE.Mesh(shoulderGeo, this.matShoulder);
      sMesh.rotation.x = -Math.PI / 2;
      sMesh.position.set(x, 0.024, CHUNK_LENGTH / 2);
      group.add(sMesh);
    });

    // 3. Solid Outer Boundary Lines
    const edgeLineGeo = new THREE.PlaneGeometry(0.24, CHUNK_LENGTH);
    [-ROAD_HALF_WIDTH + 0.3, ROAD_HALF_WIDTH - 0.3].forEach(x => {
      const edgeLine = new THREE.Mesh(edgeLineGeo, this.matWhiteLine);
      edgeLine.rotation.x = -Math.PI / 2;
      edgeLine.position.set(x, 0.032, CHUNK_LENGTH / 2);
      group.add(edgeLine);
    });

    // 4. Dashed Dividers Separating the 4 Lanes
    const laneDividers = [-2.4, 2.4, 7.0];
    const dashLength = 4.0;
    const dashSpacing = 8.0;
    const numDashes = Math.floor(CHUNK_LENGTH / dashSpacing);
    const dashGeo = new THREE.PlaneGeometry(0.2, dashLength);

    laneDividers.forEach(divX => {
      for (let d = 0; d < numDashes; d++) {
        const dashMesh = new THREE.Mesh(dashGeo, this.matWhiteLine);
        dashMesh.rotation.x = -Math.PI / 2;
        dashMesh.position.set(divX, 0.032, d * dashSpacing + dashLength / 2 + 2.0);
        group.add(dashMesh);
      }
    });

    return group;
  }

  // -------------------------------------------------------------------------
  // Scenery Population Dispatcher
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

    if (this.currentMapId === 'forest') {
      this._populateSceneryForest(scenery, chunkGroup, zIndex);
    } else if (this.currentMapId === 'nightcity') {
      this._populateSceneryCity(scenery, chunkGroup, zIndex);
    } else {
      this._populateSceneryAlpine(scenery, chunkGroup, zIndex);
    }

    chunkGroup.add(scenery);
  }

  // -------------------------------------------------------------------------
  // Map 1 Scenery: Alpine Valley (Default)
  // -------------------------------------------------------------------------
  _populateSceneryAlpine(scenery, chunkGroup, zIndex) {
    const seed = Math.abs(zIndex * 49297 + 104729);
    const pseudoRand = (n) => {
      const x = Math.sin(seed + n * 91.3) * 10000;
      return x - Math.floor(x);
    };

    // 12 Pine Trees
    for (let t = 0; t < 12; t++) {
      const side = pseudoRand(t * 3) > 0.5 ? 1 : -1;
      const x = side * (ROAD_HALF_WIDTH + 3.0 + pseudoRand(t * 3 + 1) * 32.0);
      const z = pseudoRand(t * 3 + 2) * CHUNK_LENGTH;
      const scale = 0.8 + pseudoRand(t * 7) * 0.7;

      const absZ = chunkGroup.position.z + z;
      if (Math.abs(absZ - FINISH_LINE_Z) < 32 && Math.abs(x) < 26) continue;

      const tree = this._createLowPolyPineTree(scale);
      tree.position.set(x, 0, z);
      scenery.add(tree);
    }

    // 5 Granite Rocks
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

    // Distance Marker Poles Every 50m
    [25.0, 75.0].forEach(zPos => {
      const absZ = chunkGroup.position.z + zPos;
      if (Math.abs(absZ - FINISH_LINE_Z) < 20) return;

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
  }

  // -------------------------------------------------------------------------
  // Map 2 Scenery: Redwood Forest (Dense Foliage)
  // -------------------------------------------------------------------------
  _populateSceneryForest(scenery, chunkGroup, zIndex) {
    const seed = Math.abs(zIndex * 54321 + 98765);
    const pseudoRand = (n) => {
      const x = Math.sin(seed + n * 83.7) * 10000;
      return x - Math.floor(x);
    };

    // A. Rustic Timber Guardrails Along Both Highway Shoulders
    const railX = ROAD_HALF_WIDTH + 0.55;
    [-railX, railX].forEach(sideX => {
      const beamGeo = new THREE.BoxGeometry(0.22, 0.28, CHUNK_LENGTH);
      const beam = new THREE.Mesh(beamGeo, this.matTrunk);
      beam.position.set(sideX, 0.65, CHUNK_LENGTH / 2);
      beam.castShadow = true;
      scenery.add(beam);

      // Wooden Posts Every 10m
      for (let pz = 5; pz < CHUNK_LENGTH; pz += 10) {
        const postGeo = new THREE.CylinderGeometry(0.12, 0.14, 0.85, 6);
        const post = new THREE.Mesh(postGeo, this.matTrunk);
        post.position.set(sideX, 0.425, pz);
        post.castShadow = true;
        scenery.add(post);
      }
    });

    // B. Dense Towering Redwood & Pine Trees (28 Trees Per Chunk!)
    for (let t = 0; t < 28; t++) {
      const side = pseudoRand(t * 5) > 0.5 ? 1 : -1;
      const x = side * (ROAD_HALF_WIDTH + 1.8 + pseudoRand(t * 5 + 1) * 38.0);
      const z = pseudoRand(t * 5 + 2) * CHUNK_LENGTH;
      const isGiantRedwood = pseudoRand(t * 5 + 3) > 0.65;
      const scale = isGiantRedwood ? 1.6 + pseudoRand(t * 7) * 1.1 : 0.85 + pseudoRand(t * 7) * 0.6;

      const absZ = chunkGroup.position.z + z;
      if (Math.abs(absZ - FINISH_LINE_Z) < 32 && Math.abs(x) < 26) continue;

      const tree = isGiantRedwood ? this._createGiantRedwood(scale) : this._createForestPineTree(scale);
      tree.position.set(x, 0, z);
      scenery.add(tree);
    }

    // C. Dense Undergrowth: 16 Fern Bushes
    for (let f = 0; f < 16; f++) {
      const side = pseudoRand(f * 3 + 100) > 0.5 ? 1 : -1;
      const x = side * (ROAD_HALF_WIDTH + 1.2 + pseudoRand(f * 3 + 101) * 26.0);
      const z = pseudoRand(f * 3 + 102) * CHUNK_LENGTH;
      const fern = this._createLowPolyFern(0.6 + pseudoRand(f * 3 + 103) * 0.7);
      fern.position.set(x, 0, z);
      scenery.add(fern);
    }

    // D. Fallen Mossy Logs (4 Logs Per Chunk)
    for (let l = 0; l < 4; l++) {
      const side = pseudoRand(l * 4 + 200) > 0.5 ? 1 : -1;
      const x = side * (ROAD_HALF_WIDTH + 3.0 + pseudoRand(l * 4 + 201) * 22.0);
      const z = pseudoRand(l * 4 + 202) * CHUNK_LENGTH;
      const logH = 3.5 + pseudoRand(l * 4 + 203) * 4.0;
      const logR = 0.35 + pseudoRand(l * 4 + 204) * 0.25;

      const logGeo = new THREE.CylinderGeometry(logR * 0.85, logR, logH, 6);
      const logMesh = new THREE.Mesh(logGeo, this.matLog);
      logMesh.rotation.z = Math.PI / 2;
      logMesh.rotation.y = pseudoRand(l * 4 + 205) * Math.PI;
      logMesh.position.set(x, logR * 0.8, z);
      logMesh.castShadow = true;
      logMesh.receiveShadow = true;
      scenery.add(logMesh);
    }

    // E. 8 Moss-Covered River Boulders
    for (let r = 0; r < 8; r++) {
      const side = pseudoRand(r * 4 + 300) > 0.5 ? 1 : -1;
      const x = side * (ROAD_HALF_WIDTH + 2.0 + pseudoRand(r * 4 + 301) * 24.0);
      const z = pseudoRand(r * 4 + 302) * CHUNK_LENGTH;
      const rockScale = 0.7 + pseudoRand(r * 4 + 303) * 0.9;

      const rockGeo = new THREE.DodecahedronGeometry(rockScale, 0);
      const rock = new THREE.Mesh(rockGeo, this.matMossRock);
      rock.position.set(x, rockScale * 0.4, z);
      rock.rotation.set(pseudoRand(r * 2), pseudoRand(r * 3), pseudoRand(r * 4));
      rock.castShadow = true;
      rock.receiveShadow = true;
      scenery.add(rock);
    }
  }

  // -------------------------------------------------------------------------
  // Map 3 Scenery: Neon Metropolis (Night City Vibe)
  // -------------------------------------------------------------------------
  _populateSceneryCity(scenery, chunkGroup, zIndex) {
    const seed = Math.abs(zIndex * 67891 + 43210);
    const pseudoRand = (n) => {
      const x = Math.sin(seed + n * 71.9) * 10000;
      return x - Math.floor(x);
    };

    // A. Glowing Roadside Cyber Guardrails / Edge Barriers
    const barrierX = ROAD_HALF_WIDTH + 0.55;
    [-barrierX, barrierX].forEach((sideX, sIdx) => {
      // Dark Base Barrier
      const bBaseGeo = new THREE.BoxGeometry(0.28, 0.75, CHUNK_LENGTH);
      const bBase = new THREE.Mesh(bBaseGeo, this.matCyberBarrier);
      bBase.position.set(sideX, 0.375, CHUNK_LENGTH / 2);
      bBase.receiveShadow = true;
      scenery.add(bBase);

      // Continuous Glowing Neon Edge Strip (Cyan on Left, Magenta on Right)
      const stripMat = sIdx === 0 ? this.matNeonCyan : this.matNeonMagenta;
      const stripGeo = new THREE.BoxGeometry(0.12, 0.16, CHUNK_LENGTH);
      const stripMesh = new THREE.Mesh(stripGeo, stripMat);
      stripMesh.position.set(sideX, 0.80, CHUNK_LENGTH / 2);
      scenery.add(stripMesh);
    });

    // B. Highway Cantilever Streetlamps Every 33m
    [15.0, 50.0, 85.0].forEach((zPos, lampIdx) => {
      const absZ = chunkGroup.position.z + zPos;
      if (Math.abs(absZ - FINISH_LINE_Z) < 22) return;

      [-ROAD_HALF_WIDTH - 1.4, ROAD_HALF_WIDTH + 1.4].forEach((lampX, lIdx) => {
        const lamp = new THREE.Group();

        // Upright Steel Mast (height 7.2m)
        const mastGeo = new THREE.CylinderGeometry(0.1, 0.14, 7.2, 6);
        const mast = new THREE.Mesh(mastGeo, this.matCyberPole);
        mast.position.set(0, 3.6, 0);
        mast.castShadow = true;
        lamp.add(mast);

        // Horizontal Cantilever Arm Overhanging Road
        const armDir = lampX > 0 ? -1 : 1;
        const armGeo = new THREE.BoxGeometry(3.6, 0.12, 0.12);
        const arm = new THREE.Mesh(armGeo, this.matCyberPole);
        arm.position.set(armDir * 1.8, 7.2, 0);
        lamp.add(arm);

        // Glowing Neon Luminaire Bar on Arm Tip
        const lumMat = (lampIdx + lIdx) % 2 === 0 ? this.matNeonCyan : this.matNeonMagenta;
        const lumGeo = new THREE.BoxGeometry(1.6, 0.14, 0.35);
        const lumMesh = new THREE.Mesh(lumGeo, lumMat);
        lumMesh.position.set(armDir * 3.2, 7.15, 0);
        lamp.add(lumMesh);

        lamp.position.set(lampX, 0, zPos);
        scenery.add(lamp);
      });
    });

    // C. Midground Cyber Architecture & Tech Monoliths (4 Per Chunk)
    for (let m = 0; m < 4; m++) {
      const side = pseudoRand(m * 4) > 0.5 ? 1 : -1;
      const x = side * (ROAD_HALF_WIDTH + 14.0 + pseudoRand(m * 4 + 1) * 26.0);
      const z = pseudoRand(m * 4 + 2) * CHUNK_LENGTH;
      const bH = 22 + pseudoRand(m * 4 + 3) * 35;
      const bW = 14 + pseudoRand(m * 4 + 4) * 12;
      const bD = 12 + pseudoRand(m * 4 + 5) * 10;

      const mono = new THREE.Group();
      const monoGeo = new THREE.BoxGeometry(bW, bH, bD);
      const monoMesh = new THREE.Mesh(monoGeo, this.matCyberBarrier);
      monoMesh.position.set(0, bH / 2, 0);
      monoMesh.castShadow = true;
      monoMesh.receiveShadow = true;
      mono.add(monoMesh);

      // Neon Window Bands
      const bandMat = pseudoRand(m * 6) > 0.5 ? this.matNeonCyan : this.matNeonMagenta;
      const bandGeo = new THREE.BoxGeometry(bW * 1.02, 1.2, bD * 1.02);
      const band = new THREE.Mesh(bandGeo, bandMat);
      band.position.set(0, bH * 0.7, 0);
      mono.add(band);

      mono.position.set(x, 0, z);
      scenery.add(mono);
    }

    // D. Overhead Cyber Expressway Gantry Every 4th Chunk
    if (zIndex % 4 === 0) {
      const gantryZ = 50.0;
      const absZ = chunkGroup.position.z + gantryZ;
      if (Math.abs(absZ - FINISH_LINE_Z) > 35) {
        const overheadGantry = this._createCyberGantry();
        overheadGantry.position.set(0, 0, gantryZ);
        scenery.add(overheadGantry);
      }
    }
  }

  // -------------------------------------------------------------------------
  // Scenery Asset Creators
  // -------------------------------------------------------------------------
  _createLowPolyPineTree(scale = 1.0) {
    const group = new THREE.Group();

    const trunkH = 1.8 * scale;
    const trunkR = 0.22 * scale;
    const trunkGeo = new THREE.CylinderGeometry(trunkR * 0.7, trunkR, trunkH, 6);
    const trunk = new THREE.Mesh(trunkGeo, this.matTrunk);
    trunk.position.set(0, trunkH / 2, 0);
    trunk.castShadow = true;
    group.add(trunk);

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

  _createForestPineTree(scale = 1.0) {
    const group = new THREE.Group();

    const trunkH = 2.4 * scale;
    const trunkR = 0.28 * scale;
    const trunkGeo = new THREE.CylinderGeometry(trunkR * 0.75, trunkR, trunkH, 6);
    const trunk = new THREE.Mesh(trunkGeo, this.matTrunk);
    trunk.position.set(0, trunkH / 2, 0);
    trunk.castShadow = true;
    group.add(trunk);

    const tiers = [
      { r: 2.2 * scale, h: 3.0 * scale, y: trunkH * 0.6, mat: this.matFoliageForest1 },
      { r: 1.7 * scale, h: 2.5 * scale, y: trunkH * 0.6 + 1.8 * scale, mat: this.matFoliageForest2 },
      { r: 1.2 * scale, h: 2.1 * scale, y: trunkH * 0.6 + 3.4 * scale, mat: this.matFoliageForest1 },
      { r: 0.7 * scale, h: 1.8 * scale, y: trunkH * 0.6 + 4.8 * scale, mat: this.matFoliageForest2 },
    ];

    tiers.forEach(t => {
      const coneGeo = new THREE.ConeGeometry(t.r, t.h, 7);
      const cone = new THREE.Mesh(coneGeo, t.mat);
      cone.position.set(0, t.y + t.h / 2, 0);
      cone.castShadow = true;
      cone.receiveShadow = true;
      group.add(cone);
    });

    return group;
  }

  _createGiantRedwood(scale = 2.0) {
    const group = new THREE.Group();

    // Massive Redwood Buttress Trunk
    const trunkH = 14.0 * scale;
    const trunkR = 0.95 * scale;
    const trunkGeo = new THREE.CylinderGeometry(trunkR * 0.6, trunkR * 1.35, trunkH, 8);
    const trunk = new THREE.Mesh(trunkGeo, this.matTrunk);
    trunk.position.set(0, trunkH / 2, 0);
    trunk.castShadow = true;
    group.add(trunk);

    // 4 Vast Canopy Cones
    const tiers = [
      { r: 4.8 * scale, h: 5.5 * scale, y: trunkH * 0.65, mat: this.matFoliageForest1 },
      { r: 3.9 * scale, h: 4.8 * scale, y: trunkH * 0.65 + 3.2 * scale, mat: this.matFoliageForest2 },
      { r: 2.8 * scale, h: 4.2 * scale, y: trunkH * 0.65 + 6.0 * scale, mat: this.matFoliageForest1 },
      { r: 1.6 * scale, h: 3.5 * scale, y: trunkH * 0.65 + 8.5 * scale, mat: this.matFoliageForest2 },
    ];

    tiers.forEach(t => {
      const coneGeo = new THREE.ConeGeometry(t.r, t.h, 8);
      const cone = new THREE.Mesh(coneGeo, t.mat);
      cone.position.set(0, t.y + t.h / 2, 0);
      cone.castShadow = true;
      cone.receiveShadow = true;
      group.add(cone);
    });

    return group;
  }

  _createLowPolyFern(scale = 1.0) {
    const group = new THREE.Group();
    const numLeaves = 6;
    const leafGeo = new THREE.ConeGeometry(0.35 * scale, 1.4 * scale, 4);

    for (let i = 0; i < numLeaves; i++) {
      const leaf = new THREE.Mesh(leafGeo, this.matFern);
      const angle = (i / numLeaves) * Math.PI * 2;
      leaf.rotation.z = 0.65;
      leaf.rotation.y = angle;
      leaf.position.set(Math.cos(angle) * 0.25 * scale, 0.3 * scale, Math.sin(angle) * 0.25 * scale);
      leaf.castShadow = true;
      group.add(leaf);
    }
    return group;
  }

  _createCyberGantry() {
    const group = new THREE.Group();
    const span = ROAD_WIDTH + 4.0;
    const gantryH = 7.5;

    // Support Pillars
    [-span / 2, span / 2].forEach(px => {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.5, gantryH, 0.5), this.matCyberPole);
      post.position.set(px, gantryH / 2, 0);
      post.castShadow = true;
      group.add(post);
    });

    // Cross Truss
    const truss = new THREE.Mesh(new THREE.BoxGeometry(span, 0.6, 0.6), this.matCyberPole);
    truss.position.set(0, gantryH, 0);
    group.add(truss);

    // Illuminated Neon Signboard ("EXPRESSWAY • SPEED ZONE")
    const sign = new THREE.Mesh(new THREE.BoxGeometry(span * 0.7, 1.4, 0.2), this.matCyberBarrier);
    sign.position.set(0, gantryH - 0.5, 0);
    group.add(sign);

    const signStripe = new THREE.Mesh(new THREE.BoxGeometry(span * 0.68, 0.2, 0.25), this.matNeonCyan);
    signStripe.position.set(0, gantryH - 0.1, 0);
    group.add(signStripe);

    return group;
  }

  // -------------------------------------------------------------------------
  // 6. Finish Line Arch / Gantry Management
  // -------------------------------------------------------------------------
  _buildFinishLine() {
    while (this.finishLineGroup.children.length > 0) {
      const child = this.finishLineGroup.children[0];
      this.finishLineGroup.remove(child);
      child.traverse(obj => {
        if (obj.geometry) obj.geometry.dispose();
      });
    }

    if (this.currentMapId === 'forest') {
      this._buildForestFinishLine();
    } else if (this.currentMapId === 'nightcity') {
      this._buildCityFinishLine();
    } else {
      this._buildAlpineFinishLine();
    }
  }

  // A. Alpine Finish Line
  _buildAlpineFinishLine() {
    const gantry = new THREE.Group();
    gantry.position.set(0, 0, FINISH_LINE_Z);

    // Checkered Stripe
    const checkMatWhite = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const checkMatDark = new THREE.MeshBasicMaterial({ color: 0x111116 });
    const tileCols = 20;
    const tileW = ROAD_WIDTH / tileCols;
    const tileGeo = new THREE.PlaneGeometry(tileW, 1.0);

    for (let r = 0; r < 2; r++) {
      const zOffset = (r === 0 ? -0.5 : 0.5);
      for (let c = 0; c < tileCols; c++) {
        const xOffset = -ROAD_HALF_WIDTH + (c + 0.5) * tileW;
        const isWhite = (r + c) % 2 === 0;
        const tile = new THREE.Mesh(tileGeo, isWhite ? checkMatWhite : checkMatDark);
        tile.rotation.x = -Math.PI / 2;
        tile.position.set(xOffset, 0.012, zOffset);
        gantry.add(tile);
      }
    }

    // Steel Lattice Truss Arch
    const trussMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.75, roughness: 0.4 });
    const towerX = 11.8;
    const archH = 8.2;

    [-towerX, towerX].forEach(x => {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, archH, 6), trussMat);
      post.position.set(x, archH / 2, 0);
      post.castShadow = true;
      gantry.add(post);

      const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.24, 8, 8), new THREE.MeshBasicMaterial({ color: 0xef4444 }));
      beacon.position.set(x, archH + 0.3, 0);
      gantry.add(beacon);
    });

    const bridge = new THREE.Mesh(new THREE.BoxGeometry(towerX * 2 + 1.0, 0.5, 0.8), trussMat);
    bridge.position.set(0, archH, 0);
    gantry.add(bridge);

    // Neon "FINISH" Signboard
    const signBox = new THREE.Mesh(new THREE.BoxGeometry(11.0, 2.2, 0.4), new THREE.MeshStandardMaterial({ color: 0x090d16 }));
    signBox.position.set(0, 6.4, 0);
    gantry.add(signBox);

    const signTextMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
    const signBorder = new THREE.Mesh(new THREE.BoxGeometry(10.6, 0.18, 0.45), signTextMat);
    signBorder.position.set(0, 7.3, 0);
    gantry.add(signBorder);

    this.finishLineGroup.add(gantry);
  }

  // B. Forest Timber Finish Lodge Arch
  _buildForestFinishLine() {
    const gantry = new THREE.Group();
    gantry.position.set(0, 0, FINISH_LINE_Z);

    // Natural Soil Checkered Finish Stripe
    const checkMatWood = new THREE.MeshBasicMaterial({ color: 0xfef08a });
    const checkMatDark = new THREE.MeshBasicMaterial({ color: 0x1f1610 });
    const tileCols = 20;
    const tileW = ROAD_WIDTH / tileCols;
    const tileGeo = new THREE.PlaneGeometry(tileW, 1.0);

    for (let r = 0; r < 2; r++) {
      const zOffset = (r === 0 ? -0.5 : 0.5);
      for (let c = 0; c < tileCols; c++) {
        const xOffset = -ROAD_HALF_WIDTH + (c + 0.5) * tileW;
        const isLight = (r + c) % 2 === 0;
        const tile = new THREE.Mesh(tileGeo, isLight ? checkMatWood : checkMatDark);
        tile.rotation.x = -Math.PI / 2;
        tile.position.set(xOffset, 0.012, zOffset);
        gantry.add(tile);
      }
    }

    // Heavy Timber Log Arch (massive 1.0m diameter carved log pillars)
    const logMat = this.matTrunk;
    const towerX = 11.5;
    const archH = 9.0;

    [-towerX, towerX].forEach(x => {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.75, archH, 8), logMat);
      post.position.set(x, archH / 2, 0);
      post.castShadow = true;
      gantry.add(post);
    });

    const crossBeam = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, towerX * 2 + 2.0, 8), logMat);
    crossBeam.rotation.z = Math.PI / 2;
    crossBeam.position.set(0, archH, 0);
    crossBeam.castShadow = true;
    gantry.add(crossBeam);

    // Carved Timber Finish Sign
    const signBoard = new THREE.Mesh(new THREE.BoxGeometry(12.0, 2.4, 0.35), this.matLog);
    signBoard.position.set(0, 6.8, 0);
    gantry.add(signBoard);

    const signBanner = new THREE.Mesh(new THREE.BoxGeometry(11.2, 0.25, 0.4), new THREE.MeshBasicMaterial({ color: 0xfef08a }));
    signBanner.position.set(0, 7.8, 0);
    gantry.add(signBanner);

    this.finishLineGroup.add(gantry);
  }

  // C. Cyberpunk Neon Finish Gantry
  _buildCityFinishLine() {
    const gantry = new THREE.Group();
    gantry.position.set(0, 0, FINISH_LINE_Z);

    // Glowing Neon Checkered Finish Stripe
    const checkMatCyan = this.matNeonCyan;
    const checkMatDark = new THREE.MeshBasicMaterial({ color: 0x05070c });
    const tileCols = 20;
    const tileW = ROAD_WIDTH / tileCols;
    const tileGeo = new THREE.PlaneGeometry(tileW, 1.2);

    for (let r = 0; r < 2; r++) {
      const zOffset = (r === 0 ? -0.6 : 0.6);
      for (let c = 0; c < tileCols; c++) {
        const xOffset = -ROAD_HALF_WIDTH + (c + 0.5) * tileW;
        const isCyan = (r + c) % 2 === 0;
        const tile = new THREE.Mesh(tileGeo, isCyan ? checkMatCyan : checkMatDark);
        tile.rotation.x = -Math.PI / 2;
        tile.position.set(xOffset, 0.015, zOffset);
        gantry.add(tile);
      }
    }

    // High-Tech Cyber Pillars & Beams
    const towerX = 12.0;
    const archH = 9.2;

    [-towerX, towerX].forEach((x, idx) => {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.8, archH, 0.8), this.matCyberBarrier);
      post.position.set(x, archH / 2, 0);
      post.castShadow = true;
      gantry.add(post);

      // Glowing Neon Accent Strips along Posts
      const postNeon = new THREE.Mesh(new THREE.BoxGeometry(0.15, archH, 0.85), idx === 0 ? this.matNeonCyan : this.matNeonMagenta);
      postNeon.position.set(x, archH / 2, 0);
      gantry.add(postNeon);

      // Top Pulsing Strobe Beacon
      const strobe = new THREE.Mesh(new THREE.SphereGeometry(0.4, 8, 8), idx === 0 ? this.matNeonCyan : this.matNeonMagenta);
      strobe.position.set(x, archH + 0.5, 0);
      gantry.add(strobe);
    });

    // Massive Overhead LED Marquee Arch
    const marquee = new THREE.Mesh(new THREE.BoxGeometry(towerX * 2, 2.6, 0.6), this.matCyberBarrier);
    marquee.position.set(0, 7.2, 0);
    gantry.add(marquee);

    // Glowing Neon Cyan & Magenta Border Lines
    const topStrip = new THREE.Mesh(new THREE.BoxGeometry(towerX * 1.95, 0.22, 0.68), this.matNeonCyan);
    topStrip.position.set(0, 8.35, 0);
    gantry.add(topStrip);

    const bottomStrip = new THREE.Mesh(new THREE.BoxGeometry(towerX * 1.95, 0.22, 0.68), this.matNeonMagenta);
    bottomStrip.position.set(0, 6.05, 0);
    gantry.add(bottomStrip);

    this.finishLineGroup.add(gantry);
  }

  // -------------------------------------------------------------------------
  // Dynamic Map Switching API
  // -------------------------------------------------------------------------
  setMap(mapId = 'alpine') {
    if (!MAP_PRESETS[mapId]) mapId = 'alpine';
    this.currentMapId = mapId;
    const preset = MAP_PRESETS[mapId];

    // 1. Sky & Fog
    this._applySky();

    // 2. Lighting
    this._applyLighting();

    // 3. Ground Terrain Color
    if (this.ground && this.ground.material) {
      this.ground.material.color.setHex(preset.groundColor);
    }

    // 4. Road Shared Materials
    if (this.matAsphalt) this.matAsphalt.color.setHex(preset.asphaltColor);
    if (this.matWhiteLine) this.matWhiteLine.color.setHex(preset.whiteLineColor);
    if (this.matShoulder) this.matShoulder.color.setHex(preset.shoulderColor);

    // 5. Background (Alpine Mountains vs Forest Ridges vs Cyber Skyline)
    this._buildBackground();

    // 6. Finish Line Arch
    this._buildFinishLine();

    // 7. Re-populate all Road Chunks with the Active Map's Scenery
    if (this.chunks) {
      this.chunks.forEach(chunk => {
        this._populateScenery(chunk.group, chunk.zIndex);
      });
    }
  }

  getMapId() {
    return this.currentMapId;
  }

  // -------------------------------------------------------------------------
  // Update Loop: Parallax, Lighting Follow & Chunk Recycling
  // -------------------------------------------------------------------------
  update(carZ) {
    this.ground.position.z = carZ;

    this.sun.position.z = carZ - 40;
    this.sunTarget.position.z = carZ + 30;

    this.backgroundGroup.position.z = carZ * 0.35;

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
    this.backgroundGroup.position.set(0, 0, 0);
  }
}

export { StraightWorld as TrackEnvironment };
