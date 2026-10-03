/**
 * StateView
 * 
 * Responsible solely for the visual presentation and transitions of UI states.
 * It is intentionally "dumb" regarding application logic, data, or state decisions.
 * It relies entirely on the StateManager to dictate which state to show.
 */
class StateView {
  // Centralized animation configuration for easy maintenance and consistency
  static #ANIMATIONS = {
    loading: {
      initial: { opacity: 0, transform: 'scale(0.98)' },
      enter: { opacity: 1, transform: 'scale(1)' },
      duration: 300
    },
    data: {
      initial: { opacity: 0, transform: 'translateY(12px)' },
      enter: { opacity: 1, transform: 'translateY(0)' },
      duration: 300
    },
    empty: {
      initial: { opacity: 0, transform: 'translateY(8px)' },
      enter: { opacity: 1, transform: 'translateY(0)' },
      duration: 250
    },
    error: {
      initial: { opacity: 0, transform: 'translateY(-6px)' },
      enter: { opacity: 1, transform: 'translateY(0)' },
      duration: 250
    }
  };

  static #EXIT_ANIMATION = {
    initial: { opacity: 1, transform: 'translateY(0)' },
    exit: { opacity: 0, transform: 'translateY(-4px)' },
    duration: 150
  };

  #container;
  #states;
	#displays;
  #currentState = null;
  #animatingState = null;
  #transitionId = 0;
  #reducedMotion;

  /**
   * @param {HTMLElement} container - The parent element containing the state views.
   * @param {Object} [options] - Optional configuration.
   * @param {Object} [options.selectors] - Explicit CSS selectors for each state.
   */
  
	constructor(container, options = {}) {
		if (!(container instanceof HTMLElement)) {
		  throw new Error('StateView: First argument must be a valid HTMLElement.');
		}
	
		this.#container = container;
		this.#reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
		this.#states = this.#resolveStates(options);
	
		this.#displays = options.displays || {};
	}

  /**
   * Displays the specified state with optional configuration.
   * 
   * @param {string} state - The state to show ('loading', 'error', 'empty', 'data').
   * @param {Object} [options] - Display and animation overrides.
   * @param {string} [options.display='block'] - CSS display value for the visible state.
   * @param {string} [options.animation] - Custom animation key to override default.
   * @returns {Promise<void>} Resolves when the transition is complete.
   */
  async show(state, options = {}) {
    this.#validateState(state);
    
    const transitionId = ++this.#transitionId;

    const executeTransition = async () => {
      // Determine if there is a state currently visible or animating that needs to be hidden
      let stateToHide = null;
      if (this.#animatingState && this.#animatingState !== state) {
        stateToHide = this.#animatingState;
      } else if (this.#currentState && this.#currentState !== state) {
        stateToHide = this.#currentState;
      }

      // 1. Transition out the old state (if any)
      if (stateToHide) {
        await this.#transitionOut(stateToHide, transitionId);
      }

      // Abort if a newer transition has been requested
      if (this.#transitionId !== transitionId) return;

      // 2. Transition in the new state
      this.#animatingState = state;
      await this.#transitionIn(state, options, transitionId);

      // Abort if a newer transition has been requested during entrance
      if (this.#transitionId !== transitionId) return;

      // 3. Finalize
      this.#currentState = state;
      this.#animatingState = null;
    };

    // Fire and forget, but safely handles internal async race conditions
    executeTransition();
  }

  /**
   * Gets the currently fully visible state.
   * @returns {string|null}
   */
  get currentState() {
    return this.#currentState;
  }

  // =========================================================================
  // Private Methods
  // =========================================================================

  #validateState(state) {
    const validStates = ['loading', 'error', 'empty', 'data'];
    if (!validStates.includes(state)) {
      throw new Error(`StateView: Invalid state "${state}". Must be one of: ${validStates.join(', ')}`);
    }
  }

  #resolveStates(options = {}) {
    const validStates = ['loading', 'error', 'empty', 'data'];
    const states = {};
    const children = Array.from(this.#container.children);

    for (const state of validStates) {
      if (options.selectors && options.selectors[state]) {
        states[state] = this.#container.querySelector(options.selectors[state]);
      } else {
        // Auto-discover from direct children only
        states[state] = children.find(child => 
          child.dataset.state === state ||
          child.classList.contains(`${state}-state`) ||
          child.classList.contains(state)
        ) || null;
      }
    }

    const missing = validStates.filter(state => !states[state]);
    if (missing.length > 0) {
      throw new Error(
        `StateView: Could not identify the following state elements: ${missing.join(', ')}. ` +
        `Ensure they exist as direct children of the container (e.g., using data-state="${missing[0]}") ` +
        `or provide explicit selectors in the options.`
      );
    }

    return states;
  }

  async #transitionOut(state, transitionId) {
    const el = this.#states[state];
    if (!el) return;

    if (this.#reducedMotion) {
      el.style.display = 'none';
      return;
    }

    // Apply exit animation
    el.style.transition = `opacity ${StateView.#EXIT_ANIMATION.duration}ms ease-out, transform ${StateView.#EXIT_ANIMATION.duration}ms ease-out`;
    el.style.opacity = StateView.#EXIT_ANIMATION.exit.opacity;
    el.style.transform = StateView.#EXIT_ANIMATION.exit.transform;

    await this.#waitForTransition(el, StateView.#EXIT_ANIMATION.duration);

    // Abort check post-wait
    if (this.#transitionId !== transitionId) return;

    // Clean up and hide
    el.style.display = 'none';
    el.style.transition = '';
    el.style.opacity = '';
    el.style.transform = '';
  }

  async #transitionIn(state, options, transitionId) {
    const el = this.#states[state];
    if (!el) return;

		const displayValue = options.display
			|| this.#displays?.[state]
			|| 'block';
		
    const animConfig = options.animation 
      ? this.#getCustomAnimation(options.animation) 
      : StateView.#ANIMATIONS[state];

    if (this.#reducedMotion) {
      el.style.display = displayValue;
      el.style.opacity = '1';
      el.style.transform = 'none';
      return;
    }

    // 1. Prepare element: make it renderable but invisible
    el.style.display = displayValue;
    el.style.transition = 'none';
    el.style.opacity = animConfig.initial.opacity;
    el.style.transform = animConfig.initial.transform;

    // 2. Force reflow to ensure the browser registers the initial state
    void el.offsetWidth;

    // 3. Apply transition properties and trigger animation
    el.style.transition = `opacity ${animConfig.duration}ms ease-out, transform ${animConfig.duration}ms ease-out`;
    el.style.opacity = animConfig.enter.opacity;
    el.style.transform = animConfig.enter.transform;

    // 4. Wait for animation to complete
    await this.#waitForTransition(el, animConfig.duration);

    // Abort check post-wait
    if (this.#transitionId !== transitionId) return;

    // 5. Clean up inline transition styles so future CSS classes can apply cleanly
    el.style.transition = '';
  }

  #waitForTransition(el, duration) {
    return new Promise(resolve => {
      let resolved = false;
      
      const timeout = setTimeout(() => {
        resolved = true;
        el.removeEventListener('transitionend', handler);
        resolve();
      }, duration + 50); // Small buffer for safety

      const handler = (e) => {
        // Ensure we are listening to the correct element and relevant properties
        if (e.target === el && (e.propertyName === 'opacity' || e.propertyName === 'transform' || e.propertyName === 'all')) {
          if (!resolved) {
            resolved = true;
            clearTimeout(timeout);
            el.removeEventListener('transitionend', handler);
            resolve();
          }
        }
      };

      el.addEventListener('transitionend', handler);
    });
  }

  #getCustomAnimation(animationName) {
    // Fallback to a safe default if a custom animation name isn't mapped.
    // In a larger app, this could reference a centralized theme config.
    return StateView.#ANIMATIONS[animationName] || StateView.#ANIMATIONS.data;
  }
}

// Example Usage:
// const container = document.getElementById('my-component');
// const stateView = new StateView(container);
// 
// // Later, driven by StateManager:
// stateView.show('loading');
// setTimeout(() => {
//   stateView.show('data', { display: 'grid' });
// }, 1500);

export default StateView