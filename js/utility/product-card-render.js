// product-card-renderer.js
import { formatPrice, viewProductDetails } from './shared.js';   // adjust import path as needed

export class ProductCardRenderer {
  /**
   * @param {string} containerId - The ID of the container element
   */
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    if (!this.container) {
      throw new Error(`Container with id "${containerId}" not found.`);
    }

    // Default configuration (mirrors the current 'explore' style)
    this.config = {
      showSeller: false,
      showTitle: true,
      showPrice: true,
      cardClass: 'explore-product-card',
      imageClass: 'explore-product-image',
      detailsClass: 'explore-product-details',
      titleClass: 'explore-product-title',
      priceClass: 'explore-product-price',
      sellerClass: 'product-seller-info',      // you may adjust these if needed
      ratingClass: 'seller-rating'
    };
  }

  // --- Builder methods to enable/disable sections ---

  /** Include seller info (logo, shop name, rating) */
  withSeller(show = true) {
    this.config.showSeller = show;
    return this;
  }

  /** Show/hide the product title */
  withTitle(show = true) {
    this.config.showTitle = show;
    return this;
  }

  /** Show/hide the price */
  withPrice(show = true) {
    this.config.showPrice = show;
    return this;
  }

  // Optional: customise CSS classes if you ever need different styles
  withCardClass(cls) {
    this.config.cardClass = cls;
    return this;
  }
  withImageClass(cls) {
    this.config.imageClass = cls;
    return this;
  }
  withDetailsClass(cls) {
    this.config.detailsClass = cls;
    return this;
  }
  withTitleClass(cls) {
    this.config.titleClass = cls;
    return this;
  }
  withPriceClass(cls) {
    this.config.priceClass = cls;
    return this;
  }

  // --- Render all products ---

  render(products) {
    this.container.innerHTML = '';
    products.forEach(product => {
      const card = this._buildCard(product);
      this.container.appendChild(card);
    });
  }

  // --- Private helpers ---

  _buildCard(product) {
    const card = document.createElement('div');
    card.className = this.config.cardClass;
    card.dataset.id = product.id;
    
    // Click navigates to product detail (same behaviour as before)
    card.addEventListener('click', (e) => {
      e.preventDefault();
      viewProductDetails(product.id);
    });

    // Image block (always shown)
    const imgHtml = product.cover_image
      ? `<img src="${product.cover_image}" alt="${product.name}">`
      : `<i class="fas fa-box"></i>`;

    // Optional seller block
    let sellerHtml = '';
    if (this.config.showSeller) {
      sellerHtml = `
        <div class="${this.config.sellerClass}">
          <div class="seller-avatar-small">
            <img src="${product.seller?.logo_url}" alt="Seller logo">
          </div>
          <div class="seller-details">
            <h4 class="seller-name">${product.seller?.shop_name || 'Seller'}</h4>
            <span class="${this.config.ratingClass}">
              <i class="fas fa-star"></i> ${product.rating || '4.5'}
            </span>
          </div>
        </div>`;
    }

    // Optional title
    const titleHtml = this.config.showTitle
      ? `<h3 class="${this.config.titleClass}">${product.name}</h3>`
      : '';

    // Optional price
    const priceHtml = this.config.showPrice
      ? `<p class="${this.config.priceClass}">₦${formatPrice(product.price)}</p>`
      : '';

    card.innerHTML = `
      <div class="${this.config.imageClass}">${imgHtml}</div>
      <div class="${this.config.detailsClass}">
        ${sellerHtml}
        ${titleHtml}
        ${priceHtml}
      </div>`;

    return card;
  }
}