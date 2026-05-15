// pagination.js – stable, predictable, backend-aligned 
import API from '../../api.js';
import { renderProducts } from './shared.js';

export class ProductPagination {
  constructor(containerId) {
    this.containerId = containerId;
    this.container = document.getElementById(containerId);

    this.currentPage = 1;
    this.limit = 20;
    this.isLoading = false;

    // SINGLE source of truth for filters
    this.filters = {
      search: undefined,
      categories: undefined,
      minPrice: undefined,
      maxPrice: undefined
    };

    this.paginationData = null;
  }

  /* ================= CORE ================= */

  async buildPage(page = 1) {
    if (this.isLoading) return;

    // this.isLoading = true;
    this.currentPage = page;
    // this.showLoading(true);
    this.updateURL();
    
    return {
      currentPage: this.currentPage,
      limit: this.limit,
      filters: this.cleanFilters()
    };
  }

  /* ================= FILTER API ================= */

  async search(query) {
    this.filters.search = query || undefined;
    this.currentPage = 1;
    return await this.buildPage(this.currentPage);
  }
  

  /*async filterByCategory(category) {
    this.filters.categories = category && category !== 'all' ? [category] : undefined;
    this.currentPage = 1;
    return await this.buildPage(1);
  }*/
  
  async filterByCategory(category) {
    this.filters.categories = category && category !== 'all' ? [category] : undefined;
    return await this.buildPage(1);
  }

  async filterByPrice(minPrice, maxPrice) {
    this.filters.minPrice =
      minPrice !== undefined && minPrice !== '' ? Number(minPrice) : undefined;
    this.filters.maxPrice =
      maxPrice !== undefined && maxPrice !== '' ? Number(maxPrice) : undefined;
    this.currentPage = 1;
    return await this.buildPage(1);
  }

  /* ================= PAGINATION ================= */

  async nextPage() {
    if (this.paginationData?.pagination.hasNextPage) {
      return await this.buildPage(this.currentPage + 1);
    }
  }

  async prevPage() {
    if (this.paginationData?.pagination.hasPrevPage) {
      return await this.buildPage(this.currentPage - 1);
    }
  }

  async goToPage(page) {
    return await this.buildPage(page);
  }

  
  updatePaginationUI() {
    const el = document.getElementById('pagination-controls');
    if (!el || !this.paginationData) return;

    const { currentPage, hasNextPage, hasPrevPage } =
      this.paginationData;

    el.innerHTML = `
      <div class="pagination">
        <button class="pagination-btn ${!hasPrevPage ? 'disabled' : ''}" data-action="prev">
          Previous
        </button>
        <span>Page ${currentPage}</span>
        <button class="pagination-btn ${!hasNextPage ? 'disabled' : ''}" data-action="next">
          Next
        </button>
      </div>
    `;

    el.onclick = (e) => {
      const btn = e.target.closest('button');
      if (!btn || btn.classList.contains('disabled')) return;

      if (btn.dataset.action === 'next') this.nextPage();
      if (btn.dataset.action === 'prev') this.prevPage();
    };
  }

  /* ================= URL SYNC ================= */

  async initFromURL() {
    const params = new URLSearchParams(window.location.search);

    this.currentPage = Number(params.get('page')) || 1;
    this.filters.search = params.get('q') || undefined;

    const cats = params.get('categories'); 
    this.filters.categories = cats ? cats.split(',') : undefined;

    const min = params.get('minPrice');
    const max = params.get('maxPrice');

    this.filters.minPrice = min ? Number(min) : undefined;
    this.filters.maxPrice = max ? Number(max) : undefined;

    // Sync search input
    const input = this.container.querySelector('#search-input');
    if (input && this.filters.search) {
      input.value = this.filters.search;
    }

    return await this.buildPage(this.currentPage);
  }

  updateURL() {
    const params = new URLSearchParams();
    params.set('page', String(this.currentPage));

    if (this.filters.search) params.set('q', this.filters.search);
    if (this.filters.categories) params.set('categories', this.filters.categories.join(','));
    if (this.filters.minPrice !== undefined)
      params.set('minPrice', this.filters.minPrice);
    if (this.filters.maxPrice !== undefined)
      params.set('maxPrice', this.filters.maxPrice);

    window.history.replaceState(
      {},
      '',
      `${window.location.pathname}?${params.toString()}`
    );
  }

  /* ================= HELPERS ================= */

  cleanFilters() {
    return Object.fromEntries(
      Object.entries(this.filters).filter(
        ([_, v]) => v !== undefined && v !== null && v !== ''
      )
    );
  }

  /*showLoading(show) {
    const el = this.container.querySelector('#loading-state');
    if (el) el.style.display = show ? 'block' : 'none';
  }*/

  /*showEmptyState() {
    const emptyEl = document.getElementById('empty-products');
    const gridEl = document.getElementById(this.containerId);
    if (emptyEl) emptyEl.style.display = 'flex';
    if (gridEl) gridEl.innerHTML = '';
  }

  hideEmptyState() {
    const el = document.getElementById('empty-products');
    if (el) el.style.display = 'none';
  }*/

  hidePagination() {
    const el = document.getElementById('pagination-controls');
    if (el) el.innerHTML = '';
  }
}
