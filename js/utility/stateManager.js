export class StateManager {
  constructor(containerId, options = {}) {
    this.container = document.getElementById(containerId);
    if (!this.container) {
      throw new Error(`Container with id "${containerId}" not found`);
    }
    this.currentState = null;
    this.skeletonElements = [];
    this.options = options;

    if (options.autoInjectStyles) {
      if (options.stylesheetPath) {
        this._injectStylesheet(options.stylesheetPath);
      } else {
        this._injectDefaultStylesheet();
      }
    }
  }

  static injectStylesheet(href) {
    if (!document || !document.head) return;
    if (document.querySelector(`link[rel="stylesheet"][href="${href}"]`)) return;

    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    document.head.appendChild(link);
  }

  _injectDefaultStylesheet() {
    const href = new URL('../../css/stateManager.css', import.meta.url).href;
    this._injectStylesheet(href);
  }

  _injectStylesheet(href) {
    if (!document || !document.head) return;
    if (document.querySelector(`link[rel="stylesheet"][href="${href}"]`)) return;

    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    document.head.appendChild(link);
  }

  loadingState(type = 'spinner', target = 'container') {
    this.clearState();
    
    if (type === 'spinner') {
      this._createSpinnerState();
    } else if (type === 'skeleton') {
      this._createSkeletonState(target);
    } else if (type === 'wave') {
      this._createWaveState(target);
    }
    
    this.currentState = 'loading';
  }

  _createSpinnerState() {
    const loadingDiv = document.createElement('div');
    loadingDiv.className = 'state-loading';
    
    const spinner = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    spinner.setAttribute('class', 'spinner');
    spinner.setAttribute('viewBox', '0 0 50 50');
    spinner.setAttribute('width', '50px');
    spinner.setAttribute('height', '50px');
    
    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('cx', '25');
    circle.setAttribute('cy', '25');
    circle.setAttribute('r', '20');
    circle.setAttribute('fill', 'none');
    circle.setAttribute('stroke', 'var(--primary)');
    circle.setAttribute('stroke-width', '4');
    circle.setAttribute('stroke-dasharray', '31.4 94.2');
    
    spinner.appendChild(circle);
    loadingDiv.appendChild(spinner);
    this.container.appendChild(loadingDiv);
  }

  _createSkeletonState(target = 'container') {
    if (target === 'container') {
      this._createSkeletonPlaceholder(this.container);
    } else if (target === 'children') {
      const children = Array.from(this.container.children);
      children.forEach(child => {
        this._createSkeletonPlaceholder(child);
      });
    }
  }

  _createSkeletonPlaceholder(element) {
    const skeletonDiv = document.createElement('div');
    skeletonDiv.className = 'skeleton-placeholder';
    
    // Create multiple skeleton lines for text content
    const skeletonLines = document.createElement('div');
    skeletonLines.className = 'skeleton-lines';
    
    for (let i = 0; i < 3; i++) {
      const line = document.createElement('div');
      line.className = 'skeleton-line';r
      if (i === 2) line.style.width = '60%'; // ine shLast lorte
      skeletonLines.appendChild(line);
    }
    
    skeletonDiv.appendChild(skeletonLines);
    element.appendChild(skeletonDiv);
    this.skeletonElements.push(skeletonDiv);
  }

  _createWaveState(target = 'container') {
    if (target === 'container') {
      this._createWaveLine(this.container);
    } else if (target === 'children') {
      const children = Array.from(this.container.children);
      children.forEach(child => {
        this._createWaveLine(child);
      });
    }
  }

  _createWaveLine(element) {
    const waveDiv = document.createElement('div');
    waveDiv.className = 'wave-loading';
    
    const waveLine = document.createElement('div');
    waveLine.className = 'wave-line';
    
    waveDiv.appendChild(waveLine);
    element.appendChild(waveDiv);
    this.skeletonElements.push(waveDiv);
  }

  emptyState(title, subtitle) {
    this.clearState();
    const emptyDiv = document.createElement('div');
    emptyDiv.className = 'state-empty';
    emptyDiv.innerHTML = `
      <div class="empty-state-content">
        <i class="fas fa-inbox"></i>
        <h3>${title}</h3>
        <p>${subtitle}</p>
      </div>
    `;
    this.container.appendChild(emptyDiv);
    this.currentState = 'empty';
  }

  errorState(message) {
    this.clearState();
    const errorDiv = document.createElement('div');
    errorDiv.className = 'state-error';
    errorDiv.innerHTML = `
      <div class="error-state-content">
        <i class="fas fa-exclamation-circle"></i>
        <p>${message}</p>
      </div>
    `;
    this.container.appendChild(errorDiv);
    this.currentState = 'error';
  }

  dataState() {
    this.clearState();
    this.currentState = 'data';
  }

  clearState() {
    // Remove skeleton classes from elements
    this.skeletonElements.forEach(el => {
      el.classList.remove('skeleton-loading');
    });
    this.skeletonElements = [];
    
    // Remove container skeleton class if applied
    this.container.classList.remove('skeleton-loading');
    
    // Clear children
    while (this.container.firstChild) {
      this.container.removeChild(this.container.firstChild);
    }
    this.currentState = null;
  }

  getState() {
    return this.currentState;
  }
}