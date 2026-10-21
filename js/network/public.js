import API from '../../api.js';

export const PublicApi = {
  async _fetch(path, options) {
    try {
      return await API._fetch(`${path}`, options, false, 'user');
    } catch (err) {
      if (err.code === 'SESSION_EXPIRED') {
        this.clearShopTokens();
        location.reload();
      }
    }
  },

  async getTrendingDesigners(category, count = 5) {
    const params = new URLSearchParams({category, count});
    const resp = await API._fetch(`/stats/trending/designers?${params}`);
    if (!resp.success) {
      throw new Error(`failed to get trending designers: ${resp.message}`);
    }
    console.log('trending designers loaded');
    return resp.trending;
  },

  async getTrendingPieces(count = 4, category = null) {
    const params = new URLSearchParams({ count: count ?? 4 });
    if (category != null) params.set('category', category);
    
    const resp = await API._fetch(`/stats/trending/products?${params}`);
    console.log(resp);
    if (!resp.success) {
      throw new Error(`failed to get trending pieces: ${resp.message}`);
    }
    console.log('trending pieces loaded');
    return resp.trending;
  },
}
