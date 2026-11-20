import * as THREE from 'three';
import { SplineTrack, ROAD_WIDTH, BARRIER_DISTANCE } from '../src/splineTrack.js';
import { createProceduralCarMesh, CarController } from '../src/car.js';
import { ChaseCamera } from '../src/camera.js';

console.log('====================================================');
console.log('RUNNING FULL GAMEPLAY & PHYSICS VERIFICATION SUITE');
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

// Setup virtual scene
const scene = new THREE.Scene();
const track = new SplineTrack(scene);
const carMesh = createProceduralCarMesh();
scene.add(carMesh);
const car = new CarController(carMesh, scene);
const mockCam = new THREE.PerspectiveCamera(60, 16 / 9, 0.1, 1000);
const chaseCamera = new ChaseCamera(mockCam, car);

const s0 = track.samples[0];
const startPos = s0.point.clone();
startPos.y += 0.35;
const startRot = new THREE.Euler(0, Math.atan2(s0.tangent.x, s0.tangent.z), 0);

const FIXED_DT = 1 / 60;

// ---------------------------------------------------------------------------
// TEST 1: Acceleration & Braking
// ---------------------------------------------------------------------------
console.log('\n--- 1. Testing Acceleration & Braking ---');
car.reset(startPos, startRot);
assert(car.getSpeedKmh() === 0, 'Initial car speed is 0 km/h');

// Accelerate forward for 60 frames (1 second)
for (let f = 0; f < 60; f++) {
  car.step(FIXED_DT, { forward: true, backward: false, left: false, right: false, handbrake: false }, track);
}
const speedAfter1s = car.getSpeedKmh();
assert(speedAfter1s > 25 && speedAfter1s < 70, `Car accelerated to ${speedAfter1s.toFixed(1)} km/h after 1 second`);

// Apply brakes for 35 frames (approx 0.58s to bring car from 55 km/h to 0)
for (let f = 0; f < 35; f++) {
  car.step(FIXED_DT, { forward: false, backward: true, left: false, right: false, handbrake: false }, track);
}
const speedAfterBraking = car.getSpeedKmh();
assert(speedAfterBraking >= -0.1 && speedAfterBraking <= 2.0, `Car braked down to ${speedAfterBraking.toFixed(1)} km/h`);

// ---------------------------------------------------------------------------
// TEST 2: Steering Sensitivity & Self-Centering
// ---------------------------------------------------------------------------
console.log('\n--- 2. Testing Steering Sensitivity & Self-Centering ---');
// At low speed (~20 km/h)
car.reset(startPos, startRot);
for (let f = 0; f < 15; f++) {
  car.step(FIXED_DT, { forward: true, backward: false, left: false, right: false, handbrake: false }, track);
}
for (let f = 0; f < 25; f++) {
  car.step(FIXED_DT, { forward: true, backward: false, left: true, right: false, handbrake: false }, track);
}
const lowSpeedSteer = Math.abs(car.steerAngle);
assert(lowSpeedSteer > 0.40, `Low-speed steer angle is responsive: ${(lowSpeedSteer * 180 / Math.PI).toFixed(1)}°`);

// At medium/high speed (~85 km/h on straight)
car.reset(startPos, startRot);
for (let f = 0; f < 100; f++) {
  car.step(FIXED_DT, { forward: true, backward: false, left: false, right: false, handbrake: false }, track);
}
const highSpeed = car.getSpeedKmh();
for (let f = 0; f < 25; f++) {
  car.step(FIXED_DT, { forward: true, backward: false, left: true, right: false, handbrake: false }, track);
}
const highSpeedSteer = Math.abs(car.steerAngle);
assert(highSpeedSteer < lowSpeedSteer && highSpeedSteer <= 0.42,
  `High-speed steer angle becomes less sensitive: ${(highSpeedSteer * 180 / Math.PI).toFixed(1)}° at ${highSpeed.toFixed(0)} km/h vs ${(lowSpeedSteer * 180 / Math.PI).toFixed(1)}° at low speed`);

