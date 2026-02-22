import { showNotification, updateElement, normalizePhoneNumber } from './reconfig.js';
import { formatPrice, formatNumber } from './shared.js';
import API from '../api.js';

// ============ CONFIGURATION ============
export const CONFIG = {
  DEFAULT_MODE: 'portfolio',
  PRODUCTS_PER_PAGE: 6,
  REVIEWS_PER_PAGE: 3,
  SHOP_PRODUCTS_PER_PAGE: 20,
  INFINITE_SCROLL_THRESHOLD: 500 // pixels from bottom to trigger load
};

// ============ STATE MANAGEMENT ============
export const state = {
  sellerId: null,
  currentMode: null,
  sellerData: null,
  reviewsLoaded: false,
  productsLoaded: false,
  currentProductPage: 1,
  currentReviewPage: 1,
  shopProductsPage: 1,
  isLoadingMore: false,
  hasMoreProducts: true
};

// ============ DATA SERVICE ============
export const DataService = {
  async fetchProducts({ sellerId, page = 1, limit = CONFIG.PRODUCTS_PER_PAGE }) {
    try {
      const response = await API.getSellerProducts(sellerId, page, limit);
      return {
        products: response.products || [],
        hasMore: response.hasMore !== false && (response.products || []).length === limit
      };
    } catch (error) {
      console.error('Error fetching products:', error);
      const mock = this.getMockProducts();
      return {
        products: mock.slice(0, limit),
        hasMore: false
      };
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
        image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&h=400&fit=crop'
      },
      {
        id: 2,
        name: 'Smart Watch Series 5',
        price: 64999,
        image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&h=400&fit=crop'
      },
      {
        id: 3,
        name: 'Phone Case Collection',
        price: 5499,
        image: 'https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=400&h=400&fit=crop'
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
        comment: "Great product!",
        date: "2024-02-10",
        verified: true
      }
    ];
  }
};

// ============ HANDLERS ============
export const OrderHandler = {
  handle(productId, productName) {
    const phone = normalizePhoneNumber(state.sellerData?.whatsapp_number);
    const message = `Hello! I saw "${productName}" on your ONTROPP shop and I'd like to place an order. Product ID: ${productId}`;
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
    showNotification('Opening WhatsApp...');
  }
};

export const FavoriteHandler = {
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
export const StarRating = {
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

// ============ SHARED UI CONTROLLERS ============
export const ShareController = {
  init() {
    const shareBtn = document.getElementById('shareBtn') || document.getElementById('shopShareBtn');
    shareBtn?.addEventListener('click', () => this.handleShare());
  },

  async handleShare() {
    const shareData = {
      title: state.sellerData?.shop_name || 'ONTROPP Shop',
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

// ============ ROUTER ============
export const Router = {
  init() {
    const urlParams = new URLSearchParams(window.location.search);
    state.sellerId = urlParams.get('id') || '1';
    state.currentMode = urlParams.get('mode') || CONFIG.DEFAULT_MODE;
    return state.currentMode;
  }
};
