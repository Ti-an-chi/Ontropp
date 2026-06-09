import API from '../../api.js';
import { viewSellerProfile, FollowButtonManager } from '../utility/reconfig.js';

// Get category from URL
const urlParams = new URLSearchParams(window.location.search);
const categoryId = urlParams.get('category');

// Category mapping 
async function getCategories() {
  return await API.getCategories()/* || [
      { id: 'electronics', name: 'Electronics', icon: 'mobile-alt', description: 'Tech gadgets and devices' },
      { id: 'clothing', name: 'Clothing', icon: 'tshirt', description: 'Fashion and apparel' },
      { id: 'home', name: 'Home & Garden', icon: 'home', description: 'Home decor and garden items' },
      { id: 'beauty', name: 'Beauty', icon: 'spa', description: 'Cosmetics and personal care' },
      { id: 'other', name: 'Other', icon: 'box', description: 'Various products' }
    ]*/;
}

// Initialize page
document.addEventListener('DOMContentLoaded', function() {
  initPage();
});

async function initPage() {
  const categoryInfo = await getCategories();
  // update header with category info
  const category = categoryInfo.find(cat => cat.id === categoryId) || categoryInfo[4];
  document.getElementById('categoryTitle').textContent = category.name;
  document.getElementById('categoryDescription').textContent = category.description;
      
  await loadSellers();
}

async function loadSellers() {
  const sellersGrid = document.getElementById('sellersGrid');
  const loadingEl = document.getElementById('loadingSellers');
  const emptyEl = document.getElementById('noSellers');
  
  if (!sellersGrid) return;
  
  try {
    // Show loading
    sellersGrid.innerHTML = '';
    loadingEl.style.display = 'block';
    emptyEl.style.display = 'none';
    
    const sellers = await API.getSellers(categoryId);
    
    // Hide loading
    loadingEl.style.display = 'none';
    
    if (sellers.length === 0) {
      emptyEl.style.display = 'block';
      return;
    }
    
    // Render sellers
    renderSellers(sellers);
    
  } catch (error) {
    console.error('Failed to load sellers:', error);
    loadingEl.style.display = 'none';
    emptyEl.innerHTML = '<i class="fas fa-exclamation-circle"></i><h3>Failed to load sellers</h3><p>Please try again later</p>';
    emptyEl.style.display = 'block';
  }
}

function renderSellers(sellers) {
  const sellersGrid = document.getElementById('sellersGrid');
  if (!sellersGrid) return;
  
  sellersGrid.innerHTML = '';
  
  sellers.forEach(seller => {
    const sellerCard = document.createElement('div');
    sellerCard.className = 'seller-card';
    sellerCard.dataset.sellerId = seller.id;
    
    sellerCard.innerHTML = `
      <div class="seller-header">
        <div class="seller-avatar">
          ${seller.logo_url ?
            `<img src="${seller.logo_url}" alt="${seller.shop_name}">` :
           `<i class="fas fa-store"></i>`
          }
        </div>
        <div class="seller-info">
          <div class="seller-name">${seller.shop_name}</div>
          <div class="seller-rating">
            <i class="fas fa-star"></i>
            ${seller.rating || 5.0} (0 reviews)
          </div>
        </div>
      </div>
      
      <div class="seller-stats">
        <div class="stat-item">
          <span class="stat-value">0</span>
          <span class="stat-label">Products</span>
        </div>
        <div class="stat-item">
          <span class="stat-value">0</span>
          <span class="stat-label">Followers</span>
        </div>
        <div class="stat-item">
          <span class="stat-value">${seller.total_orders || 0}</span>
          <span class="stat-label">Orders</span>
        </div>
      </div>
      
      <div class="seller-bio">
        ${seller.bio || "No bio available"}
      </div>
      
      <div class="seller-actions">
        <div class="follow-btn-wrapper"></div>
        <a href="/portfolio.html?id=${seller.id}" class="view-btn">
          <i class="fas fa-eye"></i>
          View Shop
        </a>
      </div>
    `;
    
    // Append card to grid
    sellersGrid.appendChild(sellerCard);
    
    // Create and append follow button using manager
    const followWrapper = sellerCard.querySelector('.follow-btn-wrapper');
    const followButton = FollowButtonManager.createFollowButton(seller);
    followWrapper.appendChild(followButton);
  });
  
  setupSellerCardListeners();
}

function setupSellerCardListeners() {
  const sellersGrid = document.getElementById('sellersGrid');
  if (!sellersGrid) return;

  // Single event listener for the entire grid (event delegation)
  sellersGrid.addEventListener('click', function(e) {
    const sellerCard = e.target.closest('.seller-card');
    if (!sellerCard) return;
    
    const sellerId = sellerCard.dataset.sellerId;
    
    // Check if view button was clicked
    const viewBtn = e.target.closest('.view-btn');
    if (viewBtn) {
      // Anchor will handle navigation naturally
      return;
    }
    
    // Check if follow button was clicked
    const followBtn = e.target.closest('.follow-btn');
    if (followBtn) {
      // Stop propagation so it doesn't trigger card click
      return;
    }
    
    // Card click - view seller profile
    viewSellerProfile(sellerId);
  });
}

// Handle follow/unfollow logic
async function handleFollowSeller(sellerId, button) {
  try {
    button.disabled = true;
    const resp = await API.followSeller(sellerId);
  
    if (resp.success) {
      button.innerHTML = `<i class='fas fa-check'></i> following`;
      button.classList.add('following');
      button.disabled = true;
    } else {
      alert(resp.message || 'action failed');
      button.disabled = resp.alreadyFollowing? true : false;
    }
  } catch (error) {
    // Revert optimistic update on error
    alert(error.message || 'something went wrong');
    button.disabled = false
    console.error('Error following seller:', error);
  }
}

