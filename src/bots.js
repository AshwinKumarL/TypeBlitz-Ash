import * as THREE from 'three';
import {
  createLamborghiniMesh,
  createMercedesMesh,
  createPorscheMesh,
} from './carModels.js';
import { LANE_CENTERS, FINISH_LINE_Z } from './straightRoad.js';
import { getCarMesh } from './carCatalog.js';

export class BotManager {
  constructor(scene) {
    this.scene = scene;
    this.bots = [];

    // Competitor Bot Cars:
    // Lane 0: x = -4.8 (Mercedes-Benz AMG GT, Sleek Metallic Silver)
    // Lane 1: x =  0.0 (Player: Ford Anglia / Apex GT)
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
        baseSpeed: 14.2,      // ~51 km/h (~39 WPM equivalent)
        minFloorSpeed: 11.2,  // ~40 km/h (~31 WPM floor)
        acceleration: 9.5,
        leadOffset: 1.2,      // Rival contesting near lead
        variationAmp: 1.5,
        variationFreq: 0.85,
        variationPhase: 0.0,
        exhaustOffsets: [
          { x: -0.36, y: 0.32, z: -1.95, radius: 0.10, length: 1.5 },
          { x: 0.36, y: 0.32, z: -1.95, radius: 0.10, length: 1.5 },
        ],
        flameColors: {
          inner: 0xfffbeb,
          outer: 0xf59e0b,
          emissive: 0xd97706,
        },
        sparkLevel: 2,
      },
      {
        id: 2,
        name: 'AMG GT Coupe',
        modelName: 'Mercedes-Benz',
        laneIndex: 0,
        x: LANE_CENTERS[0], // -4.8
        meshFactory: () => createMercedesMesh(0xd1d5db, 0x1a1a1a),
        baseSpeed: 12.8,      // ~46 km/h (~35 WPM equivalent)
        minFloorSpeed: 10.0,  // ~36 km/h (~27 WPM floor)
        acceleration: 8.5,
        leadOffset: -0.5,     // Flanking contender on the left door
        variationAmp: 1.2,
        variationFreq: 0.65,
        variationPhase: 2.1,
        exhaustOffsets: [
          { x: -0.47, y: 0.28, z: -1.94, radius: 0.08, length: 1.3 },
          { x: 0.47, y: 0.28, z: -1.94, radius: 0.08, length: 1.3 },
        ],
        flameColors: {
          inner: 0xe0f2fe,
          outer: 0x0284c7,
          emissive: 0x38bdf8,
        },
        sparkLevel: 1,
      },
      {
        id: 3,
        name: '911 GT3 RS',
        modelName: 'Porsche',
        laneIndex: 3,
        x: LANE_CENTERS[3], // +9.2
        meshFactory: () => createPorscheMesh(0xdc2626, 0x1f2937),
        baseSpeed: 13.6,      // ~49 km/h (~37 WPM equivalent)
        minFloorSpeed: 10.6,  // ~38 km/h (~29 WPM floor)
        acceleration: 9.0,
        leadOffset: -1.2,     // Drafting stalker making surges
        variationAmp: 1.6,
        variationFreq: 1.05,
        variationPhase: 4.3,
        exhaustOffsets: [
          { x: -0.32, y: 0.28, z: -1.94, radius: 0.09, length: 1.4 },
          { x: 0.32, y: 0.28, z: -1.94, radius: 0.09, length: 1.4 },
        ],
        flameColors: {
          inner: 0xfff1f2,
          outer: 0xe11d48,
          emissive: 0xf43f5e,
        },
        sparkLevel: 3,
      },
    ];

    botConfigs.forEach(cfg => {
      const mesh = cfg.meshFactory();
      mesh.position.set(cfg.x, 0, 0);
      this.scene.add(mesh);

      // Create turbo boost exhaust flame meshes attached directly to this bot
      const { flameGroup, flamePipes } = this._createBotFlames(cfg, mesh);

      this.bots.push({
        id: cfg.id,
        name: cfg.name,
        modelName: cfg.modelName,
        laneIndex: cfg.laneIndex,
        laneX: cfg.x,
        mesh,
        speed: 0,
        baseSpeed: cfg.baseSpeed,
        minFloorSpeed: cfg.minFloorSpeed,
        targetSpeed: cfg.baseSpeed,
        acceleration: cfg.acceleration,
        leadOffset: cfg.leadOffset,
        variationAmp: cfg.variationAmp,
        variationFreq: cfg.variationFreq,
        variationPhase: cfg.variationPhase,
        wheelSpin: 0,
        wheelRadius: 0.295,
        finished: false,
        finishTime: null,
        // Turbo Boost System
        isBoosting: false,
        boostTimeRemaining: 0,
        boostCooldown: THREE.MathUtils.randFloat(6.0, 14.0),
        flameGroup,
        flamePipes,
        sparkLevel: cfg.sparkLevel,
        // Mistake & Stumble System
        isStumbling: false,
        stumbleTimeRemaining: 0,
        mistakeCooldown: THREE.MathUtils.randFloat(7.0, 16.0),
      });
    });
  }

  // -------------------------------------------------------------------------
  // Create Turbo Boost Dual Exhaust Flame Group for a Bot Mesh
  // Always guarantees TWO dual exhaust flames (Left & Right), matching player's twin flames!
  // -------------------------------------------------------------------------
  _createBotFlames(cfg, carMesh) {
    const flameGroup = new THREE.Group();
    const flamePipes = [];

    // Always guarantee TWO dual exhaust flames (Left & Right), matching player's twin flames!
    const rawOffsets = cfg.tailpipeOffsets || cfg.exhaustOffsets;
    let offsets;
    if (Array.isArray(rawOffsets) && rawOffsets.length >= 2) {
      offsets = rawOffsets;
    } else {
      const z = (rawOffsets && rawOffsets[0] && typeof rawOffsets[0].z === 'number') ? rawOffsets[0].z : -2.25;
      const y = (rawOffsets && rawOffsets[0] && typeof rawOffsets[0].y === 'number') ? rawOffsets[0].y : 0.30;
      offsets = [
        { x: -0.36, y, z },
        { x: 0.36, y, z },
      ];
    }

    const flameColors = cfg.flameColors || { inner: 0xfffbeb, outer: 0xf59e0b, emissive: 0xd97706 };

    offsets.forEach(pos => {
      const pipeGroup = new THREE.Group();
      pipeGroup.position.set(pos.x, pos.y, pos.z);

      // Inner Core Flame (bright hot plasma core)
      const coreGeo = new THREE.ConeGeometry(0.12, 1.2, 7);
      coreGeo.rotateX(-Math.PI / 2); // point backwards (-Z)
      coreGeo.translate(0, 0, -0.6);
      const coreMat = new THREE.MeshBasicMaterial({
        color: flameColors.inner,
        transparent: true,
        opacity: 0.95,
      });
      const coreMesh = new THREE.Mesh(coreGeo, coreMat);
      pipeGroup.add(coreMesh);

      // Outer Fiery Cone (roaring colored jet flame)
      const outerGeo = new THREE.ConeGeometry(0.25, 1.75, 7);
      outerGeo.rotateX(-Math.PI / 2);
      outerGeo.translate(0, 0, -0.875);
      const outerMat = new THREE.MeshStandardMaterial({
        color: flameColors.outer,
        emissive: flameColors.emissive,
        emissiveIntensity: 4.8,
        flatShading: true,
        transparent: true,
        opacity: 0.90,
      });
      const outerMesh = new THREE.Mesh(outerGeo, outerMat);
      pipeGroup.add(outerMesh);

      flameGroup.add(pipeGroup);
      flamePipes.push({ group: pipeGroup, core: coreMesh, outer: outerMesh, pos });
    });

    flameGroup.visible = false;
    carMesh.add(flameGroup);
    return { flameGroup, flamePipes };
  }

  /**
   * Randomize bot car 3D models from the catalog.
   * Swaps in fresh 3D low-poly models, custom paints, and calibrated exhaust flames.
   */
  randomizeFleet(botFleetList) {
    if (!Array.isArray(botFleetList) || botFleetList.length === 0) return;

    botFleetList.forEach((item, idx) => {
      const bot = this.bots[idx];
      if (!bot) return;

      const def = item.def;
      const paintHex = item.paintHex;

      // Remove existing mesh and attached flames from scene
      if (bot.mesh && bot.mesh.parent) {
        this.scene.remove(bot.mesh);
      }

      // Build new 3D model mesh from catalog
      const newMesh = getCarMesh(def, paintHex);
      if (newMesh) {
        newMesh.position.set(bot.laneX, 0, 0);
        this.scene.add(newMesh);

        // Attach bot turbo boost flames to the new mesh
        const { flameGroup, flamePipes } = this._createBotFlames(def, newMesh);

        bot.mesh = newMesh;
        bot.name = def.name;
        bot.modelName = def.category;
        bot.flameGroup = flameGroup;
        bot.flamePipes = flamePipes;
        bot.sparkLevel = def.sparkLevel || 2;
        bot.wheelRadius = newMesh.userData.wheelRadius || 0.295;
        bot.isStumbling = false;
        bot.stumbleTimeRemaining = 0;
        bot.mistakeCooldown = THREE.MathUtils.randFloat(7.0, 16.0);
      }
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

      // Reset turbo boost state
      bot.isBoosting = false;
      bot.boostTimeRemaining = 0;
      bot.boostCooldown = THREE.MathUtils.randFloat(6.0, 14.0);
      if (bot.flameGroup) {
        bot.flameGroup.visible = false;
      }

      // Reset mistake & stumble state
      bot.isStumbling = false;
      bot.stumbleTimeRemaining = 0;
      bot.mistakeCooldown = THREE.MathUtils.randFloat(7.0, 16.0);

      // Reset wheel rotations
      this._spinWheels(bot, 0);
    });
  }

  // -------------------------------------------------------------------------
  // Bot AI Update (Fair Racing Speed Floor + Dynamic Competition + Bot Boosts)
  // - If the player is typing poorly or stops, bots DO NOT wait; they maintain
  //   their honest racing speed floor and cross the finish line to win!
  // - Competitor bots also trigger autonomous turbo boost flame animations.
  // -------------------------------------------------------------------------
  update(dt, raceTimeSec = 0, isRacing = true, playerZ = 0, playerSpeed = 0, playerWpm = 0, speedEffects = null) {
    this.bots.forEach(bot => {
      if (!isRacing && bot.finished) {
        // Natural coasting deceleration after crossing finish line
        bot.speed = Math.max(0, bot.speed - 7.0 * dt);
        if (bot.flameGroup) bot.flameGroup.visible = false;
      } else if (isRacing) {
        // Dynamic micro-wave for organic engine throttle variations
        const wave = Math.sin(raceTimeSec * bot.variationFreq + bot.variationPhase) * bot.variationAmp;

        // 1. Bot Mistake / Stumble Logic (Simulated missed shifts & errors under pressure)
        if (bot.isStumbling) {
          bot.stumbleTimeRemaining -= dt;
          if (bot.stumbleTimeRemaining <= 0) {
            bot.isStumbling = false;
            bot.stumbleTimeRemaining = 0;
            bot.mesh.position.x = bot.laneX;
          }
        } else {
          bot.mistakeCooldown -= dt;
          if (bot.mistakeCooldown <= 0 && raceTimeSec > 3.0) {
            // Trigger bot mistake!
            bot.isStumbling = true;
            bot.stumbleTimeRemaining = THREE.MathUtils.randFloat(1.3, 2.1);
            bot.mistakeCooldown = THREE.MathUtils.randFloat(10.0, 22.0);

            // Immediate speed penalty: drop ~14-18 km/h (3.8 - 5.0 m/s)
            const penalty = THREE.MathUtils.randFloat(3.8, 5.0);
            bot.speed = Math.max(bot.minFloorSpeed * 0.65, bot.speed - penalty);

            // Mistake immediately cancels boost
            if (bot.isBoosting) {
              bot.isBoosting = false;
              bot.boostTimeRemaining = 0;
              if (bot.flameGroup) bot.flameGroup.visible = false;
            }

            // Spawn brake tire smoke puff on the track
            if (speedEffects && typeof speedEffects.spawnBrakePuff === 'function') {
              speedEffects.spawnBrakePuff(bot.laneX, bot.mesh.position.z);
            }
          }
        }

        // 2. Bot Turbo Boost Logic
        if (bot.isBoosting) {
          bot.boostTimeRemaining -= dt;
          if (bot.flameGroup) {
            bot.flameGroup.visible = true;

            // Flame flicker animation
            bot.flamePipes.forEach(pipe => {
              const flickerZ = 1.0 + Math.random() * 0.65;
              const flickerXY = 0.85 + Math.random() * 0.35;
              pipe.outer.scale.set(flickerXY, flickerXY, flickerZ);
              pipe.core.scale.set(flickerXY * 0.9, flickerXY * 0.9, flickerZ * 1.1);

              // Spawn shower of sparks from bot tailpipes if speedEffects provided
              if (speedEffects && Math.random() < 0.65) {
                speedEffects.spawnSpark(
                  bot.mesh.position.x + pipe.pos.x,
                  bot.mesh.position.y + pipe.pos.y,
                  bot.mesh.position.z + pipe.pos.z,
                  bot.sparkLevel
                );
              }
            });
          }

          if (bot.boostTimeRemaining <= 0) {
            bot.isBoosting = false;
            bot.boostCooldown = THREE.MathUtils.randFloat(10.0, 20.0);
            if (bot.flameGroup) bot.flameGroup.visible = false;
          }
        } else {
          bot.boostCooldown -= dt;
          // Trigger bot boost if cooldown expired and not currently stumbling
          if (!bot.isStumbling && bot.boostCooldown <= 0 && raceTimeSec > 3.0) {
            bot.isBoosting = true;
            bot.boostTimeRemaining = THREE.MathUtils.randFloat(2.2, 3.4);
            if (bot.flameGroup) bot.flameGroup.visible = true;
          }
        }

        // 3. Target Speed Calculation with Strict Fair Speed Floor
        // If the player stops or is bad at typing, the bots keep moving at or above minFloorSpeed.
        const minFloor = bot.minFloorSpeed; // 10.0 - 11.2 m/s (~36 - 40 km/h)

        if (playerSpeed > 1.0) {
          // Player is driving: Bot adjusts dynamically to player's velocity & relative distance
          const gapZ = bot.mesh.position.z - playerZ;
          const targetGap = bot.leadOffset + wave;
          const errorZ = gapZ - targetGap;

          let adaptiveSpeed = playerSpeed;

          if (errorZ > 0) {
            // Bot is leading too far ahead: ease off throttle, BUT NEVER drop below minFloor!
            const brakingFactor = THREE.MathUtils.clamp(errorZ * 1.5, 0, playerSpeed * 0.35);
            adaptiveSpeed = Math.max(minFloor, playerSpeed - brakingFactor);
          } else {
            // Bot is lagging behind: press accelerator to stay in the contest
            const catchupFactor = THREE.MathUtils.clamp(-errorZ * 2.0, 0, 10.0);
            adaptiveSpeed = Math.max(minFloor, playerSpeed + catchupFactor);
          }

          // Near finish line (< 120m remaining):
          // If player is genuinely typing well (WPM > 38 or driving fast),
          // allow a tight photo finish. BUT if player is typing poorly, bots cross to win!
          if (playerZ > FINISH_LINE_Z - 120) {
            if (playerWpm > 38 || playerSpeed > 22.0) {
              adaptiveSpeed = Math.max(minFloor, adaptiveSpeed * 0.90);
            } else {
              adaptiveSpeed = Math.max(bot.baseSpeed, adaptiveSpeed);
            }
          }

          bot.targetSpeed = adaptiveSpeed;
        } else {
          // Player has stopped typing or is idling:
          // The bots DO NOT stop! They race forward at full baseSpeed to win!
          bot.targetSpeed = bot.baseSpeed;
        }

        // If bot is stumbling from a mistake, throttle target speed down
        if (bot.isStumbling) {
          bot.targetSpeed = Math.max(bot.minFloorSpeed * 0.70, bot.targetSpeed * 0.72);
        }

        // Apply bot turbo boost speed surge
        if (bot.isBoosting && !bot.isStumbling) {
          bot.targetSpeed += 6.5; // +24 km/h boost surge
        }

        // Smooth physical acceleration / braking
        if (bot.speed < bot.targetSpeed) {
          bot.speed = Math.min(bot.targetSpeed, bot.speed + bot.acceleration * dt);
        } else if (bot.speed > bot.targetSpeed) {
          bot.speed = Math.max(bot.targetSpeed, bot.speed - 8.0 * dt);
        }
      }

      // Move forward along the assigned lane (+Z)
      bot.mesh.position.z += bot.speed * dt;
      if (bot.isStumbling) {
        // High frequency chassis wobble while recovering from missed shift
        const wobbleX = Math.sin(raceTimeSec * 24) * 0.14;
        bot.mesh.position.x = bot.laneX + wobbleX;
      } else {
        bot.mesh.position.x = bot.laneX; // strictly locked to its own highway lane
      }
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
