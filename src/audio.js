/**
 * audio.js — Procedural audio system for LowPly Type Driver
 * All sounds generated via Web Audio API (no external files).
 */

export class AudioManager {
  constructor() {
    this.audioCtx = null;
    this.masterGain = null;

    // Engine nodes
    this._engineOsc1 = null;
    this._engineOsc2 = null;
    this._engineFilter = null;
    this._engineGain = null;
    this._engineLFO = null;
    this._engineLFOGain = null;
    this._engineRunning = false;

    // Tire screech nodes
    this._screechSource = null;
    this._screechGain = null;
    this._screechFilter = null;
    this._screechBuffer = null;
    this._screechRunning = false;
    this._screechFadeTimeout = null;

    // Music state
    this._musicTimeout = null;
    this._musicNodes = [];
    this._musicRunning = false;

    // Mute state
    this._muted = false;
    this._savedGain = 1.0;

    // Noise buffer (shared)
    this._noiseBuffer = null;
  }

  // ─────────────────────────────────────────────
  // INIT
  // ─────────────────────────────────────────────

  init() {
    if (this.audioCtx) {
      // Resume if suspended (browser autoplay policy)
      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }
      return;
    }

    this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();

    // Master gain → destination
    this.masterGain = this.audioCtx.createGain();
    this.masterGain.gain.setValueAtTime(this._muted ? 0 : 1, this.audioCtx.currentTime);
    this.masterGain.connect(this.audioCtx.destination);

