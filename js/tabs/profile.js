// profile.js — Profile tab
import API from '../../api.js';
import { updateElement, changeDisplay } from '../utility/reconfig.js';

let userData = null;
let isLoading = false;

const MAX_AVATAR_SIZE = 2 * 1024 * 1024; // 2MB
const UPLOAD_PRESET = 'seller_logo_unsigned';
const FALLBACK_AVATAR = 'https://ui-avatars.com/api/?name=User&background=3483E0&color=fff';

/* ============================================================
   INIT
   ============================================================ */
export async function initProfileTab() {
  if (isLoading) return;
  isLoading = true;

  try {
    if (!window.bootstrap?.userData) {
      window.bootstrap = await loadUserData();
    }
    userData = window.bootstrap.userData;

    setupAvatarUpload();
    setupDesignerActions();
    setupPreviewTabSwitchers();

    renderHeader();
    renderStats();
    renderDesignerBlock();

    // Fire-and-forget parallel loads — each hides itself on failure
    await Promise.allSettled([
      loadFavouritesPreview(),
      loadRecentlyViewed(),
    ]);
  } finally {
    isLoading = false;
  }
}

/* ============================================================
   DATA LOADING
   ============================================================ */
async function loadUserData() {
  try {
    return await API.getUserDash();
  } catch (error) {
    console.error('Failed to load user data:', error);
    return {
      userData: {
        username: 'User',
        email: 'user@example.com',
        isSeller: false,
        role: 'shopper',
        avatar_url: '',
      },
    };
  }
}

/* ============================================================
   HEADER RENDER
   ============================================================ */
function renderHeader() {
  const role = userData.role === 'seller' ? 'designer' : 'shopper';

  updateElement('profile-display-name', userData.username || 'User');
  updateElement('profile-display-email', userData.email || '');

  const rolePill = document.getElementById('profile-role');
  if (rolePill) {
    rolePill.textContent = userData.role === 'seller' ? 'Designer' : 'shopper';
    rolePill.classList.toggle('designer', userData.role === 'seller');
  }

  const avatarImg = document.getElementById('profile-avatar-img');
  if (avatarImg) {
    avatarImg.src = userData.avatar_url || FALLBACK_AVATAR;
  }

  // Public profile link — designers only
  if (userData.role === 'seller' && userData.sellerProfile?.id) {
    const linkEl = document.getElementById('profile-link-btn');
    const wrapper = document.getElementById('seller-profile-link');
    if (linkEl && wrapper) {
      linkEl.href = `${window.location.origin}/portfolio.html?id=${userData.sellerProfile.id}`;
      wrapper.hidden = false;
    }
  }

  // Role-tag body for scoped styles if needed later
  document.body.dataset.role = role;
}

/* ============================================================
   STATS ROW
   ============================================================ */
function renderStats() {
  const row = document.getElementById('profile-stats-row');
  if (!row) return;

  const isDesigner = userData.role === 'seller';

  // Buyers: Saved + Following
  // Designers: Saved + Following (their designer stats live in the designer block)
  const stats = [
    { label: 'Saved',     value: userData.favoritesCount ?? userData.savedCount ?? 0 },
    { label: 'Following', value: userData.followingsCount ?? userData.followingCount ?? 0 },
  ];

  row.innerHTML = stats.map(s => `
    <div class="profile-stat-item">
      <span class="profile-stat-value">${formatNumber(s.value)}</span>
      <span class="profile-stat-label">${s.label}</span>
    </div>
  `).join('');
}

/* ============================================================
   DESIGNER BLOCK
   ============================================================ */
function renderDesignerBlock() {
  if (userData.role !== 'seller') return;

  const block = document.getElementById('profile-designer-block');
  if (!block) return;
  block.hidden = false;

  renderDesignerStats();
  // Products grid is left empty — caller injects via renderDesignerProducts()
}

