/**
 * js/pages/publicProfile.js
 * Public designer profile page.
 *
 * Work tab:
 *   - API.getDesignerPieces(designerId) in one call
 *   - FashionCard tiles, aspect-ratio override so masonry reads
 *   - shared masonry.js (same module explore uses) — no infinite scroll
 *
 * Header actions:
 *   - Follow  → DesignerFollowButton (reconfig.js) → API.followSeller
 *   - Message → WhatsApp deep link via orderHandler.flexibleHandle
 *   - Share   → navigator.share, clipboard fallback, toast
 *
 * Paths assume the page lives at project root:
 *   publicProfile.html
 *   /js/pages/publicProfile.js
 *   /js/utility/{masonry,cards,toast,reconfig,shared}.js
 *   /js/api.mock.js
 */

import API from '../../api.mock.js';
import { FashionCard } from '../cards.js';
import { showToast } from '../toast.js';
import { createMasonry } from '../utility/masonry.js';
import { DesignerFollowButton, orderHandler } from '../utility/reconfig.js';
import { relativeTime } from '../utility/shared.js';

/* -------------------------------------------------------------
   Boot
   ------------------------------------------------------------- */

const DESIGNER_ID =
  new URLSearchParams(location.search).get('id') || 'd1';

const state = {
  designer: null,
  studio: null,
  pieces: [],
  followed: false,
  masonry: null,
};

document.addEventListener('DOMContentLoaded', init);

async function init() {
  try {
    // Mock auth — required so DesignerFollowButton's token check
    // passes and follow calls reach the mock. Replace with the
    // real session bootstrap when auth lands.
    API.setAuth({
      id: 'u1',
      username: 'Ada',
      email: 'ada@ontropp.test',
      avatar_url: 'https://i.pravatar.cc/150?img=47',
      role: 'explorer',
    });
    localStorage.setItem('ontrop_token', 'mock-session');

    state.designer = await API.getDesigner(DESIGNER_ID);
    const [studio, pieces, viewer] = await Promise.all([
      API.getStudio(state.designer.studio_id),
      API.getDesignerPieces(DESIGNER_ID, 100),
      API.getViewerContext(),
    ]);
    state.studio = studio;
    state.pieces = pieces;
    state.followed = viewer.followedDesignerIds.includes(state.designer.id);

    renderHeader(state.designer, state.studio, state.pieces.length);
    mountWork(state.pieces);
    mountFollowButton();
    mountMessageButton();
    mountShareButton();

    bindTabs();
  } catch (err) {
    console.error('profile init failed:', err);
    showToast({
      message: 'Could not load this profile',
      actionLabel: 'Retry',
      onAction: init,
    });
  }
}

/* -------------------------------------------------------------
   Header
   ------------------------------------------------------------- */

function renderHeader(designer, studio, workCount) {
  setText('.profile-name', designer.name);
  setText('.profile-studio', designer.shop_name);
  setText('.profile-location', studio.location);

  const avatar = document.querySelector('.avatar');
  if (avatar && designer.avatar_url) avatar.src = designer.avatar_url;

  const statWorks = document.getElementById('stat-works');
  if (statWorks) statWorks.textContent = String(workCount);

  document.title = `Ontropp — ${designer.name}`;
}

function setText(sel, text) {
  const el = document.querySelector(sel);
  if (el && text != null) el.textContent = text;
}

/* -------------------------------------------------------------
   Work — FashionCard + shared masonry, one batch
   ------------------------------------------------------------- */

function mountWork(pieces) {
  const mount = document.getElementById('work-mount');
  if (!mount) return;

  mount.removeAttribute('aria-busy');
  mount.innerHTML = '';

  if (!pieces.length) {
    mount.innerHTML = `
      <div class="work-empty">
        <i class="fas fa-scroll"></i>
        <p>No work published yet.</p>
      </div>`;
    return;
  }

  state.masonry = createMasonry(mount, { gap: 14 });

  const cards = pieces.map(piece => {
    const card = FashionCard(piece);
    // Profile override: let the card carry the piece's natural
    // aspect ratio so masonry columns interlock properly.
    // Scoped by .public-profile in publicProfile.css.
    const media = card.querySelector('.fashion-image');
    if (media && piece.aspect_ratio) {
      media.style.height = 'auto';
      media.style.aspectRatio = String(piece.aspect_ratio);
    }
    return card;
  });

  state.masonry.append(cards);
}

/* -------------------------------------------------------------
   Follow — reuses DesignerFollowButton from reconfig.js
   ------------------------------------------------------------- */

function mountFollowButton() {
  const btn = document.getElementById('btn-follow');
  if (!btn || !state.designer) return;

  new DesignerFollowButton(
    btn,
    state.designer.id,
    state.followed,
    {
      onChange: (isFollowing) => {
        state.followed = isFollowing;
        // DesignerFollowButton already shows its own toast —
        // no second toast here.
      },
    }
  );
}

/* -------------------------------------------------------------
   Message — WhatsApp deep link via orderHandler.flexibleHandle
   ------------------------------------------------------------- */

function mountMessageButton() {
  const btn = document.querySelector('.btn-message');
  if (!btn || !state.studio) return;

  btn.addEventListener('click', () => {
    if (!state.studio.whatsapp_number) {
      showToast({ message: 'This studio has no contact number yet' });
      return;
    }
    orderHandler.flexibleHandle({
      whatsappNumber: state.studio.whatsapp_number,
      productName: state.designer.shop_name,
      productId: state.designer.id,
    });
  });
}

/* -------------------------------------------------------------
   Share — Web Share API with clipboard fallback
   ------------------------------------------------------------- */

async function mountShareButton() {
  const btn = document.querySelector('.btn-share');
  if (!btn) return;

  btn.addEventListener('click', () => shareProfile());
}

async function shareProfile() {
  const designer = state.designer;
  if (!designer) return;

  const url = `${location.origin}${location.pathname}?id=${encodeURIComponent(designer.id)}`;
  const shareData = {
    title: `${designer.name} — ${designer.shop_name}`,
    text: `Check out ${designer.name} on ONTROPP`,
    url,
  };

  if (navigator.share) {
    try {
      await navigator.share(shareData);
      return;
    } catch (err) {
      // user cancelled — not an error
      if (err?.name === 'AbortError') return;
      // fall through to clipboard
    }
  }

  try {
    await navigator.clipboard.writeText(url);
    showToast({ message: 'Profile link copied' });
  } catch {
    showToast({ message: 'Could not copy link' });
  }
}

/* -------------------------------------------------------------
   Tabs
   ------------------------------------------------------------- */

function bindTabs() {
  const tabsEl = document.getElementById('profile-tab');
  if (!tabsEl) return;

  const sections = document.querySelectorAll('.portfolio-section');
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