/**
 * cards.js
 * Pure card renderers. Each function:
 *   - takes a plain data object (and optional callbacks)
 *   - returns a DOM element
 *   - wires its own internal listeners (with stopPropagation where needed)
 *   - does NOT touch the document, fetch, or global state
 *
 * Naming: Card() for grid/list cards, Slide() for carousel slides, Tile() for masonry.
 */

/* -------------------------------------------------------------
   helpers
   ------------------------------------------------------------- */

function el(tag, className, html) {
  const n = document.createElement(tag);
  if (className) n.className = className;
  if (html != null) n.innerHTML = html;
  return n;
}

export function escapeHtml(str) {
  return String(str ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

/* -------------------------------------------------------------
   1. Trending slide
   ------------------------------------------------------------- */

export function TrendingSlide(item) {
  const a = el('a', 'trending-slide');
  a.href = `/piece.html?id=${encodeURIComponent(item.id)}`;
  a.style.backgroundImage = `url('${item.image_url || ''}')`;
  a.style.backgroundPosition = item.focal_point || 'center';
  a.innerHTML = `
    <div class="trending-meta">
      <span class="trending-kicker">${escapeHtml(item.kicker || 'Featured piece')}</span>
      <h3 class="trending-title">${escapeHtml(item.title || '')}</h3>
      <div class="trending-by">
        <i class="fas fa-circle"></i> ${escapeHtml(item.studio_name || '')}
      </div>
    </div>`;
  return a;
}

/* -------------------------------------------------------------
   2. Category tile (masonry)
   layout: '' | 'tall' | 'wide'
   ------------------------------------------------------------- */

export function CategoryTile(cat, layout = '') {
  const a = el('a', `cat-tile ${layout}`.trim());
  a.href = `/designers.html?category=${encodeURIComponent(cat.id)}`;
  a.style.backgroundImage = `url('${cat.image_url || ''}')`;
  a.innerHTML = `<span>${escapeHtml(cat.name)}</span>`;
  return a;
}

/* -------------------------------------------------------------
   3. Recommended card
   ------------------------------------------------------------- */

export function RecommendedCard(item) {
  const a = el('a', 'rec-card');
  a.href = `/piece.html?id=${encodeURIComponent(item.id)}`;
  a.innerHTML = `
    <div class="rec-img" style="background-image:url('${item.image_url || item.images?.[0] || ''}')">
      ${item.badge ? `<span class="rec-badge">${escapeHtml(item.badge)}</span>` : ''}
    </div>
    <div class="rec-body">
      <div class="rec-title">${escapeHtml(item.title || item.name || '')}</div>
      <div class="rec-studio">
        <i class="fas fa-circle"></i> ${escapeHtml(item.studio_name || item.seller_name || '')}
      </div>
    </div>`;
  return a;
}

/* -------------------------------------------------------------
   4. Designer card
   onFollow: (btnEl, designer) => void
   ------------------------------------------------------------- */

export function DesignerCard(designer, { onFollow } = {}) {
  const a = el('a', 'designer-card');
  a.href = `/designer.html?id=${encodeURIComponent(designer.id)}`;
  a.innerHTML = `
    <div class="designer-avatar" style="background-image:url('${designer.avatar_url || ''}')"></div>
    <div class="designer-name">${escapeHtml(designer.name || '')}</div>
    <div class="designer-studio">${escapeHtml(designer.studio_name || '')}</div>
    <span class="designer-follow" role="button" tabindex="0">
      <i class="fas fa-plus"></i> Follow
    </span>`;

  const btn = a.querySelector('.designer-follow');
  const handler = (e) => {
    e.preventDefault();
    e.stopPropagation();
    onFollow?.(btn, designer);
  };
  btn.addEventListener('click', handler);
  btn.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') handler(e);
  });

  return a;
}

/* -------------------------------------------------------------
   5. Fresh arrival card
   ------------------------------------------------------------- */

export function FreshCard(item) {
  const a = el('a', 'fresh-card');
  a.href = `/piece.html?id=${encodeURIComponent(item.id)}`;
  a.innerHTML = `
    <div class="fresh-img" style="background-image:url('${item.image_url || ''}')"></div>
    <div class="fresh-body">
      <div class="fresh-title">${escapeHtml(item.title || '')}</div>
      <div class="fresh-studio">${escapeHtml(item.studio_name || '')}</div>
    </div>`;
  return a;
}

/* -------------------------------------------------------------
   6. Studio card
   ------------------------------------------------------------- */

export function StudioCard(studio) {
  const a = el('a', 'studio-card');
  a.href = `/studio.html?id=${encodeURIComponent(studio.id)}`;
  a.innerHTML = `
    <div class="studio-thumb" style="background-image:url('${studio.cover_url || ''}')"></div>
    <div class="studio-body">
      <div class="studio-name">${escapeHtml(studio.name || '')}</div>
      <div class="studio-by">${escapeHtml(studio.designer_name || '')} · ${escapeHtml(studio.location || '')}</div>
      ${studio.tag ? `<span class="studio-tag">${escapeHtml(studio.tag)}</span>` : ''}
    </div>
    <i class="fas fa-chevron-right studio-arrow"></i>`;
  return a;
}

