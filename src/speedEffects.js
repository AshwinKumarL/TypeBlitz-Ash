/**
 * speedEffects.js
 * High-performance visual arcade effects:
 * 1. Dynamic wind streaks / speed lines
 * 2. Visible tire burnout smoke & exhaust haze
 * 3. Nitro Boost dual exhaust flames (blue core + fiery orange cones)
 * 4. High-velocity shower of glowing spark particles
 * 5. Dynamic road surface nitro flash lighting
 */
import * as THREE from 'three';

export class SpeedEffects {
  constructor(scene) {
    this.scene = scene;

    // 1. Wind Streaks
    this.streakCount = 180;
    this.lineGeometry = null;
    this.lineMaterial = null;
    this.lines = null;
    this.bounds = {
      minX: -14, maxX: 14,
      minY: 0.6, maxY: 6.5,
      minZ: -20, maxZ: 70
    };
    this._initLines();

    // 2. Visible Smoke Particles (Tire smoke + Exhaust smoke)
    this.smokePool = [];
    this.maxSmoke = 60;
    this.smokeTimer = 0;
    this._initSmoke();

    // 3. Nitro Boost Dual Flames & Glow
    this.isBoostActive = false;
    this.boostLevel = 1;
    this.boostTimeRemaining = 0;
    this.tailpipeOffsets = [
      { x: -0.36, y: 0.28, z: -2.25 },
      { x: 0.36, y: 0.28, z: -2.25 },
    ];
    this.flameGroup = new THREE.Group();
    this._initNitroFlames();

    // 4. Nitro Sparks Particles
    this.sparksPool = [];
    this.maxSparks = 80;
    this.sparkTimer = 0;
    this._initNitroSparks();
  }

  // -------------------------------------------------------------------------
  // 1. Speed Lines / Wind Streaks
  // -------------------------------------------------------------------------
  _initLines() {
    const positions = new Float32Array(this.streakCount * 2 * 3);
    this.lineLengths = new Float32Array(this.streakCount);

    for (let i = 0; i < this.streakCount; i++) {
      const x = THREE.MathUtils.randFloat(this.bounds.minX, this.bounds.maxX);
      const y = THREE.MathUtils.randFloat(this.bounds.minY, this.bounds.maxY);
      const z = THREE.MathUtils.randFloat(this.bounds.minZ, this.bounds.maxZ);
      const len = THREE.MathUtils.randFloat(2.5, 6.0);

      this.lineLengths[i] = len;

      const idx = i * 6;
      positions[idx] = x;
      positions[idx + 1] = y;
      positions[idx + 2] = z;

      positions[idx + 3] = x;
      positions[idx + 4] = y;
      positions[idx + 5] = z + len;
    }

    this.lineGeometry = new THREE.BufferGeometry();
    this.lineGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    this.lineMaterial = new THREE.LineBasicMaterial({
      color: 0x93c5fd,
      transparent: true,
      opacity: 0.0,
      blending: THREE.AdditiveBlending,
    });

    this.lines = new THREE.LineSegments(this.lineGeometry, this.lineMaterial);
    this.scene.add(this.lines);
  }

  // -------------------------------------------------------------------------
  // 2. Visible Tire Smoke & Exhaust Particles
  // -------------------------------------------------------------------------
  _initSmoke() {
    this.smokeContainer = new THREE.Group();
    this.scene.add(this.smokeContainer);

    const smokeGeo = new THREE.DodecahedronGeometry(0.24, 0);
    const smokeMat = new THREE.MeshStandardMaterial({
      color: 0xcccccc,
      roughness: 0.9,
      metalness: 0.0,
      transparent: true,
      opacity: 0.45,
      flatShading: true,
      depthWrite: false,
    });

    for (let i = 0; i < this.maxSmoke; i++) {
      const mesh = new THREE.Mesh(smokeGeo, smokeMat.clone());
      mesh.visible = false;
      this.smokeContainer.add(mesh);

      this.smokePool.push({
        mesh,
        alive: false,
        life: 0,
        maxLife: 0.75,
        scale: 0.3,
        vx: 0,
        vy: 0.4,
        vz: -2.0,
      });
    }
  }

