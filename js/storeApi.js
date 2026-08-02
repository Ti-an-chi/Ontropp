import API from '../api.js';

const StoreApi = {
  setShopTokens({ accessToken, refreshToken }) {
    localStorage.setItem('shop_access', accessToken);
    localStorage.setItem('shop_refresh', refreshToken);
  },
  
  clearShopTokens() {
    localStorage.removeItem('shop_access');
    localStorage.removeItem('shop_refresh');
  },
  
  async _fetch(path, options) {
    try {
      return await API._fetch(`${path}`, options, false, 'designer');
    } catch (err) {
      if (err.code === 'SESSION_EXPIRED') {
        this.clearShopTokens();
        location.reload();
      }
    }
  },
  
  /* =============== Auth =============== */
  async refresh(){
    return await API.refresh('designer');
  },
  
  async openStore(userInfo) {
    const response = await API._fetch('/brand/launch', {
      method: 'POST',
      body: JSON.stringify(userInfo)
    });
    /*if (response?.success) {
      const {passkey, ...designerData} = userInfo;
      this.storeSellerAccount(designerData);
    }*/
    
    return response;
  },
  
  async designerAuth(shopName, passkey) {
    if (!shopName || !passkey ) {
      throw new Error('Shop name and passkey are required');
    }
    
    const response = await this._fetch('/brand/auth', {
      method: 'POST',
      body: JSON.stringify({shopName, passkey})
    });
    
    if (response?.success) {
      console.log(response.tokens);
      this.setShopTokens(response.tokens);
    }
     
    return response;
  },
  
  async tokenPing() {
    return await this._fetch('/brand/tokencheck');
  },
  
  /* =============== dashboard Data =============== */
  async getDesignerProfile() {
    const resp = await this._fetch('/brand/profile');
    if (!resp.success) {
      throw new Error('failed to load your data, please try again');
    }

    console.log(`${resp.seller.shop_name} profile loaded`);
    return resp.seller;
  },
  
  async getBestSellingProduct(count = 1) {
    const resp = await this._fetch(
      `/brand/stats/bestselling?count=${count}`
    );
    console.log(`best selling product loaded`);
    if (!resp.success) {
      throw new Error(`failed to get best selling: ${resp.message}`);
    }
    return resp.data[0];
  },

  async getDesignerStats() {
    const resp = await this._fetch('/brand/stats');
    console.log(`stats loaded for bar chart`);
    if (!resp.success) {
      throw new Error(`failed to get stats: ${resp.message}`);
    }

    console.log('stats loaded');
    return resp.stats;
  },

  async getWeeklyActivity() {
    const resp = await this._fetch('/brand/stats/weekly');
    if (!resp.success) {
      throw new Error(`failed to get weekly activity: ${resp.message}`);
    }

    const weeklyData = resp.stats.map((row, index, arr) => ({
      week: index === arr.length - 1 ? 'This' : 
          index === arr.length - 2 ? 'Last' : 
          `${arr.length - index - 1}w Ago`,
      score: row.total_score,
    }));
    console.log(`weekly activity loaded`);

    return weeklyData;
  },

  async getQuickInsights() {
    return [
      { type: 'trend', icon: 'arrow-trend-up', color: 'green', title: 'Top Mover', message: '"Abstract Geo Tee" views up 34% today' },
      { type: 'growth', icon: 'bolt', color: 'amber', title: 'Fastest Growing', message: '"Minimalist Hoodie" gaining 12 saves/hour' },
      { type: 'tip', icon: 'lightbulb', color: 'blue', title: 'Visibility Tip', message: 'Add 2 more images to boost search ranking' },
      { type: 'action', icon: 'envelope', color: 'rose', title: 'Action Needed', message: '2 unread customer messages waiting' }
    ];
  },

  async getTrendingDesigners(category, count = 5) {
    const params = new URLSearchParams({category, count});
    const resp = await this._fetch(`/stats/trending/designers?${params}`);
    if (!resp.success) {
      throw new Error(`failed to get trending designers: ${resp.message}`);
    }
    console.log('trending designers loaded');
    return resp.trending;
  },

  async getTrendingProducts(category, count = 4) {
    const params = new URLSearchParams({category, count});
    const resp = await this._fetch(`/stats/trending/products?${params}`);
    if (!resp.success) {
      throw new Error(`failed to get trending products: ${resp.message}`);
    }
    console.log('trending products loaded');
    return resp.trending;
  },

  async getDesignerDashboard() {
    return await this._fetch('/brand/dashboard');
  },
  
  /* =============== products Data =============== */
  async getMyProducts(page, limit, search = '') {
    const params = new URLSearchParams({page, limit, search});
    const response = await this._fetch(`/brand/products?${params}`);
    
    console.log(response);
    return response;
  },
  
};

export default StoreApi;