/**
 * saved.js
 * The Saved tab.
 *
 * Framing: this is a moodboard, not a shopping shortlist.
 * No prices, no ratings, no "Order Now." Just your curated pieces.
 *
 * Owns:
 *   - scope ('all' | 'studio' | 'mood')
 *   - active studio filter
 *   - active mood filter
 *   - search term
 *   - header count
 *   - the studio strip (built from the saved set)
 *
 * Delegates:
 *   - the wall                    → createWall
 *   - card markup                 → SavedPieceCard
 *   - piece page navigation       → SavedPieceCard's <a href>
 *   - toasts                      → toast.js
 */

import API from '../../api.mock.js';
import { createWall } from '../utility/wall.js';
import { SavedPieceCard } from '../cards.js';
import { showToast } from '../toast.js';

const PAGE_SIZE = 48;

const CATEGORY_LABELS = {
  textiles: 'Textiles',
  tailoring: 'Tailoring',
  jewellery: 'Jewellery',
  objects: 'Objects',
  beauty: 'Beauty',
  print: 'Print',
};

const state = {
  scope: 'all',        // 'all' | 'studio' | 'mood'
  studioId: null,
  moodId: null,
  search: '',
};

let wall = null;
let allSaved = [];     // full set, for counting + building the studio strip

/* =========================================================
   BOOT
   ========================================================= */

export async function initSavedTab() {
  const mount = document.getElementById('saved-wall');
  if (!mount) return;

  wall = createWall(mount, {
    renderItem: (item) => SavedPieceCard(item, { onRemove: handleRemove }),
    fetchPage: fetchSavedPage,
    pageSize: PAGE_SIZE,
    skeletonCount: 6,
    onError: (err, retry) => {
      showToast({
        message: 'Could not load your saved pieces.',
        actionLabel: 'Try again',
        onAction: retry,
      });
    },
  });

  wall.setEmptyStateResolver(emptyStateFor);

  setupScopeChips();
  setupSearch();
  setupStudioStrip();

  await refresh();
}

async function refresh() {
  // Fetch the whole set once so we can build the studio strip
  // and count. The wall re-fetches from the same source with
  // the current filters applied.
  try {
    const res = await API.getSaved({ page: 1, limit: 200 });
    allSaved = res.data || [];
  } catch (err) {
    allSaved = [];
  }

  renderStudioStrip();
  updateHeaderCount();
  await wall.reload();
}

/* =========================================================
   DATA
   ========================================================= */

async function fetchSavedPage({ page, pageSize }) {
  // The mock doesn't support server-side filtering for saved yet,
  // so we filter here. When the backend adds support, move these
  // params into the API call and drop the client-side step.
  const res = await API.getSaved({ page: 1, limit: 500 });
  let items = res.data || [];

  if (state.search) {
    const q = state.search.toLowerCase();
    items = items.filter(p =>
      p.title.toLowerCase().includes(q) ||
      p.studio_name.toLowerCase().includes(q)
    );
  }
  if (state.scope === 'studio' && state.studioId) {
    items = items.filter(p => p.studio_id === state.studioId);
  }
  if (state.scope === 'mood' && state.moodId) {
    items = items.filter(p => p.category === state.moodId);
  }

  // Client-side pagination over the filtered slice
  const start = (page - 1) * pageSize;
  const slice = items.slice(start, start + pageSize);
  return {
    data: slice,
    pagination: {
      hasNextPage: start + pageSize < items.length,
    },
  };
}

/* =========================================================
   HEADER + STRIPS
   ========================================================= */

function updateHeaderCount() {
  const el = document.getElementById('saved-count');
  if (!el) return;
  const n = allSaved.length;
  el.textContent = n === 0
    ? 'Nothing saved yet'
    : `${n} ${n === 1 ? 'piece' : 'pieces'}`;
}