/* -------------------------------------------------------------
   7. Explore piece card
   Same content hierarchy & visual language as RecommendedCard,
   but:
     - uses a real <img> so natural aspect ratio is preserved
     - overlays title/studio on a bottom gradient
     - no price, rating, seller avatar, badge, or actions
   ------------------------------------------------------------- */

export function PieceCard(item) {
  const a = el('a', 'piece-card');
  a.href = `/piece.html?id=${encodeURIComponent(item.id)}`;

  const title = escapeHtml(item.title || item.name || '');
  const studio = escapeHtml(item.studio_name || item.seller_name || '');
  const imgSrc = item.image_url || item.images?.[0] || item.cover_image || '';

  // Reserve space: padding-top trick or aspect-ratio CSS
  const ar = (item.width && item.height)
    ? `${item.width} / ${item.height}`
    : '4 / 5'; // sensible fallback for fashion/product

  a.innerHTML = `
    <div class="piece-card-media" style="aspect-ratio:${ar}">
      <img class="piece-card-img" src="${escapeHtml(imgSrc)}" alt="${title}" loading="lazy" decoding="async">
    </div>
    <div class="piece-card-overlay">
      <div class="piece-card-title">${title}</div>
      ${studio ? `<div class="piece-card-studio"><i class="fas fa-circle"></i> ${studio}</div>` : ''}
    </div>`;

  return a;
}

/* -------------------------------------------------------------
   8. Saved piece card
   Composition: PieceCard + a remove button.
   Keeps PieceCard clean for Explore.
   ------------------------------------------------------------- */

/* -------------------------------------------------------------
   8. Saved piece card
   Image, quiet caption, studio mini-avatar. No overlay, no price,
   no CTA. Space reserved via aspect-ratio.

   Long-press fires onLongPress(item, cardEl). Click is delegated
   by the Saved tab (see saved.js) so the card itself stays dumb.
   ------------------------------------------------------------- */

export function SavedPieceCard(item, { onLongPress } = {}) {
  const card = document.createElement('a');
  card.className = 'saved-piece';
  card.href = `/piece.html?id=${encodeURIComponent(item.id)}`;
  card.dataset.pieceId = item.id;

  const title  = escapeHtml(item.title || item.name || '');
  const studio = escapeHtml(item.studio_name || '');
  const imgSrc = item.image_url || item.images?.[0] || '';
  const avatar = item.studio_avatar_url || '';

  const ar = (item.width && item.height)
    ? `${item.width} / ${item.height}`
    : (item.aspect_ratio ? `1 / ${1 / item.aspect_ratio}` : '4 / 5');

  card.innerHTML = `
    <div class="saved-piece-media" style="aspect-ratio:${ar}">
      ${imgSrc
        ? `<img class="saved-piece-img" src="${escapeHtml(imgSrc)}" alt="${title}"
                loading="lazy" decoding="async">`
        : `<div class="saved-piece-img saved-piece-img--placeholder">
             <i class="fas fa-image"></i>
           </div>`}
      <div class="saved-piece-check" aria-hidden="true">
        <i class="fas fa-check"></i>
      </div>
    </div>
    <div class="saved-piece-caption">
      <div class="saved-piece-title">${title}</div>
      ${studio ? `
        <div class="saved-piece-studio">
          ${avatar
            ? `<span class="saved-piece-studio-avatar"
                     style="background-image:url('${escapeHtml(avatar)}')"></span>`
            : ''}
          <span class="saved-piece-studio-name">${studio}</span>
        </div>` : ''}
    </div>
  `;

  if (onLongPress) attachLongPress(card, () => onLongPress(item, card));

  return card;
}

/* -------------------------------------------------------------
   Long-press helper (module-private)
   ------------------------------------------------------------- */

function attachLongPress(el, onLongPress, { delay = 500 } = {}) {
  let timer = null;
  let fired = false;

  const start = () => {
    fired = false;
    timer = setTimeout(() => {
      timer = null;
      fired = true;
      onLongPress();
    }, delay);
  };
  const cancel = () => {
    if (timer) { clearTimeout(timer); timer = null; }
  };
  const swallowClick = (e) => {
    if (fired) {
      e.preventDefault();
      e.stopPropagation();
      fired = false;
    }
  };

  el.addEventListener('touchstart', start, { passive: true });
  el.addEventListener('touchend', cancel);
  el.addEventListener('touchmove', cancel, { passive: true });
  el.addEventListener('touchcancel', cancel);

  el.addEventListener('mousedown', start);
  el.addEventListener('mouseup', cancel);
  el.addEventListener('mouseleave', cancel);

  el.addEventListener('click', swallowClick, true);
  el.addEventListener('contextmenu', (e) => e.preventDefault());
}