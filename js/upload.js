import API from '../api.js';

document.addEventListener('DOMContentLoaded', function() {
  setupImageUpload();
  setupFormSubmission();
});

// Store uploaded image URLs (similar to sellerLogoUrl)
let productImageUrls = [];

function setupImageUpload() {
  const imageUploadArea = document.getElementById('imageUploadArea');
  const imageUploadBtn = document.getElementById('imageUploadBtn');
  const imageFileInput = document.getElementById('imageFileInput');
  
  if (!imageUploadArea || !imageFileInput) return;
  
  const maxImages = 5;
  
  // Click handlers (same pattern as seller signup)
  imageUploadArea.addEventListener('click', (e) => {
    if (e.target !== imageFileInput && !e.target.closest('.image-remove-btn')) {
      imageFileInput.click();
    }
  });
  
  imageUploadBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    imageFileInput.click();
  });
  
  // Handle file selection - now uploads immediately like seller logo
  imageFileInput.addEventListener('change', function(e) {
    const files = Array.from(this.files);
    
    // Check max images limit
    if (productImageUrls.length + files.length > maxImages) {
      alert(`You can only upload up to ${maxImages} images. Remove some images first.`);
      this.value = '';
      return;
    }
    
    // Upload each file immediately (parallel uploads like seller logo pattern)
    files.forEach(file => {
      if (!file.type.startsWith('image/')) {
        alert(`"${file.name}" is not an image file`);
        return;
      }
      
      if (file.size > 2 * 1024 * 1024) {
        alert(`Image "${file.name}" is too large. Must be less than 2MB`);
        return;
      }
      
      // Upload immediately - matches seller logo pattern
      uploadProductImage(file);
    });
    
    this.value = '';
  });
  
  // Drag and drop (same pattern as seller signup)
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
      // Check limit before processing drop
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
    
    // Replace placeholder with actual URL
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
    
    // Remove failed upload from array
    productImageUrls = productImageUrls.filter(img => img.id !== tempId);
    updateImagePreview();
  }
}

// Update preview - similar structure but handles array instead of single image
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
  
  // Remove button handlers
  document.querySelectorAll('.image-remove-btn').forEach(btn => {
    btn.addEventListener('click', function(e) {
      e.stopPropagation();
      const index = parseInt(this.dataset.index);
      productImageUrls.splice(index, 1);
      updateImagePreview();
    });
  });
}

function setupFormSubmission() {
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
    const coverImage = completedImages[0];
    
    const formData = {
      name: document.getElementById('productName').value.trim(),
      description: document.getElementById('productDescription').value.trim(),
      price: parseFloat(document.getElementById('productPrice').value),
      category: document.getElementById('productCategory').value,
      cover_image: coverImage,
      images: completedImages
    };
    
    // Validation
    if (!formData.name || !formData.description || !formData.price || !formData.category) {
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
      const response = await API.createProduct(formData);
      
      alert('Product listed successfully!');
      window.location.href = 'dashboard.html';
    } catch (error) {
      console.error('Failed to add product:', error);
      alert(error.message || 'Failed to list product. Please try again.');
      
      submitBtn.innerHTML = originalText;
      submitBtn.disabled = false;
    }
  });
  
  document.getElementById('productName')?.focus();
}

