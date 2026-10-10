// profile.js — Profile tab orchestrator.
// Fetch, delegate to factories, mount. No markup strings for components.

import API from '../../api.mock.js';
import { updateElement, changeDisplay, setupTabSwitchers } from '../utility/reconfig.js';
import { relativeTime, escapeHtml } from '../utility/shared.js';
import {
  CollectionCard, TrailItem, NetworkChip, SignalCard, AccountItem,
} from '../cards.js';
import { createAvatarController } from '../utility/avatar.js';

const state = {
  user: null,
  isDesigner: false,
  collections: [],
  trail: [],
  network: { designers: [], studios: [] },
  signals: null,
  exhibition: [],
};

let avatar = null;
let isLoading = false;

/* ============================================================
   BOOT
   ============================================================ */

export async function initProfileTab() {
  if (isLoading) return;
  isLoading = true;

  try {
    if (!window.bootstrap?.userData) {
      window.bootstrap = await loadUserData();
    }
    state.user = window.bootstrap.userData;
    state.isDesigner = state.user.role === 'seller';

    setupAvatar();
    setupActions();
    setupTabSwitchers();

    renderIdentity();
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
  try { return await API.getUserDash(); }
  catch (err) {
    console.error('Failed to load user data:', err);
    return { userData: {
      username: 'Explorer', email: '', role: 'buyer', avatar_url: '', statement: '',
    } };
  }
}

async function loadProfileDash() {
  if (typeof API.getProfileDash !== 'function') return {};
  try { return await API.getProfileDash(); }
  catch (err) { console.warn('Profile dash unavailable:', err.message); return {}; }
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
  toggle('profile-signals-section',      isDesigner);
  toggle('profile-exhibition-section',   isDesigner);

  renderAccount(isDesigner);
}

function toggle(id, show) {
  const el = document.getElementById(id);
  if (el) el.hidden = !show;
}

/* ============================================================
   AVATAR
   ============================================================ */

function setupAvatar() {
  avatar = createAvatarController({
    containerEl:  document.getElementById('avatar-state-container'),
    imgEl:        document.getElementById('profile-avatar-img'),
    inputEl:      document.getElementById('edit-avatar-input'),
    retryEl:      document.getElementById('avatar-retry-btn'),
    triggerEls: [
      document.getElementById('edit-avatar-btn'),
      document.getElementById('edit-profile-btn'),
    ],
    uploadPreset: 'seller_logo_unsigned',
    uploadFolder: 'users/profile',
    onUploadToCloud: (fd) => API.uploadImage(fd),
    onSaveUrl: (url) => API.updateProfile({ avatar_url: url }),
  });

  avatar?.show(state.user?.avatar_url);
}

/* ============================================================
   COLLECTIONS / EXHIBITION
   ============================================================ */

function renderCollections() { mountCards('collections-grid', 'collections-empty', state.collections); }
function renderExhibition()  { mountCards('exhibition-grid',  'exhibition-empty',  state.exhibition); }

function mountCards(gridId, emptyId, items) {
  const grid  = document.getElementById(gridId);
  const empty = document.getElementById(emptyId);
  if (!grid || !empty) return;

  if (!items.length) {
    grid.innerHTML = ''; grid.hidden = true; empty.hidden = false;
    return;
  }
  grid.hidden = false; empty.hidden = true;
  grid.innerHTML = '';
  items.forEach(c => grid.appendChild(CollectionCard(c)));
}

/* ============================================================
   TRAIL
   ============================================================ */

function renderTrail() {
  const list = document.getElementById('trail-list');
  if (!list) return;

  if (!state.trail.length) {
    toggle('profile-trail-section', false);
    return;
  }
  list.innerHTML = '';
  state.trail.forEach(t => list.appendChild(TrailItem(t, { relativeTime })));
}

/* ============================================================
   FOLLOWING
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

  if (!items.length) { section.hidden = true; return; }

  section.hidden = false;
  strip.innerHTML = '';
  items.forEach(i => strip.appendChild(NetworkChip(i)));
}

/* ============================================================
   SIGNALS
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

  list.innerHTML = '';
  signals.forEach(sig => list.appendChild(SignalCard(sig)));
}

/* ============================================================
   ACCOUNT
   ============================================================ */

function renderAccount(isDesigner) {
  const list = document.getElementById('account-list');
  if (!list) return;

  const items = isDesigner
    ? [
        { icon: 'fa-pen',             label: 'Edit profile',     action: 'edit' },
        { icon: 'fa-store',           label: 'Studio settings',  action: 'studio-settings' },
        { icon: 'fa-cog',             label: 'Account settings', action: 'account-settings' },
        { icon: 'fa-question-circle', label: 'Help & Support',   action: 'help' },
        { icon: 'fa-sign-out-alt',    label: 'Log out', action: 'logout', danger: true },
      ]
    : [
        { icon: 'fa-pen',             label: 'Edit profile',     action: 'edit' },
        { icon: 'fa-palette',         label: 'Open a Studio',    action: 'open-studio' },
        { icon: 'fa-cog',             label: 'Account settings', action: 'account-settings' },
        { icon: 'fa-question-circle', label: 'Help & Support',   action: 'help' },
        { icon: 'fa-sign-out-alt',    label: 'Log out', action: 'logout', danger: true },
      ];

  list.innerHTML = '';
  items.forEach(it => list.appendChild(AccountItem(it)));

  // Single delegated handler — survives re-renders.
  list.onclick = (e) => {
    const btn = e.target.closest('[data-action]');
    if (btn) handleAccountAction(btn.dataset.action);
  };
}

function handleAccountAction(action) {
  const routes = {
    'edit':             () => avatar?.openPicker(),
    'studio-settings':  () => { window.location.href = 'useraccountsettings.html'; },
    'account-settings': () => { window.location.href = 'useraccountsettings.html'; },
    'open-studio':      () => { window.location.href = 'setup-seller.html'; },
    'help':             () => { window.location.href = 'help.html'; },
    'logout':           () => { window.location.href = 'login.html'; },
  };
  routes[action]?.();
}

/* ============================================================
   ACTIONS
   ============================================================ */

function setupActions() {
  document.getElementById('new-collection-btn')
    ?.addEventListener('click', () => { /* modal later */ });

  document.getElementById('exhibition-add-btn')
    ?.addEventListener('click', () => { window.location.href = 'upload.html'; });

  document.getElementById('manage-exhibition-btn')
    ?.addEventListener('click', () => { window.location.href = 'designerDashboard.html'; });
}