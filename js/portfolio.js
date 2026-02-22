const urlParams = new URLSearchParams(window.location.search);
const sellerId = urlParams.get('id') || '1';
const sellerUsername = urlParams.get('username') || 'shop-name';
import {showNotification} from './reconfig.js';

// Initialize everything
document.addEventListener('DOMContentLoaded', function() {
  // Your existing initialization
  loadPortfolioData();
  setupInteractions();
  setupTabs();
  setupShare();
});

let reviewsLoaded = false;

function setupInteractions() {
  // WhatsApp contact button (main)
  const contactBtn = document.getElementById('contactBtn');
  if (contactBtn) {
    contactBtn.addEventListener('click', function() {
      const phone = '2348123456789';
      const message = `Hi! I'm interested in your products on ONTROPP.`;
      const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
      window.open(url, '_blank');
    });
  }
  
  // Follow button
  const followBtn = document.getElementById('followBtn');
  if (followBtn) {
    let isFollowing = false;
    
    followBtn.addEventListener('click', function() {
      isFollowing = !isFollowing;
      
      if (isFollowing) {
        this.innerHTML = '<i class="fas fa-user-check"></i> Following';
        this.classList.add('following');
        showNotification('You are now following this shop');
      } else {
        this.innerHTML = '<i class="fas fa-user-plus"></i> Follow';
        this.classList.remove('following');
      }
    });
  }
}

function setupTabs() {
  const tabs = document.querySelectorAll('.portfolio-tab');
  const tabContents = document.querySelectorAll('.tab-content');
  
  tabs.forEach(tab => {
    tab.addEventListener('click', function() {
      const tabId = this.dataset.tab;
      
      // Update active tab
      tabs.forEach(t => t.classList.remove('active'));
      this.classList.add('active');
      
      // Show selected content
      tabContents.forEach(content => {
        content.classList.remove('active');
      });
      
      const targetContent = document.getElementById(`${tabId}Tab`);
      if (targetContent) targetContent.classList.add('active');
      
      if (tabId === 'reviews' && !reviewsLoaded) {
        loadReviews();
      }
    });
  });
}

async function loadPortfolioData() {
  const sellerData = getMockSellerData(sellerId);
  
  updateHeroSection(sellerData);
  
  await loadProducts(sellerData.products);
  
  window.sellerReviews = sellerData.reviews || [];
}

