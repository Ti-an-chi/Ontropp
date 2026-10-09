/**
 * state.js
 * Minimal state machine for a section with three visible states:
 * loading / empty / data.
 *
 * Contract:
 *   - The root element contains children with [data-state="loading|empty|data"].
 *   - This module only toggles the `hidden` attribute.
 *   - CSS owns the fade/transition (via :not([hidden]) and animation).
 *   - Errors are NOT a state here — they go through toast.js.
 *
 * Usage:
 *   const sv = createStateView(document.querySelector('[data-state-view="trending"]'));
 *   sv.loading();        // show loading sibling
 *   sv.data();           // show data sibling (call AFTER filling it)
 *   sv.empty();          // show empty sibling
 *   sv.dataEl            // the [data-state="data"] element, for rendering into
 */

export function createStateView(root) {
  if (!root) return null;

  const states = {
    loading: root.querySelector('[data-state="loading"]'),
    empty:   root.querySelector('[data-state="empty"]'),
    data:    root.querySelector('[data-state="data"]'),
  };

  function swap(active) {
    for (const [name, el] of Object.entries(states)) {
      if (!el) continue;
      el.hidden = name !== active;
    }
    root.dataset.state = active;
  }

  return {
    loading: () => swap('loading'),
    empty:   () => swap('empty'),
    data:    () => swap('data'),
    dataEl:  states.data,
    root,
  };
}