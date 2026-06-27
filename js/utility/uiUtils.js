export function passwordToggle(inputSelector, toggleSelector) {
  const input = typeof inputSelector === 'string' 
    ? document.getElementById(inputSelector) 
    : inputSelector;
    
  const toggle = typeof toggleSelector === 'string' 
    ? document.getElementById(toggleSelector) 
    : toggleSelector;

  if (!toggle || !input) {
    console.warn('Password toggle setup failed: Elements not found');
    return;
  }
  
  toggle.addEventListener('click', () => {
    const isHidden = input.type === 'password';
    
    // Toggle input type
    input.type = isHidden ? 'text' : 'password';
    
    // Toggle icon
    toggle.innerHTML = isHidden 
      ? '<i class="fas fa-eye-slash"></i>' 
      : '<i class="fas fa-eye"></i>';
  });
}

/**
 * Sets up a password visibility toggle for a password input field.
 * 
 * @param {string} inputId - The ID of the password input element
 * @param {string} toggleId - The ID of the toggle button/icon element
 */
export function setupPasswordToggle(inputId, toggleId) {
  const toggle = document.getElementById(toggleId);
  const input = document.getElementById(inputId);

  if (!toggle || !input) {
    console.warn(`Password toggle setup failed: Could not find elements with IDs "\( {inputId}" and " \){toggleId}"`);
    return;
  }

  toggle.addEventListener('click', () => {
    const isHidden = input.type === 'password';
    
    // Toggle input type
    input.type = isHidden ? 'text' : 'password';
    
    // Toggle icon
    toggle.innerHTML = isHidden 
      ? '<i class="fas fa-eye-slash"></i>' 
      : '<i class="fas fa-eye"></i>';
  });
}