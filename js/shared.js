export function renderProducts(products, containerId, type = 'product') {
  const container = document.getElementById(containerId);
  if (!container) return;
  console.log('debugging...');
  
  container.innerHTML = '';
  
  // Configuration map for type-specific properties
  const config = {
    explore: {
      tag: 'a',
      className: 'explore-product-card',
      imageClass: 'explore-product-image',
      detailsClass: 'explore-product-details',
      titleClass: 'explore-product-title',
      priceClass: 'explore-product-price',
      showSeller: true,
      isClickable: true
    },
    seller: {
      tag: 'div',
      className: 'product-card',
      imageClass: 'product-image',
      detailsClass: 'product-details',
      titleClass: 'product-title',
      priceClass: 'product-price',
      showActions: true,
    },
    product: {
      tag: 'div',
      className: 'recommended-item',
      imageClass: 'item-image',
      detailsClass: 'item-details',
      titleClass: 'item-title',
      priceClass: 'item-price',
      showSeller: true,
      isClickable: true
    }
  };
  
  const cfg = config[type] || config.product;
  
  products.forEach(product => {
    const card = document.createElement(cfg.tag);
    card.className = cfg.className;
    
    if (cfg.isClickable) {
      card.href = '#';
      
      card.addEventListener('click', (e) => {
        e.preventDefault();
        viewProductDetails(product.id);
      });
    }
    
    const sellerInfo = cfg.showSeller? `
      <div class="product-seller-info">
        <div class="seller-avatar-small" >
          <img src=${product.seller?.logo_url}></img>
        </div>
        <div class="seller-details">
          <h4 class="seller-name">${product.seller?.shop_name || 'Seller'}</h4>
          <span class="seller-rating">
            <i class="fas fa-star"></i> ${product.rating || '4.5'}
          </span>
        </div>
      </div>
    ` : '';
    
    const actions = cfg.showActions ? `
      <div class="product-actions">
        <button class="action-btn edit-btn" data-id="${product.id}">
          <i class="fas fa-edit"></i>
        </button>
        <button class="action-btn delete-btn" data-id="${product.id}">
          <i class="fas fa-trash"></i>
        </button>
      </div>
    ` : '';
    
    const imgHtml = product.cover_image ? 
      `<img src="${product.cover_image}" alt="${product.name}">` : 
      `<i class="fas fa-box"></i>`;
    
    card.innerHTML = `
      <div class="${cfg.imageClass}">${imgHtml}</div>
      <div class="${cfg.detailsClass}">
        ${sellerInfo}
        <h3 class="${cfg.titleClass}">${product.name}</h3>
        <p class="${cfg.priceClass}">₦${formatPrice(product.price)}</p>
        ${actions}
      </div>
    `;
    
    container.appendChild(card);
  });
  
  if (type === 'seller') setupSellerProductActions();
}


function setupSellerProductActions() {
  const container = document.getElementById('seller-products-grid');
  if (!container) return;
  
  container.addEventListener('click', function(e) {
    const editBtn = e.target.closest('.edit-btn');
    const deleteBtn = e.target.closest('.delete-btn');
    
    if (editBtn) {
      e.preventDefault();
      const productId = editBtn.dataset.id;
      alert(`Edit product ${productId} - feature coming soon!`);
    }
    
    if (deleteBtn) {
      e.preventDefault();
      const productId = deleteBtn.dataset.id;
      if (confirm('Are you sure you want to delete this product?')) {
        alert(`Delete product ${productId} - feature coming soon!`);
      }
    }
  });
}

export function viewProductDetails(productId) {
  // Navigate to product details page
  console.log('View product:', productId);
  window.location.href = `product.html?id=${productId}`;
}

export function formatPrice(price) {
  return new Intl.NumberFormat('en-NG').format(price);
}
