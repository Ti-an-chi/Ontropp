// pagination.js – stable, predictable, backend-aligned
import API from '../api.js';
import { renderProducts } from './shared.js';

export class ProductPagination {
  constructor(containerId, type = 'explore') {
    this.containerId = containerId;
    this.type = type;

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

  async loadPage(page = 1) {
    if (this.isLoading) return;

    this.isLoading = true;
    this.currentPage = page;
    this.showLoading(true);

    try {
      console.log('ACTIVE FILTERS:', this.filters);
      const data = await API.getProductsPaginated(
        this.currentPage,
        this.limit,
        this.cleanFilters()
      );
      console.log('ACTIVE FILTERS:', this.filters);

      this.paginationData = data;

      if (!data.products || data.products.length === 0) {
        this.showEmptyState();
        this.hidePagination();
      } else {
        renderProducts(data.products, this.containerId, this.type);
        this.hideEmptyState();
        this.updatePaginationUI();
      }

      this.updateURL();
    } catch (err) {
      console.error('Pagination load failed:', err);
      alert('Failed to load products');
    } finally {
      this.isLoading = false;
      this.showLoading(false);
    }
  }

  /* ================= FILTER API ================= */

  async search(query) {
    this.filters.search = query || undefined;
    this.currentPage = 1;
    await this.loadPage(1);
  }
  

  /*async filterByCategory(category) {
    this.filters.categories = category && category !== 'all' ? [category] : undefined;
    this.currentPage = 1;
    await this.loadPage(1);
  }*/
  
  async filterByCategory(category) {
    this.filters.categories = category && category !== 'all' ? [category] : undefined;
    await this.loadPage(1);
  }

  async filterByPrice(minPrice, maxPrice) {
    this.filters.minPrice =
      minPrice !== undefined && minPrice !== '' ? Number(minPrice) : undefined;
    this.filters.maxPrice =
      maxPrice !== undefined && maxPrice !== '' ? Number(maxPrice) : undefined;
    this.currentPage = 1;
    await this.loadPage(1);
  }

  /* ================= PAGINATION ================= */

  async nextPage() {
    if (this.paginationData?.pagination.hasNextPage) {
      await this.loadPage(this.currentPage + 1);
    }
  }

  async prevPage() {
    if (this.paginationData?.pagination.hasPrevPage) {
      await this.loadPage(this.currentPage - 1);
    }
  }

  async goToPage(page) {
    await this.loadPage(page);
  }

  updatePaginationUI() {
    const el = document.getElementById('pagination-controls');
    if (!el || !this.paginationData) return;

    const { currentPage, hasNextPage, hasPrevPage } =
      this.paginationData.pagination;

    el.innerHTML = `
      <div class="pagination">
        <button data-action="prev" ${!hasPrevPage ? 'disabled' : ''}>
          Previous
        </button>
        <span>Page ${currentPage}</span>
        <button data-action="next" ${!hasNextPage ? 'disabled' : ''}>
          Next
        </button>
      </div>
    `;

    el.onclick = (e) => {
      const btn = e.target.closest('button');
      if (!btn) return;

      if (btn.dataset.action === 'next') this.nextPage();
      if (btn.dataset.action === 'prev') this.prevPage();
    };
  }

  /* ================= URL SYNC ================= */

  async initFromURL() {
    const params = new URLSearchParams(window.location.search);

    this.currentPage = Number(params.get('page')) || 1;

    this.filters.search = params.get('q') || undefined;
    this.filters.categories = params.get('categories') || undefined;

    const min = params.get('minPrice');
    const max = params.get('maxPrice');

    this.filters.minPrice = min ? Number(min) : undefined;
    this.filters.maxPrice = max ? Number(max) : undefined;

    // Sync search input
    const input = document.getElementById('explore-search-input');
    if (input && this.filters.search) {
      input.value = this.filters.search;
    }

    await this.loadPage(this.currentPage);
  }

  updateURL() {
    const params = new URLSearchParams();
    params.set('page', this.currentPage);

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

  showLoading(show) {
    const el = document.getElementById('loading-products');
    if (el) el.style.display = show ? 'block' : 'none';
  }

  showEmptyState() {
    const emptyEl = document.getElementById('empty-products');
    const gridEl = document.getElementById(this.containerId);
    if (emptyEl) emptyEl.style.display = 'flex';
    if (gridEl) gridEl.innerHTML = '';
  }

  hideEmptyState() {
    const el = document.getElementById('empty-products');
    if (el) el.style.display = 'none';
  }

  hidePagination() {
    const el = document.getElementById('pagination-controls');
    if (el) el.innerHTML = '';
  }
}