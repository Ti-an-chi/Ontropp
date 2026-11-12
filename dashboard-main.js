import API from './api.js';
import { initHomeTab } from './js/tabs/home.js';
import { initExploreTab, applyExploreRouteParams } from './js/tabs/explore.js';
import { initSavedTab } from './js/tabs/saved.js';
import { initProfileTab } from './js/tabs/profile.js';

/* =========================================================
   DEV AUTH SIMULATION
   Uncomment ONE of the blocks below to test different states.
   Remove entirely when the real auth module lands.
   ========================================================= */

// Signed-out (default — no code needed)

// Signed-in as a buyer:
// API.setAuth({
//   id: 'u1',
//   username: 'Amara',
//   email: 'amara@ontropp.test',
//   avatar_url: 'https://i.pravatar.cc/150?img=47',
//   role: 'buyer',
// });

// Signed-in as a seller (adds the studio dashboard to Profile):
/* API.setAuth({
  id: 'u1',
  username: 'Amara',
  email: 'amara@ontropp.test',
  avatar_url: 'https://i.pravatar.cc/150?img=47',
  role: 'explorer',
}); */

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
let lastNavigateAt = 0;
let lastNavigateKey = '';

/* =========================================================
   HASH PARSING — #tab-id?k=v&k=v
   ========================================================= */
