import StoreApi from '../storeApi.js';
import API from '/api.js';
// import { ensureAuth } from "../../designers/js/authCheck.js";

import { Combobox } from '../uiTools/combobox.js';
import { showNotification } from '../utility/reconfig.js';

/* ============================================================
   STATE
   ============================================================ */
const state = {
  mode: 'create',              // 'create' | 'edit'
  designer: null,
  logoUrl: null,
  locationEditsRemaining: null,
  isSubmitting: false,
};

let stateCb = null;
let cityCb = null;
let pendingStateId = null;
let pendingCityId = null;

/* ============================================================
   BOOT
   ============================================================ */
document.addEventListener('DOMContentLoaded', boot);

async function boot() {
  try {
    await pingProfile();
    setupLogoUpload();
    setupBioCounter();
    await setupCategories();
    applyMode();
    initLocationUI();          // always init — single-step form
    setupFormSubmission();
  } catch (err) {
    console.error('[designerSignup] boot failed:', err);
    showNotification('Failed to load your profile. Please refresh.', 'error');
  } finally {
    hidePageLoader();
  }
}

/* ============================================================
   PROFILE PING + MODE
   ============================================================ */
async function pingProfile() {
  try {
    const data = await StoreApi.getDesignerInfo();

    if (!data || !data.brand_name) {
      await API.tokenPing();
      state.mode = 'create';
      state.designer = null;
      return;
    }

    state.designer = data;
    state.logoUrl = data.logoUrl || null;
    state.mode = 'edit';

    state.locationEditsRemaining =
      typeof data.locationEditsRemaining === 'number'
        ? data.locationEditsRemaining
        : null;
  } catch (err) {
    if (err?.status === 404) {
      state.mode = 'create';
      state.designer = null;
      return;
    }
    throw err;
  }
}

/* ============================================================
   APPLY MODE
   ============================================================ */
function applyMode() {
  const titleEl = document.getElementById('pageTitle');
  const subEl = document.getElementById('pageSubtitle');
  const btnText = document.getElementById('submitBtnText');

  if (state.mode === 'create') {
    titleEl.textContent = 'Launch Your Brand On ONTROPP';
    subEl.textContent =
      'Set up your studio profile so customers can understand your brand, discover your work, and find the right way to contact you.';
    btnText.textContent = 'Save Studio Details';
  }

  if (state.mode === 'edit') {
    titleEl.textContent = 'Update Your Studio';
    subEl.textContent = 'Edit your studio profile and location.';
    btnText.textContent = 'Save Changes';

    prefillForm(state.designer);
    renderLocationEditInfo();
  }
}

/* ============================================================
   PREFILL
   ============================================================ */
function prefillForm(d) {
  if (!d) return;

  setVal('brand_name', d.brand_name);
  setVal('bio', d.bio);
  setVal('speciality', d.speciality);
  setVal('whatsappNumber', d.whatsapp_number);
  setVal('selectedCategory', d.category);
  setVal('areaInput', d.location || '');

  // social links (nested object, keys may be missing)
  const social = d.social_links || {};
  setVal('tiktok', social.tiktok ?? '');
  setVal('instagram', social.instagram ?? '');
  setVal('email', social.email ?? '');

  // logo
  if (d.logoUrl) {
    state.logoUrl = d.logoUrl;
    const img = document.getElementById('logoPreviewImage');
    img.src = d.logoUrl;
    document.getElementById('logoUploadContent').style.display = 'none';
    document.getElementById('logoPreview').style.display = 'flex';
  }

  // store state/city ids for later combobox init
  if (d.state_id) {
    pendingStateId = d.state_id;
    pendingCityId = d.city_id || null;
  }

  // bio counter
  const bioEl = document.getElementById('bio');
  if (bioEl) document.getElementById('bioCounter').textContent = bioEl.value.length;
}
/* ============================================================
   CATEGORIES
   ============================================================ */
async function setupCategories() {
  try {
    const categories = await API.getCategories();
    const grid = document.getElementById('categoryGrid');
    if (!grid) return;
    grid.innerHTML = '';

    categories.forEach((cat) => {
      const el = document.createElement('div');
      el.className = 'category-option';
      el.dataset.category = cat.id;
      el.innerHTML = `
        <div class="category-icon"><i class="fas fa-${cat.icon}"></i></div>
        <div class="category-name">${cat.name}</div>
      `;
      el.addEventListener('click', () => {
        grid.querySelectorAll('.category-option')
            .forEach((o) => o.classList.remove('selected'));
        el.classList.add('selected');
        document.getElementById('selectedCategory').value = cat.id;
      });
      grid.appendChild(el);
    });

    const currentId =
      document.getElementById('selectedCategory').value ||
      state.designer?.category;

    if (currentId) {
      const match = grid.querySelector(`[data-category="${currentId}"]`);
      if (match) match.classList.add('selected');
    } else if (categories.length && state.mode === 'create') {
      grid.querySelector('.category-option')?.click();
    }
  } catch (err) {
    console.error('[designerSignup] categories load failed:', err);
    showNotification('Could not load categories. Please refresh.', 'warning');
  }
}

