import assert from 'assert';
import * as THREE from 'three';
import { VehicleController } from '../src/car.js';
import { BotManager } from '../src/bots.js';

console.log('Testing Player & Bot Speed Penalties on Mistakes...');

// 1. Player Mistake Penalty Verification
const playerCar = new VehicleController(new THREE.Scene());
playerCar.speed = 25.0; // 90 km/h
playerCar.applyBoost(4.0, 35);
assert(playerCar.boostTimeRemaining > 0, 'Player should have boost active');

const initialSpeed = playerCar.speed;
playerCar.applyMistakePenalty(14); // -14 km/h (~3.89 m/s)

assert(playerCar.speed < initialSpeed, 'Player speed should drop after typo penalty');
assert.strictEqual(playerCar.boostTimeRemaining, 0, 'Player active boost must be cancelled immediately on typo');
assert(playerCar.suspensionPitch < 0, 'Player car should pitch forward into nose dip suspension');
console.log(`✅ PASSED: Player typo penalty verified (Speed dropped from ${(initialSpeed * 3.6).toFixed(1)} km/h to ${(playerCar.speed * 3.6).toFixed(1)} km/h, boost cancelled, nose dip applied)`);

// 2. Bot Mistake Penalty Verification
const scene = new THREE.Scene();
const botManager = new BotManager(scene);
const bots = botManager.getBots();

assert.strictEqual(bots.length, 3, 'There should be 3 competitor bots');
const testBot = bots[0];

// Give bot high speed and boost
testBot.speed = 22.0; // ~79.2 km/h
testBot.isBoosting = true;
testBot.boostTimeRemaining = 3.0;
testBot.mistakeCooldown = 0.001; // trigger mistake next step

let smokeSpawned = false;
const mockSpeedEffects = {
  spawnBrakePuff: (x, z) => {
    smokeSpawned = true;
  },
  spawnSpark: () => {}
};

// Simulate step
botManager.update(0.02, 5.0, true, 100, 20.0, 50, mockSpeedEffects);

assert(testBot.isStumbling, 'Bot should enter stumbling state on mistake');
assert(testBot.speed < 22.0, 'Bot speed should drop on mistake penalty');
assert.strictEqual(testBot.isBoosting, false, 'Bot boost must be cancelled immediately on mistake');
assert.strictEqual(smokeSpawned, true, 'Bot should trigger brake smoke puff on mistake');
assert(testBot.mesh.position.x !== testBot.laneX, 'Bot should visually wobble/twitch across lane during stumble');

console.log(`✅ PASSED: Bot mistake penalty verified (Speed dropped to ${(testBot.speed * 3.6).toFixed(1)} km/h, stumbling = ${testBot.isStumbling}, smoke spawned = ${smokeSpawned}, wobble offset = ${(testBot.mesh.position.x - testBot.laneX).toFixed(3)})`);

console.log('ALL SPEED PENALTY TESTS PASSED!');
