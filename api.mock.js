/**
 * api.mock.js
 * Fake API for testing the ONTROPP dashboard.
 *
 * One source of truth: PIECES. Everything else is a view over it.
 *
 * Auth simulation:
 *   API.setAuth({ id, username, email, avatar_url, role })
 *   API.setAuth(null)
 *
 * Latency:
 *   API.setLatency(300)
 */

const IMG = (id, w = 800) =>
  `https://images.unsplash.com/${id}?w=${w}&q=70&auto=format&fit=crop`;

/* =============================================================
   STUDIOS — the human units. Everything else points here.
   ============================================================= */

const STUDIOS = [
  { id: 's1', name: 'Atelier Nneka',   designer_name: 'Amara Okonkwo', location: 'Lagos',  tag: 'Textiles',  cover_url: IMG('photo-1558769132-cb1aea458c5e', 400) },
  { id: 's2', name: 'Form Studio',     designer_name: 'Tunde Bakare',  location: 'Accra',  tag: 'Jewellery', cover_url: IMG('photo-1497366216548-37526070297c', 400) },
  { id: 's3', name: 'Lóre Botanicals', designer_name: 'Zainab Bello',  location: 'Abuja',  tag: 'Beauty',    cover_url: IMG('photo-1596462502278-27bfdc403348', 400) },
  { id: 's4', name: 'Kèkè Collective', designer_name: 'Kofi Mensah',   location: 'Lagos',  tag: 'Craft',     cover_url: IMG('photo-1567016432779-094069958ea5', 400) },
  { id: 's5', name: 'Ink & Thread',    designer_name: 'Ngozi Adeyemi', location: 'Enugu',  tag: 'Print',     cover_url: IMG('photo-1490481651871-ab68de25d43d', 400) },
  { id: 's6', name: 'Sahel Studio',    designer_name: 'Yara Diallo',   location: 'Dakar',  tag: 'Textiles',  cover_url: IMG('photo-1489987707025-afc232f7ea0f', 400) },
];

/* =============================================================
   DESIGNERS — 1:1 with studios for now (a designer owns a studio)
   ============================================================= */

const DESIGNERS = STUDIOS.map((s, i) => ({
  id: `d${i + 1}`,
  studio_id: s.id,
  name: s.designer_name,
  studio_name: s.name,
  avatar_url: [
    'https://i.pravatar.cc/150?img=47',
    'https://i.pravatar.cc/150?img=12',
    'https://i.pravatar.cc/150?img=32',
    'https://i.pravatar.cc/150?img=68',
    'https://i.pravatar.cc/150?img=45',
    'https://i.pravatar.cc/150?img=20',
  ][i],
}));

/* =============================================================
   CATEGORIES
   ============================================================= */

const CATEGORIES = [
  { id: 'textiles',    name: 'Textiles',    icon: 'scroll',   image_url: IMG('photo-1490481651871-ab68de25d43d') },
  { id: 'tailoring',   name: 'Tailoring',   icon: 'cut',      image_url: IMG('photo-1516257984-b1b4d707412e') },
  { id: 'jewellery',   name: 'Jewellery',   icon: 'gem',      image_url: IMG('photo-1523170335258-f5ed11844a49') },
  { id: 'objects',     name: 'Objects',     icon: 'shapes',   image_url: IMG('photo-1567016432779-094069958ea5') },
  { id: 'beauty',      name: 'Beauty',      icon: 'spa',      image_url: IMG('photo-1522335789203-aabd1fc54bc9') },
  { id: 'print',       name: 'Print',       icon: 'stamp',    image_url: IMG('photo-1606760227091-3dd870d97f1d') },
];

/* =============================================================
   PIECES — the source of truth.

   Each seed carries [w, h] so the client can reserve space
   *before* the image loads. This is what makes append-safe
   masonry possible: no reflow when images arrive.
   ============================================================= */

