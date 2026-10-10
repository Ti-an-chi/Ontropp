/**
 * saved.js
 * The Saved tab.
 *
 * Framing: a personal shelf, not a shopping shortlist.
 * No search, no modes, no per-card delete buttons.
 * One sort toggle, one studio strip, long-press to select.
 *
 * Owns:
 *   - sort ('newest' | 'oldest')
 *   - active studio filter
 *   - selection mode + selected ids
 *   - header count + "last added" line
 *   - studio strip
 *
 * Delegates:
 *   - the wall                → createWall (infinite: false)
 *   - card markup             → SavedPieceCard
 *   - toasts                  → toast.js
 */

import API from '../../api.mock.js';
import { createWall } from '../utility/wall.js';
import { SavedPieceCard } from '../cards.js';
import { showToast } from '../toast.js';

const state = {
  sort: 'newest',
  studioId: null,
  selectionMode: false,
  selectedIds: new Set(),
};

let wall = null;
let allSaved = [];
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
   DATA
   ========================================================= */

async function refresh() {
  let res;
  try {
    res = await API.getSaved();
  } catch (err) {
    console.error('getSaved failed:', err);
    res = { pieces: [], studios: [], total: 0, lastAddedAt: null };
  }

  allSaved = res.pieces || [];
  updateHeader(res);
  renderStudioStrip(res.studios || []);

  await wall.reload();
}

async function fetchSavedPage() {
  let items = allSaved.slice();

  if (state.studioId) {
    items = items.filter(p => p.studio_id === state.studioId);
  }
  if (state.sort === 'oldest') {
    items = items.slice().reverse();
  }

  return {
    data: items,
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
  const diff = Date.now() - ts;
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

  // "All" pill first
  const allBtn = document.createElement('button');
  allBtn.className = 'saved-studio saved-studio--all' + (state.studioId ? '' : ' active');
  allBtn.dataset.studioId = '';
  allBtn.innerHTML = `
    <div class="saved-studio-avatar"><i class="fas fa-layer-group"></i></div>
    <div class="saved-studio-name">All</div>
  `;
  allBtn.addEventListener('click', () => {
    state.studioId = null;
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
      renderStudioStrip(studios);
      wall.reload();
    });
    strip.appendChild(btn);
  });

  strip.hidden = studios.length === 0;
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
  // If already in selection mode, just toggle this card.
  if (!state.selectionMode) {
    state.selectionMode = true;
  }
  // Always select the long-pressed card.
  if (!state.selectedIds.has(item.id)) {
    state.selectedIds.add(item.id);
    cardEl.classList.add('is-selected');
  }
  updateSelectionBar();
}

function onGridClick(e) {
  const card = e.target.closest('.saved-piece');
  if (!card) return;

  // Not in selection mode: let the <a> navigate.
  if (!state.selectionMode) return;

  // In selection mode: toggle instead of navigate.
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

  // Optimistic: pull all selected cards out.
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
    renderStudioStrip(deriveStudios(allSaved));
  } catch (err) {
    console.error('removeManySaved failed:', err);
    // Restore
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

/* =========================================================
   EMPTY
   ========================================================= */

function emptyStateFor() {
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