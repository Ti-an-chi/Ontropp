/**
 * wall.js
 * A reusable, paginated card wall.
 *
 * Owns: state (loading/empty/data), masonry, infinite scroll, append.
 * Does NOT own: data fetching, filters, card markup.
 *
 * Usage:
 *   const wall = createWall(mountEl, {
 *     renderItem: (item) => PieceCard(item),
 *     fetchPage: async ({ page }) => ({ data, pagination }),
 *     skeletonCount: 8,
 *     onError: (err, retry) => showToast({ message: '…', actionLabel: 'Try again', onAction: retry }),
 *     emptyState: (ctx) => ({ icon, title, body }),
 *   });
 *
 *   await wall.reload();   // page 1, clear, show loading
 *   wall.setEmptyStateResolver(fn);  // change empty message per filter
 *   wall.destroy();
 */

import { createMasonry } from './masonry.js';
import { createInfiniteScroll } from './infinite-scroll.js';

const PAGE_SIZE_DEFAULT = 12;

export function createWall(mountEl, {
  renderItem,
  fetchPage,
  pageSize = PAGE_SIZE_DEFAULT,
  skeletonCount = 8,
  onError,
  emptyState,
} = {}) {
  if (!mountEl || typeof renderItem !== 'function' || typeof fetchPage !== 'function') {
    console.warn('createWall: missing required options');
    return null;
  }

  // ---- Build the state wrapper (loading / empty / data) ----
  mountEl.innerHTML = `
    <div class="sv-state" data-state="loading" hidden>
      <div class="piece-wall piece-wall--skeleton" data-role="skeleton"></div>
    </div>
    <div class="sv-state" data-state="empty" hidden>
      <div class="explore-empty" data-role="empty"></div>
    </div>
    <div class="sv-state" data-state="data" hidden>
      <div class="masonry-columns" data-role="grid"></div>
      <div data-role="sentinel-parent"></div>
    </div>
  `;

  const states = {
    loading: mountEl.querySelector('[data-state="loading"]'),
    empty:   mountEl.querySelector('[data-state="empty"]'),
    data:    mountEl.querySelector('[data-state="data"]'),
  };
  const skeletonEl = mountEl.querySelector('[data-role="skeleton"]');
  const emptyEl    = mountEl.querySelector('[data-role="empty"]');
  const gridEl     = mountEl.querySelector('[data-role="grid"]');
  const sentinelParent = mountEl.querySelector('[data-role="sentinel-parent"]');

  function setState(name) {
    for (const k of Object.keys(states)) states[k].hidden = k !== name;
  }

  // ---- Masonry ----
  const masonry = createMasonry(gridEl, { gap: 12 });

  // ---- Pagination state ----
  let page = 0;
  let hasMore = true;
  let loading = false;

  // ---- Empty state resolver (can be swapped per filter) ----
  let emptyResolver = emptyState || (() => ({
    icon: 'fa-compass',
    title: 'Nothing here yet',
    body: 'Try a different search or category.',
  }));

  function renderSkeleton() {
    skeletonEl.innerHTML = Array.from({ length: skeletonCount })
      .map(() => '<div class="piece-card"></div>')
      .join('');
  }

  function renderEmpty() {
    const { icon = 'fa-compass', title = 'Nothing here', body = '' } = emptyResolver() || {};
    emptyEl.innerHTML = `
      <i class="fas ${icon}"></i>
      <h3>${title}</h3>
      ${body ? `<p>${body}</p>` : ''}
    `;
  }

  async function loadNextPage() {
    if (loading || !hasMore) return { hasMore: false };
    loading = true;
    const nextPage = page + 1;
    try {
      const result = await fetchPage({ page: nextPage, pageSize });
      const items = result?.data || [];
      hasMore = !!result?.pagination?.hasNextPage;

      if (nextPage === 1) {
        // First page decides loading → empty vs data
        if (items.length === 0) {
          renderEmpty();
          setState('empty');
          loading = false;
          return { hasMore: false };
        }
        // We may have been in loading state
        setState('data');
      }

      if (items.length > 0) {
        const nodes = items.map(renderItem);
        masonry.append(nodes);
      }

      page = nextPage;
      return { hasMore };
    } catch (err) {
      console.error('wall load failed:', err);
      onError?.(err, () => reload());
      return { hasMore: false };
    } finally {
      loading = false;
    }
  }

  // ---- Infinite scroll ----
  const scroll = createInfiniteScroll({
    sentinelParent,
    onLoadMore: loadNextPage,
  });

  async function reload() {
    page = 0;
    hasMore = true;
    loading = false;
    scroll.reset();
    masonry.reset();
    renderSkeleton();
    setState('loading');
    await loadNextPage();
  }

  // Kick off the first load lazily — caller may want to await it.
  // We expose reload() and let the orchestrator call it.

  return {
    reload,
    setEmptyStateResolver(fn) { emptyResolver = fn || emptyResolver; },
    get hasMore() { return hasMore; },
    get page() { return page; },
    destroy() {
      scroll.destroy?.();
      masonry.disconnect?.();
    },
  };
}