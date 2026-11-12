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
import { formatNumber } from './utility/shared.js'

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
   Image helpers — new shape
   Each product image is now { id, url, width, height, aspect_ratio }.
   Legacy rows might still be strings; be lenient.
   ------------------------------------------------------------- */

// Pull the cover URL from a piece-like object. Prefers cover_image.url,
// falls back to cover_image (string legacy), then images[0].
function coverUrl(item) {
  const c = item?.cover_image;
  if (c && typeof c === 'object' && c.url) return c.url;
  if (typeof c === 'string' && c) return c;
  const first = item?.images?.[0];
  if (first && typeof first === 'object' && first.url) return first.url;
  if (typeof first === 'string' && first) return first;
  return '';
}

// CSS aspect-ratio string from a piece-like object. Order of preference:
//   cover_image {width, height}  →  cover_image.aspect_ratio  →  4/5
function coverAspectRatio(item) {
  const c = item?.cover_image;
  const first = item?.images?.[0];
  const src = (c && typeof c === 'object') ? c : (first && typeof first === 'object') ? first : null;

  if (src?.width && src?.height) return `${src.width} / ${src.height}`;
  if (src?.aspect_ratio)         return `1 / ${1 / src.aspect_ratio}`;
  return '4 / 5';
}

// Same idea but for an arbitrary image object (used by FashionCard which
// receives its own { image_url } or image object).
function imageAspectRatio(img, fallback = '4 / 5') {
  if (!img || typeof img !== 'object') return fallback;
  if (img.width && img.height) return `${img.width} / ${img.height}`;
  if (img.aspect_ratio)        return `1 / ${1 / img.aspect_ratio}`;
  return fallback;
}

/* -------------------------------------------------------------
   1. Trending slide
   ------------------------------------------------------------- */

export function TrendingSlide(item) {
  const a = el('a', 'trending-slide');
  a.href = `/piece.html?id=${encodeURIComponent(item.id)}`;
  a.style.backgroundImage = `url('${coverUrl(item)}')`;
  a.style.backgroundPosition = item.focal_point || 'center';
  a.innerHTML = `
    <div class="trending-meta">
      <span class="trending-kicker">${escapeHtml(item.kicker || 'Featured piece')}</span>
      <h3 class="trending-title">${escapeHtml(item.name || '')}</h3>
      <div class="trending-by">
        <i class="fas fa-circle"></i> ${escapeHtml(item.studio?.brand_name || '')}
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
  a.href = `#tab-explore=${encodeURIComponent(cat.id)}`;
  a.setAttribute('data-category-id', cat.id);   // ← ADD THIS
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

  const img = coverUrl(item) || item.image_url || '';
  a.innerHTML = `
    <div class="rec-img" style="background-image:url('${img}')">
      ${item.badge ? `<span class="rec-badge">${escapeHtml(item.badge)}</span>` : ''}
    </div>
    <div class="rec-body">
      <div class="rec-title">${escapeHtml(item.title || item.name || '')}</div>
      <div class="rec-studio">
        <i class="fas fa-circle"></i> ${escapeHtml(item.studio_name || item.studio?.brand_name || '')}
      </div>
    </div>`;
  return a;
}

/* -------------------------------------------------------------
   4. Designer card
   ------------------------------------------------------------- */

export function DesignerCard(data) {
  const designer = data.designer;
  const studio = data.studio;
  
  const wrapper = el('div', 'designer-card');

  const a = el('a', 'designer-link');
  a.href = `/publicProfile.html?id=${encodeURIComponent(designer.id)}`;
  a.innerHTML = `
    <div class="designer-avatar" style="background-image:url('${designer.avatar_url || ''}')"></div>
    <div class="designer-name">${escapeHtml(designer.username || '')}</div>
    <div class="designer-studio">${escapeHtml(studio.brand_name || '')}</div>`;

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'designer-follow';

  wrapper.append(a, btn);
  return wrapper;
}

