/**
 * audio.js — High-Fidelity Procedural Audio System for Type To Drive
 * Completely overhauled procedural synthesis via Web Audio API.
 * Features:
 *  1. Satisfying "Thocky" Mechanical Keyboard Switch Clicks (Cherry MX / Holy Panda style)
 *  2. Soft Tactile Typo Feedback (gentle wooden pop, no abrasive buzzers)
 *  3. Rich Throaty Supercar V8/V10 Engine Synthesis (deep sub-bass rumble, intake rush, RPM modulation)
 *  4. Multi-Tier Nitro Boost Sound Effects (sub-bass ignition boom, turbine spool & plasma roar)
 *  5. Shimmering Victory & Streak Chimes (FM bell chords)
 *  6. Master Bus Soft-Clipping Limiter for studio-grade warmth without distortion.
 */

export class AudioManager {
  constructor() {
    this.audioCtx = null;
    this.masterGain = null;
    this.limiter = null;

    // Engine synthesis nodes
    this._engineRunning = false;
    this._engineSubOsc = null;
    this._engineGrowlOsc = null;
    this._engineHarmonicOsc = null;
    this._engineFilter = null;
    this._engineGain = null;
    this._engineTurbineNoise = null;
    this._engineTurbineFilter = null;
    this._engineTurbineGain = null;
    this._engineLFO = null;
    this._engineLFOGain = null;

    // Tire screech nodes
    this._screechSource = null;
    this._screechGain = null;
    this._screechFilter = null;
    this._screechRunning = false;
    this._screechFadeTimeout = null;

    // Shared noise buffer
    this._noiseBuffer = null;

    // Mute state
    this._muted = false;
    this._volume = 0.85;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // INIT & MASTER AUDIO BUS
  // ─────────────────────────────────────────────────────────────────────────

  init() {
    if (this.audioCtx) {
      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }
      return;
    }

    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;

    this.audioCtx = new AudioContextClass();

    // Studio-grade soft-clipper / saturator curve
    this.limiter = this.audioCtx.createWaveShaper();
    this.limiter.curve = this._makeDistortionCurve(1.5);
    this.limiter.oversample = '2x';

    // Master volume gain
    this.masterGain = this.audioCtx.createGain();
    this.masterGain.gain.setValueAtTime(this._muted ? 0 : this._volume, this.audioCtx.currentTime);

    // Route: Master Gain → Limiter → Destination
    this.masterGain.connect(this.limiter);
    this.limiter.connect(this.audioCtx.destination);

    // Build shared 3-second noise buffer
    this._noiseBuffer = this._createNoiseBuffer(3.0);
  }

  _ensureInit() {
    if (!this.audioCtx) this.init();
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
  }

  _makeDistortionCurve(amount = 1.5) {
    const k = amount;
    const nSamples = 44100;
    const curve = new Float32Array(nSamples);
    const deg = Math.PI / 180;
    for (let i = 0; i < nSamples; ++i) {
      const x = (i * 2) / nSamples - 1;
      // Smooth hyperbolic tangent soft saturation
      curve[i] = Math.tanh(k * x);
    }
    return curve;
  }

