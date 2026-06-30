import API from '../../api.js';
import { setupPasswordToggle } from '../utility/uiUtils.js';

document.addEventListener('DOMContentLoaded', function() {
  initMode();
  setupSteps();
  autoFillUserData();
  setupUi();
  setupFormSubmission();
});

let designerLogoUrl = null;
let isEditMode = false;
let existingDesignerData = null;

// ── Mode Detection ─────────────────────────────────────────
function initMode() {
  const params = new URLSearchParams(window.location.search);
  isEditMode = params.get('mode') === 'edit';

  if (isEditMode) {
    document.getElementById('pageTitle').textContent = 'Update Your Brand';
    document.getElementById('pageSubtitle').textContent = 'Edit your brand profile and passPassKey.';
    document.getElementById('submitBtnText').textContent = 'Save Changes';
    loadDesignerData();
  }
}

async function loadDesignerData() {
  try {
    const data = await API.getDesignerProfile();
    existingDesignerData = data;

    if (data.shopName) document.getElementById('shopName').value = data.shopName;
    if (data.shopBio) document.getElementById('shopBio').value = data.shopBio;
    if (data.whatsapp_number) document.getElementById('whatsappNumber').value = data.whatsapp_number;
    if (data.location) document.getElementById('operatingLocation').value = data.location;
    if (data.category) document.getElementById('selectedCategory').value = data.category;
    if (data.logoUrl) {
      designerLogoUrl = data.logoUrl;
      document.getElementById('logoPreviewImage').src = data.logoUrl;
      document.getElementById('logoUploadContent').style.display = 'none';
      document.getElementById('logoPreview').style.display = 'flex';
    }

    // Pre-select category
    if (data.category) {
      const opts = document.querySelectorAll('.category-option');
      opts.forEach(opt => {
        opt.classList.toggle('selected', opt.dataset.category === String(data.category));
      });
    }
  } catch (err) {
    console.error('Failed to load designer data:', err);
  }
}

// ── Step Navigation ────────────────────────────────────────
function setupSteps() {
  const step1 = document.getElementById('step1');
  const step2 = document.getElementById('step2');
  const nextBtn = document.getElementById('nextStepBtn');
  const backBtn = document.getElementById('backStepBtn');
  const steps = document.querySelectorAll('.progress-step');

  function validateStep1() {
    const shopName = document.getElementById('shopName').value.trim();
    const shopBio = document.getElementById('shopBio').value.trim();
    const whatsapp = document.getElementById('whatsappNumber').value.trim();
    const location = document.getElementById('operatingLocation').value.trim();
    const category = document.getElementById('selectedCategory').value;

    if (!shopName || !shopBio || !whatsapp || !location || !category) {
      alert('Please fill in all required fields before continuing.');
      return false;
    }
    return true;
  }

  function goToStep(n) {
    if (n === 1) {
      step1.classList.remove('hidden');
      step2.classList.add('hidden');
      steps[0].classList.add('active');
      steps[1].classList.remove('active');
    } else {
      if (!validateStep1()) return;
      step1.classList.add('hidden');
      step2.classList.remove('hidden');
      steps[0].classList.remove('active');
      steps[1].classList.add('active');
      // Focus first PassKey input
      setTimeout(() => document.getElementById('passPassKey')?.focus(), 100);
    }
  }

  nextBtn?.addEventListener('click', () => goToStep(2));
  backBtn?.addEventListener('click', () => goToStep(1));
}

function autoFillUserData() {
  try {
    const userData = JSON.parse(localStorage.getItem('userData') || '{}');
    if (userData.username) {
      const shopNameInput = document.getElementById('shopName');
      if (shopNameInput && !shopNameInput.value && !isEditMode) {
        shopNameInput.value = userData.username + "'s Brand";
      }
    }
  } catch (error) {
    console.error('Failed to auto-fill user data:', error);
  }
}

function setupUi() {
  setupCategories();
  setupLogoUpload();
  setupPasswordToggle('passKey', 'togglePassKey');
}

async function setupCategories() {
  try {
    const categories = await API.getCategories();
    const categoryGrid = document.getElementById('categoryGrid');
    if (!categoryGrid) return;
    categoryGrid.innerHTML = '';

    categories.forEach(category => {
      const option = document.createElement('div');
      option.className = 'category-option';
      option.dataset.category = category.id;
      option.innerHTML = `
        <div class="category-icon">
          <i class="fas fa-${category.icon}"></i>
        </div>
        <div class="category-name">${category.name}</div>
      `;
      option.addEventListener('click', function() {
        document.querySelectorAll('.category-option').forEach(o => o.classList.remove('selected'));
        this.classList.add('selected');
        document.getElementById('selectedCategory').value = category.id;
      });
      categoryGrid.appendChild(option);
    });

    if (categories.length > 0 && !isEditMode) {
      categoryGrid.querySelector('.category-option')?.click();
    }
    // If edit mode, re-apply selection after categories load
    if (isEditMode && existingDesignerData?.category) {
      const match = categoryGrid.querySelector(`[data-category="${existingDesignerData.category}"]`);
      if (match) {
        document.querySelectorAll('.category-option').forEach(o => o.classList.remove('selected'));
        match.classList.add('selected');
      }
    }
  } catch (error) {
    console.error('Failed to load categories:', error);
  }
}

