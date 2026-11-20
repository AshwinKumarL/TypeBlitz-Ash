/**
 * speedEffects.js
 * Visual arcade speed effects: dynamic wind streaks / speed lines
 * that stream past the vehicle as typing speed increases.
 */
import * as THREE from 'three';

export class SpeedEffects {
  constructor(scene) {
    this.scene = scene;
    this.streakCount = 180;
    this.lineGeometry = null;
    this.lineMaterial = null;
    this.lines = null;

    this.velocities = [];
    this.bounds = {
      minX: -14, maxX: 14,
      minY: 0.6, maxY: 6.5,
      minZ: -20, maxZ: 70
    };

    this._initLines();
  }

  _initLines() {
    const positions = new Float32Array(this.streakCount * 2 * 3); // 2 vertices per line (start & end)
    this.lineLengths = new Float32Array(this.streakCount);

    for (let i = 0; i < this.streakCount; i++) {
      const x = THREE.MathUtils.randFloat(this.bounds.minX, this.bounds.maxX);
      // Keep clear of direct car center line at bottom
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

  update(dt, carPositionZ, speedKmh) {
    if (!this.lines) return;

    // Opacity scales with speed: 0 below 35 km/h, up to 0.65 at 140+ km/h
    const speedRatio = THREE.MathUtils.clamp((speedKmh - 35) / 100, 0, 1);
    this.lineMaterial.opacity = speedRatio * 0.65;

    if (this.lineMaterial.opacity <= 0.01) {
      this.lines.visible = false;
      return;
    }
    this.lines.visible = true;

    const positions = this.lineGeometry.attributes.position.array;
    const speedMultiplier = (speedKmh / 3.6) * 1.35;

    for (let i = 0; i < this.streakCount; i++) {
      const idx = i * 6;
      const len = this.lineLengths[i] * (1.0 + speedRatio * 1.5);

      // Move streak backwards relative to car
      positions[idx + 2] -= speedMultiplier * dt;
      positions[idx + 5] = positions[idx + 2] + len;

      // Wrap around car position in Z
      if (positions[idx + 2] < carPositionZ + this.bounds.minZ) {
        positions[idx + 2] = carPositionZ + this.bounds.maxZ;
        positions[idx + 5] = positions[idx + 2] + len;
        // Re-randomize X and Y slightly
        positions[idx] = THREE.MathUtils.randFloat(this.bounds.minX, this.bounds.maxX);
        positions[idx + 3] = positions[idx];
        positions[idx + 1] = THREE.MathUtils.randFloat(this.bounds.minY, this.bounds.maxY);
        positions[idx + 4] = positions[idx + 1];
      }
    }

    this.lineGeometry.attributes.position.needsUpdate = true;
  }

  reset() {
    if (this.lineMaterial) {
      this.lineMaterial.opacity = 0;
    }
  }

  destroy() {
    if (this.lines) {
      this.scene.remove(this.lines);
      this.lineGeometry.dispose();
      this.lineMaterial.dispose();
    }
  }
}
