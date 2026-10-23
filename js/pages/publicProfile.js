/**
 * public-profile.js
 * Public designer profile page. Renders the Work tab using the
 * shared FashionCard (same card as piece.html "More works").
 *
 * Depends on:
 *   - cards.js      (FashionCard)
 *   - api.mock.js   (API, default export)
 *   - toast.js      (showToast)
 *
 * Page contract (see newprofilepage.html):
 *   #profile-tab                — tab nav
 *   .portfolio-section[.work]   — work section wrapper
 *   #portfolio-work .masonry    — work grid mount (we reuse this node,
 *                                 just rename the class in markup later)
 *   #btn-follow                 — follow toggle
 *   #toast-root                 — toast host (add near </body>)
 */

import API from './api.mock.js';
import { FashionCard } from './cards.js';
import { showToast } from './toast.js';

/* -------------------------------------------------------------
   Boot
   ------------------------------------------------------------- */

// The piece page resolves ?id=<designerId>. For now the mock
// has no "current" designer on the profile, so default to d1
// (Amaka). Swap to a query param read when routing lands.
const DESIGNER_ID = new URLSearchParams(location.search).get('id') || 'd1';

const state = {
  designer: null,
  pieces: [],
  followed: false,
  workMounted: false,
};

document.addEventListener('DOMContentLoaded', init);

async function init() {
  try {
    state.designer = await API.getDesigner(DESIGNER_ID);
    state.pieces = await API.getDesignerPieces(DESIGNER_ID, 50);

    renderHeader(state.designer);
    renderWork(state.pieces);

    bindTabs();
    bindFollow();
  } catch (err) {
    console.error('profile init failed:', err);
    showToast({ message: 'Could not load this profile', actionLabel: 'Retry', onAction: init });
  }
}

/* -------------------------------------------------------------
   Header — name, meta, avatar, cover, stats
   (HTML already has placeholders; we only fill what depends
   on data. If you'd rather keep the header static for now,
   delete renderHeader and this call.)
   ------------------------------------------------------------- */

function renderHeader(designer) {
  const nameEl = document.querySelector('.profile-name');
  if (nameEl && designer.name) nameEl.textContent = designer.name;

  const metaEl = document.querySelector('.profile-meta');
  if (metaEl) {
    // keep location span; just refresh the designer line
    const first = metaEl.querySelector('span');
    if (first && designer.shop_name) first.textContent = designer.shop_name;
  }

  const avatarEl = document.querySelector('.avatar');
  if (avatarEl && designer.avatar_url) avatarEl.src = designer.avatar_url;

  // Work count in stats
  const statWorks = document.querySelector('.stat:first-child strong');
  if (statWorks) statWorks.textContent = String(state.pieces.length);
}

/* -------------------------------------------------------------
   Work tab — FashionCard grid
   ------------------------------------------------------------- */

function renderWork(pieces) {
  const mount = document.querySelector('#portfolio-work .masonry')
    || document.querySelector('#portfolio-work');
  if (!mount) return;

  // Reuse the mount node as a plain grid. We add `.fashion-grid`
  // and drop the old `.masonry` class so masonry.css no longer
  // applies (public-profile.css owns the grid now).
  mount.classList.remove('masonry');
  mount.classList.add('fashion-grid');
  mount.innerHTML = '';

  if (!pieces.length) {
    mount.innerHTML = `
      <div class="fashion-grid-empty">
        <i class="fas fa-scroll"></i>
        <p>No work published yet.</p>
      </div>`;
    state.workMounted = true;
    return;
  }

  const frag = document.createDocumentFragment();
  for (const piece of pieces) {
    frag.appendChild(FashionCard(piece));
  }
  mount.appendChild(frag);
  state.workMounted = true;
}

/* -------------------------------------------------------------
   Tabs
   ------------------------------------------------------------- */

function bindTabs() {
  const tabsEl = document.getElementById('profile-tab');
  if (!tabsEl) return;

  const sections = document.querySelectorAll('.portfolio-section');

  // Show only Work on load. (Services/About/Reviews are empty
  // for now; the original page did the same.)
  sections.forEach(s => {
    if (!s.classList.contains('work')) s.style.display = 'none';
  });

  tabsEl.addEventListener('click', (e) => {
    const tab = e.target.closest('.tab');
    if (!tab) return;

    tabsEl.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');

    const target = tab.dataset.tab;
    sections.forEach(s => {
      s.style.display = s.classList.contains(target) ? 'block' : 'none';
    });
  });
}

/* -------------------------------------------------------------
   Follow toggle
   ------------------------------------------------------------- */

function bindFollow() {
  const btn = document.getElementById('btn-follow');
  if (!btn) return;

  btn.addEventListener('click', async () => {
    try {
      const res = await API.toggleFollowDesigner(state.designer.id);
      state.followed = res.following;
      btn.classList.toggle('active', state.followed);
      btn.textContent = state.followed ? 'Following' : '＋ Follow';
    } catch (err) {
      // API throws if not signed in — surface as a toast, keep
      // the button in its previous visual state.
      showToast({ message: 'Sign in to follow designers', actionLabel: 'Retry', onAction: bindFollow });
    }
  });
}