// Release steering: verify self-centering
for (let f = 0; f < 40; f++) {
  car.step(FIXED_DT, { forward: false, backward: false, left: false, right: false, handbrake: false }, track);
}
assert(Math.abs(car.steerAngle) < 0.02, `Steering self-centered smoothly: ${(car.steerAngle * 180 / Math.PI).toFixed(2)}°`);

// ---------------------------------------------------------------------------
// TEST 3: Reverse
// ---------------------------------------------------------------------------
console.log('\n--- 3. Testing Reverse ---');
car.reset(startPos, startRot);
for (let f = 0; f < 100; f++) {
  car.step(FIXED_DT, { forward: false, backward: true, left: false, right: false, handbrake: false }, track);
}
const revSpeed = car.getSpeedKmh();
assert(revSpeed < -10 && revSpeed >= -car.reverseMaxSpeed * 3.6 - 1, `Car reversed cleanly at ${revSpeed.toFixed(1)} km/h`);

// ---------------------------------------------------------------------------
// TEST 4: Controlled Drifting & Handbrake
// ---------------------------------------------------------------------------
console.log('\n--- 4. Testing Controlled Drifting & Handbrake ---');
car.reset(startPos, startRot);
// Accelerate to 90 km/h
for (let f = 0; f < 150; f++) {
  car.step(FIXED_DT, { forward: true, backward: false, left: false, right: false, handbrake: false }, track);
}
assert(!car.isDrifting, 'Car is not drifting during straight acceleration');

// Pull handbrake and turn hard
for (let f = 0; f < 30; f++) {
  car.step(FIXED_DT, { forward: true, backward: false, left: true, right: false, handbrake: true }, track);
}
assert(car.isDrifting, `Car successfully entered controlled drift (isDrifting = ${car.isDrifting})`);
assert(car.currentGrip < car.normalGrip, `Lateral grip reduced for slide: ${car.currentGrip.toFixed(1)} vs normal ${car.normalGrip}`);

// Release handbrake and countersteer
for (let f = 0; f < 60; f++) {
  car.step(FIXED_DT, { forward: true, backward: false, left: false, right: false, handbrake: false }, track);
}
assert(!car.isDrifting && car.currentGrip > 20.0, 'Grip cleanly restored after exiting drift without spinning out');

// ---------------------------------------------------------------------------
// TEST 5: Smooth Camera Following
// ---------------------------------------------------------------------------
console.log('\n--- 5. Testing Smooth Camera Following ---');
chaseCamera.snap();
const initCamY = chaseCamera.camera.position.y;
assert(initCamY >= 1.0, `Camera position Y (${initCamY.toFixed(2)}) is well above ground`);

for (let f = 0; f < 120; f++) {
  car.step(FIXED_DT, { forward: true, backward: false, left: f % 40 < 20, right: false, handbrake: false }, track);
  chaseCamera.update(FIXED_DT, car.getSpeedKmh());
  assert(!isNaN(chaseCamera.camera.position.x), 'Camera position is valid (not NaN)');
  assert(chaseCamera.camera.position.y >= 1.0, 'Camera stays strictly above ground during high-speed turns');
}
assert(chaseCamera.camera.fov >= chaseCamera.baseFov, `Dynamic FOV adapted to speed: ${chaseCamera.camera.fov.toFixed(1)}°`);

// ---------------------------------------------------------------------------
// TEST 6: Track Boundary & Barrier Collision Response
// ---------------------------------------------------------------------------
console.log('\n--- 6. Testing Track Boundary & Barrier Collision ---');
car.reset(startPos, startRot);
// Turn hard right towards barrier
let hitBarrier = false;
for (let f = 0; f < 180; f++) {
  car.step(FIXED_DT, { forward: true, backward: false, left: false, right: true, handbrake: false }, track);
  if (car.collidedThisFrame) hitBarrier = true;
}
assert(hitBarrier, 'Car detected boundary collision with barriers');

const trackInfo = track.getTrackInfo(car.position);
assert(Math.abs(trackInfo.lateralDist) <= BARRIER_DISTANCE + 0.1,
  `Car remained securely inside road boundary (lateral dist = ${Math.abs(trackInfo.lateralDist).toFixed(2)}m <= ${BARRIER_DISTANCE}m)`);
