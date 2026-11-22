import API from '/api.js';
import { updateElement, uuid } from '../utility/reconfig.js';
import { SpecEngine } from '../lab/specEngine.js';
import { showToast } from '../toast.js';
import { ImageUploader } from '../widgets/ImageUploader.js';

const DRAFT_KEY = 'ontropp:add-product:draft:v1';
const MAX_SPECS = 5;
const MAX_VALUES_PER_SPEC = 8;

let mode = 'creating';
let productId = null;
let specifications = [];
let currentCategoryId = null;
let uploader = null;

const engine = new SpecEngine();

document.addEventListener('DOMContentLoaded', async () => {
  // Read draft synchronously before anything async so uploader can pick it up
  try { detectRoute(); } catch (e) { console.error('[init] detectRoute', e); }

  if (mode === 'editing') {
    // We can't load product data synchronously, but we can still mount the uploader
    // without initial images and hydrate it later.
    setupImageUploader();
    try { await loadProductData(productId); }
    catch (e) { console.error('[init] load product failed', e); }
    // Push loaded images into the already-mounted uploader
    if (window.__initialImages && uploader) {
      uploader.reset(window.__initialImages);
      delete window.__initialImages;
    }
  } else {
    // Read draft FIRST, so the uploader constructor sees draft.images
    try { restoreDraftOrDefaults(); }
    catch (e) { console.error('[init] restore failed', e); }
    setupImageUploader();
  }

  try { await setupCategoryGrid(); }
  catch (e) { console.error('[init] categories failed', e); }

  try { setupSpecifications(); }
  catch (e) { console.error('[init] specs failed', e); }

  try { setupFormSubmission(); }
  catch (e) { console.error('[init] submit failed', e); }

  try { attachDraftListeners(); }
  catch (e) { console.error('[init] draft listeners failed', e); }

  document.getElementById('productName')?.focus();
});

/* ---------------- ROUTE ---------------- */
function detectRoute() {
  productId = new URLSearchParams(window.location.search).get('productId');
  if (productId) mode = 'editing';
}

async function loadProductData(id) {
  try {
    const response = await API.getProductById(id);
    autofillProductData(response.product);
  } catch (err) {
    console.error(err);
    showToast({ message: `Failed to load product data: ${err.message}` });
  }
}

function autofillProductData(data) {
  updateElement('productName', data.name, 'value');
  updateElement('productPrice', data.price, 'value');
  updateElement('productCondition', data.condition, 'value');
  updateElement('productDesc', data.description, 'value');
  if (data.availability) updateElement('productAvailability', data.availability, 'value');

  if (data.category) {
    currentCategoryId = data.category;
    const hidden = document.getElementById('selectedCategory');
    if (hidden) hidden.value = data.category;
    document.querySelector(`.category-option[data-id="${data.category}"]`)?.classList.add('selected');
  }

  specifications = Object.entries(data.specifications || {}).map(([name, value]) => ({
    id: uuid(),
    name,
    values: Array.isArray(value) ? value : String(value).split(' | ').filter(Boolean)
  }));

  // Defer uploader mount until after this — mount uses data.images
  window.__initialImages = data.images || [];
}

/* ---------------- IMAGE UPLOADER (OOP) ---------------- */
function setupImageUploader() {
  uploader = new ImageUploader({
    areaId:    'imageUploadArea',
    inputId:   'imageFileInput',
    gridId:    'imagePreviewGrid',
    counterId: 'imageCounter',
    btnId:     'imageUploadBtn',
    initialImages: window.__initialImages || [],
    onChange: () => scheduleDraftSave()
  });
  uploader.mount();
  delete window.__initialImages;
}

