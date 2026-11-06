import API from '/api.js';
import { showNotification, updateElement } from '../utility/reconfig.js';
import { SpecEngine } from '../lab/specEngine.js';
import { showToast } from '../toast.js';

document.addEventListener('DOMContentLoaded', async function() {
  setupRoute();
  setupImageUpload();
  setupSpecifications();
  setupFormSubmission();
});

let mode = 'creating';
let productId = null;
let productImageUrls = [];
let specifications = [];
let currentCategoryId = null;

const engine = new SpecEngine();
const MAX_SPECS = 5;
const MAX_VALUES_PER_SPEC = 8;
const MAX_IMAGES = 5;

// ========== ROUTE ==========
async function setupRoute() {
  const urlParams = new URLSearchParams(window.location.search);
  productId = urlParams.get('productId');
  if (productId) {
    mode = 'editing';
    updateElement('productName', 'loading...', 'placeholder');
    updateElement('productPrice', 'loading...', 'placeholder');
    updateElement('productDesc', 'loading...', 'placeholder');
    await loadProductData(productId);
  }
}

async function loadProductData(productId) {
  try {
    const response = await API.getProductById(productId);
    autofillProductData(response.product);
  } catch (err) {
    console.error('Failed to load product data', err);
    showToast({ message: `Failed to load product data: ${err.message}` });
  }
}

function autofillProductData(data) {
  updateElement('productName', data.name, 'value');
  updateElement('productPrice', data.price, 'value');
  updateElement('productCondition', data.condition, 'value');
  updateElement('productDesc', data.description, 'value');

  if (data.category) {
    currentCategoryId = data.category;
    const hidden = document.getElementById('selectedCategory');
    if (hidden) hidden.value = data.category;
    const tile = document.querySelector(`.category-option[data-id="${data.category}"]`);
    if (tile) tile.classList.add('selected');
  }

  specifications = Object.entries(data.specifications || {}).map(
    ([name, value]) => ({
      id: crypto.randomUUID(),
      name,
      values: Array.isArray(value) ? value : value.split(' | ').filter(Boolean)
    })
  );
  renderSpecifications();

  productImageUrls = (data.images || []).map(img => {
    if (typeof img === 'string') {
      return { id: crypto.randomUUID(), url: img, width: null, height: null, aspect_ratio: null, status: 'complete' };
    }
    return {
      id: img.id ?? crypto.randomUUID(),
      url: img.url,
      width: img.width ?? null,
      height: img.height ?? null,
      aspect_ratio: img.aspect_ratio ?? null,
      status: 'complete'
    };
  });
  updateImagePreview();
}

// ========== IMAGE DIMENSIONS ==========
async function getImageDimensions(file) {
  if ('createImageBitmap' in window) {
    const bmp = await createImageBitmap(file);
    const dims = { width: bmp.width, height: bmp.height, aspect_ratio: bmp.width / bmp.height };
    bmp.close?.();
    return dims;
  }
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const dims = { width: img.naturalWidth, height: img.naturalHeight, aspect_ratio: img.naturalWidth / img.naturalHeight };
      URL.revokeObjectURL(url);
      resolve(dims);
    };
    img.onerror = (e) => { URL.revokeObjectURL(url); reject(e); };
    img.src = url;
  });
}

