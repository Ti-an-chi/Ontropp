// ========== reconfig.js ==========
import API from "/api.js";

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

// Navigate to designer profile
export function viewSellerProfile(designerId) {
  window.location.href = `/portfolio.html?id=${designerId}`;
}

/* =========================================================
 * SaveButton — optimistic toggle for saved/unsaved products
 * ========================================================= */
export class SaveButton {
  constructor(button, productId, isSaved, options = {}) {
    this.button    = button;
    this.productId = productId;
    this.isSaved   = !!isSaved;
    this.isPending = false;

    this.options = {
      savedClass:   'saved',
      savedText:    'Saved',
      unsavedText:  'Save',
      onSave:       (id) => API.addToSaved(id),
      onUnsave:     (id) => API.removeFromSaved(id),
      onChange:     null,
      loginRedirect: '/signup.html?mode=signin',
      ...options,
    };

    this.init();
  }

  init() {
    this.updateUI();
    this._onClick = this.handleClick.bind(this);
    this.button.addEventListener('click', this._onClick);
  }

  updateUI() {
    this.button.classList.toggle(this.options.savedClass, this.isSaved);
    this.button.textContent = this.isSaved
      ? this.options.savedText
      : this.options.unsavedText;
    this.button.disabled = this.isPending;
    this.button.style.opacity = this.isPending ? '0.6' : '1';
  }

  async handleClick(e) {
    e.preventDefault();
    e.stopPropagation();
    if (this.isPending) return;

    if (!API.isAuthenticated()) {
      const next = encodeURIComponent(
        window.location.pathname + window.location.search + window.location.hash
      );
      window.location.href = `${this.options.loginRedirect}?next=${next}&autoSave=${this.productId}`;
      return;
    }

    this.isPending = true;
    const willSave = !this.isSaved;

    // Optimistic
    this.isSaved = willSave;
    this.updateUI();

    try {
      const response = willSave
        ? await this.options.onSave(this.productId)
        : await this.options.onUnsave(this.productId);

      if (!response || !response.success) {
        throw new Error(response?.message || 'Failed to update save state');
      }

      if (typeof this.options.onChange === 'function') {
        this.options.onChange(this.isSaved, response);
      }
    } catch (err) {
      this.isSaved = !willSave;
      this.updateUI();
      console.warn(`Save toggle failed for ${this.productId}:`, err.message);
    } finally {
      this.isPending = false;
      this.updateUI();
    }
  }

  destroy() {
    this.button.removeEventListener('click', this._onClick);
  }

  static create(productId, isSaved, options = {}) {
    const btn = document.createElement('button');
    btn.className = 'btn btn-primary save-pill';
    btn.textContent = 'Save';
    new SaveButton(btn, productId, isSaved, options);
    return btn;
  }
}

/* =========================================================
 * LikeButton — optimistic toggle for liked/unliked products
 * ========================================================= */
export class LikeButton {
  constructor(button, productId, isLiked, options = {}) {
    this.button    = button;
    this.productId = productId;
    this.isLiked   = !!isLiked;
    this.isPending = false;

    this.options = {
      likedClass:   'liked',
      likedIcon:    'fa-solid fa-heart',
      unlikedIcon:  'fa-regular fa-heart',
      onLike:       (id) => API.likeProduct(id),
      onUnlike:     (id) => API.unlikeProduct(id),
      onChange:     null,
      loginRedirect: '/signup.html?mode=signin',
      ...options,
    };

    this.init();
  }

  init() {
    this.updateUI();
    this._onClick = this.handleClick.bind(this);
    this.button.addEventListener('click', this._onClick);
  }

  updateUI() {
    this.button.classList.toggle(this.options.likedClass, this.isLiked);
    const icon = this.isLiked ? this.options.likedIcon : this.options.unlikedIcon;
    this.button.innerHTML = `<i class="${icon}"></i>`;
    this.button.setAttribute('aria-label', this.isLiked ? 'Unlike design' : 'Like design');
    this.button.disabled = this.isPending;
    this.button.style.opacity = this.isPending ? '0.6' : '1';
  }

