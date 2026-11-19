// profile.js — Profile tab orchestrator.
// Fetch, delegate to factories, mount. No markup strings for components.

import API from '../../api.js';
import { updateElement, changeDisplay, setupTabSwitchers } from '../utility/reconfig.js';
import { relativeTime, escapeHtml } from '../utility/shared.js';
import { CollectionCard, NetworkChip, AccountItem } from '../cards.js';
import { createAvatarController } from '../utility/avatar.js';
import { navigate } from '../nav.js';

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
    state.isDesigner = state.user.role === 'designer';

    setupAvatar();
    setupActions();
    setupTabSwitchers();

    renderIdentity();
    renderRoleSections();

    const dash = await loadProfileDash();
    state.collections = dash.collections || [];
    state.network     = dash.network || { designers: [], studios: [] };
    state.exhibition  = dash.exhibition || [];

    renderCollections();
    renderNetwork();
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
      username: 'User', email: '', role: 'explorer', avatar_url: '', statement: '',
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

  if (isDesigner && u.designerProfile?.id) {
    const linkEl = document.getElementById('profile-link-btn');
    if (linkEl) {
      linkEl.href = `/portfolio.html?id=${u.designerProfile.id}`;
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
  toggle('profile-network-section',     !isDesigner);
  toggle('profile-exhibition-section',   isDesigner);
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

function renderCollections() {
  mountCards('collections-grid', 'collections-empty', state.collections, {
    onCardClick: (c) => {
      navigate('tab-saved', new URLSearchParams({ collection: c.name }));
    },
  });
}

function renderExhibition()  { mountCards('exhibition-grid',  'exhibition-empty',  state.exhibition); }

function mountCards(gridId, emptyId, items, { onCardClick } = {}) {
  const grid  = document.getElementById(gridId);
  const empty = document.getElementById(emptyId);
  if (!grid || !empty) return;

  if (!items.length) {
    grid.innerHTML = ''; grid.hidden = true; empty.hidden = false;
    return;
  }
  grid.hidden = false; empty.hidden = true;
  grid.innerHTML = '';
  items.forEach(c => {
    const card = CollectionCard(c);
    if (onCardClick) {
      card.addEventListener('click', (e) => {
        // Let modifier-clicks fall through to the default link behaviour
        // (open in new tab, etc.) — the URL still points somewhere sensible.
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
        e.preventDefault();
        onCardClick(c);
      });
    }
    grid.appendChild(card);
  });
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
      id: d.id, name: d.name, avatar: d.avatar_url,
    }))
  ];

  if (!items.length) { section.hidden = true; return; }

  section.hidden = false;
  strip.innerHTML = '';
  items.forEach(i => strip.appendChild(NetworkChip(i)));
}

/* ============================================================
   ACTIONS
   ============================================================ */

function setupActions() {
  document.getElementById('new-collection-btn')
    ?.addEventListener('click', () => { /* modal later */ });

  document.getElementById('exhibition-add-btn')
    ?.addEventListener('click', () => { window.location.href = 'addPiece.html'; });

  document.getElementById('manage-exhibition-btn')
    ?.addEventListener('click', () => { window.location.href = 'designerDashboard.html'; });
}
