import { showNotification, updateElement, normalizePhoneNumber } from './reconfig.js';
import { formatPrice, formatNumber } from './shared.js';
import API from '../api.js';

// ============ CONFIGURATION ============
const CONFIG = {
  DEFAULT_MODE: 'portfolio',
  PRODUCTS_PER_PAGE: 6,
  REVIEWS_PER_PAGE: 3
};

// ============ STATE MANAGEMENT ============
const state = {
  sellerId: null,
  currentMode: null,
  sellerData: null,
  reviewsLoaded: false,
  productsLoaded: false,
  currentProductPage: 1,
  currentReviewPage: 1
};

// ============ ROUTER ============
const Router = {
  init() {
    const urlParams = new URLSearchParams(window.location.search);
    state.sellerId = urlParams.get('id') || '1';
    state.currentMode = urlParams.get('mode') || CONFIG.DEFAULT_MODE;
    
    this.route();
  },

  route() {
    switch (state.currentMode) {
      case 'portfolio':
      case '':  // No mode specified
        PortfolioMode.init();
        break;
      case 'products':
        // This will be implemented later - full products catalog mode
        ProductsCatalogMode.init();
        break;
      default:
        console.warn(`Unknown mode: ${state.currentMode}, defaulting to portfolio`);
        PortfolioMode.init();
    }
  }
};

// ============ PORTFOLIO MODE ============
const PortfolioMode = {
  init() {
    this.setupUI();
    this.loadData();
    this.setupEventListeners();
  },

  setupUI() {
    // Show/hide appropriate sections for portfolio view
    document.body.dataset.mode = 'portfolio';
  },

  async loadData() {
    try {
      const [sellerResponse, productsResponse] = await Promise.all([
        API.getSellerData(state.sellerId),
        this.loadProducts()
      ]);

      state.sellerData = sellerResponse.seller;
      this.updateHeroSection(state.sellerData);
      
      // Store reviews in state for later lazy loading
      state.reviews = sellerResponse.reviews || this.getMockReviews();
      
    } catch (error) {
      console.error('Error loading portfolio data:', error);
      showNotification('Failed to load shop data', 'error');
    }
  },

  async loadProducts() {
    if (state.productsLoaded) return;
    
    const products = await DataService.fetchProducts({
      sellerId: state.sellerId,
      page: 1,
      limit: CONFIG.PRODUCTS_PER_PAGE
    });
    
    await ProductRenderer.render(products);
    state.productsLoaded = true;
  },

  setupEventListeners() {
    TabController.init();
    ShareController.init();
    InteractionController.init();
  },

  updateHeroSection(seller) {
    updateElement('shopName', seller.shop_name);
    updateElement('shopTagline', seller.bio);
    updateElement('categoryTag', seller.category);
    updateElement('locationTag', `Located in: ${seller.location || 'OAU'}`);
    
    document.getElementById('followerCount').textContent = formatNumber(seller.followers?.[0]?.count ?? 0);
    document.getElementById('productCount').textContent = formatNumber(seller.products?.[0]?.count ?? 0);
    document.getElementById('ratingValue').textContent = seller.rating || 5.0;
    
    updateElement('shopBio', seller.bio);
    
    const shopAvatar = document.getElementById('shopAvatar');
    if (seller.logo_url) {
      shopAvatar.innerHTML = `<img src="${seller.logo_url}" alt="${seller.shop_name}">`;
    }
    const coverImage = document.getElementById('coverImage');
    if (seller.user.avatar_url) {
      coverImage.innerHTML = `<img src="${seller.user.avatar_url}" alt="${seller.user.username}">`;
    }
  },

  getMockReviews() {
    // Fallback mock data
    return [
      {
        id: 1,
        userName: "Chidi O.",
        userAvatar: "",
        rating: 5,
        comment: "Got the wireless headphones. Sound quality is amazing...",
        date: "2024-02-10",
        verified: true
      }
    ];
  }
};

// ============ PRODUCTS CATALOG MODE (PLACEHOLDER) ============
const ProductsCatalogMode = {
  init() {
    // This will be implemented later - transforms page into full product catalog
    console.log('Products catalog mode initialized');
    document.body.dataset.mode = 'products-catalog';
    // TODO: Implement full product listing view
  }
};