  _spawnSmokePuff(x, y, z, vx = 0, vy = 0.5, vz = -3.0, maxLife = 0.7) {
    const p = this.smokePool.find(item => !item.alive);
    if (!p) return;

    p.alive = true;
    p.life = 0;
    p.maxLife = maxLife;
    p.scale = THREE.MathUtils.randFloat(0.25, 0.4);
    p.vx = vx + THREE.MathUtils.randFloat(-0.2, 0.2);
    p.vy = vy + THREE.MathUtils.randFloat(0.2, 0.6);
    p.vz = vz + THREE.MathUtils.randFloat(-1.0, 1.0);

    p.mesh.position.set(x, y, z);
    p.mesh.scale.setScalar(p.scale);
    p.mesh.material.opacity = 0.55;
    p.mesh.visible = true;
  }

  // -------------------------------------------------------------------------
  // 3. Nitro Boost Dual Exhaust Flames
  // -------------------------------------------------------------------------
  _initNitroFlames() {
    this.flamePipes = [];

    // Dual tailpipe offsets (Left & Right)
    const pipeOffsets = [-0.35, 0.35];

    pipeOffsets.forEach(xOffset => {
      const pipeGroup = new THREE.Group();
      pipeGroup.position.set(xOffset, 0.32, -1.95);

      // Inner Core Flame (intense cyan/blue jet)
      const coreGeo = new THREE.ConeGeometry(0.12, 1.1, 7);
      coreGeo.rotateX(-Math.PI / 2); // point backwards (-Z)
      coreGeo.translate(0, 0, -0.55);
      const coreMat = new THREE.MeshBasicMaterial({
        color: 0x38bdf8,
        transparent: true,
        opacity: 0.95,
      });
      const coreMesh = new THREE.Mesh(coreGeo, coreMat);
      pipeGroup.add(coreMesh);

      // Outer Fiery Cone (roaring bright orange/red flame)
      const outerGeo = new THREE.ConeGeometry(0.26, 1.8, 7);
      outerGeo.rotateX(-Math.PI / 2);
      outerGeo.translate(0, 0, -0.9);
      const outerMat = new THREE.MeshStandardMaterial({
        color: 0xff3b00,
        emissive: 0xff4500,
        emissiveIntensity: 4.5,
        roughness: 0.2,
        transparent: true,
        opacity: 0.88,
        flatShading: true,
      });
      const outerMesh = new THREE.Mesh(outerGeo, outerMat);
      pipeGroup.add(outerMesh);

      this.flameGroup.add(pipeGroup);
      this.flamePipes.push({ group: pipeGroup, core: coreMesh, outer: outerMesh });
    });

    // Dynamic Nitro Flash Road Light
    this.nitroLight = new THREE.PointLight(0xff4500, 0, 18);
    this.nitroLight.position.set(0, 0.6, -2.5);
    this.flameGroup.add(this.nitroLight);

    this.flameGroup.visible = false;
    this.scene.add(this.flameGroup);
  }

  // -------------------------------------------------------------------------
  // 4. Nitro Sparks Particles
  // -------------------------------------------------------------------------
  _initNitroSparks() {
    this.sparksContainer = new THREE.Group();
    this.scene.add(this.sparksContainer);

    const sparkGeo = new THREE.DodecahedronGeometry(0.045, 0);
    const sparkMat = new THREE.MeshBasicMaterial({
      color: 0xfff000,
      transparent: true,
      opacity: 0.95,
    });

    for (let i = 0; i < this.maxSparks; i++) {
      const mesh = new THREE.Mesh(sparkGeo, sparkMat.clone());
      mesh.visible = false;
      this.sparksContainer.add(mesh);

      this.sparksPool.push({
        mesh,
        alive: false,
        life: 0,
        maxLife: 0.35,
        vx: 0,
        vy: 0,
        vz: 0,
      });
    }
  }

