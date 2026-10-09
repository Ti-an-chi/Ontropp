/**
 * home.js
 * Home tab orchestrator.
 *
 * Responsibilities:
 *   1. Ask api for each section's data.
 *   2. Drive each section's state (loading / empty / data) via createStateView.
 *   3. Hand data to a card factory and append the result.
 *   4. Surface errors via toast.
 *
 * Not responsible for:
 *   - card markup (cards.js)
 *   - state transitions (state.js)
 *   - carousel mechanics (carousel.js)
 *   - error UI (toast.js)
 */

import API from '../../api.mock.js';           // swap to './api.js' when live
import { createStateView } from '../state.js';
import { showToast } from '../toast.js';
import { createCarousel } from '../carousel.js';
import {
  TrendingSlide, CategoryTile, RecommendedCard,
  DesignerCard, FreshCard, StudioCard,
} from '../cards.js';

let userData = null;
let isSignedIn = false;
let carousel = null;

/* =========================================================
   BOOT
   ========================================================= */

export async function initHomeTab() {
  const bootstrap =
    window.bootstrap ||
    JSON.parse(sessionStorage.getItem('bootstrap') || 'null') ||
    (await API.getUserDash());

  sessionStorage.removeItem('bootstrap');
  window.bootstrap = bootstrap;

  userData   = bootstrap?.userData || null;
  isSignedIn = !!userData?.id;

  renderHello();

  await Promise.all([
    loadTrending(),
    loadCategories(),
    loadRecommended(),
    loadDesigners(),
    loadFresh(),
    loadStudios(),
  ]);
}

/* =========================================================
   HELLO — the only copy that branches on auth
   ========================================================= */

function renderHello() {
  const section = document.querySelector('[data-state-view="home-hello"]');
  const sv = createStateView(section);
  if (!sv) return;

  const dataEl = sv.dataEl;
  if (isSignedIn) {
    dataEl.innerHTML = `
      <h1>Welcome back, <span>${escapeName(userData.username || 'there')}</span></h1>
      <p>Fresh pieces, new studios, and the designers behind them.</p>`;
  } else {
    dataEl.innerHTML = `
      <h1>Discover <span>ONTROPP</span></h1>
      <p>Pieces, studios, and the designers behind them.</p>`;
  }
  sv.data();
}

/* =========================================================
   1. TRENDING
   ========================================================= */

async function loadTrending() {
  const root = document.querySelector('[data-state-view="trending"]');
  const sv = createStateView(root);
  if (!sv) return;
  sv.loading();

  try {
    const items = window.bootstrap?.trending || (await API.getTrending(4));

    if (!items || items.length === 0) {
      sv.empty();
      return;
    }

    const stage = sv.dataEl;
    const track = stage.querySelector('[data-carousel-track]');
    const dots  = stage.querySelector('[data-carousel-dots]');
    const prev  = stage.querySelector('[data-carousel-prev]');
    const next  = stage.querySelector('[data-carousel-next]');

    carousel?.destroy();
    carousel = createCarousel({
      root: stage,
      trackEl: track,
      dotsEl: dots,
      prevEl: prev,
      nextEl: next,
      items,
      renderSlide: TrendingSlide,
    });

    sv.data();
  } catch (err) {
    console.error('Trending failed:', err);
    sv.empty();
    showToast({
      message: 'Could not load trending pieces.',
      actionLabel: 'Try again',
      onAction: loadTrending,
    });
  }
}

/* =========================================================
   2. CATEGORIES
   ========================================================= */

async function loadCategories() {
  const root = document.querySelector('[data-state-view="categories"]');
  const sv = createStateView(root);
  if (!sv) return;
  sv.loading();

  try {
    const cats = (window.bootstrap?.categories || (await API.getCategories()) || []).slice(0, 5);

    if (cats.length === 0) { sv.empty(); return; }

    // One tall at the top-left; everything else uniform.
    // Edit this array alone if the UX designer wants a different rhythm.
    const layout = ['tall', '', '', '', ''];

    const grid = sv.dataEl.querySelector('.cat-grid');
    grid.innerHTML = '';
    cats.forEach((c, i) => grid.appendChild(CategoryTile(c, layout[i] || '')));

    sv.data();
  } catch (err) {
    console.error('Categories failed:', err);
    sv.empty();
    showToast({
      message: 'Could not load categories.',
      actionLabel: 'Try again',
      onAction: loadCategories,
    });
  }
}

