// home.js - Home tab functionality
import API from '../../api.js';
import { renderProducts } from '../utility/shared.js';
import { updateElement, changeDisplay } from '../reconfig.js';

let seller = null;

export async function initHomeTab(user) {
  await updateUserUI(user);
  loadCategories();
}

function updateUserUI(userData) {
  updateElement('user-name', userData.username);
  updateElement('user-email', userData.email);
  updateElement('user-avatar-img', userData.avatar_url, 'src');

  if (userData.role !== 'seller') {
    updateBuyerStats(userData);
  } else {
    updateSellerDashboard();
  }
}

export async function loadCategories(user) {
  try {
    // Load categories
    const categories = await API.getCategories();
    renderCategories(categories);
    
    // Load recommended products
    const products = await API.getRecommendedProducts(1, 8);
    renderProducts(products, 'recommended-list', 'recommended');
    
    // Update empty state
    const emptyRecEl = document.getElementById('empty-recommendations');
    if (emptyRecEl) {
      emptyRecEl.style.display = products.length === 0 ? 'block' : 'none';
    }
    
    seller = user.sellerProfile;
    if (user?.role === 'seller') {
      const resp = await API.getSellerProducts(seller.id, 1, 8);
      const sellerProducts = resp.products || [];
      // console.log(sellerProducts)
      renderProducts(sellerProducts, 'seller-products-grid', 'seller');
    }
    
  } catch (error) {
    console.error('Failed to load home content:', error);
    // alert('Failed to load home content.');
  }
}

function updateBuyerStats(userData) {
  updateElement('orders-count', userData.ordersCount || 0);
  updateElement('followings-count', userData.followingsCount || 0);
  updateElement('favorites-count', userData.favoritesCount || 0);
}

function updateSellerDashboard(userData) {
  changeDisplay('seller-board', 'block');
  // Update seller stats
  updateElement('seller-profole-views', userData.profileViews || 0);
  updateElement('total-orders', userData.sellerOrders || 0);
  
  // Show seller profile link in profile tab
  changeDisplay('seller-profile-link', 'block');
  
  const base = window.location.origin;
  const link = `${base}/portfolio.html?id=${userData.sellerProfile.id}`;
  updateElement('profile-link-btn', link, 'href');
    
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