  _spawnSpark(x, y, z, level = 1) {
    const s = this.sparksPool.find(item => !item.alive);
    if (!s) return;

    s.alive = true;
    s.life = 0;
    s.maxLife = THREE.MathUtils.randFloat(0.2, 0.42);
    s.vx = THREE.MathUtils.randFloat(-2.2, 2.2);
    s.vy = THREE.MathUtils.randFloat(-0.4, 2.2);
    s.vz = THREE.MathUtils.randFloat(-34.0, -58.0); // violently shooting backward

    s.mesh.position.set(x, y, z);
    s.mesh.scale.setScalar(THREE.MathUtils.randFloat(0.8, level === 3 ? 2.2 : 1.6));
    
    // Spark tint based on Boost Level
    if (level === 1) {
      s.mesh.material.color.setHex(Math.random() < 0.5 ? 0x38bdf8 : 0xbae6fd);
    } else if (level === 2) {
      s.mesh.material.color.setHex(Math.random() < 0.5 ? 0xff4500 : 0xffea00);
    } else {
      s.mesh.material.color.setHex(Math.random() < 0.5 ? 0xe879f9 : 0xf43f5e);
    }

    s.mesh.material.opacity = 1.0;
    s.mesh.visible = true;
  }

  // Public method to spawn sparks for player or competitor bots
  spawnSpark(x, y, z, level = 1) {
    this._spawnSpark(x, y, z, level);
  }

  // -------------------------------------------------------------------------
  // Trigger Multi-Tier Nitro Boost (Levels 1, 2, 3)
  // -------------------------------------------------------------------------
  triggerBoost(level = 1, durationSec = 3.2) {
    this.isBoostActive = true;
    this.boostLevel = level;
    this.boostTimeRemaining = Math.max(this.boostTimeRemaining, durationSec);
    this.flameGroup.visible = true;

    // Apply color theme dynamically to exhaust flames
    this.flamePipes.forEach(pipe => {
      if (level === 1) {
        // Level 1: Turbo Charge (Electric Cyan Jet)
        pipe.core.material.color.setHex(0xe0f2fe);
        pipe.outer.material.color.setHex(0x0284c7);
        pipe.outer.material.emissive.setHex(0x38bdf8);
        pipe.outer.material.emissiveIntensity = 4.0;
      } else if (level === 2) {
        // Level 2: Twin Nitro Surge (Roaring Orange/Red Fire)
        pipe.core.material.color.setHex(0xffea00);
        pipe.outer.material.color.setHex(0xff3b00);
        pipe.outer.material.emissive.setHex(0xff4500);
        pipe.outer.material.emissiveIntensity = 5.5;
      } else {
        // Level 3: Hyper Overdrive (Violet Plasma / Neon Magenta Flame)
        pipe.core.material.color.setHex(0xfdf4ff);
        pipe.outer.material.color.setHex(0x9333ea);
        pipe.outer.material.emissive.setHex(0xd946ef);
        pipe.outer.material.emissiveIntensity = 7.5;
      }
    });

    if (level === 1) {
      this.nitroLight.color.setHex(0x38bdf8);
      this.nitroLight.intensity = 4.5;
    } else if (level === 2) {
      this.nitroLight.color.setHex(0xff4500);
      this.nitroLight.intensity = 6.5;
    } else {
      this.nitroLight.color.setHex(0xd946ef);
      this.nitroLight.intensity = 9.0;
    }
  }

  setTailpipeOffsets(offsets) {
    if (!Array.isArray(offsets) || offsets.length === 0) return;
    this.tailpipeOffsets = offsets;

    if (this.flamePipes && this.flamePipes.length > 0) {
      offsets.forEach((off, idx) => {
        if (this.flamePipes[idx]) {
          this.flamePipes[idx].group.position.set(off.x, off.y, off.z);
        }
      });
    }

    if (this.nitroLight) {
      const zMin = Math.min(...offsets.map(o => o.z));
      this.nitroLight.position.set(0, 0.6, zMin - 0.5);
    }
  }