// ============ DATA SERVICE ============
const DataService = {
  async fetchProducts({ sellerId, page = 1, limit = CONFIG.PRODUCTS_PER_PAGE }) {
    try {
      // Use the actual API call with pagination
      const response = await API.getSellerProducts(sellerId, page, limit);
      return response.products || [];
    } catch (error) {
      console.error('Error fetching products:', error);
      // Fallback to mock data if API fails
      return this.getMockProducts().slice(0, limit);
    }
  },

  async fetchReviews({ sellerId, page = 1, limit = CONFIG.REVIEWS_PER_PAGE }) {
    try {
      const response = await API.getSellerReviews(sellerId, page, limit);
      return response.reviews || [];
    } catch (error) {
      console.error('Error fetching reviews:', error);
      return this.getMockReviews().slice(0, limit);
    }
  },

  getMockProducts() {
    return [
      {
        id: 1,
        name: 'Wireless Bluetooth Headphones',
        price: 24999,
        image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&h=400&fit=crop',
        rating: 4.8,
        sold: 156
      },
      {
        id: 2,
        name: 'Smart Watch Series 5',
        price: 64999,
        image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&h=400&fit=crop',
        rating: 4.9,
        sold: 89
      },
      {
        id: 3,
        name: 'Phone Case Collection',
        price: 5499,
        image: 'https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=400&h=400&fit=crop',
        rating: 4.5,
        sold: 234
      }
    ];
  },

  getMockReviews() {
    return [
      {
        id: 1,
        userName: "Chidi O.",
        userAvatar: "",
        rating: 5,
        comment: "Got the wireless headphones. Sound quality is amazing and battery lasts forever.",
        date: "2024-02-10",
        verified: true
      },
      {
        id: 2,
        userName: "Aisha B.",
        userAvatar: "",
        rating: 4,
        comment: "Smart watch is authentic and delivery was fast.",
        date: "2024-02-05",
        verified: true
      },
      {
        id: 3,
        userName: "Tunde A.",
        userAvatar: "",
        rating: 5,
        comment: "Best phone case I've bought on ONTROPP.",
        date: "2024-01-28",
        verified: true
      }
    ];
  }
};

// ============ PRODUCT RENDERER ============
const ProductRenderer = {
  async render(products) {
    const grid = document.getElementById('productsGrid');
    const loadingEl = document.getElementById('loadingProducts');
    
    if (!grid) return;

    // Simulate loading delay for UX
    await new Promise(resolve => setTimeout(resolve, 300));
    
    if (loadingEl) loadingEl.style.display = 'none';
    
    grid.innerHTML = '';
    
    products.forEach(product => {
      const card = this.createProductCard(product);
      grid.appendChild(card);
    });
  },

  createProductCard(product) {
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
            <i class="fas fa-star"></i> ${product.rating || 5.0}
          </div>
          <div class="meta-item">
            <i class="fas fa-shopping-bag"></i> ${product.sold || 10} sold
          </div>
        </div>
      </div>
    `;

    this.attachCardEvents(card, product);
    return card;
  },

  attachCardEvents(card, product) {
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

// ============ UI CONTROLLERS ============
const TabController = {
  init() {
    const tabs = document.querySelectorAll('.portfolio-tab');
    
    tabs.forEach(tab => {
      tab.addEventListener('click', () => this.handleTabSwitch(tab));
    });
  },

  handleTabSwitch(clickedTab) {
    const tabId = clickedTab.dataset.tab;
    
    // Update active states
    document.querySelectorAll('.portfolio-tab').forEach(t => t.classList.remove('active'));
    clickedTab.classList.add('active');
    
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    document.getElementById(`${tabId}Tab`)?.classList.add('active');

    // Lazy load reviews when tab is clicked
    if (tabId === 'reviews') {
      ReviewRenderer.render();
    }
  }
};

const ShareController = {
  init() {
    const shareBtn = document.getElementById('shareBtn');
    shareBtn?.addEventListener('click', () => this.handleShare());
  },

  async handleShare() {
    const shareData = {
      title: document.getElementById('shopName')?.textContent,
      text: 'Check out this shop on ONTROPP!',
      url: window.location.href
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(window.location.href);
        showNotification('Link copied to clipboard!');
      }
    } catch (err) {
      console.error('Share failed:', err);
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
      // Navigate to products catalog mode
      const url = new URL(window.location.href);
      url.searchParams.set('mode', 'products');
      window.location.href = url.toString();
    });
  }
};

// ============ HANDLERS ============
const OrderHandler = {
  handle(productId, productName) {
    const phone = normalizePhoneNumber(state.sellerData?.whatsapp_number);
    const message = `Hello! I saw "${productName}" on your ONTROPP shop and I'd like to place an order. Product ID: ${productId}`;
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
    
    window.open(url, '_blank');
    showNotification('Opening WhatsApp...');
  }
};

const FavoriteHandler = {
  toggle(productId, button) {
    const icon = button.querySelector('i');
    const isSaved = icon.classList.contains('fa-heart-circle-check');

    if (!isSaved) {
      icon.classList.remove('fa-heart');
      icon.classList.add('fa-heart-circle-check');
      button.innerHTML = '<i class="fas fa-heart-circle-check"></i> Saved';
      showNotification('Product saved to favorites', 'success');
    } else {
      icon.classList.remove('fa-heart-circle-check');
      icon.classList.add('fa-heart');
      button.innerHTML = '<i class="fas fa-heart"></i> Save';
    }
  }
};

// ============ UTILITIES ============
const StarRating = {
  generate(rating) {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);

    return [
      ...Array(fullStars).fill('<i class="fas fa-star"></i>'),
      ...(hasHalfStar ? ['<i class="fas fa-star-half-alt"></i>'] : []),
      ...Array(emptyStars).fill('<i class="far fa-star"></i>')
    ].join('');
  }
};

// ============ INITIALIZATION ============
document.addEventListener('DOMContentLoaded', () => {
  Router.init();
});
