import { showNotification} from './js/utility/reconfig.js';

/*========= API GATEWAY – api.js =========*/
const API = {
  requestCount: 0,
  
  basURL: 'http://localhost:8787',
  basedURL: 'https://ontropp-backend.onrender.com/api',
  baseURL: 'https://ontrop-api.dsub.workers.dev',
  
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
  
  tokenStorage: {
    user: {
        access: 'ontrop_access',
        refresh: 'ontrop_refresh'
    },
    designer: {
        access: 'shop_access',
        refresh: 'shop_refresh'
    }
  },
  
  /*========= API GATEWAY =========*/
  
  /*---------- Core Fetch ----------*/
  async _fetch(path, options = {}, retry = false, tokenType = 'user') {
    this.requestCount++;
  
    console.log(
      `[API REQUEST #${this.requestCount}]`,
      options.method || 'GET',
      path
    );
  
    const url = `${this.baseURL}${path.startsWith('/') ? path : '/' + path}`;
  
    const keys = this.tokenStorage[tokenType];
    console.log(keys.access);
    const token = localStorage.getItem(keys.access);
  
    const headers = {
      ...(options.body !== undefined && {
        'Content-Type': 'application/json'
      }),
      ...(token && {
        Authorization: `Bearer ${token}`
      }),
      ...(options.headers || {})
    };
  
    let resp;
  
    try {
      resp = await fetch(url, {
        ...options,
        headers
      });
    } catch (err) {
      // Network failure
      throw new Error(
        'Unable to connect to the server. Check your internet connection and try again.'
      );
    }
  
    let data = null;
  
    try {
      const text = await resp.text();
      data = text.trim() ? JSON.parse(text) : null;
    } catch {
      console.error('Response was not valid JSON');
    }
  
    if (!resp.ok) {
      const msg =
        data?.message ||
        data?.error ||
        `HTTP ${resp.status}`;
  
      if (
        resp.status === 401 &&
        data?.code === 'INVALID_TOKEN' &&
        !retry
      ) {
        try {
          await this.refresh(tokenType);
          return this._fetch(path, options, true, tokenType);
        } catch {
          this.clearTokens(tokenType);
          window.location.href = 'signup.html';
          throw new Error('Session expired');
        }
      }
  
      throw new Error(msg);
    }
  
    return data;
  },
    
  /** * @param {String} tokenType - Whether user is following */
  async refresh(tokenType = 'user') {
    const keys = this.tokenStorage[tokenType];
  
    const refreshToken = localStorage.getItem(keys.refresh);
  
    if (!refreshToken) {
      throw new Error('No refresh token');
    }
  
    const response = await this._fetch(
      '/auth/refresh',
      {
        method: 'POST',
        body: JSON.stringify({
          token: refreshToken
        })
      },
      true,
      tokenType
    );
  
    if (response.success) {
      localStorage.setItem(keys.access, response.accessToken);
      localStorage.setItem(keys.refresh, response.refreshToken);
    }
  
    return response;
  },
  
  /*---------------------- AUTH ---------------------*/
  
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
  
  async createTestAccount(email, password, username, role = 'buyer') {
    const response = await this._fetch('/auth/directsignup', {
      method: 'POST', 
      body: JSON.stringify({
        email,
        password,
        username,
        role
      })
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

  async dashLogin(email, password) {
    const response = await this._fetch('/login/dashboard', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
    if (response.success) {
      const {bootstrap, ...tokens} = response;
      this.setTokens(tokens);
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
  
  async getUserDash() {
    const resp = await this._fetch('/user/dash');
    return resp.bootstrap;
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

  async getSellerData(sellerId) {
    const response = await this._fetch(`/seller/${sellerId}`);
    return response;
  },
  
  async getSellerProducts(sellerId = undefined, page = 1, limit = 20) {
    const params = new URLSearchParams({ 
      page: page.toString(), 
      limit: limit.toString()
    });
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
    return response;
  },
  
  async getFavourites(page = 1, limit = 20, search = '') {
    const params = new URLSearchParams({ page: page.toString(), limit: limit.toString(), search });
    const resp = window.fav || await this._fetch(`/user/favorites?${params}`);
    
    window.fav = resp.data;
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
  
  async getProductById(productId){
    const response = await this._fetch(`/product/${productId}`, {
      method: 'GET',
    });
    
    return response;
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
      body: JSON.stringify({ quantity }
      )
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
    const response = await this._fetch(`/seller/follow/${sellerId}`, {
      method: 'POST',
    });
    return response;
  },
  
  async unfollowSeller(sellerId) {
    const response = await this._fetch(`/seller/unfollow/${sellerId}`, {
      method: 'DELETE',
    });
    return response;
  }, 
  
  async getFollowedSellers() {
    const response = await this._fetch(`/sellers/following`);
    return response.data;
  },
  
  /* ---------------- SELLER ACTIONS --------------- */
  async createProduct(productData) {
    const response = await this._fetch('/products', {
      method: 'POST',
      body: JSON.stringify(productData)
    });
    return response;
  },

  async deleteProduct(productId= String) {
    return await this._fetch(`/products/${productId}`, {
      method: 'DELETE'
    });
  },
  
  async updateProduct(productId, updates) {
    return await this._fetch(`/products/${productId}`, {
      method: 'PATCH',
      body: JSON.stringify(updates)
    });
  },

  /* ---------------- UTILITY ---------------- */
  async openStore(userInfo) {
    const response = await this._fetch('/brand/launch', {
      method: 'POST',
      body: JSON.stringify(userInfo)
    });
    /*if (response?.success) {
      const {passkey, ...designerData} = userInfo;
      this.storeSellerAccount(designerData);
    }*/
    
    return response;
  },

  _getSellerStore() {
    if (typeof localStorage === 'undefined') return {};
    return JSON.parse(localStorage.getItem('ontrop_seller_accounts') || '{}');
  },

  _saveSellerStore(store) {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem('ontrop_seller_accounts', JSON.stringify(store));
  },  
  /*=============== Store Logic ===============*/
 /* async designerAuth(shopName, passkey) {
    if (!shopName || !passkey ) {
      throw new Error('Shop name and passkey are required');
    }
    const response = API._fetch('/brand/auth', {
      method: 'POST',
      body: JSON.stringify({shopName, passkey})
    });
    
    if (response?.success) {
      this.setShopTokens(response.tokens);
    }
     
    return response;
  }, */

  async storeSellerAccount(account) {
    if (!account || !account.shopName) return null;
    const id = account.shopName.trim().toLowerCase();
    const store = this._getSellerStore();
    const existing = store[id] || {};
    store[id] = {
      ...existing,
      ...account,
      shopName: account.shopName.trim(),
      updatedAt: Date.now()
    };
    this._saveSellerStore(store);
    return store[id];
  },

  async setSellerPasskey({ shopName, passkey }) {
    if (!shopName || !passkey) {
      throw new Error('Shop name and passkey are required');
    }
    const account = await this.designerAuth(shopName) || { shopName };
    account.passkey = passkey;
    return this.storeSellerAccount(account);
  },

  async verifySellerPasskey(shopName, passkey) {
    const account = await this.designerAuth(shopName);
    if (!account) return false;
    if (!account.passkey) return false;
    return account.passkey === passkey;
  },

  /*---------- LOAD DATA ----------*/
  // PING
  async ping() {
    const resp = await fetch(`${this.baseURL}/ping`);
    const data = await resp.json();
    return { data }; // This matches your usage: const { data } = await window.API.ping();
  },
  async tokenPing() {
    const resp = await this._fetch('/tokencheck');
    return resp;
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

// Attach to window for globalaccess
if (typeof window !== 'undefined') {
  window.API = API;
}

export default API;
window.API = API;

