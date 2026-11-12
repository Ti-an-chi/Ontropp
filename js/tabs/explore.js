import API from '/api.js';
import { showToast } from '../toast.js';
import { PieceCard } from '../cards.js';
import { createWall } from '../utility/wall.js';

const PAGE_SIZE = 12;

let CATEGORY_LABELS = { all: 'All' };

let viewer = {
  signedIn: false,
  followedDesignerIds: new Set(),
  recentlyVisitedStudioIds: new Set(),
};

// The single source of truth for the wall's state.
const filters = {
  category: 'all',
  search: '',
  location: false,
  following: false,
  recent: false,
};

let wall = null;
let echoEl = null;
let initialized = false;

/* =========================================================
   BOOT — called ONCE by router.loadTab
   ========================================================= */
export async function initExploreTab({ params } = {}) {
  if (initialized) return;
  initialized = true;

  viewer.signedIn = !!localStorage.getItem('ontrop_token');

  const mount = document.getElementById('explore-wall');
  wall = createWall(mount, {
    renderItem: PieceCard,
    fetchPage,
    pageSize: PAGE_SIZE,
    skeletonCount: 8,
    onError: (err, retry) => showToast({
      message: 'Could not load pieces.',
      actionLabel: 'Try again',
      onAction: retry,
    }),
  });
  wall.setEmptyStateResolver(emptyStateFor);
  echoEl = document.getElementById('explore-echo');

  await loadAndRenderCategories('products');

  // Apply whatever the router brought us in with.
  applyParamsToFilters(params);

  applyViewerContextToUI();
  setupExploreInteractions();
  syncFilterUI();

  await wall.reload();
}

/* =========================================================
   PARAMS → FILTERS
   Exported so the router can call it on subsequent navs.
   ========================================================= */
export function applyExploreRouteParams(params) {
  if (!initialized) return;

  const changed = applyParamsToFilters(params);
  if (!changed) return;

  syncFilterUI();
  wall.reload();
}

/**
 * Writes URLSearchParams into the `filters` object.
 * Returns true if anything changed.
 */
function applyParamsToFilters(params) {
  if (!params) return false;

  let changed = false;

  const cat = params.get('category');
  if (cat && cat !== filters.category) {
    filters.category = cat;
    changed = true;
  } else if (!cat && filters.category !== 'all') {
    // Navigating to a bare #tab-explore should reset category.
    filters.category = 'all';
    changed = true;
  }

  const q = params.get('q');
  if (q !== null && q !== filters.search) {
    filters.search = q;
    changed = true;
  }

  return changed;
}

/* =========================================================
   SYNC FILTERS → UI
   Called after init and after route-param changes.
   ========================================================= */
function syncFilterUI() {
  // Category chip
  const bar = document.getElementById('explore-filter-bar');
  bar?.querySelectorAll('.filters-chip[data-category]').forEach(chip => {
    chip.classList.toggle('active', chip.dataset.category === filters.category);
  });

  // Search box
  const searchInput = document.getElementById('explore-search');
  if (searchInput && searchInput.value !== filters.search) {
    searchInput.value = filters.search;
  }

  updateFilterEcho();
}

/* =========================================================
   CATEGORIES
   ========================================================= */
async function loadAndRenderCategories(type = 'products') {
  const bar = document.getElementById('explore-filter-bar');
  if (!bar) return;

  try {
    const categories = await API.getCategories(type, 10);

    categories.forEach(cat => { CATEGORY_LABELS[cat.id] = cat.name; });

    const toggleBtn = bar.querySelector('#explore-filter-toggle');

    Array.from(bar.querySelectorAll('.filters-chip:not([data-category="all"]):not(#explore-filter-toggle)'))
      .forEach(el => el.remove());

    categories.forEach(cat => {
      const chip = document.createElement('button');
      chip.className = 'filters-chip';
      chip.dataset.category = cat.id;
      chip.textContent = cat.name;
      bar.insertBefore(chip, toggleBtn);
    });
  } catch (error) {
    console.warn('Failed to load categories, using defaults:', error);
  }
}

/* =========================================================
   DATA
   ========================================================= */
async function fetchPage({ page, pageSize }) {
  return API.getPiecesPaginated(page, pageSize, {
    search: filters.search,
    categories: filters.category,
    followingOnly: filters.following,
  });
}

