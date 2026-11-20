// ui.js — Modern Type To Drive UI & HUD Controller

const CYAN = '#38bdf8';
const EMERALD = '#10b981';
const RED = '#ef4444';
const BG_PANEL = 'rgba(15, 23, 42, 0.88)';
const FONT_ORBITRON = 'Orbitron, -apple-system, sans-serif';
const FONT_MONO = "'JetBrains Mono', 'Fira Code', 'Consolas', 'Courier New', monospace";

function el(tag, attrs = {}, ...children) {
  const elem = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'style' && typeof v === 'object') {
      Object.assign(elem.style, v);
    } else if (k.startsWith('on') && typeof v === 'function') {
      elem.addEventListener(k.slice(2).toLowerCase(), v);
    } else {
      elem[k] = v;
    }
  }
  for (const child of children) {
    if (typeof child === 'string') {
      elem.appendChild(document.createTextNode(child));
    } else if (child) {
      elem.appendChild(child);
    }
  }
  return elem;
}

export class UIController {
  constructor() {
    this.container = null;

    // HUD Elements
    this.hudRoot = null;
    this.distanceValueEl = null;
    this.timerValueEl = null;

    this.wpmValueEl = null;
    this.accuracyValueEl = null;
    this.sentenceProgressEl = null;
    this.progressBarFillEl = null;

    this.typingContainerEl = null;
    this.typedSpan = null;
    this.cursorSpan = null;
    this.remainingSpan = null;

    this.speedValueEl = null;
    this.speedBarEl = null;

    // Modals
    this.menuOverlay = null;
    this.pauseOverlay = null;
    this.finishOverlay = null;

    // Sound toggle button
    this.soundBtn = null;
    this.isMuted = false;

    // Callbacks
    this.onPlay = null;
    this.onResume = null;
    this.onRestart = null;
    this.onPauseClick = null;
    this.onMuteToggle = null;

    this._init();
  }

  _init() {
    if (typeof document === 'undefined') return;

    this.container = el('div', {
      id: 'ui-root',
      style: {
        position: 'fixed',
        inset: '0',
        pointerEvents: 'none',
        userSelect: 'none',
        fontFamily: FONT_ORBITRON,
        color: '#fff',
        zIndex: '100',
        overflow: 'hidden',
      },
    });

    this._createHUD();
    this._createMenuOverlay();
    this._createPauseOverlay();
    this._createFinishOverlay();

    document.body.appendChild(this.container);
  }

