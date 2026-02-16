// explore.js - Explore tab functionality with pagination
import { ProductPagination } from './pagination.js';

let pagination;

export async function initExploreTab() {
  try {
    // Initialize pagination
    pagination = new ProductPagination('explore-product-grid', 'explore');
    
    // Setup UI
    setupExploreUI();
    
    // Load initial page (from URL or page 1)
    await pagination.initFromURL();
    
    // Setup interactions
    setupExploreInteractions();
    
  } catch (error) {
    console.error('Failed to load explore content:', error);
    showErrorMessage('Failed to load products.');
  }
}

function setupExploreUI() {
  // Add pagination controls container if not exists
  const productsSection = document.querySelector('.explore-products-section');
  if (productsSection && !document.getElementById('pagination-controls')) {
    const paginationDiv = document.createElement('div');
    paginationDiv.id = 'pagination-controls';
    paginationDiv.className = 'pagination-controls';
    productsSection.appendChild(paginationDiv);
  }
}

function setupExploreInteractions() {
  /* ---------- SEARCH ---------- */
  const searchInput = document.getElementById('explore-search-input');
  if (searchInput) {
    let timeout;
    searchInput.addEventListener('input', function () {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        pagination.search(this.value.trim());
      }, 500);
    });
  }

  /* ---------- CATEGORY ---------- */
  const chips = document.querySelectorAll('.filter-chips .chip');
  chips.forEach(chip => {
    chip.addEventListener('click', function () {
      chips.forEach(c => c.classList.remove('active'));
      this.classList.add('active');

      pagination.filterByCategory(this.dataset.category);
    });
  });

  /* ---------- PRICE ---------- */
  const applyPriceBtn = document.getElementById('apply-price-filter');
  if (applyPriceBtn) {
    applyPriceBtn.addEventListener('click', () => {
      const min = document.getElementById('min-price')?.value;
      const max = document.getElementById('max-price')?.value;

      pagination.filterByPrice(min, max);
    });
  }

  /* ---------- FILTER PANEL UI ---------- */
  const toggleBtn = document.getElementById('filter-toggle-btn');
  const panel = document.getElementById('filter-panel');
  const closeBtn = document.getElementById('close-filter-btn');

  toggleBtn?.addEventListener('click', () => {
    panel.style.display = panel.style.display === 'block' ? 'none' : 'block';
  });

  closeBtn?.addEventListener('click', () => {
    panel.style.display = 'none';
  });

  document.addEventListener('click', (e) => {
    if (
      panel?.style.display === 'block' &&
      !e.target.closest('.filter-panel') &&
      !e.target.closest('#filter-toggle-btn')
    ) {
      panel.style.display = 'none';
    }
  });
}

// Error display function
function showErrorMessage(message) {
  const errorEl = document.createElement('div');
  errorEl.className = 'error-message';
  errorEl.innerHTML = `
    <i class="fas fa-exclamation-circle"></i>
    <span>${message}</span>
  `;
  
  // Insert at top of explore section
  const exploreSection = document.querySelector('.explore-products-section');
  if (exploreSection) {
    exploreSection.insertBefore(errorEl, exploreSection.firstChild);
    
    // Remove after 5 seconds
    setTimeout(() => {
      errorEl.remove();
    }, 5000);
  }
}