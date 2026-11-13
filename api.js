import { showNotification} from './js/utility/reconfig.js';

const LocationsCacheKey = 'ontropp:locations:v1';
const LocationsTTLMS =  7 * 24 * 60 * 60 * 1000;

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
        access: 'ontrop_token',
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
          if (tokenType === 'designer') {
            const err = new Error('Session expired');
            err.code = 'SESSION_EXPIRED';
            throw err;
          }
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
  
      const urlParams = new URLSearchParams(window.location.search);
      const autoFollow = urlParams.get('autoFollow');
      const autoSave   = urlParams.get('autoSave');
      const autoLike   = urlParams.get('autoLike');
      const nextUrl    = urlParams.get('next') || '/';
  
      // Fire-and-forget: apply pending intent, then redirect regardless of outcome.
      if (autoFollow) this.followDesigner(autoFollow).catch(() => {});
      if (autoSave)   this.addToSaved(autoSave).catch(() => {});
      if (autoLike)   this.likeProduct(autoLike).catch(() => {});
  
      window.location.href = nextUrl;
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
      const urlParams = new URLSearchParams(window.location.search);
      const autoFollowId = urlParams.get('autoFollow');
      const nextUrl = urlParams.get('next') || '/';
      
      if (autoFollowId) {
        API.followDesigner(autoFollowId).catch(() => {}); 
      }
      
      window.location.href = nextUrl;
    }
    return response;
  },

  isAuthenticated(tokenType = 'user') {
    const keys = this.tokenStorage[tokenType];
    return !!localStorage.getItem(keys.access);
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

    sessionStorage.setItem('ontrop_user', JSON.stringify(response.data));
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

  async getDesignerData(designerId) {
    const response = await this._fetch(`/seller/${designerId}`);
    return response.designer;
  },
  
  async getStudioPieces(studioId, page = 1, limit = 12) {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString()
    });
    const response = await this._fetch(`/products/studio/${studioId}?${params}`);
    return response.pieces || [];
  },
  
  /* ---------------- PRODUCT DATA --------------- */
  // 1. PRODUCTS
  /**
 * Fetch a page of explore pieces.
 *
 * @param {number} page   — 1-indexed. Always sent.
 * @param {number} limit  — page size. Always sent.
 * @param {object} filters
 * @param {string}   [filters.search='']       — free text, empty = no constraint
 * @param {string}   [filters.category='all']  — 'all' = no constraint, else one of
 *                                                textiles|tailoring|jewellery|objects|beauty|print
 * @param {boolean}  [filters.following=false] — signed-in only; server derives the
 *                                                follows set from the session, we just
 *                                                pass the flag. Ignored server-side if
 *                                                there's no authenticated user.
 * @param {string}   [filters.order]           — 'newest' | 'oldest'. Omit = server default.
 *                                                Forwarded as-is so the backend stays the
 *                                                source of truth for sort semantics.
 *
 * @returns {Promise<{ success: boolean, products: any[], pagination: object }>}
 *          Passed through unchanged from the backend so other callers keep context.
 */