  // -------------------------------------------------------------------------
  // 1. Live Game HUD
  // -------------------------------------------------------------------------
  _createHUD() {
    this.hudRoot = el('div', {
      id: 'hud-root',
      style: {
        position: 'absolute',
        inset: '0',
        display: 'none',
        pointerEvents: 'none',
      },
    });

    // ───────────────────────────────────────────────────────────────────────
    // TOP LEFT: Distance & Challenge Countdown Timer
    // ───────────────────────────────────────────────────────────────────────
    const topLeft = el('div', {
      style: {
        position: 'absolute',
        top: '24px',
        left: '24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
      },
    });

    // Distance Pill
    const distCard = el('div', {
      style: {
        background: BG_PANEL,
        border: '1px solid rgba(255, 255, 255, 0.12)',
        borderRadius: '12px',
        padding: '10px 18px',
        backdropFilter: 'blur(10px)',
        boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
      },
    });
    const distLabel = el('div', {
      textContent: 'DISTANCE',
      style: { fontSize: '11px', color: '#94a3b8', letterSpacing: '1.5px', marginBottom: '2px' },
    });
    this.distanceValueEl = el('div', {
      textContent: '0 M',
      style: { fontSize: '22px', fontWeight: '800', color: '#f8fafc', letterSpacing: '1px' },
    });
    distCard.appendChild(distLabel);
    distCard.appendChild(this.distanceValueEl);

    // Timer Pill (60-second challenge)
    const timerCard = el('div', {
      style: {
        background: BG_PANEL,
        border: '1px solid rgba(255, 255, 255, 0.12)',
        borderRadius: '12px',
        padding: '10px 18px',
        backdropFilter: 'blur(10px)',
        boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
      },
    });
    const timerLabel = el('div', {
      textContent: 'TIME REMAINING',
      style: { fontSize: '11px', color: '#94a3b8', letterSpacing: '1.5px', marginBottom: '2px' },
    });
    this.timerValueEl = el('div', {
      textContent: '60.0s',
      style: { fontSize: '22px', fontWeight: '800', color: CYAN, letterSpacing: '1px' },
    });
    timerCard.appendChild(timerLabel);
    timerCard.appendChild(this.timerValueEl);

    topLeft.appendChild(distCard);
    topLeft.appendChild(timerCard);
    this.hudRoot.appendChild(topLeft);

    // ───────────────────────────────────────────────────────────────────────
    // TOP CENTER: Massive Live WPM, Accuracy, and Sentence Progress
    // ───────────────────────────────────────────────────────────────────────
    const topCenter = el('div', {
      style: {
        position: 'absolute',
        top: '20px',
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '6px',
        background: BG_PANEL,
        border: '1px solid rgba(56, 189, 248, 0.25)',
        borderRadius: '16px',
        padding: '14px 32px',
        backdropFilter: 'blur(14px)',
        boxShadow: '0 12px 32px rgba(0,0,0,0.4), 0 0 20px rgba(56, 189, 248, 0.12)',
      },
    });

    const wpmRow = el('div', {
      style: { display: 'flex', alignItems: 'baseline', gap: '8px' },
    });
    this.wpmValueEl = el('span', {
      textContent: '0',
      style: {
        fontSize: '48px',
        fontWeight: '900',
        color: '#38bdf8',
        letterSpacing: '-1px',
        textShadow: '0 0 16px rgba(56, 189, 248, 0.6)',
      },
    });
    const wpmLabel = el('span', {
      textContent: 'WPM',
      style: {
        fontSize: '16px',
        fontWeight: '800',
        color: '#94a3b8',
        letterSpacing: '2px',
      },
    });
    wpmRow.appendChild(this.wpmValueEl);
    wpmRow.appendChild(wpmLabel);

    // Stats line: Accuracy & Sentence Progress
    const statsRow = el('div', {
      style: {
        display: 'flex',
        gap: '24px',
        fontSize: '13px',
        color: '#cbd5e1',
        fontWeight: '700',
        letterSpacing: '1px',
      },
    });
    this.accuracyValueEl = el('span', { textContent: 'ACCURACY: 100%' });
    this.sentenceProgressEl = el('span', { textContent: 'SENTENCE 1' });
    statsRow.appendChild(this.accuracyValueEl);
    statsRow.appendChild(this.sentenceProgressEl);

    // Sentence Progress Bar
    const progressBarBg = el('div', {
      style: {
        width: '260px',
        height: '4px',
        background: 'rgba(255, 255, 255, 0.15)',
        borderRadius: '2px',
        overflow: 'hidden',
        marginTop: '4px',
      },
    });
    this.progressBarFillEl = el('div', {
      style: {
        width: '0%',
        height: '100%',
        background: 'linear-gradient(90deg, #38bdf8, #10b981)',
        transition: 'width 0.1s ease-out',
        borderRadius: '2px',
      },
    });
    progressBarBg.appendChild(this.progressBarFillEl);

    topCenter.appendChild(wpmRow);
    topCenter.appendChild(statsRow);
    topCenter.appendChild(progressBarBg);
    this.hudRoot.appendChild(topCenter);

    // ───────────────────────────────────────────────────────────────────────
    // TOP RIGHT: Controls (Pause, Sound)
    // ───────────────────────────────────────────────────────────────────────
    const topRight = el('div', {
      style: {
        position: 'absolute',
        top: '24px',
        right: '24px',
        display: 'flex',
        gap: '10px',
        pointerEvents: 'auto',
      },
    });

    const pauseBtn = el('button', {
      innerHTML: '⏸',
      title: 'Pause (Esc)',
      style: {
        width: '44px',
        height: '44px',
        borderRadius: '10px',
        background: BG_PANEL,
        border: '1px solid rgba(255, 255, 255, 0.15)',
        color: '#fff',
        fontSize: '18px',
        cursor: 'pointer',
        backdropFilter: 'blur(8px)',
        transition: 'all 0.15s ease',
      },
      onclick: () => this.onPauseClick && this.onPauseClick(),
    });
    pauseBtn.onmouseenter = () => pauseBtn.style.transform = 'scale(1.08)';
    pauseBtn.onmouseleave = () => pauseBtn.style.transform = 'scale(1)';

    this.soundBtn = el('button', {
      innerHTML: '🔊',
      title: 'Toggle Sound',
      style: {
        width: '44px',
        height: '44px',
        borderRadius: '10px',
        background: BG_PANEL,
        border: '1px solid rgba(255, 255, 255, 0.15)',
        color: '#fff',
        fontSize: '18px',
        cursor: 'pointer',
        backdropFilter: 'blur(8px)',
        transition: 'all 0.15s ease',
      },
      onclick: () => this._toggleSound(),
    });
    this.soundBtn.onmouseenter = () => this.soundBtn.style.transform = 'scale(1.08)';
    this.soundBtn.onmouseleave = () => this.soundBtn.style.transform = 'scale(1)';

    topRight.appendChild(pauseBtn);
    topRight.appendChild(this.soundBtn);
    this.hudRoot.appendChild(topRight);

    // ───────────────────────────────────────────────────────────────────────
    // BOTTOM CENTER: Modern Typing Interface
    // ───────────────────────────────────────────────────────────────────────
    const bottomCenter = el('div', {
      style: {
        position: 'absolute',
        bottom: '36px',
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '10px',
        maxWidth: '850px',
        width: '90%',
      },
    });

    this.typingContainerEl = el('div', {
      id: 'typing-box',
      style: {
        width: '100%',
        background: 'rgba(15, 23, 42, 0.92)',
        border: '1px solid rgba(56, 189, 248, 0.35)',
        borderRadius: '16px',
        padding: '20px 28px',
        backdropFilter: 'blur(16px)',
        boxShadow: '0 16px 40px rgba(0,0,0,0.5), 0 0 24px rgba(56, 189, 248, 0.15)',
        fontFamily: FONT_MONO,
        fontSize: '24px',
        lineHeight: '1.6',
        letterSpacing: '1px',
        textAlign: 'center',
        wordBreak: 'break-word',
        transition: 'border-color 0.12s ease, box-shadow 0.12s ease',
      },
    });

    // 3 Visual states spans:
    // 1. Correctly typed characters
    this.typedSpan = el('span', {
      style: {
        color: EMERALD,
        textShadow: '0 0 10px rgba(16, 185, 129, 0.7)',
        fontWeight: '700',
      },
    });

    // 2. Active Cursor Character
    this.cursorSpan = el('span', {
      style: {
        color: '#ffffff',
        background: 'rgba(56, 189, 248, 0.38)',
        borderBottom: `3px solid ${CYAN}`,
        borderRadius: '3px',
        padding: '1px 2px',
        fontWeight: '800',
        boxShadow: '0 0 12px rgba(56, 189, 248, 0.8)',
      },
    });

    // 3. Remaining characters yet to type
    this.remainingSpan = el('span', {
      style: {
        color: '#94a3b8',
        fontWeight: '400',
      },
    });

    this.typingContainerEl.appendChild(this.typedSpan);
    this.typingContainerEl.appendChild(this.cursorSpan);
    this.typingContainerEl.appendChild(this.remainingSpan);

    const hintEl = el('div', {
      textContent: 'TYPE THE TEXT ABOVE TO DRIVE • FASTER TYPING = HIGHER ACCELERATION',
      style: {
        fontSize: '11px',
        color: '#94a3b8',
        letterSpacing: '1.5px',
        fontWeight: '700',
        textShadow: '0 2px 4px rgba(0,0,0,0.8)',
      },
    });

    bottomCenter.appendChild(this.typingContainerEl);
    bottomCenter.appendChild(hintEl);
    this.hudRoot.appendChild(bottomCenter);

    // ───────────────────────────────────────────────────────────────────────
    // BOTTOM RIGHT: Digital Speedometer
    // ───────────────────────────────────────────────────────────────────────
    const bottomRight = el('div', {
      style: {
        position: 'absolute',
        bottom: '36px',
        right: '28px',
        background: BG_PANEL,
        border: '1px solid rgba(255, 255, 255, 0.12)',
        borderRadius: '16px',
        padding: '16px 24px',
        backdropFilter: 'blur(12px)',
        boxShadow: '0 12px 32px rgba(0,0,0,0.4)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        minWidth: '130px',
      },
    });

    const speedRow = el('div', {
      style: { display: 'flex', alignItems: 'baseline', gap: '6px' },
    });
    this.speedValueEl = el('div', {
      textContent: '0',
      style: { fontSize: '42px', fontWeight: '900', color: '#f8fafc', letterSpacing: '-1px' },
    });
    const kmhLabel = el('div', {
      textContent: 'KM/H',
      style: { fontSize: '14px', fontWeight: '800', color: '#94a3b8', letterSpacing: '1.5px' },
    });
    speedRow.appendChild(this.speedValueEl);
    speedRow.appendChild(kmhLabel);

    // Speed bar
    const speedBarBg = el('div', {
      style: {
        width: '100%',
        height: '6px',
        background: 'rgba(255, 255, 255, 0.1)',
        borderRadius: '3px',
        overflow: 'hidden',
        marginTop: '8px',
      },
    });
    this.speedBarEl = el('div', {
      style: {
        width: '0%',
        height: '100%',
        background: 'linear-gradient(90deg, #10b981, #38bdf8, #ef4444)',
        transition: 'width 0.08s ease-out',
        borderRadius: '3px',
      },
    });
    speedBarBg.appendChild(this.speedBarEl);

    bottomRight.appendChild(speedRow);
    bottomRight.appendChild(speedBarBg);
    this.hudRoot.appendChild(bottomRight);

    this.container.appendChild(this.hudRoot);
  }