function renderStudioStrip() {
  const strip = document.getElementById('saved-studio-strip');
  if (!strip) return;

  if (state.scope !== 'studio') {
    strip.hidden = true;
    return;
  }

  // Unique studios in the saved set, in the order they appear
  const seen = new Set();
  const studios = [];
  for (const p of allSaved) {
    if (seen.has(p.studio_id)) continue;
    seen.add(p.studio_id);
    studios.push({
      id: p.studio_id,
      name: p.studio_name,
      // image_url is a piece image; good enough for a strip avatar.
      // A real API would return studio.cover_url.
      avatar: p.image_url,
    });
  }

  strip.innerHTML = '';
  studios.forEach(s => {
    const btn = document.createElement('button');
    btn.className = 'saved-studio' + (state.studioId === s.id ? ' active' : '');
    btn.dataset.studioId = s.id;
    btn.innerHTML = `
      <div class="saved-studio-avatar" style="background-image:url('${s.avatar}')"></div>
      <div class="saved-studio-name">${s.name}</div>
    `;
    btn.addEventListener('click', () => {
      state.studioId = state.studioId === s.id ? null : s.id;
      renderStudioStrip();
      wall.reload();
    });
    strip.appendChild(btn);
  });

  strip.hidden = studios.length === 0;
}

/* =========================================================
   UI WIRING
   ========================================================= */

function setupScopeChips() {
  const chips = document.querySelectorAll('#saved-chip-row .saved-chip');
  chips.forEach(chip => {
    chip.addEventListener('click', () => {
      chips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      state.scope = chip.dataset.scope;

      const studioStrip = document.getElementById('saved-studio-strip');
      const moodStrip   = document.getElementById('saved-mood-strip');
      studioStrip.hidden = state.scope !== 'studio';
      moodStrip.hidden   = state.scope !== 'mood';

      if (state.scope === 'studio') renderStudioStrip();
      if (state.scope === 'mood')   renderMoodStrip();

      wall.reload();
    });
  });
}

function renderMoodStrip() {
  const strip = document.getElementById('saved-mood-strip');
  if (!strip || strip.dataset.built) return;

  // Reuse category vocabulary — same labels as Explore
  const moods = Object.entries(CATEGORY_LABELS);
  strip.innerHTML =
    `<button class="filters-chip active" data-mood="">All moods</button>` +
    moods.map(([id, label]) =>
      `<button class="filters-chip" data-mood="${id}">${label}</button>`
    ).join('');

  strip.querySelectorAll('.filters-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      strip.querySelectorAll('.filters-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      state.moodId = chip.dataset.mood || null;
      wall.reload();
    });
  });

  strip.dataset.built = '1';
}

function setupSearch() {
  const input = document.getElementById('saved-search');
  if (!input) return;
  let t;
  input.addEventListener('input', () => {
    clearTimeout(t);
    t = setTimeout(() => {
      state.search = input.value.trim();
      wall.reload();
    }, 350);
  });
}

function setupStudioStrip() {
  // Delegated — the strip rebuilds on scope change, so we can't
  // bind to children directly. But the buttons bind in renderStudioStrip.
  // Keeping this function exists so it's obvious where to add future
  // studio-strip-level interactions (e.g. long press to bulk remove).
}

/* =========================================================
   REMOVE
   ========================================================= */

async function handleRemove(piece, cardEl) {
  // Optimistic: pull the card out immediately, restore on failure.
  const parent = cardEl.parentElement;
  const next = cardEl.nextSibling;
  cardEl.remove();

  try {
    await API.removeSaved(piece.id);
    allSaved = allSaved.filter(p => p.id !== piece.id);
    updateHeaderCount();
    renderStudioStrip();
    // Also update the mood strip's counts if you want — skip for now.
  } catch (err) {
    console.error('remove failed:', err);
    // Restore
    parent.insertBefore(cardEl, next);
    showToast({
      message: 'Could not remove that piece.',
      actionLabel: 'Retry',
      onAction: () => handleRemove(piece, cardEl),
    });
  }
}

/* =========================================================
   EMPTY
   ========================================================= */

function emptyStateFor() {
  if (state.search) {
    return {
      icon: 'fa-magnifying-glass',
      title: `Nothing matches "${state.search}"`,
      body: 'Try a different word.',
    };
  }
  if (state.scope === 'studio' && state.studioId) {
    return {
      icon: 'fa-store',
      title: 'Nothing saved from this studio',
      body: 'Save pieces from other studios, or pick a different one.',
    };
  }
  if (state.scope === 'mood' && state.moodId) {
    return {
      icon: 'fa-layer-group',
      title: `No saved ${CATEGORY_LABELS[state.moodId] || state.moodId} pieces`,
      body: 'Try another mood.',
    };
  }
  return {
    icon: 'fa-bookmark',
    title: 'Nothing saved yet',
    body: 'Tap the bookmark on any piece to keep it here.',
    cta: { label: 'Explore', href: '#tab-explore' },
  };
}