const PIECE_SEEDS = [
  // image id,                            title,                       studio, designer, category,     price,  w,    h
  ['photo-1539109136881-3be0616acf4b',   'Hand-dyed silk wrap dress',  's1',  'd1',  'textiles',   84000, 800, 1000],
  ['photo-1523170335258-f5ed11844a49',   'Sculpted brass cuff',        's2',  'd2',  'jewellery',  32000, 800,  800],
  ['photo-1596462502278-27bfdc403348',   'Shea & hibiscus face oil',   's3',  'd3',  'beauty',     18500, 800,  600],
  ['photo-1543163521-1bf539c55dd2',      'Woven raffia tote',          's4',  'd4',  'objects',    26000, 800, 1000],
  ['photo-1584917865442-de89df76afd3',   'Linen overshirt',            's2',  'd2',  'tailoring',  45000, 800,  900],
  ['photo-1549298916-b41d501d3772',      'Hand-stitched loafers',      's1',  'd1',  'tailoring',  68000, 800,  700],
  ['photo-1606760227091-3dd870d97f1d',   'Indigo dyed scarf',          's2',  'd2',  'print',      15000, 800, 1100],
  ['photo-1521369909029-2afed882baee',   'Woven straw hat',            's6',  'd6',  'objects',    22000, 800,  800],
  ['photo-1608571423902-eed4a5ad8108',   'Shea butter balm',           's3',  'd3',  'beauty',      9500, 800,  900],
  ['photo-1620916566398-39f1143ab7be',   'Rose clay mask',             's3',  'd3',  'beauty',     14000, 800, 1000],
  ['photo-1558769132-cb1aea458c5e',      'Block-printed wall hanging', 's5',  'd5',  'print',      38000, 800,  600],
  ['photo-1489987707025-afc232f7ea0f',   'Handwoven cotton throw',     's6',  'd6',  'textiles',   52000, 800,  900],
  ['photo-1544441893-675973e31985',      'Beaded leather sandals',     's1',  'd1',  'tailoring',  41000, 800,  700],
  ['photo-1583744946564-b52ac1c389c8',   'Stoneware serving bowl',     's4',  'd4',  'objects',    17000, 800,  800],
  ['photo-1590874103328-eac38a683ce7',   'Gold-fill hoop earrings',    's2',  'd2',  'jewellery',  24000, 800,  900],
  ['photo-1585487000160-6ebcfceb0d03',   'Hand-poured candle',         's3',  'd3',  'beauty',     11000, 800, 1100],
  ['photo-1503342217505-b0a15ec3261c',   'Kente accent scarf',         's5',  'd5',  'textiles',   29000, 800,  700],
  ['photo-1551488831-00ddcb6c6bd3',      'Carved wooden stool',        's4',  'd4',  'objects',    62000, 800, 1000],
  ['photo-1591047139829-d91aecb6caea',   'Silk hair wrap',             's1',  'd1',  'textiles',   13000, 800,  800],
  ['photo-1572569511254-d8f925fe2cbb',   'Ceramic incense holder',     's4',  'd4',  'objects',     9000, 800,  600],
  ['photo-1594223274512-ad4803739b7c',   'Hammered brass bangle',      's2',  'd2',  'jewellery',  19000, 800,  900],
  ['photo-1520903920243-00d872a2d1c9',   'Natural fibre basket',       's6',  'd6',  'objects',    21000, 800, 1000],
  ['photo-1560243563-062bfc001d68',      'Block-print linen napkins',  's5',  'd5',  'print',      16000, 800,  700],
];

const PIECES = PIECE_SEEDS.map(([imgId, title, studioId, designerId, category, price, w, h], i) => {
  const studio = STUDIOS.find(s => s.id === studioId);
  return {
    id: `p${i + 1}`,
    title,
    studio_id: studioId,
    studio_name: studio.name,
    studio_avatar_url: studio.cover_url,
    designer_id: designerId,
    category,
    price,
    image_url: IMG(imgId, 600),
    width: w,
    height: h,
    aspect_ratio: w / h,
    badge: i % 7 === 0 ? 'New' : null,
  };
});

/* =============================================================
   VIEWS
   ============================================================= */

const TRENDING = PIECES.filter((_, i) => [0, 1, 2, 3].includes(i)).map((p, i) => ({
  ...p,
  kicker: ['Featured piece', 'Trending now', 'New this week', 'Editor pick'][i],
  focal_point: 'center',
  image_url: p.image_url.replace('w=600', 'w=1200'),
}));

const EDITOR_PICKS = PIECES.slice(0, 8).map(p => ({
  ...p,
  badge: p.badge || 'Featured',
}));

const FRESH = PIECES.slice(4, 12).map(p => ({
  id: p.id,
  title: p.title,
  studio_name: p.studio_name,
  image_url: p.image_url.replace('w=600', 'w=400'),
}));
/*
const _saved = {
  u1: ['p1', 'p3', 'p6', 'p11', 'p14', 'p18', 'p21'],
};*/

/* =============================================================
   STATE
   ============================================================= */

