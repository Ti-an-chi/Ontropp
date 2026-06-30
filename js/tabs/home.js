// home.js - Home tab functionality
import API from '../../api.js';
import { renderProducts } from '../utility/shared.js';
import { updateElement, changeDisplay } from '../utility/reconfig.js';
import { ProductPagination } from '../utility/pagination.js';

let seller = null;
let userData = null;
let sellerPagination = null;

export async function initHomeTab() {
  window.bootstrap = await JSON.parse(sessionStorage.getItem('bootstrap')) || await loadUserData();
  
  sessionStorage.removeItem('bootstrap');
  
  userData = window.bootstrap?.userData;
  console.log('User data loaded:', userData);
  
  await updateUserUI();
  await loadDashItems();
}

async function updateUserUI() {
  updateElement('user-name', userData.username);
  updateElement('user-email', userData.email);
  updateElement('user-avatar-img', userData.avatar_url, 'src');

  if (userData.role !== 'seller') {
    updateBuyerStats();
  } else {
    updateSellerDashboard();
  }
}

async function loadUserData() {
  try {
    window.bootstrap = await API.getUserDash();
    
    return window.bootstrap;
  } catch (error) {
    console.error(`Failed to load user data:  ${error}`);
    // Default user data as fallback
    return { userData: {
      username: 'User',
      email: 'user@example.com',
      isSeller: false,
      role: 'buyer'
    }};
  }
}

export async function loadDashItems() {
  try {
    // Load categories
    const categories = window.bootstrap.categories || await API.getCategories();
    renderCategories(categories);
    
    // Load recommended products
    const products = window.bootstrap.recommended || await API.getRecommendedProducts(1, 8);
    console.log(products.data);
    renderProducts(products.data, 'recommended-list', 'recommended');
    
    // Update empty state
    const emptyRecEl = document.getElementById('empty-recommendations');
    if (emptyRecEl) {
      emptyRecEl.style.display = products.length === 0 ? 'block' : 'none';
    }
    
  } catch (error) {
    console.error('Failed to load home content:', error);
    // alert('Failed to load home content.');
  }
}

function updateBuyerStats() {
  updateElement('orders-count', userData.ordersCount || 0);
  updateElement('followings-count', userData.followingsCount || 0);
  updateElement('favorites-count', userData.favoritesCount || 0);
}

async function updateSellerDashboard() {
  if (!userData || !userData.sellerProfile) {
    console.error('User data or seller profile missing');
    return;
  }
  try {
    seller = userData.sellerProfile;
    console.log('Designer profile:', seller);

    updateElement('seller-profile-views', seller.profile_views || 0);
    updateElement('followers', seller.follows[0]?.count || 0);
      
    updateElement('profile-views', seller.profile_views || 0);
      
    // update seller info
    changeDisplay('seller-board', 'block');

    // header info (logo, shop name, rating)
    const logoEl = document.getElementById('seller-logo');
    const nameEl = document.getElementById('seller-shop-name');
    const ratingEl = document.getElementById('seller-rating');
    if (logoEl) logoEl.src = seller.logo_url || '';
    if (nameEl) nameEl.textContent = seller.shop_name || 'Your Shop';
    if (ratingEl) ratingEl.textContent = `★ ${seller.rating || 0}`;

    // setup pagination for seller products
    if (!sellerPagination) {
      sellerPagination = new ProductPagination('seller-products-grid');
      sellerPagination.limit = 8;
      sellerPagination.setPageChangeHandler(async () => {
        await loadSellerProductsSellerBoard();
      });
    }

    await loadSellerProductsSellerBoard();
    // Hide become seller button
    changeDisplay('setup-seller-btn', 'none');
  } catch (error) {
    console.error('Error updating seller dashboard:', error);
  }
}

async function loadSellerProductsSellerBoard(force = false) {
  const loadingEl = document.getElementById('loading-seller-products');
  if (loadingEl) loadingEl.style.display = 'flex';

  try {
    if (!sellerPagination.paginationData || force) {
      await sellerPagination.initFromURL();
    }

    const request = {
      page: sellerPagination.currentPage,
      limit: sellerPagination.limit,
      search: sellerPagination.filters.search || ''
    };

    const resp = await API.getSellerProducts(seller.id, request.page, request.limit);
    const products = normalizeResponseProducts(resp);
    const paginationInfo = resp.pagination || resp.data?.pagination || getPaginationFallback(request.page, products);

    sellerPagination.paginationData = paginationInfo;
    renderProducts(products, 'seller-products-grid', 'seller');
    sellerPagination.updatePaginationUI();
  } catch (error) {
    console.error('Failed to load seller products:', error);
  } finally {
    if (loadingEl) loadingEl.style.display = 'none';
  }
}

function normalizeResponseProducts(response) {
  if (!response) return [];
  if (Array.isArray(response)) return response;
  if (Array.isArray(response.products)) return response.products;
  if (Array.isArray(response.data)) return response.data;
  if (Array.isArray(response.data?.products)) return response.data.products;
  return [];
}

function getPaginationFallback(currentPage, products) {
  return {
    currentPage,
    hasNextPage: products.length === sellerPagination.limit,
    hasPrevPage: currentPage > 1,
    totalProducts: products.length
  };
}

function renderCategories(categories) {
  const categoriesList = document.querySelector('.categories-list');
  if (!categoriesList) return;
  
  categoriesList.innerHTML = '';
  
  categories.forEach(category => {
    const categoryCard = document.createElement('a');
    categoryCard.href = `designers.html?category=${category.id}`;
    categoryCard.className = 'category-card';
    categoryCard.dataset.category = category.id;
    
    categoryCard.innerHTML = `
      <div class="category-info">
        <div class="category-icon">
          <i class="fas fa-${category.icon || 'box'}"></i>
        </div>
        <div class="category-details">
          <h3 class="category-title">${category.name}</h3>
          <p class="category-count">${category.sellerCount} designers</p>
        </div>
      </div>
      <div class="category-arrow">
        <i class="fas fa-chevron-right"></i>
      </div>
    `;
    
    categoriesList.appendChild(categoryCard);
  });
}