  _createNoiseBuffer(duration = 2.0) {
    const ctx = this.audioCtx;
    if (!ctx) return null;
    const sampleRate = ctx.sampleRate;
    const length = Math.floor(sampleRate * duration);
    const buffer = ctx.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);
    // Smooth pinkish noise with lowpass filter accumulation
    let b0 = 0, b1 = 0, b2 = 0;
    for (let i = 0; i < length; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99765 * b0 + white * 0.0990460;
      b1 = 0.96300 * b1 + white * 0.2965164;
      b2 = 0.57000 * b2 + white * 1.0526913;
      data[i] = (b0 + b1 + b2 + white * 0.1848) * 0.18;
    }
    return buffer;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // SATISFYING MECHANICAL KEYBOARD CLICKS (Cherry MX / Holy Panda "Thock")
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * playKeyClick — tactile mechanical switch sound
   * Layer 1: Crisp high-frequency switch snap (2.6 - 3.4 kHz)
   * Layer 2: Deep woody/plastic housing resonance body ("thock", 240 - 380 Hz)
   * @param {boolean} isSpace — deeper cavity resonance for spacebar
   */
  playKeyClick(isSpace = false) {
    this._ensureInit();
    if (!this.audioCtx) return;
    const ctx = this.audioCtx;
    const now = ctx.currentTime;

    // Subtle pitch micro-variance so keystrokes feel organic
    const pitchJitter = THREE_MathUtils_rand(-35, 35);
    const basePitch = isSpace ? 210 : 320;
    const thockFreq = Math.max(160, basePitch + pitchJitter);

    // --- 1. Downstroke Switch Snap (High-Frequency Impulse) ---
    if (this._noiseBuffer) {
      const snapSrc = ctx.createBufferSource();
      snapSrc.buffer = this._noiseBuffer;

      const snapFilter = ctx.createBiquadFilter();
      snapFilter.type = 'bandpass';
      snapFilter.frequency.setValueAtTime(isSpace ? 2400 : 3100 + pitchJitter * 4, now);
      snapFilter.Q.setValueAtTime(3.8, now);

      const snapGain = ctx.createGain();
      const snapVol = isSpace ? 0.32 : 0.24;
      snapGain.gain.setValueAtTime(snapVol, now);
      snapGain.gain.exponentialRampToValueAtTime(0.001, now + (isSpace ? 0.016 : 0.012));

      snapSrc.connect(snapFilter);
      snapFilter.connect(snapGain);
      snapGain.connect(this.masterGain);

      snapSrc.start(now);
      snapSrc.stop(now + 0.02);
    }

    // --- 2. Housing Cavity Resonance ("The Thock") ---
    const thockOsc = ctx.createOscillator();
    thockOsc.type = 'triangle';
    thockOsc.frequency.setValueAtTime(thockFreq, now);
    thockOsc.frequency.exponentialRampToValueAtTime(thockFreq * 0.65, now + (isSpace ? 0.045 : 0.032));

    const thockFilter = ctx.createBiquadFilter();
    thockFilter.type = 'lowpass';
    thockFilter.frequency.setValueAtTime(isSpace ? 650 : 850, now);

    const thockGain = ctx.createGain();
    const thockVol = isSpace ? 0.35 : 0.26;
    thockGain.gain.setValueAtTime(thockVol, now);
    thockGain.gain.exponentialRampToValueAtTime(0.001, now + (isSpace ? 0.05 : 0.036));

    thockOsc.connect(thockFilter);
    thockFilter.connect(thockGain);
    thockGain.connect(this.masterGain);

    thockOsc.start(now);
    thockOsc.stop(now + 0.06);
  }

  /**
   * playKeyError — gentle muted wooden "dud"
   * Soft and non-abrasive, yet distinct feedback for typos.
   */
  playKeyError() {
    this._ensureInit();
    if (!this.audioCtx) return;
    const ctx = this.audioCtx;
    const now = ctx.currentTime;

    // Damped low tap
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(190, now);
    osc.frequency.exponentialRampToValueAtTime(75, now + 0.07);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.35, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.09);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // SUPERCAR ENGINE SYNTHESIS (Throaty V8/V10 Sound)
  // ─────────────────────────────────────────────────────────────────────────

