// home.js - Home tab functionality
import API from '../api.js';
import { renderProducts } from './shared.js';

let seller = null;

export async function initHomeTab(user) {
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
      const resp = await API.getSellerProducts(seller.id);
      const sellerProducts = resp.products || [];
      console.log(sellerProducts)
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
    
    /*categoryCard.addEventListener('click', function(e) {
      e.preventDefault();
      
      const event = new CustomEvent('switchTab', { detail: 'tab-explore' });
      document.dispatchEvent(event);
    });
    */
    categoriesList.appendChild(categoryCard);
  });
}
