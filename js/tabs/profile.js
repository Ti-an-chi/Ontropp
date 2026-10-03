// profile.js — Profile tab
import API from '../../api.js';
import { updateElement, changeDisplay } from '../utility/reconfig.js';
import { formatNumber, formatPrice } from '../utility/shared.js';
import StateView from '../uiTools/stateView.js';

const MAX_AVATAR_SIZE = 2 * 1024 * 1024;
const UPLOAD_PRESET = 'seller_logo_unsigned';

let userData = null;
let isLoading = false;

// Avatar state machinery
let avatarState = null;
// Tracks an in-flight upload so retry can resume without re-uploading the file.
// { file: File|null, uploadedUrl: string|null }
let pendingAvatarUpload = null;

/* ============================================================
   INIT
   ============================================================ */
export async function initProfileTab() {
  if (isLoading) return;
  isLoading = true;

  try {
    setupAvatarStateView();
    setupAvatarUpload();
    setupDesignerActions();
    setupTabSwitchers();

    if (!window.bootstrap?.userData) {
      window.bootstrap = await loadUserData();
    }
    userData = window.bootstrap.userData;

    renderHeader();
    renderStats();
		console.log('user or designer');
    renderDesignerBlock();

    await Promise.allSettled([
      loadSavedPreview(),
      loadRecentlyViewed(),
    ]);
  } finally {
    isLoading = false;
  }
}

async function loadUserData() {
  try {
    return await API.getUserDash();
  } catch (error) {
    console.error('Failed to load user data:', error);
    return {
      userData: {
        username: 'Shopper',
        email: 'shopper@example.com',
        role: 'buyer',
        avatar_url: '',
      },
    };
  }
}

/* ============================================================
   HEADER
   ============================================================ */
function renderHeader() {
  const isDesigner = userData.role === 'seller';

  updateElement('profile-display-name', userData.username || 'Shopper');
  updateElement('profile-display-email', userData.email || '');

  const rolePill = document.getElementById('profile-role');
  if (rolePill) {
    rolePill.textContent = isDesigner ? 'Designer' : 'Shopper';
    rolePill.classList.toggle('designer', isDesigner);
  }

  renderAvatar();

  // Public profile link — designers only
  if (isDesigner && userData.sellerProfile?.id) {
    const linkEl = document.getElementById('profile-link-btn');
    if (linkEl) {
      linkEl.href = `/portfolio.html?id=${userData.sellerProfile.id}`;
      linkEl.hidden = false;
    }
  }
}

/* ============================================================
   AVATAR — StateView + upload pipeline
   ============================================================ */
function setupAvatarStateView() {
  const container = document.getElementById('avatar-state-container');
  if (!container) return;

	avatarState = new StateView(container, {
  selectors: {
    loading: '[data-state="loading"]',
    data:    '[data-state="data"]',
    empty:   '[data-state="empty"]',
    error:   '[data-state="error"]',
  },
  displays: {
    loading: 'flex',
    data:    'flex',
    empty:   'flex',
    error:   'flex',
  },
});

  // Broken image URL handler — this decides 'error' when we're NOT mid-upload.
  const img = document.getElementById('profile-avatar-img');
  if (img) {
    img.addEventListener('error', () => {
      if (!pendingAvatarUpload) {
        avatarState.show('error');
      }
    });
  }
}

function renderAvatar() {
  if (!avatarState) return;

  const url = userData?.avatar_url;
  const img = document.getElementById('profile-avatar-img');

  if (!url) {
    avatarState.show('empty');
    return;
  }

  if (!img) {
    avatarState.show('data');
    return;
  }

  // Wait for the image to actually decode before showing 'data'.
  const onLoad = () => {
    img.removeEventListener('load', onLoad);
    avatarState.show('data');
  };
  img.addEventListener('load', onLoad, { once: true });

  img.src = url;

  // Cached images may fire 'load' before the listener attaches — nudge it.
  if (img.complete && img.naturalWidth > 0) {
    img.removeEventListener('load', onLoad);
    avatarState.show('data');
  }
}

function setupAvatarUpload() {
  const input = document.getElementById('edit-avatar-input');
  const triggerBtn = document.getElementById('edit-avatar-btn');
  const editBtn = document.getElementById('edit-profile-btn');
  const retryBtn = document.getElementById('avatar-retry-btn');

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

    // Fresh upload — clear any previous pending state
    pendingAvatarUpload = { file, uploadedUrl: null };
    runAvatarUpload();
    this.value = '';
  });

  retryBtn?.addEventListener('click', () => {
    if (!pendingAvatarUpload) return;
    // If we already have the URL, skip upload and just retry the profile PATCH.
    runAvatarUpload();
  });
}

/**
 * Upload pipeline. Resumes from wherever pendingAvatarUpload is:
 *   - file set, no uploadedUrl  → upload to Cloudinary, then PATCH profile
 *   - file set, uploadedUrl set → skip Cloudinary, just PATCH profile
 *   - nothing usable            → reset, restore previous visual (no error)
 */
