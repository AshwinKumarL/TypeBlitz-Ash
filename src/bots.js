import * as THREE from 'three';
import {
  createLamborghiniMesh,
  createMercedesMesh,
  createPorscheMesh,
} from './carModels.js';
import { LANE_CENTERS, FINISH_LINE_Z } from './straightRoad.js';

export class BotManager {
  constructor(scene) {
    this.scene = scene;
    this.bots = [];

    // Competitor Bot Cars:
    // Lane 0: x = -4.8 (Mercedes-Benz AMG GT, Sleek Metallic Silver)
    // Lane 1: x =  0.0 (Player: Ford Anglia)
    // Lane 2: x = +4.8 (Lamborghini Aventador, Vibrant Yellow)
    // Lane 3: x = +9.2 (Porsche 911 Turbo, Racing Red)
    const botConfigs = [
      {
        id: 1,
        name: 'Aventador SV',
        modelName: 'Lamborghini',
        laneIndex: 2,
        x: LANE_CENTERS[2], // +4.8
        meshFactory: () => createLamborghiniMesh(0xffb800, 0x111111),
        baseSpeed: 21.5, // ~77 km/h (~55 WPM equivalent)
        acceleration: 10.5,
        variationAmp: 1.5,
        variationFreq: 0.8,
        variationPhase: 0.0,
      },
      {
        id: 2,
        name: 'AMG GT Coupe',
        modelName: 'Mercedes-Benz',
        laneIndex: 0,
        x: LANE_CENTERS[0], // -4.8
        meshFactory: () => createMercedesMesh(0xd1d5db, 0x1a1a1a),
        baseSpeed: 18.5, // ~67 km/h (~48 WPM equivalent)
        acceleration: 9.5,
        variationAmp: 1.2,
        variationFreq: 0.65,
        variationPhase: 2.1,
      },
      {
        id: 3,
        name: '911 GT3 RS',
        modelName: 'Porsche',
        laneIndex: 3,
        x: LANE_CENTERS[3], // +9.2
        meshFactory: () => createPorscheMesh(0xdc2626, 0x1f2937),
        baseSpeed: 23.5, // ~85 km/h (~62 WPM equivalent)
        acceleration: 11.5,
        variationAmp: 1.8,
        variationFreq: 0.9,
        variationPhase: 4.3,
      },
    ];

    botConfigs.forEach(cfg => {
      const mesh = cfg.meshFactory();
      mesh.position.set(cfg.x, 0, 0);
      this.scene.add(mesh);

      this.bots.push({
        id: cfg.id,
        name: cfg.name,
        modelName: cfg.modelName,
        laneIndex: cfg.laneIndex,
        laneX: cfg.x,
        mesh,
        speed: 0,
        baseSpeed: cfg.baseSpeed,
        targetSpeed: cfg.baseSpeed,
        acceleration: cfg.acceleration,
        variationAmp: cfg.variationAmp,
        variationFreq: cfg.variationFreq,
        variationPhase: cfg.variationPhase,
        wheelSpin: 0,
        wheelRadius: 0.295,
        finished: false,
        finishTime: null,
      });
    });
  }

  reset() {
    this.bots.forEach(bot => {
      bot.speed = 0;
      bot.wheelSpin = 0;
      bot.finished = false;
      bot.finishTime = null;
      bot.targetSpeed = bot.baseSpeed;
      bot.mesh.position.set(bot.laneX, 0, 0);
      bot.mesh.rotation.set(0, 0, 0);

      // Reset wheel rotations
      this._spinWheels(bot, 0);
    });
  }

  // -------------------------------------------------------------------------
  // Bot AI Update (Dynamic Speed Variations & Lane Traversal)
  // -------------------------------------------------------------------------
  update(dt, raceTimeSec = 0, isRacing = true) {
    this.bots.forEach(bot => {
      if (!isRacing && bot.finished) {
        // Natural coasting deceleration after crossing
        bot.speed = Math.max(0, bot.speed - 6.0 * dt);
      } else {
        // Dynamic micro-variations so cars feel alive and realistic
        const wave = Math.sin(raceTimeSec * bot.variationFreq + bot.variationPhase);
        bot.targetSpeed = Math.max(12.0, bot.baseSpeed + wave * bot.variationAmp);

        if (bot.speed < bot.targetSpeed) {
          bot.speed = Math.min(bot.targetSpeed, bot.speed + bot.acceleration * dt);
        } else if (bot.speed > bot.targetSpeed) {
          bot.speed = Math.max(bot.targetSpeed, bot.speed - 6.0 * dt);
        }
      }

      // Move forward along the assigned lane (+Z)
      bot.mesh.position.z += bot.speed * dt;
      bot.mesh.position.x = bot.laneX; // strictly locked to its own highway lane
      bot.mesh.position.y = 0;

      // Wheel rotation
      const spinDelta = (bot.speed * dt) / bot.wheelRadius;
      bot.wheelSpin += spinDelta;
      this._spinWheels(bot, bot.wheelSpin);

      // Check if crossed the finish line
      if (!bot.finished && bot.mesh.position.z >= FINISH_LINE_Z) {
        bot.finished = true;
        bot.finishTime = raceTimeSec;
      }
    });
  }

  _spinWheels(bot, angle) {
    const wheels = bot.mesh.userData.wheels;
    if (wheels) {
      if (Array.isArray(wheels)) {
        wheels.forEach(w => {
          if (w) w.rotation.x = angle;
        });
      } else if (typeof wheels === 'object') {
        Object.values(wheels).forEach(w => {
          if (w && w.rotation) w.rotation.x = angle;
        });
      }
    }
  }

  // -------------------------------------------------------------------------
  // Live Placement Calculation (1st, 2nd, 3rd, 4th)
  // -------------------------------------------------------------------------
  getLiveRank(playerZ) {
    let rank = 1;
    for (const bot of this.bots) {
      if (bot.mesh.position.z > playerZ) {
        rank++;
      }
    }
    return rank;
  }

  getBots() {
    return this.bots;
  }
}
