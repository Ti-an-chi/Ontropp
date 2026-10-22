import API from '../../api.js';

export const PublicApi = {
  async getTrendingDesigners(count = 5, category = null) {
    const params = new URLSearchParams({ count: count ?? 4 });
    if (category != null) params.set('category', category);
    
    const resp = await API._fetch(`/stats/trending/designers?${params}`);
    if (!resp.success) {
      throw new Error(`failed to get trending designers: ${resp.message}`);
    }
    return resp.trending;
  },

  async getTrendingPieces(count = 4, category = null) {
    const params = new URLSearchParams({ count: count ?? 4 });
    if (category != null) params.set('category', category);
    
    const resp = await API._fetch(`/stats/trending/products?${params}`);
    if (!resp.success) {
      throw new Error(`failed to get trending pieces: ${resp.message}`);
    }
    return resp.trending;
  },

  /*async getFreshArrivals(limit = 10) {
    const params = new URLSearchParams({count: count ?? 4});

    const resp = await API.getProductsPaginated()
  },*/

  async getFeaturedStudios(count = 6) {
    const params = new URLSearchParams({ count: count ?? 6});

    const resp = await API._fetch(`/studios/featured?${params}`);
    if (!resp.success) {
      throw new Error(`failed to get featured studios: ${resp.message}`);
     }
    return resp.featured;
  }
}