async function runAvatarUpload() {
  if (!pendingAvatarUpload) return;

  if (!pendingAvatarUpload.file && !pendingAvatarUpload.uploadedUrl) {
    pendingAvatarUpload = null;
    renderAvatar();
    return;
  }

  const img = document.getElementById('profile-avatar-img');
  const previousSrc = img?.src || userData?.avatar_url || '';
  const previousState = avatarState?.currentState || 'empty';

  avatarState.show('loading');

  try {
    // Stage 1: upload to Cloudinary (skipped on resume)
    if (!pendingAvatarUpload.uploadedUrl) {
      const formData = new FormData();
      formData.append('file', pendingAvatarUpload.file);
      formData.append('upload_preset', UPLOAD_PRESET);
      formData.append('folder', 'users/profile');

      const resp = await API.uploadImage(formData);
      pendingAvatarUpload.uploadedUrl = resp.secure_url;

      // Optimistic preview
      if (img) img.src = pendingAvatarUpload.uploadedUrl;
    }

    // Stage 2: persist to profile (retry resumes here)
    await API.updateProfile({ avatar_url: pendingAvatarUpload.uploadedUrl });

    // Commit to userData + bootstrap
    if (userData) userData.avatar_url = pendingAvatarUpload.uploadedUrl;
    if (window.bootstrap?.userData) {
      window.bootstrap.userData.avatar_url = pendingAvatarUpload.uploadedUrl;
    }

    pendingAvatarUpload = null;
    avatarState.show('data');

  } catch (err) {
    console.error('Avatar upload failed:', err);

    // Revert optimistic src
    if (img) img.src = previousSrc;

    // No URL → nothing to retry against. Restore visual, no error state.
    if (!pendingAvatarUpload?.uploadedUrl) {
      pendingAvatarUpload = null;
      avatarState.show(previousState === 'loading' ? 'empty' : previousState);
      return;
    }

    // We have the URL — the PATCH failed. Error state + retry resumes Stage 2.
    avatarState.show('error');
  }
}

/* ============================================================
   STATS ROW
   ============================================================ */
function renderStats() {
  const row = document.getElementById('profile-stats-row');
  if (!row) return;

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
	if (userData.role !== 'seller') {
		changeDisplay('profile-link-btn', 'none')
		return;
	};

	const block = document.getElementById('profile-designer-block');
	if (!block) return;
	block.hidden = false;

	renderDesignerStats();
}

function renderDesignerStats() {
  const row = document.getElementById('designer-stats-row');
  if (!row) return;

  const s = userData.stats || {};

  // Reuses .stat-card from components.css
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
    <div class="stat-card">
      <div class="stat-icon"><i class="fas ${c.icon}"></i></div>
      <div class="stat-details">
        <h3 class="stat-title">${c.label}</h3>
        <p class="stat-value ${c.value === null ? 'muted' : ''}">
          ${c.value === null ? '—' : formatNumber(c.value)}
        </p>
      </div>
    </div>
  `).join('');
}

/* ============================================================
   SAVED PREVIEW — uses .products-grid + .product-card
   ============================================================ */
async function loadSavedPreview() {
  const grid = document.getElementById('profile-favourites-grid');
  const empty = document.getElementById('empty-favourites-preview');
  if (!grid || !empty) return;

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

    grid.innerHTML = items.map(item => `
      <a href="product.html?id=${item.id}" class="product-card">
        <div class="product-image">
          ${item.cover_image
            ? `<img src="${item.cover_image}" alt="${escapeHtml(item.name)}" loading="lazy">`
            : `<i class="fas fa-box"></i>`}
        </div>
        <div class="product-details">
          <h3 class="product-title">${escapeHtml(item.name)}</h3>
          <p class="product-price">₦${formatPrice(item.price)}</p>
        </div>
      </a>
    `).join('');
  } catch (error) {
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

  if (typeof API.getRecentlyViewed !== 'function') return;

  try {
    const items = await API.getRecentlyViewed();
    if (!Array.isArray(items) || items.length === 0) return;

    scroll.innerHTML = items.slice(0, 6).map(item => `
      <a href="product.html?id=${item.id}" class="recently-viewed-item">
        <div class="recently-viewed-image">
          ${item.cover_image
            ? `<img src="${item.cover_image}" alt="${escapeHtml(item.name)}" loading="lazy">`
            : `<i class="fas fa-box"></i>`}
        </div>
        <div class="recently-viewed-details">
          <div class="recently-viewed-title">${escapeHtml(item.name)}</div>
          <div class="recently-viewed-price">₦${formatPrice(item.price)}</div>
        </div>
      </a>
    `).join('');

    section.hidden = false;
  } catch (error) {
    console.warn('Recently viewed unavailable:', error.message);
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
   TAB SWITCHERS
   ============================================================ */
function setupTabSwitchers() {
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
function escapeHtml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}