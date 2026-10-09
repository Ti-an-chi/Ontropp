/**
 * toast.js
 * Global toast for errors and transient feedback.
 *
 * Requires <div id="toast-root"></div> near </body> in dashboard.html.
 *
 * Usage:
 *   showToast({ message: 'Could not load trending', actionLabel: 'Try again', onAction: fn });
 */

let root = null;
let current = null;
let timer = null;

export function showToast({ message, actionLabel, onAction, duration = 5000 }) {
  root = root || document.getElementById('toast-root');
  if (!root) return;

  dismissToast(); // only one at a time

  const el = document.createElement('div');
  el.className = 'toast';
  el.setAttribute('role', 'status');
  el.innerHTML = `
    <i class="fas fa-exclamation-circle toast-icon"></i>
    <span class="toast-message"></span>
    ${actionLabel ? `<button class="toast-action" type="button"></button>` : ''}
    <button class="toast-close" type="button" aria-label="Dismiss">
      <i class="fas fa-times"></i>
    </button>`;

  el.querySelector('.toast-message').textContent = message;

  if (actionLabel) {
    const action = el.querySelector('.toast-action');
    action.textContent = actionLabel;
    action.addEventListener('click', () => {
      dismissToast();
      try { onAction?.(); } catch (e) { console.error(e); }
    });
  }

  el.querySelector('.toast-close').addEventListener('click', dismissToast);

  root.appendChild(el);
  // force reflow so the .show class transitions in
  void el.offsetWidth;
  el.classList.add('show');

  current = el;
  timer = setTimeout(dismissToast, duration);
}

export function dismissToast() {
  if (timer) { clearTimeout(timer); timer = null; }
  if (!current) return;
  const el = current;
  current = null;
  el.classList.remove('show');
  el.addEventListener('transitionend', () => el.remove(), { once: true });
  // safety net if transitionend never fires
  setTimeout(() => el.remove(), 400);
}