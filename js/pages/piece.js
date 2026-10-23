/**
 * piece.js — Piece detail orchestrator.
 * Mirrors home.js: state views + cards from cards.js + mock API.
 * Errors surface via toast.js.
 */

import API from '../../api.mock.js';
import { createStateView } from '../state.js';
import { showToast } from '../toast.js';
import { FashionCard, escapeHtml } from '../cards.js';

const params  = new URLSearchParams(location.search);
const pieceId = params.get('id') || 'p1';

let piece    = null;
let designer = null;

init();

async function init() {
  await Promise.all([loadHero(), loadMaker(), loadGarment()]);
  loadOtherWorks();
  wireSave();
}

/* =========================================================
   HERO — image, title, description
   ========================================================= */

async function loadHero() {
  const sv = createStateView(document.querySelector('[data-state-view="piece-hero"]'));
  if (!sv) return;
  sv.loading();

  try {
    piece = await API.getPiece(pieceId);
    document.title = `${piece.title} · ONTROPP`;

    const data = sv.dataEl;
    const img  = data.querySelector('.js-hero-img');
    img.src = (piece.image_url || '').replace('w=600', 'w=1800');
    img.alt = piece.title || '';

    data.querySelector('.js-hero-studio').textContent       = piece.studio_name || '';
    data.querySelector('.js-hero-collection').textContent   =
      `${piece.title} — ${piece.collection || ''} collection.`.trim();
    data.querySelector('.js-hero-description').textContent  = piece.description || '';

    sv.data();
  } catch (err) {
    console.error('Hero failed:', err);
    sv.empty();
    showToast({
      message: 'Could not load this piece.',
      actionLabel: 'Try again',
      onAction: loadHero,
    });
  }
}

/* =========================================================
   MAKER — designer block + follow
   ========================================================= */

async function loadMaker() {
  const sv = createStateView(document.querySelector('[data-state-view="piece-maker"]'));
  if (!sv) return;
  sv.loading();

  try {
    if (!piece) piece = await API.getPiece(pieceId);
    designer = await API.getDesigner(piece.designer_id);

    const data = sv.dataEl;
    data.querySelector('.js-maker-name').textContent = designer.name || '';
    data.querySelector('.js-maker-role').textContent = designer.studio_name || 'Designer';
    data.querySelector('.js-maker-initials').textContent =
      (designer.name || '').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || '—';

    wireFollow(data.querySelector('.follow-btn'), designer.id);
    sv.data();
  } catch (err) {
    console.error('Maker failed:', err);
    sv.empty();
    showToast({ message: 'Could not load the designer.' });
  }
}

function wireFollow(btn, designerId) {
  if (!btn) return;
  let following = false;
  let pending = false;

  const paint = () => {
    btn.textContent = following ? 'Following' : 'Follow';
    btn.classList.toggle('following', following);
  };
  paint();

  btn.addEventListener('click', async () => {
    if (pending) return;
    pending = true;

    const willFollow = !following;
    following = willFollow;
    paint();

    try {
      await API.toggleFollowDesigner(designerId);
      showToast({ message: willFollow ? 'Following' : 'Unfollowed' });
    } catch {
      following = !willFollow;
      paint();
      const next = encodeURIComponent(location.pathname + location.search);
      showToast({
        message: 'Sign in to follow designers',
        actionLabel: 'Sign in',
        onAction: () => { location.href = `/login.html?next=${next}&follow=${designerId}`; },
      });
    } finally {
      pending = false;
    }
  });
}

/* =========================================================
   GARMENT — fabric / colour / fit
   ========================================================= */

async function loadGarment() {
  const sv = createStateView(document.querySelector('[data-state-view="piece-garment"]'));
  if (!sv) return;
  sv.loading();

  try {
    if (!piece) piece = await API.getPiece(pieceId);
    const d = piece.details || {};

    const rows = [
      ['fa-layer-group', 'Fabric', d.fabric],
      ['fa-palette',     'Colour', d.colour],
      ['fa-shirt',       'Fit',    d.fit],
    ];

    sv.dataEl.querySelector('.garment-grid').innerHTML = rows.map(([icon, label, value]) => `
      <div class="garment-item">
        <i class="fa-solid ${icon}"></i>
        <div>
          <span>${label}</span>
          <p>${escapeHtml(value || '—')}</p>
        </div>
      </div>`).join('');

    sv.data();
  } catch (err) {
    console.error('Garment failed:', err);
    sv.empty();
  }
}

/* =========================================================
   OTHER WORKS
   ========================================================= */

async function loadOtherWorks() {
  const sv = createStateView(document.querySelector('[data-state-view="piece-other"]'));
  if (!sv) return;
  sv.loading();

  try {
    if (!piece) piece = await API.getPiece(pieceId);

    const items = (await API.getDesignerPieces(piece.designer_id, 8))
      .filter(p => p.id !== piece.id);

    if (!items.length) { sv.empty(); return; }

    const gallery = sv.dataEl.querySelector('.fashion-gallery');
    gallery.innerHTML = '';
    items.forEach(p => gallery.appendChild(FashionCard(p)));

    if (designer) {
      const h2 = sv.dataEl.querySelector('.gallery-heading h2');
      if (h2) h2.textContent = `More works by ${designer.name}`;
    }

    sv.data();
  } catch (err) {
    console.error('Other works failed:', err);
    sv.empty();
    showToast({ message: 'Could not load other works.' });
  }
}

/* =========================================================
   SAVE
   ========================================================= */

function wireSave() {
  const btn = document.querySelector('.save-pill');
  if (!btn) return;

  btn.addEventListener('click', async () => {
    const prev = btn.textContent;
    btn.disabled = true;
    try {
      const { saved } = await API.toggleSaved(pieceId);
      btn.textContent = saved ? 'Saved' : 'Save';
      showToast({ message: saved ? 'Saved' : 'Removed' });
    } catch {
      btn.textContent = prev;
      showToast({
        message: 'Sign in to save pieces',
        actionLabel: 'Sign in',
        onAction: () => { location.href = `/login.html?next=${encodeURIComponent(location.pathname + location.search)}`; },
      });
    } finally {
      btn.disabled = false;
    }
  });
}