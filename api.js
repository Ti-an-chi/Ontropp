/*========= API GATEWAY – api.js =========*/
const API = {
  baseURL: 'http://localhost:5000/api',
  
  // Store tokens & userId after login
  setTokens({ accessToken, refreshToken, userId }) {
    localStorage.setItem('ontrop_token', accessToken);
    localStorage.setItem('ontrop_refresh', refreshToken);
    localStorage.setItem('ontrop_userid', userId);
  },
  
  // Clear everything on logout
  clearTokens() {
    localStorage.removeItem('ontrop_token');
    localStorage.removeItem('ontrop_refresh');
    localStorage.removeItem('ontrop_userid');
    localStorage.removeItem('ontrop_user');
    localStorage.removeItem('pendingSignupEmail');
  },
  
  
  
  /*---------- Core Fetch with Auto-Refresh ----------*/
/*========= API GATEWAY – api.js (Fixed) =========*/
  
  /*---------- Core Fetch ----------*/
  async _fetch(path, options = {}, _retry = false) {
    const url = `${this.baseURL}${path.startsWith('/') ? path : `/${path}`}`;
    const token = localStorage.getItem('ontrop_token');
    
    const defaults = {
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` })
      }
    };
    
    const resp = await fetch(url, { ...defaults, ...options });
    
    if (!resp.ok) {
      let msg = 'Network error';
      try {
        const data = await resp.json();
        msg = data.message || msg;
      } catch {}
      
      if ((msg === 'Invalid or expired token' || resp.status === 401) && !_retry) {
        try {
          await this.refresh();
          return await this._fetch(path, options, true);
        } catch {
          this.clearTokens();
          location.href = 'signup.html';
          throw new Error('Session expired. Please login again.');
        }
      }
      
      throw new Error(msg);
    }
    
    return await resp.json(); // Return raw JSON, not wrapped
  },
  
  /*--------------------- AUTH --------------------*/
  // These now return raw responses so frontend can use response.success directly
  
  async signUpSeller({ email, password, username }) {
    return this.requestOtp(email, password, username);
  },
  
  requestOtp(email, password, username, whatsapp_number = '', role = 'buyer') {
    return this._fetch('/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ email, password, username, whatsapp_number, role })
    });
  },
  
  verifyOtp(email, otp) {
    return this._fetch('/auth/verifyotp', {
      method: 'POST',
      body: JSON.stringify({ email, otp })
    });
  },
  
  resendOtp(email) {
    return this._fetch('/auth/resendotp', {
      method: 'POST',
      body: JSON.stringify({ email })
    });
  },
  
  async login(email, password) {
    const response = await this._fetch('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
    if (response.success) {
      this.setTokens(response);
    }
    return response;
  },
  
  async refresh() {
    const refreshToken = localStorage.getItem('ontrop_refresh');
    if (!refreshToken) throw new Error('No refresh token');
    
    const response = await this._fetch('/auth/refresh', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ token: refreshToken })
    }, true);
    if (response.success) {
      localStorage.setItem('ontrop_token', response.accessToken);
    }
    return response;
  },
  
  async logout() {
    await this._fetch('/auth/logout', { method: 'POST' });
    this.clearTokens();
    return { success: true, message: 'Logged out' };
  },
  
  /*---------- USER DATA ----------*/
  // These return wrapped { data: ... } for consistency with mock API
  
  async getUserData() {
    const response = await this._fetch('/user/dashboard');
    return response.data;
  },
  
  async updateProfile(updates) {
    const response = await this._fetch('/user/profile', {
      method: 'PATCH',
      body: JSON.stringify(updates)
    });
    return { data: response };
  },
  
  /* ----------------- SELLER DATA ---------------- */
  async getSellers(category='', page=1, limit=20) {
    const params = new URLSearchParams({
      page: page.toString(), 
      limit: limit.toString(), 
    });
    
    if (category) {
      params.append('category', category);
    }
    
    const response = await this._fetch(`/sellers?${params}`);
    return response.data;
  },

  async getSellerData() {
    return this._fetch('/seller/stats');
  },
  
  async getMyProducts(page = 1, limit = 20, search = '') {
    const params = new URLSearchParams({ page, limit, search });
    return this._fetch(`/seller/products?${params}`);
  },
  
  async getSellerProducts(sellerId = undefined, page = 1, limit = 20) {
    const params = new URLSearchParams({ page, limit });
    if (sellerId) return await this._fetch(`/products/seller/${sellerId}?${params}`);
    return await this._fetch(`/seller/products?${params}`);
  },
  
  
  /* ---------------- PRODUCT DATA --------------- */
  // 1. PRODUCTS
  async getProductsPaginated(page = 1, limit = 20, filters = {}) {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      ...filters
    });
    return await this._fetch(`/products?${params}`);
  },
  
  async searchProducts(query, page = 1, limit = 20, filters = {}) {
    const params = new URLSearchParams({
      search: query,
      page: page.toString(),
      limit: limit.toString(),
      ...filters
    });
    return this._fetch(`/products/search?${params}`);
  },
  
  async getRecommendedProducts(page = 1, limit = 8) {
    const params = new URLSearchParams({ page: page.toString(), limit: limit.toString() });
    const response = await this._fetch(`/products/recommended?${params}`);
    return response.data;
  },
  
  async getFavourites(page = 1, limit = 20, search = '') {
    const params = new URLSearchParams({ page: page.toString(), limit: limit.toString(), search });
    const resp = await this._fetch(`/user/favorites?${params}`);
    return resp.data;
  },
  
  // 2. CATEGORIES
  async getCategories() {
    const response = await this._fetch('/categories');
    return response.data;
  },

  async getProductsByCategory(category, page = 1, limit = 20) {
    // Using search param to filter by category
    return this.searchProducts('', page, limit, { categories: category });
  },
  
  // 3. ACTIONS
  async addToFavourites(productId) {
    return this._fetch('/user/favorites', {
      method: 'POST',
      body: JSON.stringify({ productId })
    });
  },
  
  async removeFromFavourites(productId) {
    return this._fetch(`/user/favorites/${productId}`, {
      method: 'DELETE'
    });
  },
  
  async clearAllFavourites() {
    return this._fetch('/user/favorites', {
      method: 'DELETE'
    });
  },
  
  async addToCart(productId, quantity = 1) {
    return this._fetch('/cart', {
      method: 'POST',
      body: JSON.stringify({ productId, quantity })
    });
  },
  
  async getCartProducts(page = 1, limit = 20) {
    const params = new URLSearchParams({ page: page.toString(), limit: limit.toString() });
    return this._fetch(`/cart?${params}`);
  },
  
  async updateCartQuantity(productId, quantity) {
    return this._fetch(`/cart/${productId}`, {
      method: 'PATCH',
      body: JSON.stringify({ quantity })
    });
  },
  
  async removeFromCart(productId) {
    return this._fetch(`/cart/${productId}`, {
      method: 'DELETE'
    });
  },
  
  async clearCart() {
    return this._fetch('/cart', {
      method: 'DELETE'
    });
  },
  
  async followSeller(sellerId) {
    const response = await this._fetch('/seller/follow', {
      method: 'POST', 
      body: JSON.stringify(sellerId),
    });
    return response;
  },
  
  /* ---------------- SELLER ACTIONS --------------- */
  async createProduct(productData) {
    return this._fetch('/products', {
      method: 'POST',
      body: JSON.stringify(productData)
    });
  },

  async deleteProduct(productId) {
    return this._fetch(`/products/${productId}`, {
      method: 'DELETE'
    });
  },
  
  async updateProduct(productId, updates) {
    return this._fetch(`/products/${productId}`, {
      method: 'PATCH',
      body: JSON.stringify(updates)
    });
  },

  /* ---------------- UTILITY ---------------- */
  async startSelling(userInfo) {
    return this._fetch('/upgrade', {
      method: 'POST',
      body: JSON.stringify(userInfo)
    });
  },
  
  /*---------- LOAD DATA ----------*/
  /*---------- PING ----------*/
  async ping() {
    const resp = await fetch(`${this.baseURL}/ping`);
    const data = await resp.json();
    return { data }; // This matches your usage: const { data } = await window.API.ping();
  },

  /* ---------- IMAGE UPLOAD ---------- */
  CLOUD_NAME: `dxptlb7rx`,
  get imageURL () {
    return `https://api.cloudinary.com/v1_1/${this.CLOUD_NAME}/image/upload`
  },

  async uploadImage(formData) {
    const response = await fetch(this.imageURL, {
      method: 'POST',
      body: formData
    });
    if (!response.ok) {
      throw new Error('upload failed');
    }
    return await response.json();
  }
  
};

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = API;
}

// Attach to window for global access
if (typeof window !== 'undefined') {
  window.API = API;
}

export default API;
window.API = API;