function loadReviews() {
  // Check if already loaded
  if (reviewsLoaded) {
    console.log('Reviews already loaded');
    return;
  }

  const reviewsGrid = document.getElementById('reviewsGrid');
  if (!reviewsGrid) return;

  const reviews = window.sellerReviews || [];

  if (!reviews || reviews.length === 0) {
    reviewsGrid.innerHTML = '<p style="color: var(--hash); text-align: center; padding: 40px;">No reviews yet</p>';
    return;
  }

  let reviewsHTML = '';
  
  // Calculate average rating
  const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
  const avgRating = (totalRating / reviews.length).toFixed(1);
  
  // Build summary section
  reviewsHTML += `
    <div class="reviews-summary">
      <div class="summary-left">
        <span class="summary-rating">${avgRating}</span>
        <div class="summary-stars">
          ${generateStarRating(avgRating)}
        </div>
        <span class="summary-count">Based on ${reviews.length} reviews</span>
      </div>
      <div class="summary-right">
        <button class="write-review-btn" id="writeReviewBtn">
          <i class="fas fa-pen"></i> Write a Review
        </button>
      </div>
    </div>
  `;
  
  // Build individual reviews
  reviewsHTML += '<div class="reviews-list">';
  
  reviews.forEach(review => {
    const reviewDate = new Date(review.date).toLocaleDateString('en-NG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
    
    reviewsHTML += `
      <div class="review-card">
        <div class="review-header">
          <div class="reviewer-info">
            <div class="reviewer-avatar">
              ${review.userAvatar ? 
                `<img src="${review.userAvatar}" alt="${review.userName}">` : 
                `<div class="avatar-placeholder">${review.userName.charAt(0)}</div>`
              }
            </div>
            <div class="reviewer-details">
              <div class="reviewer-name-row">
                <span class="reviewer-name">${review.userName}</span>
                ${review.verified ? 
                  '<span class="verified-purchase"><i class="fas fa-check-circle"></i> Verified Purchase</span>' : 
                  ''
                }
              </div>
              <div class="review-rating">
                ${generateStarRating(review.rating)}
              </div>
            </div>
          </div>
          <span class="review-date">${reviewDate}</span>
        </div>
        <div class="review-content">
          <p>${review.comment}</p>
        </div>
      </div>
    `;
  });
  
  reviewsHTML += '</div>';
  
  // Add view all link if more than 3 reviews
  if (reviews.length > 3) {
    reviewsHTML += `
      <div class="view-all-reviews">
        <a href="#" id="viewAllReviewsLink">View all ${reviews.length} reviews <i class="fas fa-arrow-right"></i></a>
      </div>
    `;
  }
  
  reviewsGrid.innerHTML = reviewsHTML;
  reviewsLoaded = true;
  
  // Add event listener for write review button
  const writeBtn = document.getElementById('writeReviewBtn');
  if (writeBtn) {
    writeBtn.addEventListener('click', function(e) {
      e.preventDefault();
      showNotification('Review feature coming soon!');
    });
  }
  
  // Add event listener for view all reviews if exists
  const viewAllLink = document.getElementById('viewAllReviewsLink');
  if (viewAllLink) {
    viewAllLink.addEventListener('click', function(e) {
      e.preventDefault();
      showNotification('Showing all reviews...');
      // Could expand or navigate to full reviews page
    });
  }
}

function updateHeroSection(seller) {
  document.getElementById('shopName').textContent = seller.shopName;
  document.getElementById('shopTagline').textContent = seller.tagline;
  
  // Update stats in hero
  document.getElementById('followerCount').textContent = formatNumber(seller.stats.followers);
  document.getElementById('productCount').textContent = seller.stats.products;
  document.getElementById('ratingValue').textContent = seller.stats.rating;
  
  // Update bio if exists
  const bioEl = document.getElementById('shopBio');
  if (bioEl) bioEl.textContent = seller.bio;
  
  // Update avatar
  const shopAvatar = document.getElementById('shopAvatar');
  if (seller.logoUrl) {
    shopAvatar.innerHTML = `<img src="${seller.logoUrl}" alt="${seller.shopName}">`;
  }
}

async function loadProducts(products) {
  const productsGrid = document.getElementById('productsGrid');
  const loadingEl = document.getElementById('loadingProducts');
  
  if (!productsGrid) return;
  
  // Simulate loading
  await new Promise(resolve => setTimeout(resolve, 800));
  
  if (loadingEl) loadingEl.style.display = 'none';
  
  productsGrid.innerHTML = '';
  
  products.forEach(product => {
    const productCard = document.createElement('a');
    productCard.href = `#`;
    productCard.className = 'portfolio-product-card';
    
    productCard.innerHTML = `
      <div class="product-image-portfolio">
        <img src="${product.image}" alt="${product.name}" loading="lazy">
        <div class="product-overlay">
          <div class="quick-actions">
            <button class="quick-action-btn" data-action="whatsapp" data-product-id="${product.id}" data-product-name="${product.name}">
              <i class="fab fa-whatsapp"></i> Order
            </button>
            <button class="quick-action-btn" data-action="favorite" data-product-id="${product.id}">
              <i class="fas fa-heart"></i> Save
            </button>
          </div>
        </div>
      </div>
      <div class="product-details-portfolio">
        <h3 class="product-name-portfolio">${product.name}</h3>
        <div class="product-price-portfolio">₦${formatPrice(product.price)}</div>
        <div class="product-meta">
          <div class="meta-item">
            <i class="fas fa-star"></i> ${product.rating}
          </div>
          <div class="meta-item">
            <i class="fas fa-shopping-bag"></i> ${product.sold} sold
          </div>
        </div>
      </div>
    `;
    
    // WhatsApp order button
    const whatsappBtn = productCard.querySelector('[data-action="whatsapp"]');
    whatsappBtn.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      const productName = this.dataset.productName;
      orderProduct(this.dataset.productId, productName);
    });
    
    // Favorite button
    const favoriteBtn = productCard.querySelector('[data-action="favorite"]');
    favoriteBtn.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      toggleFavorite(this.dataset.productId, this);
    });
    
    productsGrid.appendChild(productCard);
  });
}

