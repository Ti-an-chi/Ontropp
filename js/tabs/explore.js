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

import API from '/api.js';
import { showToast } from '../toast.js';
import { PieceCard } from '../cards.js';
import { createWall } from '../utility/wall.js';

const PAGE_SIZE = 12;

// We'll keep a default map for fallback, but we'll update this dynamically
let CATEGORY_LABELS = {
  all: 'All',
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
  viewer.signedIn = !!localStorage.getItem('ontrop_token');

  // 2. Build the wall
  const mount = document.getElementById('explore-wall')?.parentElement
    ? document.getElementById('explore-wall')
    : null;

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

  // 3. Load Categories & Render Chips
  await loadAndRenderCategories('products');

  // 4. UI wiring
  applyViewerContextToUI();
  setupExploreInteractions();

  // 5. First load
  await wall.reload();
}

/* =========================================================
 CATEGORIES & UI RENDERING
 ========================================================= */
async function loadAndRenderCategories(type = 'products') {
  const bar = document.getElementById('explore-filter-bar');
  if (!bar) return;

  try {
    // Fetch categories using your existing API method
    // Note: Ensure API.getCategories exists or use the hardcoded one if API isn't ready
    const categories = await API.getCategories(type, 10); 
    
    // Update our label map for empty states/echo
    categories.forEach(cat => {
      CATEGORY_LABELS[cat.id] = cat.name;
    });

    // Clear existing chips except "All" and "Filters" button
    // We'll rebuild the middle section
    const allChip = bar.querySelector('[data-category="all"]');
    const toggleBtn = bar.querySelector('#explore-filter-toggle');
    
    // Remove old category chips
    Array.from(bar.querySelectorAll('.filters-chip:not([data-category="all"]):not(#explore-filter-toggle)'))
      .forEach(el => el.remove());

    // Create new chips
    categories.forEach(cat => {
      const chip = document.createElement('button');
      chip.className = 'filters-chip';
      chip.dataset.category = cat.id;
      chip.textContent = cat.name;
      
      // Insert before the toggle button
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
    // recentOnly: filters.recent,
    // location: filters.location
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

  // Category chips (Delegated event listener for dynamic chips)
  const bar = document.getElementById('explore-filter-bar');
  if (bar) {
    bar.addEventListener('click', (e) => {
      const chip = e.target.closest('.filters-chip[data-category]');
      if (!chip || chip.id === 'explore-filter-toggle') return;

      // Update active state
      bar.querySelectorAll('.filters-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');

      // Update filter
      filters.category = chip.dataset.category;
      updateFilterEcho();
      wall.reload();
    });
  }

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