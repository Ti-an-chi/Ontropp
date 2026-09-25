import PasswordInput from './js/uiTools/passwordInput.js';

const passwordField = new PasswordInput({
  id: 'password',
  name: 'password',
  placeholder: 'Enter your password',
  required: true,
  autocomplete: 'current-password',
  showStrength: true
})

const confirmField = new PasswordInput({
  id: 'confirmPassword',
  name: 'confirmPassword',
  placeholder: 'Confirm password',
  autocomplete: 'new-password',
  required: true,
  showStrength: true
})


/* ---------  Session Check on Load  --------- */
(async () => {
  try {
      const token = localStorage.getItem('ontrop_token');
      if (token) {
        const data = await window.API.tokenPing();
        if (data?.success) {
          location.href = 'dashboard.html';
        }
      }
  } catch {
    window.API.clearTokens();
  }
})();

const $ = id => document.getElementById(id);

/* ----------  DOM & State  ---------- */
const signupSection   = $('signupSection');
const verifySection   = $('verifySection');
const messageEl       = $('message');
const verifyMsgEl     = $('verifyMsg');
const signupForm      = $('signupForm');
const authBtn         = $('authBtn');
const resendBtn       = $('resendBtn');
const verifyBtn       = $('verifyBtn');
const emailText       = $('emailText');
const emailMasked     = $('emailMasked');

let mode = 'signin';
let pendingEmail = null;

/* ----------  One-time init  ---------- */
document.addEventListener('DOMContentLoaded', () => {
  const urlParams = new URLSearchParams(window.location.search);
  mode = urlParams.get('mode') || getSavedMode();
  init();
});

function init() {
  passwordField.mount('#passwordMount');
  confirmField.mount('#confirmPasswordMount');

  passwordField.strength(false);
  confirmField.strength(false);

  document.getElementById('toggleText').innerHTML =
    `<p>Don't have an account? <a href="#" id="togBtn">Sign up</a></p>`;

  renderUI();
}

/* ----------  STATE FUNCTIONS  ---------- */
function getSavedMode() {
  return localStorage.getItem('mod') || 'signin';
}

function setMode(newMode) {
  mode = newMode;
  localStorage.setItem('mod', mode);
  renderUI();
}

function toggleMode() {
  setMode(mode === 'signin' ? 'signup' : 'signin');
}

/* ----------  VIEW FUNCTION  ---------- */
function renderUI() {
  const isSignup = mode === 'signup';

  document.querySelector('.form-title').textContent =
    isSignup ? 'Create Account' : 'Log In';

  document.querySelector('.form-subtitle').textContent =
    isSignup
      ? 'Join ONTROPP and start showcasing'
      : 'Welcome back — sign in to continue';

  authBtn.value = isSignup ? 'Create Account' : 'Log In';

  // Show/hide signup-only field groups
  ['uname', 'confPass'].forEach(id => {
    document.getElementById(id).style.display = isSignup ? 'block' : 'none';
  });

  // Sync native `required` on every signup-only input
  $('username').required            = isSignup;
  confirmField.input.required       = isSignup;

  // Strength meters: only meaningful while creating a new password
  passwordField.strength(isSignup);
  confirmField.strength(isSignup);

  document.getElementById('toggleText').innerHTML =
    isSignup
      ? `<p>Already have an account? <a href="#" id="togBtn">Log in</a></p>`
      : `<p>Don't have an account? <a href="#" id="togBtn">Sign up</a></p>`;

  attachToggleListener();
  hideMessage();
}

function attachToggleListener() {
  const btn = document.getElementById('togBtn');
  if (btn) {
    btn.onclick = (e) => {
      e.preventDefault();
      toggleMode();
    };
  }
}

/* ----------  Helpers  ---------- */
function showMessage(txt, type = 'error', target = 'form') {
    const el = target === 'verify' ? verifyMsgEl : messageEl;
    el.textContent = txt;
    el.className = 'message ' + type;
    el.style.display = 'block';
    setTimeout(() => el.style.display = 'none', 5000);
}

function hideMessage(target = 'form') {
    (target === 'verify' ? verifyMsgEl : messageEl).style.display = 'none';
}

function maskEmail(e) {
    const [name, domain] = e.split('@');
    return name.length <= 3 
        ? `${name[0]}***@${domain}`
        : `${name.slice(0, 2)}***${name.slice(-1)}@${domain}`;
}

function setLoadingState(on) {
    authBtn.disabled = on;
    authBtn.value = on 
        ? (mode === 'signup' ? 'Creating...' : 'Logging in...')
        : (mode === 'signup' ? 'Create Account' : 'Log In');
}

function setVerifyLoading(on) {
    verifyBtn.disabled = on;
    verifyBtn.textContent = on ? 'Verifying...' : 'Verify';
}