  // -------------------------------------------------------------------------
  // 2. Start Screen Overlay
  // -------------------------------------------------------------------------
  _createMenuOverlay() {
    this.menuOverlay = el('div', {
      id: 'menu-overlay',
      style: {
        position: 'absolute',
        inset: '0',
        background: 'radial-gradient(ellipse at center, rgba(15, 23, 42, 0.75) 0%, rgba(2, 6, 23, 0.95) 100%)',
        backdropFilter: 'blur(10px)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        pointerEvents: 'auto',
        gap: '24px',
      },
    });

    const titleEl = el('h1', {
      textContent: 'TYPE TO DRIVE',
      style: {
        fontSize: '64px',
        fontWeight: '900',
        letterSpacing: '6px',
        margin: '0',
        background: 'linear-gradient(135deg, #ffffff 30%, #38bdf8 70%, #10b981 100%)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        textShadow: '0 0 40px rgba(56, 189, 248, 0.5)',
      },
    });

    const subTitleEl = el('p', {
      textContent: 'Your fingers control your speed.',
      style: {
        fontSize: '20px',
        color: '#94a3b8',
        letterSpacing: '3px',
        margin: '0',
        textTransform: 'uppercase',
      },
    });

    const card = el('div', {
      style: {
        background: 'rgba(30, 41, 59, 0.75)',
        border: '1px solid rgba(56, 189, 248, 0.25)',
        borderRadius: '16px',
        padding: '24px 36px',
        maxWidth: '560px',
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        gap: '14px',
        boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
      },
    });

    const inst1 = el('div', {
      textContent: '⌨️ Type the displayed text correctly on your keyboard to accelerate.',
      style: { fontSize: '15px', color: '#e2e8f0', lineHeight: '1.5' },
    });
    const inst2 = el('div', {
      textContent: '⚡ Higher WPM generates greater acceleration. Stopping slows the car to a halt.',
      style: { fontSize: '15px', color: '#38bdf8', lineHeight: '1.5' },
    });
    const inst3 = el('div', {
      textContent: '⏱️ Complete as many sentences as you can in the 60-second speed challenge.',
      style: { fontSize: '14px', color: '#94a3b8', lineHeight: '1.5' },
    });

    card.appendChild(inst1);
    card.appendChild(inst2);
    card.appendChild(inst3);

    const startBtn = el('button', {
      textContent: 'START TYPING',
      style: {
        fontFamily: FONT_ORBITRON,
        fontSize: '20px',
        fontWeight: '900',
        letterSpacing: '3px',
        color: '#020617',
        background: 'linear-gradient(135deg, #38bdf8, #10b981)',
        border: 'none',
        borderRadius: '12px',
        padding: '16px 48px',
        cursor: 'pointer',
        boxShadow: '0 0 24px rgba(56, 189, 248, 0.5)',
        transition: 'all 0.15s ease',
      },
      onclick: () => this.onPlay && this.onPlay(),
    });
    startBtn.onmouseenter = () => {
      startBtn.style.transform = 'scale(1.05)';
      startBtn.style.boxShadow = '0 0 36px rgba(16, 185, 129, 0.7)';
    };
    startBtn.onmouseleave = () => {
      startBtn.style.transform = 'scale(1)';
      startBtn.style.boxShadow = '0 0 24px rgba(56, 189, 248, 0.5)';
    };

    const keyHint = el('div', {
      textContent: 'Press any key or click above to begin',
      style: { fontSize: '13px', color: '#64748b', letterSpacing: '1px' },
    });

    this.menuOverlay.appendChild(titleEl);
    this.menuOverlay.appendChild(subTitleEl);
    this.menuOverlay.appendChild(card);
    this.menuOverlay.appendChild(startBtn);
    this.menuOverlay.appendChild(keyHint);

    this.container.appendChild(this.menuOverlay);
  }

