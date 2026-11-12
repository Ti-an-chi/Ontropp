/**
 * home.js
 * Home tab orchestrator.
 *
 * Responsibilities:
 *   1. Ask api for each section's data.
 *   2. Drive each section's state via createStateView.
 *   3. Hand data to card factories.
 *   4. Wire section headers to the router.
 *
 * Not responsible for:
 *   - card markup (cards.js)
 *   - state transitions (state.js)
 *   - carousel mechanics (carousel.js)
 *   - error UI (toast.js)
 */

import API from '/api.js';
import { PublicApi } from '../network/public.js';
import { DesignerFollowButton } from '../utility/reconfig.js';
import { createStateView } from '../state.js';
import { showToast } from '../toast.js';
import { createCarousel } from '../carousel.js';
import { navigate } from '/dashboard-main.js';
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

  userData   = bootstrap ? bootstrap.userData : null;
  isSignedIn = !!(userData && userData.id);

  renderHello();
  wireSectionHeaders();

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
   SECTION HEADERS → ROUTER
   ========================================================= */

function wireSectionHeaders() {
  // Trending → Explore, sorted by trending.
  const trendingSeeAll = document.querySelector('[data-state-view="trending"] .see-all');
  if (trendingSeeAll) {
    trendingSeeAll.addEventListener('click', function (e) {
      e.preventDefault();
      navigate('tab-explore', new URLSearchParams({ order: 'trending' }));
    });
  }

  // Recommended → Explore, sorted by recommended.
  const recSeeAll = document.querySelector('[data-state-view="recommended"] .see-all');
  if (recSeeAll) {
    recSeeAll.addEventListener('click', function (e) {
      e.preventDefault();
      navigate('tab-explore', new URLSearchParams({ order: 'recommended' }));
    });
  }

  // Fresh → Explore, sorted by newest.
  const freshSeeAll = document.querySelector('[data-state-view="fresh"] .see-all');
  if (freshSeeAll) {
    freshSeeAll.addEventListener('click', function (e) {
      e.preventDefault();
      navigate('tab-explore', new URLSearchParams({ order: 'newest' }));
    });
  }

  // Designers → TODO: migrate to designers.html when that page exists.
  const designersSeeAll = document.querySelector('[data-state-view="designers"] .see-all');
  if (designersSeeAll) {
    designersSeeAll.addEventListener('click', function (e) {
      e.preventDefault();
      navigate('tab-explore');
    });
  }

  // Studios → TODO: migrate to designers.html when that page exists.
  const studiosSeeAll = document.querySelector('[data-state-view="studios"] .see-all');
  if (studiosSeeAll) {
    studiosSeeAll.addEventListener('click', function (e) {
      e.preventDefault();
      navigate('tab-explore');
    });
  }
}

/* =========================================================
   HELLO
   ========================================================= */

function renderHello() {
  const section = document.querySelector('[data-state-view="home-hello"]');
  const sv = createStateView(section);
  if (!sv) return;

  const dataEl = sv.dataEl;
  if (isSignedIn) {
    dataEl.innerHTML =
      '<h1>Welcome back, <span>' + escapeName(userData.username || 'there') + '</span></h1>' +
      '<p>Fresh pieces, new studios, and the designers behind them.</p>';
  } else {
    dataEl.innerHTML =
      '<h1>Discover <span>ONTROPP</span></h1>' +
      '<p>Pieces, studios, and the designers behind them.</p>';
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
    const items = (window.bootstrap && window.bootstrap.trending)
      || (await PublicApi.getTrendingPieces(4));

    if (!items || items.length === 0) {
      sv.empty();
      return;
    }

    const stage = sv.dataEl;
    const track = stage.querySelector('[data-carousel-track]');
    const dots  = stage.querySelector('[data-carousel-dots]');
    const prev  = stage.querySelector('[data-carousel-prev]');
    const next  = stage.querySelector('[data-carousel-next]');

    if (carousel) carousel.destroy();
    carousel = createCarousel({
      root: stage,
      trackEl: track,
      dotsEl: dots,
      prevEl: prev,
      nextEl: next,
      items: items,
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
    const cats = ((await API.getCategories('products', 5)) || []).slice(0, 5);
    if (cats.length === 0) { sv.empty(); return; }

    const layout = ['tall', '', '', '', ''];
    const grid = sv.dataEl.querySelector('.cat-grid');
    grid.innerHTML = '';

    cats.forEach(function (c, i) {
      const tile = CategoryTile(c, layout[i] || '');
      tile.dataset.categoryId = c.id;

      tile.addEventListener('click', function (e) {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
        e.preventDefault();
        navigate('tab-explore', new URLSearchParams({ category: c.id }));
      });

      grid.appendChild(tile);
    });

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
   3. RECOMMENDED
   ========================================================= */

async function loadRecommended() {
  const root = document.querySelector('[data-state-view="recommended"]');
  const sv = createStateView(root);
  if (!sv) return;
  sv.loading();

  const titleEl = root.querySelector('.home-section-title');
  if (titleEl) {
    titleEl.innerHTML = isSignedIn
      ? 'Recommended for you <span class="home-section-sub">based on what you\'ve explored</span>'
      : 'Editor\'s Selection <span class="home-section-sub">curated for discovery</span>';
  }

  try {
    const bootstrapRec = window.bootstrap ? window.bootstrap.recommended : null;
    const raw = bootstrapRec || (isSignedIn
      ? await API.getRecommendedProducts(1, 8)
      : await API.getEditorPicks(8));

    const items = (raw && raw.data) || raw || [];
    if (items.length === 0) { sv.empty(); return; }

    const list = sv.dataEl.querySelector('.rec-scroll');
    list.innerHTML = '';
    items.forEach(function (p) { list.appendChild(RecommendedCard(p)); });

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
    const designers = (window.bootstrap && window.bootstrap.designers)
      || (await PublicApi.getTrendingDesigners(6));
    if (!designers || designers.length === 0) { sv.empty(); return; }

    const wrap = sv.dataEl.querySelector('.designer-scroll');
    wrap.innerHTML = '';

    designers.forEach(function (data) {
      const d = data.designer;
      const card = DesignerCard(data);
      const btn = card.querySelector('.designer-follow');

      if (btn) {
        new DesignerFollowButton(btn, d.id, !!d.isFollowing, {
          onChange: function (isFollowing) {
            d.isFollowing = isFollowing;
          },
        });
      }

      wrap.appendChild(card);
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

/* =========================================================
   5. FRESH ARRIVALS
   ========================================================= */

async function loadFresh() {
  const root = document.querySelector('[data-state-view="fresh"]');
  const sv = createStateView(root);
  if (!sv) return;
  sv.loading();

  try {
    const resp = (window.bootstrap && window.bootstrap.fresh)
      || (await API.getPiecesPaginated(1, 10, { order: 'newest' }));
    const items = resp.pieces;
    if (!items || items.length === 0) { sv.empty(); return; }

    const wrap = sv.dataEl.querySelector('.fresh-scroll');
    wrap.innerHTML = '';
    items.forEach(function (p) { wrap.appendChild(FreshCard(p)); });

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
    const studios = (window.bootstrap && window.bootstrap.studios)
      || (await PublicApi.getFeaturedStudios(6));
    if (!studios || studios.length === 0) { sv.empty(); return; }

    const wrap = sv.dataEl.querySelector('.studio-grid');
    wrap.innerHTML = '';
    studios.forEach(function (s) { wrap.appendChild(StudioCard(s)); });

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
  return String(str == null ? '' : str).replace(/[&<>"']/g, function (c) {
    return ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    })[c];
  });
}