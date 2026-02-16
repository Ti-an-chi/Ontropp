// home.js - Home tab functionality
import API from '../api.js';
import { renderProducts } from './shared.js';

export async function initHomeTab() {
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

    // Load seller products if user is seller
    const userData = localStorage.getItem('userData');
    let user = null;
    user = userData ? JSON.parse(userData) : null;
    if (user?.role === 'seller') {
      const resp = await API.getSellerProducts();
      const sellerProducts = resp.products && [];
      renderProducts(sellerProducts, 'seller-products-grid', 'seller');
    }
    
  } catch (error) {
    console.error('Failed to load home content:', error);
    alert('Failed to load home content.');
  }
}

function renderCategories(categories) {
  const categoriesList = document.querySelector('.categories-list');
  if (!categoriesList) return;
  
  categoriesList.innerHTML = '';
  
  categories.forEach(category => {
    const categoryCard = document.createElement('a');
    categoryCard.href = `category-seller.html?category=${category.id}`;
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
    
    /*categoryCard.addEventListener('click', function(e) {
      e.preventDefault();
      
      const event = new CustomEvent('switchTab', { detail: 'tab-explore' });
      document.dispatchEvent(event);
    });
    */
    categoriesList.appendChild(categoryCard);
  });
}
