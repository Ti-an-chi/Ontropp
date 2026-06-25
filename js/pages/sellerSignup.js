import API from '../../api.js';

document.addEventListener('DOMContentLoaded', function() {
  autoFillUserData();
  setupCategories();
  setupLogoUpload();
  setupFormSubmission();
  setupPasskeyFlow();
});

let sellerLogoUrl = null;

function autoFillUserData() {
  try {
    const userData = JSON.parse(localStorage.getItem('userData') || '{}');
    
    if (userData.username) {
      const shopNameInput = document.getElementById('shopName');
      if (shopNameInput && !shopNameInput.value) {
        shopNameInput.value = userData.username + "'s Shop";
      }
    }
  } catch (error) {
    console.error('Failed to auto-fill user data:', error);
  }
}

async function setupCategories() {
  try {
    const categories = await API.getCategories();
    const categoryGrid = document.getElementById('categoryGrid');
    
    if (!categoryGrid) return;
    
    categoryGrid.innerHTML = '';
    
    categories.forEach(category => {
      const categoryOption = document.createElement('div');
      categoryOption.className = 'category-option';
      categoryOption.dataset.category = category.id;
      
      categoryOption.innerHTML = `
        <div class="category-icon">
          <i class="fas fa-${category.icon}"></i>
        </div>
        <div class="category-name">${category.name}</div>
      `;
      
      categoryOption.addEventListener('click', function() {
        document.querySelectorAll('.category-option').forEach(opt => {
          opt.classList.remove('selected');
        });
        
        this.classList.add('selected');
        document.getElementById('selectedCategory').value = category.id;
      });
      
      categoryGrid.appendChild(categoryOption);
    });
    
    if (categories.length > 0) {
      const firstOption = categoryGrid.querySelector('.category-option');
      if (firstOption) {
        firstOption.click();
      }
    }
  } catch (error) {
    console.error('Failed to load categories:', error);
  }
}

function setupLogoUpload() {
  const logoUploadArea = document.getElementById('logoUploadArea');
  const logoUploadBtn = document.getElementById('logoUploadBtn');
  const logoFileInput = document.getElementById('logoFileInput');
  const logoPreview = document.getElementById('logoPreview');
  const logoUploadContent = document.getElementById('logoUploadContent');
  const logoPreviewImage = document.getElementById('logoPreviewImage');
  const logoChangeBtn = document.getElementById('logoChangeBtn');
  
  if (!logoUploadArea || !logoFileInput) return;
  
  logoUploadArea.addEventListener('click', (e) => {
    if (e.target !== logoFileInput && e.target !== logoChangeBtn) {
      logoFileInput.click();
    }
  });
  
  logoUploadBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    logoFileInput.click();
  });
  
  logoChangeBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    logoFileInput.click();
  });
  
  logoFileInput.addEventListener('change', function(e) {
    const file = this.files[0];
    if (!file) return;
    
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file (JPG, PNG, etc.)');
      return;
    }
    
    if (file.size > 2 * 1024 * 1024) {
      alert('Image file must be less than 2MB');
      return;
    }
    
    uploadSellerLogo(file);
  });
  
  logoUploadArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    logoUploadArea.style.borderColor = 'var(--primary)';
    logoUploadArea.style.backgroundColor = 'rgba(52, 131, 224, 0.1)';
  });
  
  logoUploadArea.addEventListener('dragleave', (e) => {
    e.preventDefault();
    logoUploadArea.style.borderColor = '';
    logoUploadArea.style.backgroundColor = '';
  });
  
  logoUploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    logoUploadArea.style.borderColor = '';
    logoUploadArea.style.backgroundColor = '';
    
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);
      logoFileInput.files = dataTransfer.files;
      logoFileInput.dispatchEvent(new Event('change'));
    }
  });
}

async function uploadSellerLogo(file) {
  const UPLOAD_PRESET = 'seller_logo_unsigned';

  const logoPreviewImage = document.getElementById('logoPreviewImage');
  const logoUploadContent = document.getElementById('logoUploadContent');
  const logoPreview = document.getElementById('logoPreview');

  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', UPLOAD_PRESET);
  formData.append('folder', 'sellers/logos');

  // loading state 
  logoPreviewImage.src = 'https://i.gifer.com/ZZ5H.gif';
  logoUploadContent.style.display = 'none';
  logoPreview.style.display = 'flex';
  
  try {
    const res = await API.uploadImage(formData);

    sellerLogoUrl = res.secure_url;
    logoPreviewImage.src = sellerLogoUrl;
  } catch (err) {
    alert('Logo upload failed. try again');
    console.error(err);

    sellerLogoUrl = null;
    logoUploadContent.style.display = 'block';
    logoPreview.style.display = 'none';
  }
}