async getPiecesPaginated(page = 1, limit = 20, filters = {}) {
  const { search = '', categories = 'all', following = false, order } = filters;

  const params = new URLSearchParams();
  params.set('page',  String(page));
  params.set('limit', String(limit));

  if (search)                          params.set('search', search);
  if (categories && categories !== 'all')  params.set('categories', categories);
  if (following)                       params.set('followingOnly', 'true');
  if (order)                           params.set('order', order);

  const resp = await this._fetch(`/products?${params}`);

  if (!resp?.success) {
    throw new Error(resp?.message || 'Unable to load pieces');
  }

  // Pass through the whole envelope — products + pagination + anything else.
  // Other routes consume .products and .pagination; do not flatten to resp.data.
  return resp;
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

  async getSaved(page = 1, limit = 20, search = '') {
    const params = new URLSearchParams({ page: page.toString(), limit: limit.toString(), search });
    const resp = await this._fetch(`/user/saved?${params}`);

    return resp.data;
  },

// 1. HARD CODED CATEGORIES
_hardcodedCategories(type = 'products') {
  const IMG = (id, w = 800) =>
    `https://images.unsplash.com/${id}?w=${w}&q=70&auto=format&fit=crop`;

  const categories = {
    designers: [
      { id: 'textiles', name: 'Textiles', icon: 'scroll', image_url: IMG('photo-1490481651871-ab68de25d43d'), type: 'designers' },
      { id: 'tailoring', name: 'Tailoring & Fashion', icon: 'cut', image_url: IMG('photo-1516257984-b1b4d707412e'), type: 'designers' },
      { id: 'jewellery', name: 'Jewellery & Accessories', icon: 'gem', image_url: IMG('photo-1523170335258-f5ed11844a49'), type: 'designers' },
      { id: 'designer_bags', name: 'Bags & Leatherwork', icon: 'shopping-bag', image_url: IMG('photo-1548036328-c9fa89d128fa'), type: 'designers' },
      { id: 'beauty', name: 'Beauty & Personal Care', icon: 'spa', image_url: IMG('photo-1522335789203-aabd1fc54bc9'), type: 'designers' },
      { id: 'objects', name: 'Art & Crafts', icon: 'shapes', image_url: IMG('photo-1567016432779-094069958ea5'), type: 'designers' },
      { id: 'print', name: 'Print & Graphics', icon: 'stamp', image_url: IMG('photo-1606760227091-3dd870d97f1d'), type: 'designers' },
      { id: 'designer_footwear', name: 'Footwear Design', icon: 'footprints', image_url: IMG('photo-1543163521-1bf539c55dd2'), type: 'designers' }
    ],

    products: [
      { id: 'product_clothing', name: 'Clothing', icon: 'shirt', image_url: IMG('photo-1483985988355-763728e1935b'), type: 'products' },
      { id: 'product_bags', name: 'Bags', icon: 'shopping-bag', image_url: IMG('photo-1548036328-c9fa89d128fa'), type: 'products' },
      { id: 'product_footwear', name: 'Footwear', icon: 'footprints', image_url: IMG('photo-1543163521-1bf539c55dd2'), type: 'products' },
      { id: 'product_jewellery', name: 'Jewellery', icon: 'gem', image_url: IMG('photo-1515562141207-7a88fb7ce338'), type: 'products' },
      { id: 'product_accessories', name: 'Accessories', icon: 'glasses', image_url: IMG('photo-1511499767150-a48a237f0083'), type: 'products' },
      { id: 'product_beauty', name: 'Beauty & Skincare', icon: 'sparkles', image_url: IMG('photo-1522335789203-aabd1fc54bc9'), type: 'products' },
      { id: 'product_textiles', name: 'Fabrics & Textiles', icon: 'scroll', image_url: IMG('photo-1490481651871-ab68de25d43d'), type: 'products' },
      { id: 'product_home_decor', name: 'Home & Decor', icon: 'lamp', image_url: IMG('photo-1600210492486-724fe5c67fb0'), type: 'products' },
      { id: 'product_art', name: 'Art & Crafts', icon: 'palette', image_url: IMG('photo-1579783902614-a3fb3927b6a5'), type: 'products' },
      { id: 'product_prints', name: 'Prints & Artwork', icon: 'image', image_url: IMG('photo-1541961017774-22349e4a1262'), type: 'products' }
    ]
  };

  return categories[type] || [];
},

// 2. GET CATEGORIES
async getCategories(type = 'products', count) {
  const validTypes = ['products', 'designers'];

  if (!validTypes.includes(type)) {
    return [];
  }

  const cacheKey = `ontrop_categories_v2_${type}`;
  let data;

  // Cache check
  const cached = sessionStorage.getItem(cacheKey);

  if (cached) {
    try {
      const parsed = JSON.parse(cached);

      if (Date.now() < parsed.expires_at) {
        data = parsed.data;
      } else {
        sessionStorage.removeItem(cacheKey);
      }
    } catch {
      sessionStorage.removeItem(cacheKey);
    }
  }

  // Hardcoded source
  if (!data) {
    data = this._hardcodedCategories(type);

    sessionStorage.setItem(
      cacheKey,
      JSON.stringify({
        data,
        expires_at: Date.now() + 15 * 60 * 1000
      })
    );
  }

  // Optional count limit
  if (Number.isInteger(count) && count >= 0) {
    return data.slice(0, count);
  }

  return data;
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
  // ---- saved (fixed: was /user/favorites) ----
  async addToSaved(productId) {
    return this._fetch(`/user/saved`, {
      method: 'POST',
      body: JSON.stringify({ productId })
    });
  },
  
  async removeFromSaved(productId) {
    return this._fetch(`/user/saved/${productId}`, { method: 'DELETE' });
  },
  
  async clearAllSaved() {
    return this._fetch('/user/saved', { method: 'DELETE' });
  },
  
  // ---- liked (new) ----
  async getLiked(page = 1, limit = 20, search = '') {
    const params = new URLSearchParams({
      page: page.toString(), limit: limit.toString(), search
    });
    const resp = await this._fetch(`/user/liked?${params}`);
    return resp.data;
  },
  
  async likeProduct(productId) {
    return this._fetch(`/user/liked`, {
      method: 'POST',
      body: JSON.stringify({ productId })
    });
  },
  
  async unlikeProduct(productId) {
    return this._fetch(`/user/liked/${productId}`, { method: 'DELETE' });
  },
  
  async clearAllLiked() {
    return this._fetch('/user/liked', { method: 'DELETE' });
  },
  
  async followDesigner(designerId) {
    const response = await this._fetch(`/designer/follow/${designerId}`, {
      method: 'POST',
    });
    return response;
  },
  
  async unfollowDesigner(designerId) {
    const response = await this._fetch(`/designer/unfollow/${designerId}`, {
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

	/* ============== Location logic ============== */
	// Add these inside the `const API = { ... }` object:

	_readLocationsCache() {
		try {
			const raw = localStorage.getItem(LocationsCacheKey);
			if (!raw) return null;
			const parsed = JSON.parse(raw);
			if (Date.now() - parsed.ts > LocationsTTLMS) {
				localStorage.removeItem(LocationsCacheKey);
				return null;
			}
			return parsed;
		} catch {
			return null;
		}
	},

	_writeLocationsCache(payload) {
	  try {
	    localStorage.setItem(
	      LocationsCacheKey,
	      JSON.stringify({ ...payload, ts: Date.now() })
	    );
	  } catch (e) {
	    console.warn('Locations cache write failed', e);
	  }
	},

	async getStates() {
	  const cache = this._readLocationsCache();
	  if (cache?.states) return cache.states;
	
	  // Fetch from your Cloudflare Worker backend
	  const response = await this._fetch('/locations/states');
	  const data = response.data || response; // Fallback depending on worker response shape
	
	  this._writeLocationsCache({ ...cache, states: data });
	  return data; // [{ id: 'NG001', name: 'Abia' }, ...]
	},

	async getCities(stateId) {
	  const cache = this._readLocationsCache();
	  if (cache?.cities?.[stateId]) return cache.cities[stateId];
	
	  // Fetch from your Cloudflare Worker backend
	  const response = await this._fetch(`/locations/cities/${stateId}`);
	  const data = response.data || response;
	
	  const cities = { ...(cache?.cities || {}), [stateId]: data };
	  this._writeLocationsCache({ ...cache, cities });
	  return data; // [{ id: 'NG001001', name: 'Aba North' }, ...]
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