/* =========================================================
   3. RECOMMENDED — same layout, source depends on auth
   ========================================================= */

async function loadRecommended() {
  const root = document.querySelector('[data-state-view="recommended"]');
  const sv = createStateView(root);
  if (!sv) return;
  sv.loading();

  const titleEl = root.querySelector('.home-section-title');
  if (titleEl) {
    titleEl.innerHTML = isSignedIn
      ? `Recommended for you <span class="home-section-sub">based on what you've explored</span>`
      : `Editor's Selection <span class="home-section-sub">curated for discovery</span>`;
  }

  try {
    const raw = window.bootstrap?.recommended
      || (isSignedIn
            ? await API.getRecommendedProducts(1, 8)
            : await API.getEditorPicks(8));

    const items = raw?.data || raw || [];
    if (items.length === 0) { sv.empty(); return; }

    const list = sv.dataEl.querySelector('.rec-scroll');
    list.innerHTML = '';
    items.forEach(p => list.appendChild(RecommendedCard(p)));

    sv.data();
  } catch (err) {
    console.error('Recommended failed:', err);
    sv.empty();
    showToast({
      message: 'Could not load recommendations.',
      actionLabel: 'Try again',
      onAction: loadRecommended,
    });
  }
}

/* =========================================================
   4. DESIGNERS
   ========================================================= */

async function loadDesigners() {
  const root = document.querySelector('[data-state-view="designers"]');
  const sv = createStateView(root);
  if (!sv) return;
  sv.loading();

  try {
    const designers = window.bootstrap?.designers || (await API.getFeaturedDesigners(6));
    if (!designers || designers.length === 0) { sv.empty(); return; }

    const wrap = sv.dataEl.querySelector('.designer-scroll');
    wrap.innerHTML = '';
    designers.forEach(d => {
      wrap.appendChild(DesignerCard(d, { onFollow: handleFollowClick }));
    });

    sv.data();
  } catch (err) {
    console.error('Designers failed:', err);
    sv.empty();
    showToast({
      message: 'Could not load designers.',
      actionLabel: 'Try again',
      onAction: loadDesigners,
    });
  }
}

function handleFollowClick(btn, designer) {
  if (!isSignedIn) {
    // preserve intent across the sign-in round trip
    const next = encodeURIComponent(location.pathname + location.hash);
    window.location.href = `/login.html?next=${next}&follow=${designer.id}`;
    return;
  }
  // optimistic toggle — wire to API later
  const following = btn.classList.toggle('following');
  btn.innerHTML = following
    ? '<i class="fas fa-check"></i> Following'
    : '<i class="fas fa-plus"></i> Follow';
}

/* =========================================================
   5. FRESH ARRIVALS
   ========================================================= */

async function loadFresh() {
  const root = document.querySelector('[data-state-view="fresh"]');
  const sv = createStateView(root);
  if (!sv) return;
  sv.loading();

  try {
    const items = window.bootstrap?.fresh || (await API.getFreshArrivals(10));
    if (!items || items.length === 0) { sv.empty(); return; }

    const wrap = sv.dataEl.querySelector('.fresh-scroll');
    wrap.innerHTML = '';
    items.forEach(p => wrap.appendChild(FreshCard(p)));

    sv.data();
  } catch (err) {
    console.error('Fresh failed:', err);
    sv.empty();
    showToast({
      message: 'Could not load new arrivals.',
      actionLabel: 'Try again',
      onAction: loadFresh,
    });
  }
}

/* =========================================================
   6. STUDIOS
   ========================================================= */

async function loadStudios() {
  const root = document.querySelector('[data-state-view="studios"]');
  const sv = createStateView(root);
  if (!sv) return;
  sv.loading();

  try {
    const studios = window.bootstrap?.studios || (await API.getFeaturedStudios(6));
    if (!studios || studios.length === 0) { sv.empty(); return; }

    const wrap = sv.dataEl.querySelector('.studio-grid');
    wrap.innerHTML = '';
    studios.forEach(s => wrap.appendChild(StudioCard(s)));

    sv.data();
  } catch (err) {
    console.error('Studios failed:', err);
    sv.empty();
    showToast({
      message: 'Could not load studios.',
      actionLabel: 'Try again',
      onAction: loadStudios,
    });
  }
}

/* =========================================================
   UTIL
   ========================================================= */

function escapeName(str) {
  return String(str ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}