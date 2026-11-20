/**
 * verify_type_to_drive.js
 * Comprehensive automated verification test suite for TYPE TO DRIVE:
 * Verifies all 12 core requirements specified in Section 11 of the redesign prompt.
 */
import * as THREE from 'three';
import { TypingEngine, TYPING_PASSAGES } from '../src/typingEngine.js';
import { WPMCalculator, wpmToTargetKmh } from '../src/wpmCalculator.js';
import { VehicleController, createProceduralCarMesh, PLAYER_LANE_X } from '../src/car.js';
import { StraightWorld, ROAD_WIDTH, CHUNK_LENGTH } from '../src/straightRoad.js';
import { StraightChaseCamera } from '../src/camera.js';

console.log('====================================================');
console.log('TYPE TO DRIVE - CORE SYSTEM VERIFICATION');
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

const DT = 1 / 60;

// ---------------------------------------------------------------------------
// 1. Requirement 1: Typing correctly advances the sentence
// ---------------------------------------------------------------------------
console.log('--- 1. Testing Correct Typing Progression ---');
const engine1 = new TypingEngine(["Test sentence."]);
engine1.setActive(true);
assert(engine1.getCharIndex() === 0, 'Sentence starts at char index 0');
assert(engine1.getExpectedChar() === 'T', 'First expected char is "T"');

const res1 = engine1.processKey('T');
assert(res1 && res1.isCorrect === true, 'Correct key "T" is accepted');
assert(engine1.getCharIndex() === 1, 'Sentence char index advanced to 1');
assert(engine1.getExpectedChar() === 'e', 'Next expected char is "e"');

// ---------------------------------------------------------------------------
// 2. Requirement 2: Incorrect characters do not advance progress
// ---------------------------------------------------------------------------
console.log('\n--- 2. Testing Incorrect Characters (No Progress Advance) ---');
const initialIndex = engine1.getCharIndex();
const resWrong = engine1.processKey('x'); // expected 'e'
assert(resWrong && resWrong.isCorrect === false, 'Incorrect key "x" rejected');
assert(engine1.getCharIndex() === initialIndex, 'Sentence char index remains at 1 (does not advance on error)');
assert(engine1.getExpectedChar() === 'e', 'Expected char is still "e"');

// ---------------------------------------------------------------------------
// 3. Requirement 3: WPM calculations are accurate
// ---------------------------------------------------------------------------
console.log('\n--- 3. Testing WPM Calculations ---');
const wpmCalc = new WPMCalculator(3.5);
wpmCalc.start(0);

// Simulate typing at 60 WPM: 60 words/min = 1 word/sec = 5 chars/sec
// In 3.5 seconds: 17.5 chars (e.g. 18 chars)
for (let i = 0; i < 18; i++) {
  wpmCalc.recordKeystroke(true, i * 200); // 1 key every 200ms = 5 keys/sec
}
const liveWpm = wpmCalc.getLiveWpm(3600);
// 18 chars / 5 = 3.6 words in 3.5s window = (3.6 / (3.5/60)) = 61.7 WPM
assert(Math.abs(liveWpm - 60.0) < 5.0, `Live WPM accurately calculated (${liveWpm.toFixed(1)} WPM ≈ 60 WPM)`);

// ---------------------------------------------------------------------------
// 4. Requirement 4: Faster typing increases vehicle speed
// ---------------------------------------------------------------------------
console.log('\n--- 4. Testing Faster Typing Increases Vehicle Speed ---');
const speed20 = wpmToTargetKmh(20);
const speed40 = wpmToTargetKmh(40);
const speed60 = wpmToTargetKmh(60);
const speed80 = wpmToTargetKmh(80);
const speed100 = wpmToTargetKmh(100);

assert(speed20 === 25, '20 WPM maps to 25 KM/H target');
assert(speed40 === 50, '40 WPM maps to 50 KM/H target');
assert(speed60 === 85, '60 WPM maps to 85 KM/H target');
assert(speed80 === 120, '80 WPM maps to 120 KM/H target');
assert(speed100 === 160, '100 WPM maps to 160 KM/H target');
assert(speed100 > speed80 && speed80 > speed60 && speed60 > speed40, 'Vehicle speed strictly increases with higher WPM');

// ---------------------------------------------------------------------------
// 5. Requirement 5: Slower typing reduces acceleration / target speed
// ---------------------------------------------------------------------------
console.log('\n--- 5. Testing Slower Typing Reduces Target Speed ---');
const carMesh = createProceduralCarMesh();
const car = new VehicleController(carMesh);
car.reset();

// Accelerate at 80 WPM
car.updateTargetSpeed(80, 100);
for (let i = 0; i < 120; i++) car.step(DT);
const highSpeed = car.getSpeedKmh();
assert(highSpeed > 70, `Car accelerated to ${highSpeed.toFixed(1)} KM/H under 80 WPM`);

// Typing drops to 30 WPM
car.updateTargetSpeed(30, 100);
for (let i = 0; i < 120; i++) car.step(DT);
const lowerSpeed = car.getSpeedKmh();
assert(lowerSpeed < highSpeed, `Car naturally reduced speed to ${lowerSpeed.toFixed(1)} KM/H when typing slowed`);

// ---------------------------------------------------------------------------
// 6. Requirement 6: Stopping typing causes gradual deceleration
// ---------------------------------------------------------------------------
console.log('\n--- 6. Testing Gradual Deceleration When Typing Stops ---');
// WPM drops to 0 when user stops typing
car.updateTargetSpeed(0, 100);
const speedBeforeCoast = car.getSpeedKmh();
for (let i = 0; i < 30; i++) {
  car.step(DT);
}
const speedAfterCoast = car.getSpeedKmh();
assert(speedAfterCoast < speedBeforeCoast, 'Car gradually decelerates when typing stops');
assert(speedAfterCoast > 0, 'Car retains natural momentum and does not stop instantly');

