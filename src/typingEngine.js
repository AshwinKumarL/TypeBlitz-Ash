/**
 * typingEngine.js
 * Core typing engine for Type To Drive.
 * Generates dynamic random words for each race (~55 words, ~320 chars).
 * Tracks clean typing streaks (1-3 words fast without errors) to trigger NITRO BOOST.
 */

export const RANDOM_WORD_POOL = [
  'car', 'fast', 'run', 'go', 'race', 'red', 'hot', 'win', 'top', 'blue',
  'fly', 'road', 'key', 'gear', 'shift', 'gas', 'rev', 'fuel', 'dash', 'push',
  'turn', 'lap', 'spin', 'track', 'tire', 'drift', 'apex', 'flow', 'line', 'move',
  'cool', 'beat', 'lead', 'pace', 'ride', 'neon', 'gold', 'burn', 'jump', 'play',
  'easy', 'good', 'open', 'wide', 'fine', 'best', 'quick', 'fire', 'spark', 'blaze',
  'zoom', 'rush', 'boost', 'turbo', 'speed', 'drive', 'swift', 'clean', 'power', 'motor',
  'grip', 'pass', 'high', 'flash', 'star', 'tap', 'roll', 'time', 'air', 'fan',
  'cool', 'bold', 'safe', 'rank', 'glow', 'beam', 'dash', 'wind', 'lane', 'flag'
];

export const TYPING_PASSAGES = [
  "The road ahead is open and clear accelerate with every key you press keep your eyes on the horizon fast fingers make fast engines run down the highway precision and rhythm build true velocity.",
  "Sunlight breaks across the long straightaway while four powerful supercars line up side by side your hands rest firmly on the controls ready to unleash maximum acceleration with swift typing.",
];

export function generateRandomPassage(wordCount = 55) {
  const chosen = [];
  let lastWord = '';
  for (let i = 0; i < wordCount; i++) {
    let word;
    do {
      word = RANDOM_WORD_POOL[Math.floor(Math.random() * RANDOM_WORD_POOL.length)];
    } while (word === lastWord && RANDOM_WORD_POOL.length > 1);
    chosen.push(word);
    lastWord = word;
  }
  return chosen.join(' ');
}

export class TypingEngine {
  constructor(initialText = null) {
    if (Array.isArray(initialText)) {
      this.passages = initialText;
      this.currentSentenceIndex = 0;
      this.currentSentence = this.passages[0] || generateRandomPassage(55);
    } else if (typeof initialText === 'string') {
      this.passages = [initialText];
      this.currentSentenceIndex = 0;
      this.currentSentence = initialText;
    } else {
      this.passages = null;
      this.currentSentenceIndex = 0;
      this.currentSentence = generateRandomPassage(55);
    }
    this.charIndex = 0;
    this.sentencesCompleted = 0;
    this.isActive = false;

    // Word tracking
    this.totalWords = this._countWords(this.currentSentence);
    this.wordsTyped = 0;
    this.isFinished = false;

    // Streak & Multi-Level Nitro Boost Tracking
    this.cleanWordStreak = 0;
    this.currentWordStartTime = null;
    this.currentWordErrors = 0;
    this.lastBoostTime = 0;
    this.lastBoostLevel = 0;

    // Callbacks
    this.onCorrectKey = null;
    this.onIncorrectKey = null;
    this.onSentenceComplete = null;
    this.onFinish = null;
    this.onFirstKey = null;
    this.onBoostTriggered = null;

    this._boundKeyHandler = this._handleKeyDown.bind(this);
    this._listening = false;
  }

