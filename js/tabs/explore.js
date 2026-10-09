/**
 * explore.js
 * Explore tab orchestrator.
 *
 * Owns:
 *   - viewer context (signed in/out, followed designers, recent studios)
 *   - active filters (one object, one source of truth)
 *   - the filter bar UI (chips, panel, echo, search input)
 *   - the empty-state resolver (so messages match the filter)
 *
 * Delegates:
 *   - pagination + masonry + sentinel → createWall
 *   - card markup                     → PieceCard
 *   - error UI                        → toast
 */

import API from '../../api.mock.js';
import { showToast } from '../toast.js';
import { PieceCard } from '../cards.js';
import { createWall } from '../utility/wall.js';

const PAGE_SIZE = 12;

const CATEGORY_LABELS = {
  all: 'All',
  textiles: 'Textiles',
  tailoring: 'Tailoring',
  jewellery: 'Jewellery',
  objects: 'Objects',
  beauty: 'Beauty',
  print: 'Print',
};

let viewer = {
  signedIn: false,
  followedDesignerIds: new Set(),
  recentlyVisitedStudioIds: new Set(),
};

const filters = {
  category: 'all',
  search: '',
  location: false,
  following: false,
  recent: false,
};

let wall = null;
let echoEl = null;

/* =========================================================
   BOOT
   ========================================================= */

export async function initExploreTab() {
  // 1. Viewer context (once)
  const ctx = await API.getViewerContext();
  viewer.signedIn = !!ctx.signedIn;
  viewer.followedDesignerIds = new Set(ctx.followedDesignerIds || []);
  viewer.recentlyVisitedStudioIds = new Set(ctx.recentlyVisitedStudioIds || []);

  // 2. Build the wall
  const mount = document.getElementById('explore-wall')?.parentElement
    ? document.getElementById('explore-wall')
    : null;

  // The HTML provides #explore-wall as the mount point.
  // createWall replaces its innerHTML with the state wrapper.
  wall = createWall(mount, {
    renderItem: PieceCard,
    fetchPage: fetchPage,
    pageSize: PAGE_SIZE,
    skeletonCount: 8,
    onError: (err, retry) => {
      showToast({
        message: 'Could not load pieces.',
        actionLabel: 'Try again',
        onAction: retry,
      });
    },
  });

  wall.setEmptyStateResolver(emptyStateFor);

  echoEl = document.getElementById('explore-echo');

  // 3. UI wiring
  applyViewerContextToUI();
  setupExploreInteractions();

  // 4. First load
  await wall.reload();
}

/* =========================================================
   DATA
   ========================================================= */

async function fetchPage({ page, pageSize }) {
  // Server applies viewer refinements so pagination stays honest.
  return API.getProducts({
    page,
    limit: pageSize,
    search: filters.search,
    category: filters.category,
    followingOnly: filters.following,
    recentOnly: filters.recent,
    viewerContext: viewer.signedIn
      ? {
          followedDesignerIds: [...viewer.followedDesignerIds],
          recentlyVisitedStudioIds: [...viewer.recentlyVisitedStudioIds],
        }
      : null,
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
  if (filters.search) parts.push(`"${filters.search}"`);
  if (filters.category !== 'all') parts.push(CATEGORY_LABELS[filters.category] || filters.category);
  if (filters.following) parts.push('Following');
  if (filters.recent) parts.push('Recently visited');
  if (filters.location) parts.push('Near you');

  echoEl.textContent = parts.join(' · ');
  echoEl.hidden = parts.length === 0;
}

function applyViewerContextToUI() {
  const locationGroup  = document.getElementById('filter-group-location');
  const followingGroup = document.getElementById('filter-group-following');
  const recentGroup    = document.getElementById('filter-group-recent');
  const hint           = document.getElementById('explore-signedout-hint');

  const show = viewer.signedIn;
  if (locationGroup)  locationGroup.hidden  = !show;
  if (followingGroup) followingGroup.hidden = !show;
  if (recentGroup)    recentGroup.hidden    = !show;
  if (hint)           hint.hidden           = show;
}

function setupExploreInteractions() {
  // Search (debounced)
  const searchInput = document.getElementById('explore-search');
  if (searchInput) {
    let t;
    searchInput.addEventListener('input', function () {
      clearTimeout(t);
      t = setTimeout(() => {
        filters.search = this.value.trim();
        updateFilterEcho();
        wall.reload();
      }, 400);
    });
  }

  // Category chips
  const chips = document.querySelectorAll('#explore-filter-bar .filters-chip[data-category]');
  chips.forEach(chip => {
    chip.addEventListener('click', function () {
      chips.forEach(c => c.classList.remove('active'));
      this.classList.add('active');
      filters.category = this.dataset.category;
      updateFilterEcho();
      wall.reload();
    });
  });

  // Filters panel toggle
  const toggle = document.getElementById('explore-filter-toggle');
  const panel  = document.getElementById('explore-filter-panel');
  toggle?.addEventListener('click', (e) => {
    e.stopPropagation();
    const open = panel.classList.toggle('open');
    toggle.classList.toggle('active', open);
  });

  // Individual toggles
  bindToggle('filter-location-toggle',  'location');
  bindToggle('filter-following-toggle', 'following');
  bindToggle('filter-recent-toggle',    'recent');

  // Click-outside closes panel
  document.addEventListener('click', (e) => {
    if (!panel?.classList.contains('open')) return;
    if (e.target.closest('#explore-filter-panel')) return;
    if (e.target.closest('#explore-filter-toggle')) return;
    panel.classList.remove('open');
    toggle?.classList.remove('active');
  });

  // Sign-in link
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