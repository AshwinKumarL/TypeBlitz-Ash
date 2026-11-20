/**
 * typingEngine.js
 * Core typing engine for Type To Drive.
 * Handles sentence progression, real-time character matching, accuracy,
 * and reliable keyboard event capture.
 */

export const TYPING_PASSAGES = [
  "The road ahead is open and clear.",
  "Accelerate with every key you press.",
  "Keep your eyes on the horizon.",
  "Fast fingers make fast engines run down the highway.",
  "Precision and rhythm build true velocity.",
  "The car glides through the green meadows.",
  "Every word you finish pushes the speedometer higher.",
  "Smooth typing maintains your momentum along the asphalt.",
  "Watch the road markers fly past as your speed climbs.",
  "Breathe steadily and let your muscle memory take control.",
  "The engine roars when you type without hesitation.",
  "Clear thoughts lead to clean keystrokes and rapid speed.",
  "Sunlight gleams across the hood of your vintage car.",
  "A steady cadence keeps the wheels spinning fast.",
  "Push past your limits and set a new personal record.",
  "Focus on accuracy first and high speed will follow naturally.",
  "The endless highway stretches forward into the bright blue sky.",
  "Rhythm is the secret to sustaining top gear across miles of road.",
  "Each correct letter injects fresh fuel directly into the motor.",
  "Stay calm through tricky punctuation and keep your pace steady.",
  "Driving through the valley surrounded by tall pine trees and hills.",
  "Your fingertips are the throttle that powers this machine.",
  "Maintain your focus as the wind streaks past your windshield.",
  "Quick reflexes turn simple thoughts into incredible horsepower.",
  "The tires grip the straight dark asphalt with pure confidence.",
  "Never look down at the keyboard when the road is calling you.",
  "Peak performance is achieved when fingers and mind move as one.",
  "Feel the thrilling surge of speed as you complete another sentence.",
  "Miles vanish in moments when you enter a state of deep flow.",
  "The ultimate drive requires flawless concentration from start to finish."
];

export class TypingEngine {
  constructor(passages = TYPING_PASSAGES) {
    this.passages = [...passages];
    this.currentSentenceIndex = 0;
    this.currentSentence = this.passages[0];
    this.charIndex = 0;
    this.sentencesCompleted = 0;
    this.isActive = false;

    // Callbacks
    this.onCorrectKey = null;
    this.onIncorrectKey = null;
    this.onSentenceComplete = null;
    this.onFirstKey = null;

    this._boundKeyHandler = this._handleKeyDown.bind(this);
    this._listening = false;
  }

  startListening() {
    if (this._listening || typeof window === 'undefined') return;
    window.addEventListener('keydown', this._boundKeyHandler);
    this._listening = true;
  }

  stopListening() {
    if (!this._listening || typeof window === 'undefined') return;
    window.removeEventListener('keydown', this._boundKeyHandler);
    this._listening = false;
  }

  setActive(active) {
    this.isActive = active;
  }

  reset() {
    this.currentSentenceIndex = 0;
    this.currentSentence = this.passages[0];
    this.charIndex = 0;
    this.sentencesCompleted = 0;
  }

  getCurrentSentence() {
    return this.currentSentence;
  }

  getCharIndex() {
    return this.charIndex;
  }

  getExpectedChar() {
    if (this.charIndex >= this.currentSentence.length) return null;
    return this.currentSentence[this.charIndex];
  }

  getProgress() {
    return {
      charIndex: this.charIndex,
      totalChars: this.currentSentence.length,
      ratio: this.currentSentence.length > 0 ? this.charIndex / this.currentSentence.length : 0,
      sentencesCompleted: this.sentencesCompleted,
    };
  }

  // -------------------------------------------------------------------------
  // Process Single Keystroke (Used by keyboard listener and tests)
  // -------------------------------------------------------------------------
  processKey(key, nowMs = (typeof performance !== 'undefined' ? performance.now() : Date.now())) {
    if (!this.isActive) return null;

    // Ignore modifier and navigation keys
    if (this._isIgnoredKey(key)) return null;

    const expected = this.getExpectedChar();
    if (expected === null) return null;

    const isCorrect = (key === expected);

    if (isCorrect) {
      this.charIndex++;
      if (typeof this.onCorrectKey === 'function') {
        this.onCorrectKey(key, this.charIndex, nowMs);
      }

      // Check sentence completion
      if (this.charIndex >= this.currentSentence.length) {
        const completed = this.currentSentence;
        this.sentencesCompleted++;
        this._advanceToNextSentence();
        if (typeof this.onSentenceComplete === 'function') {
          this.onSentenceComplete(completed, this.currentSentence, this.sentencesCompleted, nowMs);
        }
      }

      return { isCorrect: true, key, charIndex: this.charIndex };
    } else {
      if (typeof this.onIncorrectKey === 'function') {
        this.onIncorrectKey(expected, key, this.charIndex, nowMs);
      }
      return { isCorrect: false, key, expected, charIndex: this.charIndex };
    }
  }

  _advanceToNextSentence() {
    this.currentSentenceIndex = (this.currentSentenceIndex + 1) % this.passages.length;
    this.currentSentence = this.passages[this.currentSentenceIndex];
    this.charIndex = 0;
  }

  _isIgnoredKey(key) {
    const ignored = [
      'Shift', 'Control', 'Alt', 'Meta', 'CapsLock',
      'Tab', 'Escape', 'Enter',
      'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
      'Home', 'End', 'PageUp', 'PageDown',
      'Insert', 'Delete', 'Backspace',
      'F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9', 'F10', 'F11', 'F12',
    ];
    return ignored.includes(key);
  }

  _handleKeyDown(event) {
    if (!this.isActive) return;

    // Prevent spacebar or other typing keys from scrolling the webpage
    if (event.key === ' ' || event.key === 'Tab') {
      event.preventDefault();
    }

    if (typeof this.onFirstKey === 'function') {
      this.onFirstKey(event.key);
    }

    this.processKey(event.key);
  }

  destroy() {
    this.stopListening();
  }
}
