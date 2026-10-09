/**
 * infinite-scroll.js
 * Sentinel-based infinite scroll. Stateless about data, stateful about pace.
 *
 * Usage:
 *   const scroll = createInfiniteScroll({
 *     sentinelParent: someEl,
 *     onLoadMore: async () => ({ hasMore: boolean }),
 *   });
 *
 *   // On filter change:
 *   scroll.reset();
 */

export function createInfiniteScroll({
  sentinelParent,
  onLoadMore,
  rootMargin = '500px 0px',
} = {}) {
  if (!sentinelParent || typeof onLoadMore !== 'function') {
    console.warn('createInfiniteScroll: missing options');
    return { reset() {}, destroy() {} };
  }

  const sentinel = document.createElement('div');
  sentinel.className = 'scroll-sentinel';
  sentinel.setAttribute('aria-hidden', 'true');
  sentinelParent.appendChild(sentinel);

  let busy = false;
  let exhausted = false;

  const observer = new IntersectionObserver(async (entries) => {
    if (busy || exhausted) return;
    if (!entries.some(e => e.isIntersecting)) return;

    busy = true;
    sentinel.classList.add('is-loading');

    try {
      const result = await onLoadMore();
      if (!result || result.hasMore === false) {
        exhausted = true;
        sentinel.classList.remove('is-loading');
      }
    } catch (err) {
      console.error('infinite scroll load failed:', err);
    } finally {
      busy = false;
      sentinel.classList.remove('is-loading');
    }
  }, { rootMargin });

  observer.observe(sentinel);

  return {
    reset() {
      exhausted = false;
      busy = false;
      sentinel.classList.remove('is-loading');
      observer.observe(sentinel);
    },
    destroy() {
      observer.disconnect();
      sentinel.remove();
    },
    get exhausted() { return exhausted; },
  };
}