/* ============================================================
   BIO COUNTER
   ============================================================ */
function setupBioCounter() {
  const bio = document.getElementById('bio');
  const counter = document.getElementById('bioCounter');
  if (!bio || !counter) return;
  bio.addEventListener('input', () => {
    counter.textContent = bio.value.length;
  });
}

/* ============================================================
   LOCATION UI
   ============================================================ */
async function initLocationUI() {
  let states = [];
  try {
    states = await API.getStates();
  } catch (err) {
    console.error('[designerSignup] states load failed:', err);
    showNotification('Could not load states. Tap the field to retry.', 'warning');
  }

  stateCb = new Combobox({
    inputEl:  document.getElementById('stateInput'),
    menuEl:   document.getElementById('stateMenu'),
    hiddenEl: document.getElementById('selectedState'),
    statusEl: document.getElementById('stateStatus'),
    source:   states,
    allowEmpty: true,
    placeholder: 'Start typing your state…',
    emptyText: 'No matching state',
    onChange: handleStateChange,
  });

  cityCb = new Combobox({
    inputEl:  document.getElementById('cityInput'),
    menuEl:   document.getElementById('cityMenu'),
    hiddenEl: document.getElementById('selectedCity'),
    statusEl: document.getElementById('cityStatus'),
    source:   [],
    allowEmpty: true,
    placeholder: 'Select a state first',
    emptyText: 'No matching city',
  });
  cityCb.setDisabled(true);

  if (pendingStateId) {
    const s = states.find((x) => x.id === pendingStateId);
    if (s) {
      stateCb.setValue(s.id, s.name);
      await loadCitiesForState(s.id);
      if (pendingCityId) {
        const city = (await API.getCities(s.id)).find((c) => c.id === pendingCityId);
        if (city) cityCb.setValue(city.id, city.name);
      }
    }
    pendingStateId = null;
    pendingCityId = null;
  }
}

async function handleStateChange(picked) {
  cityCb.clear();
  cityCb.setSource([]);
  cityCb.setDisabled(true);
  cityCb.inputEl.placeholder = 'Select a state first';

  if (!picked) return;

  cityCb.setDisabled(false);
  cityCb.inputEl.placeholder = 'Start typing your city…';
  await loadCitiesForState(picked.value);
  cityCb.inputEl.focus();
}

async function loadCitiesForState(stateId) {
  try {
    const cities = await API.getCities(stateId);
    cityCb.setSource(cities);
  } catch (err) {
    console.error('[designerSignup] cities load failed:', err);
    showNotification('Could not load cities for that state.', 'warning');
    cityCb.setSource([]);
  }
}

/* ============================================================
   LOCATION EDIT INFO
   ============================================================ */
function renderLocationEditInfo() {
  const el = document.getElementById('locationEditInfo');
  const textEl = document.getElementById('locationEditInfoText');
  if (!el || !textEl) return;

  if (state.mode !== 'edit') { el.style.display = 'none'; return; }

  const remaining = state.locationEditsRemaining;
  if (remaining === null) { el.style.display = 'none'; return; }

  el.style.display = 'flex';
  el.classList.remove('warning', 'danger');

  if (remaining > 0) {
    textEl.textContent = `You can update your location ${remaining} more ${
      remaining === 1 ? 'time' : 'times'
    } this month.`;
  } else {
    el.classList.add('danger');
    textEl.textContent =
      'You have used all your location edits this month. Try again next month.';
    document.getElementById('locationFields')?.classList.add('locked');
    document.getElementById('submitBtn')?.setAttribute('disabled', 'disabled');
  }
}

/* ============================================================
   FORM SUBMISSION (single submit)
   ============================================================ */
