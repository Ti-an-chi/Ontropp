import { showNotification, updateElement, normalizePhoneNumber } from './reconfig.js';
import {formatPrice,formatNumber} from './shared.js';
import API from '../api.js';

// ============ CONFIGURATION ============
export const CONFIG = {
  DEFAULT_MODE: 'portfolio',
  PRODUCTS_PER_PAGE: 6,
  REVIEWS_PER_PAGE: 3,
  SHOP_PRODUCTS_PER_PAGE: 20,
  INFINITE_SCROLL_THRESHOLD: 500
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
  hasMoreProducts: true,
  // Track pending API calls to prevent duplicates
  pendingToggles: new Set()
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
      return { products: [], hasMore: false };
    }
  },

  async fetchReviews({ sellerId, page = 1, limit = CONFIG.REVIEWS_PER_PAGE }) {
    try {
      const response = await API.getSellerReviews(sellerId, page, limit);
      return response.reviews || [];
    } catch (error) {
      return [];
    }
  }
};

// ============ FOLLOW HANDLER ============
export const FollowHandler = {
  async toggle(button, sellerId) {
    // Prevent duplicate clicks
    if (state.pendingToggles.has(`follow-${sellerId}`)) return;
    
    const isFollowing = button.classList.contains('following');
    const newState = !isFollowing;
    
    // Optimistic UI update
    this.updateButton(button, newState);
    state.pendingToggles.add(`follow-${sellerId}`);
    
    try {
      if (newState) {
        await API.followSeller(sellerId);
        showNotification('You are now following this shop', 'success');
      } else {
        await API.unfollowSeller(sellerId);
      }
    } catch (error) {
      // Revert on error
      this.updateButton(button, isFollowing);
      showNotification('Failed to update follow status', 'error');
      console.error('Follow error:', error);
    } finally {
      state.pendingToggles.delete(`follow-${sellerId}`);
    }
  },

  updateButton(button, isFollowing) {
    if (isFollowing) {
      button.innerHTML = '<i class="fas fa-user-check"></i> Following';
      button.classList.add('following');
    } else {
      button.innerHTML = '<i class="fas fa-user-plus"></i> Follow';
      button.classList.remove('following');
    }
  },

  initButton(button, sellerId, initialIsFollowing) {
    this.updateButton(button, initialIsFollowing);
    button.addEventListener('click', () => this.toggle(button, sellerId));
  }
};

// ============ FAVORITE HANDLER ============
export const FavoriteHandler = {
  async toggle(button, productId) {
    // Prevent duplicate clicks
    if (state.pendingToggles.has(`fav-${productId}`)) return;
    
    const icon = button.querySelector('i');
    const isSaved = button.dataset.saved === 'true';
    const newState = !isSaved;
    
    // Optimistic UI update
    this.updateButton(button, newState);
    state.pendingToggles.add(`fav-${productId}`);
    
    try {
      if (newState) {
        await API.addToFavourites(productId);
        showNotification('Product saved to favorites', 'success');
      } else {
        await API.removeFromFavourites(productId);
      }
    } catch (error) {
      // Revert on error
      this.updateButton(button, isSaved);
      showNotification('Failed to update favorite', 'error');
      console.error('Favorite error:', error);
    } finally {
      state.pendingToggles.delete(`fav-${productId}`);
    }
  },

  updateButton(button, isSaved) {
    button.dataset.saved = isSaved;
    if (isSaved) {
      button.innerHTML = '<i class="fas fa-heart"></i> Saved';
      button.classList.add('saved');
    } else {
      button.innerHTML = '<i class="far fa-heart"></i> Save';
      button.classList.remove('saved');
    }
  },

  createButton(productId, isFavorite) {
    const button = document.createElement('button');
    button.className = 'favorite-btn';
    button.dataset.productId = productId;
    this.updateButton(button, isFavorite);
    button.addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggle(button, productId);
    });
    return button;
  }
};

// ============ ORDER HANDLER ============
export const OrderHandler = {
  handle(productId, productName) {
    const phone = normalizePhoneNumber(state.sellerData?.whatsapp_number);
    const message = `Hello! I saw "${productName}" on your ONTROPP shop and I'd like to place an order. Product ID: ${productId}`;
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
    showNotification('Opening WhatsApp...');
  },
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

// ============ SHARED CONTROLLERS ============
export const ShareController = {
  init() {
    const shareBtn = document.getElementById('shareBtn') || document.getElementById('shopShareBtn');
    shareBtn?.addEventListener('click', () => this.handleShare());
  },

  async handleShare() {
    try {
      if (navigator.share) {
        await navigator.share({
          title: state.sellerData?.shop_name || 'ONTROPP Shop',
          text: 'Check out this shop on ONTROPP!',
          url: window.location.href
        });
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
