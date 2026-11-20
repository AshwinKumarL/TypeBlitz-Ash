import * as THREE from 'three';
import { StraightWorld, FINISH_LINE_Z } from './straightRoad.js';
import { createFordAngliaCar, VehicleController, PLAYER_LANE_X } from './car.js';
import { StraightChaseCamera } from './camera.js';
import { SpeedEffects } from './speedEffects.js';
import { TypingEngine } from './typingEngine.js';
import { WPMCalculator } from './wpmCalculator.js';
import { AudioManager } from './audio.js';
import { UIController } from './ui.js';
import { BotManager } from './bots.js';

export class Game {
  constructor() {
    this.canvas = document.getElementById('game-canvas');
    this.state = 'MENU'; // 'MENU' | 'PLAYING' | 'PAUSED' | 'FINISHED'

    // Race Timing & Progress
    this.elapsedTimeSec = 0;
    this.sessionStartTime = 0;

    // 1. Scene & Three.js Renderer
    this._initScene();

    // 2. Straight Highway World (4 Lanes, Finish Line Arch at FINISH_LINE_Z, Continuous Terrain)
    this.world = new StraightWorld(this.scene);

    // 3. Player Car (Ford Anglia Model, Centered at x = 0.0)
    const { container: carContainer } = createFordAngliaCar((container, wheels) => {
      if (this.car) {
        this.car.container.userData.wheels = wheels;
      }
    });
    this.carMesh = carContainer;
    this.scene.add(this.carMesh);

    this.car = new VehicleController(this.carMesh);
    this.car.reset();

    // 4. Competitor Bot Cars (Lamborghini, Mercedes-Benz AMG, Porsche 911)
    this.botManager = new BotManager(this.scene);

    // 5. Chase Camera
    this.chaseCamera = new StraightChaseCamera(this.camera, this.car);
    this.menuAngle = 0;

    // 6. Dynamic Speed Effects (Wind Streaks)
    this.speedEffects = new SpeedEffects(this.scene);

    // 7. Audio System (Engine Hum, Mechanical Key Clicks, Typo Sounds, Fanfare)
    this.audio = new AudioManager();

    // 8. Typing Engine & WPM Calculator
    this.typingEngine = new TypingEngine();
    this.wpmCalc = new WPMCalculator(3.5);

    // 9. Modern UI Controller
    this.ui = new UIController();

    // 10. Clock
    this.clock = new THREE.Clock();

    // Bindings
    this._setupTypingHooks();
    this._setupUIHooks();
    this._bindWindowEvents();

    // Show starting screen
    this.ui.showMenu();
    this.ui.updateSentenceText(this.typingEngine.getCurrentSentence(), 0);

    // Start Animation Loop
    this._loop();
  }

  // -------------------------------------------------------------------------
  // Three.js Scene Setup
  // -------------------------------------------------------------------------
  _initScene() {
    this.scene = new THREE.Scene();

    const aspect = window.innerWidth / window.innerHeight;
    this.camera = new THREE.PerspectiveCamera(58, aspect, 0.1, 1400);

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
  }

  // -------------------------------------------------------------------------
  // Typing Engine Callbacks
  // -------------------------------------------------------------------------
  _setupTypingHooks() {
    this.typingEngine.onCorrectKey = (key, charIndex, nowMs) => {
      if (this.state === 'MENU') {
        this.startGame();
      }
      this.wpmCalc.recordKeystroke(true, nowMs);
      this.audio.playKeyClick();
      this.ui.updateSentenceText(this.typingEngine.getCurrentSentence(), charIndex);
    };

    this.typingEngine.onIncorrectKey = (expected, typed, charIndex, nowMs) => {
      if (this.state === 'MENU') {
        this.startGame();
      }
      this.wpmCalc.recordKeystroke(false, nowMs);
      this.audio.playKeyError();
      this.ui.flashTypo();
    };

    this.typingEngine.onSentenceComplete = (completed, next, count, nowMs) => {
      this.audio.playSentenceComplete();
      this.ui.updateSentenceText(next, 0);
    };

    this.typingEngine.onFinish = () => {
      if (this.state === 'PLAYING') {
        this._finishChallenge();
      }
    };

    this.typingEngine.onFirstKey = () => {
      if (this.state === 'MENU') {
        this.startGame();
      }
    };

    this.typingEngine.startListening();
  }

  // -------------------------------------------------------------------------
  // UI Hooks
  // -------------------------------------------------------------------------
  _setupUIHooks() {
    this.ui.onPlay = () => this.startGame();
    this.ui.onResume = () => this.resumeGame();
    this.ui.onRestart = () => this.restartGame();
    this.ui.onPauseClick = () => this.togglePause();
    this.ui.onMuteToggle = (muted) => this.audio.setMuted(muted);
  }

