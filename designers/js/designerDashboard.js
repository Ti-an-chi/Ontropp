// dashboard.js
import { ensureAuth } from './authCheck.js';
import { StateManager } from '../../js/utility/stateManager.js';
import StoreApi from '../../js/storeApi.js';

// ─── INIT ───────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  await ensureAuth();
  loadDashboard();
});

async function loadDashboard() {
  setupEvents();

  try {
    const designer = await loadDesignerProfile();
    renderWelcome({ designer });

    await loadInsights();
    loadBestSeller();
    loadStats();
    loadChart();

    Promise.allSettled([
      loadTopDesigners(designer),
      loadTrendingProducts(designer)
    ]);
  } catch (err) {
    console.error(err);
    renderWelcomeFallback();
    showErrorBanner('Failed to load dashboard. Check your connection.', loadDashboard);
    loadBestSeller();
    loadStats();
    loadChart();
  }
}

async function loadDesignerProfile() {
  const designer = await StoreApi.getDesignerProfile();
  console.log(`${designer.shop_name} profile loaded`);
  renderWelcome({ designer });
  return designer;
}

async function loadInsights() {
  const insights = await StoreApi.getQuickInsights();
  renderInsights({ insights });
}

async function loadBestSeller() {
  try {
    const bestSeller = await StoreApi.getBestSellingProduct();
    if (!bestSeller) {
      renderSectionEmpty('best-seller-section', 'No best seller yet', 'Upload your first product to see your top performer here.', 'box-open');
      return;
    }

    renderBestSeller({ bestSeller });
  } catch (err) {
    renderSectionError('best-seller-section', 'We couldn’t load your best seller right now.', () => loadBestSeller());
  }
}

async function loadStats() {
  try {
    const stats = await StoreApi.getDesignerStats();
    if (!hasRenderableStats(stats)) {
      renderSectionEmpty('status-cards', 'No stats yet', 'Your growth numbers will appear once your first product is live.', 'chart-line');
      return;
    }

    renderStats({ stats });
  } catch (err) {
    renderSectionError('status-cards', 'We couldn’t load your stats right now.', () => loadStats());
  }
}

async function loadChart() {
  try {
    const weeklyActivity = await StoreApi.getWeeklyActivity();
    if (!Array.isArray(weeklyActivity) || !weeklyActivity.length) {
      renderSectionEmpty('chart-area', 'No activity yet', 'Your weekly view trend will show up after your first product gets attention.', 'chart-simple');
      return;
    }

    renderChart({ weeklyActivity });
  } catch (err) {
    renderSectionError('chart-area', 'We couldn’t load your activity chart right now.', () => loadChart());
  }
}

async function loadTopDesigners(designer) {
  try {
    const topDesigners = await StoreApi.getTrendingDesigners(designer.category, 4);
    if (!Array.isArray(topDesigners) || !topDesigners.length) {
      renderSectionEmpty('designer-cards', 'No designers yet', 'Designers in your category will appear here once activity starts.', 'users');
      return;
    }

    renderDesigners({ designer, topDesigners });
  } catch (err) {
    renderSectionError('designer-cards', 'We couldn’t load recommended designers right now.', () => loadTopDesigners(designer));
  }
}

async function loadTrendingProducts(designer) {
  try {
    const trendingProducts = await StoreApi.getTrendingProducts(designer.category, 4);
    if (!Array.isArray(trendingProducts) || !trendingProducts.length) {
      renderSectionEmpty('trending-products', 'No trending products', 'Trending items in your category will appear here.', 'fire');
      return;
    }

    renderTrending({ designer, trendingProducts });
  } catch (err) {
    renderSectionError('trending-products', 'We couldn’t load trending products right now.', () => loadTrendingProducts(designer));
  }
}

function hasRenderableStats(stats) {
  if (!stats || typeof stats !== 'object' || !Object.keys(stats).length) {
    return false;
  }

  return Object.values(stats).some((value) => {
    if (value && typeof value === 'object') {
      return Object.keys(value).length > 0;
    }
    return value !== undefined && value !== null && value !== '';
  });
}