  async handleClick(e) {
    e.preventDefault();
    e.stopPropagation();
    if (this.isPending) return;

    if (!API.isAuthenticated()) {
      const next = encodeURIComponent(
        window.location.pathname + window.location.search + window.location.hash
      );
      window.location.href = `${this.options.loginRedirect}?next=${next}&autoLike=${this.productId}`;
      return;
    }

    this.isPending = true;
    const willLike = !this.isLiked;

    this.isLiked = willLike;
    this.updateUI();

    try {
      const response = willLike
        ? await this.options.onLike(this.productId)
        : await this.options.onUnlike(this.productId);

      if (!response || !response.success) {
        throw new Error(response?.message || 'Failed to update like state');
      }

      if (typeof this.options.onChange === 'function') {
        this.options.onChange(this.isLiked, response);
      }
    } catch (err) {
      this.isLiked = !willLike;
      this.updateUI();
      console.warn(`Like toggle failed for ${this.productId}:`, err.message);
    } finally {
      this.isPending = false;
      this.updateUI();
    }
  }

  destroy() {
    this.button.removeEventListener('click', this._onClick);
  }

  static create(productId, isLiked, options = {}) {
    const btn = document.createElement('button');
    btn.setAttribute('aria-label', 'Like design');
    btn.innerHTML = '<i class="fa-regular fa-heart"></i>';
    new LikeButton(btn, productId, isLiked, options);
    return btn;
  }
}

export class DesignerFollowButton {
  constructor(button, designerId, isFollowing, options = {}) {
    this.button = button;
    this.designerId = designerId;
    this.isFollowing = !!isFollowing; // Ensure boolean
    this.isPending = false;
    
    this.options = {
      followingClass: 'following',
      followText: '<i class="fas fa-check"></i> Following',
      unfollowText: '<i class="fas fa-user-plus"></i> Follow',
      onFollow: (id) => API.followDesigner(id),
      onUnfollow: (id) => API.unfollowDesigner(id),
      onChange: null, // Callback to update local data models
      loginRedirect: '/signup.html?mode=signin',
      ...options
    };
    
    this.init();
  }

  init() {
    this.updateUI();
    this._onClick = this.handleClick.bind(this);
    this.button.addEventListener('click', this._onClick);
  }

  updateUI() {
    this.button.classList.toggle(this.options.followingClass, this.isFollowing);
    this.button.innerHTML = this.isFollowing ? this.options.followText : this.options.unfollowText;
    this.button.disabled = this.isPending;
    this.button.style.opacity = this.isPending ? '0.6' : '1';
  }

  async handleClick(e) {
    e.preventDefault();
    e.stopPropagation();
    if (this.isPending) return;

    // 1. Reliable Auth Check
    if (!API.isAuthenticated()) {
      const next = encodeURIComponent(window.location.pathname + window.location.search + window.location.hash);
      window.location.href = `${this.options.loginRedirect}?next=${next}&autoFollow=${this.designerId}`;
      return;
    }

    this.isPending = true;
    const willFollow = !this.isFollowing;

    // 2. Optimistic Update
    this.isFollowing = willFollow;
    this.updateUI();

    try {
      // 3. API Call
      const response = willFollow 
        ? await this.options.onFollow(this.designerId)
        : await this.options.onUnfollow(this.designerId);

      if (!response || !response.success) {
        throw new Error(response?.message || 'Failed to update follow status');
      }

      // 4. Success: Update local data model
      if (typeof this.options.onChange === 'function') {
        this.options.onChange(this.isFollowing, response);
      }

    } catch (err) {
      // 5. Failure: Silent rollback (no annoying notification)
      this.isFollowing = !willFollow;
      this.updateUI();
      console.warn(`Follow action failed for ${this.designerId}:`, err.message);
    } finally {
      this.isPending = false;
      this.updateUI(); // Re-enable button
    }
  }

  // Call this if you ever remove the button from the DOM to prevent memory leaks
  destroy() {
    this.button.removeEventListener('click', this._onClick);
  }

  static create(designerId, isFollowing, options = {}) {
    const btn = document.createElement('button');
    btn.className = 'follow-btn';
    btn.dataset.designerId = designerId;
    new DesignerFollowButton(btn, designerId, isFollowing, options);
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

async function togglefollowDesigner(designerId, button) {
  return;
}

/**
 * Wire every [data-switch-tab] element in the document to dispatch
 * the 'switchTab' CustomEvent. Idempotent-safe per element.
 */
export function setupTabSwitchers(root = document) {
  root.querySelectorAll('[data-switch-tab]').forEach(el => {
    if (el.dataset._switchBound) return;
    el.dataset._switchBound = '1';
    el.addEventListener('click', (e) => {
      e.preventDefault();
      document.dispatchEvent(new CustomEvent('switchTab', {
        detail: el.dataset.switchTab,
      }));
    });
  });
}