function setupFormSubmission() {
  const form = document.getElementById('designerSignupForm');
  const submitBtn = document.getElementById('submitBtn');
  if (!form || !submitBtn) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (state.isSubmitting) return;

    if (!validateForm()) return;

    const payload = {
      brand_name:      getVal('brand_name'),
      bio:             getVal('bio'),
      category:        getVal('selectedCategory'),
      speciality:      getVal('speciality'),
      whatsapp_number: getVal('whatsappNumber'),
      social_links: {
        email:     getVal('email'),
        tiktok:    getVal('tiktok'),
        instagram: getVal('instagram'),
      },
      logoUrl:         state.logoUrl || '',
      state_id:        getVal('selectedState'),
      city_id:         getVal('selectedCity'),
      location:        getVal('areaInput').trim(),
    };

    setSubmitting(true, 'submitBtn');

    try {
      let res;
      if (state.mode === 'create') {
        res = await StoreApi.openStore(payload);
      } else {
        res = await StoreApi.updateDesignerProfile(payload);
      }

      if (res?.success === false) throw new Error(res.message || 'Save failed.');

      showNotification(
        state.mode === 'create' ? 'Studio created. Welcome aboard!' : 'Studio updated.',
        'success'
      );

      setTimeout(() => {
        window.location.href = 'designerDashboard.html';
      }, 800);
    } catch (err) {
      console.error('[designerSignup] submit failed:', err);

      if (err?.status === 429) {
        showNotification('You have used all your location edits this month.', 'error');
        state.locationEditsRemaining = 0;
        renderLocationEditInfo();
      } else {
        showNotification(err.message || 'Could not save your studio.', 'error');
      }
      setSubmitting(false, 'submitBtn');
    }
  });
}

/* ============================================================
   VALIDATION
   ============================================================ */
function validateForm() {
  const brand_name = getVal('brand_name');
  const bio = getVal('bio');
  const category = getVal('selectedCategory');
  const whatsapp = getVal('whatsappNumber');
  const stateId = getVal('selectedState');
  const cityId = getVal('selectedCity');

  if (!brand_name) {
    showNotification('Please enter your brand name.', 'warning');
    focusEl('brand_name');
    return false;
  }
  if (!bio) {
    showNotification('Please add a short brand description.', 'warning');
    focusEl('bio');
    return false;
  }
  if (!category) {
    showNotification('Please pick a category.', 'warning');
    return false;
  }
  if (!/^[0-9]{11}$/.test(whatsapp)) {
    showNotification('Enter a valid 11-digit WhatsApp number.', 'warning');
    focusEl('whatsappNumber');
    return false;
  }
  if (!stateId) {
    showNotification('Please pick your state.', 'warning');
    focusEl('stateInput');
    return false;
  }
  if (!cityId) {
    showNotification('Please pick your city.', 'warning');
    focusEl('cityInput');
    return false;
  }
  return true;
}

/* ============================================================
   LOGO UPLOAD
   ============================================================ */
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
    if (e.target !== input && e.target !== changeBtn) {
      input.click();
    }
  });
  btn?.addEventListener('click', (e) => { e.stopPropagation(); input.click(); });
  changeBtn?.addEventListener('click', (e) => { e.stopPropagation(); input.click(); });

  input.addEventListener('change', function () {
    const file = this.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      showNotification('Please select an image file.', 'warning');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      showNotification('Image must be under 5MB.', 'warning');
      return;
    }
    uploadLogo(file);
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

  async function uploadLogo(file) {
    const UPLOAD_PRESET = 'seller_logo_unsigned';
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', UPLOAD_PRESET);
    formData.append('folder', 'designers/logos');

    img.src = 'https://i.gifer.com/ZZ5H.gif';
    content.style.display = 'none';
    preview.style.display = 'flex';

    try {
      const res = await API.uploadImage(formData);
      state.logoUrl = res.secure_url;
      img.src = state.logoUrl;
      showNotification('Logo uploaded.', 'success');
    } catch (err) {
      console.error('[designerSignup] logo upload failed:', err);
      showNotification('Logo upload failed. Try again.', 'error');
      state.logoUrl = null;
      content.style.display = 'block';
      preview.style.display = 'none';
    }
  }
}

/* ============================================================
   HELPERS
   ============================================================ */
function getVal(id) {
  const el = document.getElementById(id);
  return el ? el.value.trim() : '';
}
function setVal(id, v) {
  const el = document.getElementById(id);
  if (el && v != null) el.value = v;
}
function focusEl(id) {
  document.getElementById(id)?.focus();
}
function setSubmitting(on, btnId) {
  state.isSubmitting = on;
  const btn = document.getElementById(btnId);
  if (!btn) return;
  if (on) {
    btn.dataset.originalHtml = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Please wait…';
    btn.disabled = true;
  } else {
    if (btn.dataset.originalHtml) btn.innerHTML = btn.dataset.originalHtml;
    btn.disabled = false;
    delete btn.dataset.originalHtml;
  }
}
function hidePageLoader() {
  const el = document.getElementById('pageLoader');
  if (!el) return;
  el.classList.add('hidden');
  setTimeout(() => el.remove(), 400);
}