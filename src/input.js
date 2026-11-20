export class InputManager {
  constructor() {
    this.keys = {};
    this.onPause = null;
    this.onReset = null;

    this._onKeyDown = this._onKeyDown.bind(this);
    this._onKeyUp = this._onKeyUp.bind(this);
    this._onBlur = this._onBlur.bind(this);

    this._setupListeners();
  }

  _setupListeners() {
    window.addEventListener('keydown', this._onKeyDown);
    window.addEventListener('keyup', this._onKeyUp);
    // Prevent stuck keys when user switches tabs or window loses focus
    window.addEventListener('blur', this._onBlur);
  }

  destroy() {
    window.removeEventListener('keydown', this._onKeyDown);
    window.removeEventListener('keyup', this._onKeyUp);
    window.removeEventListener('blur', this._onBlur);
  }

  _onBlur() {
    this.reset();
  }

  _onKeyDown(e) {
    this.keys[e.code] = true;

    // Prevent default browser scrolling on arrow keys and space
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
      e.preventDefault();
    }

    if (e.code === 'Escape') {
      if (typeof this.onPause === 'function') {
        this.onPause();
      }
    }

    if (e.code === 'KeyR') {
      if (typeof this.onReset === 'function') {
        this.onReset();
      }
    }
  }

  _onKeyUp(e) {
    this.keys[e.code] = false;
  }

  reset() {
    this.keys = {};
  }

  get state() {
    return {
      forward:   !!(this.keys['KeyW'] || this.keys['ArrowUp']),
      backward:  !!(this.keys['KeyS'] || this.keys['ArrowDown']),
      left:      !!(this.keys['KeyA'] || this.keys['ArrowLeft']),
      right:     !!(this.keys['KeyD'] || this.keys['ArrowRight']),
      handbrake: !!(this.keys['Space']),
      reset:     !!(this.keys['KeyR']),
      pause:     !!(this.keys['Escape']),
    };
  }
}
