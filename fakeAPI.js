/* ============================================================
   /js/fakeAPI.js
   Fake API for designerSignup page — mirrors real api.js shape.
   Set FAKE_STATE to simulate different scenarios.
   ============================================================ */

/* ---------- Config: flip these to test scenarios ---------- */
const FAKE_STATE = {
  // mode: 'create' | 'complete' | 'edit' | 'no-token'
  mode: 'create',

  // location edit limit (for edit mode)
  locationEditsRemaining: 3,

  // simulate network latency in ms
  latency: 600,

  // simulate failures (set to true to trigger)
  failStates: false,
  failCities: false,
  failCreate: false,
  failUpdate: false,
  failLocationSave: false,
  failLogoUpload: false,
  failCategories: false,
};

/* ---------- Fake data ---------- */
const FAKE_STATES = [
  { id: 'NG001', name: 'Abia' },
  { id: 'NG002', name: 'Adamawa' },
  { id: 'NG003', name: 'Akwa Ibom' },
  { id: 'NG004', name: 'Anambra' },
  { id: 'NG005', name: 'Bauchi' },
  { id: 'NG006', name: 'Bayelsa' },
  { id: 'NG007', name: 'Benue' },
  { id: 'NG008', name: 'Borno' },
  { id: 'NG009', name: 'Cross River' },
  { id: 'NG010', name: 'Delta' },
  { id: 'NG011', name: 'Ebonyi' },
  { id: 'NG012', name: 'Edo' },
  { id: 'NG013', name: 'Ekiti' },
  { id: 'NG014', name: 'Enugu' },
  { id: 'NG015', name: 'FCT' },
  { id: 'NG016', name: 'Gombe' },
  { id: 'NG017', name: 'Imo' },
  { id: 'NG018', name: 'Jigawa' },
  { id: 'NG019', name: 'Kaduna' },
  { id: 'NG020', name: 'Kano' },
  { id: 'NG021', name: 'Katsina' },
  { id: 'NG022', name: 'Kebbi' },
  { id: 'NG023', name: 'Kogi' },
  { id: 'NG024', name: 'Kwara' },
  { id: 'NG025', name: 'Lagos' },
  { id: 'NG026', name: 'Nasarawa' },
  { id: 'NG027', name: 'Niger' },
  { id: 'NG028', name: 'Ogun' },
  { id: 'NG029', name: 'Ondo' },
  { id: 'NG030', name: 'Osun' },
  { id: 'NG031', name: 'Oyo' },
  { id: 'NG032', name: 'Plateau' },
  { id: 'NG033', name: 'Rivers' },
  { id: 'NG034', name: 'Sokoto' },
  { id: 'NG035', name: 'Taraba' },
  { id: 'NG036', name: 'Yobe' },
  { id: 'NG037', name: 'Zamfara' },
];