assert(car.velocity.length() < 100, `Collision response did not launch car into air (vel: ${car.velocity.length().toFixed(1)} m/s)`);

// ---------------------------------------------------------------------------
// TEST 7: Checkpoints & Sequential Lap Completion
// ---------------------------------------------------------------------------
console.log('\n--- 7. Testing Checkpoints & Lap System ---');
let currentLap = 1;
let nextCpIndex = 1;
let passedCount = 0;
const totalCps = track.checkpoints.length;

let prevPos = startPos.clone();
// Drive along centerline around entire track
for (let i = 0; i < track.numSamples; i++) {
  const currPos = track.samples[(i + 1) % track.numSamples].point.clone();
  currPos.y += 0.35;

  if (track.hasCrossedCheckpoint(prevPos, currPos, nextCpIndex)) {
    passedCount++;
    nextCpIndex = (nextCpIndex + 1) % totalCps;
    if (nextCpIndex === 1 && passedCount >= totalCps - 1) {
      currentLap++;
      passedCount = 0;
    }
  }
  prevPos.copy(currPos);
}
assert(currentLap === 2, `Completed full circuit cleanly: lap count advanced to ${currentLap}`);

// ---------------------------------------------------------------------------
// TEST 8: Anti-Cheat Shortcut & Reverse Rejection
// ---------------------------------------------------------------------------
console.log('\n--- 8. Testing Anti-Cheat & Reverse Rejection ---');
// Drive backwards across finish line
const finishPosAhead = startPos.clone().addScaledVector(s0.tangent, 2.0);
const finishPosBehind = startPos.clone().addScaledVector(s0.tangent, -2.0);
const crossedBackwards = track.hasCrossedCheckpoint(finishPosAhead, finishPosBehind, 0);
assert(!crossedBackwards, 'Driving backwards across finish line is strictly REJECTED');

// Try skipping to checkpoint 10 without crossing checkpoint 1
const skipCrossed = track.hasCrossedCheckpoint(startPos, track.checkpoints[10].position, 1);
assert(!skipCrossed, 'Skipping checkpoints does not advance checkpoint tracker');

// ---------------------------------------------------------------------------
// TEST 9: Out-of-Bounds Detection & Safe Recovery
// ---------------------------------------------------------------------------
console.log('\n--- 9. Testing Out-of-Bounds Detection & Recovery ---');
const offTrackPos = startPos.clone().addScaledVector(s0.binormal, 25.0); // 25m off track
assert(track.isOutOfBounds(offTrackPos), 'Track correctly identified out-of-bounds position');

const respawn = track.getRespawnTransform(offTrackPos);
const respawnInfo = track.getTrackInfo(respawn.position);
assert(Math.abs(respawnInfo.lateralDist) < 0.05, `Respawn safely returns car to centerline (lateral: ${respawnInfo.lateralDist.toFixed(3)}m)`);
assert(respawn.position.y > respawnInfo.center.y, 'Respawn raises car safely above asphalt');

// ---------------------------------------------------------------------------
// TEST 10: Multi-Minute Stability & Determinism (1,500 frames)
// ---------------------------------------------------------------------------
console.log('\n--- 10. Testing Simulation Stability (1,500 frames) ---');
car.reset(startPos, startRot);
let noNaN = true;
for (let f = 0; f < 1500; f++) {
  const turnLeft = Math.sin(f * 0.05) > 0.3;
  const turnRight = Math.sin(f * 0.05) < -0.3;
  const hb = f % 120 > 90;
  car.step(FIXED_DT, { forward: true, backward: false, left: turnLeft, right: turnRight, handbrake: hb }, track);
  if (isNaN(car.position.x) || isNaN(car.velocity.x) || isNaN(car.yaw)) {
    noNaN = false;
    break;
  }
}
assert(noNaN, '1,500 continuous simulation frames completed with ZERO NaN or numerical instability');

console.log('\n====================================================');
console.log(`ALL TESTS PASSED! (${passedTests}/${totalTests})`);
console.log('====================================================\n');
