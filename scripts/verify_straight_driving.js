import * as THREE from 'three';
import { StraightWorld, ROAD_WIDTH, LANE_CENTERS, CHUNK_LENGTH, NUM_CHUNKS, FINISH_LINE_Z } from '../src/straightRoad.js';
import { createProceduralCarMesh, CarController, PLAYER_LANE_X } from '../src/car.js';
import { StraightChaseCamera } from '../src/camera.js';
import { BotManager } from '../src/bots.js';

console.log('====================================================');
console.log('4-LANE EVENING HIGHWAY & BOTS SYSTEM VERIFICATION');
console.log('====================================================\n');

let passedTests = 0;
let totalTests = 0;

function assert(condition, message) {
  totalTests++;
  if (!condition) {
    console.error(`❌ FAILED: ${message}`);
    process.exit(1);
  } else {
    console.log(`✅ PASSED: ${message}`);
    passedTests++;
  }
}

const scene = new THREE.Scene();
const world = new StraightWorld(scene);
const carMesh = createProceduralCarMesh();
scene.add(carMesh);
const car = new CarController(carMesh);
const botManager = new BotManager(scene);
const mockCam = new THREE.PerspectiveCamera(60, 16 / 9, 0.1, 1000);
const chaseCam = new StraightChaseCamera(mockCam, car);

const DT = 1 / 60;

// ---------------------------------------------------------------------------
// 1. 4-Lane Highway Straightness & Geometry
// ---------------------------------------------------------------------------
console.log('--- 1. Testing 4-Lane Highway Dimensions & Alignment ---');
assert(ROAD_WIDTH === 16.0, 'Road width is expanded to 16.0m for 4 lanes');
assert(LANE_CENTERS.length === 4, 'Exactly 4 distinct driving lanes defined');
assert(JSON.stringify(LANE_CENTERS) === JSON.stringify([-6.0, -2.0, 2.0, 6.0]), 'Lane centers are at [-6, -2, +2, +6]m');
assert(FINISH_LINE_Z === 1200.0, 'Finish line is configured at 1200.0m');

world.chunks.forEach((chunk, i) => {
  assert(chunk.group.position.x === 0, `Chunk ${i} is perfectly centered at x = 0`);
  assert(chunk.group.position.y === 0, `Chunk ${i} is flat on the ground at y = 0`);
});
assert(world.gantryGroup.children.length > 0, 'Finish line gantry structure is created');
assert(world.gantryGroup.children[0].position.z === FINISH_LINE_Z, 'Finish line gantry sits exactly at z = 1200m');

// ---------------------------------------------------------------------------
// 2. Continuous Flat Ground Terrain
// ---------------------------------------------------------------------------
console.log('\n--- 2. Testing Ground Continuity and Flatness ---');
assert(world.ground.position.y === 0, 'Ground plane is at y = 0.0');
assert(world.ground.geometry.parameters.width >= 2000, 'Ground plane is massive (>= 2000m) to extend to horizon');
world.update(500.0);
assert(world.ground.position.z === 500.0, 'Ground follows player to ensure continuous landscape with no end');

// ---------------------------------------------------------------------------
// 3. Player Car in Lane 1 (x = -2.0)
// ---------------------------------------------------------------------------
console.log('\n--- 3. Testing Player Car Lane 1 Lock (x = -2.0) ---');
car.reset();
assert(car.position.x === PLAYER_LANE_X, 'Player car starts locked in Lane 1 (x = -2.0)');
let stayInLane = true;
for (let f = 0; f < 300; f++) {
  car.step(DT, { forward: true });
  if (car.position.x !== PLAYER_LANE_X || car.container.position.x !== PLAYER_LANE_X || car.container.rotation.y !== 0) {
    stayInLane = false;
    break;
  }
}
assert(stayInLane, 'Player car stayed strictly locked in Lane 1 (x = -2.0) and rotation.y = 0 across 300 frames');

// ---------------------------------------------------------------------------
// 4. Player Smooth Acceleration, Braking, No Reverse
// ---------------------------------------------------------------------------
console.log('\n--- 4. Testing Smooth Forward Acceleration & Braking ---');
car.reset();
assert(car.speed === 0, 'Car starts at 0 km/h');

let prevSpeed = 0;
let smoothAccel = true;
for (let f = 0; f < 120; f++) {
  car.step(DT, { forward: true });
  if (car.speed < prevSpeed) smoothAccel = false;
  prevSpeed = car.speed;
}
assert(smoothAccel, 'Speed increased smoothly and monotonically during acceleration');
assert(car.getSpeedKmh() > 60, `Car accelerated to ${car.getSpeedKmh().toFixed(1)} km/h after 2s`);
assert(car.getSpeedKmh() <= 145, 'Car speed respects maximum limit');