  // -------------------------------------------------------------------------
  // 3. Pause Overlay
  // -------------------------------------------------------------------------
  _createPauseOverlay() {
    this.pauseOverlay = el('div', {
      id: 'pause-overlay',
      style: {
        position: 'absolute',
        inset: '0',
        background: 'rgba(15, 23, 42, 0.85)',
        backdropFilter: 'blur(10px)',
        display: 'none',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        pointerEvents: 'auto',
        gap: '20px',
      },
    });

    const titleEl = el('h2', {
      textContent: 'PAUSED',
      style: {
        fontSize: '48px',
        fontWeight: '900',
        letterSpacing: '4px',
        margin: '0',
        color: '#f8fafc',
      },
    });

    const resumeBtn = el('button', {
      textContent: 'RESUME (ESC)',
      style: {
        fontFamily: FONT_ORBITRON,
        fontSize: '18px',
        fontWeight: '800',
        letterSpacing: '2px',
        color: '#020617',
        background: CYAN,
        border: 'none',
        borderRadius: '10px',
        padding: '14px 40px',
        cursor: 'pointer',
        boxShadow: '0 0 20px rgba(56, 189, 248, 0.4)',
      },
      onclick: () => this.onResume && this.onResume(),
    });

    const restartBtn = el('button', {
      textContent: 'RESTART CHALLENGE',
      style: {
        fontFamily: FONT_ORBITRON,
        fontSize: '16px',
        fontWeight: '700',
        letterSpacing: '2px',
        color: '#f8fafc',
        background: 'rgba(255, 255, 255, 0.12)',
        border: '1px solid rgba(255, 255, 255, 0.2)',
        borderRadius: '10px',
        padding: '12px 32px',
        cursor: 'pointer',
      },
      onclick: () => this.onRestart && this.onRestart(),
    });

    this.pauseOverlay.appendChild(titleEl);
    this.pauseOverlay.appendChild(resumeBtn);
    this.pauseOverlay.appendChild(restartBtn);

    this.container.appendChild(this.pauseOverlay);
  }