/* -------------------------------------------------------------
   5. Fresh arrival card
   ------------------------------------------------------------- */

export function FreshCard(item) {
  const a = el('a', 'fresh-card');
  a.href = `/piece.html?id=${encodeURIComponent(item.id)}`;
  a.innerHTML = `
    <div class="fresh-img" style="background-image:url('${coverUrl(item)}')"></div>
    <div class="fresh-body">
      <div class="fresh-title">${escapeHtml(item.name || '')}</div>
      <div class="fresh-studio">${escapeHtml(item.studio?.brand_name || '')}</div>
    </div>`;
  return a;
}

/* -------------------------------------------------------------
   6. Studio card
   ------------------------------------------------------------- */

export function StudioCard(studio) {
  const a = el('a', 'studio-card');
  a.href = `/publicProfile.html?id=${encodeURIComponent(studio.designer.id)}`;
  a.innerHTML = `
    <div class="studio-thumb" style="background-image:url('${studio.logo_url || ''}')"></div>
    <div class="studio-body">
      <div class="studio-name">${escapeHtml(studio.brand_name || '')}</div>
      <div class="studio-by">${escapeHtml(studio.designer.username || '')} · ${escapeHtml(studio.location || '')}</div>
      ${studio.category.name ? `<span class="studio-tag">${escapeHtml(studio.category.name)}</span>` : ''}
    </div>
    <i class="fas fa-chevron-right studio-arrow"></i>`;
  return a;
}

/* -------------------------------------------------------------
   7. Explore piece card
   ------------------------------------------------------------- */