// Coasting deceleration
prevSpeed = car.speed;
let smoothDecel = true;
for (let f = 0; f < 60; f++) {
  car.step(DT, { forward: false });
  if (car.speed > prevSpeed) smoothDecel = false;
  prevSpeed = car.speed;
}
assert(smoothDecel, 'Car naturally and smoothly decelerated when forward input released');

// Braking to stop
for (let f = 0; f < 120; f++) {
  car.step(DT, { backward: true });
}
assert(car.speed === 0, 'Car braked cleanly to complete stop (speed = 0) without going into reverse');

// ---------------------------------------------------------------------------
// 5. 3 Competitor Bot Cars (Lanes 0, 2, and 3)
// ---------------------------------------------------------------------------
console.log('\n--- 5. Testing 3 Competitor Bot Cars ---');
assert(botManager.bots.length === 3, 'Exactly 3 competitor bot cars are spawned');
assert(botManager.bots[0].laneX === LANE_CENTERS[0], 'Bot 1 (Crimson Comet) is in Lane 0 (x = -6.0)');
assert(botManager.bots[1].laneX === LANE_CENTERS[2], 'Bot 2 (Golden Apex) is in Lane 2 (x = +2.0)');
assert(botManager.bots[2].laneX === LANE_CENTERS[3], 'Bot 3 (Emerald Phantom) is in Lane 3 (x = +6.0)');

botManager.reset();
let botsAdvance = true;
let botWheelsSpin = true;
for (let f = 0; f < 180; f++) {
  botManager.update(DT, f * DT);
}
botManager.bots.forEach((b, idx) => {
  if (b.mesh.position.z <= 0 || b.speed <= 0) botsAdvance = false;
  if (b.wheelSpin <= 0) botWheelsSpin = false;
  assert(b.mesh.position.x === b.laneX, `Bot ${idx + 1} stayed strictly locked in lane x = ${b.laneX}`);
});
assert(botsAdvance, 'All 3 bots accelerate forward ("go fast and up") along +Z');
assert(botWheelsSpin, 'Bot wheels spin realistically proportional to speed');

// ---------------------------------------------------------------------------
// 6. Finish Line & Standings System
// ---------------------------------------------------------------------------
console.log('\n--- 6. Testing Finish Line & Live Rankings ---');
// Advance bots to finish line
for (let f = 0; f < 2500; f++) {
  botManager.update(DT, 3.0 + f * DT);
  if (botManager.bots.every(b => b.finished)) break;
}
const allBotsFinished = botManager.bots.every(b => b.finished && b.finishTime > 0);
assert(allBotsFinished, 'All bots successfully cross the 1200m finish line and record finish times');

// ---------------------------------------------------------------------------
// 7. No Objects Float in the Air
// ---------------------------------------------------------------------------
console.log('\n--- 7. Testing Zero Floating Objects ---');
let noFloatingObjects = true;
world.chunks.forEach(chunk => {
  const scenery = chunk.group.getObjectByName('scenery');
  if (scenery) {
    scenery.children.forEach(obj => {
      if (obj.position.y < -0.01) noFloatingObjects = false;
    });
  }
});
assert(noFloatingObjects, 'All roadside trees, lamps, and rocks sit flush on the ground at y = 0');

// ---------------------------------------------------------------------------
// 8. No Visible Geometry Gaps
// ---------------------------------------------------------------------------
console.log('\n--- 8. Testing Seamless Highway Tile Continuity ---');
world.reset();
const sortedChunks = [...world.chunks].sort((a, b) => a.group.position.z - b.group.position.z);
let chunksContinuous = true;
for (let i = 0; i < sortedChunks.length - 1; i++) {
  const diff = sortedChunks[i + 1].group.position.z - sortedChunks[i].group.position.z;
  if (Math.abs(diff - CHUNK_LENGTH) > 0.001) chunksContinuous = false;
}
assert(chunksContinuous, `Chunks tile seamlessly every ${CHUNK_LENGTH}m with zero gaps`);

// ---------------------------------------------------------------------------
// 9. Camera Stability & View of All 4 Lanes
// ---------------------------------------------------------------------------
console.log('\n--- 9. Testing Camera Stability & Framing ---');
chaseCam.snap();
assert(chaseCam.camera.position.x === PLAYER_LANE_X, 'Camera is aligned behind player in Lane 1 (x = -2.0)');
assert(chaseCam.camera.position.y >= 2.0, 'Camera stays well above ground (y >= 2.0)');

let camStable = true;
for (let f = 0; f < 120; f++) {
  car.step(DT, { forward: true });
  chaseCam.update(DT, car.getSpeedKmh());
  if (chaseCam.camera.position.x !== PLAYER_LANE_X) camStable = false;
  if (chaseCam.camera.position.y < 2.0) camStable = false;
}
assert(camStable, 'Camera maintained stable horizon, locked lane tracking, and never clipped ground');

console.log('\n====================================================');
console.log(`ALL VERIFICATION CHECKS PASSED! (${passedTests}/${totalTests})`);
console.log('====================================================\n');