const FAKE_CITIES = {
  NG025: [
    { id: 'NG025001', name: 'Agege' },
    { id: 'NG025002', name: 'Ajeromi-Ifelodun' },
    { id: 'NG025003', name: 'Alimosho' },
    { id: 'NG025004', name: 'Amuwo-Odofin' },
    { id: 'NG025005', name: 'Apapa' },
    { id: 'NG025006', name: 'Badagry' },
    { id: 'NG025007', name: 'Epe' },
    { id: 'NG025008', name: 'Eti-Osa' },
    { id: 'NG025009', name: 'Ibeju-Lekki' },
    { id: 'NG025010', name: 'Ifako-Ijaiye' },
    { id: 'NG025011', name: 'Ikeja' },
    { id: 'NG025012', name: 'Ikorodu' },
    { id: 'NG025013', name: 'Kosofe' },
    { id: 'NG025014', name: 'Lagos Island' },
    { id: 'NG025015', name: 'Lagos Mainland' },
    { id: 'NG025016', name: 'Mushin' },
    { id: 'NG025017', name: 'Ojo' },
    { id: 'NG025018', name: 'Oshodi-Isolo' },
    { id: 'NG025019', name: 'Shomolu' },
    { id: 'NG025020', name: 'Surulere' },
  ],
  NG029: [
    { id: 'NG029001', name: 'Akure North' },
    { id: 'NG029002', name: 'Akure South' },
    { id: 'NG029003', name: 'Ese Odo' },
    { id: 'NG029004', name: 'Idanre' },
    { id: 'NG029005', name: 'Ifedore' },
    { id: 'NG029006', name: 'Ilaje' },
    { id: 'NG029007', name: 'Ile Oluji/Okeigbo' },
    { id: 'NG029008', name: 'Irele' },
    { id: 'NG029009', name: 'Odigbo' },
    { id: 'NG029010', name: 'Okitipupa' },
    { id: 'NG029011', name: 'Ondo East' },
    { id: 'NG029012', name: 'Ondo West' },
    { id: 'NG029013', name: 'Ose' },
    { id: 'NG029014', name: 'Owo' },
  ],
  NG015: [
    { id: 'NG015001', name: 'Abaji' },
    { id: 'NG015002', name: 'Bwari' },
    { id: 'NG015003', name: 'Gwagwalada' },
    { id: 'NG015004', name: 'Kuje' },
    { id: 'NG015005', name: 'Kwali' },
    { id: 'NG015006', name: 'Municipal Area Council' },
  ],
  // Any state not listed returns a tiny generic list so testing still flows
};

const FAKE_CATEGORIES = [
  { id: 'CAT001', name: 'Fashion',        icon: 'tshirt' },
  { id: 'CAT002', name: 'Shoes',          icon: 'shoe-prints' },
  { id: 'CAT003', name: 'Bags',           icon: 'bag-shopping' },
  { id: 'CAT004', name: 'Jewelry',        icon: 'gem' },
  { id: 'CAT005', name: 'Beauty',         icon: 'spa' },
  { id: 'CAT006', name: 'Home Decor',     icon: 'couch' },
  { id: 'CAT007', name: 'Electronics',    icon: 'plug' },
  { id: 'CAT008', name: 'Art & Craft',    icon: 'palette' },
];

/* ---------- Fake profiles per mode ---------- */
const FAKE_PROFILES = {
  create:   null,
  complete: {
    shopName: 'Adire by Tope',
    shopBio: 'Handmade adire from the heart of Ondo. We dye, we stitch, we deliver.',
    whatsapp_number: '08031234567',
    category: 'CAT001',
    logoUrl: '',
    state_id: null,
    city_id: null,
    area: '',
    operatingDescription: '',
    locationEditsRemaining: 3,
  },
  edit: {
    shopName: 'Adire by Tope',
    shopBio: 'Handmade adire from the heart of Ondo. We dye, we stitch, we deliver.',
    whatsapp_number: '08031234567',
    category: 'CAT001',
    logoUrl: 'https://res.cloudinary.com/demo/image/upload/sample.jpg',
    state_id: 'NG029',
    city_id: 'NG029001',
    area: 'Oke-Aro, near GTBank',
    operatingDescription: 'We deliver within Akure and to nearby towns every Saturday.',
    locationEditsRemaining: 3,
  },
};

/* ---------- Helpers ---------- */
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

function maybeFail(flag, message) {
  if (flag) {
    const err = new Error(message || 'Simulated failure');
    err.status = 500;
    throw err;
  }
}