function toggleFavorite(productId, button) {
  const icon = button.querySelector('i');
  
  if (icon.classList.contains('fa-heart')) {
    icon.classList.remove('fa-heart');
    icon.classList.add('fa-heart-circle-check');
    button.innerHTML = '<i class=\"fas fa-heart-circle-check\"></i> Saved';
    showNotification('Product saved to favorites', 'success');
  } else {
    icon.classList.remove('fa-heart-circle-check');
    icon.classList.add('fa-heart');
    button.innerHTML = '<i class=\"fas fa-heart\"></i> Save';
  }
}

function orderProduct(productId, productName) {
  const sellerPhone = '2348123456789';
  const message = `Hello! I saw \"${productName}\" on your ONTROPP shop and I'd like to place an order. Product ID: ${productId}`;
  const url = `https://wa.me/${sellerPhone}?text=${encodeURIComponent(message)}`;
  window.open(url, '_blank');
  showNotification('Opening WhatsApp...');
}

function setupViewAllButton() {
  const viewAllBtn = document.getElementById('viewAllProductsBtn');
  if (viewAllBtn) {
    viewAllBtn.addEventListener('click', function() {
      const sellerId = urlParams.get('id') || '1';
      window.location.href = `products.html?seller=${sellerId}`;
    });
  }
}

function setupShare() {
  const shareBtn = document.getElementById('shareBtn');
  if (shareBtn) {
    shareBtn.addEventListener('click', function() {
      if (navigator.share) {
        navigator.share({
          title: document.getElementById('shopName').textContent,
          text: 'Check out this shop on ONTROPP!',
          url: window.location.href
        });
      } else {
        navigator.clipboard.writeText(window.location.href);
        showNotification('Link copied to clipboard!');
      }
    });
  }
}

// Helper functions
function formatPrice(price) {
  return new Intl.NumberFormat('en-NG').format(price);
}

function formatNumber(num) {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toString();
}

// Helper function to generate star ratings HTML
function generateStarRating(rating) {
  const fullStars = Math.floor(rating);
  const halfStar = rating % 1 >= 0.5;
  const emptyStars = 5 - fullStars - (halfStar ? 1 : 0);
  
  let starsHTML = '';
  
  // Full stars
  for (let i = 0; i < fullStars; i++) {
    starsHTML += '<i class="fas fa-star"></i>';
  }
  
  // Half star
  if (halfStar) {
    starsHTML += '<i class="fas fa-star-half-alt"></i>';
  }
  
  // Empty stars
  for (let i = 0; i < emptyStars; i++) {
    starsHTML += '<i class="far fa-star"></i>';
  }
  
  return starsHTML;
}

// Mock data
function getMockSellerData(id) {
  return {
    shopName: 'TechGadgets NG',
    tagline: 'Your trusted source for authentic tech gadgets',
    bio: 'Welcome to TechGadgets NG! We specialize in authentic tech gadgets, mobile accessories, and electronics. With over 5 years of experience, we bring you quality products with warranty and excellent customer service.',
    logoUrl: '',
    stats: {
      products: 146,
      followers: 61000,
      rating: 5.0,
      orders: 892,
      totalReviews: 234 // Added this
    },
    // Added reviews array
    reviews: [
      {
        id: 1,
        userName: "Chidi O.",
        userAvatar: "",
        rating: 5,
        comment: "Got the wireless headphones. Sound quality is amazing and battery lasts forever. Seller responded quickly.",
        date: "2024-02-10",
        verified: true
      },
      {
        id: 2,
        userName: "Aisha B.",
        userAvatar: "",
        rating: 4,
        comment: "Smart watch is authentic and delivery was fast. Only giving 4 stars because the box came slightly dented but product is fine.",
        date: "2024-02-05",
        verified: true
      },
      {
        id: 3,
        userName: "Tunde A.",
        userAvatar: "",
        rating: 5,
        comment: "Best phone case I've bought on ONTROPP. Will definitely order again.",
        date: "2024-01-28",
        verified: true
      }
    ],
    products: [
      {
        id: 1,
        name: 'Wireless Bluetooth Headphones',
        price: 24999,
        image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&h=400&fit=crop',
        rating: 4.8,
        sold: 156
      },
      {
        id: 2,
        name: 'Smart Watch Series 5',
        price: 64999,
        image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&h=400&fit=crop',
        rating: 4.9,
        sold: 89
      },
      {
        id: 3,
        name: 'Phone Case Collection',
        price: 5499,
        image: 'https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=400&h=400&fit=crop',
        rating: 4.5,
        sold: 234
      }
    ] // existing products
  };
}