// ========== IMAGE UPLOAD ==========
function setupImageUpload() {
  const imageUploadArea = document.getElementById('imageUploadArea');
  const imageFileInput = document.getElementById('imageFileInput');
  if (!imageUploadArea || !imageFileInput) return;

  imageFileInput.addEventListener('change', function() {
    const files = Array.from(this.files);
    if (productImageUrls.length + files.length > MAX_IMAGES) {
      showToast({ message: `You can only upload up to ${MAX_IMAGES} images.` });
      this.value = '';
      return;
    }
    files.forEach(file => {
      if (!file.type.startsWith('image/')) {
        showToast({ message: `"${file.name}" is not an image file.` });
        return;
      }
      if (file.size > 2 * 1024 * 1024) {
        showToast({ message: `Image "${file.name}" is too large. Must be less than 2MB.` });
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
    const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
    if (!files.length) return;
    if (productImageUrls.length + files.length > MAX_IMAGES) {
      showToast({ message: `You can only upload up to ${MAX_IMAGES} images.` });
      return;
    }
    files.forEach(file => uploadProductImage(file));
  });
}

async function uploadProductImage(file) {
  const tempId = crypto.randomUUID();

  let meta = { width: null, height: null, aspect_ratio: 0.8 };
  try { meta = await getImageDimensions(file); } catch {}

  productImageUrls.push({ id: tempId, url: 'https://i.gifer.com/ZZ5H.gif', status: 'uploading', ...meta });
  updateImagePreview();

  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', 'product_images_unsigned');
  formData.append('folder', 'products/images');

  try {
    const res = await API.uploadImage(formData);
    const idx = productImageUrls.findIndex(i => i.id === tempId);
    if (idx !== -1) {
      productImageUrls[idx] = { ...productImageUrls[idx], url: res.secure_url, status: 'complete' };
      updateImagePreview();
    }
  } catch (err) {
    showToast({ message: `Failed to upload "${file.name}". Please try again.` });
    console.error(err);
    productImageUrls = productImageUrls.filter(i => i.id !== tempId);
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
      ${index === 0 ? '<span class="cover-badge">Cover</span>' : ''}
      <button type="button" class="image-remove-btn" data-index="${index}">
        <i class="fas fa-times"></i>
      </button>
    `;
    imagePreviewGrid.appendChild(previewItem);
  });

  document.querySelectorAll('.image-remove-btn').forEach(btn => {
    btn.addEventListener('click', function(e) {
      e.stopPropagation();
      productImageUrls.splice(parseInt(this.dataset.index), 1);
      updateImagePreview();
    });
  });
}

// ========== CATEGORY GRID ==========
function setupCategoryGrid() {
  const grid = document.getElementById('categoryGrid');
  if (!grid) return;

  const categories = [
    { id: 'textiles', name: 'Textiles', icon: 'scroll' },
    { id: 'tailoring', name: 'Tailoring', icon: 'cut' },
    { id: 'jewellery', name: 'Jewellery', icon: 'gem' },
    { id: 'objects', name: 'Objects', icon: 'shapes' },
    { id: 'beauty', name: 'Beauty', icon: 'spa' },
    { id: 'crafts', name: 'Arts & Crafts', icon: 'stamp' }
  ];

  grid.innerHTML = '';
  categories.forEach(cat => {
    const div = document.createElement('div');
    div.className = 'category-option';
    div.dataset.id = cat.id;
    div.innerHTML = `
      <div class="category-icon"><i class="fas fa-${cat.icon}"></i></div>
      <div class="category-name">${cat.name}</div>
    `;
    div.addEventListener('click', () => {
      document.querySelectorAll('.category-option').forEach(el => el.classList.remove('selected'));
      div.classList.add('selected');
      currentCategoryId = cat.id;
      const hidden = document.getElementById('selectedCategory');
      if (hidden) hidden.value = cat.id;
    });
    grid.appendChild(div);
  });
}

// ========== SPECIFICATIONS ==========
function setupSpecifications() {
  setupCategoryGrid();

  const addSpecBtn = document.getElementById('addSpecBtn');
  const container = document.getElementById('specificationsContainer');
  if (!addSpecBtn || !container) return;

  addSpecBtn.addEventListener('click', () => {
    if (specifications.length >= MAX_SPECS) {
      showToast({ message: `Maximum of ${MAX_SPECS} specification fields allowed.` });
      return;
    }
    specifications.push({ id: crypto.randomUUID(), name: '', values: [] });
    renderSpecifications();
  });

  if (specifications.length > 0) renderSpecifications();
}

function renderSpecifications() {
  const container = document.getElementById('specificationsContainer');
  const addSpecBtn = document.getElementById('addSpecBtn');
  if (!container) return;

  container.innerHTML = '';

  specifications.forEach((spec, index) => {
    const specEl = document.createElement('div');
    specEl.className = 'spec-group';
    specEl.dataset.id = spec.id;

    specEl.innerHTML = `
      <div class="spec-header">
        <div style="flex: 1; position: relative;">
          <input type="text" class="form-control spec-field-input"
                 placeholder="e.g., Material, Color"
                 value="${spec.name}" maxlength="30" autocomplete="off">
          <div class="suggestion-box field-suggestions"></div>
        </div>
        <button type="button" class="remove-spec-btn" aria-label="Remove field">
          <i class="fas fa-trash"></i>
        </button>
      </div>
      <div class="spec-values-container">
        <div class="spec-values-list"></div>
        <div class="spec-value-input-wrapper">
          <input type="text" class="form-control spec-value-input"
                 placeholder="Add a value (e.g., Cotton)"
                 autocomplete="off" ${spec.name ? '' : 'disabled'}>
          <button type="button" class="btn btn-small btn-outline add-value-btn"
                  ${spec.name ? '' : 'disabled'}>Add</button>
        </div>
        <div class="suggestion-box value-suggestions"></div>
      </div>
    `;

    container.appendChild(specEl);
    bindSpecGroupEvents(specEl, spec, index);
  });

  if (specifications.length >= MAX_SPECS) addSpecBtn.classList.add('hidden');
  else addSpecBtn.classList.remove('hidden');
}

function bindSpecGroupEvents(specEl, spec, index) {
  const fieldInput = specEl.querySelector('.spec-field-input');
  const valueInput = specEl.querySelector('.spec-value-input');
  const addValueBtn = specEl.querySelector('.add-value-btn');
  const fieldSugg = specEl.querySelector('.field-suggestions');
  const valueSugg = specEl.querySelector('.value-suggestions');
  const valuesList = specEl.querySelector('.spec-values-list');
  const removeBtn = specEl.querySelector('.remove-spec-btn');

  renderValueChips(valuesList, spec);

  fieldInput.addEventListener('input', (e) => {
    spec.name = e.target.value.trim();
    const hasName = spec.name.length > 0;
    valueInput.disabled = !hasName;
    addValueBtn.disabled = !hasName;

    const suggestions = engine.suggestFields(currentCategoryId, spec.name);
    renderSuggestions(fieldSugg, suggestions, (selected) => {
      fieldInput.value = selected;
      spec.name = selected;
      fieldSugg.classList.remove('active');
      valueInput.disabled = false;
      addValueBtn.disabled = false;
      valueInput.focus();
    });
  });

  fieldInput.addEventListener('focus', () => {
    const suggestions = engine.suggestFields(currentCategoryId, spec.name);
    renderSuggestions(fieldSugg, suggestions, (selected) => {
      fieldInput.value = selected;
      spec.name = selected;
      fieldSugg.classList.remove('active');
      valueInput.disabled = false;
      addValueBtn.disabled = false;
    });
  });

  valueInput.addEventListener('input', (e) => {
    const suggestions = engine.suggestValues(spec.name, currentCategoryId, e.target.value);
    renderSuggestions(valueSugg, suggestions, (selected) => {
      addValueToSpec(spec, selected, valuesList);
      valueInput.value = '';
      valueSugg.classList.remove('active');
    });
  });

  valueInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (valueInput.value.trim()) {
        addValueToSpec(spec, valueInput.value.trim(), valuesList);
        valueInput.value = '';
        valueSugg.classList.remove('active');
      }
    }
  });

  addValueBtn.addEventListener('click', () => {
    if (valueInput.value.trim()) {
      addValueToSpec(spec, valueInput.value.trim(), valuesList);
      valueInput.value = '';
    }
  });

  removeBtn.addEventListener('click', () => {
    specifications.splice(index, 1);
    renderSpecifications();
  });

  document.addEventListener('click', (e) => {
    if (!fieldInput.contains(e.target) && !fieldSugg.contains(e.target)) {
      fieldSugg.classList.remove('active');
    }
    if (!valueInput.contains(e.target) && !valueSugg.contains(e.target)) {
      valueSugg.classList.remove('active');
    }
  });
}

function renderValueChips(valuesList, spec) {
  valuesList.innerHTML = '';
  spec.values.forEach((val, valIndex) => {
    const chip = document.createElement('div');
    chip.className = 'spec-value-chip';
    chip.innerHTML = `<span>${val}</span>
      <button type="button" class="remove-value" aria-label="Remove value"><i class="fas fa-times"></i></button>`;
    chip.querySelector('.remove-value').addEventListener('click', () => {
      spec.values.splice(valIndex, 1);
      renderValueChips(valuesList, spec);
    });
    valuesList.appendChild(chip);
  });
}

function addValueToSpec(spec, value, valuesList) {
  if (spec.values.length >= MAX_VALUES_PER_SPEC) {
    showToast({ message: `Maximum of ${MAX_VALUES_PER_SPEC} values per field.` });
    return;
  }
  if (spec.values.includes(value)) return;
  spec.values.push(value);
  renderValueChips(valuesList, spec);
}

function renderSuggestions(box, items, onSelect) {
  box.innerHTML = '';
  if (items.length === 0) {
    box.innerHTML = `<div class="suggestion-empty">Type and press Enter to add custom value</div>`;
  } else {
    items.forEach(item => {
      const div = document.createElement('div');
      div.className = 'suggestion-item';
      div.textContent = item;
      div.addEventListener('click', () => onSelect(item));
      box.appendChild(div);
    });
  }
  box.classList.add('active');
}

// ========== FORM SUBMISSION ==========
async function setupFormSubmission() {
  const form = document.getElementById('uploadForm');           // ✅ matches HTML
  const submitBtn = form?.querySelector('button[type="submit"]');
  if (!form || !submitBtn) return;

  form.addEventListener('submit', async function(e) {
    e.preventDefault();

    if (productImageUrls.some(img => img.status === 'uploading')) {
      showToast({ message: 'Please wait for all images to finish uploading.' });
      return;
    }
    if (productImageUrls.length === 0) {
      showToast({ message: 'Please upload at least one product image.' });
      return;
    }

    const imageObjects = productImageUrls.map(img => ({
      id: img.id, url: img.url, width: img.width, height: img.height, aspect_ratio: img.aspect_ratio
    }));

    const specsObject = {};
    specifications.forEach(spec => {
      if (spec.name.trim() && spec.values.length > 0) {
        specsObject[spec.name.trim()] = spec.values;
      }
    });

    const formData = {
      name: document.getElementById('productName').value.trim(),
      description: document.getElementById('productDesc').value.trim(),      // ✅
      price: parseFloat(document.getElementById('productPrice').value),
      condition: document.getElementById('productCondition').value,
      availability: document.getElementById('productAvailability')?.value, // HTML has it
      category: currentCategoryId || document.getElementById('selectedCategory')?.value,
      images: imageObjects,
      cover_image: imageObjects[0],
      specifications: Object.keys(specsObject).length > 0 ? specsObject : null
    };

    if (!formData.name || !formData.description || !formData.price || !formData.category || !formData.condition) {
      showToast({ message: 'Please fill in all required fields.' });
      return;
    }
    if (formData.price <= 0) {
      showToast({ message: 'Please enter a valid price.' });
      return;
    }

    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Listing...';
    submitBtn.disabled = true;

    try {
      const response = mode === 'editing'
        ? await API.updateProduct(productId, formData)
        : await API.createProduct(formData);

      if (response.success) {
        showToast({ message: 'Product listed successfully!', duration: 3000 });
        setTimeout(() => { window.location.href = 'dashboard.html'; }, 1500);
      }
    } catch (error) {
      console.error('Failed to add product:', error);
      showToast({ message: error.message || 'Failed to list product. Please try again.' });
      submitBtn.innerHTML = originalText;
      submitBtn.disabled = false;
    }
  });

  document.getElementById('productName')?.focus();
}