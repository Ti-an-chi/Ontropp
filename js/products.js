// products.js
import API from '../api.js';
import { formatPrice} from './shared.js';
import { showNotification } from './reconfig.js'

// State
let productId = null;
let productData = null;
let currentImageIndex = 0;
let isFavourite = false;

// Initialize
document.addEventListener('DOMContentLoaded', async function() {
  // Get product ID from URL
  const urlParams = new URLSearchParams(window.location.search);
  productId = urlParams.get('id');
  
  /*if (!productId) {
    showError('No product specified');
    return;
  }*/
  
  await loadProductData();
  setupEventListeners();
});

/*async function loadProductData() {
  try {
    productData = await API.getProductById(productId);
    renderProduct();
    
    // Load related products
    loadRelatedProducts();
    
  } catch (error) {
    console.error('Failed to load product:', error);
    showError('Failed to load product details');
  }
}
*/
async function loadProductData() {
  try {
    productData = getFakeProduct();
    renderProduct();
    loadRelatedProducts();
  } catch (error) {
    console.error(error);
    showError('Failed to load product details');
  }
}

function renderProduct() {
  // Hide loading, show content
  document.getElementById('loadingState').style.display = 'none';
  document.getElementById('productContent').style.display = 'block';
  
  // Basic info
  document.getElementById('productName').textContent = productData.name;
  document.getElementById('productCategory').textContent = productData.category;
  document.getElementById('productPrice').textContent = `₦${formatPrice(productData.price)}`;
  document.getElementById('productCondition').textContent = productData.condition || 'New';
  document.getElementById('productDescription').textContent = productData.description;
  
  // Stats
  document.getElementById('productViews').textContent = formatNumber(productData.views || 1234);
  document.getElementById('productLikes').textContent = formatNumber(productData.likes || 89);
  
  // Date
  const date = new Date(productData.dateCreated);
  document.getElementById('productDate').textContent = `Listed: ${date.toLocaleDateString('en-NG', { month: 'short', day: 'numeric', year: 'numeric' })}`;
  document.getElementById('productListed').textContent = timeAgo(productData.dateCreated);
  
  // Seller info
  renderSellerInfo();
  
  // Specifications
  renderSpecifications();
  
  // Shipping
  renderShipping();
  
  // Gallery
  renderGallery();
}

function renderSellerInfo() {
  const seller = productData.seller;
  
  document.getElementById('sellerName').textContent = seller.shopName;
  document.getElementById('sellerRating').textContent = seller.rating;
  document.getElementById('sellerFollowers').textContent = formatNumber(seller.followers) + ' followers';
  document.getElementById('sellerResponse').textContent = `Typically responds in ${seller.responseTime || '< 1 hour'}`;
  
  // Verified badge
  const verifiedBadge = document.getElementById('sellerVerified');
  if (seller.isVerified) {
    verifiedBadge.style.display = 'inline-flex';
  } else {
    verifiedBadge.style.display = 'none';
  }
  
  // Seller link
  document.getElementById('sellerLink').href = `portfolio.html?id=${seller.id}`;
}

function renderSpecifications() {
  const specsGrid = document.getElementById('specsGrid');
  const specs = productData.specifications || {};
  
  specsGrid.innerHTML = '';
  
  Object.entries(specs).forEach(([key, value]) => {
    const specItem = document.createElement('div');
    specItem.className = 'spec-item';
    specItem.innerHTML = `
      <span class="spec-label">${key}</span>
      <span class="spec-value">${value}</span>
    `;
    specsGrid.appendChild(specItem);
  });
}

function renderShipping() {
  const locations = productData.locations || [];
  
  document.getElementById('shippingLocations').textContent = locations?.join(', ') || 'Nationwide';
}

function renderGallery() {
  const images = productData.images || [];
  const mainImage = document.getElementById('mainImage');
  const thumbnailsContainer = document.getElementById('galleryThumbnails');
  
  if (images.length === 0) {
    mainImage.src = '';
    mainImage.alt = 'No image available';
    return;
  }
  
  // Set main image
  mainImage.src = productData.cover_image || images[0];
  mainImage.alt = productData.name;
  
  // Create thumbnails
  thumbnailsContainer.innerHTML = '';
  images.forEach((img, index) => {
    const thumb = document.createElement('div');
    thumb.className = `thumbnail ${index === 0 ? 'active' : ''}`;
    thumb.dataset.index = index;
    thumb.innerHTML = `<img src="${img}" alt="Thumbnail ${index + 1}">`;
    thumb.addEventListener('click', () => changeImage(index));
    thumbnailsContainer.appendChild(thumb);
  });
  
  // Setup gallery navigation
  document.getElementById('galleryPrev').addEventListener('click', prevImage);
  document.getElementById('galleryNext').addEventListener('click', nextImage);
}

function changeImage(index) {
  currentImageIndex = index;
  const images = productData.images || [];
  document.getElementById('mainImage').src = images[index];
  
  // Update active thumbnail
  document.querySelectorAll('.thumbnail').forEach((thumb, i) => {
    if (i === index) {
      thumb.classList.add('active');
    } else {
      thumb.classList.remove('active');
    }
  });
}