  startEngine() {
    this._ensureInit();
    if (this._engineRunning || !this.audioCtx) return;
    this._engineRunning = true;

    const ctx = this.audioCtx;
    const now = ctx.currentTime;

    // Main Engine Sub-mix Gain
    this._engineGain = ctx.createGain();
    this._engineGain.gain.setValueAtTime(0.0, now);
    this._engineGain.gain.linearRampToValueAtTime(0.24, now + 0.35);

    // Warm Lowpass Filter shaping exhaust throatiness
    this._engineFilter = ctx.createBiquadFilter();
    this._engineFilter.type = 'lowpass';
    this._engineFilter.frequency.setValueAtTime(420, now);
    this._engineFilter.Q.setValueAtTime(2.2, now);

    // 1. Deep Sub-Bass Rumble (Triangle wave fundamental: gives heavy weight)
    this._engineSubOsc = ctx.createOscillator();
    this._engineSubOsc.type = 'triangle';
    this._engineSubOsc.frequency.setValueAtTime(46, now); // ~750 RPM idle

    const subGain = ctx.createGain();
    subGain.gain.setValueAtTime(0.55, now);
    this._engineSubOsc.connect(subGain);
    subGain.connect(this._engineFilter);

    // 2. Combustion Growl (Sawtooth harmonic for engine teeth)
    this._engineGrowlOsc = ctx.createOscillator();
    this._engineGrowlOsc.type = 'sawtooth';
    this._engineGrowlOsc.frequency.setValueAtTime(92, now);

    const growlGain = ctx.createGain();
    growlGain.gain.setValueAtTime(0.25, now);
    this._engineGrowlOsc.connect(growlGain);
    growlGain.connect(this._engineFilter);

    // 3. Multi-Cylinder Cross-Harmonic
    this._engineHarmonicOsc = ctx.createOscillator();
    this._engineHarmonicOsc.type = 'triangle';
    this._engineHarmonicOsc.frequency.setValueAtTime(138, now);

    const harmonicGain = ctx.createGain();
    harmonicGain.gain.setValueAtTime(0.18, now);
    this._engineHarmonicOsc.connect(harmonicGain);
    harmonicGain.connect(this._engineFilter);

    // 4. LFO for Organic Exhaust Throbbing Pulse
    this._engineLFO = ctx.createOscillator();
    this._engineLFO.type = 'sine';
    this._engineLFO.frequency.setValueAtTime(8, now);

    this._engineLFOGain = ctx.createGain();
    this._engineLFOGain.gain.setValueAtTime(3.5, now);

    this._engineLFO.connect(this._engineLFOGain);
    this._engineLFOGain.connect(this._engineSubOsc.frequency);
    this._engineLFOGain.connect(this._engineGrowlOsc.frequency);

    // 5. Intake Rush / Turbo Air Flow (Pink Noise Layer)
    if (this._noiseBuffer) {
      this._engineTurbineNoise = ctx.createBufferSource();
      this._engineTurbineNoise.buffer = this._noiseBuffer;
      this._engineTurbineNoise.loop = true;

      this._engineTurbineFilter = ctx.createBiquadFilter();
      this._engineTurbineFilter.type = 'bandpass';
      this._engineTurbineFilter.frequency.setValueAtTime(350, now);
      this._engineTurbineFilter.Q.setValueAtTime(2.0, now);

      this._engineTurbineGain = ctx.createGain();
      this._engineTurbineGain.gain.setValueAtTime(0.04, now);

      this._engineTurbineNoise.connect(this._engineTurbineFilter);
      this._engineTurbineFilter.connect(this._engineTurbineGain);
      this._engineTurbineGain.connect(this._engineGain);

      this._engineTurbineNoise.start(now);
    }

    // Connect Engine Submix to Master
    this._engineFilter.connect(this._engineGain);
    this._engineGain.connect(this.masterGain);

    this._engineSubOsc.start(now);
    this._engineGrowlOsc.start(now);
    this._engineHarmonicOsc.start(now);
    this._engineLFO.start(now);
  }

  stopEngine() {
    if (!this._engineRunning || !this.audioCtx) return;
    this._engineRunning = false;

    const ctx = this.audioCtx;
    const now = ctx.currentTime;

    if (this._engineGain) {
      this._engineGain.gain.setValueAtTime(this._engineGain.gain.value, now);
      this._engineGain.gain.linearRampToValueAtTime(0, now + 0.3);
    }

    setTimeout(() => {
      try { this._engineSubOsc?.stop(); } catch (_) {}
      try { this._engineGrowlOsc?.stop(); } catch (_) {}
      try { this._engineHarmonicOsc?.stop(); } catch (_) {}
      try { this._engineLFO?.stop(); } catch (_) {}
      try { this._engineTurbineNoise?.stop(); } catch (_) {}

      this._engineSubOsc = null;
      this._engineGrowlOsc = null;
      this._engineHarmonicOsc = null;
      this._engineFilter = null;
      this._engineGain = null;
      this._engineLFO = null;
      this._engineLFOGain = null;
      this._engineTurbineNoise = null;
      this._engineTurbineFilter = null;
      this._engineTurbineGain = null;
    }, 350);
  }

