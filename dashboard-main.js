// dashboard-main.js - Core dashboard functionality
import API from './api.js';
import { initHomeTab } from '/js/home.js';
import { initExploreTab } from '/js/explore.js';
import { initFavouritesTab } from '/js/favourites.js';
import { initProfileTab } from '/js/profile.js';
import { updateElement, changeDisplay } from '/js/reconfig.js'

// Global state
let currentUser = null;
let searchTimeout = null;

// Initialize dashboard
document.addEventListener('DOMContentLoaded', function() {
  initDashboard();
});

async function initDashboard() {
  try {
    // Load user data first
    await loadUserData();
    
    // Setup tab navigation
    setupTabNavigation();
    
    // Setup global event listeners
    setupGlobalEventListeners();
    
    // Load initial tab (Home)
    loadTabContent('tab-home');
    
  } catch (error) {
    console.error('Failed to initialize dashboard:', error);
    showErrorMessage('Failed to load dashboard. Please refresh the page.');
  }
}

// User Data Management
async function loadUserData() {
  try {
    const userData = await API.getUserData();
    currentUser = userData;
    
    localStorage.setItem('userData', JSON.stringify(userData));
    updateUserUI(currentUser);
    
    if (currentUser?.role === 'seller') {
      updateSellerDashboard(currentUser);
    }
  } catch (error) {
    console.error(`Failed to load user data:  ${error}`);
    // Use default user data as fallback
    currentUser = {
      username: 'User',
      email: 'user@example.com',
      isSeller: false,
      role: 'buyer'
    };
    updateUserUI(currentUser);
  }
}

