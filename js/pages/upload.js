import API from '../../api.js';
import {showNotification, updateElement} from '../utility/reconfig.js';

document.addEventListener('DOMContentLoaded', async function() {
  setupRoute();
  setupImageUpload();
  setupSpecifications();
  setupFormSubmission();
});


// Store uploaded image URLs
let mode = 'creating'
let productId = null
let productImageUrls = [];
let specifications = [];

async function setupRoute() {
  const urlParams = new URLSearchParams(window.location.search);
  productId = urlParams.get('productId');
  if (productId) {
    mode = 'editing';
    
    updateElement('productName', 'loading...', 'placeholder');
    updateElement('productPrice', 'loading...', 'placeholder');
    updateElement('productDescription', 'loading...', 'placeholder');
  
    await loadProductData(productId);
  }
}

async function loadProductData(productId) {
  try {
    const response = await API.getProductById(productId);
    const productData = response.product;
    
    console.log(productData);
    autofillProductData(productData);
  } catch (err) {
    console.error('Falied to load product data', err)
    showNotification(`failed to load product data: ${err}`, 'error')
  }
}

function autofillProductData(data) {
  updateElement('productName', data.name, 'value');
  updateElement('productPrice', data.price, 'value');
  updateElement('productCondition', data.condition, 'value');
  updateElement('productCategory', data.category, 'value');
  updateElement('productDescription', data.description);

  // Specifications
  specifications = Object.entries(data.specifications || {}).map(
    ([name, value]) => ({
      id: crypto.randomUUID(),
      name,
      value
    })
  );
  renderSpecifications();

  // Images
  productImageUrls = (data.images || []).map(url => ({
    id: crypto.randomUUID(),
    url,
    status: 'complete'
  }));
  updateImagePreview();
}

// ========== IMAGE UPLOAD (unchanged logic) ==========
function setupImageUpload() {
  const imageUploadArea = document.getElementById('imageUploadArea');
  const imageUploadBtn = document.getElementById('imageUploadBtn');
  const imageFileInput = document.getElementById('imageFileInput');
  
  if (!imageUploadArea || !imageFileInput) return;
  
  const maxImages = 5;
  
  imageUploadArea.addEventListener('click', (e) => {
    if (e.target !== imageFileInput && !e.target.closest('.image-remove-btn')) {
      imageFileInput.click();
    }
  });
  
  imageUploadBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    imageFileInput.click();
  });
  
  imageFileInput.addEventListener('change', function(e) {
    const files = Array.from(this.files);
    
    if (productImageUrls.length + files.length > maxImages) {
      alert(`You can only upload up to ${maxImages} images. Remove some images first.`);
      this.value = '';
      return;
    }
    
    files.forEach(file => {
      if (!file.type.startsWith('image/')) {
        alert(`"${file.name}" is not an image file`);
        return;
      }
      
      if (file.size > 2 * 1024 * 1024) {
        alert(`Image "${file.name}" is too large. Must be less than 2MB`);
        return;
      }
      
      uploadProductImage(file);
    });
    
    this.value = '';
  });
  
  imageUploadArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    imageUploadArea.style.borderColor = 'var(--primary)';
    imageUploadArea.style.backgroundColor = 'rgba(52, 131, 224, 0.1)';
  });
  
  imageUploadArea.addEventListener('dragleave', (e) => {
    e.preventDefault();
    imageUploadArea.style.borderColor = '';
    imageUploadArea.style.backgroundColor = '';
  });
  
  imageUploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    imageUploadArea.style.borderColor = '';
    imageUploadArea.style.backgroundColor = '';
    
    const files = Array.from(e.dataTransfer.files).filter(file => 
      file.type.startsWith('image/')
    );
    
    if (files.length > 0) {
      if (productImageUrls.length + files.length > maxImages) {
        alert(`You can only upload up to ${maxImages} images. Remove some images first.`);
        return;
      }
      
      files.forEach(file => uploadProductImage(file));
    }
  });
}

async function uploadProductImage(file) {
  const UPLOAD_PRESET = 'product_images_unsigned'; 
  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', UPLOAD_PRESET);
  formData.append('folder', 'products/images'); 
  
  const tempId = Date.now() + Math.random();
  productImageUrls.push({
    id: tempId,
    url: 'https://i.gifer.com/ZZ5H.gif',
    status: 'uploading'
  });
  updateImagePreview();
  
  try {
    const res = await API.uploadImage(formData);
    
    const index = productImageUrls.findIndex(img => img.id === tempId);
    if (index !== -1) {
      productImageUrls[index] = {
        id: tempId,
        url: res.secure_url,
        status: 'complete'
      };
      updateImagePreview();
    }
  } catch (err) {
    alert(`Failed to upload "${file.name}". Please try again.`);
    console.error(err);
    
    productImageUrls = productImageUrls.filter(img => img.id !== tempId);
    updateImagePreview();
  }
}

