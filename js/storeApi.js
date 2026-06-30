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
    return await API._fetch(`/brand/${path}`, options, false, 'designer');
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
    
    const response = await this._fetch('auth', {
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
    return await this._fetch('tokencheck');
  },
  
  /* =============== products Data =============== */
  async getMyProducts(page, limit, search = '') {
    const params = new URLSearchParams({page, limit, search});
    const response = await this._fetch(`products?${params}`);
    
    console.log(response);
    return response;
  },
  
};

export default StoreApi;