import API from '../../fakeAPI.js';
import { Combobox } from '../uiTools/combobox.js';
import { setupPasswordToggle } from '../utility/uiUtils.js';
import { showNotification } from '../utility/reconfig.js';   // <- adjust path if needed

/* ============================================================
   STATE
   ============================================================ */
const state = {
  mode: 'create',              // 'create' | 'complete' | 'edit'
  designer: null,              // existing profile from API (or null)
  logoUrl: null,
  locationEditsRemaining: null,
  isSubmitting: false,
};

let stateCb = null;
let cityCb = null;

/* ============================================================
   BOOT
   ============================================================ */
document.addEventListener('DOMContentLoaded', () => {
  boot();
});

async function boot() {
  try {
    // 1. Ping designer profile (token already checked upstream)
    await pingProfile();
    // 2. Wire UI based on mode
    setupUi();
    setupSteps();
    setupFormSubmission();
    setupLogoUpload();
    setupPasswordToggle('passKey', 'togglePassKey');
    await setupCategories();
    applyMode();
  } catch (err) {
    console.error('[designerSignup] boot failed:', err);
    showNotification('Failed to load your profile. Please refresh.', 'error');
  } finally {
    hidePageLoader();
  }
}

/* ============================================================
   PROFILE PING + MODE DETECTION
   ============================================================ */
async function pingProfile() {
  try {
    const data = await API.getDesignerProfile(); // returns null/404 if none
    if (!data || !data.shopName) {
      state.mode = 'create';
      state.designer = null;
      return;
    }

    state.designer = data;
    state.logoUrl = data.logoUrl || null;

    // [BUSINESS] complete = has brand but no location set
    const hasLocation = !!(data.state_id && data.city_id);
    state.mode = hasLocation ? 'edit' : 'complete';

    // [BUSINESS] backend returns locationEditsRemaining
    state.locationEditsRemaining =
      typeof data.locationEditsRemaining === 'number'
        ? data.locationEditsRemaining
        : null;
  } catch (err) {
    // 404 → brand new user
    if (err?.status === 404) {
      state.mode = 'create';
      state.designer = null;
      return;
    }
    throw err;
  }
}

/* ============================================================
   APPLY MODE (title, subtitle, prefill, step jump)
   ============================================================ */
function applyMode() {
  const titleEl = document.getElementById('pageTitle');
  const subEl = document.getElementById('pageSubtitle');

  if (state.mode === 'create') {
    titleEl.textContent = 'Launch Your Brand On ONTROPP';
    subEl.textContent =
      'Turn your passion into profit. Create your brand profile and reach thousands of customers.';
    // nothing prefilled
  }

  if (state.mode === 'complete') {
    titleEl.textContent = 'One Last Step';
    subEl.textContent =
      'Your brand is live. Add your location so customers can find you.';
    prefillStep1(state.designer);
    renderLocationEditInfo();
    goToStep(2, { silent: true });
  }

  if (state.mode === 'edit') {
    titleEl.textContent = 'Update Your Brand';
    subEl.textContent = 'Edit your brand profile and location.';
    document.getElementById('submitBtnText').textContent = 'Save Changes';
    prefillStep1(state.designer);
    prefillStep2(state.designer);
    renderLocationEditInfo();
  }
}

/* ============================================================
   PREFILL
   ============================================================ */
function prefillStep1(d) {
  if (!d) return;
  setVal('shopName', d.shopName);
  setVal('shopBio', d.shopBio);
  setVal('whatsappNumber', d.whatsapp_number);
  setVal('selectedCategory', d.category);
  if (d.logoUrl) {
    state.logoUrl = d.logoUrl;
    const img = document.getElementById('logoPreviewImage');
    img.src = d.logoUrl;
    document.getElementById('logoUploadContent').style.display = 'none';
    document.getElementById('logoPreview').style.display = 'flex';
  }
}

function prefillStep2(d) {
  if (!d) return;
  // state_id / city_id come from backend as NG001 / NG001001
  if (d.state_id) {
    pendingStateId = d.state_id;
    pendingCityId = d.city_id || null;
  }
  setVal('areaInput', d.area || '');
  setVal('operatingDescription', d.operatingDescription || '');
}

let pendingStateId = null;
let pendingCityId = null;

/* ============================================================
   UI SETUP
   ============================================================ */
