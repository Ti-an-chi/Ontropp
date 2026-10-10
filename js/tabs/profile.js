// profile.js — Profile tab
// Orchestrator only: fetch, delegate to cards.js, mount.
// No markup strings where a Card() exists.

import API from '../../api.mock.js';   // swap to './api.js' when live
import { updateElement, changeDisplay } from '../utility/reconfig.js';
import { formatNumber } from '../utility/shared.js';
import { CollectionCard } from '../cards.js';
import StateView from '../uiTools/stateView.js';

const MAX_AVATAR_SIZE = 2 * 1024 * 1024;
const UPLOAD_PRESET = 'seller_logo_unsigned';

const state = {
  user: null,
  isDesigner: false,
  collections: [],
  trail: [],
  network: { designers: [], studios: [] },
  signals: null,
  exhibition: [],
};

let avatarState = null;
let pendingAvatarUpload = null;
let isLoading = false;

/* ============================================================
   INIT
   ============================================================ */
export async function initProfileTab() {
  if (isLoading) return;
  isLoading = true;

  try {
    setupAvatarStateView();
    setupAvatarUpload();
    setupActions();
    setupTabSwitchers();

    if (!window.bootstrap?.userData) {
      window.bootstrap = await loadUserData();
    }
    state.user = window.bootstrap.userData;
    state.isDesigner = state.user.role === 'seller';

    renderIdentity();
    renderAvatar();
    renderRoleSections();

    const dash = await loadProfileDash();
    state.collections = dash.collections || [];
    state.trail       = dash.trail || [];
    state.network     = dash.network || { designers: [], studios: [] };
    state.signals     = dash.signals || null;
    state.exhibition  = dash.exhibition || [];

    renderCollections();
    renderTrail();
    renderNetwork();
    renderSignals();
    renderExhibition();
  } finally {
    isLoading = false;
  }
}

async function loadUserData() {
  try {
    return await API.getUserDash();
  } catch (err) {
    console.error('Failed to load user data:', err);
    return {
      userData: {
        username: 'Explorer',
        email: 'explorer@example.com',
        role: 'buyer',
        avatar_url: '',
        statement: '',
      },
    };
  }
}

async function loadProfileDash() {
  if (typeof API.getProfileDash !== 'function') return {};
  try {
    return await API.getProfileDash();
  } catch (err) {
    console.warn('Profile dash unavailable:', err.message);
    return {};
  }
}

/* ============================================================
   IDENTITY
   ============================================================ */
function renderIdentity() {
  const u = state.user;
  const isDesigner = state.isDesigner;

  updateElement('profile-display-name', u.username || 'Explorer');

  const statementEl = document.getElementById('profile-statement');
  if (statementEl) {
    const fallback = isDesigner
      ? 'Add a statement to tell visitors what you make.'
      : 'Add a statement to tell designers what you look for.';
    statementEl.textContent = u.statement || fallback;
    statementEl.classList.toggle('is-placeholder', !u.statement);
  }

  const rolePill = document.getElementById('profile-role');
  if (rolePill) {
    rolePill.textContent = isDesigner ? 'designer' : 'explorer';
    rolePill.classList.toggle('designer', isDesigner);
  }

  if (isDesigner && u.sellerProfile?.id) {
    const linkEl = document.getElementById('profile-link-btn');
    if (linkEl) {
      linkEl.href = `/portfolio.html?id=${u.sellerProfile.id}`;
      linkEl.hidden = false;
    }
  } else {
    changeDisplay('profile-link-btn', 'none');
  }
}

/* ============================================================
   ROLE SECTIONS
   ============================================================ */
function renderRoleSections() {
  const isDesigner = state.isDesigner;

  toggle('profile-collections-section', !isDesigner);
  toggle('profile-trail-section',       !isDesigner);
  toggle('profile-network-section',     !isDesigner);

  toggle('profile-signals-section',     isDesigner);
  toggle('profile-exhibition-section',  isDesigner);

  updateAccountForRole(isDesigner);
}

function toggle(id, show) {
  const el = document.getElementById(id);
  if (el) el.hidden = !show;
}

/* ============================================================
   COLLECTIONS  (explorer)  &  EXHIBITION  (designer)
   Same component, different data, different label.
   ============================================================ */
function renderCollections() {
  mountCards('collections-grid', 'collections-empty', state.collections);
}

function renderExhibition() {
  mountCards('exhibition-grid', 'exhibition-empty', state.exhibition);
}

