import { 
  CONFIG, state, DataService, OrderHandler, FavoriteHandler, 
  StarRating, ShareController, Router 
} from './portfolio.js';
import { showNotification, updateElement, normalizePhoneNumber } from './reconfig.js';
import { formatPrice, formatNumber } from './shared.js';

// ============ PRODUCT RENDERER (Portfolio) ============
const ProductRenderer = {
  async render(products) {
    const grid = document.getElementById('productsGrid');
    const loadingEl = document.getElementById('loadingProducts');
    
    if (!grid) return;

    await new Promise(resolve => setTimeout(resolve, 300));
    if (loadingEl) loadingEl.style.display = 'none';
    
    grid.innerHTML = '';
    
    products.forEach(product => {
      const card = this.createCard(product);
      grid.appendChild(card);
    });
  },

  createCard(product) {
    const card = document.createElement('a');
    card.href = `#`;
    card.className = 'portfolio-product-card';
    card.dataset.productId = product.id;
    
    card.innerHTML = `
      <div class="product-image-portfolio">
        <img src="${product.cover_image}" alt="${product.name}" loading="lazy">
        <div class="product-overlay">
          <div class="quick-actions">
            <button class="quick-action-btn" data-action="whatsapp" data-product-id="${product.id}" data-product-name="${product.name}">
              <i class="fab fa-whatsapp"></i> Order
            </button>
            <button class="quick-action-btn" data-action="favorite" data-product-id="${product.id}">
              <i class="fas fa-heart"></i> Save
            </button>
          </div>
        </div>
      </div>
      <div class="product-details-portfolio">
        <h3 class="product-name-portfolio">${product.name}</h3>
        <div class="product-price-portfolio">₦${formatPrice(product.price)}</div>
        <div class="product-meta">
          <div class="meta-item">
            <i class="fas fa-star"></i> ${product.rating || '0.0'}
          </div>
          <div class="meta-item">
            <i class="fas fa-shopping-bag"></i> ${product.sold || 0} sold
          </div>
        </div>
      </div>
    `;

    this.attachEvents(card, product);
    return card;
  },

  attachEvents(card, product) {
    const whatsappBtn = card.querySelector('[data-action="whatsapp"]');
    const favoriteBtn = card.querySelector('[data-action="favorite"]');

    whatsappBtn?.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      OrderHandler.handle(product.id, product.name);
    });

    favoriteBtn?.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      FavoriteHandler.toggle(product.id, favoriteBtn);
    });
  }
};

// ============ REVIEW RENDERER ============
const ReviewRenderer = {
  async render() {
    if (state.reviewsLoaded) return;

    const container = document.getElementById('reviewsGrid');
    if (!container) return;

    const reviews = await DataService.fetchReviews({
      sellerId: state.sellerId,
      page: state.currentReviewPage,
      limit: CONFIG.REVIEWS_PER_PAGE
    });

    if (!reviews.length) {
      container.innerHTML = '<p class="no-reviews">No reviews yet</p>';
      return;
    }

    const html = this.buildHTML(reviews);
    container.innerHTML = html;
    this.attachEvents();
    state.reviewsLoaded = true;
  },

  buildHTML(reviews) {
    const avgRating = this.calculateAverage(reviews);
    
    return `
      ${this.buildSummary(avgRating, reviews.length)}
      <div class="reviews-list">
        ${reviews.map(r => this.buildReviewCard(r)).join('')}
      </div>
      ${reviews.length >= CONFIG.REVIEWS_PER_PAGE ? this.buildViewAllLink(reviews.length) : ''}
    `;
  },

  calculateAverage(reviews) {
    const total = reviews.reduce((sum, r) => sum + r.rating, 0);
    return (total / reviews.length).toFixed(1);
  },

  buildSummary(avgRating, totalCount) {
    return `
      <div class="reviews-summary">
        <div class="summary-left">
          <span class="summary-rating">${avgRating}</span>
          <div class="summary-stars">${StarRating.generate(avgRating)}</div>
          <span class="summary-count">Based on ${totalCount} reviews</span>
        </div>
        <div class="summary-right">
          <button class="write-review-btn" id="writeReviewBtn">
            <i class="fas fa-pen"></i> Write a Review
          </button>
        </div>
      </div>
    `;
  },

  buildReviewCard(review) {
    const date = new Date(review.date).toLocaleDateString('en-NG', {
      year: 'numeric', month: 'short', day: 'numeric'
    });

    return `
      <div class="review-card">
        <div class="review-header">
          <div class="reviewer-info">
            <div class="reviewer-avatar">
              ${review.userAvatar 
                ? `<img src="${review.userAvatar}" alt="${review.userName}">` 
                : `<div class="avatar-placeholder">${review.userName.charAt(0)}</div>`
              }
            </div>
            <div class="reviewer-details">
              <div class="reviewer-name-row">
                <span class="reviewer-name">${review.userName}</span>
                ${review.verified ? '<span class="verified-purchase"><i class="fas fa-check-circle"></i> Verified Purchase</span>' : ''}
              </div>
              <div class="review-rating">${StarRating.generate(review.rating)}</div>
            </div>
          </div>
          <span class="review-date">${date}</span>
        </div>
        <div class="review-content">
          <p>${review.comment}</p>
        </div>
      </div>
    `;
  },

  buildViewAllLink(totalCount) {
    return `
      <div class="view-all-reviews">
        <a href="#" id="viewAllReviewsLink">View all ${totalCount} reviews <i class="fas fa-arrow-right"></i></a>
      </div>
    `;
  },

  attachEvents() {
    document.getElementById('writeReviewBtn')?.addEventListener('click', (e) => {
      e.preventDefault();
      showNotification('Review feature coming soon!');
    });

    document.getElementById('viewAllReviewsLink')?.addEventListener('click', (e) => {
      e.preventDefault();
      showNotification('Showing all reviews...');
    });
  }
};