export function PieceCard(item) {
  const a = el('a', 'piece-card');
  a.href = `/piece.html?id=${encodeURIComponent(item.id)}`;

  const title = escapeHtml(item.name || item.title || '');
  const studio = escapeHtml(item.studio?.brand_name || '');
  const imgSrc = coverUrl(item) || item.image_url || '';
  const ar = coverAspectRatio(item);

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
   ------------------------------------------------------------- */

export function SavedPieceCard(item, { onLongPress } = {}) {
  const card = document.createElement('a');
  card.className = 'saved-piece';
  card.href = `/piece.html?id=${encodeURIComponent(item.id)}`;
  card.dataset.pieceId = item.id;

  const title  = escapeHtml(item.name || item.title || '');
  const studio = escapeHtml(item.studio_name || '');
  const imgSrc = coverUrl(item);
  const avatar = item.studio_avatar_url || '';
  const ar = coverAspectRatio(item);

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
   9. Collection card — used by Profile Collections + Exhibition.
   ------------------------------------------------------------- */

export function CollectionCard(item) {
  const a = el('a', 'collection-card');
  a.href = item.href || `/collection.html?id=${encodeURIComponent(item.id)}`;

  const name  = escapeHtml(item.name || 'Untitled');
  const cover = item.cover_image || '';
  const count = Number(item.piece_count || 0);
  const countLabel = `${count} ${count === 1 ? 'piece' : 'pieces'}`;

  a.innerHTML = `
    <div class="collection-cover"
         style="${cover ? `background-image:url('${escapeHtml(cover)}')` : ''}">
      ${cover ? '' : '<i class="fas fa-layer-group"></i>'}
    </div>
    <div class="collection-body">
      <div class="collection-name">${name}</div>
      <div class="collection-count">${countLabel}</div>
    </div>`;

  return a;
}

/* -------------------------------------------------------------
   10. Trail item — one row in the Profile "Trail" list.
   ------------------------------------------------------------- */

const TRAIL_ICONS = {
  saved:    'fa-bookmark',
  visited:  'fa-eye',
  followed: 'fa-user-plus',
  inquiry:  'fa-comment',
};
const TRAIL_VERBS = {
  saved:    'saved',
  visited:  'visited',
  followed: 'started following',
  inquiry:  'reached out to',
};

export function TrailItem(item, { relativeTime } = {}) {
  const icon = TRAIL_ICONS[item.type] || 'fa-circle';
  const verb = TRAIL_VERBS[item.type] || 'interacted with';
  const when = relativeTime ? relativeTime(item.timestamp) : '';

  const li = document.createElement('li');
  li.className = 'trail-item';
  li.innerHTML = `
    <span class="trail-icon"><i class="fas ${icon}"></i></span>
    <span class="trail-text">
      You ${verb} <strong>${escapeHtml(item.target_name || '')}</strong>
    </span>
    <span class="trail-time">${when}</span>`;
  return li;
}

/* -------------------------------------------------------------
   11. Network chip — following strip item.
   ------------------------------------------------------------- */

export function NetworkChip(item) {
  const a = el('a', 'network-chip');
  a.href = item.href || `#${item.kind}-${item.id}`;
  a.innerHTML = `
    <span class="network-avatar"
          style="background-image:url('${escapeHtml(item.avatar || '')}')"></span>
    <span class="network-name">${escapeHtml(item.name || '')}</span>`;
  return a;
}

/* -------------------------------------------------------------
   12. Signal card — designer feedback tile.
   ------------------------------------------------------------- */

export function SignalCard({ icon, value, text, label }) {
  const display = text
    ? `<span class="signal-text">${escapeHtml(text)}</span>`
    : `<span class="signal-value">${formatNumber(value ?? 0)}</span>`;

  const el_ = document.createElement('div');
  el_.className = 'signal-card';
  el_.innerHTML = `
    <span class="signal-icon"><i class="fas ${icon}"></i></span>
    ${display}
    <span class="signal-label">${escapeHtml(label)}</span>`;
  return el_;
}

/* -------------------------------------------------------------
   13. Account row — used by Profile Account list.
   ------------------------------------------------------------- */

export function AccountItem({ icon, label, action, danger }) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'account-item' + (danger ? ' is-danger' : '');
  btn.dataset.action = action;
  btn.innerHTML = `
    <i class="fas ${icon}"></i>
    <span class="account-item-label">${escapeHtml(label)}</span>
    <i class="fas fa-chevron-right account-item-chevron"></i>`;
  return btn;
}

/* -------------------------------------------------------------
   14. Fashion card — piece page "More works" grid.
   Also used by the public profile Work grid.

   variant:
     'fixed'  → image height 220px (piece page default, unchanged)
     'ratio'  → image uses the piece's aspect_ratio, no fixed height
   ------------------------------------------------------------- */

export function FashionCard(piece, { variant = 'fixed' } = {}) {
  const article = el('article', 'fashion-card' + (variant === 'ratio' ? ' fashion-card--ratio' : ''));

  const ar = coverAspectRatio(piece);
  const imageStyle = variant === 'ratio' ? ` style="aspect-ratio:${ar}"` : '';

  // Accept either the new cover_image object or a legacy image_url string.
  const imgSrc =
    (piece.cover_image && typeof piece.cover_image === 'object' && piece.cover_image.url) ||
    (typeof piece.cover_image === 'string' && piece.cover_image) ||
    piece.image_url ||
    '';

  article.innerHTML = `
    <a href="piece.html?id=${encodeURIComponent(piece.id)}" class="fashion-image"${imageStyle}>
      <img src="${escapeHtml(imgSrc)}"
           alt="${escapeHtml(piece.name || piece.title || '')}" loading="lazy" decoding="async">
    </a>
    <div class="card-information">
      <div>
        <h3>${escapeHtml(piece.name || piece.title || '')}</h3>
        <p>${escapeHtml(piece.category || '')}</p>
      </div>
      <button type="button" aria-label="Like ${escapeHtml(piece.name || piece.title || '')}">
        <i class="fa-regular fa-heart"></i>
      </button>
    </div>`;
  return article;
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