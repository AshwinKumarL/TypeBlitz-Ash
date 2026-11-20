import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { FORD_ANGLIA_GLB_BASE64 } from './fordAngliaModelData.js';
import { wpmToTargetKmh } from './wpmCalculator.js';

// ---------------------------------------------------------------------------
// PROCEDURAL FALLBACK CAR BUILDER
// ---------------------------------------------------------------------------
export function createProceduralCarMesh() {
  const car = new THREE.Group();

  const matBody = new THREE.MeshStandardMaterial({ color: 0x0077ee, roughness: 0.3, metalness: 0.4, flatShading: true });
  const matCabin = new THREE.MeshStandardMaterial({ color: 0x0055aa, roughness: 0.3, metalness: 0.3, flatShading: true });
  const matGlass = new THREE.MeshStandardMaterial({ color: 0x88ccff, roughness: 0.1, metalness: 0.2, transparent: true, opacity: 0.75 });
  const matTyre = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.85, metalness: 0.1, flatShading: true });
  const matRim = new THREE.MeshStandardMaterial({ color: 0xcccccc, roughness: 0.2, metalness: 0.9, flatShading: true });
  const matHeadlight = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 3.0 });
  const matTaillight = new THREE.MeshStandardMaterial({ color: 0xff1100, emissive: 0xff1100, emissiveIntensity: 2.5 });

  // Main Body
  const bodyGeo = new THREE.BoxGeometry(1.48, 0.44, 3.8);
  const body = new THREE.Mesh(bodyGeo, matBody);
  body.position.set(0, 0.45, 0);
  body.castShadow = true;
  car.add(body);

  // Cabin
  const cabinGeo = new THREE.BoxGeometry(1.24, 0.48, 1.9);
  const cabin = new THREE.Mesh(cabinGeo, matCabin);
  cabin.position.set(0, 0.85, -0.15);
  cabin.castShadow = true;
  car.add(cabin);

  // Windshield
  const windGeo = new THREE.BoxGeometry(1.18, 0.42, 0.08);
  const wind = new THREE.Mesh(windGeo, matGlass);
  wind.position.set(0, 0.88, 0.82);
  wind.rotation.x = 0.55;
  car.add(wind);

  // Rear Windshield
  const rearWind = new THREE.Mesh(windGeo, matGlass);
  rearWind.position.set(0, 0.88, -1.1);
  rearWind.rotation.x = -0.55;
  car.add(rearWind);

  // Headlights (Front is +Z)
  [-0.48, 0.48].forEach(x => {
    const hl = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.14, 0.06), matHeadlight);
    hl.position.set(x, 0.45, 1.91);
    car.add(hl);
  });

  // Taillights (Rear is -Z)
  [-0.48, 0.48].forEach(x => {
    const tl = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.12, 0.06), matTaillight);
    tl.position.set(x, 0.45, -1.91);
    car.add(tl);
  });

  // Dual Chrome Exhaust Pipes (for flames/smoke)
  const matExhaust = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.95, roughness: 0.15, flatShading: true });
  [-0.35, 0.35].forEach(x => {
    const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.09, 0.28, 8), matExhaust);
    pipe.rotateX(Math.PI / 2);
    pipe.position.set(x, 0.32, -1.96);
    car.add(pipe);
  });

  // 4 Wheels
  const wheelGeo = new THREE.CylinderGeometry(0.295, 0.295, 0.22, 16);
  wheelGeo.rotateZ(Math.PI / 2);
  const rimGeo = new THREE.CylinderGeometry(0.16, 0.16, 0.23, 12);
  rimGeo.rotateZ(Math.PI / 2);

  const wheelPositions = {
    Wheel_FL: [-0.76, 0.295, 1.15],
    Wheel_FR: [0.76, 0.295, 1.15],
    Wheel_RL: [-0.76, 0.295, -1.15],
    Wheel_RR: [0.76, 0.295, -1.15],
  };

  const wheels = {};
  for (const [name, pos] of Object.entries(wheelPositions)) {
    const wg = new THREE.Group();
    wg.position.set(pos[0], pos[1], pos[2]);
    const tyre = new THREE.Mesh(wheelGeo, matTyre);
    tyre.castShadow = true;
    wg.add(tyre);
    const rim = new THREE.Mesh(rimGeo, matRim);
    wg.add(rim);
    car.add(wg);
    wheels[name] = wg;
  }

  car.userData.wheels = wheels;
  return car;
}

// ---------------------------------------------------------------------------
// FORD ANGLIA 3D MODEL LOADER
// ---------------------------------------------------------------------------
export function createFordAngliaCar(onLoaded) {
  const container = new THREE.Group();
  let activeMesh = createProceduralCarMesh();
  container.add(activeMesh);
  container.userData.wheels = activeMesh.userData.wheels;

  try {
    const binaryString = atob(FORD_ANGLIA_GLB_BASE64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    const loader = new GLTFLoader();
    loader.parse(
      bytes.buffer,
      '',
      (gltf) => {
        const model = gltf.scene;
        model.scale.set(1.15, 1.15, 1.15);
        model.rotation.y = 0;

        const wheels = {};
        model.traverse((child) => {
          if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
          }
          if (child.name && child.name.startsWith('Wheel_')) {
            wheels[child.name] = child;
          }
        });

        if (wheels['Wheel_FL'] && wheels['Wheel_FR'] && wheels['Wheel_RL'] && wheels['Wheel_RR']) {
          container.remove(activeMesh);
          model.userData.wheels = wheels;
          activeMesh = model;
          container.add(model);
          if (typeof onLoaded === 'function') onLoaded(container, wheels);
        }
      },
      (err) => {
        console.warn('Fallback procedural car used:', err);
        if (typeof onLoaded === 'function') onLoaded(container, activeMesh.userData.wheels);
      }
    );
  } catch (err) {
    console.warn('Error parsing model:', err);
    if (typeof onLoaded === 'function') onLoaded(container, activeMesh.userData.wheels);
  }

  return { container, getActiveMesh: () => activeMesh };
}

