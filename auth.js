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
const passwordInput   = $('password');
const passwordStrengthEl = $('passwordStrength');

let mode = 'signin';
let pendingEmail = null;
document.addEventListener('DOMContentLoaded', () => {
    const saved = localStorage.getItem('mod');
    if (saved) mode = saved;
    toggleMode();
});

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

/* ----------  Password Strength Meter  ---------- */
passwordInput.addEventListener('input', () => {
    const pass = passwordInput.value;
    const checks = [/[a-z]/, /[A-Z]/, /[0-9]/, /[^A-Za-z0-9]/];
    const score = checks.reduce((a, r) => a + r.test(pass), 0) + (pass.length >= 8 ? 1 : 0);
    const levels = ['Very Weak', 'Weak', 'Fair', 'Good', 'Strong', 'Very Strong'];
    const colors = ['#ef4444', '#f97316', '#eab308', '#84cc16', '#22c55e', '#16a34a'];
    
    passwordStrengthEl.textContent = `Password Strength: ${levels[score]}`;
    passwordStrengthEl.style.color = colors[score];
});

/* ----------  Mode Toggle (Sign Up ⇄ Log In)  ---------- */
document.getElementById('togBtn').addEventListener('click', toggleMode);

function toggleMode(e) {
    if (e) e.preventDefault();
    mode = mode === 'signup' ? 'signin' : 'signup';
    
    document.querySelector('.form-title').textContent = 
        mode === 'signup' ? 'Create Seller Account' : 'Log In';
    authBtn.value = mode === 'signup' ? 'Create Account' : 'Log In';
    
    // Show/hide signup-only fields
    ['uname', 'confPass'].forEach(id => {
        const group = document.getElementById(id);
        const input = group.querySelector('input');
        group.style.display = mode === 'signup' ? 'block' : 'none';
        input.required = mode === 'signup';
    });
    
    document.getElementById('toggleText').innerHTML = mode === 'signup'
        ? '<p>Already have an account? <a href="#" id="togBtn">Log in</a></p>'
        : `<p>Don't have an account? <a href="#" id="togBtn">Sign up</a></p>`;
    
    document.getElementById('togBtn').onclick = toggleMode;
    hideMessage();
    localStorage.setItem('mod', mode);
}

/* ----------  Form Validation  ---------- */
function validateForm() {
    const email = $('email').value.trim();
    const pass = $('password').value;
    
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
        if (pass !== $('confirmPassword').value) {
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
        // Only allow numbers
        e.target.value = e.target.value.replace(/\D/g, '');
        
        // Auto-advance
        if (e.target.value && i < otpInputs.length - 1) {
            otpInputs[i + 1].focus();
        }
        
        // Check completion
        const complete = [...otpInputs].every(inp => inp.value.length === 1);
        verifyBtn.disabled = !complete;
    });
    
    // Handle backspace
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
    const pass = $('password').value;
    
    setLoadingState(true);
    hideMessage();

    try {
        if (mode === 'signup') {
            // Step 1: Request OTP
            const response = await window.API.requestOtp(
                email,
                pass,
                $('username').value.trim()
            );
            
            if (!response.success) throw new Error(response.message || 'Signup failed');
            
            pendingEmail = email;
            localStorage.setItem('pendingSignupEmail', email);
            showMessage('Account created! Check your email for the code.', 'success');
            openVerifyUI(email);
            
        } else if (mode === 'signin') {
            // Direct login
            const response = await window.API.login(email, pass);
            if (!response.success) throw new Error(response.message || 'Login failed');
            
            window.API.setTokens(response);
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
        
        // Success! Store tokens and redirect
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
        }, 30000); // 30s cooldown
    }
});

/* ----------  Redirect Handlers  ---------- */
document.getElementById('toLogin2').addEventListener('click', (e) => {
    e.preventDefault();
    verifySection.style.display = 'none';
    signupSection.style.display = 'block';
    otpInputs.forEach(inp => inp.value = '');
    mode = 'signin';
    toggleMode();
});

/* ----------  Session Check on Load  ---------- */
(async () => {
    try {
        const token = localStorage.getItem('ontrop_token');
        if (token) {
            // Verify token is still valid
            const { data } = await window.API.ping();
            if (data?.ok) location.href = 'dashboard.html';
        }
    } catch {
        // Token invalid, clear it
        window.API.clearTokens();
    }
})();


/*========= Session Helper =========*/
window.UserSession = {
  setCurrentUser(user) {
    localStorage.setItem('ontrop_user', JSON.stringify(user));
  },
  getCurrentUser() {
    const user = localStorage.getItem('ontrop_user');
    return user ? JSON.parse(user) : null;
  },
  clear() {
    localStorage.removeItem('ontrop_user');
  }
};