function updateImagePreview() {
  const imagePreviewGrid = document.getElementById('imagePreviewGrid');
  const imageUploadContent = document.getElementById('imageUploadContent');
  
  if (!imagePreviewGrid || !imageUploadContent) return;
  
  if (productImageUrls.length === 0) {
    imageUploadContent.style.display = 'flex';
    imagePreviewGrid.style.display = 'none';
    return;
  }
  
  imageUploadContent.style.display = 'none';
  imagePreviewGrid.style.display = 'grid';
  imagePreviewGrid.innerHTML = '';
  
  productImageUrls.forEach((image, index) => {
    const previewItem = document.createElement('div');
    previewItem.className = 'image-preview-item';
    
    previewItem.innerHTML = `
      <img src="${image.url}" alt="Product image ${index + 1}" 
           style="${image.status === 'uploading' ? 'opacity: 0.7;' : ''}">
      <button type="button" class="image-remove-btn" data-index="${index}">
        <i class="fas fa-times"></i>
      </button>
    `;
    
    imagePreviewGrid.appendChild(previewItem);
  });
  
  document.querySelectorAll('.image-remove-btn').forEach(btn => {
    btn.addEventListener('click', function(e) {
      e.stopPropagation();
      const index = parseInt(this.dataset.index);
      productImageUrls.splice(index, 1);
      updateImagePreview();
    });
  });
}

// ========== SPECIFICATIONS (NEW) ==========
function setupSpecifications() {
  const addSpecBtn = document.getElementById('addSpecBtn');
  const container = document.getElementById('specificationsContainer');
  
  if (!addSpecBtn || !container) return;
  
  const maxSpecs = 5;
  
  addSpecBtn.addEventListener('click', () => {
    if (specifications.length >= maxSpecs) return;
    
    const specId = Date.now();
    specifications.push({ id: specId, name: '', value: '' });
    renderSpecifications();
  });
}

function renderSpecifications() {
  const container = document.getElementById('specificationsContainer');
  const addSpecBtn = document.getElementById('addSpecBtn');
  const maxSpecs = 5;
  
  if (!container) return;
  
  // Clear and rebuild
  container.innerHTML = '';
  
  specifications.forEach((spec, index) => {
    const specEl = document.createElement('div');
    specEl.className = 'spec-item';
    specEl.innerHTML = `
      <input 
        type="text" 
        class="spec-name" 
        placeholder="e.g., Color, Size" 
        value="${spec.name}"
        maxlength="20"
      >
      <input 
        type="text" 
        class="spec-value" 
        placeholder="e.g., Red, Large" 
        value="${spec.value}"
        maxlength="30"
      >
      <button type="button" class="remove-spec-btn" data-id="${spec.id}">
        <i class="fas fa-trash"></i>
      </button>
    `;
    
    // Bind input events
    const nameInput = specEl.querySelector('.spec-name');
    const valueInput = specEl.querySelector('.spec-value');
    
    nameInput.addEventListener('input', (e) => {
      specifications[index].name = e.target.value.trim();
    });
    
    valueInput.addEventListener('input', (e) => {
      specifications[index].value = e.target.value.trim();
    });
    
    // Bind delete
    specEl.querySelector('.remove-spec-btn').addEventListener('click', () => {
      specifications.splice(index, 1);
      renderSpecifications();
    });
    
    container.appendChild(specEl);
  });
  
  // Show/hide add button based on limit
  if (specifications.length >= maxSpecs) {
    addSpecBtn.classList.add('hidden');
  } else {
    addSpecBtn.classList.remove('hidden');
  }
}

// ========== FORM SUBMISSION (UPDATED) ==========
async function setupFormSubmission() {
  const form = document.getElementById('productForm');
  const submitBtn = document.getElementById('submitBtn');
  
  if (!form || !submitBtn) return;
  
  form.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const completedImages = productImageUrls
      .filter(img => img.status === 'complete')
      .map(img => img.url);
    
    if (completedImages.length === 0) {
      alert('Please upload at least one product image');
      return;
    }
    
    // Build specifications object from array (filter out empty ones)
    const specsObject = {};
    specifications.forEach(spec => {
      if (spec.name.trim() && spec.value.trim()) {
        specsObject[spec.name.trim()] = spec.value.trim();
      }
    });
    
    const formData = {
      name: document.getElementById('productName').value.trim(),
      description: document.getElementById('productDescription').value.trim(),
      price: parseFloat(document.getElementById('productPrice').value),
      condition: document.getElementById('productCondition').value, // NEW
      category: document.getElementById('productCategory').value,
      cover_image: completedImages[0],
      images: completedImages,
      specifications: Object.keys(specsObject).length > 0 ? specsObject : null // NEW
    };
    
    // Validation
    if (!formData.name || !formData.description || !formData.price || !formData.category || !formData.condition) {
      alert('Please fill in all required fields');
      return;
    }
    
    if (formData.price <= 0) {
      alert('Please enter a valid price');
      return;
    }
    
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Listing...';
    submitBtn.disabled = true;
    
    try {
      let response = null;
      if (mode === 'editing') {
        response = await API.updateProduct(productId, formData);
      } else {
        response = await API.createProduct(formData);
      }
      
      if (response.success) {
        showNotification('product listed sucessfully', 'success');
        window.location.href = 'dashboard.html';
      }
    } catch (error) {
      console.error('Failed to add product:', error);
      alert(error.message || 'Failed to list product. Please try again.');
      
      submitBtn.innerHTML = originalText;
      submitBtn.disabled = false;
    }
  });
  
  document.getElementById('productName')?.focus();
}

