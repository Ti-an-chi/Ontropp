/**
 * saved.js
 * The Saved tab.
 *
 * Framing: a personal shelf, not a shopping shortlist.
 * No search, no modes, no per-card delete buttons.
 * One sort toggle, two independent filter strips (studios + collections),
 * long-press to select.
 *
 * Owns:
 *   - sort ('newest' | 'oldest')
 *   - active studio filter (studioId)
 *   - active collection filter (collection)
 *   - selection mode + selected ids
 *   - header count + "last added" line
 *   - studio strip + collection strip
 *
 * Delegates:
 *   - the wall                → createWall (infinite: false)
 *   - card markup             → SavedPieceCard
 *   - toasts                  → toast.js
 */

import API from '../../api.js';
import { createWall } from '../utility/wall.js';
import { SavedPieceCard } from '../cards.js';
import { showToast } from '../toast.js';

const state = {
  sort: 'newest',
  studioId: null,
  collection: null,
  selectionMode: false,
  selectedIds: new Set(),
};

let wall = null;
let allSaved = [];
let allStudios = [];
let allCollections = [];
let gridEl = null;

/* =========================================================
   BOOT
   ========================================================= */

export async function initSavedTab() {
  const mount = document.getElementById('saved-wall');
  if (!mount) return;

  wall = createWall(mount, {
    renderItem: (item) => SavedPieceCard(item, { onLongPress: handleLongPress }),
    fetchPage: fetchSavedPage,
    infinite: false,
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
  gridEl = wall.gridEl;

  // Selection click handling — delegated on the grid.
  gridEl.addEventListener('click', onGridClick);

  setupSortToggle();
  setupSelectionBar();

  await refresh();
}

/* =========================================================
   ROUTE PARAMS → FILTERS
   Called by the router on subsequent navigations.
   ========================================================= */

export function applySavedRouteParams(params) {
  if (!params) return;

  const nextStudio = params.get('studio') || null;
  const nextCollection = params.get('collection') || null;

  if (nextStudio === state.studioId && nextCollection === state.collection) {
    return;
  }

  state.studioId = nextStudio;
  state.collection = nextCollection;

  // If a saved refresh already ran, re-render strips + wall immediately.
  if (allSaved.length || allStudios.length || allCollections.length) {
    renderStudioStrip(allStudios);
    renderCollectionStrip(allCollections);
    wall.reload();
  }
  // If not yet loaded, initSavedTab will honour the state we just set.
}

/* =========================================================
   DATA
   ========================================================= */

async function refresh() {
  let res;
  try {
    res = await API.getSaved(1, 1000);
  } catch (err) {
    console.error('getSaved failed:', err);
    res = { saved: [], studios: [], collections: [], total: 0, lastAddedAt: null };
  }

  allSaved = res.saved || [];
  allStudios = res.studios || [];
  allCollections = res.collections || [];

  updateHeader(res);
  renderStudioStrip(allStudios);
  renderCollectionStrip(allCollections);

  await wall.reload();
}

async function fetchSavedPage() {
  let items = allSaved.slice();

  if (state.studioId) {
    items = items.filter(p => p.studio_id === state.studioId);
  }
  if (state.collection) {
    items = items.filter(p => (p.collection || 'uncategorised') === state.collection);
  }
  if (state.sort === 'oldest') {
    items = items.slice().reverse();
  }

  return {
    pieces: items,
    pagination: { hasNextPage: false },
  };
}

/* =========================================================
   HEADER
   ========================================================= */

function updateHeader({ total = 0, studios = [], lastAddedAt }) {
  const el = document.getElementById('saved-subtitle');
  if (!el) return;

  if (total === 0) {
    el.textContent = 'Nothing saved yet';
    return;
  }

  const pieceWord   = total === 1 ? 'piece' : 'pieces';
  const studioCount = studios.length;
  const studioWord  = studioCount === 1 ? 'studio' : 'studios';
  const relative    = relativeTime(lastAddedAt);

  el.textContent = relative
    ? `${total} ${pieceWord} · ${studioCount} ${studioWord} · added ${relative}`
    : `${total} ${pieceWord} · ${studioCount} ${studioWord}`;
}

function relativeTime(ts) {
  if (!ts) return '';
  const diff = Date.now() - new Date(ts).getTime();
  const day = 24 * 60 * 60 * 1000;
  const days = Math.floor(diff / day);
  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days} days ago`;
  const weeks = Math.floor(days / 7);
  if (weeks === 1) return 'a week ago';
  if (weeks < 5) return `${weeks} weeks ago`;
  const months = Math.floor(days / 30);
  if (months === 1) return 'a month ago';
  return `${months} months ago`;
}

/* =========================================================
   STUDIO STRIP
   ========================================================= */

function renderStudioStrip(studios) {
  const strip = document.getElementById('saved-studio-strip');
  if (!strip) return;

  strip.innerHTML = '';

  const allBtn = document.createElement('button');
  allBtn.className = 'saved-studio saved-studio--all' + (state.studioId ? '' : ' active');
  allBtn.dataset.studioId = '';
  allBtn.innerHTML = `
    <div class="saved-studio-avatar"><i class="fas fa-layer-group"></i></div>
    <div class="saved-studio-name">All</div>
  `;
  allBtn.addEventListener('click', () => {
    state.studioId = null;
    writeUrl();
    renderStudioStrip(studios);
    wall.reload();
  });
  strip.appendChild(allBtn);

  studios.forEach(s => {
    const btn = document.createElement('button');
    btn.className = 'saved-studio' + (state.studioId === s.id ? ' active' : '');
    btn.dataset.studioId = s.id;
    btn.innerHTML = `
      <div class="saved-studio-avatar"
           style="background-image:url('${s.avatar_url || ''}')"></div>
      <div class="saved-studio-name">${escape(s.name)}</div>
    `;
    btn.addEventListener('click', () => {
      state.studioId = state.studioId === s.id ? null : s.id;
      writeUrl();
      renderStudioStrip(studios);
      wall.reload();
    });
    strip.appendChild(btn);
  });

  strip.hidden = studios.length === 0;
}

/* =========================================================
   COLLECTION STRIP
   ========================================================= */

function renderCollectionStrip(collections) {
  const wrap = document.getElementById('saved-collection-strip');
  if (!wrap) return;

  wrap.innerHTML = '';

  // Don't render the strip at all if only "uncategorised" exists
  // (i.e. user hasn't assigned anything to a collection yet).
  const named = collections.filter(c => c.name && c.name !== 'uncategorised');
  if (named.length === 0 && !state.collection) {
    wrap.hidden = true;
    return;
  }

  wrap.hidden = false;

  const allChip = document.createElement('button');
  allChip.className = 'saved-collection-chip' + (state.collection ? '' : ' active');
  allChip.textContent = 'All collections';
  allChip.addEventListener('click', () => {
    state.collection = null;
    writeUrl();
    renderCollectionStrip(collections);
    wall.reload();
  });
  wrap.appendChild(allChip);

  named.forEach(c => {
    const chip = document.createElement('button');
    chip.className = 'saved-collection-chip' + (state.collection === c.name ? ' active' : '');
    chip.textContent = prettyCollectionName(c.name);
    chip.title = `${c.piece_count} ${c.piece_count === 1 ? 'piece' : 'pieces'}`;
    chip.addEventListener('click', () => {
      state.collection = state.collection === c.name ? null : c.name;
      writeUrl();
      renderCollectionStrip(collections);
      wall.reload();
    });
    wrap.appendChild(chip);
  });
}

function prettyCollectionName(name) {
  return String(name || '')
    .replace(/^product_/, '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, ch => ch.toUpperCase());
}

/* =========================================================
   URL SYNC
   ========================================================= */

function writeUrl() {
  const params = new URLSearchParams();
  if (state.studioId) params.set('studio', state.studioId);
  if (state.collection) params.set('collection', state.collection);

  const qs = params.toString();
  const target = '#tab-saved' + (qs ? '?' + qs : '');
  history.replaceState({ tabId: 'tab-saved', qs }, '', target);
}

function escape(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

/* =========================================================
   SORT
   ========================================================= */

function setupSortToggle() {
  const btn = document.getElementById('saved-sort');
  const label = document.getElementById('saved-sort-label');
  if (!btn || !label) return;

  btn.dataset.sort = state.sort;

  btn.addEventListener('click', () => {
    state.sort = state.sort === 'newest' ? 'oldest' : 'newest';
    label.textContent = state.sort === 'newest' ? 'Newest' : 'Oldest';
    btn.dataset.sort = state.sort;
    wall.reload();
  });
}

/* =========================================================
   SELECTION MODE
   ========================================================= */

function handleLongPress(item, cardEl) {
  if (!state.selectionMode) {
    state.selectionMode = true;
  }
  if (!state.selectedIds.has(item.id)) {
    state.selectedIds.add(item.id);
    cardEl.classList.add('is-selected');
  }
  updateSelectionBar();
}

function onGridClick(e) {
  const card = e.target.closest('.saved-piece');
  if (!card) return;

  if (!state.selectionMode) return;

  e.preventDefault();
  const id = card.dataset.pieceId;
  if (!id) return;

  if (state.selectedIds.has(id)) {
    state.selectedIds.delete(id);
    card.classList.remove('is-selected');
  } else {
    state.selectedIds.add(id);
    card.classList.add('is-selected');
  }

  if (state.selectedIds.size === 0) {
    exitSelection();
  } else {
    updateSelectionBar();
  }
}

function setupSelectionBar() {
  const bar = document.getElementById('selection-bar');
  const del = document.getElementById('selection-delete');
  const cancel = document.getElementById('selection-cancel');
  if (!bar) return;

  del?.addEventListener('click', deleteSelected);
  cancel?.addEventListener('click', exitSelection);
}

function updateSelectionBar() {
  const bar = document.getElementById('selection-bar');
  const count = document.getElementById('selection-count');
  if (!bar || !count) return;
  const n = state.selectedIds.size;
  count.textContent = `${n} selected`;
  bar.hidden = n === 0;
}

function exitSelection() {
  state.selectionMode = false;
  state.selectedIds.clear();
  document.querySelectorAll('.saved-piece.is-selected')
    .forEach(el => el.classList.remove('is-selected'));
  const bar = document.getElementById('selection-bar');
  if (bar) bar.hidden = true;
}

async function deleteSelected() {
  const ids = [...state.selectedIds];
  if (ids.length === 0) return;

  const ok = confirm(
    `Remove ${ids.length} ${ids.length === 1 ? 'piece' : 'pieces'} from your shelf?`
  );
  if (!ok) return;

  const cards = ids
    .map(id => gridEl.querySelector(`.saved-piece[data-piece-id="${id}"]`))
    .filter(Boolean);
  const snapshots = cards.map(c => ({
    el: c,
    parent: c.parentElement,
    next: c.nextSibling,
  }));
  cards.forEach(c => c.remove());

  try {
    await API.removeManySaved(ids);
    allSaved = allSaved.filter(p => !state.selectedIds.has(p.id));
    exitSelection();
    updateHeader({
      total: allSaved.length,
      studios: deriveStudios(allSaved),
      lastAddedAt: null,
    });
    allStudios = deriveStudios(allSaved);
    allCollections = deriveCollections(allSaved);
    renderStudioStrip(allStudios);
    renderCollectionStrip(allCollections);
  } catch (err) {
    console.error('removeManySaved failed:', err);
    snapshots.forEach(({ el, parent, next }) => {
      if (next && next.parentElement === parent) parent.insertBefore(el, next);
      else parent.appendChild(el);
    });
    showToast({
      message: 'Could not remove those pieces.',
      actionLabel: 'Retry',
      onAction: deleteSelected,
    });
  }
}

function deriveStudios(pieces) {
  const map = new Map();
  for (const p of pieces) {
    if (!map.has(p.studio_id)) {
      map.set(p.studio_id, {
        id: p.studio_id,
        name: p.studio_name,
        avatar_url: p.studio_avatar_url,
        piece_count: 0,
      });
    }
    map.get(p.studio_id).piece_count += 1;
  }
  return [...map.values()];
}

function deriveCollections(pieces) {
  const map = new Map();
  for (const p of pieces) {
    const key = p.collection || 'uncategorised';
    if (!map.has(key)) {
      map.set(key, { name: key, cover_url: null, piece_count: 0 });
    }
    const c = map.get(key);
    c.piece_count += 1;
    if (!c.cover_url) c.cover_url = p.cover_image || p.images?.[0] || null;
  }
  return [...map.values()].sort((a, b) => b.piece_count - a.piece_count);
}

/* =========================================================
   EMPTY
   ========================================================= */

function emptyStateFor() {
  if (state.collection && state.studioId) {
    return {
      icon: 'fa-filter',
      title: `Nothing matches this combination`,
      body: 'Try clearing one of the filters.',
    };
  }
  if (state.collection) {
    return {
      icon: 'fa-layer-group',
      title: `Nothing saved in "${prettyCollectionName(state.collection)}"`,
      body: 'Add pieces from Explore to build this collection.',
      cta: { label: 'Explore pieces', href: '#tab-explore' },
    };
  }
  if (state.studioId) {
    return {
      icon: 'fa-store',
      title: 'Nothing saved from this studio',
      body: 'Try another studio, or save new pieces from Explore.',
    };
  }
  return {
    icon: 'fa-bookmark',
    title: 'Nothing saved yet',
    body: 'Tap the bookmark on any piece to keep it here.',
    cta: { label: 'Explore pieces', href: '#tab-explore' },
  };
}