function setupLogoUpload() {
  const area = document.getElementById('logoUploadArea');
  const btn = document.getElementById('logoUploadBtn');
  const input = document.getElementById('logoFileInput');
  const preview = document.getElementById('logoPreview');
  const content = document.getElementById('logoUploadContent');
  const img = document.getElementById('logoPreviewImage');
  const changeBtn = document.getElementById('logoChangeBtn');

  if (!area || !input) return;

  area.addEventListener('click', (e) => {
    if (e.target !== input && e.target !== changeBtn && !e.target.closest('.toggle-password')) {
      input.click();
    }
  });
  btn?.addEventListener('click', (e) => { e.stopPropagation(); input.click(); });
  changeBtn?.addEventListener('click', (e) => { e.stopPropagation(); input.click(); });

  input.addEventListener('change', function(e) {
    const file = this.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { alert('Please select an image file (JPG, PNG, etc.)'); return; }
    if (file.size > 2 * 1024 * 1024) { alert('Image file must be less than 2MB'); return; }
    uploadDesignerLogo(file);
  });

  area.addEventListener('dragover', (e) => {
    e.preventDefault();
    area.style.borderColor = 'var(--primary)';
    area.style.backgroundColor = 'rgba(52, 131, 224, 0.1)';
  });
  area.addEventListener('dragleave', (e) => {
    e.preventDefault();
    area.style.borderColor = '';
    area.style.backgroundColor = '';
  });
  area.addEventListener('drop', (e) => {
    e.preventDefault();
    area.style.borderColor = '';
    area.style.backgroundColor = '';
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      const dt = new DataTransfer();
      dt.items.add(file);
      input.files = dt.files;
      input.dispatchEvent(new Event('change'));
    }
  });
}

async function uploadDesignerLogo(file) {
  const UPLOAD_PRESET = 'seller_logo_unsigned';
  const img = document.getElementById('logoPreviewImage');
  const content = document.getElementById('logoUploadContent');
  const preview = document.getElementById('logoPreview');

  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', UPLOAD_PRESET);
  formData.append('folder', 'designers/logos');

  img.src = 'https://i.gifer.com/ZZ5H.gif';
  content.style.display = 'none';
  preview.style.display = 'flex';

  try {
    const res = await API.uploadImage(formData);
    designerLogoUrl = res.secure_url;
    img.src = designerLogoUrl;
  } catch (err) {
    alert('Logo upload failed. Try again.');
    console.error(err);
    designerLogoUrl = null;
    content.style.display = 'block';
    preview.style.display = 'none';
  }
}

// ── Form Submission ────────────────────────────────────────
function setupFormSubmission() {
  const form = document.getElementById('designerSignupForm');
  const submitBtn = document.getElementById('submitBtn');
  if (!form || !submitBtn) return;

  form.addEventListener('submit', async function(e) {
    e.preventDefault();
    clearPassKeyError();

    const PassKey = document.getElementById('passKey').value.trim();
    const confirmPassKey = document.getElementById('confirmPassKey').value.trim();

    if (!PassKey) {
      showPassKeyError('Please create a designer PassKey to continue.');
      return;
    }
    if (PassKey.length < 6) {
      showPassKeyError('PassKey must be at least 6 characters.');
      return;
    }
    if (PassKey !== confirmPassKey) {
      showPassKeyError('PassKeys do not match.');
      return;
    }

    const formData = {
      shopName: document.getElementById('shopName').value.trim(),
      shopBio: document.getElementById('shopBio').value.trim(),
      whatsapp_number: document.getElementById('whatsappNumber').value.trim(),
      location: document.getElementById('operatingLocation').value.trim(),
      category: document.getElementById('selectedCategory').value,
      passKey: PassKey,
      logoUrl: designerLogoUrl ? designerLogoUrl: ''
    };

    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
    submitBtn.disabled = true;

    try {
      let response;
      if (isEditMode) {
        response = await API.updateDesignerProfile(formData);
      } else {
        response = await API.openStore(formData);
      }

      submitBtn.disabled = false;
      submitBtn.innerHTML = originalText;

      if (response?.success) {
        alert(isEditMode ? 'Brand profile updated successfully!' : 'Welcome to ONTROPP! Your designer brand is live.');
        window.location.href = 'designerDashboard.html';
      } else {
        throw new Error(response?.message || 'Failed to save designer profile.');
      }
    } catch (error) {
      console.error('Designer form error:', error);
      alert(error.message || 'Failed to save. Please try again.');
      submitBtn.innerHTML = originalText;
      submitBtn.disabled = false;
    }
  });
}

function showPassKeyError(message) {
  console.warn("key error")
  const el = document.getElementById('PassKey-error');
  if (!el) {
    console.warn("key error element not found")
    return;
  }
  el.textContent = message;
  el.style.display = 'block';
}

function clearPassKeyError() {
  const el = document.getElementById('PassKey-error');
  if (!el) return;
  el.textContent = '';
  el.style.display = 'none';
}