  // -------------------------------------------------------------------------
  // 4. Finish / Results Overlay (After 60-Second Challenge)
  // -------------------------------------------------------------------------
  _createFinishOverlay() {
    this.finishOverlay = el('div', {
      id: 'finish-overlay',
      style: {
        position: 'absolute',
        inset: '0',
        background: 'radial-gradient(ellipse at center, rgba(15, 23, 42, 0.88) 0%, rgba(2, 6, 23, 0.98) 100%)',
        backdropFilter: 'blur(14px)',
        display: 'none',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        pointerEvents: 'auto',
        gap: '24px',
      },
    });

    const badgeEl = el('div', {
      textContent: '🏁 CHALLENGE COMPLETE 🏁',
      style: {
        fontSize: '36px',
        fontWeight: '900',
        letterSpacing: '4px',
        color: EMERALD,
        textShadow: '0 0 24px rgba(16, 185, 129, 0.6)',
      },
    });

    this.finishStatsContainer = el('div', {
      style: {
        background: 'rgba(30, 41, 59, 0.85)',
        border: '1px solid rgba(56, 189, 248, 0.3)',
        borderRadius: '20px',
        padding: '30px 48px',
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 220px)',
        gap: '24px',
        boxShadow: '0 24px 60px rgba(0,0,0,0.6)',
      },
    });

