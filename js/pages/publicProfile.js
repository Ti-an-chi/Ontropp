/**
js/pages/publicProfile.js
Public designer profile page.
*/
import API from '/api.js';
import { FashionCard } from '../cards.js';
import { showToast } from '../toast.js';
import { createMasonry } from '../utility/masonry.js';
import { DesignerFollowButton, orderHandler } from '../utility/reconfig.js';
import { relativeTime } from '../utility/shared.js';

/* -------------------------------------------------------------
Boot
------------------------------------------------------------- */
const DESIGNER_ID =
  new URLSearchParams(location.search).get('id') || 'e2ee8138-913e-41fb-b3a3-e9059becc0cc';

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
    state.designer = await API.getDesignerData(DESIGNER_ID);
    console.log(state.designer);
    
    // Backend now returns flat structure with user nested in studio
    state.studio = state.designer;
    state.pieces = state.designer.pieces || [];
    state.followed = state.designer.isFollowing;
    
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
  // user is now nested inside studio response
  const user = studio.user || {};
  
  setText('.profile-name', user.username);
  setText('.profile-studio', studio.brand_name);
  setText('.profile-location', studio.location);
  
  const avatar = document.querySelector('.avatar');
  if (avatar && user.avatar_url) avatar.src = user.avatar_url;
  
  const statWorks = document.getElementById('stat-works');
  if (statWorks) statWorks.textContent = String(workCount);
  
  document.title = `Ontropp — ${user.username}`;
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
    mount.innerHTML = `<div class="work-empty">
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
    state.designer.user_id,  // Use user_id from studio
    state.followed,
    {
      onChange: (isFollowing) => {
        state.followed = isFollowing;
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
    
    const user = state.studio.user || {};
    
    orderHandler.flexibleHandle({
      whatsappNumber: state.studio.whatsapp_number,
      productName: state.studio.brand_name,  // Changed from shop_name
      productId: state.studio.user_id,
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
  
  const user = designer.user || {};
  const url = `${location.origin}${location.pathname}?id=${encodeURIComponent(designer.user_id)}`;
  
  const shareData = {
    title: `${user.username} — ${designer.brand_name}`,
    text: `Check out ${user.username} on ONTROPP`,
    url,
  };
  
  if (navigator.share) {
    try {
      await navigator.share(shareData);
      return;
    } catch (err) {
      if (err?.name === 'AbortError') return;
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