function renderDesignerStats() {
  const row = document.getElementById('designer-stats-row');
  if (!row) return;

  const s = userData.stats || {};

  const cards = [
    {
      icon: 'fa-eye',
      label: 'Total Views',
      value: s.totalProductViews ?? null,
    },
    {
      icon: 'fa-heart',
      label: 'Saved this week',
      value: s.savedThisWeek ?? null,
    },
    {
      icon: 'fa-user-friends',
      label: 'Followers',
      value: s.followers ?? userData.followersCount ?? null,
    },
  ];

  row.innerHTML = cards.map(c => `
    <div class="designer-stat-card">
      <div class="designer-stat-icon"><i class="fas ${c.icon}"></i></div>
      <span class="designer-stat-value ${c.value === null ? 'muted' : ''}">
        ${c.value === null ? '—' : formatNumber(c.value)}
      </span>
      <span class="designer-stat-label">${c.label}</span>
    </div>
  `).join('');
}

/**
 * Public — lets other modules (e.g. a designer dashboard script)
 * inject the products grid without this file inventing an endpoint.
 */
export function renderDesignerProducts(products) {
  if (!Array.isArray(products) || products.length === 0) return;

  const section = document.getElementById('designer-products-section');
  const grid = document.getElementById('profile-seller-products');
  if (!section || !grid) return;

  grid.innerHTML = products.slice(0, 4).map(p => `
    <a href="product.html?id=${p.id}" class="product-card">
      <div class="product-image">
        ${p.cover_image
          ? `<img src="${p.cover_image}" alt="${escapeHtml(p.name)}" loading="lazy">`
          : `<i class="fas fa-box"></i>`}
      </div>
      <div class="product-details">
        <h3 class="product-title">${escapeHtml(p.name)}</h3>
        <p class="product-price">₦${formatPrice(p.price)}</p>
      </div>
    </a>
  `).join('');

  section.hidden = false;
}

/* ============================================================
   SAVED PREVIEW
   ============================================================ */
async function loadFavouritesPreview() {
  const grid = document.getElementById('profile-favourites-grid');
  const empty = document.getElementById('empty-favourites-preview');
  const section = document.getElementById('profile-saved-preview');
  if (!grid || !empty || !section) return;

  try {
    const favourites = await API.getFavourites();
    const items = Array.isArray(favourites) ? favourites.slice(0, 4) : [];

    if (items.length === 0) {
      grid.innerHTML = '';
      grid.hidden = true;
      empty.hidden = false;
      return;
    }

    grid.hidden = false;
    empty.hidden = true;

    grid.innerHTML = items.map((item, i) => `
      <div class="profile-fav-card" style="animation-delay:${i * 40}ms"
           data-product-id="${item.id}">
        <div class="profile-fav-image">
          ${item.cover_image
            ? `<img src="${item.cover_image}" alt="${escapeHtml(item.name)}" loading="lazy">`
            : `<i class="fas fa-box"></i>`}
        </div>
        <div class="profile-fav-details">
          <div class="profile-fav-title">${escapeHtml(item.name)}</div>
          <div class="profile-fav-price">₦${formatPrice(item.price)}</div>
        </div>
      </div>
    `).join('');

    // Click card → go to product page
    grid.querySelectorAll('.profile-fav-card').forEach(card => {
      card.addEventListener('click', () => {
        const id = card.dataset.productId;
        if (id) window.location.href = `product.html?id=${id}`;
      });
    });
  } catch (error) {
    // Silent — section just shows empty
    console.warn('Saved preview unavailable:', error.message);
    grid.hidden = true;
    empty.hidden = false;
  }
}

/* ============================================================
   RECENTLY VIEWED
   ============================================================ */
