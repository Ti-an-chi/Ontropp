// favourites.js - Favourites tab functionality
import API from '../api.js';
import { formatPrice } from './shared.js';
import {changeDisplay, viewSellerProfile, orderHandler} from './reconfig.js';

export async function initFavouritesTab() {
  // Load favourites data
  await loadFavouritesContent();
  
  // Setup favourites tabs
  setupFavouritesTabs();
}

async function loadFavouritesContent() {
  try {
    const favourites = await API.getFavourites();
    
    renderFavourites(favourites);
    setupFavouriteItemInteractions();
    updateFavouritesCount(favourites.length);
    
    // Setup interactions
    setupFavouritesInteractions();
    
  } catch (error) {
    console.error('Failed to load favourites:', error);
    alert('Failed to load favourites.');
  }
}

function renderFavourites(favourites) {
  const favouritesGrid = document.getElementById('favourites-grid');
    
  if (!favouritesGrid) return;
  
  changeDisplay('loading-favourites', 'none');
  
  favouritesGrid.innerHTML = '';
  
  if (favourites.length === 0) {
    changeDisplay('empty-favourites', 'flex')
    return;
  }
  
  changeDisplay('empty-favourites', 'none');
  
  favourites.forEach(item => {
    const sellerInfo = `
      <div class="product-seller-info">
        <div class="seller-avatar-small">
          <img src="${item.seller.logo_url}" alt='${item.seller.shop_name}'>
        </div>
        <div class="seller-details">
          <h4 class="seller-name">${item.seller.shop_name}</h4>
          <span class="seller-rating">
            <i class="fas fa-star"></i> ${item.rating || '4.5'}
          </span>
        </div>
      </div>
    `;
    
    const favouriteItem = document.createElement('div');
    favouriteItem.className = 'favourite-item';
    favouriteItem.dataset.id = item.id;
    favouriteItem.dataset.number = item.seller.whatsapp_number;
    
    favouriteItem.innerHTML = `
      <button class="favourite-remove-btn" data-id="${item.id}">
        <i class="fas fa-times"></i>
      </button>
      <div class="favourite-image">
        ${item.cover_image ? 
          `<img src="${item.cover_image}" alt="${item.name}">` :
          `<i class="fas fa-box"></i>`
        }
      </div>
      <div class="favourite-details">
        ${sellerInfo}
        <h3 class="favourite-title">${item.name}</h3>
        <p class="favourite-price">₦${formatPrice(item.price)}</p>
        <!--<span class="favourite-status status-${item.status || 'available'}">
          ${item.status === 'sold' ? 'Out of Stock' : 'In Stock'}
        </span>-->
        <div class="favourite-actions">
          <button class="favourite-action-btn buy-now-btn" data-id="${item.id}">
            <i class="fab fa-whatsapp"></i> Order Now
          </button>
          <!-- <button class="favourite-action-btn add-cart-btn" data-id="${item.id}">
            <i class="fas fa-cart-plus"></i> Add to Cart
          </button> -->
        </div>
      </div>
    `;
    
    favouritesGrid.appendChild(favouriteItem);
  });
}

function setupFavouritesTabs() {
  const favTabs = document.querySelectorAll('.fav-tab');
  const favTabContents = document.querySelectorAll('.fav-tab-content');
  
  favTabs.forEach(tab => {
    tab.addEventListener('click', function() {
      const tabId = this.dataset.tab;
      
      // Update active tab
      favTabs.forEach(t => t.classList.remove('active'));
      this.classList.add('active');
      
      // Show selected tab content
      favTabContents.forEach(content => {
        content.classList.remove('active');
      });
      document.getElementById(`fav-${tabId}`).classList.add('active');
      
      // Load content if not loaded
      if (tabId === 'sellers') {
        loadFollowedSellers();
      }
    });
  });
}

async function loadFollowedSellers() {
  try {
    const sellers = await API.getFollowedSellers();
    renderFollowedSellers(sellers);
  } catch (error) {
    console.error('Failed to load followed sellers:', error);
    // changeDisplay('error-sellers', 'flex');
  } finally {
    changeDisplay('loading-sellers', 'none');
  }
}

function renderFollowedSellers(sellers) {
  const sellersList = document.getElementById('sellers-list');
  const emptyEl = document.getElementById('empty-sellers');
  const countEl = document.getElementById('followed-count');
  
  if (!sellersList) return;
  
  sellersList.innerHTML = '';
  
  if (countEl) {
    countEl.textContent = `${sellers.length} ${sellers.length === 1 ? 'seller' : 'sellers'} followed`;
  }
  
  if (sellers.length === 0) {
    if (emptyEl) emptyEl.style.display = 'flex';
    return;
  }
  
  if (emptyEl) emptyEl.style.display = 'none';
  
  sellers.forEach(seller => {
    const sellerCard = document.createElement('a');
    sellerCard.href = '#';
    sellerCard.className = 'seller-card';
    sellerCard.dataset.sellerId = seller.id;
    sellerCard.innerHTML = `
      <div class="seller-avatar">
        <img src='${seller.logo_url}'></img>
      </div>
      <div class="seller-info">
        <h3 class="seller-name">${seller.shop_name}</h3>
        <div class="seller-stats">
          <span class="seller-stat">
            <i class="fas fa-box"></i> ${seller.products?.[0]?.count ?? 0} products
          </span>
          <span class="seller-stat">
            <i class="fas fa-star"></i> ${seller.rating}
          </span>
        </div>
      </div>
      <button class="unfollow-btn" data-seller-id="${seller.id}">
        <i class="fas fa-user-minus"></i> Unfollow
      </button>
    `;
    
    sellersList.appendChild(sellerCard);
  });
  
  setupFollowedItemInteractions();
}

