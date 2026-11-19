// js/nav.js
// Tiny indirection so cards/home/explore can call navigate() without
// importing a specific router. Whichever main file boots the page
// registers its own navigate via setNavigate().

let _navigate = null;

export function setNavigate(fn) { _navigate = fn; }

export function navigate(tabId, params, options) {
  if (typeof _navigate === 'function') return _navigate(tabId, params, options);
  // Fallback: plain hash change so the page still responds if no router
  // has registered yet (shouldn't happen in practice).
  const qs = params ? params.toString() : '';
  window.location.hash = '#' + tabId + (qs ? '?' + qs : '');
}