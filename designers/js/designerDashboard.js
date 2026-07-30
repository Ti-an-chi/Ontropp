// dashboard.js
import { ensureAuth } from './authCheck.js';
import { StateManager } from '../../js/utility/stateManager.js';
import StoreApi from '../../js/storeApi.js';

// ─── STUB DATA ──────────────────────────────────────────
async function delay(ms = 100){
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchData(fakeError = false) {
  // TODO: return await StoreApi.getDesignerDashboard();
  await delay();
  if (fakeError) throw new Error('failed to load');
  
  const designer = await StoreApi.getDesignerProfile();
  /*{ 
      shop_name: 'Frederick', 
      storeStatus: 'active', 
      category: 'Fashion',
      logo_url:
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face'
      // Fashion designer portrait
    };*/
  const bestSeller = await StoreApi.getBestSellingProduct();
  /*{
      name: 'Abstract Geo Tee',
      cover_image: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400&h=400&fit=crop', // Abstract t-shirt
      rating: 4.5,
      views: 1247,
      trending: true
    };*/
  const stats =  {
      portfolioViews: { value: 3842, change: 12, up: true },
      productsListed: { value: 8, hint: '2 drafts pending' },
      newFollowers: { value: 150, change: 8, up: true },
      productsSaved: { value: 47, hint: 'Across all listings' }
    };
  const weeklyActivity = [
      { day: 'Mon', views: 420, unique: 310 },
      { day: 'Tue', views: 680, unique: 520 },
      { day: 'Wed', views: 540, unique: 410 },
      { day: 'Thu', views: 890, unique: 670 },
      { day: 'Fri', views: 720, unique: 580 },
      { day: 'Sat', views: 1050, unique: 820 },
      { day: 'Sun', views: 940, unique: 750, today: true }
    ];
  const insights = [
      { type: 'trend', icon: 'arrow-trend-up', color: 'green', title: 'Top Mover', message: '"Abstract Geo Tee" views up 34% today' },
      { type: 'growth', icon: 'bolt', color: 'amber', title: 'Fastest Growing', message: '"Minimalist Hoodie" gaining 12 saves/hour' },
      { type: 'tip', icon: 'lightbulb', color: 'blue', title: 'Visibility Tip', message: 'Add 2 more images to boost search ranking' },
      { type: 'action', icon: 'envelope', color: 'rose', title: 'Action Needed', message: '2 unread customer messages waiting' }
    ];
  const topDesigners = [
      { 
        handle: '@maradesigns', 
        avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face', 
        products: 12, 
        views: '8.4k', 
        following: false 
      },
      { 
        handle: '@leafstudio', 
        avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=face', 
        products: 8, 
        views: '5.2k', 
        following: false 
      },
      { 
        handle: '@voltapparel', 
        avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face', 
        products: 15, 
        views: '11k', 
        following: false 
      },
      { 
        handle: '@urbanthread', 
        avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face', 
        products: 6, 
        views: '3.1k', 
        following: false 
      }
    ];
  const trendingProducts = [
      { 
        name: 'Ocean Breeze Set', 
        cover_image: 'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=300&h=300&fit=crop', // Fashion set
        views: '12k' 
      },
      {
        name: 'Pink Horizon Bag', 
        cover_image: 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=300&h=300&fit=crop', // Bag
        views: '8.4k' 
      },
      { 
        name: 'Lavender Dream Scarf', 
        cover_image: 'https://images.unsplash.com/photo-1601924994987-69e26d50dc26?w=300&h=300&fit=crop', // Scarf/accessory
        views: '6.1k' 
      },
      { 
        name: 'Sunset Runner Shoes', 
        cover_image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=300&h=300&fit=crop', // Shoes
        views: '5.3k' 
      }
    ];
  console.log(bestSeller);
  
  return {
    designer,
    bestSeller,
    stats,
    weeklyActivity,
    insights,
    topDesigners,
    trendingProducts
  };
}

// ─── INIT ───────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  await ensureAuth();
  loadDashboard();
});

async function loadDashboard() {
  let bootstrap;
  try {
    bootstrap = await fetchData();
  } catch (err) {
    console.log(err.message)
    showErrorBanner('Failed to load dashboard. Check your connection.', loadDashboard);
    return;
  }
  
  renderWelcome(bootstrap);
  renderBestSeller(bootstrap);
  renderStats(bootstrap);
  renderChart(bootstrap);
  renderInsights(bootstrap);
  renderDesigners(bootstrap);
  renderTrending(bootstrap);
  setupEvents();
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

function renderWelcome({ designer }) {
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
      <strong>${bs.views.toLocaleString()}</strong> views this week
    </div>
  `;
}

function renderStats({ stats }) {
  const map = [
    { key: 'portfolioViews', label: 'Portfolio Views', accent: true },
    { key: 'productsListed', label: 'Products Listed' },
    { key: 'newFollowers', label: 'New Followers' },
    { key: 'productsSaved', label: 'Products Saved' }
  ];

  document.getElementById('status-cards').innerHTML = map.map(({ key, label, accent }) => {
    const s = stats[key];
    const hint = s.change !== undefined
      ? `<span class="hint ${s.up ? 'up' : 'down'}"><i class="fas fa-arrow-${s.up ? 'up' : 'down'}"></i> ${s.change}% vs yesterday</span>`
      : `<span class="hint">${s.hint}</span>`;
    
    return `
      <div class="status-card ${accent ? 'accent' : ''}">
        <span class="label">${label}</span>
        <span class="value">${s.value.toLocaleString()}</span>
        ${hint}
      </div>
    `;
  }).join('');
}

function renderChart({ weeklyActivity }) {
  const maxViews = Math.max(...weeklyActivity.map(d => d.views));
  
  document.getElementById('chart-area').innerHTML = `
    <div class="chart-bars">
      ${weeklyActivity.map(day => {
        const h = (day.views / maxViews) * 100;
        return `<div class="chart-bar ${day.today ? 'today' : ''}" style="height:${h}%" data-label="${day.day}" data-value="${day.views.toLocaleString()}"></div>`;
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
  
  if (!topDesigners?.length) {
    const sm = new StateManager('designer-cards', { autoInjectStyles: false });
    sm.empty('No designers yet', 'Designers in your category will appear here.');
    return;
  }
  
  document.getElementById('designer-cards').innerHTML = topDesigners.map(d => `
    <div class="designer-card" data-handle="${d.handle}">
      <img src="${d.logo_url}" alt="${d.handle}" class="designer-avatar" loading="lazy">
      <div class="designer-info">
        <h4>${d.handle}</h4>
        <p>${d.products} products · ${d.views} views</p>
      </div>
      <button class="follow-btn" data-following="${d.following}">${d.following ? 'Following' : 'Follow'}</button>
    </div>
  `).join('');
}

function renderTrending({ designer, trendingProducts }) {
  document.getElementById('trending-category').textContent = designer.category;
  
  if (!trendingProducts?.length) {
    const sm = new StateManager('trending-products', { autoInjectStyles: false });
    sm.empty('No trending products', 'Trending items in your category will appear here.');
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
