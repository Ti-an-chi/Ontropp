import API from '../../api.mock.js';

// State management
const state = {
  pieceId: null,
  piece: null,
  designer: null,
  studio: null,
  isFollowing: false,
  isSaved: false,
  userNote: null,
};

// DOM Elements
const elements = {
  userAvatar: document.getElementById('user-avatar'),
  pieceImage: document.getElementById('piece-image'),
  saveBtn: document.getElementById('save-btn'),
  studioName: document.getElementById('studio-name'),
  pieceTitle: document.getElementById('piece-title'),
  pieceCollection: document.getElementById('piece-collection'),
  pieceDescription: document.getElementById('piece-description'),
  designerAvatar: document.getElementById('designer-avatar'),
  designerName: document.getElementById('designer-name'),
  followBtn: document.getElementById('follow-btn'),
  tagsContainer: document.getElementById('tags-container'),
  fabricDetail: document.getElementById('fabric-detail'),
  colourDetail: document.getElementById('colour-detail'),
  fitDetail: document.getElementById('fit-detail'),
  noteInput: document.getElementById('note-input'),
  charCount: document.getElementById('char-count'),
  saveNoteBtn: document.getElementById('save-note-btn'),
  yourNotes: document.getElementById('your-notes'),
  savedNoteText: document.getElementById('saved-note-text'),
  editNoteBtn: document.getElementById('edit-note-btn'),
  deleteNoteBtn: document.getElementById('delete-note-btn'),
  moreWorksDesigner: document.getElementById('more-works-designer'),
  moreWorksGrid: document.getElementById('more-works-grid'),
};

// Initialize page
async function init() {
  // Get piece ID from URL params (or use default for demo)
  const urlParams = new URLSearchParams(window.location.search);
  state.pieceId = urlParams.get('id') || 'p1';

  // Check auth and load user context
  await loadUserContext();

  // Load all data in parallel for better performance
  await Promise.all([
    loadPieceData(),
    loadDesignerData(),
    loadStudioData(),
    loadMoreWorks(),
  ]);

  // Setup event listeners
  setupEventListeners();
}

// Load user authentication context
async function loadUserContext() {
  const auth = API.getAuth();
  if (auth) {
    elements.userAvatar.src = auth.avatar_url;
    
    // Check if piece is already saved
    const viewerContext = await API.getViewerContext();
    // We'll check saved status after loading piece
  } else {
    // Redirect to login or show guest view
    console.log('User not authenticated');
  }
}

// Load piece details
async function loadPieceData() {
  try {
    const piece = await API.getPiece(state.pieceId);
    state.piece = piece;

    // Update DOM
    elements.pieceImage.src = piece.image_url.replace('w=600', 'w=1800');
    elements.studioName.textContent = piece.studio_name;
    elements.pieceTitle.textContent = piece.title;
    elements.pieceCollection.textContent = `"${piece.category}" collection.`;
    elements.pieceDescription.textContent = 
      'This design blends traditional craftsmanship with modern silhouettes, celebrating culture, strength and femininity.';

    // Set design details (mock data - would come from API in real app)
    elements.fabricDetail.textContent = 'Silk Blend';
    elements.colourDetail.textContent = 'Sky Blue';
    elements.fitDetail.textContent = 'Structured';

    // Check if saved
    checkSavedStatus();
  } catch (error) {
    console.error('Error loading piece:', error);
  }
}

// Load designer information
async function loadDesignerData() {
  try {
    if (!state.piece) return;
    
    const designer = await API.getDesigner(state.piece.designer_id);
    state.designer = designer;

    elements.designerAvatar.src = designer.avatar_url;
    elements.designerName.textContent = designer.name;
    elements.moreWorksDesigner.textContent = designer.studio_name;

    // Check follow status
    checkFollowStatus();
  } catch (error) {
    console.error('Error loading designer:', error);
  }
}

// Load studio information
async function loadStudioData() {
  try {
    if (!state.piece) return;
    
    const studio = await API.getStudio(state.piece.studio_id);
    state.studio = studio;
  } catch (error) {
    console.error('Error loading studio:', error);
  }
}

// Load more works by the same designer
async function loadMoreWorks() {
  try {
    if (!state.piece) return;

    // Get pieces from the same studio
    const response = await API.getProducts({
      page: 1,
      limit: 8,
    });

    // Filter to exclude current piece and limit to same designer
    const moreWorks = response.data
      .filter(p => p.designer_id === state.piece.designer_id && p.id !== state.piece.id)
      .slice(0, 8);

    renderMoreWorks(moreWorks);
  } catch (error) {
    console.error('Error loading more works:', error);
  }
}