function parseHash(hash = window.location.hash) {
  const raw = hash.replace(/^#/, '');
  const parts = raw.split('?');
  const tabPart = parts[0] || '';
  const queryPart = parts[1] || '';
  const tabId = TABS[tabPart] ? tabPart : DEFAULT_TAB;
  return { tabId, params: new URLSearchParams(queryPart) };
}

function buildHash(tabId, params) {
  const qs = params ? params.toString() : '';
  return '#' + tabId + (qs ? '?' + qs : '');
}

/* =========================================================
   BOOT
   ========================================================= */
document.addEventListener('DOMContentLoaded', function () {
  initDashboard();
});

async function initDashboard() {
  try {
    router.currentUser = readAuth() ?? await API.getUserData();

    const route = parseHash();
    router.currentRoute = route;

    // Paint immediately — kills the skeleton flash.
    paintTab(route.tabId);

    setupTabNavigation();
    setupKebabMenu();
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
   HASH CHANGE (back/forward, deep links)
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
   NAVIGATE — exported for tab modules
   ========================================================= */
export async function navigate(tabId, params, options) {
  if (params === undefined) params = new URLSearchParams();
  options = options || {};

  // Deduplicate clicks landing within the same tick.
  const key = tabId + '?' + params.toString();
  const now = performance.now();
  if (key === lastNavigateKey && (now - lastNavigateAt) < 50) {
    return;
  }
  lastNavigateKey = key;
  lastNavigateAt = now;

  const fromHistory = !!options.fromHistory;
  const replace = !!options.replace;

  if (!TABS[tabId]) tabId = DEFAULT_TAB;

  if (TABS[tabId].requiresAuth && !router.currentUser) {
    window.location.href = SIGNIN_URL;
    return;
  }

  const sameTab = tabId === router.currentTab;
  const prevQs = router.currentRoute ? router.currentRoute.params.toString() : '';
  const nextQs = params.toString();
  const sameParams = prevQs === nextQs;

  if (!fromHistory) {
    if (router.currentTab && !sameTab) {
      router.scrollPositions.set(router.currentTab, window.scrollY);
    }

    const target = buildHash(tabId, params);
    const state = { tabId: tabId, qs: nextQs };

    if (sameTab || replace) {
      history.replaceState(state, '', target);
    } else {
      history.pushState(state, '', target);
    }
  }

  router.currentRoute = { tabId: tabId, params: params };

  if (sameTab) {
    if (!sameParams) notifyTabOfParamChange(tabId, params);
    return;
  }

  paintTab(tabId);
  await loadTab(tabId, params);

  requestAnimationFrame(function () {
    const y = router.scrollPositions.has(tabId) ? router.scrollPositions.get(tabId) : 0;
    window.scrollTo({ top: y, behavior: 'instant' });
  });
}

/* =========================================================
   PAINT
   ========================================================= */
function paintTab(tabId) {
  router.currentTab = tabId;
  document.querySelectorAll('.nav-item[data-tab]').forEach(function (l) {
    l.classList.toggle('active', l.dataset.tab === tabId);
  });
  document.querySelectorAll('.tab-content').forEach(function (c) {
    c.classList.toggle('active', c.id === tabId);
  });
}

/* =========================================================
   LOAD
   ========================================================= */
async function loadTab(tabId, params) {
  if (params === undefined) params = new URLSearchParams();
  if (router.loading.has(tabId)) return;

  if (router.loaded.has(tabId)) {
    notifyTabOfParamChange(tabId, params);
    return;
  }

  router.loading.add(tabId);
  try {
    await TABS[tabId].init({ params: params });
    router.loaded.add(tabId);
  } catch (err) {
    console.error('Failed to load ' + tabId + ':', err);
    showErrorMessage('Failed to load ' + tabId.replace('tab-', '') + ' content.');
  } finally {
    router.loading.delete(tabId);
  }
}

/* =========================================================
   PARAM CHANGE
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
  document.querySelectorAll('.nav-item[data-tab]').forEach(function (link) {
    link.addEventListener('click', function (e) {
      e.preventDefault();
      navigate(link.dataset.tab);
    });
  });

  // Generic [data-switch-tab] bridge (used by page markup).
  document.body.addEventListener('click', function (e) {
    const el = e.target.closest('[data-switch-tab]');
    if (!el) return;
    e.preventDefault();
    navigate(el.dataset.switchTab);
  });

  const searchBarLink = document.getElementById('search-bar-link');
  if (searchBarLink) {
    searchBarLink.addEventListener('click', function (e) {
      e.preventDefault();
      navigate('tab-explore');
    });
  }
}

// Legacy bridge for anyone still dispatching this event.
document.addEventListener('switchTab', function (e) {
  navigate(e.detail);
});

/* =========================================================
   KEBAB — role-aware
   ========================================================= */
function setupKebabMenu() {
  const kebabBtn = document.getElementById('profile-kebab-btn');
  const dropdown = document.getElementById('profile-dropdown');
  const studioItem = document.getElementById('setup-seller-btn');

  if (!kebabBtn || !dropdown) return;

  // Role-aware studio item.
  if (studioItem) {
    const isDesigner = router.currentUser && router.currentUser.role === 'designer';
    const span = studioItem.querySelector('span');
    const icon = studioItem.querySelector('i');

    if (isDesigner) {
      if (span) span.textContent = 'My Studio';
      if (icon) icon.className = 'fas fa-store';
      studioItem.dataset.destination = 'designerDashboard.html';
    } else {
      if (span) span.textContent = 'Open a Studio';
      if (icon) icon.className = 'fas fa-plus';
      studioItem.dataset.destination = 'openStudio.html';
    }
  }

  // Signed-out: hide everything except the "Sign in" button.
  if (!router.currentUser) {
    dropdown.querySelectorAll('.dropdown-item, .dropdown-divider').forEach(function (el) {
      el.style.display = 'none';
    });
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
      logoutBtn.style.display = '';
      const span = logoutBtn.querySelector('span');
      if (span) span.textContent = 'Sign in';
    }
  }

  // Open/close.
  kebabBtn.addEventListener('click', function (e) {
    e.stopPropagation();
    dropdown.style.display = dropdown.style.display === 'block' ? 'none' : 'block';
  });
  dropdown.addEventListener('click', function (e) {
    e.stopPropagation();
  });
  document.addEventListener('click', function () {
    dropdown.style.display = 'none';
  });

  // Studio click.
  if (studioItem) {
    studioItem.addEventListener('click', function () {
      dropdown.style.display = 'none';
      if (!router.currentUser) {
        window.location.href = SIGNIN_URL;
        return;
      }
      const dest = studioItem.dataset.destination;
      if (dest === 'openStudio.html') {
        if (confirm("Ready to start your seller journey? You'll be able to list products and grow your business.")) {
          window.location.href = dest;
        }
      } else {
        window.location.href = dest;
      }
    });
  }

  // Other menu items.
  const editProfileBtn = document.getElementById('edit-profile-btn');
  if (editProfileBtn) {
    editProfileBtn.addEventListener('click', function () {
      dropdown.style.display = 'none';
    });
  }

  const accountSettingsBtn = document.getElementById('account-settings-btn');
  if (accountSettingsBtn) {
    accountSettingsBtn.addEventListener('click', function () {
      dropdown.style.display = 'none';
      window.location.href = 'useraccountsettings.html';
    });
  }

  const helpSupportBtn = document.getElementById('help-support-btn');
  if (helpSupportBtn) {
    helpSupportBtn.addEventListener('click', function () {
      dropdown.style.display = 'none';
      window.location.href = 'help.html';
    });
  }
}

/* =========================================================
   LOGOUT
   ========================================================= */
function setupLogout() {
  const logoutBtn = document.getElementById('logout-btn');
  if (!logoutBtn) return;

  logoutBtn.addEventListener('click', function () {
    if (!router.currentUser) {
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
    console.log('raw:',raw)
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

/* =========================================================
   ERROR
   ========================================================= */
function showErrorMessage(message) {
  console.error('Error:', message);
}