// ============ CONTROLLERS ============
const TabController = {
  init() {
    const tabs = document.querySelectorAll('.portfolio-tab');
    
    tabs.forEach(tab => {
      tab.addEventListener('click', () => this.handleTabSwitch(tab));
    });
  },

  handleTabSwitch(clickedTab) {
    const tabId = clickedTab.dataset.tab;
    
    document.querySelectorAll('.portfolio-tab').forEach(t => t.classList.remove('active'));
    clickedTab.classList.add('active');
    
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    document.getElementById(`${tabId}Tab`)?.classList.add('active');

    if (tabId === 'reviews') {
      ReviewRenderer.render();
    }
  }
};

const InteractionController = {
  init() {
    this.setupContactButton();
    this.setupFollowButton();
    this.setupViewAllButton();
  },

  setupContactButton() {
    const btn = document.getElementById('contactBtn');
    btn?.addEventListener('click', () => {
      const phone = normalizePhoneNumber(state.sellerData?.whatsapp_number);
      const message = `Hi! I'm interested in your products on ONTROPP.`;
      const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
      window.open(url, '_blank');
    });
  },

  setupFollowButton() {
    const btn = document.getElementById('followBtn');
    if (!btn) return;

    let isFollowing = false;
    
    btn.addEventListener('click', () => {
      isFollowing = !isFollowing;
      
      if (isFollowing) {
        btn.innerHTML = '<i class="fas fa-user-check"></i> Following';
        btn.classList.add('following');
        showNotification('You are now following this shop', 'success');
      } else {
        btn.innerHTML = '<i class="fas fa-user-plus"></i> Follow';
        btn.classList.remove('following');
      }
    });
  },

  setupViewAllButton() {
    const btn = document.getElementById('viewAllProductsBtn');
    btn?.addEventListener('click', () => {
      const url = new URL(window.location.href);
      url.searchParams.set('mode', 'shop');
      window.location.href = url.toString();
    });
  }
};

// ============ PORTFOLIO MODE ============
const PortfolioMode = {
  async init() {
    this.loadData();
    this.setupEventListeners();
  },

  async loadData() {
    try {
      const sellerResponse = await API.getSellerData(state.sellerId);
      state.sellerData = sellerResponse.seller;
      
      this.updateHeroSection(state.sellerData);
      state.reviews = sellerResponse.reviews || DataService.getMockReviews();
      
      const { products } = await DataService.fetchProducts({
        sellerId: state.sellerId,
        page: 1,
        limit: CONFIG.PRODUCTS_PER_PAGE
      });
      
      await ProductRenderer.render(products);
      state.productsLoaded = true;
      
    } catch (error) {
      console.error('Error loading portfolio:', error);
      showNotification('Failed to load shop data', 'error');
    }
  },

  updateHeroSection(seller) {
    updateElement('shopName', seller.shop_name);
    updateElement('shopTagline', seller.bio);
    updateElement('categoryTag', seller.category);
    updateElement('locationTag', `Located in: ${seller.location || 'OAU'}`);
    
    document.getElementById('followerCount').textContent = formatNumber(seller.followers?.[0]?.count ?? 0);
    document.getElementById('productCount').textContent = formatNumber(seller.products?.[0]?.count ?? 0);
    document.getElementById('ratingValue').textContent = seller.rating || 5;
    
    updateElement('shopBio', seller.bio);
    
    const shopAvatar = document.getElementById('shopAvatar');
    if (seller.logo_url) {
      shopAvatar.innerHTML = `<img src="${seller.logo_url}" alt="${seller.shop_name}">`;
    }
    
    const coverImage = document.getElementById('coverImage');
    if (seller.user?.avatar_url) {
      coverImage.innerHTML = `<img src="${seller.user.avatar_url}" alt="${seller.user.username}">`;
    }
  },

  setupEventListeners() {
    TabController.init();
    ShareController.init();
    InteractionController.init();
  }
};

// ============ INITIALIZATION ============
document.addEventListener('DOMContentLoaded', () => {
  const mode = Router.init();
  if (mode === 'portfolio' || mode === '') {
    PortfolioMode.init();
  }
});