  // -------------------------------------------------------------------------
  // Main Per-Frame Update
  // -------------------------------------------------------------------------
  update(dt, carPositionZ, speedKmh, carPositionX = 0) {
    // 1. Update Wind Lines
    this._updateLines(dt, carPositionZ, speedKmh);

    // 2. Update Tire Smoke & Exhaust Smoke
    this._updateSmoke(dt, carPositionZ, speedKmh, carPositionX);

    // 3. Update Nitro Boost Flames & Sparks
    this._updateNitro(dt, carPositionZ, carPositionX);
  }

  _updateLines(dt, carPositionZ, speedKmh) {
    if (!this.lines) return;

    const speedRatio = THREE.MathUtils.clamp((speedKmh - 30) / 100, 0, 1);
    const boostBonus = this.isBoostActive ? 0.35 : 0.0;
    this.lineMaterial.opacity = Math.min(0.9, speedRatio * 0.65 + boostBonus);

    if (this.lineMaterial.opacity <= 0.01) {
      this.lines.visible = false;
      return;
    }
    this.lines.visible = true;

    const positions = this.lineGeometry.attributes.position.array;
    const speedMultiplier = (speedKmh / 3.6) * (this.isBoostActive ? 2.0 : 1.35);

    for (let i = 0; i < this.streakCount; i++) {
      const idx = i * 6;
      const len = this.lineLengths[i] * (1.0 + (speedRatio + boostBonus) * 1.6);

      positions[idx + 2] -= speedMultiplier * dt;
      positions[idx + 5] = positions[idx + 2] + len;

      if (positions[idx + 2] < carPositionZ + this.bounds.minZ) {
        positions[idx + 2] = carPositionZ + this.bounds.maxZ;
        positions[idx + 5] = positions[idx + 2] + len;
        positions[idx] = THREE.MathUtils.randFloat(this.bounds.minX, this.bounds.maxX);
        positions[idx + 3] = positions[idx];
        positions[idx + 1] = THREE.MathUtils.randFloat(this.bounds.minY, this.bounds.maxY);
        positions[idx + 4] = positions[idx + 1];
      }
    }

    this.lineGeometry.attributes.position.needsUpdate = true;
  }

  _updateSmoke(dt, carPositionZ, speedKmh, carPositionX) {
    // Spawn new smoke puffs when vehicle is moving
    if (speedKmh > 12) {
      this.smokeTimer += dt;
      const spawnInterval = THREE.MathUtils.clamp(0.12 - (speedKmh / 160) * 0.08, 0.03, 0.12);

      if (this.smokeTimer >= spawnInterval) {
        this.smokeTimer = 0;
        // Left & Right tire contact positions
        [-0.72, 0.72].forEach(xOffset => {
          this._spawnSmokePuff(
            carPositionX + xOffset,
            0.15,
            carPositionZ - 1.25,
            THREE.MathUtils.randFloat(-0.2, 0.2),
            THREE.MathUtils.randFloat(0.3, 0.7),
            -(speedKmh / 3.6) * 0.6
          );
        });

        // Exhaust smoke haze dynamically emitted from car tailpipes
        this.tailpipeOffsets.forEach(off => {
          this._spawnSmokePuff(
            carPositionX + off.x,
            off.y,
            carPositionZ + off.z,
            0,
            0.4,
            -(speedKmh / 3.6) * 0.45,
            0.5
          );
        });
      }
    }

    // Step existing smoke particles
    for (const p of this.smokePool) {
      if (!p.alive) continue;

      p.life += dt;
      if (p.life >= p.maxLife) {
        p.alive = false;
        p.mesh.visible = false;
        continue;
      }

      const progress = p.life / p.maxLife;
      p.mesh.position.x += p.vx * dt;
      p.mesh.position.y += p.vy * dt;
      p.mesh.position.z += p.vz * dt;

      // Expand puff
      const currentScale = p.scale * (1.0 + progress * 2.8);
      p.mesh.scale.setScalar(currentScale);

      // Fade out opacity smoothly
      p.mesh.material.opacity = 0.5 * (1.0 - progress);
    }
  }