export const PLAYER_LANE_X = 0.0; // Strictly centered in the straight road

// ---------------------------------------------------------------------------
// TYPE-TO-DRIVE VEHICLE CONTROLLER
// ---------------------------------------------------------------------------
export class VehicleController {
  constructor(carContainer) {
    this.container = carContainer;

    // Movement state: centered at x = 0, sits flat at y = 0, facing forward +Z
    this.position = new THREE.Vector3(PLAYER_LANE_X, 0, 0);
    this.speed = 0; // m/s forward
    this.targetSpeed = 0; // m/s target derived from WPM

    // Vehicle physics tuning
    this.acceleration = 16.0;  // m/s² smooth acceleration towards target
    this.deceleration = 8.0;   // m/s² natural drag when typing slows/stops
    this.maxSpeed = 55.0;      // m/s (~198 km/h max for ultra-fast typing)
    this.wheelRadius = 0.295;
    this.wheelSpin = 0;

    // Nitro Boost surge state
    this.boostTimeRemaining = 0;
    this.boostBonusSpeed = 0;

    this.container.position.copy(this.position);
    this.container.rotation.set(0, 0, 0);
  }

  setCarMesh(newCarMesh) {
    this.container.clear();
    this.container.add(newCarMesh);
    this.container.userData.wheels = newCarMesh.userData.wheels;
    this.container.userData.tailpipeOffsets = newCarMesh.userData.tailpipeOffsets;
    this.wheelRadius = newCarMesh.userData.wheelRadius || 0.295;
    this.carDef = newCarMesh.userData.carDef || null;
    this._syncMesh();
  }

  getSpeedKmh() {
    return this.speed * 3.6;
  }

  applyBoost(durationSec = 3.2, speedBonusKmh = 35) {
    this.boostTimeRemaining = durationSec;
    this.boostBonusSpeed = speedBonusKmh / 3.6;
    // Sudden forward kick
    this.speed = Math.min(this.maxSpeed + 8.0, this.speed + 4.5);
  }

  reset() {
    this.position.set(PLAYER_LANE_X, 0, 0);
    this.speed = 0;
    this.targetSpeed = 0;
    this.wheelSpin = 0;
    this.boostTimeRemaining = 0;
    this.boostBonusSpeed = 0;
    this._syncMesh();
  }

  // Set the target speed based on live WPM and accuracy
  updateTargetSpeed(liveWpm, accuracy = 100) {
    const rawTargetKmh = wpmToTargetKmh(liveWpm);
    const accuracyFactor = Math.max(0.65, accuracy / 100.0);
    const effectiveKmh = rawTargetKmh * accuracyFactor;
    this.targetSpeed = Math.min(this.maxSpeed, effectiveKmh / 3.6);
  }

  // Delta-time physics step
  step(dt, targetSpeedOverride = null) {
    let target = (targetSpeedOverride !== null) ? targetSpeedOverride : this.targetSpeed;

    if (this.boostTimeRemaining > 0) {
      this.boostTimeRemaining -= dt;
      target = Math.min(this.maxSpeed + 8.0, target + (this.boostBonusSpeed || 9.0));
      // Fast surge acceleration
      this.speed = Math.min(target, this.speed + (this.acceleration * 2.2) * dt);
    } else {
      if (this.speed < target) {
        // Accelerate smoothly towards target speed
        this.speed = Math.min(target, this.speed + this.acceleration * dt);
      } else if (this.speed > target) {
        // Decelerate naturally due to friction and drag
        this.speed = Math.max(target, this.speed - this.deceleration * dt);
      }
    }

    // Clean complete stop when target is 0 and speed is near zero
    if (target === 0 && this.speed < 0.05) {
      this.speed = 0;
    }

    // Move strictly forward along +Z axis
    this.position.z += this.speed * dt;
    this.position.x = PLAYER_LANE_X; // Guaranteed locked to center
    this.position.y = 0; // Flat on ground

    // Wheel spin rotation
    const spinDelta = (this.speed * dt) / this.wheelRadius;
    this.wheelSpin += spinDelta;

    this._syncMesh();
  }

  _syncMesh() {
    this.container.position.copy(this.position);
    this.container.rotation.set(0, 0, 0);

    const wheels = this.container.userData.wheels;
    if (wheels) {
      ['Wheel_FL', 'Wheel_FR', 'Wheel_RL', 'Wheel_RR'].forEach(name => {
        const w = wheels[name];
        if (w) {
          w.rotation.set(this.wheelSpin, 0, 0);
        }
      });
    }
  }
}

// Retain alias for backwards compatibility
export { VehicleController as CarController };
