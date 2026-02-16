// profile.js - Profile tab functionality
import API from '../api.js';
import { renderProducts } from './shared.js';

export async function initProfileTab() {

  await loadProfileFavourites();
  
  // Setup kebab menu interactions
  setupKebabMenu();
}

async function loadProfileFavourites() {
  try {
    const favourites = await API.getFavourites();
    renderProfileFavourites(favourites.slice(0, 4)); // Show only 4
  } catch (error) {
    console.error('Failed to load profile favourites:', error);
  }
}

function renderProfileFavourites(favourites) {
  const grid = document.getElementById('profile-favourites-grid');
  const empty = document.getElementById('empty-favourites-preview');
  
  if (!grid || !empty) return;
  
  grid.innerHTML = '';
  
  if (favourites.length === 0) {
    empty.style.display = 'block';
    return;
  }
  
  empty.style.display = 'none';
  
  favourites.forEach(item => {
    const itemEl = document.createElement('div');
    itemEl.className = 'favourite-preview-item';
    
    itemEl.innerHTML = `
      <div class="favourite-preview-image">
        ${item.image ? 
          `<img src="${item.image}" alt="${item.name}" style="width:100%;height:100%;object-fit:cover;">` :
          `<i class="fas fa-box"></i>`
        }
      </div>
      <div class="favourite-preview-details">
        <div class="favourite-preview-title">${item.name}</div>
        <div class="favourite-preview-price">₦${formatPrice(item.price)}</div>
      </div>
    `;
    
    // Click to go to favourites tab
    itemEl.addEventListener('click', () => {
      const event = new CustomEvent('switchTab', { detail: 'tab-fav' });
      document.dispatchEvent(event);
    });
    
    grid.appendChild(itemEl);
  });
}

function formatPrice(price) {
  return new Intl.NumberFormat('en-NG').format(price);
}

function setupKebabMenu() {
  const dropdown = document.getElementById('profile-dropdown');
  if (!dropdown) return;
  
  // Setup individual button handlers
  document.getElementById('edit-profile-btn')?.addEventListener('click', () => {
    dropdown.style.display = 'none';
    alert('Edit profile feature coming soon!');
  });
  
  document.getElementById('account-settings-btn')?.addEventListener('click', () => {
    dropdown.style.display = 'none';
    alert('Account settings page coming soon!');
  });
  
  document.getElementById('help-support-btn')?.addEventListener('click', () => {
    dropdown.style.display = 'none';
    // In production: link to help page or open support modal
    window.open('https://wa.me/1234567890', '_blank');
  });
  
  document.getElementById('setup-seller-btn')?.addEventListener('click', () => {
    dropdown.style.display = 'none';
    
    if (confirm('Ready to start your seller journey? You\'ll be able to list products and grow your business.')) {
      API.becomeSeller().then(response => {
        alert('Welcome to the seller community!');
        // Refresh page to show seller dashboard
        window.location.reload();
      }).catch(error => {
        console.error('Failed to become seller:', error);
        alert('Failed to setup seller account. Please try again.');
      });
    }
  });
  
  document.getElementById('logout-btn')?.addEventListener('click', () => {
    dropdown.style.display = 'none';
    
    if (confirm('Are you sure you want to log out?')) {
      // Clear tokens and redirect
      localStorage.removeItem('authToken');
      sessionStorage.clear();
      window.location.href = 'signup.html';
    }
  });
}