function renderSectionEmpty(containerId, title, subtitle, icon = 'inbox') {
  const state = new StateManager(containerId, { autoInjectStyles: false });
  state.empty(title, subtitle, icon);
}

function renderSectionError(containerId, message, retryFn = null) {
  const state = new StateManager(containerId, { autoInjectStyles: false });
  state.error(message, retryFn);
}

// ─── SINGLE ERROR BANNER ────────────────────────────────
function showErrorBanner(message, retryFn) {
  const existing = document.getElementById('dash-error-banner');
  if (existing) existing.remove();
  
  const banner = document.createElement('div');
  banner.id = 'dash-error-banner';
  banner.className = 'dash-error-banner';
  banner.innerHTML = `
    <i class="fas fa-exclamation-circle"></i>
    <span>${message}</span>
    <button class="retry-btn" id="dash-retry">Retry</button>
  `;
  
  document.body.insertBefore(banner, document.body.firstChild);
  
  document.getElementById('dash-retry').addEventListener('click', () => {
    banner.remove();
    retryFn();
  });
}

// ─── RENDER SECTIONS ────────────────────────────────────

function renderWelcomeFallback() {
  document.getElementById('welcome-text').innerHTML = `
    <h1>Welcome back</h1>
    <p>Your dashboard is ready once your store data loads.</p>
  `;

  const statusEl = document.getElementById('store-status');
  statusEl.className = 'status-pill inactive';
  statusEl.innerHTML = `
    <span class="status-dot"></span>
    Offline
  `;
}

function renderWelcome({ designer }) {
  if (!designer?.shop_name) {
    renderWelcomeFallback();
    return;
  }

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  
  document.getElementById('welcome-text').innerHTML = `
    <h1>${greeting}, ${designer.shop_name}</h1>
    <p>Here's how your brand is doing today</p>
  `;
  
  const isActive = !!designer;
  document.getElementById('store-status').className = `status-pill ${isActive ? 'active' : 'inactive'}`;
  document.getElementById('store-status').innerHTML = `
    <span class="status-dot"></span>
    Store ${isActive ? 'Active' : 'Inactive'}
  `;
}

function renderBestSeller({ bestSeller: bs }) {
  if (!bs) {
    renderSectionEmpty('best-seller-section', 'No best seller yet', 'Upload your first product to see your top performer here.', 'box-open');
    return;
  }

  document.getElementById('best-seller-section').innerHTML = `
    <div class="best-seller-header">
      <h2>Best Performing This Week</h2>
      <span class="trend-badge"><i class="fas fa-arrow-trend-up"></i> Trending</span>
    </div>
    <div class="best-seller-img">
      <img src="${bs.cover_image}" alt="${bs.name}" loading="lazy">
    </div>
    <div class="best-seller-meta">
      <h3>${bs.name}</h3>
      <div class="rating"><i class="fas fa-star"></i> 4.8</div>
    </div>
    <div class="best-seller-views">
      <i class="fas fa-eye"></i>
      <strong>${(bs.views || 0).toLocaleString()}</strong> views this week
    </div>
  `;
}

function renderStats({ stats }) {
  if (!hasRenderableStats(stats)) {
    renderSectionEmpty('status-cards', 'No stats yet', 'Your growth numbers will appear once your first product is live.', 'chart-line');
    return;
  }

  const map = [
    { key: 'portfolioViews', label: 'Portfolio Views', accent: true },
    { key: 'productsListed', label: 'Products Listed' },
    { key: 'newFollowers', label: 'New Followers' },
    { key: 'productsSaved', label: 'Products Saved' }
  ];

  document.getElementById('status-cards').innerHTML = map.map(({ key, label, accent }) => {
    const s = stats[key];
    const hint = s?.change !== undefined
      ? `<span class="hint ${s.up ? 'up' : 'down'}"><i class="fas fa-arrow-${s.up ? 'up' : 'down'}"></i> ${s.change !== null ? s.change : 0}% vs last week</span>`
      : `<span class="hint">${s?.hint || 'Ready once your products go live'}</span>`;
    
    return `
      <div class="status-card ${accent ? 'accent' : ''}">
        <span class="label">${label}</span>
        <span class="value">${(s?.value ?? 0).toLocaleString()}</span>
        ${hint}
      </div>
    `;
  }).join('');
}

