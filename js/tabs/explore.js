/**
 * explore.js
 * Explore tab orchestrator.
 *
 * Owns:
 *   - viewer context
 *   - active filters
 *   - filter bar UI
 *   - the empty-state resolver
 *
 * Delegates:
 *   - pagination + masonry → createWall
 *   - card markup          → PieceCard
 *   - error UI             → toast
 */

import API from '/api.js';
import { showToast } from '../toast.js';
import { PieceCard } from '../cards.js';
import { createWall } from '../utility/wall.js';

const PAGE_SIZE = 12;

let CATEGORY_LABELS = { all: 'All' };
const ORDER_LABELS = { newest: 'Newest', trending: 'Trending', recommended: 'Recommended' };
const VALID_ORDERS = new Set(['newest', 'trending', 'recommended']);

let viewer = {
  signedIn: false,
  followedDesignerIds: new Set(),
  recentlyVisitedStudioIds: new Set(),
};

const filters = {
  category: 'all',
  search: '',
  order: null,
  location: false,
  following: false,
  recent: false,
};

let wall = null;
let echoEl = null;
let initialized = false;

/* =========================================================
   BOOT — called once by the router
   ========================================================= */
export async function initExploreTab({ params } = {}) {
  if (initialized) return;
  initialized = true;

  viewer.signedIn = !!localStorage.getItem('ontrop_token');

  const mount = document.getElementById('explore-wall');
  wall = createWall(mount, {
    renderItem: PieceCard,
    fetchPage: fetchPage,
    pageSize: PAGE_SIZE,
    skeletonCount: 8,
    onError: function (err, retry) {
      showToast({
        message: 'Could not load pieces.',
        actionLabel: 'Try again',
        onAction: retry,
      });
    },
  });
  wall.setEmptyStateResolver(emptyStateFor);
  echoEl = document.getElementById('explore-echo');

  await loadAndRenderCategories('products');

  applyParamsToFilters(params);

  applyViewerContextToUI();
  setupExploreInteractions();
  syncFilterUI();

  await wall.reload();
}

/* =========================================================
   ROUTE PARAMS → FILTERS
   Called by the router on subsequent navigations.
   ========================================================= */
export function applyExploreRouteParams(params) {
  if (!initialized) return;

  const changed = applyParamsToFilters(params);
  if (!changed) return;

  syncFilterUI();
  wall.reload();
}

function applyParamsToFilters(params) {
  if (!params) return false;
  let changed = false;

  const cat = params.get('category');
  if (cat && cat !== filters.category) {
    filters.category = cat;
    changed = true;
  } else if (!cat && filters.category !== 'all') {
    filters.category = 'all';
    changed = true;
  }

  const q = params.get('q');
  if (q !== null && q !== filters.search) {
    filters.search = q;
    changed = true;
  }

  const order = params.get('order');
  const normalized = VALID_ORDERS.has(order) ? order : null;
  if (normalized !== filters.order) {
    filters.order = normalized;
    changed = true;
  }

  return changed;
}

/* =========================================================
   SYNC FILTERS → UI
   ========================================================= */
function syncFilterUI() {
  const bar = document.getElementById('explore-filter-bar');
  if (bar) {
    bar.querySelectorAll('.filters-chip[data-category]').forEach(function (chip) {
      chip.classList.toggle('active', chip.dataset.category === filters.category);
    });
  }

  const searchInput = document.getElementById('explore-search');
  if (searchInput && searchInput.value !== filters.search) {
    searchInput.value = filters.search;
  }

  updateFilterEcho();
}

/* =========================================================
   CATEGORIES
   ========================================================= */
