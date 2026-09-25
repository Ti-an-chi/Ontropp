/* password-input.js */

class PasswordInput {
  /**
   * @param {Object} options
   * @param {string} [options.placeholder=''] - Input placeholder
   * @param {string} [options.id=''] - Optional id for the input element
   * @param {string} [options.name='password'] - Input name
   * @param {boolean} [options.required=false] - Whether input is required
   * @param {boolean} [options.autocomplete='current-password'] - autocomplete attr
   * @param {boolean} [options.showStrength=false] - Show strength meter
   */
  constructor(options = {}) {
    this.options = {
      placeholder: '',
      id: '',
      name: 'password',
      required: false,
      autocomplete: 'current-password',
      showStrength: false,
      ...options,
    };

    this._injectStyles();
    this.element = this._build();
    this.input = this.element.querySelector('input');
    this.toggleBtn = this.element.querySelector('.pw-toggle');
    this.strengthEl = this.element.querySelector('.pw-strength');

    this._bindEvents();
  }

  /* ---------- Style injection (only once) ---------- */
  strength(show) {
    this.strengthEl.style.display = show ? 'block' : 'none';
  }
  
  _injectStyles() {
    if (document.getElementById('pw-input-styles')) return;

    const style = document.createElement('style');
    style.id = 'pw-input-styles';
    style.textContent = `
      .pw-wrapper {
        position: relative;
        display: block;
        width: 100%;
      }
      .pw-wrapper input {
        width: 100%;
        padding: 10px 44px 10px 12px;
        border: 1px solid var(--border, #E5E7EB);
        border-radius: 6px;
        font-size: 1rem;
        background: #fff;
        color: var(--text, #1F2937);
        transition: border-color .2s, box-shadow .2s;
        box-sizing: border-box;
      }
      .pw-wrapper input:focus {
        outline: none;
        border-color: var(--primary, #3483E0);
        box-shadow: 0 0 0 3px rgba(52, 131, 224, 0.15);
      }
      .pw-toggle {
        position: absolute;
        top: 50%;
        right: 8px;
        transform: translateY(-50%);
        background: transparent;
        border: none;
        cursor: pointer;
        padding: 6px;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #6B7280;
        border-radius: 6px;
        line-height: 1;
      }
      .pw-toggle:hover { color: var(--primary, #3483E0); }
      .pw-toggle:focus-visible {
        outline: 2px solid var(--primary, #3483E0);
        outline-offset: 2px;
      }
      .pw-toggle svg { width: 20px; height: 20px; display: block; }
      .pw-toggle .icon-eye-off { display: none; }
      .pw-toggle.visible .icon-eye { display: none; }
      .pw-toggle.visible .icon-eye-off { display: block; }

      .pw-strength {
        margin-top: 4px;
        font-size: .75rem;
        font-weight: 500;
      }
    `;
    document.head.appendChild(style);
  }

  /* ---------- DOM build ---------- */
  _build() {
    const wrapper = document.createElement('div');
    wrapper.className = 'pw-wrapper';

    const input = document.createElement('input');
    input.type = 'password';
    input.name = this.options.name;
    input.placeholder = this.options.placeholder;
    input.autocomplete = this.options.autocomplete;
    if (this.options.id) input.id = this.options.id;
    if (this.options.required) input.required = true;

    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'pw-toggle';
    toggle.setAttribute('aria-label', 'Show password');
    toggle.innerHTML = `
      <svg class="icon-eye" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
        <circle cx="12" cy="12" r="3"/>
      </svg>
      <svg class="icon-eye-off" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
        <line x1="1" y1="1" x2="23" y2="23"/>
      </svg>
    `;

    wrapper.appendChild(input);
    wrapper.appendChild(toggle);

    if (this.options.showStrength) {
      const strength = document.createElement('div');
      strength.className = 'pw-strength';
      wrapper.appendChild(strength);
    }

    return wrapper;
  }

  /* ---------- Events ---------- */
  _bindEvents() {
    this.toggleBtn.addEventListener('click', () => this.toggleVisibility());

    if (this.options.showStrength) {
      this.input.addEventListener('input', () => this._updateStrength());
    }
  }

  toggleVisibility() {
    const isVisible = this.input.type === 'text';
    this.input.type = isVisible ? 'password' : 'text';
    this.toggleBtn.classList.toggle('visible', !isVisible);
    this.toggleBtn.setAttribute(
      'aria-label',
      isVisible ? 'Show password' : 'Hide password'
    );
    this.input.focus();
  }

  _updateStrength() {
    const pass = this.input.value;
    const checks = [/[a-z]/, /[A-Z]/, /[0-9]/, /[^A-Za-z0-9]/];
    const score =
      checks.reduce((a, r) => a + r.test(pass), 0) +
      (pass.length >= 8 ? 1 : 0);
    const levels = ['Very Weak', 'Weak', 'Fair', 'Good', 'Strong', 'Very Strong'];
    const colors = ['#ef4444', '#f97316', '#eab308', '#84cc16', '#22c55e', '#16a34a'];
    this.strengthEl.textContent = `Password Strength: ${levels[score]}`;
    this.strengthEl.style.color = colors[score];
  }

  /* ---------- Public API ---------- */
  get value() {
    return this.input.value;
  }

  set value(v) {
    this.input.value = v;
    if (this.options.showStrength) this._updateStrength();
  }

  focus() {
    this.input.focus();
  }

  /** Attach the component into a parent element or selector */
  mount(target) {
    const parent =
      typeof target === 'string' ? document.querySelector(target) : target;
    if (!parent) throw new Error('PasswordInput: mount target not found');
    parent.appendChild(this.element);
    return this;
  }
}

export default PasswordInput;