async function loadRecentlyViewed() {
  const section = document.getElementById('profile-recently-viewed');
  const scroll = document.getElementById('recently-viewed-scroll');
  if (!section || !scroll) return;

  // Endpoint may not exist yet — fail quietly
  if (typeof API.getRecentlyViewed !== 'function') return;

  try {
    const items = await API.getRecentlyViewed();
    if (!Array.isArray(items) || items.length === 0) return;

    scroll.innerHTML = items.slice(0, 6).map(item => `
      <div class="recently-viewed-item" data-product-id="${item.id}">
        <div class="recently-viewed-image">
          ${item.cover_image
            ? `<img src="${item.cover_image}" alt="${escapeHtml(item.name)}" loading="lazy">`
            : `<i class="fas fa-box"></i>`}
        </div>
        <div class="recently-viewed-details">
          <div class="recently-viewed-title">${escapeHtml(item.name)}</div>
          <div class="recently-viewed-price">₦${formatPrice(item.price)}</div>
        </div>
      </div>
    `).join('');

    scroll.querySelectorAll('.recently-viewed-item').forEach(el => {
      el.addEventListener('click', () => {
        window.location.href = `product.html?id=${el.dataset.productId}`;
      });
    });

    section.hidden = false;
  } catch (error) {
    console.warn('Recently viewed unavailable:', error.message);
  }
}

/* ============================================================
   AVATAR UPLOAD
   ============================================================ */
function setupAvatarUpload() {
  const input = document.getElementById('edit-avatar-input');
  const triggerBtn = document.getElementById('edit-avatar-btn');
  const editBtn = document.getElementById('edit-profile-btn');

  const openPicker = () => input?.click();

  triggerBtn?.addEventListener('click', openPicker);
  editBtn?.addEventListener('click', openPicker);

  input?.addEventListener('change', function () {
    const file = this.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please select an image file (JPG, PNG, etc.)');
      this.value = '';
      return;
    }
    if (file.size > MAX_AVATAR_SIZE) {
      alert('Image must be under 2MB');
      this.value = '';
      return;
    }

    uploadProfileImage(file);
    this.value = ''; // allow re-selecting same file
  });
}

async function uploadProfileImage(file) {
  const img = document.getElementById('profile-avatar-img');
  const overlay = document.getElementById('avatar-upload-overlay');
  const previousSrc = img?.src;

  overlay?.removeAttribute('hidden');

  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', UPLOAD_PRESET);
  formData.append('folder', 'users/profile');

  try {
    const resp = await API.uploadImage(formData);
    const url = resp.secure_url;
    await API.updateProfile({ avatar_url: url });

    if (img) img.src = url;
    if (userData) userData.avatar_url = url;
    if (window.bootstrap?.userData) window.bootstrap.userData.avatar_url = url;
  } catch (err) {
    console.error('Avatar upload failed:', err);
    if (img && previousSrc) img.src = previousSrc;
    alert('Upload failed. Please try again.');
  } finally {
    overlay?.setAttribute('hidden', '');
  }
}

/* ============================================================
   DESIGNER ACTIONS
   ============================================================ */
function setupDesignerActions() {
  document.getElementById('profile-add-product-btn')
    ?.addEventListener('click', () => { window.location.href = 'upload.html'; });

  document.getElementById('manage-products-profile-btn')
    ?.addEventListener('click', () => { window.location.href = 'designerDashboard.html'; });
}

/* ============================================================
   TAB SWITCHERS IN PREVIEW SECTIONS
   ============================================================ */
function setupPreviewTabSwitchers() {
  document.querySelectorAll('[data-switch-tab]').forEach(el => {
    el.addEventListener('click', (e) => {
      e.preventDefault();
      document.dispatchEvent(new CustomEvent('switchTab', {
        detail: el.dataset.switchTab,
      }));
    });
  });
}

/* ============================================================
   HELPERS
   ============================================================ */
function formatNumber(n) {
  const num = Number(n);
  if (!Number.isFinite(num)) return '0';
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (num >= 1_000)     return (num / 1_000).toFixed(1).replace(/\.0$/, '') + 'K';
  return String(num);
}

function formatPrice(price) {
  const num = Number(price) || 0;
  return new Intl.NumberFormat('en-NG').format(num);
}

function escapeHtml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}