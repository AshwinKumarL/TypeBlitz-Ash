/**
 * wpmCalculator.js
 * Rolling-window and session WPM calculation, typing accuracy tracking,
 * and WPM-to-speed conversion for Type To Drive.
 */

// ---------------------------------------------------------------------------
// WPM TO VEHICLE SPEED (KM/H) MAPPING
// ---------------------------------------------------------------------------
// Standard targets:
// 0 WPM = 0 KM/H
// 20 WPM = 25 KM/H
// 40 WPM = 50 KM/H
// 60 WPM = 85 KM/H
// 80 WPM = 120 KM/H
// 100 WPM = 160 KM/H
// 120+ WPM = 195+ KM/H
const SPEED_MAP_POINTS = [
  { wpm: 0, kmh: 0 },
  { wpm: 20, kmh: 25 },
  { wpm: 40, kmh: 50 },
  { wpm: 60, kmh: 85 },
  { wpm: 80, kmh: 120 },
  { wpm: 100, kmh: 160 },
  { wpm: 120, kmh: 195 },
];

export function wpmToTargetKmh(wpm) {
  if (!wpm || wpm <= 0) return 0;

  for (let i = 0; i < SPEED_MAP_POINTS.length - 1; i++) {
    const p1 = SPEED_MAP_POINTS[i];
    const p2 = SPEED_MAP_POINTS[i + 1];
    if (wpm >= p1.wpm && wpm <= p2.wpm) {
      const t = (wpm - p1.wpm) / (p2.wpm - p1.wpm);
      return p1.kmh + t * (p2.kmh - p1.kmh);
    }
  }

  // Beyond 120 WPM: smoothly scale
  const last = SPEED_MAP_POINTS[SPEED_MAP_POINTS.length - 1];
  return last.kmh + (wpm - last.wpm) * 1.5;
}

export class WPMCalculator {
  constructor(windowSeconds = 3.5) {
    this.windowSeconds = windowSeconds;
    this.keystrokes = []; // Timestamps of correct keystrokes
    this.totalCorrectChars = 0;
    this.totalAttemptedChars = 0;
    this.sessionStartTime = null;
    this.lastKeystrokeTime = 0;
    this.peakWpm = 0;
  }

  start(nowMs = (typeof performance !== 'undefined' ? performance.now() : Date.now())) {
    this.sessionStartTime = nowMs;
    this.lastKeystrokeTime = nowMs;
    this.keystrokes = [];
    this.totalCorrectChars = 0;
    this.totalAttemptedChars = 0;
    this.peakWpm = 0;
  }

  recordKeystroke(isCorrect, nowMs = (typeof performance !== 'undefined' ? performance.now() : Date.now())) {
    this.totalAttemptedChars++;
    this.lastKeystrokeTime = nowMs;

    if (!this.sessionStartTime) {
      this.sessionStartTime = nowMs;
    }

    if (isCorrect) {
      this.totalCorrectChars++;
      this.keystrokes.push(nowMs);
    }
  }

  getLiveWpm(nowMs = (typeof performance !== 'undefined' ? performance.now() : Date.now())) {
    if (this.keystrokes.length === 0) return 0;

    // Prune keystrokes older than the rolling window
    const cutoff = nowMs - this.windowSeconds * 1000;
    while (this.keystrokes.length > 0 && this.keystrokes[0] < cutoff) {
      this.keystrokes.shift();
    }

    if (this.keystrokes.length === 0) return 0;

    // Standard formula: WPM = (correct_chars / 5) / (window_duration_in_minutes)
    const words = this.keystrokes.length / 5.0;
    const minutes = this.windowSeconds / 60.0;
    let wpm = words / minutes;

    // Momentum decay when typing stops:
    // If user stops typing for > 0.5s, smoothly decay the speed over ~2.0 seconds
    const idleTimeSec = Math.max(0, (nowMs - this.lastKeystrokeTime) / 1000);
    if (idleTimeSec > 0.5) {
      const decayRatio = Math.max(0, 1.0 - (idleTimeSec - 0.5) / 2.0);
      wpm *= decayRatio;
    }

    if (wpm > this.peakWpm) {
      this.peakWpm = wpm;
    }

    return Math.max(0, wpm);
  }

  getAverageWpm(nowMs = (typeof performance !== 'undefined' ? performance.now() : Date.now())) {
    if (!this.sessionStartTime || this.totalCorrectChars === 0) return 0;
    const elapsedMinutes = Math.max(0.01, (nowMs - this.sessionStartTime) / 60000);
    return (this.totalCorrectChars / 5.0) / elapsedMinutes;
  }

  getAccuracy() {
    if (this.totalAttemptedChars === 0) return 100;
    return (this.totalCorrectChars / this.totalAttemptedChars) * 100;
  }

  getPeakWpm() {
    return this.peakWpm;
  }

  reset() {
    this.keystrokes = [];
    this.totalCorrectChars = 0;
    this.totalAttemptedChars = 0;
    this.sessionStartTime = null;
    this.lastKeystrokeTime = 0;
    this.peakWpm = 0;
  }
}