function emptyStateFor() {
  if (filters.search) {
    return {
      icon: 'fa-magnifying-glass',
      title: `No matches for "${filters.search}"`,
      body: 'Try a shorter word, or browse by category.',
    };
  }
  if (filters.category !== 'all') {
    const cat = CATEGORY_LABELS[filters.category] || filters.category;
    return {
      icon: 'fa-layer-group',
      title: `Nothing in ${cat} yet`,
      body: 'New work lands here as studios publish.',
    };
  }
  if (filters.following) {
    return {
      icon: 'fa-user-plus',
      title: "You don't follow any designers yet",
      body: 'Follow studios to see their work here.',
    };
  }
  return { icon: 'fa-compass', title: 'Nothing here yet', body: 'Try a different search or category.' };
}

/* =========================================================
   UI
   ========================================================= */
function updateFilterEcho() {
  if (!echoEl) return;
  const parts = [];
  if (filters.search) parts.push(`"${filters.search}"`);
  if (filters.category !== 'all') parts.push(CATEGORY_LABELS[filters.category] || filters.category);
  if (filters.following) parts.push('Following');
  if (filters.recent) parts.push('Recently visited');
  if (filters.location) parts.push('Near you');
  echoEl.textContent = parts.join(' · ');
  echoEl.hidden = parts.length === 0;
}

function applyViewerContextToUI() {
  const show = viewer.signedIn;
  ['filter-group-location','filter-group-following','filter-group-recent']
    .forEach(id => { const el = document.getElementById(id); if (el) el.hidden = !show; });
  const hint = document.getElementById('explore-signedout-hint');
  if (hint) hint.hidden = show;
}

/* =========================================================
   INTERACTIONS
   ========================================================= */
function setupExploreInteractions() {
  const searchInput = document.getElementById('explore-search');
  if (searchInput) {
    let t;
    searchInput.addEventListener('input', function () {
      clearTimeout(t);
      t = setTimeout(() => {
        filters.search = this.value.trim();

        // Push search into the URL so back/forward works on it too.
        const params = new URLSearchParams(routerParams());
        if (filters.search) params.set('q', filters.search);
        else params.delete('q');
        history.replaceState({ tabId: 'tab-explore', qs: params.toString() },
                             '', buildHash('tab-explore', params));
        router.currentRoute = { tabId: 'tab-explore', params };

        updateFilterEcho();
        wall.reload();
      }, 400);
    });
  }

  // Chips — delegated so it works after loadAndRenderCategories.
  const bar = document.getElementById('explore-filter-bar');
  bar?.addEventListener('click', (e) => {
    const chip = e.target.closest('.filters-chip[data-category]');
    if (!chip || chip.id === 'explore-filter-toggle') return;

    const categoryId = chip.dataset.category;

    // Do the URL navigation. The router will call applyExploreRouteParams,
    // which updates filters + UI + reloads the wall.
    const params = new URLSearchParams(routerParams());
    if (categoryId && categoryId !== 'all') params.set('category', categoryId);
    else params.delete('category');

    document.dispatchEvent(new CustomEvent('switchTab', { detail: 'tab-explore' })); // ensure on explore
    navigate('tab-explore', params, { replace: true });  // replace: chip clicks don't spam history
  });

  // Filters panel
  const toggle = document.getElementById('explore-filter-toggle');
  const panel  = document.getElementById('explore-filter-panel');
  toggle?.addEventListener('click', (e) => {
    e.stopPropagation();
    const open = panel.classList.toggle('open');
    toggle.classList.toggle('active', open);
  });

  bindToggle('filter-location-toggle',  'location');
  bindToggle('filter-following-toggle', 'following');
  bindToggle('filter-recent-toggle',    'recent');

  document.addEventListener('click', (e) => {
    if (!panel?.classList.contains('open')) return;
    if (e.target.closest('#explore-filter-panel')) return;
    if (e.target.closest('#explore-filter-toggle')) return;
    panel.classList.remove('open');
    toggle?.classList.remove('active');
  });

  document.getElementById('explore-signin-link')?.addEventListener('click', (e) => {
    e.preventDefault();
    window.location.href = 'signup.html';
  });
}

function bindToggle(elId, key) {
  const el = document.getElementById(elId);
  if (!el) return;
  el.addEventListener('click', () => {
    if (!viewer.signedIn) return;
    filters[key] = !filters[key];
    el.classList.toggle('active', filters[key]);
    updateFilterEcho();
    wall.reload();
  });
}

/** Snapshot of current non-search filters as a plain object → URLSearchParams */
function routerParams() {
  const p = new URLSearchParams();
  if (filters.category !== 'all') p.set('category', filters.category);
  // Note: search is handled by the input's own debounce.
  return p;
}