// sellerAuth.js
import { showNotification } from '/js/utility/reconfig.js';
import StoreApi from '/js/storeApi.js';

// ===== AUTH HTML TEMPLATE =====
const AUTH_HTML = `
  <div class="seller-auth-overlay authenticated" id="seller-auth-overlay">
    <div class="seller-auth-modal">
      <div class="auth-modal-header">
        <div class="auth-logo">ONTROPP.</div>
      </div>
      <form class="auth-modal-form" id="seller-auth-form">
        <h2>Designer Dashboard</h2>
        <p class="auth-subtitle">Sign in to manage your products</p>
        
        <div class="auth-form-group">
          <label for="shop-name">Shop Name</label>
          <input 
            type="text" 
            id="shop-name" 
            name="shop-name" 
            placeholder="Your shop name" 
            required
            autocomplete="off"
          >
        </div>
        
        <div class="auth-form-group">
          <label for="seller-passkey">Seller Passkey</label>
          <input 
            type="password" 
            id="seller-passkey" 
            name="seller-passkey" 
            placeholder="Enter your passkey (123456 for old designers)" 
            autocomplete="off"
          >
          <p class="form-help" style="font-size:0.9rem; color: var(--admin-muted); margin-top: 6px;">
            If your shop was created before passkey setup, use "123456".
          </p>
        </div>

        <div class="auth-error" id="auth-error" style="display: none;"></div>
        
        <button type="submit" class="auth-submit-btn" id="auth-submit-btn">
          Access Dashboard
        </button>
        
        <div class="auth-action-row">
          <p class="auth-footer-text">
            Don't have a shop? <a href="sellerSignup.html">Register as seller</a>
          </p>
          <button type="button" class="auth-secondary-btn" id="set-passkey-btn">
            Set passkey
          </button>
        </div>
      </form>
    </div>
  </div>
`;

let authElements = null;

function injectAuthOverlay() {
  // Check if already injected
  if (document.getElementById('seller-auth-overlay')) {
    return;
  }
  
  document.body.insertAdjacentHTML('beforeend', AUTH_HTML);
  const linkElement = document.createElement('link');
  linkElement.id = 'auth-overlay-styles';
  linkElement.rel = 'stylesheet';
  linkElement.href = '/designers/css/authOverlay.css';
  document.head.appendChild(linkElement);
  
  getAuthElements();
}

function getAuthElements() {
  authElements = {
  overlay: document.getElementById('seller-auth-overlay'),
  form: document.getElementById('seller-auth-form'),
  shopNameInput: document.getElementById('shop-name'),
  passkeyInput: document.getElementById('seller-passkey'),
  submitBtn: document.getElementById('auth-submit-btn'),
  errorMsg: document.getElementById('auth-error'),
  setPasskeyBtn: document.getElementById('set-passkey-btn'),
  };
}

// ===== AUTH STATE =====
let authResolve = null;
let authPromise = null;

function getAuthPromise() {
  if (!authPromise) {
    authPromise = new Promise((resolve) => {
      authResolve = resolve;
    });
  }
  return authPromise;
}

// ===== INITIALIZATION =====
async function initSellerAuth() {
  injectAuthOverlay();
  const authenticated = await checkSellerSession();

  if (!authenticated) {
    setupAuthForm();
    authElements.overlay?.classList.remove('authenticated');
    
    // Don't resolve yet — wait for form submission
    return getAuthPromise();
  }

  // Already authenticated — resolve immediately
  authElements.overlay?.classList.add('authenticated');
  if (authResolve) authResolve(true);
  return true;
}

// ===== AUTH FORM SETUP =====


// ===== SESSION CHECK =====
async function checkSellerSession() {
  const refreshToken = await localStorage.getItem('shop_refresh');
  if (!refreshToken) return false;
  console.log(refreshToken);
  
  const response = await StoreApi.tokenPing();
  if (!response.success) return false;

  authElements.overlay.classList.add('authenticated');
  authElements.overlay.dataset.authenticated = 'true';
  showNotification('Resume session');
  console.log(`✓ Designer authenticated`);

  return true;
}

// ===== AUTH FORM SETUP =====
function setupAuthForm() {
  authElements.form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const shopName = authElements.shopNameInput.value.trim();
    const passkey = authElements.passkeyInput.value.trim();

    if (!shopName) {
      showAuthError('Please enter your shop name');
      return;
    }

    if (shopName.length < 3) {
      showAuthError('Shop name must be at least 3 characters');
      return;
    }

    try {
      setAuthLoading(true);
      
      const response = await StoreApi.designerAuth(shopName, passkey);
      if (!response?.success) {
        showNotification(response.message, 'error');
        setAuthLoading(false);
        return; // Stay on form, user can try again
      }

      // SUCCESS — hide overlay and resolve the promise
      authElements.overlay.classList.add('authenticated');
      authElements.overlay.dataset.authenticated = 'true';
      
      if (authResolve) {
        authResolve(true);
        authResolve = null; // prevent double-resolve
      }
      
      showNotification('Welcome back, designer');
      
    } catch (error) {
      console.error('Auth error:', error);
      showNotification(error, 'error');
    } finally {
      setAuthLoading(false);
    }
  });
}

// ===== AUTH UI HELPERS =====
function showAuthError(message) {
  authElements.errorMsg.textContent = message;
  authElements.errorMsg.style.display = 'block';
  setTimeout(() => {
    authElements.errorMsg.style.display = 'none';
  }, 3000);
}

function setAuthLoading(loading) {
  authElements.submitBtn.disabled = loading;
  authElements.submitBtn.textContent = loading ? 'Verifying...' : 'Access Dashboard';
}

// ===== INITIALIZATION =====
window.addEventListener('DOMContentLoaded', initSellerAuth );

// Dummy function - replace with actual implementation
function initPage() {
  console.log('Initializing seller products page...');
}