/* ----------  Form Validation  ---------- */
function validateForm() {
    const email = $('email').value.trim();
    const pass = passwordField.value;
    
    if (!email.includes('@')) {
        showMessage('Valid email required');
        return false;
    }
    if (pass.length < 6) {
        showMessage('Password must be 6+ characters');
        return false;
    }
    if (mode === 'signup') {
        if (!$('username').value.trim()) {
            showMessage('Username required');
            return false;
        }
        if (pass !== confirmField.value) {
            showMessage('Passwords don’t match');
            return false;
        }
    }
    return true;
}

/* ----------  OTP Input Handling  ---------- */
const otpInputs = document.querySelectorAll('.otp input');

otpInputs.forEach((input, i) => {
    input.addEventListener('input', (e) => {
        e.target.value = e.target.value.replace(/\D/g, '');
        
        if (e.target.value && i < otpInputs.length - 1) {
            otpInputs[i + 1].focus();
        }
        
        const complete = [...otpInputs].every(inp => inp.value.length === 1);
        verifyBtn.disabled = !complete;
    });
    
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Backspace' && !e.target.value && i > 0) {
            otpInputs[i - 1].focus();
        }
    });
});

/* ----------  Submit Handler  ---------- */
signupForm.addEventListener('submit', async e => {
  e.preventDefault();
  if (!validateForm()) return;
  
  const email = $('email').value.trim();
  const pass = passwordField.value;
  
  setLoadingState(true);
  hideMessage();

  try {
    if (mode === 'signup') {
      const response = await window.API.createTestAccount(
        email,
        pass,
        $('username').value.trim(),
      )
      
      showMessage('Account created successfully! redirecting...');
      const loginResponse = await window.API.login(email, pass);
      sessionStorage.setItem(
        'bootstrap',
        JSON.stringify(loginResponse.bootstrap)
      );
      location.href = 'dashboard.html';
    
    } else if (mode === 'signin') {
      const response = await window.API.dashLogin(email, pass);
      if (!response.success) throw new Error(response.message || 'Login failed');
      
      sessionStorage.setItem(
        'bootstrap',
        JSON.stringify(response.bootstrap)
      );
      location.href = 'dashboard.html';
    }
  } catch (err) {
    showMessage(err.message);
  } finally {
    setLoadingState(false);
  }
});

/* ----------  OTP Verification  ---------- */
function openVerifyUI(email) {
    emailText.textContent = email;
    emailMasked.textContent = maskEmail(email);
    signupSection.style.display = 'none';
    verifySection.style.display = 'block';
    otpInputs[0].focus();
    hideMessage('verify');
}

verifyBtn.addEventListener('click', async () => {
    const code = [...otpInputs].map(inp => inp.value).join('');
    if (code.length !== 6) {
        showMessage('Please enter all 6 digits', 'error', 'verify');
        return;
    }
    
    setVerifyLoading(true);
    
    try {
        const response = await window.API.verifyOtp(pendingEmail, code);
        if (!response.success) throw new Error(response.message || 'Invalid code');
        
        window.API.setTokens(response);
        UserSession.setCurrentUser(response.user);
        localStorage.removeItem('pendingSignupEmail');
        
        showMessage('Email verified! Redirecting...', 'success', 'verify');
        setTimeout(() => location.href = 'dashboard.html', 1000);
        
    } catch (err) {
        showMessage(err.message, 'error', 'verify');
        otpInputs.forEach(inp => inp.value = '');
        otpInputs[0].focus();
    } finally {
        setVerifyLoading(false);
    }
});

/* ----------  Resend OTP  ---------- */
resendBtn.addEventListener('click', async () => {
    if (!pendingEmail) return;
    
    resendBtn.disabled = true;
    resendBtn.textContent = 'Sending...';
    
    try {
        const response = await window.API.resendOtp(pendingEmail);
        if (!response.success) throw new Error(response.message || 'Failed to resend');
        
        showMessage('New code sent! Check your email.', 'success', 'verify');
    } catch (err) {
        showMessage(err.message, 'error', 'verify');
    } finally {
        setTimeout(() => {
            resendBtn.disabled = false;
            resendBtn.textContent = 'Resend Code';
        }, 30000);
    }
});

/* ----------  Redirect Handlers  ---------- */
document.getElementById('toLogin2').addEventListener('click', (e) => {
    e.preventDefault();
    verifySection.style.display = 'none';
    signupSection.style.display = 'block';
    otpInputs.forEach(inp => inp.value = '');
    setMode('signin');
});

/*========= Session Helper =========*/
window.UserSession = {
  setCurrentUser(user) {
    localStorage.setItem('ontrop_user', JSON.stringify(user));
  },
  getCurrentUser() {
    const user = localStorage.getItem('ontrop_user');
    return user ? JSON.parse(user) : null;
  },
  getUserSession() {
    const session = localStorage.getItem(ontrop-token);
    return session ? JSON.parse(session) : null;
  },
  clear() {
    localStorage.removeItem('ontrop_user');
  }
};