    const restartBtn = el('button', {
      textContent: 'DRIVE AGAIN [ENTER]',
      style: {
        fontFamily: FONT_ORBITRON,
        fontSize: '20px',
        fontWeight: '900',
        letterSpacing: '3px',
        color: '#020617',
        background: 'linear-gradient(135deg, #10b981, #38bdf8)',
        border: 'none',
        borderRadius: '12px',
        padding: '16px 52px',
        cursor: 'pointer',
        boxShadow: '0 0 30px rgba(16, 185, 129, 0.6)',
        transition: 'all 0.15s ease',
      },
      onclick: () => this.onRestart && this.onRestart(),
    });
    restartBtn.onmouseenter = () => restartBtn.style.transform = 'scale(1.05)';
    restartBtn.onmouseleave = () => restartBtn.style.transform = 'scale(1)';

    this.finishOverlay.appendChild(badgeEl);
    this.finishOverlay.appendChild(this.finishStatsContainer);
    this.finishOverlay.appendChild(restartBtn);

    this.container.appendChild(this.finishOverlay);
  }

  // -------------------------------------------------------------------------
  // Public UI API
  // -------------------------------------------------------------------------
  showMenu() {
    if (this.menuOverlay) this.menuOverlay.style.display = 'flex';
  }

  hideMenu() {
    if (this.menuOverlay) this.menuOverlay.style.display = 'none';
  }

  showHUD() {
    if (this.hudRoot) this.hudRoot.style.display = 'block';
  }

  hideHUD() {
    if (this.hudRoot) this.hudRoot.style.display = 'none';
  }

  showPause() {
    if (this.pauseOverlay) this.pauseOverlay.style.display = 'flex';
  }

  hidePause() {
    if (this.pauseOverlay) this.pauseOverlay.style.display = 'none';
  }

  showFinish(stats) {
    if (!this.finishOverlay) return;

    this.finishStatsContainer.innerHTML = '';

    const statItems = [
      { label: 'AVERAGE WPM', value: `${stats.avgWpm.toFixed(1)}`, color: CYAN },
      { label: 'MAX (PEAK) WPM', value: `${stats.peakWpm.toFixed(1)}`, color: EMERALD },
      { label: 'TYPING ACCURACY', value: `${stats.accuracy.toFixed(1)}%`, color: '#f8fafc' },
      { label: 'TOTAL DISTANCE', value: stats.distance >= 1000 ? `${(stats.distance / 1000).toFixed(2)} KM` : `${Math.round(stats.distance)} M`, color: '#f8fafc' },
      { label: 'CHARACTERS TYPED', value: `${stats.totalChars}`, color: '#cbd5e1' },
      { label: 'SENTENCES COMPLETED', value: `${stats.sentencesCompleted}`, color: '#cbd5e1' },
    ];

    statItems.forEach(item => {
      const box = el('div', {
        style: {
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '4px',
        },
      });
      const lbl = el('div', {
        textContent: item.label,
        style: { fontSize: '11px', color: '#94a3b8', letterSpacing: '1.5px' },
      });
      const val = el('div', {
        textContent: item.value,
        style: { fontSize: '32px', fontWeight: '900', color: item.color, letterSpacing: '-0.5px' },
      });
      box.appendChild(lbl);
      box.appendChild(val);
      this.finishStatsContainer.appendChild(box);
    });

    this.finishOverlay.style.display = 'flex';
  }

  hideFinish() {
    if (this.finishOverlay) this.finishOverlay.style.display = 'none';
  }

  // -------------------------------------------------------------------------
  // Update Live Sentence Text (Three Visual States)
  // -------------------------------------------------------------------------
  updateSentenceText(sentence, charIndex) {
    if (!this.typedSpan || !this.cursorSpan || !this.remainingSpan) return;

    const typedPart = sentence.slice(0, charIndex);
    const cursorChar = charIndex < sentence.length ? sentence[charIndex] : '';
    const remainingPart = charIndex < sentence.length ? sentence.slice(charIndex + 1) : '';

    this.typedSpan.textContent = typedPart;

    // Display cursor char (substitute visible symbol for space if at space)
    if (cursorChar === ' ') {
      this.cursorSpan.innerHTML = '&nbsp;';
    } else {
      this.cursorSpan.textContent = cursorChar;
    }

    this.remainingSpan.textContent = remainingPart;

    // Update progress bar
    if (this.progressBarFillEl && sentence.length > 0) {
      const pct = (charIndex / sentence.length) * 100;
      this.progressBarFillEl.style.width = `${pct}%`;
    }
  }

  // Flash red on error keystroke
  flashTypo() {
    if (!this.typingContainerEl) return;
    this.typingContainerEl.style.borderColor = RED;
    this.typingContainerEl.style.boxShadow = '0 16px 40px rgba(0,0,0,0.5), 0 0 24px rgba(239, 68, 68, 0.4)';
    setTimeout(() => {
      if (this.typingContainerEl) {
        this.typingContainerEl.style.borderColor = 'rgba(56, 189, 248, 0.35)';
        this.typingContainerEl.style.boxShadow = '0 16px 40px rgba(0,0,0,0.5), 0 0 24px rgba(56, 189, 248, 0.15)';
      }
    }, 120);
  }

  // -------------------------------------------------------------------------
  // Update Live HUD Metrics
  // -------------------------------------------------------------------------
  updateHUD({ liveWpm, accuracy, speedKmh, distanceM, timeRemainingSec, sentenceIndex }) {
    if (this.wpmValueEl) {
      this.wpmValueEl.textContent = Math.round(liveWpm);
    }
    if (this.accuracyValueEl) {
      this.accuracyValueEl.textContent = `ACCURACY: ${accuracy.toFixed(0)}%`;
    }
    if (this.sentenceProgressEl && sentenceIndex !== undefined) {
      this.sentenceProgressEl.textContent = `SENTENCE ${sentenceIndex + 1}`;
    }
    if (this.speedValueEl) {
      this.speedValueEl.textContent = Math.round(speedKmh);
    }
    if (this.speedBarEl) {
      const pct = Math.min(100, (speedKmh / 160.0) * 100);
      this.speedBarEl.style.width = `${pct}%`;
    }
    if (this.distanceValueEl) {
      if (distanceM >= 1000) {
        this.distanceValueEl.textContent = `${(distanceM / 1000).toFixed(2)} KM`;
      } else {
        this.distanceValueEl.textContent = `${Math.round(distanceM)} M`;
      }
    }
    if (this.timerValueEl && timeRemainingSec !== undefined) {
      this.timerValueEl.textContent = `${Math.max(0, timeRemainingSec).toFixed(1)}s`;
      if (timeRemainingSec <= 10) {
        this.timerValueEl.style.color = RED;
      } else {
        this.timerValueEl.style.color = CYAN;
      }
    }
  }

  _toggleSound() {
    this.isMuted = !this.isMuted;
    if (this.soundBtn) {
      this.soundBtn.innerHTML = this.isMuted ? '🔇' : '🔊';
    }
    if (typeof this.onMuteToggle === 'function') {
      this.onMuteToggle(this.isMuted);
    }
  }
}

export { UIController as HUDController };