function renderChart({ weeklyActivity }) {
  if (!Array.isArray(weeklyActivity) || !weeklyActivity.length) {
    renderSectionEmpty('chart-area', 'No activity yet', 'Your weekly view trend will show up after your first product gets attention.', 'chart-simple');
    return;
  }

  const maxScore = Math.max(...weeklyActivity.map(w => w.score));
  
  document.getElementById('chart-area').innerHTML = `
    <div class="chart-bars">
      ${weeklyActivity.map(week => {
        const h = (week.score / maxScore) * 100;
        return `<div class="chart-bar ${week.week === 'This' ? 'thisweek' : ''}" style="height:${h}%" data-label="${week.week}" data-value="${week.score.toLocaleString()}"></div>`;
      }).join('')}
    </div>
    <div class="chart-legend">
      <div class="legend-item"><span class="legend-dot primary"></span>Total listing views</div>
      <div class="legend-item"><span class="legend-dot secondary"></span>Unique visitors</div>
    </div>
  `;
}

function renderInsights({ insights }) {
  document.getElementById('insights-list').innerHTML = insights.map(i => `
    <div class="insight-item">
      <div class="insight-icon ${i.color}"><i class="fas fa-${i.icon}"></i></div>
      <div class="insight-body">
        <h4>${i.title}</h4>
        <p>${i.message}</p>
      </div>
    </div>
  `).join('');
}

function renderDesigners({ designer, topDesigners }) {
  document.getElementById('category-name').textContent = designer.category;

  if (!Array.isArray(topDesigners) || !topDesigners.length) {
    renderSectionEmpty('designer-cards', 'No designers yet', 'Designers in your category will appear here once activity starts.', 'users');
    return;
  }
  
  document.getElementById('designer-cards').innerHTML = topDesigners.map(d => `
    <div class="designer-card" data-shop_name="${d.shop_name}">
      <img src="${d.logo_url}" alt="${d.shop_name}" class="designer-avatar" loading="lazy">
      <div class="designer-info">
        <h4>@${d.shop_name}</h4>
        <p>${d.products} products · ${d.views} views</p>
      </div>
      <button class="follow-btn" data-following="${d.following}">${d.following ? 'Following' : 'Follow'}</button>
    </div>
  `).join('');
}

function renderTrending({ designer, trendingProducts }) {
  document.getElementById('trending-category').textContent = designer.category;
  
  if (!Array.isArray(trendingProducts) || !trendingProducts.length) {
    renderSectionEmpty('trending-products', 'No trending products', 'Trending items in your category will appear here.', 'fire');
    return;
  }
  
  document.getElementById('trending-products').innerHTML = trendingProducts.map(p => `
    <div class="product-thumb">
      <div class="product-thumb-img">
        <img src="${p.cover_image}" alt="${p.name}" loading="lazy">
      </div>
      <div class="product-thumb-info">
        <h4>${p.name}</h4>
        <p>${p.views} views this week</p>
      </div>
    </div>
  `).join('');
}

// ─── EVENTS ─────────────────────────────────────────────
function setupEvents() {
  document.getElementById('designer-cards')?.addEventListener('click', (e) => {
    const btn = e.target.closest('.follow-btn');
    if (!btn) return;
    
    const card = btn.closest('.designer-card');
    const handle = card.dataset.handle;
    const isFollowing = btn.dataset.following === 'true';
    
    btn.dataset.following = !isFollowing;
    btn.textContent = !isFollowing ? 'Following' : 'Follow';
    btn.classList.toggle('following', !isFollowing);
  });

  document.getElementById('messages-btn')?.addEventListener('click', () => {
    // TODO: Open messages panel
  });
}