function setupFavouritesInteractions() {
  // Clear all button
  const clearAllBtn = document.getElementById('clear-all-btn');
  if (clearAllBtn) {
    clearAllBtn.addEventListener('click', async function() {
/*    const favourites = JSON.parse(sessionStorage.getItem('userFavourites') || '[]');
      if (favourites.length === 0) {
        alert('No items to clear');
        return;
      }*/
      
      if (confirm('Are you sure you want to clear all favourites?')) {
        try {
          await API.clearAllFavourites();
          //sessionStorage.removeItem('userFavourites');
          renderFavourites([]);
          updateFavouritesCount(0);
          this.closest('.favourites-actions').style.display = 'none';
        } catch (error) {
          console.error('Failed to clear favourites:', error);
          alert('Failed to clear favourites.');
        }
      }
    });
  }
}

function setupFavouriteItemInteractions() {
  const favouritesGrid = document.getElementById('favourites-grid');
  if (!favouritesGrid) return;
  
  favouritesGrid.addEventListener('click', async function(e) {
    const removeBtn = e.target.closest('.favourite-remove-btn');
    const buyNowBtn = e.target.closest('.buy-now-btn');
    
    if (removeBtn) {
      e.preventDefault();
      const itemId = removeBtn.dataset.id;
      const item = removeBtn.closest('.favourite-item');
      
      if (confirm('Remove this item from favourites?')) {
        try {
          await API.removeFromFavourites(itemId);
          item.remove();
          updateFavouritesCount();
          checkIfFavouritesEmpty();
        } catch (error) {
          console.error('Failed to remove favourite:', error);
          alert('Failed to remove item.');
        }
      }
    }
    
    if (buyNowBtn) {
      e.preventDefault();
      const itemId = buyNowBtn.dataset.id;
      const favouriteItem = buyNowBtn.closest('.favourite-item');
      if (!favouriteItem) return;
      
      const productId = favouriteItem.dataset.id;
      const whatsappNumber = favouriteItem.dataset.number;
      const productName = favouriteItem.querySelector('.favourite-title')?.textContent?.trim();
      
      if (!productName || !whatsappNumber) return;
      
      orderHandler.flexibleHandle({
        whatsappNumber,
        productName,
        productId
      })
    }
  });
}

function setupFollowedItemInteractions() {
  const container = document.getElementById("sellers-list");

  container.addEventListener("click", async (e) => {
    const button = e.target.closest(".unfollow-btn, .follow-btn");
    const card = e.target.closest(".seller-card");
    
    if (!card) return;

    const sellerId = card.dataset.sellerId;
    
    if (button) {
      e.preventDefault();
      try {
        button.disabled = true;
      
        if (button.classList.contains("unfollow-btn")) {
          const res = await API.unfollowSeller(sellerId);
      
          if (res.success) {
            switchToFollow(button);
          }
        } else {
          const res = await API.followSeller(sellerId);
          
          if (res.success) {
            switchToUnfollow(button);
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        button.disabled = false;
      }
      return;
    }
    e.preventDefault();
    viewSellerProfile(sellerId);
  });
}

function switchToFollow(button) {
  button.classList.remove("unfollow-btn");
  button.classList.add("follow-btn");
  button.innerHTML = `<i class="fas fa-user-plus"></i> Follow`;
}

function switchToUnfollow(button) {
  button.classList.remove("follow-btn");
  button.classList.add("unfollow-btn");
  button.innerHTML = `<i class="fas fa-user-minus"></i> Unfollow`;
}

function updateFavouritesCount(count) {
  const favouritesCountEl = document.getElementById('favourites-count');
  if (favouritesCountEl) {
    const itemCount = count !== undefined ? count : 
      document.querySelectorAll('.favourite-item').length;
    favouritesCountEl.textContent = `${itemCount} ${itemCount === 1 ? 'item' : 'items'} saved`;
  }
}

function checkIfFavouritesEmpty() {
  const favouritesGrid = document.getElementById('favourites-grid');
  const emptyEl = document.getElementById('empty-favourites');
  const actionsEl = document.getElementById('favourites-actions');
  
  if (!favouritesGrid || !emptyEl || !actionsEl) return;
  
  if (favouritesGrid.children.length === 0) {
    emptyEl.style.display = 'flex';
    actionsEl.style.display = 'none';
  }
}