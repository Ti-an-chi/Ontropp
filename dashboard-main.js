import API from './api.js';
import { initHomeTab } from './js/tabs/home.js';
import { initExploreTab, applyExploreRouteParams } from './js/tabs/explore.js';
import { initSavedTab } from './js/tabs/saved.js';
import { initProfileTab } from './js/tabs/profile.js';

/* =========================================================
   DEV AUTH SIMULATION
   (keep your existing comment block here)
   ========================================================= */

/* =========================================================
   TAB REGISTRY
   ========================================================= */
const TABS = {
  'tab-home':    { init: initHomeTab,    requiresAuth: false },
  'tab-explore': {
    init: initExploreTab,
    requiresAuth: false,
    applyRouteParams: applyExploreRouteParams,
  },
  'tab-saved':   { init: initSavedTab,   requiresAuth: true  },
  'tab-profile': { init: initProfileTab, requiresAuth: true  },
};

const DEFAULT_TAB = 'tab-home';
const SIGNIN_URL  = 'signup.html?mode=signin';

/* =========================================================
   ROUTER STATE
   ========================================================= */
const router = {
  currentTab: null,
  currentUser: null,
  loading: new Set(),
  loaded: new Set(),
  scrollPositions: new Map(),
  currentRoute: null,
};

/* =========================================================
   HASH PARSING — #tab-id?k=v&k=v
   ========================================================= */
function parseHash(hash = window.location.hash) {
  const raw = hash.replace(/^#/, '');
  const [tabPart, queryPart = ''] = raw.split('?');
  const tabId = TABS[tabPart] ? tabPart : DEFAULT_TAB;
  return { tabId, params: new URLSearchParams(queryPart) };
}

function buildHash(tabId, params) {
  const qs = params ? params.toString() : '';
  return `#${tabId}${qs ? '?' + qs : ''}`;
}

/* =========================================================
   BOOT
   ========================================================= */
document.addEventListener('DOMContentLoaded', () => {
  initDashboard();
});

async function initDashboard() {
  try {
    router.currentUser = readAuth() || API.getUserData();

    const route = parseHash();
    router.currentRoute = route;

    // Paint immediately — no skeleton flash.
    paintTab(route.tabId);

    setupTabNavigation();
    setupKebabMenu();          // role-aware, replaces old setupGlobalEventListeners
    setupLogout();

    await loadTab(route.tabId, route.params);

    window.addEventListener('hashchange', onHashChange);
    window.addEventListener('popstate', onHashChange);

  } catch (error) {
    console.error('Failed to initialize dashboard:', error);
    showErrorMessage('Failed to load dashboard. Please refresh the page.');
  }
}

/* =========================================================
   HASH CHANGE
   ========================================================= */
function onHashChange() {
  const route = parseHash();
  const prev = router.currentRoute;

  if (prev && prev.tabId === route.tabId) {
    router.currentRoute = route;
    notifyTabOfParamChange(route.tabId, route.params);
    return;
  }

  navigate(route.tabId, route.params, { fromHistory: true });
}

/* =========================================================
   NAVIGATE — the public verb. Exported for tab modules.
   ========================================================= */
export async function navigate(tabId, params = new URLSearchParams(), { fromHistory = false, replace = false } = {}) {
  if (!TABS[tabId]) tabId = DEFAULT_TAB;

  if (TABS[tabId].requiresAuth && !router.currentUser) {
    window.location.href = SIGNIN_URL;
    return;
  }

  const sameTab = tabId === router.currentTab;
  const sameParams = params.toString() === (router.currentRoute?.params.toString() ?? '');

  if (!fromHistory) {
    if (router.currentTab && !sameTab) {
      router.scrollPositions.set(router.currentTab, window.scrollY);
    }

    const target = buildHash(tabId, params);

    if (sameTab || replace) {
      history.replaceState({ tabId, qs: params.toString() }, '', target);
    } else {
      history.pushState({ tabId, qs: params.toString() }, '', target);
    }
  }

  router.currentRoute = { tabId, params };

  if (sameTab) {
    if (!sameParams) notifyTabOfParamChange(tabId, params);
    return;
  }

  paintTab(tabId);
  await loadTab(tabId, params);

  requestAnimationFrame(() => {
    const y = router.scrollPositions.get(tabId);
    window.scrollTo({ top: y ?? 0 });
  });
}

/* =========================================================
   PAINT
   ========================================================= */
function paintTab(tabId) {
  router.currentTab = tabId;
  document.querySelectorAll('.nav-item[data-tab]').forEach(l =>
    l.classList.toggle('active', l.dataset.tab === tabId));
  document.querySelectorAll('.tab-content').forEach(c =>
    c.classList.toggle('active', c.id === tabId));
}

/* =========================================================
   LOAD
   ========================================================= */
async function loadTab(tabId, params = new URLSearchParams()) {
  if (router.loading.has(tabId)) return;

  if (router.loaded.has(tabId)) {
    notifyTabOfParamChange(tabId, params);
    return;
  }

  router.loading.add(tabId);
  try {
    await TABS[tabId].init({ params });
    router.loaded.add(tabId);
  } catch (err) {
    console.error(`Failed to load ${tabId}:`, err);
    showErrorMessage(`Failed to load ${tabId.replace('tab-', '')} content.`);
  } finally {
    router.loading.delete(tabId);
  }
}

/* =========================================================
   PARAM CHANGE NOTIFICATION
   ========================================================= */
function notifyTabOfParamChange(tabId, params) {
  const mod = TABS[tabId];
  if (typeof mod.applyRouteParams === 'function') {
    mod.applyRouteParams(params);
  }
}

/* =========================================================
   TAB BAR WIRING
   ========================================================= */
function setupTabNavigation() {
  document.querySelectorAll('.nav-item[data-tab]').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      navigate(link.dataset.tab);
    });
  });

  document.body.addEventListener('click', (e) => {
    const el = e.target.closest('[data-switch-tab]');
    if (!el) return;
    e.preventDefault();
    navigate(el.dataset.switchTab);
  });

  document.getElementById('search-bar-link')?.addEventListener('click', (e) => {
    e.preventDefault();
    navigate('tab-explore');
  });
}