  _countWords(str) {
    if (!str) return 0;
    return str.trim().split(/\s+/).filter(Boolean).length;
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

  reset(customText = null) {
    this.currentSentence = customText || generateRandomPassage(55);
    this.charIndex = 0;
    this.sentencesCompleted = 0;
    this.totalWords = this._countWords(this.currentSentence);
    this.wordsTyped = 0;
    this.isFinished = false;
    this.cleanWordStreak = 0;
    this.currentWordStartTime = null;
    this.currentWordErrors = 0;
    this.lastBoostTime = 0;
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

  getCompletionRatio() {
    if (!this.currentSentence || this.currentSentence.length === 0) return 0;
    return Math.min(1.0, this.charIndex / this.currentSentence.length);
  }

  getProgress() {
    return {
      charIndex: this.charIndex,
      totalChars: this.currentSentence.length,
      ratio: this.getCompletionRatio(),
      wordsTyped: this.wordsTyped,
      totalWords: this.totalWords,
      isFinished: this.isFinished,
      cleanWordStreak: this.cleanWordStreak,
    };
  }

  // -------------------------------------------------------------------------
  // Process Single Keystroke
  // -------------------------------------------------------------------------
  processKey(key, nowMs = (typeof performance !== 'undefined' ? performance.now() : Date.now())) {
    if (!this.isActive || this.isFinished) return null;

    if (this._isIgnoredKey(key)) return null;

    const expected = this.getExpectedChar();
    if (expected === null) return null;

    if (this.currentWordStartTime === null) {
      this.currentWordStartTime = nowMs;
    }

    const isCorrect = (key === expected);

    if (isCorrect) {
      const wasSpace = (expected === ' ');
      this.charIndex++;

      // When finishing a word (hitting space) or finishing the last word
      const isWordEnd = wasSpace || (this.charIndex >= this.currentSentence.length);

      if (isWordEnd) {
        this._recalculateWordsTyped();

        const wordDuration = Math.max(100, nowMs - (this.currentWordStartTime || nowMs));
        const wordLength = wasSpace ? 5 : Math.max(1, this.currentSentence.length - (this.currentSentence.lastIndexOf(' ') + 1));
        const wordWpm = (wordLength / 5) / (wordDuration / 60000);

        if (this.currentWordErrors === 0) {
          // Perfectly typed word without error!
          this.cleanWordStreak++;

          // Multi-Tier Nitro Boost:
          // Level 1: 2 clean words -> Turbo Charge (+24 km/h)
          // Level 2: 4 clean words -> Twin Nitro Surge (+38 km/h)
          // Level 3: 6+ clean words -> Hyper Overdrive (+55 km/h)
          let level = 0;
          let speedBonus = 0;
          let durationSec = 0;

          if (this.cleanWordStreak >= 6) {
            level = 3;
            speedBonus = 55;
            durationSec = 4.2;
          } else if (this.cleanWordStreak >= 4) {
            level = 2;
            speedBonus = 38;
            durationSec = 3.5;
          } else if (this.cleanWordStreak >= 2) {
            level = 1;
            speedBonus = 24;
            durationSec = 2.8;
          }

          if (level > 0 && (nowMs - this.lastBoostTime > 1800 || level > this.lastBoostLevel)) {
            this.lastBoostTime = nowMs;
            this.lastBoostLevel = level;
            if (typeof this.onBoostTriggered === 'function') {
              this.onBoostTriggered({
                level,
                streak: this.cleanWordStreak,
                wordWpm: Math.round(wordWpm),
                speedBonus,
                durationSec,
              });
            }
          }
        } else {
          this.cleanWordStreak = 0;
          this.lastBoostLevel = 0;
        }

        // Reset for next word
        this.currentWordStartTime = nowMs;
        this.currentWordErrors = 0;
      }

      if (typeof this.onCorrectKey === 'function') {
        this.onCorrectKey(key, this.charIndex, nowMs);
      }

      // Check if sentence/passage is finished
      if (this.charIndex >= this.currentSentence.length) {
        this.sentencesCompleted++;
        const completed = this.currentSentence;

        if (this.passages && this.currentSentenceIndex < this.passages.length - 1) {
          this.currentSentenceIndex++;
          this.currentSentence = this.passages[this.currentSentenceIndex];
          this.charIndex = 0;
          this.isFinished = false;

          if (typeof this.onSentenceComplete === 'function') {
            this.onSentenceComplete(completed, this.currentSentence, this.sentencesCompleted, nowMs);
          }
        } else if (!this.passages && !this.isRaceMode) {
          // Continuous multi-sentence mode
          this.currentSentence = generateRandomPassage(55);
          this.charIndex = 0;
          this.isFinished = false;

          if (typeof this.onSentenceComplete === 'function') {
            this.onSentenceComplete(completed, this.currentSentence, this.sentencesCompleted, nowMs);
          }
        } else {
          this.wordsTyped = this.totalWords;
          this.isFinished = true;

          if (typeof this.onSentenceComplete === 'function') {
            this.onSentenceComplete(completed, this.currentSentence, this.sentencesCompleted, nowMs);
          }

          if (typeof this.onFinish === 'function') {
            this.onFinish({
              wordsTyped: this.wordsTyped,
              totalWords: this.totalWords,
              totalChars: this.currentSentence.length,
              nowMs
            });
          }
        }
      }

      return { isCorrect: true, key, charIndex: this.charIndex, isFinished: this.isFinished };
    } else {
      // Keystroke Error
      this.currentWordErrors++;
      this.cleanWordStreak = 0; // Break clean streak on error
      this.lastBoostLevel = 0;

      if (typeof this.onIncorrectKey === 'function') {
        this.onIncorrectKey(expected, key, this.charIndex, nowMs);
      }
      return { isCorrect: false, key, expected, charIndex: this.charIndex };
    }
  }

  _recalculateWordsTyped() {
    if (this.isFinished) {
      this.wordsTyped = this.totalWords;
      return;
    }
    const typedText = this.currentSentence.slice(0, this.charIndex);
    const matches = typedText.match(/\S+/g);
    if (typedText.endsWith(' ')) {
      this.wordsTyped = matches ? matches.length : 0;
    } else {
      this.wordsTyped = matches && matches.length > 1 ? matches.length - 1 : 0;
    }
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
    if (!this.isActive || this.isFinished) return;

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