const _state = {
  auth: null,
  latency: 250,
  follows: {
    u1: { designerIds: ['d1', 'd3'], studioIds: ['s2', 's4'] },
  },
  // Piece ids the user has saved, per user.
  saved: {
    u1: ['p1', 'p3', 'p6', 'p11', 'p14', 'p18', 'p21', 'p2', 'p7', 'p12', 'p19'],
  },
  // Fixed timestamp so the "last added" text is stable across calls.
  savedLastAddedAt: Date.now() - 3 * 24 * 60 * 60 * 1000, // 3 days ago
};

const _sleep = (ms) => new Promise(r => setTimeout(r, ms));
const _clone = (x) => JSON.parse(JSON.stringify(x));

function paginate(items, page = 1, limit = 12) {
  const start = (page - 1) * limit;
  const slice = items.slice(start, start + limit);
  return {
    data: _clone(slice),
    pagination: {
      currentPage: page,
      pageSize: limit,
      totalItems: items.length,
      totalPages: Math.ceil(items.length / limit),
      hasNextPage: start + limit < items.length,
      hasPrevPage: page > 1,
    },
  };
}

/* =============================================================
   API
   ============================================================= */

const API = {
  /* ---------- Test controls ---------- */
  setAuth(user) { _state.auth = user ? _clone(user) : null; return this; },
  getAuth() { return _clone(_state.auth); },
  setLatency(ms) { _state.latency = ms; return this; },
  isSignedIn() { return !!_state.auth; },

  /* ---------- Auth ---------- */
  async login({ username = 'Amara', email = 'amara@ontropp.test' } = {}) {
    await _sleep(_state.latency);
    _state.auth = {
      id: 'u1',
      username,
      email,
      avatar_url: 'https://i.pravatar.cc/150?img=47',
      role: 'buyer',
    };
    return _clone(_state.auth);
  },
  async logout() {
    await _sleep(_state.latency);
    _state.auth = null;
    return { ok: true };
  },

  /* ---------- Viewer context — what Explore reads once ---------- */
  async getViewerContext() {
    await _sleep(_state.latency);
    if (!_state.auth) {
      return {
        signedIn: false,
        followedDesignerIds: [],
        recentlyVisitedStudioIds: [],
      };
    }
    const f = _state.follows[_state.auth.id] || { designerIds: [], studioIds: [] };
    return {
      signedIn: true,
      followedDesignerIds: _clone(f.designerIds),
      recentlyVisitedStudioIds: _clone(f.studioIds),
    };
  },

  /* ---------- Follow / unfollow — used by designer cards + explore filters ---------- */
  async toggleFollowDesigner(designerId) {
    await _sleep(_state.latency);
    if (!_state.auth) throw new Error('Not signed in');
    const f = _state.follows[_state.auth.id] ||= { designerIds: [], studioIds: [] };
    const i = f.designerIds.indexOf(designerId);
    if (i >= 0) f.designerIds.splice(i, 1);
    else f.designerIds.push(designerId);
    return { following: i < 0 };
  },

  /* ---------- Bootstrap ---------- */
  async getUserDash() {
    await _sleep(_state.latency);
    const signedIn = !!_state.auth;
    return {
      userData: signedIn
        ? {
            ..._clone(_state.auth),
            sellerProfile: _state.auth.role === 'seller' ? {
              id: 's1',
              shop_name: 'Atelier Nneka',
              logo_url: 'https://i.pravatar.cc/150?img=47',
              rating: 4.8,
              profile_views: 1240,
              follows: [{ count: 312 }],
            } : null,
          }
        : null,
      viewerContext: signedIn
        ? { followedDesignerIds: ['d1', 'd3'], recentlyVisitedStudioIds: ['s2', 's4'] }
        : null,
      categories: _clone(CATEGORIES),
      trending: _clone(TRENDING),
      recommended: signedIn ? _clone(PIECES.slice(0, 8)) : _clone(EDITOR_PICKS),
      designers: _clone(DESIGNERS),
      fresh: _clone(FRESH),
      studios: _clone(STUDIOS),
    };
  },

  /* ---------- Home sections ---------- */
  async getTrending(limit = 4) { await _sleep(_state.latency); return _clone(TRENDING.slice(0, limit)); },
  async getCategories() { await _sleep(_state.latency); return _clone(CATEGORIES); },
  async getEditorPicks(limit = 8) { await _sleep(_state.latency); return _clone(EDITOR_PICKS.slice(0, limit)); },
  async getRecommendedProducts(page = 1, limit = 8) { await _sleep(_state.latency); return paginate(PIECES, page, limit); },
  async getFeaturedDesigners(limit = 6) { await _sleep(_state.latency); return _clone(DESIGNERS.slice(0, limit)); },
  async getFreshArrivals(limit = 10) { await _sleep(_state.latency); return _clone(FRESH.slice(0, limit)); },
  async getFeaturedStudios(limit = 6) { await _sleep(_state.latency); return _clone(STUDIOS.slice(0, limit)); },

  /* ---------- Explore ---------- *
   * Supports server-side refinement by viewer context so the
   * orchestrator doesn't have to filter client-side. This keeps
   * pagination honest (pages stay full).
   */
  async getProducts({
    page = 1,
    limit = 12,
    search = '',
    category = 'all',
    followingOnly = false,
    recentOnly = false,
    viewerContext = null,
  } = {}) {
    await _sleep(_state.latency);

    let items = PIECES.slice();

    if (category && category !== 'all') {
      items = items.filter(p => p.category === category);
    }
    if (search) {
      const q = search.toLowerCase();
      items = items.filter(p =>
        p.title.toLowerCase().includes(q) ||
        p.studio_name.toLowerCase().includes(q)
      );
    }
    if (followingOnly && viewerContext?.followedDesignerIds?.length) {
      const set = new Set(viewerContext.followedDesignerIds);
      items = items.filter(p => set.has(p.designer_id));
    }
    if (recentOnly && viewerContext?.recentlyVisitedStudioIds?.length) {
      const set = new Set(viewerContext.recentlyVisitedStudioIds);
      items = items.filter(p => set.has(p.studio_id));
    }

    return paginate(items, page, limit);
  },

	/* -------------- Saved ------------- */

async getSaved() {
  await _sleep(_state.latency);
  if (!_state.auth) throw new Error('Not signed in');
  const ids = _state.saved[_state.auth.id] || [];
  // Newest first: reverse the insertion order.
  const pieces = ids
    .map(id => PIECES.find(p => p.id === id))
    .filter(Boolean)
    .reverse();

  // Derive the studios the user has saved from.
  const studioMap = new Map();
  for (const p of pieces) {
    if (!studioMap.has(p.studio_id)) {
      studioMap.set(p.studio_id, {
        id: p.studio_id,
        name: p.studio_name,
        avatar_url: p.studio_avatar_url,
        piece_count: 0,
      });
    }
    studioMap.get(p.studio_id).piece_count += 1;
  }

  return {
    pieces: _clone(pieces),
    studios: [...studioMap.values()],
    total: pieces.length,
    lastAddedAt: _state.savedLastAddedAt,
  };
},

async removeSaved(pieceId) {
  await _sleep(_state.latency);
  if (!_state.auth) throw new Error('Not signed in');
  const ids = _state.saved[_state.auth.id] ||= [];
  const i = ids.indexOf(pieceId);
  if (i >= 0) ids.splice(i, 1);
  return { ok: true, savedIds: [...ids] };
},

async removeManySaved(pieceIds) {
  await _sleep(_state.latency);
  if (!_state.auth) throw new Error('Not signed in');
  const ids = _state.saved[_state.auth.id] ||= [];
  const toRemove = new Set(pieceIds);
  const next = ids.filter(id => !toRemove.has(id));
  _state.saved[_state.auth.id] = next;
  return { ok: true, savedIds: [...next], removed: pieceIds.length };
},

async toggleSaved(pieceId) {
  await _sleep(_state.latency);
  if (!_state.auth) throw new Error('Not signed in');
  const ids = _state.saved[_state.auth.id] ||= [];
  const i = ids.indexOf(pieceId);
  if (i >= 0) { ids.splice(i, 1); return { saved: false }; }
  ids.push(pieceId);
  return { saved: true };
},

  /* ---------- Detail stubs ---------- */
  async getPiece(id) {
    await _sleep(_state.latency);
    const p = PIECES.find(x => x.id === id) || PIECES[0];
    return _clone({ ...p, description: 'Handcrafted piece from a featured ONTROPP studio.' });
  },
  async getDesigner(id) {
    await _sleep(_state.latency);
    return _clone(DESIGNERS.find(d => d.id === id) || DESIGNERS[0]);
  },
  async getStudio(id) {
    await _sleep(_state.latency);
    return _clone(STUDIOS.find(s => s.id === id) || STUDIOS[0]);
  },
};

export default API;