/* ---------------- DRAFT ---------------- */
function readDraft() {
  try { return JSON.parse(localStorage.getItem(DRAFT_KEY) || 'null'); }
  catch { return null; }
}
function clearDraft() {
  try { localStorage.removeItem(DRAFT_KEY); } catch {}
}
function collectDraft() {
  return {
    name: document.getElementById('productName')?.value.trim() || '',
    description: document.getElementById('productDesc')?.value.trim() || '',
    price: document.getElementById('productPrice')?.value || '',
    condition: document.getElementById('productCondition')?.value || '',
    availability: document.getElementById('productAvailability')?.value || '',
    category: currentCategoryId,
    images: uploader ? uploader.getImages() : [],
    specifications: specifications.map(s => ({ id: s.id, name: s.name, values: [...s.values] }))
  };
}
let draftTimer;
function scheduleDraftSave() {
  if (mode !== 'creating') return;
  clearTimeout(draftTimer);
  draftTimer = setTimeout(() => {
    const draft = collectDraft();
    const hasContent = draft.name || draft.description || draft.price ||
                       draft.images.length || draft.category ||
                       draft.specifications.some(s => s.name || s.values.length);
    try {
      if (hasContent) localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
      else clearDraft();
    } catch {}
  }, 500);
}
function attachDraftListeners() {
  if (mode !== 'creating') return;
  ['productName', 'productDesc', 'productPrice', 'productCondition', 'productAvailability']
    .forEach(id => {
      const el = document.getElementById(id);
      el?.addEventListener('input', scheduleDraftSave);
      el?.addEventListener('change', scheduleDraftSave);
    });
}
function restoreDraftOrDefaults() {
  const draft = readDraft();
  if (draft) {
    if (draft.name)         document.getElementById('productName').value = draft.name;
    if (draft.description)  document.getElementById('productDesc').value = draft.description;
    if (draft.price)        document.getElementById('productPrice').value = draft.price;
    if (draft.condition)    document.getElementById('productCondition').value = draft.condition;
    if (draft.availability) document.getElementById('productAvailability').value = draft.availability;

    if (draft.category) {
      currentCategoryId = draft.category;
      const hidden = document.getElementById('selectedCategory');
      if (hidden) hidden.value = draft.category;
      document.querySelector(`.category-option[data-id="${draft.category}"]`)?.classList.add('selected');
    }
    specifications = Array.isArray(draft.specifications) ? draft.specifications : [];
    window.__initialImages = (draft.images || []).filter(i => i.status !== 'uploading');
    showToast({ message: 'Restored your previous draft.', duration: 2500 });
    return;
  }
  specifications = [
    { id: uuid(), name: 'Material', values: [] },
    { id: uuid(), name: 'Color', values: [] }
  ];
}

/* ---------------- CATEGORY ---------------- */
async function setupCategoryGrid() {
  const grid = document.getElementById('categoryGrid');
  if (!grid) return;
  try {
    const categories = await API.getCategories('products');
    grid.innerHTML = '';
    categories.forEach(cat => {
      const div = document.createElement('div');
      div.className = 'category-option';
      div.dataset.id = cat.id;
      div.innerHTML = `
        <div class="category-icon"><i class="fas fa-${cat.icon || 'tag'}"></i></div>
        <div class="category-name">${cat.name}</div>
      `;
      div.addEventListener('click', () => {
        grid.querySelectorAll('.category-option').forEach(el => el.classList.remove('selected'));
        div.classList.add('selected');
        currentCategoryId = cat.id;
        const hidden = document.getElementById('selectedCategory');
        if (hidden) hidden.value = cat.id;
        scheduleDraftSave();
      });
      grid.appendChild(div);
    });
  } catch (err) { console.error(err); }
}