  /**
   * updateEngine — update RPM, pitch and intake roar based on vehicle speed
   * @param {number} speedKmh 0 - 180 km/h
   */
  updateEngine(speedKmh = 0, isDrifting = false) {
    if (!this._engineRunning || !this.audioCtx) return;
    const ctx = this.audioCtx;
    const now = ctx.currentTime;
    const t = 0.08; // smoothing constant

    // Ratio from idle (0 km/h) to top velocity (160 km/h)
    const ratio = Math.max(0, Math.min(speedKmh / 150, 1.0));

    // Base fundamental: 45 Hz (idle burble) -> 135 Hz (high revs)
    const subFreq = 45 + ratio * 90;
    const growlFreq = subFreq * 2.0;
    const harmonicFreq = subFreq * 3.0;

    this._engineSubOsc.frequency.setTargetAtTime(subFreq, now, t);
    this._engineGrowlOsc.frequency.setTargetAtTime(growlFreq, now, t);
    this._engineHarmonicOsc.frequency.setTargetAtTime(harmonicFreq, now, t);

    // Lowpass filter opens with throttle: 420 Hz -> 2600 Hz
    const filterCutoff = 420 + ratio * 2180;
    this._engineFilter.frequency.setTargetAtTime(filterCutoff, now, t);

    // Overall engine loudness swells with speed
    const engineVol = 0.18 + ratio * 0.16;
    this._engineGain.gain.setTargetAtTime(engineVol, now, t);

    // LFO frequency rises with RPM
    this._engineLFO.frequency.setTargetAtTime(8 + ratio * 16, now, t);

    // Turbo air intake & speed rush noise
    if (this._engineTurbineGain && this._engineTurbineFilter) {
      const airCutoff = 400 + ratio * 2800;
      const airVol = 0.03 + ratio * 0.18;
      this._engineTurbineFilter.frequency.setTargetAtTime(airCutoff, now, t);
      this._engineTurbineGain.gain.setTargetAtTime(airVol, now, t);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // MULTI-TIER NITRO BOOST SOUND EFFECT
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * playBoostSound — cinematic rocket thruster ignition
   * @param {number} level 1 (Turbo), 2 (Twin Nitro), 3 (Hyper Overdrive)
   */
  playBoostSound(level = 1) {
    this._ensureInit();
    if (!this.audioCtx) return;
    const ctx = this.audioCtx;
    const now = ctx.currentTime;

    const pitchMultiplier = level === 3 ? 1.4 : (level === 2 ? 1.2 : 1.0);
    const volumeMultiplier = level === 3 ? 1.3 : (level === 2 ? 1.15 : 1.0);

    // 1. Heavy Sub-Bass Ignition Thump
    const subBoom = ctx.createOscillator();
    subBoom.type = 'sine';
    subBoom.frequency.setValueAtTime(85 * pitchMultiplier, now);
    subBoom.frequency.exponentialRampToValueAtTime(32, now + 0.35);

    const boomGain = ctx.createGain();
    boomGain.gain.setValueAtTime(0.55 * volumeMultiplier, now);
    boomGain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

    subBoom.connect(boomGain);
    boomGain.connect(this.masterGain);
    subBoom.start(now);
    subBoom.stop(now + 0.5);

    // 2. High-Pressure Resonant Flame Rush (Swept Jet Noise)
    if (this._noiseBuffer) {
      const noiseSrc = ctx.createBufferSource();
      noiseSrc.buffer = this._noiseBuffer;

      const bandpass = ctx.createBiquadFilter();
      bandpass.type = 'bandpass';
      bandpass.Q.setValueAtTime(level === 3 ? 4.5 : 3.2, now);
      bandpass.frequency.setValueAtTime(320, now);
      bandpass.frequency.exponentialRampToValueAtTime(2600 * pitchMultiplier, now + 0.25);
      bandpass.frequency.exponentialRampToValueAtTime(850, now + 1.2);

      const noiseGain = ctx.createGain();
      noiseGain.gain.setValueAtTime(0.01, now);
      noiseGain.gain.linearRampToValueAtTime(0.42 * volumeMultiplier, now + 0.12);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 1.3);

      noiseSrc.connect(bandpass);
      bandpass.connect(noiseGain);
      noiseGain.connect(this.masterGain);

      noiseSrc.start(now);
      noiseSrc.stop(now + 1.4);
    }

    // 3. Sci-Fi Turbine Whine / Plasma Overdrive
    const whine = ctx.createOscillator();
    whine.type = 'triangle';
    whine.frequency.setValueAtTime(220, now);
    whine.frequency.exponentialRampToValueAtTime(780 * pitchMultiplier, now + 0.35);
    whine.frequency.exponentialRampToValueAtTime(340, now + 1.1);

    const whineGain = ctx.createGain();
    whineGain.gain.setValueAtTime(0.0, now);
    whineGain.gain.linearRampToValueAtTime(0.22 * volumeMultiplier, now + 0.1);
    whineGain.gain.exponentialRampToValueAtTime(0.001, now + 1.1);

    whine.connect(whineGain);
    whineGain.connect(this.masterGain);
    whine.start(now);
    whine.stop(now + 1.2);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // SHIMMERING CHIMES & VICTORY FANFARES
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * playSentenceComplete — uplifting crystalline bell chord (Major 9th shimmer)
   */
  playSentenceComplete() {
    this._ensureInit();
    if (!this.audioCtx) return;
    const ctx = this.audioCtx;
    const now = ctx.currentTime;

    // Harmonious bell frequencies: E5 (659Hz), G#5 (830Hz), B5 (987Hz), D#6 (1244Hz)
    const freqs = [659.25, 830.61, 987.77, 1244.51];

    freqs.forEach((freq, idx) => {
      const startTime = now + idx * 0.045;
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startTime);

      // Subtle FM vibrato
      const mod = ctx.createOscillator();
      mod.type = 'sine';
      mod.frequency.setValueAtTime(14, startTime);
      const modGain = ctx.createGain();
      modGain.gain.setValueAtTime(4.0, startTime);
      mod.connect(modGain);
      modGain.connect(osc.frequency);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.0, startTime);
      gain.gain.linearRampToValueAtTime(0.18, startTime + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.42);

      osc.connect(gain);
      gain.connect(this.masterGain);

      mod.start(startTime);
      osc.start(startTime);
      mod.stop(startTime + 0.45);
      osc.stop(startTime + 0.45);
    });
  }

