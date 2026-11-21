// ui.js — Modern Type To Drive UI & HUD Controller

const CYAN = '#38bdf8';
const EMERALD = '#10b981';
const RED = '#ef4444';
const GOLD = '#facc15';
const SILVER = '#cbd5e1';
const BRONZE = '#d97706';
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

function formatTime(seconds) {
  if (isNaN(seconds) || seconds < 0) seconds = 0;
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const tenths = Math.floor((seconds % 1) * 10);
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${tenths}`;
}

export class UIController {
  constructor() {
    this.container = null;

    // HUD Elements
    this.hudRoot = null;
    this.elapsedTimeValueEl = null;
    this.wordsCounterValueEl = null;
    this.positionBadgeEl = null;
    this.finishDistanceValueEl = null;

    this.wpmValueEl = null;
    this.accuracyValueEl = null;
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
    this.finishPlacementHeader = null;
    this.finishStatsContainer = null;

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
    // TOP LEFT: Race Status Cards (Elapsed Time, Words, Position, Distance)
    // ───────────────────────────────────────────────────────────────────────
    const topLeft = el('div', {
      style: {
        position: 'absolute',
        top: '20px',
        left: '24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
      },
    });

    const cardStyle = {
      background: BG_PANEL,
      border: '1px solid rgba(255, 255, 255, 0.12)',
      borderRadius: '12px',
      padding: '8px 16px',
      backdropFilter: 'blur(10px)',
      boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
      minWidth: '150px',
    };

    // 1. Elapsed Time Card
    const elapsedCard = el('div', { style: cardStyle });
    const elapsedLabel = el('div', {
      textContent: 'ELAPSED TIME',
      style: { fontSize: '10px', color: '#94a3b8', letterSpacing: '1.5px', marginBottom: '2px' },
    });
    this.elapsedTimeValueEl = el('div', {
      textContent: '00:00.0',
      style: { fontSize: '20px', fontWeight: '800', color: CYAN, letterSpacing: '1px' },
    });
    elapsedCard.appendChild(elapsedLabel);
    elapsedCard.appendChild(this.elapsedTimeValueEl);

    // 2. Words Counter Card
    const wordsCard = el('div', { style: cardStyle });
    const wordsLabel = el('div', {
      textContent: 'WORDS TYPED',
      style: { fontSize: '10px', color: '#94a3b8', letterSpacing: '1.5px', marginBottom: '2px' },
    });
    this.wordsCounterValueEl = el('div', {
      textContent: '0 / 60',
      style: { fontSize: '20px', fontWeight: '800', color: '#f8fafc', letterSpacing: '1px' },
    });
    wordsCard.appendChild(wordsLabel);
    wordsCard.appendChild(this.wordsCounterValueEl);

    // 3. Position Badge Card
    const posCard = el('div', { style: { ...cardStyle, display: 'flex', alignItems: 'center', justifyContent: 'space-between' } });
    const posLeft = el('div');
    const posLabel = el('div', {
      textContent: 'POSITION',
      style: { fontSize: '10px', color: '#94a3b8', letterSpacing: '1.5px', marginBottom: '2px' },
    });
    posLeft.appendChild(posLabel);
    this.positionBadgeEl = el('div', {
      textContent: '1st',
      style: {
        fontSize: '22px',
        fontWeight: '900',
        color: GOLD,
        textShadow: `0 0 12px ${GOLD}88`,
        letterSpacing: '1px',
      },
    });
    posCard.appendChild(posLeft);
    posCard.appendChild(this.positionBadgeEl);

    // 4. Finish Distance Card
    const finishDistCard = el('div', { style: cardStyle });
    const finishDistLabel = el('div', {
      textContent: 'FINISH DISTANCE',
      style: { fontSize: '10px', color: '#94a3b8', letterSpacing: '1.5px', marginBottom: '2px' },
    });
    this.finishDistanceValueEl = el('div', {
      textContent: '1250 M',
      style: { fontSize: '18px', fontWeight: '800', color: EMERALD, letterSpacing: '1px' },
    });
    finishDistCard.appendChild(finishDistLabel);
    finishDistCard.appendChild(this.finishDistanceValueEl);

    topLeft.appendChild(elapsedCard);
    topLeft.appendChild(wordsCard);
    topLeft.appendChild(posCard);
    topLeft.appendChild(finishDistCard);
    this.hudRoot.appendChild(topLeft);

    // ───────────────────────────────────────────────────────────────────────
    // TOP CENTER: Massive Live WPM, Accuracy, and Progress
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

    // Stats line: Accuracy
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
    statsRow.appendChild(this.accuracyValueEl);

    // Sentence Progress Bar
    const progressBarBg = el('div', {
      style: {
        width: '280px',
        height: '6px',
        background: 'rgba(255, 255, 255, 0.15)',
        borderRadius: '3px',
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
        borderRadius: '3px',
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
    // BOTTOM STREAMLINED RIBBON: Unobstructed Typing Interface at Bottom
    // (Cars and highway remain 100% visible in the upper-middle screen!)
    // ───────────────────────────────────────────────────────────────────────
    const typingRibbonWrapper = el('div', {
      id: 'typing-ribbon-wrapper',
      style: {
        position: 'absolute',
        bottom: '22px',
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '6px',
        maxWidth: '820px',
        width: '90%',
        pointerEvents: 'none',
      },
    });

    // Multi-Level Nitro Boost Banner (floats right above typing box)
    this.boostBannerEl = el('div', {
      id: 'boost-banner',
      style: {
        display: 'none',
        alignItems: 'center',
        gap: '8px',
        padding: '5px 18px',
        background: 'linear-gradient(90deg, rgba(239, 68, 68, 0.92), rgba(245, 158, 11, 0.92))',
        border: '1px solid #ffea00',
        borderRadius: '20px',
        boxShadow: '0 0 20px rgba(239, 68, 68, 0.8), 0 0 35px rgba(245, 158, 11, 0.6)',
        color: '#ffffff',
        fontFamily: FONT_ORBITRON,
        fontSize: '12px',
        fontWeight: '900',
        letterSpacing: '2px',
        textTransform: 'uppercase',
        textShadow: '0 0 8px #fff',
        transition: 'all 0.2s ease',
      },
    });
    this.boostBannerEl.innerHTML = '🔥 NITRO BOOST ACTIVATED! 🔥';

    this.typingContainerEl = el('div', {
      id: 'typing-box',
      style: {
        width: 'auto',
        maxWidth: '540px',
        height: '46px',
        maxHeight: '46px',
        overflow: 'hidden',
        background: 'rgba(15, 23, 42, 0.78)',
        border: '1px solid rgba(56, 189, 248, 0.4)',
        borderRadius: '23px',
        padding: '0 24px',
        backdropFilter: 'blur(16px)',
        boxShadow: '0 8px 24px rgba(0,0,0,0.5), 0 0 16px rgba(56, 189, 248, 0.15)',
        fontFamily: FONT_MONO,
        fontSize: '22px',
        lineHeight: '46px',
        letterSpacing: '0.8px',
        whiteSpace: 'nowrap',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        transition: 'border-color 0.12s ease, box-shadow 0.12s ease',
      },
    });

    // 3 Visual states spans:
    this.typedSpan = el('span', {
      style: {
        color: EMERALD,
        textShadow: '0 0 10px rgba(16, 185, 129, 0.7)',
        fontWeight: '700',
      },
    });

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
      textContent: 'TYPE SHORT EASY WORDS • STREAKS UNLOCK MULTI-LEVEL NITRO BOOST',
      style: {
        fontSize: '10px',
        color: '#94a3b8',
        letterSpacing: '1.5px',
        fontWeight: '700',
        textShadow: '0 2px 4px rgba(0,0,0,0.8)',
      },
    });

    typingRibbonWrapper.appendChild(this.boostBannerEl);
    typingRibbonWrapper.appendChild(this.typingContainerEl);
    typingRibbonWrapper.appendChild(hintEl);
    this.hudRoot.appendChild(typingRibbonWrapper);

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
      textContent: 'Highway Drag Race • 1-Minute Typing Championship',
      style: {
        fontSize: '18px',
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
        maxWidth: '580px',
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        gap: '14px',
        boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
      },
    });

    const inst1 = el('div', {
      textContent: '⌨️ Type the 1-minute passage accurately to accelerate your car.',
      style: { fontSize: '15px', color: '#e2e8f0', lineHeight: '1.5' },
    });
    const inst2 = el('div', {
      textContent: '⚡ Higher WPM generates blazing top speeds to overtake AI rival supercars.',
      style: { fontSize: '15px', color: '#38bdf8', lineHeight: '1.5' },
    });
    const inst3 = el('div', {
      textContent: '🏁 Race ends when all words are typed and you cross the finish line arch.',
      style: { fontSize: '14px', color: '#94a3b8', lineHeight: '1.5' },
    });

    card.appendChild(inst1);
    card.appendChild(inst2);
    card.appendChild(inst3);

    const startBtn = el('button', {
      textContent: 'START RACE',
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
      textContent: 'RESTART RACE',
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
  // 4. Finish / Results Overlay
  // -------------------------------------------------------------------------
  _createFinishOverlay() {
    this.finishOverlay = el('div', {
      id: 'finish-overlay',
      style: {
        position: 'absolute',
        inset: '0',
        background: 'radial-gradient(ellipse at center, rgba(15, 23, 42, 0.90) 0%, rgba(2, 6, 23, 0.98) 100%)',
        backdropFilter: 'blur(16px)',
        display: 'none',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        pointerEvents: 'auto',
        gap: '24px',
      },
    });

    this.finishPlacementHeader = el('div', {
      id: 'finish-placement-header',
      textContent: '🏆 1st PLACE - RACE WINNER!',
      style: {
        fontSize: 'clamp(28px, 4vw, 44px)',
        fontWeight: '900',
        letterSpacing: '4px',
        color: GOLD,
        textShadow: `0 0 30px ${GOLD}88`,
        textAlign: 'center',
      },
    });

    this.finishStatsContainer = el('div', {
      style: {
        background: 'rgba(30, 41, 59, 0.85)',
        border: '1px solid rgba(56, 189, 248, 0.3)',
        borderRadius: '20px',
        padding: '28px 48px',
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 230px)',
        gap: '22px',
        boxShadow: '0 24px 60px rgba(0,0,0,0.6)',
      },
    });

    const restartBtn = el('button', {
      textContent: 'PLAY AGAIN [ENTER]',
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

    this.finishOverlay.appendChild(this.finishPlacementHeader);
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

  showFinish(stats = {}) {
    if (!this.finishOverlay) return;

    // Header based on placement/position
    const pos = stats.position !== undefined ? stats.position : (stats.placement || 1);
    if (pos === 1 || String(pos).includes('1')) {
      this.finishPlacementHeader.textContent = '🏆 1st PLACE - RACE WINNER!';
      this.finishPlacementHeader.style.color = GOLD;
      this.finishPlacementHeader.style.textShadow = `0 0 30px ${GOLD}88`;
    } else if (pos === 2 || String(pos).includes('2')) {
      this.finishPlacementHeader.textContent = '🥈 2nd PLACE';
      this.finishPlacementHeader.style.color = SILVER;
      this.finishPlacementHeader.style.textShadow = `0 0 30px ${SILVER}88`;
    } else if (pos === 3 || String(pos).includes('3')) {
      this.finishPlacementHeader.textContent = '🥉 3rd PLACE';
      this.finishPlacementHeader.style.color = BRONZE;
      this.finishPlacementHeader.style.textShadow = `0 0 30px ${BRONZE}88`;
    } else {
      this.finishPlacementHeader.textContent = `${pos}th PLACE`;
      this.finishPlacementHeader.style.color = '#94a3b8';
      this.finishPlacementHeader.style.textShadow = '0 0 20px rgba(148, 163, 184, 0.5)';
    }

    this.finishStatsContainer.innerHTML = '';

    const finishTimeStr = stats.finishTimeFormatted || formatTime(stats.finishTimeSec || stats.elapsedTimeSec || 0);
    const avgWpmVal = stats.avgWpm !== undefined ? stats.avgWpm.toFixed(1) : '0.0';
    const peakWpmVal = stats.peakWpm !== undefined ? stats.peakWpm.toFixed(1) : '0.0';
    const accuracyVal = stats.accuracy !== undefined ? `${stats.accuracy.toFixed(1)}%` : '100%';
    const totalWordsVal = stats.wordsTyped !== undefined ? `${stats.wordsTyped} / ${stats.totalWords || stats.wordsTyped}` : (stats.totalWords || '60');

    const statItems = [
      { label: 'FINISH TIME', value: finishTimeStr, color: CYAN },
      { label: 'AVERAGE WPM', value: avgWpmVal, color: '#f8fafc' },
      { label: 'PEAK WPM', value: peakWpmVal, color: EMERALD },
      { label: 'ACCURACY', value: accuracyVal, color: '#f8fafc' },
      { label: 'TOTAL WORDS TYPED', value: `${totalWordsVal}`, color: '#cbd5e1' },
      { label: 'RACE DISTANCE', value: stats.distance >= 1000 ? `${(stats.distance / 1000).toFixed(2)} KM` : `${Math.round(stats.distance || 1250)} M`, color: '#cbd5e1' },
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
        style: { fontSize: '28px', fontWeight: '900', color: item.color, letterSpacing: '-0.5px' },
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
  // Update Live Sentence Text (Focused Sliding Window: Only 3-4 Words At A Time)
  // Keeps the typing ribbon ultra-clean, minimal, and uncluttered on a single line!
  // -------------------------------------------------------------------------
  updateSentenceText(sentence, charIndex) {
    if (!this.typedSpan || !this.cursorSpan || !this.remainingSpan) return;

    // Find the start index of the currently active word
    let wordStart = 0;
    if (charIndex > 0) {
      const prevSpace = sentence.lastIndexOf(' ', charIndex - 1);
      wordStart = prevSpace === -1 ? 0 : prevSpace + 1;
    }

    // Look ahead 3 to 4 words from the active character
    let spacesFound = 0;
    let windowEnd = sentence.length;
    for (let i = charIndex; i < sentence.length; i++) {
      if (sentence[i] === ' ') {
        spacesFound++;
        if (spacesFound >= 4) {
          windowEnd = i;
          break;
        }
      }
    }

    const typedPart = sentence.slice(wordStart, charIndex);
    const cursorChar = charIndex < sentence.length ? sentence[charIndex] : '';
    const remainingPart = charIndex < sentence.length ? sentence.slice(charIndex + 1, windowEnd) : '';

    this.typedSpan.textContent = typedPart;

    if (cursorChar === ' ') {
      this.cursorSpan.innerHTML = '&nbsp;';
    } else {
      this.cursorSpan.textContent = cursorChar;
    }

    this.remainingSpan.textContent = remainingPart;

    // Update progress bar
    if (this.progressBarFillEl && sentence.length > 0) {
      const pct = Math.min(100, (charIndex / sentence.length) * 100);
      this.progressBarFillEl.style.width = `${pct}%`;
    }
  }

  showBoostBanner(level = 1, durationSec = 3.0) {
    if (!this.boostBannerEl) return;
    this.boostBannerEl.style.display = 'flex';

    if (level === 1) {
      this.boostBannerEl.innerHTML = '⚡ LEVEL 1: TURBO CHARGE!';
      this.boostBannerEl.style.background = 'linear-gradient(90deg, rgba(14, 165, 233, 0.92), rgba(56, 189, 248, 0.92))';
      this.boostBannerEl.style.boxShadow = '0 0 16px rgba(56, 189, 248, 0.8), 0 0 30px rgba(14, 165, 233, 0.6)';
      this.boostBannerEl.style.borderColor = '#38bdf8';
    } else if (level === 2) {
      this.boostBannerEl.innerHTML = '🔥 LEVEL 2: TWIN NITRO SURGE! 🔥';
      this.boostBannerEl.style.background = 'linear-gradient(90deg, rgba(239, 68, 68, 0.92), rgba(245, 158, 11, 0.92))';
      this.boostBannerEl.style.boxShadow = '0 0 18px rgba(239, 68, 68, 0.85), 0 0 35px rgba(245, 158, 11, 0.7)';
      this.boostBannerEl.style.borderColor = '#ffea00';
    } else {
      this.boostBannerEl.innerHTML = '💥 LEVEL 3: HYPER OVERDRIVE! 💥';
      this.boostBannerEl.style.background = 'linear-gradient(90deg, rgba(168, 85, 247, 0.95), rgba(236, 72, 153, 0.95), rgba(245, 158, 11, 0.95))';
      this.boostBannerEl.style.boxShadow = '0 0 24px rgba(168, 85, 247, 0.9), 0 0 45px rgba(236, 72, 153, 0.8)';
      this.boostBannerEl.style.borderColor = '#f43f5e';
    }

    clearTimeout(this._boostTimeout);
    this._boostTimeout = setTimeout(() => {
      if (this.boostBannerEl) {
        this.boostBannerEl.style.display = 'none';
      }
    }, durationSec * 1000);
  }

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
  updateHUD({
    liveWpm = 0,
    accuracy = 100,
    speedKmh = 0,
    elapsedTimeSec = 0,
    wordsTyped = 0,
    totalWords = 60,
    position = 1,
    finishDistanceM = 0,
    distanceM = 0,
    timeRemainingSec = undefined,
  } = {}) {
    if (this.wpmValueEl) {
      this.wpmValueEl.textContent = Math.round(liveWpm);
    }
    if (this.accuracyValueEl) {
      this.accuracyValueEl.textContent = `ACCURACY: ${accuracy.toFixed(0)}%`;
    }
    if (this.speedValueEl) {
      this.speedValueEl.textContent = Math.round(speedKmh);
    }
    if (this.speedBarEl) {
      const pct = Math.min(100, (speedKmh / 160.0) * 100);
      this.speedBarEl.style.width = `${pct}%`;
    }

    // 1. Elapsed Time
    if (this.elapsedTimeValueEl) {
      this.elapsedTimeValueEl.textContent = formatTime(elapsedTimeSec);
    }

    // 2. Words Counter
    if (this.wordsCounterValueEl) {
      this.wordsCounterValueEl.textContent = `${wordsTyped} / ${totalWords}`;
    }

    // 3. Position Badge
    if (this.positionBadgeEl) {
      let posText = '1st';
      let posColor = GOLD;
      if (position === 1 || position === '1st') {
        posText = '1st';
        posColor = GOLD;
      } else if (position === 2 || position === '2nd') {
        posText = '2nd';
        posColor = SILVER;
      } else if (position === 3 || position === '3rd') {
        posText = '3rd';
        posColor = BRONZE;
      } else {
        posText = typeof position === 'number' ? `${position}th` : position;
        posColor = '#94a3b8';
      }
      this.positionBadgeEl.textContent = posText;
      this.positionBadgeEl.style.color = posColor;
      this.positionBadgeEl.style.textShadow = `0 0 12px ${posColor}88`;
    }

    // 4. Finish Distance
    if (this.finishDistanceValueEl) {
      const dist = Math.max(0, Math.round(finishDistanceM));
      this.finishDistanceValueEl.textContent = `${dist} M`;
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

export { UIController as HUDController, UIController as UIManager };