    // Build shared noise buffer (2 seconds of white noise)
    this._noiseBuffer = this._createNoiseBuffer(2);
  }

  // ─────────────────────────────────────────────
  // HELPERS
  // ─────────────────────────────────────────────

  _ensureInit() {
    if (!this.audioCtx) this.init();
    if (this.audioCtx.state === 'suspended') this.audioCtx.resume();
  }

  _createNoiseBuffer(durationSeconds = 2) {
    const ctx = this.audioCtx;
    const sampleRate = ctx.sampleRate;
    const length = sampleRate * durationSeconds;
    const buffer = ctx.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    return buffer;
  }

  // ─────────────────────────────────────────────
  // ENGINE SOUND
  // ─────────────────────────────────────────────

  startEngine() {
    this._ensureInit();
    if (this._engineRunning) return;
    this._engineRunning = true;

    const ctx = this.audioCtx;
    const now = ctx.currentTime;

    // Engine gain envelope node
    this._engineGain = ctx.createGain();
    this._engineGain.gain.setValueAtTime(0, now);
    this._engineGain.gain.linearRampToValueAtTime(0.18, now + 0.3);

    // Lowpass filter to shape timbre
    this._engineFilter = ctx.createBiquadFilter();
    this._engineFilter.type = 'lowpass';
    this._engineFilter.frequency.setValueAtTime(600, now);
    this._engineFilter.Q.setValueAtTime(1.5, now);

    // Primary oscillator — sawtooth (engine fundamental)
    this._engineOsc1 = ctx.createOscillator();
    this._engineOsc1.type = 'sawtooth';
    this._engineOsc1.frequency.setValueAtTime(80, now);

    // Harmonic oscillator at ~2× frequency, lower gain
    this._engineOsc2 = ctx.createOscillator();
    this._engineOsc2.type = 'sawtooth';
    this._engineOsc2.frequency.setValueAtTime(160, now);
    const osc2Gain = ctx.createGain();
    osc2Gain.gain.setValueAtTime(0.3, now);

    // LFO for subtle pitch wobble (realism)
    this._engineLFO = ctx.createOscillator();
    this._engineLFO.type = 'sine';
    this._engineLFO.frequency.setValueAtTime(6, now); // 6 Hz wobble

    this._engineLFOGain = ctx.createGain();
    this._engineLFOGain.gain.setValueAtTime(2.5, now); // ±2.5 Hz modulation

    // Routing: LFO → osc frequency
    this._engineLFO.connect(this._engineLFOGain);
    this._engineLFOGain.connect(this._engineOsc1.frequency);
    this._engineLFOGain.connect(this._engineOsc2.frequency);

    // Routing: oscs → filter → gain → master
    this._engineOsc1.connect(this._engineFilter);
    this._engineOsc2.connect(osc2Gain);
    osc2Gain.connect(this._engineFilter);
    this._engineFilter.connect(this._engineGain);
    this._engineGain.connect(this.masterGain);

    this._engineOsc1.start(now);
    this._engineOsc2.start(now);
    this._engineLFO.start(now);
  }

  stopEngine() {
    if (!this._engineRunning || !this.audioCtx) return;
    this._engineRunning = false;

    const ctx = this.audioCtx;
    const now = ctx.currentTime;

    this._engineGain.gain.setValueAtTime(this._engineGain.gain.value, now);
    this._engineGain.gain.linearRampToValueAtTime(0, now + 0.4);

    const stop = () => {
      try { this._engineOsc1.stop(); } catch (_) {}
      try { this._engineOsc2.stop(); } catch (_) {}
      try { this._engineLFO.stop(); } catch (_) {}
      this._engineOsc1 = null;
      this._engineOsc2 = null;
      this._engineLFO = null;
      this._engineFilter = null;
      this._engineGain = null;
      this._engineLFOGain = null;
    };
    setTimeout(stop, 450);
  }

  /**
   * updateEngine — call every frame with current speed and drift state.
   * @param {number} speedKmh  0–144 km/h
   * @param {boolean} isDrifting
   */
  updateEngine(speedKmh, isDrifting) {
    if (!this._engineRunning || !this.audioCtx) return;

    const ctx = this.audioCtx;
    const now = ctx.currentTime;
    const t = 0.1; // smoothing time constant

    // Clamp speed to [0, 144] km/h
    const s = Math.max(0, Math.min(speedKmh, 144));
    const ratio = s / 144;

    // Frequency: 80 Hz idle → 400 Hz at max speed
    const baseFreq = 80 + ratio * 320;

    // Slight boost when drifting
    const freq = isDrifting ? baseFreq * 1.08 : baseFreq;

    this._engineOsc1.frequency.setTargetAtTime(freq, now, t);
    this._engineOsc2.frequency.setTargetAtTime(freq * 2, now, t);

    // Volume: idle is quiet, rises with speed
    const vol = 0.08 + ratio * 0.22;
    this._engineGain.gain.setTargetAtTime(vol, now, t);

    // Filter opens up with speed (more harmonics at high speed)
    const filterFreq = 400 + ratio * 2600;
    this._engineFilter.frequency.setTargetAtTime(filterFreq, now, t);

    // LFO speed increases slightly with engine RPM
    this._engineLFO.frequency.setTargetAtTime(5 + ratio * 8, now, t);
  }

  // ─────────────────────────────────────────────
  // TIRE SCREECH
  // ─────────────────────────────────────────────

  playTireScreech() {
    this._ensureInit();
    if (this._screechRunning) return;
    this._screechRunning = true;

    if (this._screechFadeTimeout) {
      clearTimeout(this._screechFadeTimeout);
      this._screechFadeTimeout = null;
    }

    const ctx = this.audioCtx;
    const now = ctx.currentTime;

    // Bandpass filter to get that sharp screech frequency
    this._screechFilter = ctx.createBiquadFilter();
    this._screechFilter.type = 'bandpass';
    this._screechFilter.frequency.setValueAtTime(3000, now);
    this._screechFilter.Q.setValueAtTime(2.5, now);

    // Gain with fade-in
    this._screechGain = ctx.createGain();
    this._screechGain.gain.setValueAtTime(0, now);
    this._screechGain.gain.linearRampToValueAtTime(0.4, now + 0.15);

    // Looping noise source
    this._screechSource = ctx.createBufferSource();
    this._screechSource.buffer = this._noiseBuffer;
    this._screechSource.loop = true;

    // Add a second bandpass layer for richness
    const filter2 = ctx.createBiquadFilter();
    filter2.type = 'bandpass';
    filter2.frequency.setValueAtTime(2200, now);
    filter2.Q.setValueAtTime(3, now);

    this._screechSource.connect(this._screechFilter);
    this._screechSource.connect(filter2);
    this._screechFilter.connect(this._screechGain);
    filter2.connect(this._screechGain);
    this._screechGain.connect(this.masterGain);

    this._screechSource.start(now);
  }

  stopTireScreech() {
    if (!this._screechRunning || !this.audioCtx) return;
    this._screechRunning = false;

    const ctx = this.audioCtx;
    const now = ctx.currentTime;

    this._screechGain.gain.setValueAtTime(this._screechGain.gain.value, now);
    this._screechGain.gain.linearRampToValueAtTime(0, now + 0.2);

    this._screechFadeTimeout = setTimeout(() => {
      try { this._screechSource.stop(); } catch (_) {}
      this._screechSource = null;
      this._screechGain = null;
      this._screechFilter = null;
      this._screechFadeTimeout = null;
    }, 250);
  }

  // ─────────────────────────────────────────────
  // COLLISION SOUND
  // ─────────────────────────────────────────────

  playCollision() {
    this._ensureInit();
    const ctx = this.audioCtx;
    const now = ctx.currentTime;

    // 1. Low-frequency thump (100 Hz oscillator, quick decay)
    const thumpOsc = ctx.createOscillator();
    thumpOsc.type = 'sine';
    thumpOsc.frequency.setValueAtTime(100, now);
    thumpOsc.frequency.exponentialRampToValueAtTime(40, now + 0.15);

    const thumpGain = ctx.createGain();
    thumpGain.gain.setValueAtTime(0.9, now);
    thumpGain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

    thumpOsc.connect(thumpGain);
    thumpGain.connect(this.masterGain);
    thumpOsc.start(now);
    thumpOsc.stop(now + 0.2);

    // 2. Short noise burst (50 ms) for the crunch texture
    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.6, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = 'lowpass';
    noiseFilter.frequency.setValueAtTime(1200, now);

    const noiseSource = ctx.createBufferSource();
    noiseSource.buffer = this._createNoiseBuffer(0.1);
    noiseSource.loop = false;

    noiseSource.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(this.masterGain);
    noiseSource.start(now);
    noiseSource.stop(now + 0.1);
  }

  // ─────────────────────────────────────────────
  // COUNTDOWN BEEPS
  // ─────────────────────────────────────────────

  /**
   * playCountdownBeep
   * @param {boolean} isGo — true for the GO! sound (880 Hz, longer, louder)
   */
  playCountdownBeep(isGo = false) {
    this._ensureInit();
    const ctx = this.audioCtx;
    const now = ctx.currentTime;

    const freq = isGo ? 880 : 440;
    const duration = isGo ? 0.2 : 0.1;
    const peakGain = isGo ? 0.9 : 0.6;

    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now);

    const gain = ctx.createGain();
    // Quick attack
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(peakGain, now + 0.01);
    // Hold then quick release
    gain.gain.setValueAtTime(peakGain, now + duration - 0.02);
    gain.gain.linearRampToValueAtTime(0, now + duration);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + duration + 0.01);
  }

  // ─────────────────────────────────────────────
  // TYPING SOUND EFFECTS
  // ─────────────────────────────────────────────

  playKeyClick() {
    this._ensureInit();
    if (!this.audioCtx) return;
    const ctx = this.audioCtx;
    const now = ctx.currentTime;

    // Short crisp blip (mechanical click)
    const osc = ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(1200 + Math.random() * 300, now);
    osc.frequency.exponentialRampToValueAtTime(300, now + 0.03);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.22, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.035);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.04);
  }

  playKeyError() {
    this._ensureInit();
    if (!this.audioCtx) return;
    const ctx = this.audioCtx;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(180, now);
    osc.frequency.exponentialRampToValueAtTime(110, now + 0.08);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.28, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.1);
  }

  playSentenceComplete() {
    this._ensureInit();
    if (!this.audioCtx) return;
    const ctx = this.audioCtx;
    const now = ctx.currentTime;

    const notes = [523.25, 659.25, 783.99]; // C5, E5, G5
    notes.forEach((freq, i) => {
      const start = now + i * 0.08;
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, start);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.32, start + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.25);

      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(start);
      osc.stop(start + 0.26);
    });
  }

  // ─────────────────────────────────────────────
  // LAP COMPLETE FANFARE
  // ─────────────────────────────────────────────

  playLapComplete() {
    this._ensureInit();
    const ctx = this.audioCtx;
    const now = ctx.currentTime;

    // C-E-G-C ascending arpeggio
    const notes = [262, 330, 392, 524];
    const noteDuration = 0.15;
    const gain = 0.5;

    notes.forEach((freq, i) => {
      const startTime = now + i * noteDuration;
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startTime);

      const noteGain = ctx.createGain();
      noteGain.gain.setValueAtTime(0, startTime);
      noteGain.gain.linearRampToValueAtTime(gain, startTime + 0.01);
      noteGain.gain.setValueAtTime(gain, startTime + noteDuration - 0.03);
      noteGain.gain.linearRampToValueAtTime(0, startTime + noteDuration);

      osc.connect(noteGain);
      noteGain.connect(this.masterGain);
      osc.start(startTime);
      osc.stop(startTime + noteDuration + 0.01);
    });
  }

  // ─────────────────────────────────────────────
  // BACKGROUND MUSIC
  // ─────────────────────────────────────────────

  startMusic() {
    this._ensureInit();
    if (this._musicRunning) return;
    this._musicRunning = true;
    this._scheduleMusic();
  }

  stopMusic() {
    this._musicRunning = false;
    if (this._musicTimeout) {
      clearTimeout(this._musicTimeout);
      this._musicTimeout = null;
    }
    // Stop any active music nodes
    this._musicNodes.forEach(node => {
      try { node.stop(); } catch (_) {}
    });
    this._musicNodes = [];
  }

  _scheduleMusic() {
    if (!this._musicRunning || !this.audioCtx) return;

    const ctx = this.audioCtx;
    const now = ctx.currentTime;

    // Pentatonic scale (A minor pentatonic): A3, C4, D4, E4, G4, A4
    const scale = [220, 262, 294, 330, 392, 440];
    const loopNodes = [];

    // Music gain (low volume — not intrusive)
    const musicGain = ctx.createGain();
    musicGain.gain.setValueAtTime(0.07, now);
    musicGain.connect(this.masterGain);

    // Simple melody pattern (index into scale array)
    // 4 bars × 4 beats — 16 notes
    const melody = [2, 4, 3, 5, 2, 1, 0, 2, 4, 5, 4, 3, 2, 0, 1, 2];
    // Bass line pattern (index into scale array, one octave lower)
    const bass =   [0, 0, 2, 0, 1, 1, 0, 1, 0, 2, 0, 1, 2, 0, 0, 1];

    const bpm = 110;
    const beatDuration = 60 / bpm;
    const totalDuration = melody.length * beatDuration;

    melody.forEach((scaleIdx, beat) => {
      const freq = scale[scaleIdx];
      const beatStart = now + beat * beatDuration;
      const duration = beatDuration * 0.8;

      const osc = ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, beatStart);

      const env = ctx.createGain();
      env.gain.setValueAtTime(0, beatStart);
      env.gain.linearRampToValueAtTime(0.6, beatStart + 0.02);
      env.gain.setValueAtTime(0.4, beatStart + duration * 0.5);
      env.gain.linearRampToValueAtTime(0, beatStart + duration);

      osc.connect(env);
      env.connect(musicGain);
      osc.start(beatStart);
      osc.stop(beatStart + duration + 0.01);
      loopNodes.push(osc);
    });

    // Bass line (sine wave, half-speed — one note per 2 beats)
    bass.forEach((scaleIdx, beat) => {
      if (beat % 2 !== 0) return; // only on even beats
      const freq = scale[scaleIdx] * 0.5; // one octave lower
      const beatStart = now + beat * beatDuration;
      const duration = beatDuration * 1.8;

      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, beatStart);

      const env = ctx.createGain();
      env.gain.setValueAtTime(0, beatStart);
      env.gain.linearRampToValueAtTime(0.9, beatStart + 0.05);
      env.gain.linearRampToValueAtTime(0, beatStart + duration);

      osc.connect(env);
      env.connect(musicGain);
      osc.start(beatStart);
      osc.stop(beatStart + duration + 0.01);
      loopNodes.push(osc);
    });

    // Percussion: soft noise hit on beat 1 and beat 9
    [0, 8].forEach(beat => {
      const beatStart = now + beat * beatDuration;

      const noiseSource = ctx.createBufferSource();
      noiseSource.buffer = this._noiseBuffer;
      noiseSource.loop = false;

      const noiseFilter = ctx.createBiquadFilter();
      noiseFilter.type = 'bandpass';
      noiseFilter.frequency.setValueAtTime(800, beatStart);
      noiseFilter.Q.setValueAtTime(4, beatStart);

      const noiseEnv = ctx.createGain();
      noiseEnv.gain.setValueAtTime(0.25, beatStart);
      noiseEnv.gain.exponentialRampToValueAtTime(0.001, beatStart + 0.08);

      noiseSource.connect(noiseFilter);
      noiseFilter.connect(noiseEnv);
      noiseEnv.connect(musicGain);
      noiseSource.start(beatStart);
      noiseSource.stop(beatStart + 0.1);
      loopNodes.push(noiseSource);
    });

    this._musicNodes = loopNodes;

    // Schedule next loop iteration slightly before this one ends
    const restartDelay = (totalDuration - 0.05) * 1000;
    this._musicTimeout = setTimeout(() => {
      if (this._musicRunning) this._scheduleMusic();
    }, restartDelay);
  }

  // ─────────────────────────────────────────────
  // MUTE CONTROL
  // ─────────────────────────────────────────────

  setMuted(muted) {
    this._muted = muted;
    if (!this.masterGain) return;
    const now = this.audioCtx.currentTime;
    this.masterGain.gain.setTargetAtTime(muted ? 0 : 1, now, 0.05);
  }

  toggleMute() {
    this.setMuted(!this._muted);
    return this._muted;
  }

  get isMuted() {
    return this._muted;
  }
}
