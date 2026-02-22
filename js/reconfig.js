export function updateElement(id, value, property = 'textContent') {
  const el = document.getElementById(id);
  if (!el || value === undefined || value === null) return;

  el[property] = value;
}

export function changeDisplay(id, display) {
  const el = document.getElementById(id);
  if (!el || display === undefined || display === null) return;
  
  el.style.display = display;
}

export function showNotification(message, type= 'info'){
  // Remove existing notifications
  const existing = document.querySelector('.notification');
  if (existing) existing.remove();
  
  const notification = document.createElement('div');
  notification.className = 'notification';
  notification.innerHTML = `
    <i class=\"fas fa-check-circle\"></i>
    <span>${message}</span>
  `;
  
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: var(--${type}, #10B981);
    color: white;
    padding: 16px 24px;
    border-radius: 12px;
    display: flex;
    align-items: center;
    gap: 12px;
    z-index: 10000;
    box-shadow: 0 8px 32px rgba(0,0,0,0.2);
    animation: slideIn 0.3s ease;
    font-family: inherit;
  `;
  
  // Add animation keyframes if not exists
  if (!document.getElementById('notif-styles')) {
    const style = document.createElement('style');
    style.id = 'notif-styles';
    style.textContent = `
      @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
      @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
      }
    `;
    document.head.appendChild(style);
  }
  
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.style.animation = 'slideOut 0.3s ease forwards';
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

// Navigate to seller profile
export function viewSellerProfile(sellerId) {
  window.location.href = `/portfolio.html?id=${sellerId}`;
}