function mountCards(gridId, emptyId, items) {
  const grid  = document.getElementById(gridId);
  const empty = document.getElementById(emptyId);
  if (!grid || !empty) return;

  if (!items.length) {
    grid.innerHTML = '';
    grid.hidden = true;
    empty.hidden = false;
    return;
  }

  grid.hidden = false;
  empty.hidden = true;
  grid.innerHTML = '';
  items.forEach(c => grid.appendChild(CollectionCard(c)));
}

/* ============================================================
   TRAIL
   ============================================================ */
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

function renderTrail() {
  const list = document.getElementById('trail-list');
  if (!list) return;

  if (!state.trail.length) {
    const section = document.getElementById('profile-trail-section');
    if (section) section.hidden = true;
    return;
  }

  list.innerHTML = state.trail.map(t => {
    const icon = TRAIL_ICONS[t.type] || 'fa-circle';
    const verb = TRAIL_VERBS[t.type] || 'interacted with';
    return `
      <li class="trail-item">
        <span class="trail-icon"><i class="fas ${icon}"></i></span>
        <span class="trail-text">
          You ${verb} <strong>${escapeHtml(t.target_name || '')}</strong>
        </span>
        <span class="trail-time">${relativeTime(t.timestamp)}</span>
      </li>`;
  }).join('');
}

/* ============================================================
   FOLLOWING (network strip)
   ============================================================ */
function renderNetwork() {
  const strip = document.getElementById('network-strip');
  const section = document.getElementById('profile-network-section');
  if (!strip || !section) return;

  const items = [
    ...state.network.designers.map(d => ({
      id: d.id, name: d.name, avatar: d.avatar_url, kind: 'designer',
    })),
    ...state.network.studios.map(s => ({
      id: s.id, name: s.name, avatar: s.cover_url, kind: 'studio',
    })),
  ];

  if (!items.length) {
    section.hidden = true;
    return;
  }

  section.hidden = false;
  strip.innerHTML = items.map(i => `
    <a class="network-chip" href="#${i.kind}-${i.id}">
      <span class="network-avatar"
            style="background-image:url('${escapeAttr(i.avatar || '')}')"></span>
      <span class="network-name">${escapeHtml(i.name)}</span>
    </a>`).join('');
}

/* ============================================================
   SIGNALS  (designer)
   ============================================================ */
function renderSignals() {
  const list = document.getElementById('signals-list');
  if (!list || !state.signals) return;

  const s = state.signals;
  const signals = [
    { icon: 'fa-bookmark', value: s.savedThisWeek,      label: 'saves this week' },
    { icon: 'fa-comment',  value: s.inquiriesThisMonth, label: 'inquiries this month' },
    { icon: 'fa-star',     text:  s.topCollection,      label: 'top collection' },
  ];

  list.innerHTML = signals.map(sig => {
    const display = sig.text
      ? `<span class="signal-text">${escapeHtml(sig.text)}</span>`
      : `<span class="signal-value">${formatNumber(sig.value ?? 0)}</span>`;
    return `
      <div class="signal-card">
        <span class="signal-icon"><i class="fas ${sig.icon}"></i></span>
        ${display}
        <span class="signal-label">${escapeHtml(sig.label)}</span>
      </div>`;
  }).join('');
}

/* ============================================================
   ACCOUNT
   ============================================================ */
function updateAccountForRole(isDesigner) {
  const list = document.getElementById('account-list');
  if (!list) return;

  const items = isDesigner
    ? [
        { icon: 'fa-pen',             label: 'Edit profile',     action: () => openEditProfile() },
        { icon: 'fa-store',           label: 'Studio settings',  action: () => go('useraccountsettings.html') },
        { icon: 'fa-cog',             label: 'Account settings', action: () => go('useraccountsettings.html') },
        { icon: 'fa-question-circle', label: 'Help & Support',   action: () => go('help.html') },
        { icon: 'fa-sign-out-alt',    label: 'Log out', danger: true, action: () => logout() },
      ]
    : [
        { icon: 'fa-pen',             label: 'Edit profile',     action: () => openEditProfile() },
        { icon: 'fa-palette',         label: 'Open a Studio',    action: () => go('setup-seller.html') },
        { icon: 'fa-cog',             label: 'Account settings', action: () => go('useraccountsettings.html') },
        { icon: 'fa-question-circle', label: 'Help & Support',   action: () => go('help.html') },
        { icon: 'fa-sign-out-alt',    label: 'Log out', danger: true, action: () => logout() },
      ];

  list.innerHTML = items.map((it, i) => `
    <button class="account-item ${it.danger ? 'is-danger' : ''}" data-action="${i}">
      <i class="fas ${it.icon}"></i>
      <span class="account-item-label">${escapeHtml(it.label)}</span>
      <i class="fas fa-chevron-right account-item-chevron"></i>
    </button>`).join('');

  list.querySelectorAll('.account-item').forEach(btn => {
    btn.addEventListener('click', () => items[+btn.dataset.action].action());
  });
}

