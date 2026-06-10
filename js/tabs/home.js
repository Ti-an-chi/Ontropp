// home.js - Home tab functionality
import API from '../../api.js';
import { renderProducts } from '../utility/shared.js';
import { updateElement, changeDisplay } from '../utility/reconfig.js';

let seller = null;
let userData = null;

export async function initHomeTab() {
  window.bootstrap = await JSON.parse(sessionStorage.getItem('bootstrap')) || await loadUserData();
  
  sessionStorage.removeItem('bootstrap');
  
  userData = window.bootstrap?.userData;
  
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
    
    console.log(window.bootstrap.userData);
    
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
  updateElement('seller-profole-views', userData.profileViews || 0);
  
  updateElement('total-orders', userData.sellerOrders || 0);
  
  // update seller info
  changeDisplay('seller-board', 'block');
    seller = userData.sellerProfile;
    if (userData?.role === 'seller') {
      const resp = await API.getSellerProducts(seller.id, 1, 8);
      const sellerProducts = resp.products || [];
      // console.warn(sellerProducts);
      renderProducts(sellerProducts, 'seller-products-grid', 'seller');
    }
  // Hide become seller button
  changeDisplay('become-seller-btn', 'none');
}

function renderCategories(categories) {
  const categoriesList = document.querySelector('.categories-list');
  if (!categoriesList) return;
  
  categoriesList.innerHTML = '';
  
  categories.forEach(category => {
    const categoryCard = document.createElement('a');
    categoryCard.href = `sellers.html?category=${category.id}`;
    categoryCard.className = 'category-card';
    categoryCard.dataset.category = category.id;
    
    categoryCard.innerHTML = `
      <div class="category-info">
        <div class="category-icon">
          <i class="fas fa-${category.icon || 'box'}"></i>
        </div>
        <div class="category-details">
          <h3 class="category-title">${category.name}</h3>
          <p class="category-count">${category.sellerCount} sellers</p>
        </div>
      </div>
      <div class="category-arrow">
        <i class="fas fa-chevron-right"></i>
      </div>
    `;
    
    categoriesList.appendChild(categoryCard);
  });
}