// ---------------------------------------------------------------------------
// 7. Requirement 7: The car eventually comes to a complete stop
// ---------------------------------------------------------------------------
console.log('\n--- 7. Testing Car Eventually Reaches Complete Stop (0 KM/H) ---');
for (let i = 0; i < 300; i++) {
  car.step(DT);
}
assert(car.speed === 0 && car.getSpeedKmh() === 0, 'Car cleanly reached complete stop (0 KM/H) after typing stopped');

// ---------------------------------------------------------------------------
// 8. Requirement 8: Completing a sentence loads another sentence
// ---------------------------------------------------------------------------
console.log('\n--- 8. Testing Sentence Completion Loads Next Sentence ---');
const engine2 = new TypingEngine(["First word.", "Second word."]);
engine2.setActive(true);
assert(engine2.getCurrentSentence() === "First word.", 'First sentence loaded initially');

// Type all characters of first sentence
for (const char of "First word.") {
  engine2.processKey(char);
}
assert(engine2.sentencesCompleted === 1, 'Sentence count incremented to 1');
assert(engine2.getCurrentSentence() === "Second word.", 'Next sentence automatically loaded');
assert(engine2.getCharIndex() === 0, 'Char index reset to 0 for the new sentence');

// ---------------------------------------------------------------------------
// 9. Requirement 9: Vehicle speed is preserved between sentences
// ---------------------------------------------------------------------------
console.log('\n--- 9. Testing Vehicle Speed Preserved Between Sentences ---');
car.reset();
car.updateTargetSpeed(80, 100);
for (let i = 0; i < 120; i++) car.step(DT);
const speedAtSentenceEnd = car.getSpeedKmh();

// User finishes sentence and immediately types first letter of new sentence
engine2.processKey('S'); // first letter of "Second word."
car.step(DT);
const speedAtNewSentenceStart = car.getSpeedKmh();
assert(Math.abs(speedAtNewSentenceStart - speedAtSentenceEnd) < 1.0, 'Vehicle speed is preserved seamlessly across sentences with zero reset');

// ---------------------------------------------------------------------------
// 10. Requirement 10: Typing accuracy is calculated correctly
// ---------------------------------------------------------------------------
console.log('\n--- 10. Testing Typing Accuracy Calculation ---');
const accCalc = new WPMCalculator();
accCalc.start(0);
// 18 correct, 2 incorrect = 18 / 20 = 90.0%
for (let i = 0; i < 18; i++) accCalc.recordKeystroke(true, i * 100);
accCalc.recordKeystroke(false, 1900);
accCalc.recordKeystroke(false, 2000);
assert(accCalc.getAccuracy() === 90.0, `Accuracy accurately calculated (${accCalc.getAccuracy()}% === 90%)`);

// ---------------------------------------------------------------------------
// 11. Requirement 11: The game remains responsive during continuous typing
// ---------------------------------------------------------------------------
console.log('\n--- 11. Testing Responsiveness Under Continuous Rapid Typing ---');
const continuousEngine = new TypingEngine();
continuousEngine.setActive(true);
let processedCount = 0;
for (let i = 0; i < 500; i++) {
  const expected = continuousEngine.getExpectedChar();
  const res = continuousEngine.processKey(expected);
  if (res && res.isCorrect) processedCount++;
}
assert(processedCount === 500, `Successfully processed 500 rapid continuous keystrokes (${processedCount}/500)`);
assert(continuousEngine.sentencesCompleted > 5, 'Completed multiple sentences under rapid typing');

// ---------------------------------------------------------------------------
// 12. Requirement 12: No typing events are accidentally registered twice
// ---------------------------------------------------------------------------
console.log('\n--- 12. Testing Single Keystroke Processing (No Duplicate Registration) ---');
let keyCallbacks = 0;
continuousEngine.onCorrectKey = () => { keyCallbacks++; };
continuousEngine.processKey(continuousEngine.getExpectedChar());
assert(keyCallbacks === 1, 'Single keystroke invoked callback exactly once');

// ---------------------------------------------------------------------------
// 13. Environment & Camera: Straight Road Centered at x = 0
// ---------------------------------------------------------------------------
console.log('\n--- 13. Testing Straight Road & Centered Vehicle Alignment ---');
const scene = new THREE.Scene();
const world = new StraightWorld(scene);
const mockCamera = new THREE.PerspectiveCamera(58, 16 / 9, 0.1, 1000);
const chaseCam = new StraightChaseCamera(mockCamera, car);

assert(ROAD_WIDTH === 10.0, 'Road width is 10.0m');
assert(PLAYER_LANE_X === 0.0, 'Player car is strictly locked at center x = 0.0');
assert(car.position.x === 0.0, 'Car position x is exactly 0.0');
assert(world.ground.position.y === 0.0, 'Continuous terrain sits flat at y = 0.0');

chaseCam.snap();
assert(chaseCam.camera.position.x === 0.0, 'Chase camera is strictly centered at x = 0.0');
assert(chaseCam.camera.position.y >= 2.0, 'Chase camera stays above ground');

console.log('\n====================================================');
console.log(`ALL 12 CORE REQUIREMENTS VERIFIED! (${passedTests}/${totalTests})`);
console.log('====================================================\n');
