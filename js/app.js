/**
 * ONE VOICE - Core Application Controller
 * Handles Multilingual Routing (EN/HA), User Registration, Login,
 * OTP Verification (6-digit), Dashboard, Contacts, Settings, Audio DTMF,
 * Live Calling Simulator, Wallet Management, and Secure Logout.
 */

document.addEventListener('DOMContentLoaded', () => {
    // ----------------------------------------------------
    // State Management
    // ----------------------------------------------------
    let currentUser = null;
    let otpCountdownTimer = null;
    let otpSecondsLeft = 300;
    let pendingLoginIdentifier = '';
    
    // Dialer & Calling State
    let currentDialNumber = '';
    let callTimer = null;
    let callSeconds = 0;
    let isCallActive = false;
    let currentCallRate = 0.05;
    let activeCallCountry = 'International';
    let userWalletBalance = 15.00;
    let selectedTopupAmount = 10;
    let cachedRates = [];

    // ----------------------------------------------------
    // DOM Elements - Views & Containers
    // ----------------------------------------------------
    const viewWelcome = document.getElementById('welcome-section');
    const viewRegister = document.getElementById('view-register');
    const viewRegSuccess = document.getElementById('view-reg-success');
    const viewLogin = document.getElementById('view-login');
    const viewOtp = document.getElementById('view-otp');
    const viewForgotPassword = document.getElementById('view-forgot-password');
    const viewResetPassword = document.getElementById('view-reset-password');
    const viewDashboard = document.getElementById('dashboard-section');
    const contactsView = document.getElementById('contacts-view');
    const settingsView = document.getElementById('settings-view');

    // Navigation elements
    const publicNavLinks = document.getElementById('public-nav-links');
    const authNavLinks = document.getElementById('auth-nav-links');
    const publicAuthBtns = document.getElementById('public-auth-btns');
    const authUserBtns = document.getElementById('auth-user-btns');
    const navMemberBadge = document.getElementById('nav-member-badge');
    const navBalanceDisplay = document.getElementById('nav-balance');
    const brandLogo = document.getElementById('nav-brand-logo');

    // Dashboard info elements
    const dashUserName = document.getElementById('dash-user-name');
    const dashMemberId = document.getElementById('dash-member-id');
    const dashWalletBalance = document.getElementById('dash-wallet-balance');
    const dashLangBadge = document.getElementById('dash-language-badge');

    // Phone / Dialer Elements
    const dialDisplay = document.getElementById('dial-number');
    const dialCountry = document.getElementById('dial-country');
    const callingOverlay = document.getElementById('calling-overlay');
    const overlayName = document.getElementById('overlay-country-name');
    const overlayNumber = document.getElementById('overlay-phone-number');
    const overlayStatus = document.getElementById('overlay-call-status');
    const overlayTimer = document.getElementById('overlay-call-timer');
    const overlayRate = document.getElementById('overlay-call-rate');
    const callBtn = document.getElementById('btn-make-call');
    const endCallBtn = document.getElementById('btn-end-call');
    const backspaceBtn = document.getElementById('btn-dial-backspace');
    const dialClearBtn = document.getElementById('btn-dial-clear');
    
    // Wallet & Table Elements
    const walletBalanceEl = document.getElementById('wallet-balance');
    const ratesGrid = document.getElementById('rates-grid');
    const ratesSearch = document.getElementById('rates-search');
    const transactionsList = document.getElementById('transactions-body');
    const callLogsList = document.getElementById('call-logs-body');
    const contactsContainer = document.getElementById('contacts-list-container');

    // Modals
    const topupModal = document.getElementById('topup-modal');
    const logoutModal = document.getElementById('logout-modal');
    const addContactModal = document.getElementById('add-contact-modal');

    // ----------------------------------------------------
    // 1. View Navigation Controller
    // ----------------------------------------------------
    function hideAllAuthViews() {
        [viewRegister, viewRegSuccess, viewLogin, viewOtp, viewForgotPassword, viewResetPassword].forEach(v => {
            if (v) v.classList.remove('active');
        });
    }

    function showView(name) {
        hideAllAuthViews();

        if (name === 'welcome') {
            if (viewWelcome) viewWelcome.style.display = 'grid';
            if (viewDashboard) viewDashboard.classList.remove('active');
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } else if (name === 'dashboard') {
            if (viewWelcome) viewWelcome.style.display = 'none';
            if (viewDashboard) viewDashboard.classList.add('active');
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } else {
            // An auth page view
            if (viewWelcome) viewWelcome.style.display = 'none';
            if (viewDashboard) viewDashboard.classList.remove('active');

            if (name === 'register' && viewRegister) viewRegister.classList.add('active');
            if (name === 'reg-success' && viewRegSuccess) viewRegSuccess.classList.add('active');
            if (name === 'login' && viewLogin) viewLogin.classList.add('active');
            if (name === 'otp' && viewOtp) viewOtp.classList.add('active');
            if (name === 'forgot' && viewForgotPassword) viewForgotPassword.classList.add('active');
            if (name === 'reset' && viewResetPassword) viewResetPassword.classList.add('active');

            window.scrollTo({ top: 120, behavior: 'smooth' });
        }
    }

    // ----------------------------------------------------
    // 2. Localization & Language Setup (EN / HA)
    // ----------------------------------------------------
    if (window.locManager) {
        window.locManager.applyTranslations();
    }

    const langButtons = document.querySelectorAll('.lang-select-btn');
    langButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const lang = btn.getAttribute('data-lang');
            if (window.locManager) {
                window.locManager.setLanguage(lang);
                showToast(lang === 'ha' ? 'An canza harshe zuwa Hausa' : 'Language switched to English', 'info');
            }
        });
    });

    // ----------------------------------------------------
    // 3. Navigation Event Listeners
    // ----------------------------------------------------
    if (brandLogo) {
        brandLogo.addEventListener('click', (e) => {
            e.preventDefault();
            if (currentUser) {
                showView('dashboard');
            } else {
                showView('welcome');
            }
        });
    }

    // Welcome Page Action Triggers
    const heroBtnCreate = document.getElementById('hero-btn-create-account');
    const heroBtnLogin = document.getElementById('hero-btn-login');
    const navBtnLogin = document.getElementById('nav-btn-login');
    const navBtnRegister = document.getElementById('nav-btn-register');

    if (heroBtnCreate) heroBtnCreate.addEventListener('click', () => showView('register'));
    if (heroBtnLogin) heroBtnLogin.addEventListener('click', () => showView('login'));
    if (navBtnLogin) navBtnLogin.addEventListener('click', () => showView('login'));
    if (navBtnRegister) navBtnRegister.addEventListener('click', () => showView('register'));

    // Auth cross-links
    const linkToLogin = document.getElementById('link-to-login');
    const linkToRegister = document.getElementById('link-to-register');
    const linkForgot = document.getElementById('link-forgot-password');
    const linkForgotBack = document.getElementById('link-forgot-back-to-login');
    const btnSuccessLogin = document.getElementById('btn-success-goto-login');

    if (linkToLogin) linkToLogin.addEventListener('click', (e) => { e.preventDefault(); showView('login'); });
    if (linkToRegister) linkToRegister.addEventListener('click', (e) => { e.preventDefault(); showView('register'); });
    if (linkForgot) linkForgot.addEventListener('click', (e) => { e.preventDefault(); showView('forgot'); });
    if (linkForgotBack) linkForgotBack.addEventListener('click', (e) => { e.preventDefault(); showView('login'); });
    if (btnSuccessLogin) btnSuccessLogin.addEventListener('click', () => showView('login'));

    // ----------------------------------------------------
    // 4. Registration Submission
    // ----------------------------------------------------
    const formRegister = document.getElementById('form-register');
    if (formRegister) {
        formRegister.addEventListener('submit', async (e) => {
            e.preventDefault();
            const name = document.getElementById('reg-name').value.trim();
            const phone = document.getElementById('reg-phone').value.trim();
            const email = document.getElementById('reg-email').value.trim();
            const pass = document.getElementById('reg-password').value;
            const confirmPass = document.getElementById('reg-confirm-password').value;
            const terms = document.getElementById('reg-terms').checked;

            if (pass !== confirmPass) {
                showToast('Passwords do not match.', 'error');
                return;
            }

            const btn = document.getElementById('btn-submit-register');
            btn.disabled = true;
            btn.textContent = 'Creating Account...';

            try {
                const res = await fetch('api/auth.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        action: 'register',
                        name: name,
                        phone: phone,
                        email: email,
                        password: pass,
                        confirm_password: confirmPass,
                        terms_accepted: terms
                    })
                });
                const data = await res.json();

                if (data.success) {
                    showToast('Account created successfully!', 'success');
                    const succId = document.getElementById('success-member-id');
                    if (succId) succId.textContent = `Member ID: ${data.member_id}`;
                    showView('reg-success');
                } else {
                    showToast(data.message || 'Registration failed', 'error');
                }
            } catch (err) {
                showToast('Network or server error during registration', 'error');
            } finally {
                btn.disabled = false;
                btn.textContent = 'Register';
            }
        });
    }

    // ----------------------------------------------------
    // 5. Login Submission (Step 1 -> Dispatch OTP)
    // ----------------------------------------------------
    const formLogin = document.getElementById('form-login');
    if (formLogin) {
        formLogin.addEventListener('submit', async (e) => {
            e.preventDefault();
            const id = document.getElementById('login-identifier').value.trim();
            const pass = document.getElementById('login-password').value;

            const btn = document.getElementById('btn-submit-login');
            btn.disabled = true;
            btn.textContent = 'Verifying Credentials...';

            try {
                const res = await fetch('api/auth.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        action: 'login',
                        identifier: id,
                        password: pass
                    })
                });
                const data = await res.json();

                if (data.success && data.otp_sent) {
                    pendingLoginIdentifier = id;
                    const otpTargetDisplay = document.getElementById('otp-target-display');
                    if (otpTargetDisplay) otpTargetDisplay.textContent = id;

                    showToast(data.message, 'success');
                    if (data.debug_hint) {
                        setTimeout(() => showToast(`🔑 ${data.debug_hint}`, 'info'), 1000);
                    }

                    showView('otp');
                    startOtpTimer(data.expires_in_seconds || 300);
                } else {
                    showToast(data.message || 'Invalid credentials', 'error');
                }
            } catch (err) {
                showToast('Unable to connect to login server', 'error');
            } finally {
                btn.disabled = false;
                btn.textContent = 'Send OTP & Login';
            }
        });
    }

    // ----------------------------------------------------
    // 6. OTP Countdown Timer & Resend
    // ----------------------------------------------------
    function startOtpTimer(seconds = 300) {
        if (otpCountdownTimer) clearInterval(otpCountdownTimer);
        otpSecondsLeft = seconds;
        const timerEl = document.getElementById('otp-countdown-timer');

        const updateTimer = () => {
            const m = String(Math.floor(otpSecondsLeft / 60)).padStart(2, '0');
            const s = String(otpSecondsLeft % 60).padStart(2, '0');
            if (timerEl) timerEl.textContent = `${m}:${s}`;

            if (otpSecondsLeft <= 0) {
                clearInterval(otpCountdownTimer);
                showToast('OTP has expired. Please click Resend OTP.', 'warning');
            }
            otpSecondsLeft--;
        };

        updateTimer();
        otpCountdownTimer = setInterval(updateTimer, 1000);
    }

    const btnResendOtp = document.getElementById('btn-resend-otp');
    if (btnResendOtp) {
        btnResendOtp.addEventListener('click', async () => {
            btnResendOtp.disabled = true;
            try {
                const res = await fetch('api/auth.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'resend_otp', identifier: pendingLoginIdentifier })
                });
                const data = await res.json();
                if (data.success) {
                    showToast(data.message, 'success');
                    if (data.debug_hint) {
                        setTimeout(() => showToast(`🔑 ${data.debug_hint}`, 'info'), 800);
                    }
                    startOtpTimer(data.expires_in_seconds || 300);
                }
            } catch (err) {
                showToast('Failed to resend code', 'error');
            } finally {
                setTimeout(() => { btnResendOtp.disabled = false; }, 5000);
            }
        });
    }

    // ----------------------------------------------------
    // 7. OTP Verification Submission (Step 2 -> Enter Dashboard)
    // ----------------------------------------------------
    const formOtp = document.getElementById('form-otp-verify');
    if (formOtp) {
        formOtp.addEventListener('submit', async (e) => {
            e.preventDefault();
            const otpCode = document.getElementById('otp-input').value.trim();
            const btn = document.getElementById('btn-submit-otp');
            btn.disabled = true;
            btn.textContent = 'Verifying Code...';

            try {
                const res = await fetch('api/auth.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        action: 'verify_otp',
                        identifier: pendingLoginIdentifier,
                        otp: otpCode
                    })
                });
                const data = await res.json();

                if (data.success) {
                    currentUser = data.user;
                    if (otpCountdownTimer) clearInterval(otpCountdownTimer);
                    setAuthenticatedUI(currentUser);
                    showToast(data.message, 'success');
                    showView('dashboard');
                    loadContacts();
                } else {
                    showToast(data.message || 'OTP verification failed', 'error');
                }
            } catch (err) {
                showToast('Verification server error', 'error');
            } finally {
                btn.disabled = false;
                btn.textContent = 'Verify & Enter Dashboard';
            }
        });
    }

    // ----------------------------------------------------
    // 8. Forgot & Reset Password
    // ----------------------------------------------------
    const formForgot = document.getElementById('form-forgot-password');
    if (formForgot) {
        formForgot.addEventListener('submit', async (e) => {
            e.preventDefault();
            const id = document.getElementById('forgot-identifier').value.trim();
            try {
                const res = await fetch('api/auth.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'forgot_password', identifier: id })
                });
                const data = await res.json();
                showToast(data.message, 'info');
                if (data.debug_hint) {
                    setTimeout(() => showToast(`🔑 ${data.debug_hint}`, 'info'), 1000);
                }
                pendingLoginIdentifier = id;
                showView('reset');
            } catch (err) {
                showToast('Unable to send password recovery code', 'error');
            }
        });
    }

    const formReset = document.getElementById('form-reset-password');
    if (formReset) {
        formReset.addEventListener('submit', async (e) => {
            e.preventDefault();
            const code = document.getElementById('reset-otp-code').value.trim();
            const newP = document.getElementById('reset-new-password').value;
            const confP = document.getElementById('reset-confirm-password').value;

            if (newP !== confP) {
                showToast('Passwords do not match.', 'error');
                return;
            }

            try {
                const res = await fetch('api/auth.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        action: 'reset_password',
                        identifier: pendingLoginIdentifier,
                        otp: code,
                        new_password: newP,
                        confirm_password: confP
                    })
                });
                const data = await res.json();
                if (data.success) {
                    showToast(data.message, 'success');
                    showView('login');
                } else {
                    showToast(data.message || 'Password reset failed', 'error');
                }
            } catch (err) {
                showToast('Failed to reset password', 'error');
            }
        });
    }

    // ----------------------------------------------------
    // 9. Authenticated UI State Setup
    // ----------------------------------------------------
    function setAuthenticatedUI(user) {
        if (!user) return;
        currentUser = user;

        if (publicNavLinks) publicNavLinks.style.display = 'none';
        if (authNavLinks) authNavLinks.style.display = 'flex';
        if (publicAuthBtns) publicAuthBtns.style.display = 'none';
        if (authUserBtns) authUserBtns.style.display = 'flex';

        if (navMemberBadge) navMemberBadge.textContent = user.member_id || 'OV-784920';
        if (dashUserName) dashUserName.textContent = user.name;
        if (dashMemberId) dashMemberId.textContent = user.member_id || 'OV-784920';

        const userDisplay = document.getElementById('user-display-name');
        if (userDisplay) userDisplay.textContent = user.name;
        const memberDisplay = document.getElementById('user-member-display');
        if (memberDisplay) memberDisplay.textContent = `Member ID: ${user.member_id || 'OV-784920'}`;

        if (dashLangBadge) {
            dashLangBadge.textContent = (user.language === 'ha') ? 'Hausa (ha)' : 'English (en)';
        }
    }

    function setUnauthenticatedUI() {
        currentUser = null;
        if (publicNavLinks) publicNavLinks.style.display = 'flex';
        if (authNavLinks) authNavLinks.style.display = 'none';
        if (publicAuthBtns) publicAuthBtns.style.display = 'flex';
        if (authUserBtns) authUserBtns.style.display = 'none';
    }

    // ----------------------------------------------------
    // 10. Dashboard 9-Feature Action Handlers
    // ----------------------------------------------------
    const dashBtnMakeCall = document.getElementById('dash-btn-make-call');
    const dashBtnContacts = document.getElementById('dash-btn-contacts');
    const dashBtnSettings = document.getElementById('dash-btn-settings');
    const dashBtnLogout = document.getElementById('dash-btn-logout');
    const navBtnLogout = document.getElementById('btn-trigger-logout');

    if (dashBtnMakeCall) {
        dashBtnMakeCall.addEventListener('click', () => {
            if (viewWelcome) viewWelcome.style.display = 'grid';
            document.getElementById('dialer-card').scrollIntoView({ behavior: 'smooth' });
        });
    }

    if (dashBtnContacts) {
        dashBtnContacts.addEventListener('click', () => {
            if (contactsView) {
                contactsView.style.display = contactsView.style.display === 'none' ? 'block' : 'none';
                contactsView.scrollIntoView({ behavior: 'smooth' });
            }
        });
    }

    if (dashBtnSettings) {
        dashBtnSettings.addEventListener('click', () => {
            if (settingsView) {
                settingsView.style.display = settingsView.style.display === 'none' ? 'block' : 'none';
                settingsView.scrollIntoView({ behavior: 'smooth' });
            }
        });
    }

    // Logout Trigger
    if (dashBtnLogout) dashBtnLogout.addEventListener('click', () => openLogoutModal());
    if (navBtnLogout) navBtnLogout.addEventListener('click', () => openLogoutModal());

    window.openLogoutModal = () => { if (logoutModal) logoutModal.classList.add('active'); };
    window.closeLogoutModal = () => { if (logoutModal) logoutModal.classList.remove('active'); };

    const btnConfirmLogout = document.getElementById('btn-confirm-logout');
    if (btnConfirmLogout) {
        btnConfirmLogout.addEventListener('click', async () => {
            closeLogoutModal();
            try {
                await fetch('api/auth.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'logout' })
                });
            } catch (e) {}

            setUnauthenticatedUI();
            showToast('Your session has ended safely. Goodbye!', 'info');
            showView('welcome');
        });
    }

    // ----------------------------------------------------
    // 11. Contacts Management
    // ----------------------------------------------------
    async function loadContacts() {
        try {
            const res = await fetch('api/contacts.php');
            const data = await res.json();
            if (data.success && data.contacts) {
                renderContacts(data.contacts);
            }
        } catch (err) {}
    }

    function renderContacts(contacts) {
        if (!contactsContainer) return;
        contactsContainer.innerHTML = '';

        if (!contacts || contacts.length === 0) {
            contactsContainer.innerHTML = `<p style="text-align:center; color:var(--text-muted); padding:20px;">No saved contacts yet.</p>`;
            return;
        }

        contacts.forEach(c => {
            const item = document.createElement('div');
            item.className = 'contact-row-item';
            const initial = c.name.charAt(0).toUpperCase();

            item.innerHTML = `
                <div class="contact-info-main">
                    <div class="contact-avatar">${initial}</div>
                    <div>
                        <div style="font-weight:700; font-size:1.05rem;">${c.name}</div>
                        <div style="font-size:0.85rem; color:var(--text-secondary); font-family:var(--font-mono);">${c.phone} • ${c.country}</div>
                    </div>
                </div>
                <div style="display:flex; gap:10px;">
                    <button class="clay-btn clay-btn-primary" style="padding:8px 16px; font-size:0.85rem;" data-dial="${c.phone}">
                        📞 Call
                    </button>
                    <button class="clay-action-icon-btn" style="width:36px; height:36px; font-size:0.9rem;" data-delete="${c.id}" title="Delete">
                        🗑️
                    </button>
                </div>
            `;

            // Call contact
            item.querySelector('button[data-dial]').addEventListener('click', () => {
                currentDialNumber = c.phone;
                updateDialDisplay();
                if (viewWelcome) viewWelcome.style.display = 'grid';
                document.getElementById('dialer-card').scrollIntoView({ behavior: 'smooth' });
                showToast(`Calling ${c.name} (${c.phone})...`, 'info');
                setTimeout(() => startCall(), 500);
            });

            // Delete contact
            item.querySelector('button[data-delete]').addEventListener('click', async () => {
                await fetch('api/contacts.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'delete', id: c.id })
                });
                showToast(`Contact removed`, 'info');
                loadContacts();
            });

            contactsContainer.appendChild(item);
        });
    }

    const btnAddContactModal = document.getElementById('btn-add-contact-modal');
    if (btnAddContactModal) btnAddContactModal.addEventListener('click', () => openAddContactModal());

    window.openAddContactModal = () => { if (addContactModal) addContactModal.classList.add('active'); };
    window.closeAddContactModal = () => { if (addContactModal) addContactModal.classList.remove('active'); };

    const formAddContact = document.getElementById('form-add-contact');
    if (formAddContact) {
        formAddContact.addEventListener('submit', async (e) => {
            e.preventDefault();
            const name = document.getElementById('contact-input-name').value.trim();
            const phone = document.getElementById('contact-input-phone').value.trim();
            const country = document.getElementById('contact-input-country').value.trim();

            try {
                const res = await fetch('api/contacts.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'add', name, phone, country })
                });
                const data = await res.json();
                if (data.success) {
                    showToast('Contact saved successfully!', 'success');
                    closeAddContactModal();
                    formAddContact.reset();
                    loadContacts();
                }
            } catch (err) {
                showToast('Failed to save contact', 'error');
            }
        });
    }

    // ----------------------------------------------------
    // 12. Settings Updates
    // ----------------------------------------------------
    const formUpdateProfile = document.getElementById('form-update-profile');
    if (formUpdateProfile) {
        formUpdateProfile.addEventListener('submit', async (e) => {
            e.preventDefault();
            const name = document.getElementById('settings-name').value.trim();
            const lang = document.getElementById('settings-language').value;

            try {
                const res = await fetch('api/settings.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'update_profile', name, language: lang })
                });
                const data = await res.json();
                if (data.success) {
                    showToast('Profile & preferences saved!', 'success');
                    if (currentUser) {
                        currentUser.name = name;
                        currentUser.language = lang;
                        setAuthenticatedUI(currentUser);
                    }
                    if (window.locManager) {
                        window.locManager.setLanguage(lang);
                    }
                }
            } catch (err) {
                showToast('Failed to update profile', 'error');
            }
        });
    }

    const formChangePassword = document.getElementById('form-change-password');
    if (formChangePassword) {
        formChangePassword.addEventListener('submit', async (e) => {
            e.preventDefault();
            const oldP = document.getElementById('settings-old-pass').value;
            const newP = document.getElementById('settings-new-pass').value;
            const confP = document.getElementById('settings-confirm-pass').value;

            if (newP !== confP) {
                showToast('Passwords do not match.', 'error');
                return;
            }

            try {
                const res = await fetch('api/settings.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'change_password', old_password: oldP, new_password: newP, confirm_password: confP })
                });
                const data = await res.json();
                if (data.success) {
                    showToast('Password changed successfully!', 'success');
                    formChangePassword.reset();
                } else {
                    showToast(data.message || 'Error changing password', 'error');
                }
            } catch (err) {
                showToast('Failed to update password', 'error');
            }
        });
    }

    // ----------------------------------------------------
    // 13. Interactive Phone Dialer & Web Audio DTMF
    // ----------------------------------------------------
    const dialKeys = document.querySelectorAll('.clay-dial-key');
    dialKeys.forEach(btn => {
        btn.addEventListener('click', () => {
            const digit = btn.getAttribute('data-digit');
            if (digit) {
                if (window.soundEngine) window.soundEngine.playDtmf(digit);
                currentDialNumber += digit;
                updateDialDisplay();
            }
        });
    });

    if (backspaceBtn) {
        backspaceBtn.addEventListener('click', () => {
            currentDialNumber = currentDialNumber.slice(0, -1);
            updateDialDisplay();
        });
    }

    if (dialClearBtn) {
        dialClearBtn.addEventListener('click', () => {
            currentDialNumber = '';
            updateDialDisplay();
        });
    }

    function detectCountry(number) {
        if (!number) return { name: 'Enter Number', rate: 0.05, flag: '🌐' };
        const cleaned = number.replace(/\s+/g, '');
        if (cachedRates && cachedRates.length > 0) {
            const sortedRates = [...cachedRates].sort((a, b) => b.dial_code.length - a.dial_code.length);
            for (const r of sortedRates) {
                if (cleaned.startsWith(r.dial_code) || cleaned.startsWith(r.dial_code.replace('+', ''))) {
                    return { name: r.country_name, rate: r.rate, flag: r.flag };
                }
            }
        }
        if (cleaned.startsWith('+1') || cleaned.startsWith('1')) return { name: 'USA / Canada', rate: 0.012, flag: '🇺🇸' };
        if (cleaned.startsWith('+44') || cleaned.startsWith('44')) return { name: 'United Kingdom', rate: 0.018, flag: '🇬🇧' };
        if (cleaned.startsWith('+234') || cleaned.startsWith('234')) return { name: 'Nigeria', rate: 0.075, flag: '🇳🇬' };
        if (cleaned.startsWith('+91') || cleaned.startsWith('91')) return { name: 'India', rate: 0.019, flag: '🇮🇳' };
        return { name: 'International Call', rate: 0.05, flag: '🌐' };
    }

    function updateDialDisplay() {
        if (!dialDisplay) return;
        dialDisplay.textContent = currentDialNumber || '—';
        const detected = detectCountry(currentDialNumber);
        activeCallCountry = detected.name;
        currentCallRate = detected.rate;
        if (dialCountry) {
            dialCountry.innerHTML = `${detected.flag} ${detected.name} <span style="color:var(--clay-primary);font-weight:700;">($${detected.rate.toFixed(3)}/min)</span>`;
        }
    }

    if (callBtn) callBtn.addEventListener('click', startCall);
    if (endCallBtn) endCallBtn.addEventListener('click', endCall);

    function startCall() {
        if (!currentDialNumber || currentDialNumber.length < 3) {
            showToast('Please dial a valid phone number first', 'error');
            return;
        }

        if (userWalletBalance < 0.10) {
            showToast('Insufficient wallet credit! Please top up your wallet.', 'error');
            openTopupModal();
            return;
        }

        isCallActive = true;
        callSeconds = 0;
        const detected = detectCountry(currentDialNumber);
        activeCallCountry = detected.name;
        currentCallRate = detected.rate;

        overlayName.textContent = detected.name;
        overlayNumber.textContent = currentDialNumber;
        overlayStatus.textContent = 'Calling...';
        overlayTimer.textContent = '00:00';
        overlayRate.textContent = `Rate: $${detected.rate.toFixed(3)}/min`;
        callingOverlay.style.display = 'flex';

        if (window.soundEngine) window.soundEngine.startRingback();

        setTimeout(() => {
            if (!isCallActive) return;
            if (window.soundEngine) {
                window.soundEngine.stopRingback();
                window.soundEngine.playConnectBeep();
            }

            overlayStatus.textContent = 'Connected (HD Audio)';
            showToast('Call connected via low-latency carrier route', 'success');

            callTimer = setInterval(() => {
                callSeconds++;
                const mins = String(Math.floor(callSeconds / 60)).padStart(2, '0');
                const secs = String(callSeconds % 60).padStart(2, '0');
                overlayTimer.textContent = `${mins}:${secs}`;

                const perSecondCost = currentCallRate / 60;
                userWalletBalance = Math.max(0, userWalletBalance - perSecondCost);
                updateBalanceUI(userWalletBalance);

                if (userWalletBalance <= 0) {
                    showToast('Call ended: credit depleted', 'warning');
                    endCall();
                }
            }, 1000);
        }, 2500);
    }

    function endCall() {
        if (!isCallActive) return;
        isCallActive = false;

        if (window.soundEngine) {
            window.soundEngine.stopRingback();
            window.soundEngine.playEndCallTone();
        }

        if (callTimer) {
            clearInterval(callTimer);
            callTimer = null;
        }

        callingOverlay.style.display = 'none';
        const finalDuration = callSeconds;
        const finalCost = (finalDuration / 60) * currentCallRate;

        showToast(`Call ended. Duration: ${finalDuration}s • Cost: $${finalCost.toFixed(3)}`, 'info');
        logCallToBackend(currentDialNumber, activeCallCountry, finalDuration, currentCallRate);
    }

    async function logCallToBackend(number, country, duration, rate) {
        try {
            const res = await fetch('api/calls.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    destination_number: number,
                    destination_country: country,
                    duration_seconds: duration,
                    rate_per_minute: rate
                })
            });
            const data = await res.json();
            if (data.success) {
                userWalletBalance = parseFloat(data.new_balance);
                updateBalanceUI(userWalletBalance);
                loadCallLogs();
                loadTransactions();
            }
        } catch (err) {}
    }

    // ----------------------------------------------------
    // 14. Rates Calculator
    // ----------------------------------------------------
    async function loadRates(searchQuery = '') {
        try {
            const url = searchQuery ? `api/rates.php?search=${encodeURIComponent(searchQuery)}` : 'api/rates.php';
            const res = await fetch(url);
            const data = await res.json();
            if (data.success && data.rates) {
                cachedRates = data.rates;
                renderRates(data.rates);
            }
        } catch (err) {}
    }

    function renderRates(rates) {
        if (!ratesGrid) return;
        ratesGrid.innerHTML = '';

        rates.forEach(r => {
            const card = document.createElement('div');
            card.className = 'clay-card rate-card';
            const savingsPercent = Math.round(((r.roaming - r.rate) / r.roaming) * 100);

            card.innerHTML = `
                <div class="rate-card-top">
                    <div class="rate-country-info">
                        <span class="country-flag">${r.flag}</span>
                        <div>
                            <div class="country-name">${r.country_name}</div>
                            <span class="country-code">${r.dial_code}</span>
                        </div>
                    </div>
                    ${r.popular ? '<span class="clay-badge badge-mint">Popular</span>' : ''}
                </div>
                <div class="rate-price-row">
                    <div>
                        <span class="rate-price-big">$${parseFloat(r.rate).toFixed(3)}</span>
                        <span class="rate-price-unit">/min</span>
                    </div>
                    <span class="roaming-savings">Save ${savingsPercent}%</span>
                </div>
                <button class="clay-btn clay-btn-primary" style="padding: 10px 18px; font-size: 0.9rem;" data-dial="${r.dial_code}" data-country="${r.country_name}">
                    📞 Dial Now
                </button>
            `;

            card.querySelector('button').addEventListener('click', () => {
                currentDialNumber = r.dial_code;
                updateDialDisplay();
                if (viewWelcome) viewWelcome.style.display = 'grid';
                document.getElementById('dialer-card').scrollIntoView({ behavior: 'smooth' });
                showToast(`Dial code for ${r.country_name} (${r.dial_code}) loaded`, 'info');
            });

            ratesGrid.appendChild(card);
        });
    }

    if (ratesSearch) {
        let debounceTimer;
        ratesSearch.addEventListener('input', (e) => {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => loadRates(e.target.value.trim()), 250);
        });
    }

    // ----------------------------------------------------
    // 15. Wallet Top-Up
    // ----------------------------------------------------
    async function loadWalletData() {
        try {
            const res = await fetch('api/wallet.php');
            const data = await res.json();
            if (data.success) {
                userWalletBalance = parseFloat(data.balance);
                updateBalanceUI(userWalletBalance);
                if (data.transactions) renderTransactions(data.transactions);
            }
        } catch (err) {}
    }

    function updateBalanceUI(balance) {
        const formatted = `$${balance.toFixed(2)}`;
        if (walletBalanceEl) walletBalanceEl.textContent = formatted;
        if (dashWalletBalance) dashWalletBalance.textContent = formatted;
        if (navBalanceDisplay) navBalanceDisplay.textContent = formatted;
    }

    const topupChips = document.querySelectorAll('.topup-chip-btn');
    topupChips.forEach(chip => {
        chip.addEventListener('click', () => {
            topupChips.forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            selectedTopupAmount = parseFloat(chip.getAttribute('data-amount'));
            const customInput = document.getElementById('custom-topup-input');
            if (customInput) customInput.value = selectedTopupAmount;
        });
    });

    const customInput = document.getElementById('custom-topup-input');
    if (customInput) {
        customInput.addEventListener('input', (e) => {
            selectedTopupAmount = parseFloat(e.target.value) || 0;
            topupChips.forEach(c => c.classList.remove('active'));
        });
    }

    window.openTopupModal = () => { if (topupModal) topupModal.classList.add('active'); };
    window.closeTopupModal = () => { if (topupModal) topupModal.classList.remove('active'); };

    const triggerTopupBtns = document.querySelectorAll('.trigger-topup');
    triggerTopupBtns.forEach(btn => btn.addEventListener('click', window.openTopupModal));

    const confirmTopupBtn = document.getElementById('btn-confirm-topup');
    if (confirmTopupBtn) {
        confirmTopupBtn.addEventListener('click', async () => {
            confirmTopupBtn.textContent = 'Processing Payment...';
            confirmTopupBtn.disabled = true;

            try {
                const res = await fetch('api/wallet.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'topup', amount: selectedTopupAmount })
                });
                const data = await res.json();
                if (data.success) {
                    userWalletBalance = parseFloat(data.balance);
                    updateBalanceUI(userWalletBalance);
                    showToast(`🎉 Top-up successful! $${selectedTopupAmount.toFixed(2)} added.`, 'success');
                    closeTopupModal();
                    loadTransactions();
                }
            } catch (err) {
                showToast('Payment processing error', 'error');
            } finally {
                confirmTopupBtn.textContent = 'Confirm & Top Up';
                confirmTopupBtn.disabled = false;
            }
        });
    }

    function renderTransactions(txs) {
        if (!transactionsList) return;
        transactionsList.innerHTML = '';
        txs.forEach(t => {
            const tr = document.createElement('tr');
            const isPlus = parseFloat(t.amount) > 0;
            const amountColor = isPlus ? 'var(--clay-mint-dark)' : 'var(--clay-coral-dark)';
            const sign = isPlus ? '+' : '';
            tr.innerHTML = `
                <td><strong>${t.description}</strong></td>
                <td><span class="clay-badge">${t.type}</span></td>
                <td style="color:${amountColor}; font-weight:800; font-family:var(--font-mono);">${sign}$${Math.abs(parseFloat(t.amount)).toFixed(2)}</td>
                <td style="color:var(--text-muted); font-size:0.85rem;">${t.created_at || 'Just now'}</td>
            `;
            transactionsList.appendChild(tr);
        });
    }

    async function loadTransactions() {
        try {
            const res = await fetch('api/wallet.php');
            const data = await res.json();
            if (data.success && data.transactions) renderTransactions(data.transactions);
        } catch (err) {}
    }

    async function loadCallLogs() {
        try {
            const res = await fetch('api/calls.php');
            const data = await res.json();
            if (data.success && data.calls) renderCallLogs(data.calls);
        } catch (err) {}
    }

    function renderCallLogs(calls) {
        if (!callLogsList) return;
        callLogsList.innerHTML = '';
        calls.forEach(c => {
            const tr = document.createElement('tr');
            const mins = Math.floor(c.duration_seconds / 60);
            const secs = c.duration_seconds % 60;
            tr.innerHTML = `
                <td><strong>${c.destination_country}</strong></td>
                <td style="font-family:var(--font-mono);">${c.destination_number}</td>
                <td>${mins}m ${secs}s</td>
                <td style="color:var(--clay-coral-dark); font-weight:700; font-family:var(--font-mono);">-$${parseFloat(c.cost).toFixed(3)}</td>
                <td><span class="clay-badge badge-mint">${c.status || 'completed'}</span></td>
            `;
            callLogsList.appendChild(tr);
        });
    }

    // ----------------------------------------------------
    // 16. Toast Helper
    // ----------------------------------------------------
    function showToast(message, type = 'info') {
        let container = document.getElementById('toast-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'toast-container';
            container.className = 'toast-container';
            document.body.appendChild(container);
        }

        const toast = document.createElement('div');
        toast.className = 'clay-toast';
        let icon = 'ℹ️';
        if (type === 'success') icon = '✅';
        if (type === 'error') icon = '❌';
        if (type === 'warning') icon = '⚠️';

        toast.innerHTML = `<span>${icon}</span> <span>${message}</span>`;
        container.appendChild(toast);

        setTimeout(() => {
            toast.style.transition = 'all 0.3s ease';
            toast.style.opacity = '0';
            toast.style.transform = 'translateY(10px)';
            setTimeout(() => toast.remove(), 300);
        }, 3800);
    }

    // ----------------------------------------------------
    // Initial Session Check & Boot
    // ----------------------------------------------------
    async function initSession() {
        try {
            const res = await fetch('api/auth.php');
            const data = await res.json();
            if (data.success && data.authenticated && data.user) {
                setAuthenticatedUI(data.user);
            } else {
                setUnauthenticatedUI();
            }
        } catch (err) {
            setUnauthenticatedUI();
        }
    }

    initSession();
    loadRates();
    loadWalletData();
    loadCallLogs();
    updateDialDisplay();
});