function prevImage() {
  const images = productData.images || [];
  if (images.length === 0) return;
  currentImageIndex = (currentImageIndex - 1 + images.length) % images.length;
  changeImage(currentImageIndex);
}

function nextImage() {
  const images = productData.images || [];
  if (images.length === 0) return;
  currentImageIndex = (currentImageIndex + 1) % images.length;
  changeImage(currentImageIndex);
}

async function loadRelatedProducts() {
  try {
    const products = await API.getRelatedProducts(productData.category);
    renderRelatedProducts(products);
  } catch (error) {
    console.error('Failed to load related products:', error);
  }
}

function renderRelatedProducts(products) {
  const grid = document.getElementById('relatedGrid');
  grid.innerHTML = '';
  
  products.forEach(product => {
    const card = document.createElement('a');
    card.href = `products.html?id=${product.id}`;
    card.className = 'related-card';
    
    const imageHtml = product.image 
      ? `<img src="${product.image}" alt="${product.name}">`
      : `<i class="fas fa-box"></i>`;
    
    card.innerHTML = `
      <div class="related-image">
        ${imageHtml}
      </div>
      <div class="related-details">
        <div class="related-title">${product.name}</div>
        <div class="related-price">₦${formatPrice(product.price)}</div>
      </div>
    `;
    
    grid.appendChild(card);
  });
}

function setupEventListeners() {
  // Favourite button
  const favBtn = document.getElementById('favouriteBtn');
  favBtn.addEventListener('click', toggleFavourite);
  
  // WhatsApp order
  const waBtn = document.getElementById('whatsappOrderBtn');
  waBtn.addEventListener('click', orderOnWhatsApp);
  
  // Follow seller
  const followBtn = document.getElementById('followSellerBtn');
  followBtn.addEventListener('click', toggleFollowSeller);
  
  // Share
  const shareBtn = document.getElementById('shareProductBtn');
  shareBtn.addEventListener('click', shareProduct);
}

function toggleFavourite() {
  isFavourite = !isFavourite;
  const btn = document.getElementById('favouriteBtn');
  const icon = btn.querySelector('i');
  
  if (isFavourite) {
    icon.className = 'fas fa-heart';
    btn.classList.add('active');
    showNotification('Added to favourites');
  } else {
    icon.className = 'far fa-heart';
    btn.classList.remove('active');
    showNotification('Removed from favourites');
  }
  
  // API call
  API.toggleFavorite(productId);
}

function orderOnWhatsApp() {
  const seller = productData.seller;
  const phone = '2348123456789'; // Get from seller data
  const message = `Hello! I'm interested in buying:\n\n*${productData.name}*\nPrice: ₦${formatPrice(productData.price)}\n\nProduct ID: ${productId}\n\nIs this still available?`;
  
  const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
  window.open(url, '_blank');
  showNotification('Opening WhatsApp...');
}

function toggleFollowSeller() {
  const btn = document.getElementById('followSellerBtn');
  const isFollowing = btn.classList.contains('following');
  
  if (isFollowing) {
    btn.innerHTML = '<i class="fas fa-user-plus"></i> Follow';
    btn.classList.remove('following');
    showNotification('Unfollowed seller');
  } else {
    btn.innerHTML = '<i class="fas fa-user-check"></i> Following';
    btn.classList.add('following');
    showNotification('Now following seller');
  }
}

function shareProduct() {
  const product = productData;
  const shareData = {
    title: product.name,
    text: `Check out ${product.name} on ONTROPP!`,
    url: window.location.href
  };
  
  if (navigator.share) {
    navigator.share(shareData);
  } else {
    navigator.clipboard.writeText(window.location.href);
    showNotification('Link copied to clipboard!');
  }
}

function showError(message) {
  document.getElementById('loadingState').innerHTML = `
    <i class="fas fa-exclamation-circle" style="font-size: 48px; color: var(--error); margin-bottom: 16px;"></i>
    <p style="color: var(--error);">${message}</p>
    <button onclick="history.back()" class="btn btn-primary" style="margin-top: 20px;">Go Back</button>
  `;
}

// Helper functions
function formatNumber(num) {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toString();
}

function timeAgo(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const diffTime = Math.abs(now - date);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  return `${Math.floor(diffDays / 30)} months ago`;
}

// Add showNotification if not in shared.js
if (typeof window.showNotification !== 'function') {
  window.showNotification = showNotification;
}

function getFakeProduct() {
  return {
    id: "prod_001",
    name: "iPhone 13 Pro Max",
    category: "Electronics",
    price: 850000,
    condition: "Used - Like New",
    description: "Clean device. No cracks. Face ID working perfectly. Comes with charger.",
    views: 124,
    likes: 32,
    dateCreated: new Date().toISOString(),
    locations: ["Lagos", "Abuja", "Ibadan"],

    images: [
      "https://via.placeholder.com/600x600",
      "https://via.placeholder.com/600x600?text=Side+View",
      "https://via.placeholder.com/600x600?text=Back+View"
    ],
    
    specifications: {
      Brand: "Apple",
      Storage: "256GB",
      Color: "Graphite"
    },
    
    seller: {
      id: "seller_001",
      shopName: "ONTROPP Gadgets",
      rating: 4.8,
      followers: 1290,
      responseTime: "< 1 hour",
      isVerified: true,
      phone: "2348123456789"
    }
  };
}