async function loadAndRenderCategories(type) {
  if (type === undefined) type = 'products';
  const bar = document.getElementById('explore-filter-bar');
  if (!bar) return;

  try {
    const categories = await API.getCategories(type, 10);
    categories.forEach(function (cat) {
      CATEGORY_LABELS[cat.id] = cat.name;
    });

    const toggleBtn = bar.querySelector('#explore-filter-toggle');

    Array.from(
      bar.querySelectorAll('.filters-chip:not([data-category="all"]):not(#explore-filter-toggle)')
    ).forEach(function (el) { el.remove(); });

    categories.forEach(function (cat) {
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
  const opts = {
    search: filters.search,
    categories: filters.category,
    followingOnly: filters.following,
  };
  if (filters.order) opts.order = filters.order;
  return API.getPiecesPaginated(page, pageSize, opts);
}

function emptyStateFor() {
  if (filters.search) {
    return {
      icon: 'fa-magnifying-glass',
      title: 'No matches for "' + filters.search + '"',
      body: 'Try a shorter word, or browse by category.',
    };
  }
  if (filters.category !== 'all') {
    const cat = CATEGORY_LABELS[filters.category] || filters.category;
    return {
      icon: 'fa-layer-group',
      title: 'Nothing in ' + cat + ' yet',
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
  if (filters.recent) {
    return {
      icon: 'fa-clock-rotate-left',
      title: 'No recently visited studios',
      body: 'Studios you visit will appear here.',
    };
  }
  return {
    icon: 'fa-compass',
    title: 'Nothing here yet',
    body: 'Try a different search or category.',
  };
}

/* =========================================================
   UI
   ========================================================= */
function updateFilterEcho() {
  if (!echoEl) return;
  const parts = [];
  if (filters.search) parts.push('"' + filters.search + '"');
  if (filters.category !== 'all') {
    parts.push(CATEGORY_LABELS[filters.category] || filters.category);
  }
  if (filters.order) parts.push(ORDER_LABELS[filters.order]);
  if (filters.following) parts.push('Following');
  if (filters.recent) parts.push('Recently visited');
  if (filters.location) parts.push('Near you');
  echoEl.textContent = parts.join(' · ');
  echoEl.hidden = parts.length === 0;
}

function applyViewerContextToUI() {
  const show = viewer.signedIn;
  ['filter-group-location', 'filter-group-following', 'filter-group-recent'].forEach(function (id) {
    const el = document.getElementById(id);
    if (el) el.hidden = !show;
  });
  const hint = document.getElementById('explore-signedout-hint');
  if (hint) hint.hidden = show;
}

/* =========================================================
   INTERACTIONS
   ========================================================= */
function setupExploreInteractions() {
  setupSearch();
  setupCategoryChips();
  setupFiltersPanel();
  setupSigninLink();
}

function setupSearch() {
  const searchInput = document.getElementById('explore-search');
  if (!searchInput) return;

  let timer = null;
  searchInput.addEventListener('input', function () {
    clearTimeout(timer);
    const value = this.value.trim();

    timer = setTimeout(function () {
      filters.search = value;

      // Write the URL WITHOUT touching the router state machine.
      // The router only cares about tab-level navigation.
      const params = currentParamsForUrl();
      if (value) params.set('q', value);
      else params.delete('q');

      const target = '#tab-explore' + (params.toString() ? '?' + params.toString() : '');
      history.replaceState({ tabId: 'tab-explore', qs: params.toString() }, '', target);

      updateFilterEcho();
      wall.reload();
    }, 400);
  });
}

function setupCategoryChips() {
  const bar = document.getElementById('explore-filter-bar');
  if (!bar) return;

  bar.addEventListener('click', function (e) {
    const chip = e.target.closest('.filters-chip[data-category]');
    if (!chip) return;
    if (chip.id === 'explore-filter-toggle') return;

    const categoryId = chip.dataset.category;
    if (categoryId === filters.category) return;

    filters.category = categoryId;

    // Local UI update.
    bar.querySelectorAll('.filters-chip').forEach(function (c) {
      c.classList.remove('active');
    });
    chip.classList.add('active');

    // URL — replace, not push. Chip clicks shouldn't spam history.
    const params = currentParamsForUrl();
    if (categoryId && categoryId !== 'all') params.set('category', categoryId);
    else params.delete('category');
    history.replaceState({ tabId: 'tab-explore', qs: params.toString() }, '',
                         '#tab-explore' + (params.toString() ? '?' + params.toString() : ''));

    updateFilterEcho();
    wall.reload();
  });
}

function setupFiltersPanel() {
  const toggle = document.getElementById('explore-filter-toggle');
  const panel = document.getElementById('explore-filter-panel');

  if (toggle && panel) {
    toggle.addEventListener('click', function (e) {
      e.stopPropagation();
      const open = panel.classList.toggle('open');
      toggle.classList.toggle('active', open);
    });

    document.addEventListener('click', function (e) {
      if (!panel.classList.contains('open')) return;
      if (e.target.closest('#explore-filter-panel')) return;
      if (e.target.closest('#explore-filter-toggle')) return;
      panel.classList.remove('open');
      toggle.classList.remove('active');
    });
  }

  bindToggle('filter-location-toggle', 'location');
  bindToggle('filter-following-toggle', 'following');
  bindToggle('filter-recent-toggle', 'recent');
}

function bindToggle(elId, key) {
  const el = document.getElementById(elId);
  if (!el) return;
  el.addEventListener('click', function () {
    if (!viewer.signedIn) return;
    filters[key] = !filters[key];
    el.classList.toggle('active', filters[key]);
    updateFilterEcho();
    wall.reload();
  });
}

function setupSigninLink() {
  const link = document.getElementById('explore-signin-link');
  if (!link) return;
  link.addEventListener('click', function (e) {
    e.preventDefault();
    window.location.href = 'signup.html';
  });
}

/* Build the URLSearchParams that reflect non-search filters. */
function currentParamsForUrl() {
  const p = new URLSearchParams();
  if (filters.category !== 'all') p.set('category', filters.category);
  if (filters.order) p.set('order', filters.order);
  if (filters.search) p.set('q', filters.search);
  return p;
}