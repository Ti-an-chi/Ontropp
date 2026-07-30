// authCheck.js — blocks page until seller is authenticated
import { showNotification } from '../../js/utility/reconfig.js';
import StoreApi from '../../js/storeApi.js';

// ===== AUTH OVERLAY HTML =====
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
          <input type="text" id="shop-name" name="shop-name" placeholder="Your shop name" required autocomplete="off">
        </div>
        
        <div class="auth-form-group">
          <label for="seller-passkey">Seller Passkey</label>
          <input type="password" id="seller-passkey" name="seller-passkey" placeholder="Enter your passkey" autocomplete="off">
          <p class="form-help">If your shop was created before passkey setup, use "123456".</p>
        </div>

        <div class="auth-error" id="auth-error"></div>
        
        <button type="submit" class="auth-submit-btn" id="auth-submit-btn">Access Dashboard</button>
        
        <div class="auth-action-row">
          <p class="auth-footer-text">Don't have a shop? <a href="sellerSignup.html">Register as seller</a></p>
          <button type="button" class="auth-secondary-btn" id="set-passkey-btn">Set passkey</button>
        </div>
      </form>
    </div>
  </div>
`;

let authElements = null;
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

function injectAuthOverlay() {
  if (document.getElementById('seller-auth-overlay')) return;
  
  document.body.insertAdjacentHTML('beforeend', AUTH_HTML);
  
  const link = document.createElement('link');
  link.id = 'auth-overlay-styles';
  link.rel = 'stylesheet';
  link.href = '/designers/css/authOverlay.css';
  document.head.appendChild(link);
  
  cacheAuthElements();
}

function cacheAuthElements() {
  authElements = {
    overlay: document.getElementById('seller-auth-overlay'),
    form: document.getElementById('seller-auth-form'),
    shopName: document.getElementById('shop-name'),
    passkey: document.getElementById('seller-passkey'),
    submitBtn: document.getElementById('auth-submit-btn'),
    errorMsg: document.getElementById('auth-error'),
    setPasskeyBtn: document.getElementById('set-passkey-btn'),
  };
}

function showAuthError(msg) {
  authElements.errorMsg.textContent = msg;
  authElements.errorMsg.classList.add('visible');
  setTimeout(() => authElements.errorMsg.classList.remove('visible'), 4000);
}

function setAuthLoading(loading) {
  authElements.submitBtn.disabled = loading;
  authElements.submitBtn.classList.toggle('loading', loading);
  authElements.submitBtn.textContent = loading ? 'Verifying...' : 'Access Dashboard';
}

// ===== SESSION CHECK =====
async function checkSession() {
  const refreshToken = localStorage.getItem('shop_refresh');
  if (!refreshToken) return false;

  try {
    const response = await StoreApi.tokenPing();
    if (!response?.success) return false;
    
    showNotification('Session resumed');
    return true;
  } catch {
    return false;
  }
}

// ===== FORM HANDLER =====
function bindAuthForm() {
  authElements.form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const shopName = authElements.shopName.value.trim();
    const passkey = authElements.passkey.value.trim();

    if (!shopName || shopName.length < 3) {
      showAuthError('Shop name must be at least 3 characters');
      return;
    }

    try {
      setAuthLoading(true);
      const response = await StoreApi.designerAuth(shopName, passkey);
      
      if (!response?.success) {
        showAuthError(response?.message || 'Authentication failed');
        setAuthLoading(false);
        return;
      }

      // Success — hide overlay and resolve
      authElements.overlay.classList.add('authenticated');
      localStorage.setItem('shop_name', shopName);
      
      if (authResolve) {
        authResolve(true);
        authResolve = null;
      }
      
      showNotification('Welcome back, designer');
      
    } catch (err) {
      showAuthError('Network error. Please try again.');
      console.error('Auth error:', err);
    } finally {
      setAuthLoading(false);
    }
  });
}

// ===== PUBLIC API =====
export async function ensureAuth() {
  injectAuthOverlay();
  cacheAuthElements();
  
  const isAuthed = await checkSession();
  
  if (!isAuthed) {
    authElements.overlay.classList.remove('authenticated');
    bindAuthForm();
    return getAuthPromise();
  }
  
  if (authResolve) authResolve(true);
  return true;
}

// Auto-init on DOM ready for pages that import this module
// Dashboard pages should call: import { ensureAuth } from './authCheck.js'; await ensureAuth();
