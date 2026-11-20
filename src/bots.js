import * as THREE from 'three';
import { LANE_CENTERS, FINISH_LINE_Z } from './straightRoad.js';

export class BotManager {
  constructor(scene) {
    this.scene = scene;
    this.bots = [];

    // Configurations for the 3 competitor bot cars in lanes 0, 2, and 3
    // (Lane 1 is reserved for the player at x = -2.0)
    const botConfigs = [
      {
        id: 1,
        name: 'Crimson Comet',
        laneIndex: 0,
        x: LANE_CENTERS[0], // x = -6.0
        color: 0xef4444, // vibrant sports red
        accentColor: 0x991b1b,
        maxSpeed: 37.2, // ~134 km/h
        acceleration: 12.8,
      },
      {
        id: 2,
        name: 'Golden Apex',
        laneIndex: 2,
        x: LANE_CENTERS[2], // x = +2.0
        color: 0xf59e0b, // sunset amber yellow
        accentColor: 0xb45309,
        maxSpeed: 38.0, // ~137 km/h
        acceleration: 12.2,
      },
      {
        id: 3,
        name: 'Emerald Phantom',
        laneIndex: 3,
        x: LANE_CENTERS[3], // x = +6.0
        color: 0x10b981, // neon racing green
        accentColor: 0x065f46,
        maxSpeed: 39.2, // ~141 km/h (top rival)
        acceleration: 13.5,
      },
    ];

    botConfigs.forEach(cfg => {
      const mesh = this._createBotCarMesh(cfg.color, cfg.accentColor);
      mesh.position.set(cfg.x, 0, 0);
      this.scene.add(mesh);

      this.bots.push({
        id: cfg.id,
        name: cfg.name,
        laneX: cfg.x,
        mesh,
        speed: 0,
        maxSpeed: cfg.maxSpeed,
        acceleration: cfg.acceleration,
        wheelSpin: 0,
        wheelRadius: 0.295,
        finished: false,
        finishTime: null,
      });
    });
  }

  _createBotCarMesh(bodyColor, cabinColor) {
    const car = new THREE.Group();

    const matBody = new THREE.MeshStandardMaterial({
      color: bodyColor,
      roughness: 0.35,
      metalness: 0.45,
      flatShading: true,
    });
    const matCabin = new THREE.MeshStandardMaterial({
      color: cabinColor,
      roughness: 0.3,
      metalness: 0.3,
      flatShading: true,
    });
    const matGlass = new THREE.MeshStandardMaterial({
      color: 0xa5f3fc,
      roughness: 0.1,
      metalness: 0.2,
      transparent: true,
      opacity: 0.75,
    });
    const matTyre = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.85, metalness: 0.1, flatShading: true });
    const matRim = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.2, metalness: 0.9, flatShading: true });
    const matHeadlight = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffedd5, emissiveIntensity: 3.5 });
    const matTaillight = new THREE.MeshStandardMaterial({ color: 0xff0000, emissive: 0xff0000, emissiveIntensity: 2.8 });

    // Chassis / Body
    const bodyGeo = new THREE.BoxGeometry(1.52, 0.44, 3.9);
    const body = new THREE.Mesh(bodyGeo, matBody);
    body.position.set(0, 0.45, 0);
    body.castShadow = true;
    car.add(body);

    // Aerodynamic Cabin
    const cabinGeo = new THREE.BoxGeometry(1.26, 0.48, 1.95);
    const cabin = new THREE.Mesh(cabinGeo, matCabin);
    cabin.position.set(0, 0.85, -0.15);
    cabin.castShadow = true;
    car.add(cabin);

    // Windshields
    const windGeo = new THREE.BoxGeometry(1.2, 0.42, 0.08);
    const windF = new THREE.Mesh(windGeo, matGlass);
    windF.position.set(0, 0.88, 0.82);
    windF.rotation.x = 0.55;
    car.add(windF);

    const windR = new THREE.Mesh(windGeo, matGlass);
    windR.position.set(0, 0.88, -1.1);
    windR.rotation.x = -0.55;
    car.add(windR);

    // Headlights
    [-0.5, 0.5].forEach(x => {
      const hl = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.14, 0.06), matHeadlight);
      hl.position.set(x, 0.45, 1.96);
      car.add(hl);
    });

    // Taillights
    [-0.5, 0.5].forEach(x => {
      const tl = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.12, 0.06), matTaillight);
      tl.position.set(x, 0.45, -1.96);
      car.add(tl);
    });

    // 4 Wheels
    const wheels = [];
    const wheelPositions = [
      { x: -0.65, y: 0.295, z:  1.3 },
      { x:  0.65, y: 0.295, z:  1.3 },
      { x: -0.65, y: 0.295, z: -1.05 },
      { x:  0.65, y: 0.295, z: -1.05 },
    ];

    wheelPositions.forEach(wp => {
      const wg = new THREE.Group();
      wg.position.set(wp.x, wp.y, wp.z);

      const tGeo = new THREE.CylinderGeometry(0.295, 0.295, 0.20, 16);
      tGeo.rotateZ(Math.PI / 2);
      const tire = new THREE.Mesh(tGeo, matTyre);
      tire.castShadow = true;
      wg.add(tire);

      const rGeo = new THREE.CylinderGeometry(0.16, 0.16, 0.22, 12);
      rGeo.rotateZ(Math.PI / 2);
      const rim = new THREE.Mesh(rGeo, matRim);
      wg.add(rim);

      car.add(wg);
      wheels.push(wg);
    });

    car.userData.wheels = wheels;
    return car;
  }

  reset() {
    this.bots.forEach(bot => {
      bot.speed = 0;
      bot.wheelSpin = 0;
      bot.finished = false;
      bot.finishTime = null;
      bot.mesh.position.set(bot.laneX, 0, 0);
      bot.mesh.rotation.set(0, 0, 0);
    });
  }

  // -------------------------------------------------------------------------
  // Bot AI Update (Fast Acceleration and Drag Race to Finish Line)
  // -------------------------------------------------------------------------
  update(dt, raceTimeMs = 0, isRacing = true) {
    if (!isRacing) return;

    this.bots.forEach(bot => {
      // Accelerate fast towards top speed
      const powerRatio = Math.max(0, 1.0 - (bot.speed / bot.maxSpeed));
      bot.speed = Math.min(bot.maxSpeed, bot.speed + bot.acceleration * (powerRatio ** 0.75) * dt);

      // Move forward along the lane (+Z)
      bot.mesh.position.z += bot.speed * dt;
      bot.mesh.position.x = bot.laneX; // strictly locked to its own lane
      bot.mesh.position.y = 0;

      // Wheel roll animation
      const spinDelta = (bot.speed * dt) / bot.wheelRadius;
      bot.wheelSpin += spinDelta;

      if (bot.mesh.userData.wheels) {
        bot.mesh.userData.wheels.forEach(w => {
          w.rotation.set(bot.wheelSpin, 0, 0);
        });
      }

      // Check if crossed the finish line
      if (!bot.finished && bot.mesh.position.z >= FINISH_LINE_Z) {
        bot.finished = true;
        bot.finishTime = raceTimeMs;
      }
    });
  }
}
