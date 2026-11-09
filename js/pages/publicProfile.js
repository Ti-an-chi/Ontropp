/**
js/pages/publicProfile.js
Public designer profile page.
*/
import API from '/api.js';
import { FashionCard } from '../cards.js';
import { showToast } from '../toast.js';
import { createMasonry } from '../utility/masonry.js';
import { DesignerFollowButton, orderHandler } from '../utility/reconfig.js';
import { createStateView } from '../state.js';

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
  const headerSv = createStateView(
    document.querySelector('[data-state-view="profile-header"]')
  );
  const workSv = createStateView(
    document.querySelector('[data-state-view="work"]')
  );

  headerSv?.loading();
  workSv?.loading();

  try {
    const designer = await API.getDesignerData(DESIGNER_ID);
    state.designer = designer;
    state.studio = designer;
    state.pieces = designer.pieces || [];
    state.followed = designer.isFollowing;

    applyCover(DESIGNER_ID);
    renderHeader(headerSv.dataEl);
    headerSv?.data();

    mountWork(workSv);
    mountFollowButton();
    mountMessageButton();
    mountShareButton();
    bindTabs();
  } catch (err) {
    console.error('profile init failed:', err);
    // Header has no meaningful empty state — keep the last
    // visible state and toast the failure with a retry.
    showToast({
      message: 'Could not load this profile',
      actionLabel: 'Retry',
      onAction: init,
    });
  }
}

/* -------------------------------------------------------------
Cover — derived from id so it's stable across visits
------------------------------------------------------------- */
const COVER_PALETTE = [
  ['#E8D5C4', '#C9A88E'],
  ['#D4C5B0', '#8C7A5E'],
  ['#C8D5C0', '#7A8C6E'],
  ['#D5C8D0', '#8E6E7A'],
  ['#C4D2D9', '#6E828C'],
  ['#E0D0BE', '#B8926E'],
  ['#D0C8E0', '#7A6E8E'],
  ['#E0C8C0', '#B87A6E'],
];

function hashString(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function applyCover(designerId) {
  const cover = document.getElementById('profile-cover');
  if (!cover) return;

  // If the backend ever returns a cover, honour it.
  if (state.studio?.cover_url) {
    cover.innerHTML = `<img src="${state.studio.cover_url}" alt="">`;
    return;
  }

  const [from, to] = COVER_PALETTE[hashString(designerId) % COVER_PALETTE.length];
  const angle = 100 + (hashString(designerId + 'angle') % 60);
  cover.style.background = `linear-gradient(${angle}deg, ${from}, ${to})`;
}

/* -------------------------------------------------------------
Header — fills the [data-state="data"] subtree
------------------------------------------------------------- */
function renderHeader(root) {
  if (!root) return;
  const studio = state.studio || {};
  const user = studio.user || {};

  // Avatar — studio.logo_url is the canonical source.
  const avatar = root.querySelector('.avatar');
  if (avatar) {
    avatar.src = studio.logo_url || '';
    avatar.alt = `${user.username || studio.brand_name || 'Designer'} avatar`;
  }

  root.querySelector('.profile-name').textContent = user.username || '—';
  root.querySelector('.profile-studio').textContent = studio.brand_name || '—';
  root.querySelector('.profile-location').textContent = studio.location || '—';

  // Bio — studio.bio, not a hardcoded paragraph.
  root.querySelector('.bio').textContent = studio.bio || '';

  // Socials — only render links the studio actually has.
  const socialsEl = root.querySelector('.socials');
  socialsEl.innerHTML = '';
  const socials = [
    ['Instagram', studio.instagram_url],
    ['TikTok',    studio.tiktok_url],
    ['🌐',        studio.website_url],
  ];
  for (const [label, url] of socials) {
    if (!url) continue;
    const a = document.createElement('a');
    a.href = url;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.textContent = label;
    a.setAttribute('aria-label', label);
    socialsEl.appendChild(a);
  }

  // Stats — only claim numbers we actually have.
  root.querySelector('[data-stat="works"]').textContent = String(state.pieces.length);
  const reviewCount = studio.review_count ?? 0;
  root.querySelector('[data-stat="reviews"]').textContent = reviewCount ? String(reviewCount) : '—';
  root.querySelector('[data-stat-label="reviews"]').textContent =
    reviewCount ? 'Reviews' : 'No reviews yet';

  const services = studio.services?.length ?? null;
  root.querySelector('[data-stat="services"]').textContent = services != null ? String(services) : '—';

  // Response time is a soft promise, not data. Show it only
  // if the backend says so.
  root.querySelector('[data-stat="response"]').textContent =
    studio.response_time || '—';

  document.title = `Ontropp — ${user.username || studio.brand_name || 'Profile'}`;
}

/* -------------------------------------------------------------
Work — renders into the data sibling of the work state view
------------------------------------------------------------- */
function mountWork(workSv) {
  if (!workSv) return;

  if (!state.pieces.length) {
    workSv.empty();
    return;
  }

  const mount = workSv.dataEl;
  mount.innerHTML = '';

  state.masonry = createMasonry(mount, { gap: 14 });

  const cards = state.pieces.map(piece => {
    const card = FashionCard(piece);
    const media = card.querySelector('.fashion-image');
    if (media && piece.aspect_ratio) {
      media.style.height = 'auto';
      media.style.aspectRatio = String(piece.aspect_ratio);
    }
    return card;
  });

  state.masonry.append(cards);
  workSv.data();
}

/* -------------------------------------------------------------
Follow / Message / Share
------------------------------------------------------------- */
function mountFollowButton() {
  const btn = document.querySelector('#btn-follow');
  if (!btn || !state.designer) return;

  new DesignerFollowButton(
    btn,
    state.designer.user_id,
    state.followed,
    { onChange: (isFollowing) => { state.followed = isFollowing; } }
  );
}

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
      productName: state.studio.brand_name,
      productId: state.studio.user_id,
    });
  });
}

function mountShareButton() {
  const btn = document.querySelector('.btn-share');
  if (!btn) return;
  btn.addEventListener('click', shareProfile);
}

async function shareProfile() {
  const designer = state.designer;
  if (!designer) return;

  const studio = state.studio || {};
  const user = studio.user || {};
  const url = `${location.origin}${location.pathname}?id=${encodeURIComponent(designer.user_id)}`;

  const shareData = {
    title: `${user.username || studio.brand_name || 'Designer'} — ONTROPP`,
    text: `Check out ${user.username || studio.brand_name || 'this designer'} on ONTROPP`,
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