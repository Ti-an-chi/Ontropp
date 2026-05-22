// profile.js - Profile tab functionality
import API from '../../api.js';
import { renderProducts } from '../utility/shared.js';
import { updateElement, changeDisplay } from '../utility/reconfig.js';

const userData = JSON.parse(localStorage.getItem('userData'));

export async function initProfileTab() {
  await setupEventListeners();
  
  await setupProfileUi(userData);
  
  await loadProfileFavourites();
}

async function setupEventListeners() {
  const editAvatarInput = document.getElementById("edit-avatar-input");
  const editAvatarBtn = document.getElementById('edit-avatar-btn');
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

function setupProfileUi(userData) {
  updateElement('profile-display-name', userData.username);
  updateElement('profile-display-email', userData.email);
  updateElement(
    'profile-role',
    userData.role === 'seller' ? 'Seller' : 'Buyer'
  );

  updateElement('user-avatar-img', userData.avatar_url, 'src');
  updateElement('profile-avatar-img', userData.avatar_url, 'src');

  if (userData.role === 'seller') {
    changeDisplay('seller-profile-link', 'block');
    
    const base = window.location.origin;
    const link = `${base}/portfolio.html?id=${userData.sellerProfile.id}`;
    updateElement('profile-link-btn', link, 'href');
      
    } else {
    updateBuyerStats(userData);
  }
}

async function loadProfileFavourites() {
  try {
    const favourites = await API.getFavourites();
    console.log(favourites)
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
        ${item.cover_image ? 
          `<img src="${item.cover_image}" alt="${item.name}" style="width:100%;height:100%;object-fit:cover;">` :
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

function updateBuyerStats(userData) {
  updateElement('orders-count', userData.ordersCount || 0);
  updateElement('followings-count', userData.followingsCount || 0);
  updateElement('favorites-count', userData.favoritesCount || 0);
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