  _bindWindowEvents() {
    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });

    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.togglePause();
      } else if (e.key === 'Enter') {
        if (this.state === 'MENU') {
          this.startGame();
        } else if (this.state === 'FINISHED') {
          this.restartGame();
        }
      }
    });
  }

  // -------------------------------------------------------------------------
  // Game Lifecycle State Machine
  // -------------------------------------------------------------------------
  startGame() {
    if (this.state === 'PLAYING') return;

    this.audio.init();
    this.audio.startEngine();

    this.state = 'PLAYING';
    this.elapsedTimeSec = 0;
    this.sessionStartTime = performance.now();

    this.typingEngine.setActive(true);
    this.wpmCalc.start(this.sessionStartTime);
    this.botManager.reset();

    this.ui.hideMenu();
    this.ui.hidePause();
    this.ui.hideFinish();
    this.ui.showHUD();
    this.ui.updateSentenceText(this.typingEngine.getCurrentSentence(), this.typingEngine.getCharIndex());
  }

  togglePause() {
    if (this.state === 'PLAYING') {
      this.pauseGame();
    } else if (this.state === 'PAUSED') {
      this.resumeGame();
    }
  }

  pauseGame() {
    if (this.state !== 'PLAYING') return;
    this.state = 'PAUSED';
    this.typingEngine.setActive(false);
    this.audio.updateEngine(0, false);
    this.ui.showPause();
  }

  resumeGame() {
    if (this.state !== 'PAUSED') return;
    this.state = 'PLAYING';
    this.typingEngine.setActive(true);
    this.ui.hidePause();
  }

  restartGame() {
    this.state = 'PLAYING';
    this.elapsedTimeSec = 0;
    this.sessionStartTime = performance.now();

    this.car.reset();
    this.botManager.reset();
    this.world.reset();
    this.chaseCamera.snap();
    this.speedEffects.reset();

    this.typingEngine.reset();
    this.typingEngine.setActive(true);
    this.wpmCalc.reset();
    this.wpmCalc.start(this.sessionStartTime);

    this.ui.hideMenu();
    this.ui.hidePause();
    this.ui.hideFinish();
    this.ui.showHUD();
    this.ui.updateSentenceText(this.typingEngine.getCurrentSentence(), 0);

    this.audio.startEngine();
  }

  _finishChallenge() {
    if (this.state === 'FINISHED') return;
    this.state = 'FINISHED';
    this.typingEngine.setActive(false);
    this.audio.playLapComplete();

    const now = performance.now();
    const avgWpm = this.wpmCalc.getAverageWpm(now);
    const peakWpm = this.wpmCalc.getPeakWpm();
    const accuracy = this.wpmCalc.getAccuracy();
    const distance = this.car.position.z;
    const progress = this.typingEngine.getProgress();
    const rank = this.botManager.getLiveRank(distance);

    this.ui.showFinish({
      position: rank,
      placement: rank,
      finishTimeSec: this.elapsedTimeSec,
      avgWpm,
      peakWpm,
      accuracy,
      wordsTyped: progress.wordsTyped,
      totalWords: progress.totalWords,
      distance,
    });
  }

  // -------------------------------------------------------------------------
  // Main Animation Loop
  // -------------------------------------------------------------------------
  _loop() {
    requestAnimationFrame(this._loop.bind(this));

    const rawDt = this.clock.getDelta();
    const dt = Math.min(rawDt, 0.05);
    const now = performance.now();

    if (this.state === 'MENU') {
      // Gentle cinematic camera orbiting the parked car
      this.menuAngle += dt * 0.25;
      const radius = 9.5;
      this.camera.position.set(
        Math.cos(this.menuAngle) * radius,
        2.8,
        Math.sin(this.menuAngle) * radius
      );
      this.camera.lookAt(0, 0.8, 0);
    } else if (this.state === 'PLAYING') {
      // 1. Elapsed Time Progression
      this.elapsedTimeSec += dt;

      // 2. Compute Live WPM and Accuracy
      const liveWpm = this.wpmCalc.getLiveWpm(now);
      const accuracy = this.wpmCalc.getAccuracy();

      // 3. Update Vehicle Target Speed Based on WPM & Physics Step
      this.car.updateTargetSpeed(liveWpm, accuracy);
      this.car.step(dt);

      const playerZ = this.car.position.z;
      const speedKmh = this.car.getSpeedKmh();

      // 4. Update Competitor Bots
      this.botManager.update(dt, this.elapsedTimeSec, true);

      // 5. Calculate Live Race Placement (1st, 2nd, 3rd, 4th)
      const rank = this.botManager.getLiveRank(playerZ);

      // 6. Update Straight Road & Continuous Scenery (including Finish Line Arch)
      this.world.update(playerZ);

      // 7. Update Chase Camera with Dynamic FOV
      this.chaseCamera.update(dt, speedKmh);

      // 8. Update High-Speed Wind Streaks
      this.speedEffects.update(dt, playerZ, speedKmh);

      // 9. Update Engine Sound Pitch
      this.audio.updateEngine(speedKmh, false);

      // 10. Update HUD Metrics
      const progress = this.typingEngine.getProgress();
      const finishDistM = Math.max(0, FINISH_LINE_Z - playerZ);

      this.ui.updateHUD({
        liveWpm,
        accuracy,
        speedKmh,
        elapsedTimeSec: this.elapsedTimeSec,
        wordsTyped: progress.wordsTyped,
        totalWords: progress.totalWords,
        position: rank,
        finishDistanceM: finishDistM,
        distanceM: playerZ,
      });

      // 11. Race Completion Condition:
      // Player finishes when all passage words are typed OR player crosses FINISH_LINE_Z
      if (this.typingEngine.isFinished || playerZ >= FINISH_LINE_Z) {
        this._finishChallenge();
      }
    } else if (this.state === 'FINISHED') {
      // Coasting car after crossing finish line or completing words
      this.car.updateTargetSpeed(0, 100);
      this.car.step(dt);

      // Bots continue coasting / finishing
      this.botManager.update(dt, this.elapsedTimeSec, false);

      this.world.update(this.car.position.z);
      this.chaseCamera.update(dt, this.car.getSpeedKmh());
      this.speedEffects.update(dt, this.car.position.z, this.car.getSpeedKmh());
      this.audio.updateEngine(this.car.getSpeedKmh(), false);
    }

    this.renderer.render(this.scene, this.camera);
  }
}

// Auto-boot game when DOM is ready
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    window.addEventListener('DOMContentLoaded', () => {
      new Game();
    });
  } else {
    new Game();
  }
}
