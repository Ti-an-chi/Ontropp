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
      throw new Error('failed to lod your data, please try again');
    }
    return resp.seller;
  },
  
  async getBestSellingProduct(count = 1) {
    const resp = await this._fetch(
      `/brand/stats/bestselling?count=${count}`
    );
    console.log(resp);
    if (!resp.success) {
      throw new Error(`failed to get best selling: ${resp.message}`);
    }
    return resp.data[0];
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