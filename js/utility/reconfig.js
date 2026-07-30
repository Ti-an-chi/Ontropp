// ========== reconfig.js ==========

export function updateElement(id, value, property = 'textContent') {
  const el = document.getElementById(id);
  if (!el || value === undefined || value === null) return;

  el[property] = value;
}

export function changeDisplay(id, display) {
  const el = document.getElementById(id);
  if (!el || display === undefined || display === null) return;
  
  el.style.display = display;
}

export function showNotification(message, type= 'info', href = null){
  // Remove existing notifications
  const existing = document.querySelector('.notification');
  if (existing) existing.remove();
  
  const notification = document.createElement('div');
  notification.className = 'notification';
  notification.innerHTML = `
    <i class="fas fa-check-circle"></i>
    <span>${message}</span>
    ${href ? `<a href="${href}" style="color:white; font-weight:bold;">Sign in</a>` : ''}
  `;
  
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: var(--${type}, #10B981);
    color: white;
    padding: 16px 24px;
    border-radius: 12px;
    display: flex;
    align-items: center;
    gap: 12px;
    z-index: 10000;
    box-shadow: 0 8px 32px rgba(0,0,0,0.2);
    animation: slideIn 0.3s ease;
    font-family: inherit;
  `;
  
  // Add animation keyframes if not exists
  if (!document.getElementById('notif-styles')) {
    
    const style = document.createElement('style');
    style.id = 'notif-styles';
    style.textContent = `
      @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
      @keyframes slideOut {
        from { transform: translateX(0);opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
      }
    `;
    document.head.appendChild(style);
  }
  
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.style.animation = 'slideOut 0.3s ease forwards';
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

// Navigate to seller profile
export function viewSellerProfile(sellerId) {
  window.location.href = `/portfolio.html?id=${sellerId}`;
}

// ============ FOLLOW BUTTON MANAGER ============
export const FollowButtonManager = {
  // Track pending requests to prevent double-clicks
  pending: new Set(),
  
  /**
   * Create and return a follow button element
   * @param {Object} seller - Seller data with { id, isFollowing }
   * @param {Function} onFollowChange - Optional callback when follow status changes
   * @param {String} additionalClasses - Optional additional CSS classes (e.g., "action-btn follow")
   * @returns {HTMLElement} Button element
   */
  createFollowButton(seller, onFollowChange = null, additionalClasses = '') {
    const button = document.createElement('button');
    button.className = `follow-btn ${additionalClasses}`.trim();
    button.type = 'button';
    button.dataset.sellerId = seller.id;
    
    // Set initial state
    this.updateButtonUI(button, seller.isFollowing);
    
    // Add click handler
    button.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.handleFollowClick(button, seller.id, onFollowChange);
    });
    
    return button;
  },
  
  /**
   * Update button UI based on follow state
   * @param {HTMLElement} button - Button element
   * @param {Boolean} isFollowing - Whether user is following
   */
  updateButtonUI(button, isFollowing) {
    button.classList.toggle('following', isFollowing);
    button.disabled = isFollowing;
    
    if (isFollowing) {
      button.innerHTML = '<i class="fas fa-check"></i> Following';
    } else {
      button.innerHTML = '<i class="fas fa-user-plus"></i> Follow';
    }
  },
  
  /**
   * Handle follow button click with optimistic updates and error handling
   * @param {HTMLElement} button - Button element
   * @param {String} sellerId - Seller ID
   * @param {Function} onFollowChange - Optional callback
   */
  async handleFollowClick(button, sellerId, onFollowChange = null) {
    // Check if already pending
    if (this.pending.has(sellerId)) {
      console.warn('Follow request already pending');
      return;
    }
    
    // Check if user is signed in
    const user = window.UserSession?.getCurrentUser();
    if (!user) {
      showNotification('Please sign in to follow sellers', 'error', '/signup.html');
      return;
    }
    
    const currentlyFollowing = button.classList.contains('following');
    const willFollow = !currentlyFollowing;
    
    // Mark as pending
    this.pending.add(sellerId);
    button.disabled = true;
    
    try {
      // Optimistic UI update
      this.updateButtonUI(button, willFollow);
      
      // Make API call
      let response;
      if (willFollow) {
        response = await window.API.followSeller(sellerId);
      } else {
        response = await window.API.unfollowSeller(sellerId);
      }
      
      // Check for errors
      if (!response || !response.success) {
        // Handle specific error scenarios
        if (response?.code === 'ALREADY_FOLLOWING') {
          showNotification('You are already following this shop', 'info');
          this.updateButtonUI(button, true);
        } else if (response?.code === 'AUTH_REQUIRED' || response?.message?.includes('sign in')) {
          showNotification('Please sign in to follow sellers', 'error', '/signup.html');
          this.updateButtonUI(button, currentlyFollowing);
        } else {
          showNotification(response?.message || 'Failed to update follow status', 'error');
          // Revert optimistic update
          this.updateButtonUI(button, currentlyFollowing);
        }
      } else {
        // Success - keep optimistic update
        if (willFollow) {
          showNotification('You are now following this shop', 'success');
        } else {
          showNotification('Unfollowed', 'success');
        }
      }
      
      // Call callback if provided
      if (typeof onFollowChange === 'function') {
        onFollowChange(willFollow, response);
      }
      
    } catch (error) {
      console.error('Follow action error:', error);
      
      // Revert optimistic update on error
      this.updateButtonUI(button, currentlyFollowing);
      
      if (error?.message?.includes('sign in') || error?.code === 'AUTH_REQUIRED') {
        showNotification('Please sign in to follow sellers', 'error', '/signup.html');
      } else {
        showNotification(error?.message || 'Failed to update follow status', 'error');
      }
    } finally {
      // Remove from pending
      this.pending.delete(sellerId);
      button.disabled = false;
    }
  }
};

// ============ DESIGNER FOLLOW BUTTON (OOP) ============
export class DesignerFollowButton {
  constructor(button, shopId, isFollowing, options = {}) {
    this.button = button;
    this.shopId = shopId;
    this.isFollowing = isFollowing;
    this.isPending = false;

    this.options = {
      followingClass: 'following',
      onChange: null,           // (isFollowing, response) => {}
      onFollow: this.defaultFollow.bind(this),
      onUnfollow: this.defaultUnfollow.bind(this),
      ...options
    };

    this.init();
  }

  init() {
    this.updateUI();
    this.button.addEventListener('click', (e) => this.handleClick(e));
  }

  updateUI() {
    const cls = this.options.followingClass;
    this.button.classList.toggle(cls, this.isFollowing);

    if (this.isFollowing) {
      this.button.innerHTML = '<i class="fas fa-check"></i> Following';
    } else {
      this.button.innerHTML = '<i class="fas fa-user-plus"></i> Follow';
    }
  }

  async handleClick(e) {
    e.preventDefault();
    e.stopPropagation();

    if (this.isPending) return;

    const user = window.UserSession?.getCurrentUser();
    if (!user) {
      showNotification('Please sign in to follow designers', 'error', '/signup.html');
      return;
    }

    this.isPending = true;
    const willFollow = !this.isFollowing;

    // Optimistic update
    this.isFollowing = willFollow;
    this.updateUI();

    try {
      const response = willFollow
        ? await this.options.onFollow(this.shopId)
        : await this.options.onUnfollow(this.shopId);

      if (!response || !response.success) {
        // Revert
        this.isFollowing = !willFollow;
        this.updateUI();
        showNotification(response?.message || 'Failed to update follow status', 'error');
      } else {
        const msg = willFollow ? 'You are now following this designer' : 'Unfollowed';
        showNotification(msg, 'success');
      }

      if (typeof this.options.onChange === 'function') {
        this.options.onChange(this.isFollowing, response);
      }

    } catch (err) {
      this.isFollowing = !willFollow;
      this.updateUI();
      showNotification(err?.message || 'Something went wrong', 'error');
    } finally {
      this.isPending = false;
    }
  }

  async defaultFollow(shopId) {
    return window.API.followSeller(shopId);
  }

  async defaultUnfollow(shopId) {
    return window.API.unfollowSeller(shopId);
  }
  
  static create(shopId, isFollowing, options = {}) {
    const btn = document.createElement('button');
    btn.className = 'follow-btn';
    new DesignerFollowButton(btn, shopId, isFollowing, options);
    return btn;
  }
}

export function normalizePhoneNumber(phone) {
  if (!phone) return '';
  
  phone = phone.replace(/\D/g, '');
  
  // Handle Nigerian numbers
  if (phone.length === 10) {
    return '234' + phone;
  } else if (phone.length === 11 && phone.startsWith('0')) {
    return '234' + phone.substring(1);
  }
  
  return phone;
}

export const orderHandler = {
  flexibleHandle({
        whatsappNumber,
        productName,
        productId
      }) {
    const phone = normalizePhoneNumber(whatsappNumber);
    const message = `Hello! I saw "${productName}" on your ONTROPP shop and I'd like to place an order. Product ID: ${productId}`;
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
    showNotification('Opening WhatsApp...');
  }
};

async function togglefollowSeller(sellerId, button) {
  return;
}