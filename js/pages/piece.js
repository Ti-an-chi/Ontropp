/**
 * piece.js — Piece detail orchestrator.
 * Matches piece.html structure and uses real API + SpecEngine.
 */
/**
 * piece.js — Piece detail orchestrator.
 * Matches piece.html structure and uses real API + SpecEngine.
 */
import API from '/api.js';
import { SpecEngine } from '../lab/specEngine.js';
import { createStateView } from '../state.js';
import { showToast } from '../toast.js';
import { FashionCard, escapeHtml } from '../cards.js';
// ✅ 1. IMPORT THE UNIFIED COMPONENT
import { DesignerFollowButton } from '../utility/reconfig.js'; 

const params = new URLSearchParams(location.search);
const productId = params.get('id') || params.get('productId') || 'bd130930-e09f-4f82-a1e0-09d031cfe6fb';
const engine = new SpecEngine();

let piece = null;
let studio = null;
let designer = null; 

init();

async function init() {
  const heroSv = createStateView(document.querySelector('[data-state-view="piece-hero"]'));
  const makerSv = createStateView(document.querySelector('[data-state-view="piece-maker"]'));
  const garmentSv = createStateView(document.querySelector('[data-state-view="piece-garment"]'));
  const otherSv = createStateView(document.querySelector('[data-state-view="piece-other"]'));
  
  [heroSv, makerSv, garmentSv, otherSv].forEach(sv => sv?.loading());

  try {
    const response = await API.getProductById(productId);
    piece = response.product || response;
    studio = piece.studio || {};
    designer = studio.user || {}; 

    if (document.querySelector('.header-actions .studio-logo, .header-actions img, .header-actions .profile-icon') && studio.logo_url) {
      document.querySelector('.header-actions .studio-logo, .header-actions img, .header-actions .profile-icon').src = studio.logo_url;
    }
    
    document.title = `${piece.name} · ONTROPP`;
    
    if (heroSv) renderHero(heroSv.dataEl);
    if (makerSv) renderStudio(makerSv.dataEl);
    if (garmentSv) renderSpecifications(garmentSv.dataEl);
    
    [heroSv, makerSv, garmentSv].forEach(sv => sv?.data());
    
    wireSave();
    
    // ✅ 2. REPLACE wireFollow WITH THE UNIFIED OOP COMPONENT
    const followBtn = document.querySelector('.follow-btn');
    if (followBtn && designer.id) {
      new DesignerFollowButton(followBtn, designer.id, false, {
        onChange: (isFollowing) => {
          console.log(`Studio ${designer.id} follow status changed to:`, isFollowing);
        }
      });
    }

    if (otherSv && piece.studio_id) {
      loadOtherWorks(otherSv, piece.studio_id);
    } else {
      otherSv?.empty();
    }
  } catch (err) {
    console.error('Failed to load piece:', err);
    [heroSv, makerSv, garmentSv, otherSv].forEach(sv => sv?.empty());
    showToast({ message: 'Could not load this piece.' });
  }
}

// ✅ 3. DELETE the old `wireFollow` function entirely. It is no longer needed.
/* =========================================================
 * HERO — Handles image dimensions and description
 * ========================================================= */
function renderHero(container) {
  const img = container.querySelector('.js-hero-img');
  img.src = piece.cover_image?.url || '';
  img.alt = piece.name || '';

  // Fix for square images: use aspect-ratio or min-height
  if (piece.cover_image?.aspect_ratio) {
    img.parentElement.style.aspectRatio = piece.cover_image.aspect_ratio;
  } else {
    img.parentElement.style.minHeight = '400px'; // Fallback for tall images
  }

  container.querySelector('.js-hero-studio').textContent = studio.brand_name || '';
  
  const collectionName = piece.category || 'Collection';
  container.querySelector('.js-hero-collection').textContent = 
    `${piece.name} — ${collectionName}.`;
    
  container.querySelector('.js-hero-description').textContent = piece.description || '';
}

/* =========================================================
 * STUDIO/DESIGNER — Shows the user behind the brand
 * ========================================================= */
function renderStudio(container) {
  // Use designer avatar if available, otherwise fall back to studio logo or initials
  const avatarUrl = designer.avatar_url || studio.logo_url;
  const avatarEl = container.querySelector('.js-maker-initials');
  
  if (avatarUrl) {
    avatarEl.innerHTML = `<img src="${avatarUrl}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`;
  } else {
    const initials = (designer.username || studio.brand_name || '')
      .split(' ')
      .map(w => w[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() || '—';
    avatarEl.textContent = initials;
  }

  container.querySelector('.js-maker-name').textContent = designer.username || 'Unknown Designer';
  container.querySelector('.js-maker-role').textContent = studio.speciality || 'Designer';
}

/* =========================================================
 * SPECIFICATIONS — Robust mapping using SpecEngine
 * ========================================================= */
function renderSpecifications(container) {
  const grid = container.querySelector('.garment-grid');
  if (!grid) return;

  const specs = piece.specifications || {};
  const entries = Object.entries(specs).slice(0, 6); // Limit to 6

  if (entries.length === 0) {
    grid.innerHTML = '<p class="text-muted" style="grid-column: 1/-1;">No details available.</p>';
    return;
  }

  grid.innerHTML = entries.map(([key, values]) => {
    const iconClass = engine.getFieldIcon(key);
    const displayValue = Array.isArray(values) ? values.join(', ') : values;
    
    return `
      <div class="garment-item">
        <i class="fa-solid ${iconClass}"></i>
        <div>
          <span>${escapeHtml(key)}</span>
          <p>${escapeHtml(displayValue || '—')}</p>
        </div>
      </div>
    `;
  }).join('');
}

/* =========================================================
 * OTHER WORKS
 * ========================================================= */
async function loadOtherWorks(sv, studioId) {
  try {
    const items = await API.getStudioPieces(studioId, 1, 12);
    const filteredItems = items.filter(p => p.id !== piece.id);

    if (!filteredItems.length) {
      sv.empty();
      return;
    }

    const gallery = sv.dataEl.querySelector('.fashion-gallery');
    gallery.innerHTML = '';
    
    filteredItems.forEach(p => gallery.appendChild(FashionCard(p)));

    const h2 = sv.dataEl.querySelector('.gallery-heading h2');
    if (h2 && studio) {
      h2.textContent = `More works by ${studio.brand_name || 'this studio'}`;
    }

    sv.data();
  } catch (err) {
    console.error('Other works failed:', err);
    sv.empty();
  }
}

/* =========================================================
   SAVE ACTION 
========================================================= */
function wireSave() {
  const btn = document.querySelector('.save-pill');
  if (!btn) return;
  
  btn.addEventListener('click', async () => {
    const prev = btn.textContent;
    btn.disabled = true;
    try {
      await API.addToSaved(piece.id);
      btn.textContent = 'Saved';
      showToast({ message: 'Saved' });
    } catch {
      try {
        await API.removeFromSaved(piece.id);
        btn.textContent = 'Save';
        showToast({ message: 'Removed' });
      } catch {
        btn.textContent = prev;
        showToast({ message: 'Sign in to save pieces' });
      }
    } finally {
      btn.disabled = false;
    }
  });
}