  /**
   * playLapComplete — triumphant fanfare arpeggio
   */
  playLapComplete() {
    this._ensureInit();
    if (!this.audioCtx) return;
    const ctx = this.audioCtx;
    const now = ctx.currentTime;

    // Victory flourish: C5, E5, G5, C6 (ascending with brass-like harmonics)
    const notes = [523.25, 659.25, 783.99, 1046.50];

    notes.forEach((freq, i) => {
      const start = now + i * 0.10;
      const duration = i === notes.length - 1 ? 0.75 : 0.22;

      const osc = ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, start);

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(freq * 3.5, start);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.35, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, start + duration);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);

      osc.start(start);
      osc.stop(start + duration + 0.02);
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // COUNTDOWN BEEPS
  // ─────────────────────────────────────────────────────────────────────────

  playCountdownBeep(isGo = false) {
    this._ensureInit();
    if (!this.audioCtx) return;
    const ctx = this.audioCtx;
    const now = ctx.currentTime;

    const freq = isGo ? 987.77 : 587.33; // B5 for GO!, D5 for Ready
    const duration = isGo ? 0.28 : 0.12;

    const osc = ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, now);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(isGo ? 0.45 : 0.28, now + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // TIRE SCREECH & DRIFT
  // ─────────────────────────────────────────────────────────────────────────

  playTireScreech() {
    this._ensureInit();
    if (this._screechRunning || !this.audioCtx || !this._noiseBuffer) return;
    this._screechRunning = true;

    if (this._screechFadeTimeout) {
      clearTimeout(this._screechFadeTimeout);
      this._screechFadeTimeout = null;
    }

    const ctx = this.audioCtx;
    const now = ctx.currentTime;

    this._screechFilter = ctx.createBiquadFilter();
    this._screechFilter.type = 'bandpass';
    this._screechFilter.frequency.setValueAtTime(2400, now);
    this._screechFilter.Q.setValueAtTime(3.2, now);

    this._screechGain = ctx.createGain();
    this._screechGain.gain.setValueAtTime(0, now);
    this._screechGain.gain.linearRampToValueAtTime(0.28, now + 0.12);

    this._screechSource = ctx.createBufferSource();
    this._screechSource.buffer = this._noiseBuffer;
    this._screechSource.loop = true;

    this._screechSource.connect(this._screechFilter);
    this._screechFilter.connect(this._screechGain);
    this._screechGain.connect(this.masterGain);

    this._screechSource.start(now);
  }

  stopTireScreech() {
    if (!this._screechRunning || !this.audioCtx) return;
    this._screechRunning = false;

    const ctx = this.audioCtx;
    const now = ctx.currentTime;

    if (this._screechGain) {
      this._screechGain.gain.setValueAtTime(this._screechGain.gain.value, now);
      this._screechGain.gain.linearRampToValueAtTime(0, now + 0.15);
    }

    this._screechFadeTimeout = setTimeout(() => {
      try { this._screechSource?.stop(); } catch (_) {}
      this._screechSource = null;
      this._screechGain = null;
      this._screechFilter = null;
      this._screechFadeTimeout = null;
    }, 180);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // MUTE & VOLUME CONTROLS
  // ─────────────────────────────────────────────────────────────────────────

  setMuted(muted) {
    this._muted = muted;
    if (!this.masterGain || !this.audioCtx) return;
    const now = this.audioCtx.currentTime;
    this.masterGain.gain.setTargetAtTime(muted ? 0 : this._volume, now, 0.05);
  }

  toggleMute() {
    this.setMuted(!this._muted);
    return this._muted;
  }

  get isMuted() {
    return this._muted;
  }

  // Legacy stubs for backwards compatibility
  startMusic() {}
  stopMusic() {}
  playCollision() {}
}

function THREE_MathUtils_rand(min, max) {
  return min + Math.random() * (max - min);
}