function openEditProfile() {
  // wire to modal later; navigate for now
  document.getElementById('edit-avatar-input')?.click();
}
function go(url) { window.location.href = url; }
function logout() {
  // wire to your auth flow
  window.location.href = 'login.html';
}

/* ============================================================
   AVATAR — unchanged; it works
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
      loading: 'flex', data: 'flex', empty: 'flex', error: 'flex',
    },
  });

  const img = document.getElementById('profile-avatar-img');
  if (img) {
    img.addEventListener('error', () => {
      if (!pendingAvatarUpload) avatarState.show('error');
    });
  }
}

function renderAvatar() {
  if (!avatarState) return;
  const url = state.user?.avatar_url;
  const img = document.getElementById('profile-avatar-img');

  if (!url) { avatarState.show('empty'); return; }
  if (!img) { avatarState.show('data'); return; }

  const onLoad = () => {
    img.removeEventListener('load', onLoad);
    avatarState.show('data');
  };
  img.addEventListener('load', onLoad, { once: true });
  img.src = url;

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
      this.value = ''; return;
    }
    if (file.size > MAX_AVATAR_SIZE) {
      alert('Image must be under 2MB');
      this.value = ''; return;
    }
    pendingAvatarUpload = { file, uploadedUrl: null };
    runAvatarUpload();
    this.value = '';
  });

  retryBtn?.addEventListener('click', () => {
    if (!pendingAvatarUpload) return;
    runAvatarUpload();
  });
}

async function runAvatarUpload() {
  if (!pendingAvatarUpload) return;
  if (!pendingAvatarUpload.file && !pendingAvatarUpload.uploadedUrl) {
    pendingAvatarUpload = null;
    renderAvatar();
    return;
  }

  const img = document.getElementById('profile-avatar-img');
  const previousSrc   = img?.src || state.user?.avatar_url || '';
  const previousState = avatarState?.currentState || 'empty';

  avatarState.show('loading');

  try {
    if (!pendingAvatarUpload.uploadedUrl) {
      const formData = new FormData();
      formData.append('file', pendingAvatarUpload.file);
      formData.append('upload_preset', UPLOAD_PRESET);
      formData.append('folder', 'users/profile');

      const resp = await API.uploadImage(formData);
      pendingAvatarUpload.uploadedUrl = resp.secure_url;
      if (img) img.src = pendingAvatarUpload.uploadedUrl;
    }

    await API.updateProfile({ avatar_url: pendingAvatarUpload.uploadedUrl });

    if (state.user) state.user.avatar_url = pendingAvatarUpload.uploadedUrl;
    if (window.bootstrap?.userData) {
      window.bootstrap.userData.avatar_url = pendingAvatarUpload.uploadedUrl;
    }

    pendingAvatarUpload = null;
    avatarState.show('data');
  } catch (err) {
    console.error('Avatar upload failed:', err);
    if (img) img.src = previousSrc;
    if (!pendingAvatarUpload?.uploadedUrl) {
      pendingAvatarUpload = null;
      avatarState.show(previousState === 'loading' ? 'empty' : previousState);
      return;
    }
    avatarState.show('error');
  }
}

/* ============================================================
   ACTIONS
   ============================================================ */
function setupActions() {
  document.getElementById('new-collection-btn')
    ?.addEventListener('click', () => { /* modal later */ });

  document.getElementById('exhibition-add-btn')
    ?.addEventListener('click', () => go('upload.html'));

  document.getElementById('manage-exhibition-btn')
    ?.addEventListener('click', () => go('designerDashboard.html'));
}

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
function relativeTime(ts) {
  if (!ts) return '';
  const diff = Date.now() - ts;
  const h = Math.floor(diff / 3600000);
  if (h < 1) return 'just now';
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d === 1) return 'yesterday';
  if (d < 7) return `${d}d ago`;
  const w = Math.floor(d / 7);
  return `${w}w ago`;
}

function escapeHtml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeAttr(str) {
  return escapeHtml(str).replace(/`/g, '&#96;');
}