import API from '../../api.js';
import { ProductPagination } from '../utility/pagination.js';
import { showNotification } from '../utility/reconfig.js';
import { renderSellerAdminProducts, bindSellerAdminActions } from '../utility/seller-product-admin.js';
import StoreApi from '../storeApi.js';

const PRODUCT_LIMIT = 12;
const pagination = new ProductPagination('seller-products-grid');

const elements = {
  grid: document.getElementById('seller-products-grid'),
  loading: document.getElementById('seller-products-loading'),
  empty: document.getElementById('seller-products-empty'),
  count: document.getElementById('results-count'),
  totalProducts: document.getElementById('total-products-count'),
  currentPage: document.getElementById('current-page-number'),
  totalViews: document.getElementById('total-views-count'),
  activeCount: document.getElementById('active-products-count'),
  searchInput: document.getElementById('search-input'),
  refreshBtn: document.getElementById('refresh-btn'),
};

// ===== SELLER AUTHENTICATION =====
const authElements = {
  overlay: document.getElementById('seller-auth-overlay'),
  form: document.getElementById('seller-auth-form'),
  shopNameInput: document.getElementById('shop-name'),
  passkeyInput: document.getElementById('seller-passkey'),
  submitBtn: document.getElementById('auth-submit-btn'),
  errorMsg: document.getElementById('auth-error'),
  setPasskeyBtn: document.getElementById('set-passkey-btn'),
};

window.addEventListener('DOMContentLoaded', initSellerAuth);

async function initSellerAuth() {
  const authenticated = await checkSellerSession();
  setupAuthForm();
  // setupPasskeyButton();

  if (!authenticated) {
    authElements.overlay?.classList.remove('authenticated');
    return;
  }
  initSellerProductsPage();
}

async function checkSellerSession() {
  const refreshToken = await localStorage.getItem('shop_refresh');
  console.log(refreshToken);
  if (!refreshToken) return false;
  
  const response = await StoreApi.tokenPing();
  if (!response.success) return false;

  authElements.overlay.classList.add('authenticated');
  authElements.overlay.dataset.authenticated = 'true';
  showNotification('Resume session')
  console.log(`✓ Designer authenticated`);

  return true;
}

function setupAuthForm() {
  authElements.form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const shopName = authElements.shopNameInput.value.trim();
    const passkey = authElements.passkeyInput.value.trim();
  
    if (!shopName) {
      showAuthError('Please enter your shop name');
      return;
    }
  
    if (shopName.length < 3) {
      showAuthError('Shop name must be at least 3 characters');
      return;
    }
    try {
      setAuthLoading(true);
      let authenticated = false;
      
      const response = await StoreApi.designerAuth(shopName, passkey);
      if ( !response?.success ) { 
        showNotification( response.message, 'error')
        return;
      }
      
      authenticated = true;
      authElements.overlay.classList.add('authenticated');
      initSellerProductsPage();
      
    } catch (error) {
      console.error('Auth error:', error);
      showNotification(error, 'error');
      // showAuthError('Authentication failed. Please try again.');
    } finally {
      authElements.overlay.dataset.authenticated = authenticated;
      setAuthLoading(false);
    }
  });
}

function showAuthError(message) {
  authElements.errorMsg.textContent = message;
  authElements.errorMsg.style.display = 'block';
  setTimeout(() => {
    authElements.errorMsg.style.display = 'none';
  }, 3000)
}

function setAuthLoading(loading) {
  authElements.submitBtn.disabled = loading;
  authElements.submitBtn.textContent = loading ? 'Verifying...' : 'Access Dashboard';
}

async function initSellerProductsPage() {
  setupPagination();
  setupSearch();
  setupRefresh();
  bindSellerAdminActions('seller-products-grid', {
    onEdit: (id) => navigateToEdit(id),
    onDelete: (id) => confirmDeletion(id),
    onView: () => {},
  });

  await loadSellerProducts();
}

