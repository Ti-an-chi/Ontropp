import { setNavigate } from './js/nav.js';
import { initHomeTab } from './js/tabs/home.js';
import { initExploreTab, applyExploreRouteParams } from './js/tabs/explore.js';

/* =========================================================
   GUEST ROUTER
   Two tabs only. No auth. No kebab. No saved/profile.
   ========================================================= */

const TABS = {
  'tab-home':    { init: initHomeTab,    requiresAuth: false },
  'tab-explore': {
    init: initExploreTab,
    requiresAuth: false,
    applyRouteParams: applyExploreRouteParams,
  },
};

const DEFAULT_TAB = 'tab-home';

const router = {
  currentTab: null,
  loading: new Set(),
  loaded: new Set(),
  scrollPositions: new Map(),
  currentRoute: null,
};

let lastNavigateAt = 0;
let lastNavigateKey = '';

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

export async function navigate(tabId, params, options) {
  if (params === undefined) params = new URLSearchParams();
  options = options || {};

  const key = tabId + '?' + params.toString();
  const now = performance.now();
  if (key === lastNavigateKey && (now - lastNavigateAt) < 50) return;
  lastNavigateKey = key;
  lastNavigateAt = now;

  const fromHistory = !!options.fromHistory;
  const replace = !!options.replace;

  if (!TABS[tabId]) tabId = DEFAULT_TAB;

  const sameTab = tabId === router.currentTab;
  const prevQs = router.currentRoute ? router.currentRoute.params.toString() : '';
  const nextQs = params.toString();
  const sameParams = prevQs === nextQs;

  if (!fromHistory) {
    if (router.currentTab && !sameTab) {
      router.scrollPositions.set(router.currentTab, window.scrollY);
    }
    const target = buildHash(tabId, params);
    const state = { tabId, qs: nextQs };
    if (sameTab || replace) history.replaceState(state, '', target);
    else history.pushState(state, '', target);
  }

  router.currentRoute = { tabId, params };

  if (sameTab) {
    if (!sameParams) notifyTabOfParamChange(tabId, params);
    return;
  }

  paintTab(tabId);
  await loadTab(tabId, params);

  requestAnimationFrame(() => {
    const y = router.scrollPositions.has(tabId) ? router.scrollPositions.get(tabId) : 0;
    window.scrollTo({ top: y, behavior: 'instant' });
  });
}

function paintTab(tabId) {
  router.currentTab = tabId;
  document.querySelectorAll('.tab-content').forEach(c => {
    c.classList.toggle('active', c.id === tabId);
  });
}

async function loadTab(tabId, params) {
  if (params === undefined) params = new URLSearchParams();
  if (router.loading.has(tabId)) return;
  if (router.loaded.has(tabId)) { notifyTabOfParamChange(tabId, params); return; }

  router.loading.add(tabId);
  try {
    await TABS[tabId].init({ params });
    router.loaded.add(tabId);
  } catch (err) {
    console.error('Failed to load ' + tabId + ':', err);
  } finally {
    router.loading.delete(tabId);
  }
}

function notifyTabOfParamChange(tabId, params) {
  const mod = TABS[tabId];
  if (typeof mod.applyRouteParams === 'function') mod.applyRouteParams(params);
}

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

document.addEventListener('DOMContentLoaded', async function () {
  setNavigate(navigate);

  const route = parseHash();
  router.currentRoute = route;
  paintTab(route.tabId);
  await loadTab(route.tabId, route.params);

  window.addEventListener('hashchange', onHashChange);
  window.addEventListener('popstate', onHashChange);
});