// Render more works grid
function renderMoreWorks(works) {
  elements.moreWorksGrid.innerHTML = works.map(work => `
    <div class="work-item" data-id="${work.id}">
      <img src="${work.image_url}" alt="${work.title}">
      <h4>${work.title}</h4>
      <p>${work.category}</p>
    </div>
  `).join('');

  // Add click handlers
  elements.moreWorksGrid.querySelectorAll('.work-item').forEach(item => {
    item.addEventListener('click', () => {
      const pieceId = item.dataset.id;
      window.location.href = `piece.html?id=${pieceId}`;
    });
  });
}

// Check if piece is saved
async function checkSavedStatus() {
  const auth = API.getAuth();
  if (!auth) return;

  const savedData = await API.getSaved();
  state.isSaved = savedData.pieces.some(p => p.id === state.pieceId);
  
  updateSaveButton();
}

// Update save button UI
function updateSaveButton() {
  elements.saveBtn.textContent = state.isSaved ? 'Saved' : 'Save';
  elements.saveBtn.classList.toggle('saved', state.isSaved);
}

// Check follow status
async function checkFollowStatus() {
  const auth = API.getAuth();
  if (!auth || !state.designer) return;

  const viewerContext = await API.getViewerContext();
  state.isFollowing = viewerContext.followedDesignerIds.includes(state.designer.id);
  
  updateFollowButton();
}

// Update follow button UI
function updateFollowButton() {
  elements.followBtn.textContent = state.isFollowing ? 'Following' : 'Follow';
  elements.followBtn.classList.toggle('following', state.isFollowing);
}

// Setup event listeners
function setupEventListeners() {
  // Save/Unsave piece
  elements.saveBtn.addEventListener('click', handleSaveToggle);

  // Follow/Unfollow designer
  elements.followBtn.addEventListener('click', handleFollowToggle);

  // Note character count
  elements.noteInput.addEventListener('input', updateCharCount);

  // Save note
  elements.saveNoteBtn.addEventListener('click', handleSaveNote);

  // Edit note
  elements.editNoteBtn.addEventListener('click', handleEditNote);

  // Delete note
  elements.deleteNoteBtn.addEventListener('click', handleDeleteNote);
}

// Handle save/unsave toggle
async function handleSaveToggle() {
  try {
    const result = await API.toggleSaved(state.pieceId);
    state.isSaved = result.saved;
    updateSaveButton();
  } catch (error) {
    console.error('Error toggling save:', error);
  }
}

// Handle follow/unfollow toggle
async function handleFollowToggle() {
  try {
    if (!state.designer) return;
    
    const result = await API.toggleFollowDesigner(state.designer.id);
    state.isFollowing = result.following;
    updateFollowButton();
  } catch (error) {
    console.error('Error toggling follow:', error);
  }
}

// Update character count
function updateCharCount() {
  const length = elements.noteInput.value.length;
  elements.charCount.textContent = `${length} / 300`;
}

// Handle save note
function handleSaveNote() {
  const note = elements.noteInput.value.trim();
  if (!note) return;

  state.userNote = note;
  displaySavedNote(note);
  elements.noteInput.value = '';
  updateCharCount();
}

// Display saved note
function displaySavedNote(note) {
  elements.savedNoteText.textContent = note;
  elements.yourNotes.classList.remove('hidden');
  elements.noteInput.style.display = 'none';
  elements.saveNoteBtn.style.display = 'none';
}

// Handle edit note
function handleEditNote() {
  elements.noteInput.value = state.userNote || '';
  elements.noteInput.style.display = 'block';
  elements.saveNoteBtn.style.display = 'block';
  elements.yourNotes.classList.add('hidden');
  updateCharCount();
}

// Handle delete note
function handleDeleteNote() {
  state.userNote = null;
  elements.noteInput.value = '';
  elements.noteInput.style.display = 'block';
  elements.saveNoteBtn.style.display = 'block';
  elements.yourNotes.classList.add('hidden');
  updateCharCount();
}

// Loading strategy recommendations (comments only, no implementation yet):
/*
LOADING STRATEGY RECOMMENDATIONS:

1. CRITICAL PATH (Immediate):
   - Piece image (above the fold)
   - Piece title and studio name
   - Use skeleton screens for these

2. HIGH PRIORITY (Fast):
   - Designer card info
   - Save/Follow buttons state
   - Design details

3. MEDIUM PRIORITY (Progressive):
   - Piece description
   - Tags/categories
   - User notes section

4. LOW PRIORITY (Lazy):
   - More works grid (load on scroll or after main content)
   - Can use intersection observer

IMPLEMENTATION APPROACH:
- Use Promise.all for parallel loading of independent data
- Show skeletons while data loads
- Prioritize above-the-fold content
- Lazy load below-the-fold content
- Cache responses where appropriate
*/

// Start the app
init();