import { formatPrice, formatNumber } from './shared.js';

export function renderSellerAdminProducts(products, containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = '';

  products.forEach(product => {
    const status = product.status || (product.is_active ? 'Active' : 'Draft') || 'Unknown';
    const views = formatNumber(product.views || 0);
    const clicks = formatNumber(product.clicks || product.click_count || 0);
    const orders = formatNumber(product.sold_count || product.orders || 0);
    const imageHtml = product.cover_image
      ? `<img src="${product.cover_image}" alt="${product.name}">`
      : '<i class="fas fa-box"></i>';

    const card = document.createElement('div');
    card.className = 'seller-admin-card';
    card.dataset.id = product.id;

    card.innerHTML = `
      <div class="product-overview">
        <div class="product-thumb">${imageHtml}</div>
        <div class="product-details">
          <h3 class="product-name-inline">${product.name}</h3>
          <p class="product-price-inline">₦${formatPrice(product.price || 0)}</p>
          <div class="product-badges">
            <span class="product-badge status">${status}</span>
            ${product.category ? `<span class="product-badge">${product.category}</span>` : ''}
          </div>
        </div>
      </div>
      <div class="product-stats">
        <div class="stat-pill">
          <span>Views</span>
          <strong>${views}</strong>
        </div>
        <div class="stat-pill">
          <span>Clicks</span>
          <strong>${clicks}</strong>
        </div>
        <div class="stat-pill">
          <span>Orders</span>
          <strong>${orders}</strong>
        </div>
      </div>
      <div class="product-actions">
        <a href="product.html?id=${product.id}" class="view-btn" data-action="view" data-id="${product.id}">View</a>
        <button class="edit-btn" data-action="edit" data-id="${product.id}">Edit</button>
        <button class="delete-btn" data-action="delete" data-id="${product.id}">Delete</button>
      </div>
    `;

    container.appendChild(card);
  });
}

export function bindSellerAdminActions(containerId, handlers = {}) {
  const container = document.getElementById(containerId);
  if (!container) return;

  container.addEventListener('click', async (event) => {
    const actionButton = event.target.closest('[data-action]');
    if (!actionButton) return;

    const action = actionButton.dataset.action;
    const productId = actionButton.dataset.id;

    if (!productId || !action) return;

    event.preventDefault();

    if (action === 'edit' && typeof handlers.onEdit === 'function') {
      handlers.onEdit(productId);
      return;
    }

    if (action === 'delete' && typeof handlers.onDelete === 'function') {
      handlers.onDelete(productId);
      return;
    }

    if (action === 'view') {
      if (typeof handlers.onView === 'function') {
        handlers.onView(productId);
        return;
      }
      const href = actionButton.closest('a')?.href;
      if (href) {
        window.location.href = href;
        return;
      }
    }
  });
}
