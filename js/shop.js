import { 
  CONFIG, state, DataService, OrderHandler, FavoriteHandler, 
  FollowHandler, ShareController, Router 
} from './portfolio.js';
import { showNotification, updateElement, normalizePhoneNumber } from './reconfig.js';
import { formatPrice, formatNumber } from './shared.js';

// ============ PRODUCT RENDERER (Shop) ============
const ProductRenderer = {
  createCard(product) {
    const card = document.createElement('div');
    card.className = 'shop-product-card';
    card.dataset.productId = product.id;
    
    card.innerHTML = `
      <div class="shop-product-image">
        <img src="${product.cover_image}" alt="${product.name}" loading="lazy">
        <button class="shop-fav-btn" data-product-id="${product.id}">
          <i class="${product.isFavourite ? 'fas' : 'far'} fa-heart"></i>
        </button>
        <div class="shop-product-overlay">
          <button class="shop-quick-order" data-product-id="${product.id}" data-product-name="${product.name}">
            <i class="fab fa-whatsapp"></i> Order Now
          </button>
        </div>
      </div>
      <div class="shop-product-info">
        <h3 class="shop-product-name">${product.name}</h3>
        <div class="shop-product-price">₦${formatPrice(product.price)}</div>
      </div>
    `;

    // Favorite button
    const favBtn = card.querySelector('.shop-fav-btn');
    favBtn.dataset.saved = product.isFavourite;
    favBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isSaved = favBtn.dataset.saved === 'true';
      const newState = !isSaved;
      
      // Optimistic update
      favBtn.dataset.saved = newState;
      favBtn.innerHTML = `<i class="${newState ? 'fas' : 'far'} fa-heart"></i>`;
      if (newState) favBtn.classList.add('saved');
      else favBtn.classList.remove('saved');
      
      // API call
      FavoriteHandler.toggle({ 
        dataset: { saved: isSaved }, 
        querySelector: () => favBtn 
      }, product.id);
    });

    // Quick order button
    const orderBtn = card.querySelector('.shop-quick-order');
    orderBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      OrderHandler.handle(product.id, product.name);
    });

    // Card click
    card.addEventListener('click', () => {
      OrderHandler.handle(product.id, product.name);
    });

    return card;
  }
};