/* Legacy bridge — keep until all internal callers migrate to `navigate`. */
document.addEventListener('switchTab', (e) => navigate(e.detail));

/* =========================================================
   KEBAB — role-aware
   ========================================================= */
function setupKebabMenu() {
  const kebabBtn   = document.getElementById('profile-kebab-btn');
  const dropdown   = document.getElementById('profile-dropdown');
  const studioItem = document.getElementById('setup-seller-btn');

  if (!kebabBtn || !dropdown) return;

  // ---- Role-aware studio label + destination ----
  if (studioItem) {
    const isDesigner = router.currentUser?.role === 'designer';
    const span = studioItem.querySelector('span');
    const icon = studioItem.querySelector('i');

    if (isDesigner) {
      if (span)  span.textContent = 'My Studio';
      if (icon)  icon.className   = 'fas fa-store';
      studioItem.dataset.destination = 'designerDashboard.html';
    } else {
      if (span)  span.textContent = 'Open a Studio';
      if (icon)  icon.className   = 'fas fa-plus';
      studioItem.dataset.destination = 'openStudio.html';
    }
  }

  // ---- If signed out, show only a "Sign in" item ----
  if (!router.currentUser) {
    dropdown.querySelectorAll('.dropdown-item, .dropdown-divider').forEach(el => {
      el.style.display = 'none';
    });
    // Unhide the logout button but relabel it.
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
      logoutBtn.style.display = '';
      const span = logoutBtn.querySelector('span');
      if (span) span.textContent = 'Sign in';
    }
  }

  // ---- Open/close ----
  kebabBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    dropdown.style.display = dropdown.style.display === 'block' ? 'none' : 'block';
  });
  dropdown.addEventListener('click', (e) => e.stopPropagation());
  document.addEventListener('click', () => { dropdown.style.display = 'none'; });

  // ---- Studio click ----
  studioItem?.addEventListener('click', () => {
    dropdown.style.display = 'none';
    if (!router.currentUser) {
      window.location.href = SIGNIN_URL;
      return;
    }
    const dest = studioItem.dataset.destination;
    if (dest === 'openStudio.html') {
      if (confirm('Ready to start your seller journey? You\'ll be able to list products and grow your business.')) {
        window.location.href = dest;
      }
    } else {
      window.location.href = dest;
    }
  });

  // ---- Other menu items ----
  document.getElementById('edit-profile-btn')?.addEventListener('click', () => {
    dropdown.style.display = 'none';
    document.getElementById('edit-profile-btn')?.blur();
    // Handled by profile.js via avatar.openPicker(); if signed out this is hidden.
  });

  document.getElementById('account-settings-btn')?.addEventListener('click', () => {
    dropdown.style.display = 'none';
    window.location.href = 'useraccountsettings.html';
  });

  document.getElementById('help-support-btn')?.addEventListener('click', () => {
    dropdown.style.display = 'none';
    window.location.href = 'help.html';
  });
}

/* =========================================================
   LOGOUT
   ========================================================= */
function setupLogout() {
  const logoutBtn = document.getElementById('logout-btn');
  if (!logoutBtn) return;

  logoutBtn.addEventListener('click', () => {
    if (!router.currentUser) {
      // Signed-out state: this button is a "Sign in" CTA.
      window.location.href = SIGNIN_URL;
      return;
    }
    API.clearTokens();
    window.location.href = SIGNIN_URL;
  });
}

/* =========================================================
   AUTH HELPER
   ========================================================= */
function readAuth() {
  try {
    const raw = sessionStorage.getItem('ontrop_user');
    const data = raw ? JSON.parse(raw) : null;
    
    console.log(raw);
    return data;
  } catch { return null; }
}

/* =========================================================
   ERROR
   ========================================================= */
function showErrorMessage(message) {
  console.error('Error:', message);
}