function setupUi() {
  // placeholder hook for future global UI
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

    // Pre-select
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
   STEP NAVIGATION
   ============================================================ */
function setupSteps() {
  document.getElementById('nextStepBtn')?.addEventListener('click', async () => {
    if (!validateStep1()) return;
    // [BUSINESS] Step 1 = create account (if in create mode)
    if (state.mode === 'create') {
      const ok = await createDesignerAccount({ advance: true });
      if (ok) goToStep(2);
    } else {
      // complete / edit — just move on
      goToStep(2);
    }
  });

  document.getElementById('backStepBtn')?.addEventListener('click', () => {
    goToStep(1);
  });

  document.getElementById('skipStep1Btn')?.addEventListener('click', async () => {
    if (!validateStep1()) return;
    // [BUSINESS] create account with default passKey, then go to dashboard
    const ok = await createDesignerAccount({ advance: false });
    if (ok) window.location.href = 'designerDashboard.html';
  });

  document.getElementById('skipStep2Btn')?.addEventListener('click', () => {
    // [BUSINESS] If we're in create mode but account wasn't created yet, do it now
    // (user clicked next → they already created it; this path is safe)
    window.location.href = 'designerDashboard.html';
  });
}

function goToStep(n, { silent = false } = {}) {
  const step1 = document.getElementById('step1');
  const step2 = document.getElementById('step2');
  const steps = document.querySelectorAll('.step-item');
  const connector = document.getElementById('stepConnector');

  if (n === 1) {
    step1.classList.add('active');
    step2.classList.remove('active');
    steps[0]?.classList.add('active');
    steps[0]?.classList.remove('completed');
    steps[1]?.classList.remove('active');
    connector?.classList.remove('completed');
    window.scrollTo({ top: 0, behavior: silent ? 'auto' : 'smooth' });
  } else {
    if (!silent && !validateStep1()) return;
    step1.classList.remove('active');
    step2.classList.add('active');
    steps[0]?.classList.remove('active');
    steps[0]?.classList.add('completed');
    steps[1]?.classList.add('active');
    connector?.classList.add('completed');
    window.scrollTo({ top: 0, behavior: silent ? 'auto' : 'smooth' });

    // Lazy-init location UI on first entry
    if (!stateCb) initLocationUI();
  }
}

/* ============================================================
   STEP 1 VALIDATION
   ============================================================ */
function validateStep1() {
  clearFormError('PassKey-error');

  const shopName = getVal('shopName');
  const shopBio = getVal('shopBio');
  const whatsapp = getVal('whatsappNumber');
  const category = getVal('selectedCategory');

  if (!shopName) return fail('Please enter your brand name.');
  if (!shopBio) return fail('Please add a short brand bio.');
  if (!/^[0-9]{11}$/.test(whatsapp)) return fail('Enter a valid 11-digit WhatsApp number.');
  if (!category) return fail('Please pick a category.');

  // PassKey rules — optional, but if filled must match & be long enough
  const pk = getVal('passKey');
  const cpk = getVal('confirmPassKey');
  if (pk || cpk) {
    if (pk.length < 6) return fail('PassKey must be at least 6 characters.');
    if (pk !== cpk) return fail('PassKeys do not match.');
  }
  return true;
}

function fail(msg) {
  showFormError('PassKey-error', msg);
  return false;
}

/* ============================================================
   STEP 1 SUBMIT — CREATE OR UPDATE
   ============================================================ */
async function createDesignerAccount({ advance }) {
  if (state.isSubmitting) return false;

  const passKey = getVal('passKey') || '123456'; // [BUSINESS] default

  const payload = {
    shopName: getVal('shopName'),
    shopBio: getVal('shopBio'),
    whatsapp_number: getVal('whatsappNumber'),
    category: getVal('selectedCategory'),
    logoUrl: state.logoUrl || '',
    passKey,
  };

  setSubmitting(true, advance ? 'nextStepBtn' : 'skipStep1Btn');

  try {
    let res;
    if (state.mode === 'create') {
      res = await API.openStore(payload);            // POST /api/designer
      state.mode = 'complete';
      state.designer = res?.data || res?.designer || null;
    } else {
      res = await API.updateDesignerProfile(payload); // PATCH /api/designer
    }

    if (res?.success === false) throw new Error(res.message || 'Save failed.');

    showNotification(
      state.mode === 'edit' ? 'Profile updated.' : 'Brand created.',
      'success'
    );
    return true;
  } catch (err) {
    console.error('[designerSignup] step1 submit failed:', err);
    showNotification(err.message || 'Could not save your brand.', 'error');
    return false;
  } finally {
    setSubmitting(false, advance ? 'nextStepBtn' : 'skipStep1Btn');
  }
}

/* ============================================================
   STEP 2 — LOCATION UI (combobox cascade)
   ============================================================ */
async function initLocationUI() {
  // 1. Load states (API + localStorage cache handled inside API.getStates)
  let states = [];
  try {
    states = await API.getStates(); // [{ id: 'NG001', name: 'Abia' }, ...]
  } catch (err) {
    console.error('[designerSignup] states load failed:', err);
    showNotification('Could not load states. Tap the field to retry.', 'warning');
  }

  // 2. State combobox
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

  // 3. City combobox (starts disabled, source set by state)
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

  // 4. If editing, prefill from pending ids
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
  // User edited state → city must reset
  cityCb.clear();
  cityCb.setSource([]);
  cityCb.setDisabled(true);
  cityCb.inputEl.placeholder = 'Select a state first';

  if (!picked) return;

  // Enable and load cities
  cityCb.setDisabled(false);
  cityCb.inputEl.placeholder = 'Start typing your city…';
  await loadCitiesForState(picked.value);
  cityCb.inputEl.focus();
}

async function loadCitiesForState(stateId) {
  try {
    // [BUSINESS] API returns [{ id: 'NG001001', name: 'Aba North' }, ...]
    const cities = await API.getCities(stateId);
    cityCb.setSource(cities);
  } catch (err) {
    console.error('[designerSignup] cities load failed:', err);
    showNotification('Could not load cities for that state.', 'warning');
    cityCb.setSource([]);
  }
}

/* ============================================================
   STEP 2 — EDIT LIMIT INFO
   ============================================================ */
function renderLocationEditInfo() {
  const el = document.getElementById('locationEditInfo');
  const textEl = document.getElementById('locationEditInfoText');
  if (!el || !textEl) return;

  // Only show in edit mode
  if (state.mode !== 'edit') {
    el.style.display = 'none';
    return;
  }

  const remaining = state.locationEditsRemaining;
  if (remaining === null) {
    el.style.display = 'none';
    return;
  }

  el.style.display = 'flex';
  el.classList.remove('warning', 'danger');

  if (remaining > 0) {
    el.classList.remove('warning', 'danger');
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
   STEP 2 VALIDATION + SUBMIT
   ============================================================ */
function validateStep2() {
  const stateId = getVal('selectedState');
  const cityId = getVal('selectedCity');

  if (!stateId) {
    showNotification('Please pick your state.', 'warning');
    document.getElementById('stateInput')?.focus();
    return false;
  }
  if (!cityId) {
    showNotification('Please pick your city.', 'warning');
    document.getElementById('cityInput')?.focus();
    return false;
  }
  return true;
}

function setupFormSubmission() {
  const form = document.getElementById('designerSignupForm');
  const submitBtn = document.getElementById('submitBtn');
  if (!form || !submitBtn) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (state.isSubmitting) return;

    // If on step 1 (edge case: form submitted via Enter), delegate
    if (document.getElementById('step1').classList.contains('active')) {
      if (!validateStep1()) return;
      if (state.mode === 'create') {
        const ok = await createDesignerAccount({ advance: true });
        if (ok) goToStep(2);
      } else {
        goToStep(2);
      }
      return;
    }

    // Step 2 submit
    if (!validateStep2()) return;

    const payload = {
      state_id: getVal('selectedState'),
      city_id: getVal('selectedCity'),
      area: getVal('areaInput').trim(),
      operatingDescription: getVal('operatingDescription').trim(),
    };

    const originalText = submitBtn.innerHTML;
    setSubmitting(true, 'submitBtn');

    try {
      const res = await API.updateDesignerLocation(payload); // PATCH /api/designer/location

      if (res?.success === false) throw new Error(res.message || 'Save failed.');

      showNotification(
        state.mode === 'create' || state.mode === 'complete'
          ? 'Location saved. Your shop is ready!'
          : 'Location updated.',
        'success'
      );

      setTimeout(() => {
        window.location.href = 'designerDashboard.html';
      }, 800);
    } catch (err) {
      console.error('[designerSignup] location submit failed:', err);

      // [BUSINESS] backend 429 = edit limit hit
      if (err?.status === 429) {
        showNotification(
          'You have used all your location edits this month.',
          'error'
        );
        state.locationEditsRemaining = 0;
        renderLocationEditInfo();
      } else {
        showNotification(err.message || 'Could not save your location.', 'error');
      }
      submitBtn.innerHTML = originalText;
      submitBtn.disabled = false;
      state.isSubmitting = false;
    }
  });
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
    if (e.target !== input && e.target !== changeBtn && !e.target.closest('.toggle-password')) {
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
    if (file.size > 2 * 1024 * 1024) {
      showNotification('Image must be under 2MB.', 'warning');
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

function showFormError(id, msg) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = msg;
  el.classList.add('visible');
}

function clearFormError(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = '';
  el.classList.remove('visible');
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