function setupPagination() {
  pagination.limit = PRODUCT_LIMIT;
  pagination.setPageChangeHandler(async () => {
    await loadSellerProducts();
  });
}

function setupSearch() {
  elements.searchInput?.addEventListener('input', debounce(async (event) => {
    const query = event.target.value.trim();
    pagination.search(query);
    await loadSellerProducts();
  }, 400));
}

function setupRefresh() {
  elements.refreshBtn?.addEventListener('click', async () => {
    await loadSellerProducts(true);
  });
}

async function loadSellerProducts(force = false) {
  showLoading(true);
  hideEmptyState();

  try {
    if (!pagination.paginationData || force) {
      await pagination.initFromURL();
    }

    const request = {
      page: pagination.currentPage,
      limit: pagination.limit,
      search: pagination.filters.search || ''
    };

    const response = await StoreApi.getMyProducts(request.page, request.limit, request.search);
    const products = normalizeResponseProducts(response);
    const paginationInfo = response.pagination || response.data?.pagination || getPaginationFallback(request.page, products);

    pagination.paginationData = paginationInfo;
    renderSellerAdminProducts(products, 'seller-products-grid');
    updatePageSummary(products, paginationInfo);
    pagination.updatePaginationUI();

    if (!products.length) {
      showEmptyState();
    }
  } catch (error) {
    console.error('Failed to load seller products:', error);
    showNotification('Unable to load your products. Please try again.', 'error');
    showEmptyState();
  } finally {
    showLoading(false);
  }
}

function normalizeResponseProducts(response) {
  if (!response) return [];

  if (Array.isArray(response)) {
    return response;
  }

  if (Array.isArray(response.products)) {
    return response.products;
  }

  if (Array.isArray(response.data)) {
    return response.data;
  }

  if (Array.isArray(response.data?.products)) {
    return response.data.products;
  }

  return [];
}

function getPaginationFallback(currentPage, products) {
  return {
    currentPage,
    hasNextPage: products.length === PRODUCT_LIMIT,
    hasPrevPage: currentPage > 1,
    totalProducts: products.length
  };
}

function updatePageSummary(products, paginationInfo) {
  if (elements.count) {
    elements.count.textContent = `${paginationInfo.totalProducts || products.length} products`;
  }

  if (elements.totalProducts) {
    elements.totalProducts.textContent = String(paginationInfo.totalProducts || products.length);
  }

  if (elements.currentPage) {
    elements.currentPage.textContent = String(paginationInfo.currentPage || pagination.currentPage);
  }

  if (elements.totalViews) {
    const totalViews = products.reduce((sum, item) => sum + Number(item.views || 0), 0);
    elements.totalViews.textContent = String(totalViews);
  }

  if (elements.activeCount) {
    const activeCount = products.filter(item => item.status === 'Active' || item.is_active).length;
    elements.activeCount.textContent = String(activeCount);
  }
}

function showLoading(show) {
  if (!elements.loading) return;
  elements.loading.style.display = show ? 'flex' : 'none';
}

function showEmptyState() {
  if (elements.empty) {
    elements.empty.style.display = 'flex';
  }
}

function hideEmptyState() {
  if (elements.empty) {
    elements.empty.style.display = 'none';
  }
}

function debounce(fn, delay) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

function navigateToEdit(productId) {
  window.location.href = `upload.html?productId=${productId}`;
}

async function confirmDeletion(productId) {
  const confirmed = window.confirm('Delete this product? This action cannot be undone.');
  if (!confirmed) return;

  try {
    const response = await API.deleteProduct(productId);
    if (response?.success) {
      showNotification('Product deleted successfully', 'success');
      await loadSellerProducts(true);
    } else {
      throw new Error(response?.message || 'Delete failed');
    }
  } catch (error) {
    console.error('Delete failed:', error);
    showNotification('Product deletion failed. Try again.', 'error');
  }
}