// ============ INFINITE SCROLL ============
const InfiniteScroll = {
  init(loadMoreCallback) {
    this.loadMoreCallback = loadMoreCallback;
    this.throttledScroll = this.throttle(() => this.handleScroll(), 200);
    window.addEventListener('scroll', this.throttledScroll);
  },

  throttle(func, limit) {
    let inThrottle;
    return () => {
      if (!inThrottle) {
        func();
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  },

  handleScroll() {
    if (state.isLoadingMore || !state.hasMoreProducts) return;
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const windowHeight = window.innerHeight;
    const documentHeight = document.documentElement.scrollHeight;

    if (scrollTop + windowHeight >= documentHeight - CONFIG.INFINITE_SCROLL_THRESHOLD) {
      this.loadMoreCallback();
    }
  }
};

// ============ SHOP MODE ============
const ShopMode = {
  init() {
    this.setupUI();
    this.loadData();
  },

  setupUI() {
    document.body.className = 'shop-mode';
    document.body.innerHTML = this.buildHTML();
  },

  buildHTML() {
    return `
      <div class="shop-background" id="shopBackground">
        <div class="shop-background-blur"></div>
        <div class="shop-background-overlay"></div>
      </div>

      <header class="shop-header">
        <button class="shop-back-btn" id="shopBackBtn">
          <i class="fas fa-arrow-left"></i>
        </button>
        <div class="shop-header-info">
          <h1 class="shop-header-name" id="shopHeaderName">Loading...</h1>
          <div class="shop-header-meta">
            <span class="shop-rating" id="shopHeaderRating">
              <i class="fas fa-star"></i> <span>0.0</span>
            </span>
          </div>
        </div>
        <button class="shop-share-btn" id="shopShareBtn">
          <i class="fas fa-share-alt"></i>
        </button>
      </header>

      <main class="shop-main">
        <div class="shop-seller-card">
          <div class="shop-seller-avatar" id="shopSellerAvatar">
            <i class="fas fa-store"></i>
          </div>
          <div class="shop-seller-details">
            <h2 id="shopSellerName">Loading...</h2>
            <p id="shopSellerTagline">Loading...</p>
            <div class="shop-seller-stats">
              <span id="shopFollowerCount">0 followers</span>
              <span class="dot">•</span>
              <span id="shopProductCount">0 products</span>
            </div>
          </div>
          <button class="shop-follow-btn" id="shopFollowBtn">
            <i class="fas fa-user-plus"></i> Follow
          </button>
        </div>

        <div class="shop-products-container">
          <div class="shop-products-grid" id="shopProductsGrid"></div>
          <div class="shop-loading" id="shopLoading" style="display: none;">
            <div class="loading-spinner"></div>
          </div>
          <div class="shop-end-message" id="shopEndMessage" style="display: none;">
            <p>No more products</p>
          </div>
        </div>
      </main>

      <button class="shop-contact-fab" id="shopContactFab">
        <i class="fab fa-whatsapp"></i>
        <span>Contact Seller</span>
      </button>
    `;
  },

  async loadData() {
    try {
      const sellerResponse = await API.getSellerData(state.sellerId);
      state.sellerData = sellerResponse.seller;
      
      this.updateUI(state.sellerData);
      this.setupBackground(state.sellerData);
      await this.loadProducts();
      this.setupEventListeners();
      
    } catch (error) {
      console.error('Error loading shop:', error);
      showNotification('Failed to load shop', 'error');
    }
  },

  setupBackground(seller) {
    const bgContainer = document.getElementById('shopBackground');
    const blurDiv = bgContainer.querySelector('.shop-background-blur');
    
    let bgImage = seller.user?.avatar_url || seller.logo_url;
    
    if (bgImage) {
      blurDiv.style.backgroundImage = `url(${bgImage})`;
      bgContainer.classList.add('has-image');
    } else {
      const hue = (parseInt(state.sellerId) * 137) % 360;
      blurDiv.style.background = `linear-gradient(135deg, hsl(${hue}, 70%, 50%) 0%, hsl(${(hue + 40) % 360}, 70%, 60%) 100%)`;
      bgContainer.classList.add('no-image');
    }
  },

  updateUI(seller) {
    updateElement('shopHeaderName', seller.shop_name);
    document.getElementById('shopHeaderRating').innerHTML = 
      `<i class="fas fa-star"></i> <span>${seller.rating || '5.0'}</span>`;
    
    updateElement('shopSellerName', seller.shop_name);
    updateElement('shopSellerTagline', seller.bio || 'Welcome to my shop!');
    
    const avatarContainer = document.getElementById('shopSellerAvatar');
    if (seller.logo_url) {
      avatarContainer.innerHTML = `<img src="${seller.logo_url}" alt="${seller.shop_name}">`;
    }
    
    document.getElementById('shopFollowerCount').textContent = 
      `${formatNumber(seller.followers?.[0]?.count ?? 0)} followers`;
    document.getElementById('shopProductCount').textContent = 
      `${formatNumber(seller.products?.[0]?.count ?? 0)} products`;

    // Initialize follow button
    const followBtn = document.getElementById('shopFollowBtn');
    if (followBtn) {
      FollowHandler.initButton(followBtn, state.sellerId, seller.isFollowing);
    }
  },

  async loadProducts() {
    if (state.isLoadingMore || !state.hasMoreProducts) return;
    
    state.isLoadingMore = true;
    const loadingEl = document.getElementById('shopLoading');
    const grid = document.getElementById('shopProductsGrid');
    
    if (state.shopProductsPage === 1) {
      grid.innerHTML = '<div class="shop-loading-initial"><div class="loading-spinner"></div></div>';
    } else {
      loadingEl.style.display = 'flex';
    }

    try {
      const { products, hasMore } = await DataService.fetchProducts({
        sellerId: state.sellerId,
        page: state.shopProductsPage,
        limit: CONFIG.SHOP_PRODUCTS_PER_PAGE
      });

      if (state.shopProductsPage === 1) grid.innerHTML = '';

      if (products.length === 0 && state.shopProductsPage === 1) {
        grid.innerHTML = '<p class="shop-no-products">No products available</p>';
        state.hasMoreProducts = false;
        return;
      }

      products.forEach(product => {
        grid.appendChild(ProductRenderer.createCard(product));
      });

      state.hasMoreProducts = hasMore;
      state.shopProductsPage++;

      if (!hasMore) {
        document.getElementById('shopEndMessage').style.display = 'block';
      }

    } catch (error) {
      showNotification('Failed to load products', 'error');
    } finally {
      state.isLoadingMore = false;
      loadingEl.style.display = 'none';
    }
  },

  setupEventListeners() {
    // Back button
    document.getElementById('shopBackBtn')?.addEventListener('click', () => {
      const url = new URL(window.location.href);
      url.searchParams.delete('mode');
      window.location.href = url.toString();
    });

    // Share
    ShareController.init();

    // Contact FAB
    document.getElementById('shopContactFab')?.addEventListener('click', () => {
      const phone = normalizePhoneNumber(state.sellerData?.whatsapp_number);
      const url = `https://wa.me/${phone}?text=${encodeURIComponent("Hi! I'm interested in your products on ONTROPP.")}`;
      window.open(url, '_blank');
    });

    // Infinite scroll
    InfiniteScroll.init(() => this.loadProducts());
  }
};

// ============ INITIALIZATION ============
document.addEventListener('DOMContentLoaded', () => {
  const mode = Router.init();
  if (mode === 'shop') {
    ShopMode.init();
  }
});
