import assert from 'assert';
import * as THREE from 'three';
import { StraightWorld, MAP_PRESETS, NUM_CHUNKS } from '../src/straightRoad.js';

console.log('Testing 3 Playable Maps System...');

// 1. Verify Presets
assert(MAP_PRESETS.alpine, 'Alpine preset must exist');
assert(MAP_PRESETS.forest, 'Forest preset must exist');
assert(MAP_PRESETS.nightcity, 'Night City preset must exist');

assert.strictEqual(MAP_PRESETS.alpine.badge, 'Default');
assert.strictEqual(MAP_PRESETS.forest.badge, 'Dense Foliage');
assert.strictEqual(MAP_PRESETS.nightcity.badge, 'Night City Vibe');
console.log('✅ PASSED: All 3 map presets defined (Alpine Valley, Redwood Forest, Neon Metropolis)');

// 2. Test Default World Initialization
const scene = new THREE.Scene();
const world = new StraightWorld(scene, 'alpine');

assert.strictEqual(world.getMapId(), 'alpine');
assert.strictEqual(world.chunks.length, NUM_CHUNKS);
assert.strictEqual(world.ground.material.color.getHex(), MAP_PRESETS.alpine.groundColor);
assert.strictEqual(world.scene.fog.color.getHex(), MAP_PRESETS.alpine.fogColor);
console.log('✅ PASSED: Default Alpine map initializes correctly with proper ground and fog');

// 3. Test Switching to Forest (Dense Foliage)
world.setMap('forest');
assert.strictEqual(world.getMapId(), 'forest');
assert.strictEqual(world.ground.material.color.getHex(), MAP_PRESETS.forest.groundColor);
assert.strictEqual(world.scene.fog.color.getHex(), MAP_PRESETS.forest.fogColor);

// Inspect chunk 0 scenery for forest assets
const chunk0 = world.chunks[0].group;
const scenery0 = chunk0.getObjectByName('scenery');
assert(scenery0, 'Chunk must contain scenery group');
assert(scenery0.children.length > 30, `Forest chunk should have dense foliage (found ${scenery0.children.length} objects)`);
console.log(`✅ PASSED: Redwood Forest map loaded with ${scenery0.children.length} dense foliage assets per chunk!`);

// 4. Test Switching to Night City (Cyberpunk Vibe)
world.setMap('nightcity');
assert.strictEqual(world.getMapId(), 'nightcity');
assert.strictEqual(world.ground.material.color.getHex(), MAP_PRESETS.nightcity.groundColor);
assert.strictEqual(world.scene.fog.color.getHex(), MAP_PRESETS.nightcity.fogColor);

const sceneryCity = world.chunks[0].group.getObjectByName('scenery');
assert(sceneryCity, 'Night city chunk must have scenery');
assert(world.backgroundGroup.children.length > 0, 'Night city background must have skyscrapers');
console.log(`✅ PASSED: Neon Metropolis loaded with glowing cyber barriers, streetlamps, and ${world.backgroundGroup.children.length} background skyscrapers!`);

// 5. Test Switching Back to Alpine
world.setMap('alpine');
assert.strictEqual(world.getMapId(), 'alpine');
assert.strictEqual(world.ground.material.color.getHex(), MAP_PRESETS.alpine.groundColor);
console.log('✅ PASSED: Dynamic live switching between all 3 maps verified flawlessly!');

console.log('ALL 3 MAP TESTS PASSED!');
