// stateManager.js
export class StateManager {
  constructor(containerId, options = {}) {
    this.container = document.getElementById(containerId);
    if (!this.container) {
      throw new Error(`Container with id "${containerId}" not found`);
    }
    this.currentState = null;
    this.options = {
      autoInjectStyles: true,
      stylesheetPath: '/css/stateManager.css',
      ...options
    };

    if (this.options.autoInjectStyles) {
      StateManager.injectStylesheet(this.options.stylesheetPath);
    }
  }

  static injectStylesheet(href) {
    if (!document?.head) return;
    if (document.querySelector(`link[rel="stylesheet"][href="${href}"]`)) return;

    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    document.head.appendChild(link);
  }

  // ─── LOADING STATES ────────────────────────────────────

  loading(type = 'spinner') {
    this.clear();
    
    switch (type) {
      case 'spinner':
        this._spinner();
        break;
      case 'skeleton':
        this._skeleton();
        break;
      case 'wave':
        this._wave();
        break;
      default:
        this._spinner();
    }
    
    this.currentState = 'loading';
  }

  _spinner() {
    this.container.innerHTML = `
      <div class="state-loading">
        <svg class="spinner" viewBox="0 0 50 50" width="50" height="50">
          <circle cx="25" cy="25" r="20" fill="none" stroke="var(--primary)" stroke-width="4" 
                  stroke-dasharray="31.4 94.2" stroke-linecap="round"/>
        </svg>
      </div>
    `;
  }

  _skeleton() {
    // Generates 3 skeleton lines — works for any container size
    this.container.innerHTML = `
      <div class="state-skeleton">
        <div class="sk-line"></div>
        <div class="sk-line" style="width:90%"></div>
        <div class="sk-line" style="width:65%"></div>
      </div>
    `;
  }

  _wave() {
    this.container.innerHTML = `
      <div class="state-wave">
        <div class="wave-line"></div>
      </div>
    `;
  }

  // ─── EMPTY / ERROR ─────────────────────────────────────

  empty(title, subtitle, icon = 'inbox') {
    this.clear();
    this.container.innerHTML = `
      <div class="state-empty">
        <i class="fas fa-${icon}"></i>
        <h3>${title}</h3>
        <p>${subtitle}</p>
      </div>
    `;
    this.currentState = 'empty';
  }

  error(message, retryCallback = null) {
    this.clear();
    this.container.innerHTML = `
      <div class="state-error">
        <i class="fas fa-exclamation-circle"></i>
        <p>${message}</p>
        ${retryCallback ? `<button class="retry-btn">Try Again</button>` : ''}
      </div>
    `;
    
    if (retryCallback) {
      this.container.querySelector('.retry-btn')?.addEventListener('click', retryCallback);
    }
    
    this.currentState = 'error';
  }

  // ─── DATA STATE ────────────────────────────────────────

  data() {
    this.clear();
    this.currentState = 'data';
  }

  // ─── CLEANUP ─────────────────────────────────────────

  clear() {
    this.container.innerHTML = '';
    this.currentState = null;
  }

  getState() {
    return this.currentState;
  }
}