/* ---------------- SPECIFICATIONS ---------------- */
function setupSpecifications() {
  const addSpecBtn = document.getElementById('addSpecBtn');
  if (!addSpecBtn) return;

  addSpecBtn.addEventListener('click', () => {
    if (specifications.length >= MAX_SPECS) {
      showToast({ message: `Maximum of ${MAX_SPECS} specification fields.` });
      return;
    }
    specifications.push({ id: uuid(), name: '', values: [] });
    renderSpecifications();
    scheduleDraftSave();
  });

  document.addEventListener('click', (e) => {
    document.querySelectorAll('.suggestion-box.active').forEach(box => {
      const parent = box.parentElement;
      if (!box.contains(e.target) && !(parent && parent.contains(e.target))) {
        box.classList.remove('active');
      }
    });
  });

  renderSpecifications();
}

function renderSpecifications() {
  const container = document.getElementById('specificationsContainer');
  const addSpecBtn = document.getElementById('addSpecBtn');
  if (!container) return;

  container.innerHTML = '';

  if (specifications.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'spec-empty-hint';
    empty.textContent = 'No specifications yet — add fields like Material, Color, or Size.';
    container.appendChild(empty);
  }

  specifications.forEach((spec, index) => {
    const specEl = document.createElement('div');
    specEl.className = 'spec-group';
    specEl.dataset.id = spec.id;
    specEl.innerHTML = `
      <div class="spec-header">
        <div class="spec-field-wrap">
          <input type="text" class="form-control spec-field-input"
                 placeholder="Field name (e.g., Material)"
                 value="${escapeAttr(spec.name)}" maxlength="30" autocomplete="off">
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
                 placeholder="Type a value and press Enter"
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

  addSpecBtn?.classList.toggle('hidden', specifications.length >= MAX_SPECS);
}

function bindSpecGroupEvents(specEl, spec, index) {
  const fieldInput  = specEl.querySelector('.spec-field-input');
  const valueInput  = specEl.querySelector('.spec-value-input');
  const addValueBtn = specEl.querySelector('.add-value-btn');
  const fieldSugg   = specEl.querySelector('.field-suggestions');
  const valueSugg   = specEl.querySelector('.value-suggestions');
  const valuesList  = specEl.querySelector('.spec-values-list');
  const removeBtn   = specEl.querySelector('.remove-spec-btn');

  renderValueChips(valuesList, spec);

  const enableValue = () => {
    const on = spec.name.length > 0;
    valueInput.disabled = !on;
    addValueBtn.disabled = !on;
  };

  fieldInput.addEventListener('input', (e) => {
    spec.name = e.target.value.trim();
    enableValue();
    const sugg = engine.suggestFields(currentCategoryId, spec.name);
    renderSuggestions(fieldSugg, sugg, (label) => {
      fieldInput.value = label;
      spec.name = label;
      fieldSugg.classList.remove('active');
      enableValue();
      valueInput.focus();
      scheduleDraftSave();
    });
    scheduleDraftSave();
  });

  fieldInput.addEventListener('focus', () => {
    const sugg = engine.suggestFields(currentCategoryId, spec.name);
    renderSuggestions(fieldSugg, sugg, (label) => {
      fieldInput.value = label;
      spec.name = label;
      fieldSugg.classList.remove('active');
      enableValue();
      scheduleDraftSave();
    });
  });

  valueInput.addEventListener('input', (e) => {
    const sugg = engine.suggestValues(spec.name, currentCategoryId, e.target.value);
    renderSuggestions(valueSugg, sugg, (label) => {
      addValueToSpec(spec, label, valuesList);
      valueInput.value = '';
      valueSugg.classList.remove('active');
      valueInput.focus();      // ← stay in the value field
    });
  });

  valueInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();      // don't submit form / don't advance
      const v = valueInput.value.trim();
      if (v) {
        addValueToSpec(spec, v, valuesList);
        valueInput.value = '';
        valueSugg.classList.remove('active');
        valueInput.focus();    // ← keep focus here for multiple values
      }
    }
  });

  addValueBtn.addEventListener('click', () => {
    const v = valueInput.value.trim();
    if (v) {
      addValueToSpec(spec, v, valuesList);
      valueInput.value = '';
      valueInput.focus();
    }
  });

  removeBtn.addEventListener('click', () => {
    specifications.splice(index, 1);
    renderSpecifications();
    scheduleDraftSave();
  });
}

function renderValueChips(valuesList, spec) {
  valuesList.innerHTML = '';
  spec.values.forEach((val, valIndex) => {
    const chip = document.createElement('div');
    chip.className = 'spec-value-chip';
    chip.innerHTML = `<span>${escapeAttr(val)}</span>
      <button type="button" class="remove-value" aria-label="Remove value"><i class="fas fa-times"></i></button>`;
    chip.querySelector('.remove-value').addEventListener('click', () => {
      spec.values.splice(valIndex, 1);
      renderValueChips(valuesList, spec);
      scheduleDraftSave();
    });
    valuesList.appendChild(chip);
  });
}

function addValueToSpec(spec, value, valuesList) {
  const v = String(value || '').trim();
  if (!v) return;
  if (spec.values.length >= MAX_VALUES_PER_SPEC) {
    showToast({ message: `Maximum of ${MAX_VALUES_PER_SPEC} values per field.` });
    return;
  }
  if (spec.values.includes(v)) return;
  spec.values.push(v);
  renderValueChips(valuesList, spec);
  scheduleDraftSave();
}

function renderSuggestions(box, items, onSelect) {
  box.innerHTML = '';
  if (!items || items.length === 0) {
    box.innerHTML = `<div class="suggestion-empty">No matches — you can type your own</div>`;
  } else {
    items.forEach(item => {
      const label = typeof item === 'string' ? item : item.name;
      const icon  = typeof item === 'object' && item.icon ? item.icon : null;
      const div = document.createElement('div');
      div.className = 'suggestion-item';
      div.innerHTML = icon
        ? `<i class="fas ${icon}"></i><span>${escapeAttr(label)}</span>`
        : escapeAttr(label);
      div.addEventListener('click', (e) => { e.preventDefault(); onSelect(label); });
      box.appendChild(div);
    });
  }
  box.classList.add('active');
}

function escapeAttr(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;').replace(/"/g, '&quot;')
    .replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/* ---------------- SUBMIT ---------------- */
function setupFormSubmission() {
  const form = document.getElementById('uploadForm');
  const submitBtn = form?.querySelector('button[type="submit"]');
  if (!form || !submitBtn) return;

  form.addEventListener('submit', async function (e) {
    e.preventDefault();

    if (uploader.hasPendingUploads()) {
      showToast({ message: 'Please wait for all images to finish uploading.' });
      return;
    }
    const images = uploader.getImages();
    if (images.length === 0) {
      showToast({ message: 'Please upload at least one product image.' });
      return;
    }

    const specsObject = {};
    specifications.forEach(spec => {
      if (spec.name.trim() && spec.values.length > 0) {
        specsObject[spec.name.trim()] = spec.values;
      }
    });

    const formData = {
      name: document.getElementById('productName').value.trim(),
      description: document.getElementById('productDesc').value.trim(),
      price: parseFloat(document.getElementById('productPrice').value),
      condition: document.getElementById('productCondition').value,
      availability: document.getElementById('productAvailability')?.value,
      category: currentCategoryId || document.getElementById('selectedCategory')?.value,
      images,
      cover_image: images[0],
      specifications: Object.keys(specsObject).length > 0 ? specsObject : null
    };

    if (!formData.name || !formData.description || !formData.price ||
        !formData.category || !formData.condition) {
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
        clearDraft();
        showToast({ message: 'Product listed successfully!', duration: 3000 });
        setTimeout(() => { window.location.href = 'dashboard.html'; }, 1500);
      }
    } catch (error) {
      console.error(error);
      showToast({ message: error.message || 'Failed to list product. Please try again.' });
      submitBtn.innerHTML = originalText;
      submitBtn.disabled = false;
    }
  });
}