function setupFormSubmission() {
  const form = document.getElementById('sellerSignupForm');
  const submitBtn = document.getElementById('submitBtn');
  
  if (!form || !submitBtn) return;
  
  form.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const formData = {
      shopName: document.getElementById('shopName').value.trim(),
      shopBio: document.getElementById('shopBio').value.trim(),
      whatsapp_number: document.getElementById('whatsappNumber').value.trim(),
      location: document.getElementById('operatingLocation').value.trim(), 
      category: document.getElementById('selectedCategory').value
    };
    
    if (!formData.shopName || !formData.shopBio || !formData.whatsapp_number || !formData.location || !formData.category) {
      alert('Please fill in all required fields');
      return;
    }
    
    formData.logoUrl = sellerLogoUrl;
    
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
    submitBtn.disabled = true;
    
    try {
      const response = await API.startSelling(formData);
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalText;

      if (response?.success) {
        showPasskeySetup();
      } else {
        throw new Error(response?.message || 'Failed to become a seller.');
      }
    } catch (error) {
      console.error('Failed to become seller:', error);
      alert(error.message || 'Failed to setup seller account. Please try again.');
      submitBtn.innerHTML = originalText;
      submitBtn.disabled = false;
    }
  });
}

function setupPasskeyFlow() {
  const query = new URLSearchParams(window.location.search);
  const showModal = query.get('showPasskeyModal') === '1';
  const passkeyOverlay = document.getElementById('seller-passkey-overlay');
  const passkeyForm = document.getElementById('seller-passkey-form');
  const passkeyInput = document.getElementById('passkeyInput');
  const confirmPasskeyInput = document.getElementById('confirmPasskeyInput');
  const passkeyError = document.getElementById('passkey-error');
  const passkeySkipBtn = document.getElementById('passkey-skip-btn');

  if (!passkeyOverlay || !passkeyForm || !passkeyInput || !confirmPasskeyInput || !passkeySkipBtn) return;

  if (showModal) {
    passkeyOverlay.style.display = 'grid';
  }

  passkeyForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    clearPasskeyError();

    const passkey = passkeyInput.value.trim();
    const confirmPasskey = confirmPasskeyInput.value.trim();

    if (!passkey) {
      return showPasskeyError('Enter a passkey or choose skip to continue.');
    }

    if (passkey.length < 6) {
      return showPasskeyError('Passkey must be at least 6 characters.');
    }

    if (passkey !== confirmPasskey) {
      return showPasskeyError('Passkeys do not match.');
    }

    try {
      await saveSellerPasskey(passkey);
      alert('Passkey saved successfully. You can now use it on seller login.');
      passkeyOverlay.style.display = 'none';
      window.location.href = 'dashboard.html';
    } catch (error) {
      console.error('Could not save passkey:', error);
      showPasskeyError('Unable to save passkey. Try again later.');
    }
  });

  passkeySkipBtn.addEventListener('click', function() {
    passkeyOverlay.style.display = 'none';
    window.location.href = 'dashboard.html';
  });
}

function showPasskeySetup() {
  const passkeyOverlay = document.getElementById('seller-passkey-overlay');
  if (passkeyOverlay) {
    passkeyOverlay.style.display = 'grid';
  }
}

function showPasskeyError(message) {
  const passkeyError = document.getElementById('passkey-error');
  if (!passkeyError) return;
  passkeyError.textContent = message;
  passkeyError.style.display = 'block';
}

function clearPasskeyError() {
  const passkeyError = document.getElementById('passkey-error');
  if (!passkeyError) return;
  passkeyError.textContent = '';
  passkeyError.style.display = 'none';
}

async function saveSellerPasskey(passkey) {
  const sellerData = {
    passkey,
    shopName: document.getElementById('shopName').value.trim(),
  };
  await API.setSellerPasskey(sellerData);
}