function updateUserUI(userData) {
  updateElement('user-name', userData.username);
  updateElement('user-email', userData.email);
  updateElement('profile-display-name', userData.username);
  updateElement('profile-display-email', userData.email);
  updateElement(
    'profile-role',
    userData.role === 'seller' ? 'Seller' : 'Buyer'
  );

  updateElement('user-avatar-img', userData.avatar_url, 'src');
  updateElement('profile-avatar-img', userData.avatar_url, 'src');

  if (userData.role !== 'seller') {
    updateBuyerStats(userData);
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
  updateElement('profile-link-url', userData.profileLink || '');
  
  const profileLinkEl = document.getElementById('seller-profile-link');
  if (profileLinkEl) {
    profileLinkEl.style.display = 'block';
    document.getElementById('profile-link-url').textContent = userData.profileLink || '';
  }
  
  // Hide become seller button
  changeDisplay('become-seller-btn', 'none');
}

// Tab Management
function setupTabNavigation() {
  const tabLinks = document.querySelectorAll('.nav-item[data-tab]');
  
  tabLinks.forEach(link => {
    link.addEventListener('click', function(e) {
      e.preventDefault();
      const tabId = this.getAttribute('data-tab');
      switchToTab(tabId);
    });
  });
  
  // Search bar goes to explore tab
  const searchBarLink = document.getElementById('search-bar-link');
  if (searchBarLink) {
    searchBarLink.addEventListener('click', function(e) {
      e.preventDefault();
      switchToTab('tab-explore');
    });
  }
}

function switchToTab(tabId) {
  // Update active tab in navigation
  const tabLinks = document.querySelectorAll('.nav-item[data-tab]');
  tabLinks.forEach(link => {
    link.classList.remove('active');
    if (link.getAttribute('data-tab') === tabId) {
      link.classList.add('active');
    }
  });
  
  // Show selected tab content
  const tabContents = document.querySelectorAll('.tab-content');
  tabContents.forEach(content => {
    content.classList.remove('active');
    if (content.id === tabId) {
      content.classList.add('active');
    }
  });
  
  // Load tab content if not already loaded
  loadTabContent(tabId);
}

async function loadTabContent(tabId) {
  // Cache check removed - tab will load every time
  
  try {
    switch(tabId) {
      case 'tab-home':
        await initHomeTab();
        break;
      case 'tab-explore':
        await initExploreTab();
        break;
      case 'tab-fav':
        await initFavouritesTab();
        break;
      case 'tab-profile':
        await initProfileTab();
        break;
    }
    
    // Cache setting removed
    
  } catch (error) {
    console.error(`Failed to load ${tabId}:`, error);
    showErrorMessage(`Failed to load ${tabId.replace('tab-', '')} content.`);
  }
}

// Listen for tab switch events from other modules
document.addEventListener('switchTab', (e) => {
  switchToTab(e.detail);
});
// Global Event Listeners
function setupGlobalEventListeners() {
  // Kebab menu toggle
  const kebabBtn = document.getElementById('profile-kebab-btn');
  const dropdown = document.getElementById('profile-dropdown');
  const setupSellerBtn = document.getElementById('setup-seller-btn');
  const editAvatarInput = document.getElementById("edit-avatar-input");
  const editAvatarBtn = document.getElementById('edit -avatar-btn');
  const addProductButton = document.getElementById('add-product-btn');
  
  if (kebabBtn && dropdown) {
    kebabBtn.addEventListener('click', function(e) {
      e.stopPropagation();
      dropdown.style.display = dropdown.style.display === 'block' ? 'none' : 'block';
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', function() {
      dropdown.style.display = 'none';
    });

    // Prevent dropdown from closing when clicking inside it
    dropdown.addEventListener('click', function(e) {
      e.stopPropagation();
    });
  }

  if (setupSellerBtn) {
    setupSellerBtn.addEventListener('click', function() {
      dropdown.style.display = 'none';
      
      if (confirm('Ready to start your seller journey? You\'ll be able to list products and grow your business.')) {
          location.href = 'sellerSignup.html';
      }
    });
  }
  
  if (addProductButton) {
    addProductButton.addEventListener('click', function(e) {
      e.stopPropagation();
      location.href = 'upload.html';
    });
  }
  
  if (editAvatarBtn && editAvatarInput) {
    editAvatarBtn.addEventListener('click', () => {
      editAvatarInput.click();
    });
  }
  if (editAvatarInput) {
    editAvatarInput.addEventListener('change', function(e) {
      const file = this.files[0];
      if (!file) return;
    
      if (!file.type.startsWith('image/')) {
        alert('Please select an image file (JPG, PNG, etc.)');
        return;
      }
    
      if (file.size > 2 * 1024 * 1024) {
        alert('Image file must be less than 1MB');
        return;
      }
    
      uploadProfileImage(file);
    });
  }
}

async function uploadProfileImage(file) {
  const UPLOAD_PRESET = 'seller_logo_unsigned';
  
  const editAvatarBtn = document.getElementById('edit-avatar-btn');
  const profileAvatarImage = document.getElementById('profile-avatar-img');
  
  const formData = new FormData();
  formData.append('file', file)
  formData.append('upload_preset', UPLOAD_PRESET);
  formData.append('folder', 'users/profile');
  
  profileAvatarImage.src = 'https://i.gifer.com/ZZ5H.gif';     // loading state
  
  try {
    const resp = await API.uploadImage(formData);
    const profileImageURL = resp.secure_url;
    await API.updateProfile({avatar_url: profileImageURL});
    
    profileAvatarImage.src = profileImageURL;
  } catch (err) {
    alert('Logo upload failed. try again');
    console.error(err);

    profileAvatarImage.src = 'https://ui-avatars.com/api/?name=User&background=3483E0&color=fff';
  }
}

// UI Feedback Functions
function showSuccessMessage(message) {
  const messageEl = document.createElement('div');
  messageEl.className = 'success-message';
  messageEl.innerHTML = `
    <i class="fas fa-check-circle"></i>
    <span>${message}</span>
  `;
  
  // Insert at top of main content
  const mainContent = document.querySelector('.dashboard-main');
  if (mainContent) {
    mainContent.insertBefore(messageEl, mainContent.firstChild);
    
    // Remove after 5 seconds
    setTimeout(() => {
      messageEl.remove();
    }, 5000);
  }
}

function showErrorMessage(message) {
  console.error('Error:', message);
  // In production: show error toast/notification
}

// Export for other modules
export { 
  currentUser, 
  searchTimeout,
  showSuccessMessage,
  showErrorMessage,
  switchToTab,
  loadUserData
};