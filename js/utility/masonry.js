/**
 * masonry.js
 * Column-based masonry. Append-safe: new items go to the shortest
 * column at the start of the batch; existing items never move.
 *
 * Why not CSS Grid + row spans?
 *   Grid re-runs placement on append, which reflows content above
 *   the insertion point. Columns don't. Append cost is O(batch).
 *
 * Contract:
 *   const m = createMasonry(el, { gap: 12 });
 *   m.append(nodes);   // array of elements
 *   m.reset();         // clear all columns (keeps column count)
 *   m.setColumns(n);   // force column count
 *   m.disconnect();    // stop observing container width
 *
 * CSS contract (masonry.css):
 *   .masonry-columns { display:flex; gap:var(--masonry-gap); align-items:flex-start }
 *   .masonry-col     { flex:1 1 0; min-width:0; display:flex; flex-direction:column; gap:var(--masonry-gap) }
 */

export function createMasonry(containerEl, { gap = 12 } = {}) {
  if (!containerEl) {
    console.warn('createMasonry: no container');
    return { append() {}, reset() {}, reflow() {}, setColumns() {}, disconnect() {} };
  }

  containerEl.classList.add('masonry-columns');
  containerEl.style.setProperty('--masonry-gap', `${gap}px`);

  let cols = [];
  let colCount = 0;

  function pickColumnCount(width) {
    if (width < 600) return 2;
    if (width < 900) return 3;
    return 4;
  }

  function buildColumns(n) {
    // Preserve existing children if count is unchanged
    if (n === colCount && cols.length) return;

    const existing = cols.flatMap(c => Array.from(c.children));
    containerEl.innerHTML = '';
    cols = [];
    colCount = n;

    for (let i = 0; i < n; i++) {
      const c = document.createElement('div');
      c.className = 'masonry-col';
      containerEl.appendChild(c);
      cols.push(c);
    }

    // Redistribute existing items evenly
    existing.forEach((node, i) => cols[i % cols.length].appendChild(node));
  }

  function measureHeights() {
    // One layout read per column. Cheap because columns are few.
    const heights = new Array(cols.length);
    for (let i = 0; i < cols.length; i++) {
      heights[i] = cols[i].getBoundingClientRect().height;
    }
    return heights;
  }

  function append(nodes) {
    const list = Array.isArray(nodes) ? nodes : [nodes];
    if (!list.length) return;

    // Single measurement pass, then round-robin from the shortest.
    const heights = measureHeights();
    let startIdx = 0;
    let min = heights[0] ?? 0;
    for (let i = 1; i < heights.length; i++) {
      if (heights[i] < min) { min = heights[i]; startIdx = i; }
    }

    for (let i = 0; i < list.length; i++) {
      cols[(startIdx + i) % cols.length].appendChild(list[i]);
    }
  }

  function reset() {
    cols.forEach(c => { c.innerHTML = ''; });
  }

  function setColumns(n) { buildColumns(n); }

  // Initial column count
  buildColumns(pickColumnCount(containerEl.getBoundingClientRect().width || 800));

  // Width changes → rebuild columns if the count would differ.
  let raf = null;
  const ro = new ResizeObserver((entries) => {
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(() => {
      const w = entries[0]?.contentRect?.width ?? containerEl.clientWidth;
      const next = pickColumnCount(w);
      if (next !== colCount) buildColumns(next);
    });
  });
  ro.observe(containerEl);

  return {
    append,
    reset,
    reflow() { /* no-op by design */ },
    setColumns,
    disconnect() { ro.disconnect(); },
  };
}