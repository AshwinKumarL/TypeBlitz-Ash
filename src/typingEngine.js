/**
 * typingEngine.js
 * Core typing engine for Type To Drive.
 * Configured with ~55-60 word (~320-350 char) 1-minute typing test passages.
 * Tracks wordsTyped, totalWords, completionRatio, and finishes when all words are typed.
 */

export const TYPING_PASSAGES = [
  "The morning mist clings to the wide asphalt highway as your engine begins to roar with raw mechanical power. Every precise keystroke feeds clean fuel into the combustion chambers, propelling your machine forward into the open horizon. Focus your mind, find a smooth driving cadence, and accelerate past rival cars to claim victory at the finish line.",
  "Sunlight breaks across the long desert straightaway while four powerful supercars line up side by side. Your hands rest firmly on the controls, ready to unleash maximum acceleration with swift and flawless typing. Keep your eyes on the road ahead, maintain rhythm through every phrase, and cross the checkered finish line in first place.",
  "High speed racing demands absolute precision and unshakable concentration under intense competitive pressure. As the digital speedometer climbs past one hundred miles per hour, each typed word pushes your vehicle ahead of the chasing pack. Breathe steadily, lock into the flow state, and drive with unwavering determination until the race is won."
];

export class TypingEngine {
  constructor(passages = TYPING_PASSAGES) {
    this.passages = [...passages];
    this.currentSentenceIndex = 0;
    this.currentSentence = this.passages[0];
    this.charIndex = 0;
    this.sentencesCompleted = 0;
    this.isActive = false;

    // Word tracking
    this.totalWords = this._countWords(this.currentSentence);
    this.wordsTyped = 0;
    this.isFinished = false;

    // Callbacks
    this.onCorrectKey = null;
    this.onIncorrectKey = null;
    this.onSentenceComplete = null;
    this.onFinish = null;
    this.onFirstKey = null;

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

  reset(passageIndex = null) {
    if (passageIndex !== null && passageIndex >= 0 && passageIndex < this.passages.length) {
      this.currentSentenceIndex = passageIndex;
    } else {
      this.currentSentenceIndex = (this.currentSentenceIndex) % this.passages.length;
    }
    this.currentSentence = this.passages[this.currentSentenceIndex];
    this.charIndex = 0;
    this.sentencesCompleted = 0;
    this.totalWords = this._countWords(this.currentSentence);
    this.wordsTyped = 0;
    this.isFinished = false;
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
      sentencesCompleted: this.sentencesCompleted,
    };
  }

  // -------------------------------------------------------------------------
  // Process Single Keystroke (Used by keyboard listener and tests)
  // -------------------------------------------------------------------------
  processKey(key, nowMs = (typeof performance !== 'undefined' ? performance.now() : Date.now())) {
    if (!this.isActive || this.isFinished) return null;

    // Ignore modifier and navigation keys
    if (this._isIgnoredKey(key)) return null;

    const expected = this.getExpectedChar();
    if (expected === null) return null;

    const isCorrect = (key === expected);

    if (isCorrect) {
      const wasSpace = (expected === ' ');
      this.charIndex++;

      // Update words completed
      if (wasSpace) {
        this._recalculateWordsTyped();
      }

      if (typeof this.onCorrectKey === 'function') {
        this.onCorrectKey(key, this.charIndex, nowMs);
      }

      // Check if entire passage is finished
      if (this.charIndex >= this.currentSentence.length) {
        this.wordsTyped = this.totalWords;
        this.isFinished = true;
        this.sentencesCompleted++;
        const completed = this.currentSentence;

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

      return { isCorrect: true, key, charIndex: this.charIndex, isFinished: this.isFinished };
    } else {
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
    // Count completed words (delimited by spaces)
    const matches = typedText.match(/\S+/g);
    // If the char at charIndex - 1 is a space, the last word was fully completed
    if (typedText.endsWith(' ')) {
      this.wordsTyped = matches ? matches.length : 0;
    } else {
      // Still typing a word
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
