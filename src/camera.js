import * as THREE from 'three';
import { PLAYER_LANE_X } from './car.js';

export class StraightChaseCamera {
  constructor(camera, carController) {
    this.camera = camera;
    this.car = carController;

    // Camera parameters
    this.baseDistance = 6.8;
    this.height = 2.4;
    this.lookAhead = 36.0; // looks down the straight road

    this.baseFov = 58;
    this.maxFov = 74;

    this.snap();
  }

  snap() {
    if (!this.car) return;
    const carZ = this.car.position.z;

    this.camera.position.set(PLAYER_LANE_X, this.height, carZ - this.baseDistance);
    this.camera.lookAt(PLAYER_LANE_X, 1.1, carZ + this.lookAhead);
    this.camera.fov = this.baseFov;
    this.camera.updateProjectionMatrix();
  }

  update(dt, speedKmh = 0) {
    if (!this.car) return;

    const carZ = this.car.position.z;
    const speedRatio = THREE.MathUtils.clamp(speedKmh / 150.0, 0, 1);

    const dynDistance = this.baseDistance + speedRatio * 1.6;
    const dynHeight = this.height + speedRatio * 0.3;

    // Follow smoothly along Z, locked in center lane horizontally
    const targetZ = carZ - dynDistance;
    const lerpFactor = 1.0 - Math.exp(-15.0 * dt);

    // Subtle high-speed rumble effect at > 110 km/h
    let shakeY = 0;
    if (speedKmh > 110) {
      const shakeAmt = ((speedKmh - 110) / 50) * 0.035;
      shakeY = (Math.random() - 0.5) * shakeAmt;
    }

    this.camera.position.x = PLAYER_LANE_X;
    this.camera.position.y = dynHeight + shakeY;
    this.camera.position.z = THREE.MathUtils.lerp(this.camera.position.z, targetZ, lerpFactor);

    // Look ahead down the straight highway toward the horizon
    this.camera.lookAt(PLAYER_LANE_X, 1.1, carZ + this.lookAhead);

    // Dynamic FOV for speed sensation
    const targetFov = this.baseFov + speedRatio * (this.maxFov - this.baseFov);
    this.camera.fov = THREE.MathUtils.lerp(this.camera.fov, targetFov, 6.0 * dt);
    this.camera.updateProjectionMatrix();
  }
}

export { StraightChaseCamera as CameraController };