/* ---------- API ---------- */
const API = {

  /* ============ PROFILE ============ */
  async getDesignerProfile() {
    await wait(FAKE_STATE.latency);

    if (FAKE_STATE.mode === 'no-token') {
      const err = new Error('Not authenticated');
      err.status = 401;
      throw err;
    }

    const profile = FAKE_PROFILES[FAKE_STATE.mode];
    return profile ? { ...profile } : null;
  },

  /* ============ CREATE ============ */
  async openStore(payload) {
    await wait(FAKE_STATE.latency);
    maybeFail(FAKE_STATE.failCreate, 'Could not create your brand.');

    console.log('[fakeAPI] openStore payload:', payload);

    return {
      success: true,
      message: 'Brand created',
      data: {
        ...payload,
        _id: 'designer_fake_001',
        state_id: null,
        city_id: null,
        area: '',
        operatingDescription: '',
        locationEditsRemaining: 3,
        createdAt: new Date().toISOString(),
      },
    };
  },

  /* ============ UPDATE BRAND ============ */
  async updateDesignerProfile(payload) {
    await wait(FAKE_STATE.latency);
    maybeFail(FAKE_STATE.failUpdate, 'Could not update your brand.');

    console.log('[fakeAPI] updateDesignerProfile payload:', payload);

    return { success: true, message: 'Profile updated', data: payload };
  },

  /* ============ UPDATE LOCATION ============ */
  async updateDesignerLocation(payload) {
    await wait(FAKE_STATE.latency);

    // Simulate rate limit hit
    if (FAKE_STATE.locationEditsRemaining <= 0) {
      const err = new Error('Location edit limit reached');
      err.status = 429;
      throw err;
    }

    maybeFail(FAKE_STATE.failLocationSave, 'Could not save location.');

    console.log('[fakeAPI] updateDesignerLocation payload:', payload);

    return {
      success: true,
      message: 'Location saved',
      data: payload,
    };
  },

  /* ============ CATEGORIES ============ */
  async getCategories() {
    await wait(FAKE_STATE.latency);
    maybeFail(FAKE_STATE.failCategories, 'Could not load categories.');
    return FAKE_CATEGORIES;
  },

  /* ============ LOCATIONS ============ */
  async getStates() {
    await wait(FAKE_STATE.latency);
    maybeFail(FAKE_STATE.failStates, 'Could not load states.');
    return FAKE_STATES;
  },

  async getCities(stateId) {
    await wait(FAKE_STATE.latency);
    maybeFail(FAKE_STATE.failCities, `Could not load cities for ${stateId}.`);

    if (FAKE_CITIES[stateId]) return FAKE_CITIES[stateId];

    // Generic fallback for testing any state
    return [
      { id: `${stateId}001`, name: 'Central' },
      { id: `${stateId}002`, name: 'North' },
      { id: `${stateId}003`, name: 'South' },
    ];
  },

  /* ============ UPLOAD ============ */
  async uploadImage(formData) {
    await wait(FAKE_STATE.latency + 400);
    maybeFail(FAKE_STATE.failLogoUpload, 'Upload failed.');

    console.log('[fakeAPI] uploadImage received FormData:', formData);
    return { secure_url: 'https://res.cloudinary.com/demo/image/upload/sample.jpg' };
  },

};

export default API;

/* ============================================================
   HOW TO TEST EACH SCENARIO
   ------------------------------------------------------------
   FIRST-TIME USER (create mode):
     FAKE_STATE.mode = 'create'
     → page loads with empty form, step 1 active, loader fades

   RETURNING BUT INCOMPLETE (complete mode):
     FAKE_STATE.mode = 'complete'
     → page prefills brand, auto-jumps to step 2

   EDITING EXISTING (edit mode):
     FAKE_STATE.mode = 'edit'
     → page prefills everything, edit counter shows, step 1 active

   NOT LOGGED IN:
     FAKE_STATE.mode = 'no-token'
     → getDesignerProfile throws 401

   LOCATION EDIT LIMIT HIT:
     FAKE_STATE.mode = 'edit'
     FAKE_STATE.locationEditsRemaining = 0
     → form locks, edit counter shows danger message

   SIMULATE FAILURES:
     FAKE_STATE.failStates = true
     FAKE_STATE.failCities = true
     FAKE_STATE.failCreate = true
     FAKE_STATE.failUpdate = true
     FAKE_STATE.failLocationSave = true
     FAKE_STATE.failLogoUpload = true
     FAKE_STATE.failCategories = true

   SLOW NETWORK:
     FAKE_STATE.latency = 3000
   ============================================================ */