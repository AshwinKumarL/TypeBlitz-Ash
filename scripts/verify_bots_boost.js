import assert from 'assert';
import { BotManager } from '../src/bots.js';
import * as THREE from 'three';
import { FINISH_LINE_Z } from '../src/straightRoad.js';

console.log('Testing Bot Fair Racing Floor & Turbo Boost Mechanics...');

const scene = new THREE.Scene();
const botManager = new BotManager(scene);

// Initial state
const bots = botManager.getBots();
assert.strictEqual(bots.length, 3, 'Should have 3 rival bots');

// Test 1: When player stops typing (playerSpeed = 0), bots keep moving at or above their minFloorSpeed!
const dt = 0.1;
for (let t = 0; t < 5.0; t += dt) {
  botManager.update(dt, t, true, 0, 0, 0, null);
}

bots.forEach(bot => {
  console.log(`Bot ${bot.name} speed after player stops: ${(bot.speed * 3.6).toFixed(1)} km/h (target: ${(bot.targetSpeed * 3.6).toFixed(1)} km/h)`);
  assert(bot.speed > 10.0, `Bot ${bot.name} should keep moving and NOT stop when player stops!`);
  assert(bot.mesh.position.z > 20.0, `Bot ${bot.name} should have pulled ahead down the track!`);
});

// Test 2: Check Turbo Boost state and flame meshes
let boostTriggered = false;
for (let t = 5.0; t < 25.0; t += dt) {
  botManager.update(dt, t, true, 50, 15, 45, null);
  if (bots.some(b => b.isBoosting)) {
    boostTriggered = true;
    const boostingBot = bots.find(b => b.isBoosting);
    assert(boostingBot.flameGroup.visible, 'Boosting bot flame group should be visible');
  }
}
assert(boostTriggered, 'At least one bot should have triggered turbo boost during the race');
console.log('✅ PASSED: Bot fair speed floor and turbo boost animations verified successfully!');
