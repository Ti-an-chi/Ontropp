// Core dashboard functionality
import API from './api.js';
import { initHomeTab } from './js/tabs/home.js';
import { initExploreTab } from './js/tabs/explore.js';
import { initFavouritesTab } from './js/tabs/favourites.js';
import { initProfileTab } from './js/tabs/profile.js';
import { updateElement, changeDisplay } from './js/utility/reconfig.js';

// Global state
let searchTimeout = null;
let currentTab;

// Initialize dashboard
document.addEventListener('DOMContentLoaded', function() {
  initDashboard();
});

async function initDashboard() {
  try {
    setupTabNavigation();
    const initialTab = getInitialTab();
    switchToTab(initialTab);
    
    setupGlobalEventListeners();
  } catch (error) {
    console.error('Failed to initialize dashboard:', error);
    showErrorMessage('Failed to load dashboard. Please refresh the page.');
  }
}

function getInitialTab() {
  const hash = window.location.hash.replace('#', '');
  
  const validTabs = [ 'tab-home', 'tab-explore', 'tab-fav', 'tab-profile' ];
  
  return validTabs.includes(hash) ? hash  : 'tab-home';
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
  if (currentTab === tabId) return;
  
  currentTab = tabId;
  window.location.hash = tabId;
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

const loadedTabs = new Set();
async function loadTabContent(tabId) {
  if (loadedTabs.has(tabId)) return;
  
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
    
    loadedTabs.add(tabId);
    
  } catch (error) {
    console.error(`Failed to load ${tabId}:`, error);
    showErrorMessage(`Failed to load ${tabId.replace('tab-', '')} content.`);
  }
}

document.addEventListener('switchTab', (e) => {
  switchToTab(e.detail);
});

// Global Event Listeners
function setupGlobalEventListeners() {
  const kebabBtn = document.getElementById('profile-kebab-btn');
  const dropdown = document.getElementById('profile-dropdown');
  const setupSellerBtn = document.getElementById('setup-seller-btn');
  const addProductButton = document.getElementById('add-product-btn');
  const logoutBtn = document.getElementById('logout-btn');
  
  if (kebabBtn && dropdown) {
    kebabBtn.addEventListener('click', function(e) {
      e.stopPropagation();
      dropdown.style.display = dropdown.style.display === 'block' ? 'none' : 'block';
    });
    
    document.addEventListener('click', function() {
      dropdown.style.display = 'none';
    });
    
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
  
  if (logoutBtn) {
    logoutBtn.addEventListener('click', function() {
      API.clearTokens();
      window.location.href = 'signup.html?mode=signin';
    });
  }
}

// UI Feedback Functions
function showErrorMessage(message) {
  console.error('Error:', message);
}