  _updateNitro(dt, carPositionZ, carPositionX) {
    if (this.boostTimeRemaining > 0) {
      this.boostTimeRemaining -= dt;
      this.isBoostActive = true;
      this.flameGroup.visible = true;

      // Follow car position exactly
      this.flameGroup.position.set(carPositionX, 0, carPositionZ);

      // Flame flicker animation & level-scaled length
      const levelScaleZ = this.boostLevel === 3 ? 1.75 : (this.boostLevel === 2 ? 1.35 : 1.0);
      const levelScaleXY = this.boostLevel === 3 ? 1.3 : (this.boostLevel === 2 ? 1.15 : 1.0);

      this.flamePipes.forEach((pipe, i) => {
        const flickerZ = (1.0 + Math.random() * 0.65) * levelScaleZ;
        const flickerXY = (0.85 + Math.random() * 0.35) * levelScaleXY;
        pipe.outer.scale.set(flickerXY, flickerXY, flickerZ);
        pipe.core.scale.set(flickerXY * 0.9, flickerXY * 0.9, flickerZ * 1.1);

        // Spawn shower of sparks from each exhaust tip
        const sparkRate = this.boostLevel === 3 ? 1.0 : (this.boostLevel === 2 ? 0.9 : 0.7);
        if (Math.random() < sparkRate) {
          const sparkCount = this.boostLevel === 3 ? 2 : 1;
          const off = this.tailpipeOffsets[i % this.tailpipeOffsets.length] || { x: (i === 0 ? -0.36 : 0.36), y: 0.28, z: -2.25 };
          for (let s = 0; s < sparkCount; s++) {
            this._spawnSpark(
              carPositionX + off.x,
              off.y + (Math.random() - 0.5) * 0.12,
              carPositionZ + off.z,
              this.boostLevel
            );
          }
        }
      });

      const baseIntensity = this.boostLevel === 3 ? 8.5 : (this.boostLevel === 2 ? 5.5 : 3.5);
      this.nitroLight.intensity = baseIntensity + Math.random() * 3.0;
    } else {
      this.isBoostActive = false;
      this.flameGroup.visible = false;
      this.nitroLight.intensity = 0;
    }

    // Step existing spark particles
    for (const s of this.sparksPool) {
      if (!s.alive) continue;

      s.life += dt;
      if (s.life >= s.maxLife) {
        s.alive = false;
        s.mesh.visible = false;
        continue;
      }

      s.mesh.position.x += s.vx * dt;
      s.mesh.position.y += s.vy * dt;
      s.mesh.position.z += s.vz * dt;

      const progress = s.life / s.maxLife;
      s.mesh.material.opacity = 1.0 - progress;
    }
  }

  reset() {
    if (this.lineMaterial) this.lineMaterial.opacity = 0;
    this.isBoostActive = false;
    this.boostTimeRemaining = 0;
    if (this.flameGroup) this.flameGroup.visible = false;

    this.smokePool.forEach(p => {
      p.alive = false;
      p.mesh.visible = false;
    });

    this.sparksPool.forEach(s => {
      s.alive = false;
      s.mesh.visible = false;
    });
  }

  destroy() {
    if (this.lines) {
      this.scene.remove(this.lines);
      this.lineGeometry.dispose();
      this.lineMaterial.dispose();
    }
    if (this.smokeContainer) {
      this.scene.remove(this.smokeContainer);
    }
    if (this.flameGroup) {
      this.scene.remove(this.flameGroup);
    }
    if (this.sparksContainer) {
      this.scene.remove(this.sparksContainer);
    }
  }
}
