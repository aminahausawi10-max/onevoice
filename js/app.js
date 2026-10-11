/**
 * ONE VOICE - Modern Mobile Web Application Controller
 * Handles 10-screen navigation, dialpad, Web Audio DTMF, country picker,
 * wallet deposits, drawer navigation, and direct authentication without OTP.
 */

// Global clipboard helper
window.copyText = (text, message = 'Copied to clipboard!') => {
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(() => {
            if (window.showToast) window.showToast(message, 'success');
        }).catch(() => {
            if (window.showToast) window.showToast(message, 'success');
        });
    } else {
        if (window.showToast) window.showToast(message, 'success');
    }
};

window.togglePassVisibility = (inputId) => {
    const el = document.getElementById(inputId);
    if (el) {
        el.type = el.type === 'password' ? 'text' : 'password';
    }
};

// ----------------------------------------------------
// SoundEngine - Telephony DTMF Synthesizer
// ----------------------------------------------------
class SoundEngine {
    constructor() {
        this.ctx = null;
        this.dtmfFrequencies = {
            '1': [697, 1209], '2': [697, 1336], '3': [697, 1477],
            '4': [770, 1209], '5': [770, 1336], '6': [770, 1477],
            '7': [852, 1209], '8': [852, 1336], '9': [852, 1477],
            '*': [941, 1209], '0': [941, 1336], '#': [941, 1477]
        };
    }

    init() {
        if (!this.ctx) {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (AudioContext) this.ctx = new AudioContext();
        }
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    playDtmf(key) {
        try {
            this.init();
            if (!this.ctx) return;
            const freqs = this.dtmfFrequencies[key];
            if (!freqs) return;

            const osc1 = this.ctx.createOscillator();
            const osc2 = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc1.type = 'sine';
            osc1.frequency.setValueAtTime(freqs[0], this.ctx.currentTime);
            osc2.type = 'sine';
            osc2.frequency.setValueAtTime(freqs[1], this.ctx.currentTime);

            gain.gain.setValueAtTime(0.12, this.ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.16);

            osc1.connect(gain);
            osc2.connect(gain);
            gain.connect(this.ctx.destination);

            osc1.start();
            osc2.start();
            osc1.stop(this.ctx.currentTime + 0.16);
        } catch (e) {}
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const soundEngine = new SoundEngine();

    // Application State
    let currentUser = null;
    let userWalletBalance = 9000.00;
    let currentDialNumber = '+234';
    let activeCallDuration = 0;
    let callTimerInterval = null;
    let availableRates = [
        { country_name: "Nigeria", country_code: "NG", dial_code: "+234", flag: "🇳🇬", rate: 12.00 },
        { country_name: "United States", country_code: "US", dial_code: "+1", flag: "🇺🇸", rate: 18.00 },
        { country_name: "United Kingdom", country_code: "GB", dial_code: "+44", flag: "🇬🇧", rate: 22.00 },
        { country_name: "Canada", country_code: "CA", dial_code: "+1", flag: "🇨🇦", rate: 18.00 },
        { country_name: "Ghana", country_code: "GH", dial_code: "+233", flag: "🇬🇭", rate: 35.00 },
        { country_name: "Saudi Arabia", country_code: "SA", dial_code: "+966", flag: "🇸🇦", rate: 40.00 },
        { country_name: "United Arab Emirates", country_code: "AE", dial_code: "+971", flag: "🇦🇪", rate: 42.00 },
        { country_name: "South Africa", country_code: "ZA", dial_code: "+27", flag: "🇿🇦", rate: 28.00 },
        { country_name: "India", country_code: "IN", dial_code: "+91", flag: "🇮🇳", rate: 15.00 },
        { country_name: "China", country_code: "CN", dial_code: "+86", flag: "🇨🇳", rate: 20.00 },
        { country_name: "France", country_code: "FR", dial_code: "+33", flag: "🇫🇷", rate: 25.00 },
        { country_name: "Germany", country_code: "DE", dial_code: "+49", flag: "🇩🇪", rate: 25.00 }
    ];
    let selectedCountry = availableRates[0];

    // Helper: API Fetch with User Session
    function apiFetch(url, options = {}) {
        options = options || {};
        options.headers = options.headers || {};
        if (currentUser && currentUser.id) {
            options.headers['X-User-Id'] = currentUser.id.toString();
        }
        return fetch(url, options);
    }

    // Toast Notifications
    window.showToast = (message, type = 'info') => {
        let container = document.getElementById('toast-container');
        if (!container) return;
        const toast = document.createElement('div');
        toast.className = 'app-toast-item';
        let icon = type === 'success' ? '✅' : (type === 'error' ? '❌' : 'ℹ️');
        toast.innerHTML = `<span>${icon}</span> <span>${message}</span>`;
        container.appendChild(toast);
        setTimeout(() => toast.remove(), 3500);
    };

    // ----------------------------------------------------
    // Page Routing & Navigation
    // ----------------------------------------------------
    const allPages = document.querySelectorAll('.app-page');
    const appTopHeader = document.getElementById('app-top-header');
    const mobileBottomNav = document.getElementById('mobile-bottom-nav');

    function navigateToPage(pageName) {
        allPages.forEach(p => p.classList.remove('active'));
        const targetPage = document.getElementById(`page-${pageName}`);
        if (targetPage) {
            targetPage.classList.add('active');
            window.scrollTo(0, 0);
        }

        const isPublicAuthPage = ['welcome', 'register', 'login', 'reg-success', 'forgot'].includes(pageName);

        // Header and Bottom Nav Visibility
        if (appTopHeader) {
            appTopHeader.style.display = isPublicAuthPage ? 'none' : 'flex';
        }
        if (mobileBottomNav) {
            mobileBottomNav.style.display = isPublicAuthPage ? 'none' : 'flex';
        }

        // Update Bottom Nav active state
        document.querySelectorAll('.bottom-nav-item').forEach(item => {
            if (item.getAttribute('data-page') === pageName) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });

        // Close drawer if open
        closeDrawer();
    }

    document.addEventListener('click', (e) => {
        const btn = e.target.closest('.nav-page-btn');
        if (btn) {
            const page = btn.getAttribute('data-page');
            if (page) {
                e.preventDefault();
                navigateToPage(page);
            }
        }
    });

    // ----------------------------------------------------
    // Side Navigation Drawer
    // ----------------------------------------------------
    const btnOpenDrawer = document.getElementById('btn-open-drawer');
    const drawerBackdrop = document.getElementById('drawer-backdrop');
    const sideDrawerPanel = document.getElementById('side-drawer-panel');

    function openDrawer() {
        if (drawerBackdrop) drawerBackdrop.classList.add('active');
        if (sideDrawerPanel) sideDrawerPanel.classList.add('active');
    }

    function closeDrawer() {
        if (drawerBackdrop) drawerBackdrop.classList.remove('active');
        if (sideDrawerPanel) sideDrawerPanel.classList.remove('active');
    }

    if (btnOpenDrawer) btnOpenDrawer.addEventListener('click', openDrawer);
    if (drawerBackdrop) drawerBackdrop.addEventListener('click', closeDrawer);

    // ----------------------------------------------------
    // Authentication State & UI Updating (Direct without OTP)
    // ----------------------------------------------------
    function formatPhoneToAccountNumber(phone) {
        if (!phone) return '9090809080';
        let cleaned = phone.replace(/[^0-9]/g, '');
        let last10 = cleaned.length > 10 ? cleaned.slice(-10) : cleaned;
        return last10.replace(/^0+/, '') || last10;
    }

    function setAuthenticatedUI(user) {
        currentUser = user;
        const name = user.name || 'Amina Ahmed';
        const memberId = user.member_id || 'OV-880993';
        const accountNum = formatPhoneToAccountNumber(user.phone || '9090809080');

        const dashName = document.getElementById('dash-user-name');
        const dashMemId = document.getElementById('dash-member-id');
        const dashAccount = document.getElementById('dash-phone-account-number');
        const drawerName = document.getElementById('drawer-user-name');
        const drawerId = document.getElementById('drawer-user-id');
        const walletAcc = document.getElementById('wallet-phone-account');
        const modalAcc = document.getElementById('modal-user-phone-account');

        if (dashName) dashName.textContent = name;
        if (dashMemId) dashMemId.textContent = `Member ID: ${memberId}`;
        if (dashAccount) dashAccount.textContent = accountNum;
        if (drawerName) drawerName.textContent = name;
        if (drawerId) drawerId.textContent = `Member ID: ${memberId}`;
        if (walletAcc) walletAcc.textContent = accountNum;
        if (modalAcc) modalAcc.textContent = accountNum;

        loadWalletData();
    }

    function setUnauthenticatedUI() {
        currentUser = null;
        navigateToPage('welcome');
    }

    // Registration Form (Direct to success, NO OTP)
    const formRegister = document.getElementById('form-register');
    if (formRegister) {
        formRegister.addEventListener('submit', async (e) => {
            e.preventDefault();
            const name = document.getElementById('reg-name').value.trim();
            const phone = document.getElementById('reg-phone').value.trim();
            const email = document.getElementById('reg-email').value.trim();
            const pass = document.getElementById('reg-password').value;
            const confirmPass = document.getElementById('reg-confirm-password').value;

            if (pass !== confirmPass) {
                showToast('Passwords do not match', 'error');
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
                        name, phone, email,
                        password: pass,
                        confirm_password: confirmPass,
                        terms_accepted: true
                    })
                });
                const data = await res.json();
                if (data.success) {
                    showToast('Account created successfully!', 'success');
                    navigateToPage('reg-success');
                } else {
                    showToast(data.message || 'Registration failed', 'error');
                }
            } catch (err) {
                // Resilient local simulation if offline
                navigateToPage('reg-success');
            } finally {
                btn.disabled = false;
                btn.textContent = 'Create Account';
            }
        });
    }

    // Login Form (Direct to dashboard, NO OTP)
    const formLogin = document.getElementById('form-login');
    if (formLogin) {
        formLogin.addEventListener('submit', async (e) => {
            e.preventDefault();
            const id = document.getElementById('login-identifier').value.trim();
            const pass = document.getElementById('login-password').value;
            const btn = document.getElementById('btn-submit-login');
            btn.disabled = true;
            btn.textContent = 'Signing in...';

            try {
                const res = await fetch('api/auth.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'login', identifier: id, password: pass })
                });
                const data = await res.json();
                if (data.success && data.user) {
                    setAuthenticatedUI(data.user);
                    showToast(`Welcome back, ${data.user.name}!`, 'success');
                    navigateToPage('home');
                } else {
                    showToast(data.message || 'Login failed. Check credentials.', 'error');
                }
            } catch (err) {
                // Fallback simulation
                setAuthenticatedUI({ name: "Amina Ahmed", phone: id || "9090809080", member_id: "OV-880993" });
                navigateToPage('home');
            } finally {
                btn.disabled = false;
                btn.textContent = 'Login';
            }
        });
    }

    // Logout Handlers
    function handleLogout() {
        try {
            fetch('api/auth.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'logout' })
            });
        } catch (e) {}
        setUnauthenticatedUI();
        showToast('Logged out successfully', 'info');
    }

    const btnDashLogout = document.getElementById('btn-dash-logout');
    const btnDrawerLogout = document.getElementById('btn-drawer-logout');
    const btnSettingsLogout = document.getElementById('btn-settings-logout');
    if (btnDashLogout) btnDashLogout.addEventListener('click', handleLogout);
    if (btnDrawerLogout) btnDrawerLogout.addEventListener('click', handleLogout);
    if (btnSettingsLogout) btnSettingsLogout.addEventListener('click', handleLogout);

    // ----------------------------------------------------
    // Wallet & Direct Top-Up (Simulation Mode - No Gateway)
    // ----------------------------------------------------
    async function loadWalletData() {
        try {
            const res = await apiFetch('api/wallet.php');
            const data = await res.json();
            if (data.success) {
                userWalletBalance = parseFloat(data.balance || 0);
                updateBalanceUI(userWalletBalance);
                if (data.bank_name) {
                    const elBank = document.getElementById('wallet-bank-name');
                    const modalBank = document.getElementById('modal-user-bank-name');
                    if (elBank) elBank.textContent = data.bank_name;
                    if (modalBank) modalBank.textContent = data.bank_name;
                }
                renderWalletTransactions(data.transactions || []);
            }
        } catch (err) {
            updateBalanceUI(userWalletBalance);
        }
    }

    function updateBalanceUI(balance) {
        const str = `₦ ${balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
        const dashBal = document.getElementById('dash-wallet-balance');
        const wallBal = document.getElementById('wallet-page-balance');
        if (dashBal) dashBal.textContent = str;
        if (wallBal) wallBal.textContent = str;

        const mins = Math.floor(balance / 12.0);
        const minsEl = document.getElementById('dialer-mins-left');
        if (minsEl) minsEl.textContent = `${mins} mins`;
    }

    function renderWalletTransactions(txs) {
        const container = document.getElementById('wallet-tx-list');
        if (!container) return;
        container.innerHTML = '';
        if (!txs || txs.length === 0) {
            container.innerHTML = '<div style="font-size:0.85rem; color:var(--text-muted); text-align:center; padding:16px;">No transactions recorded yet</div>';
            return;
        }
        txs.slice(0, 10).forEach(t => {
            const div = document.createElement('div');
            div.style.cssText = 'background:#f8fafc; border:1px solid var(--border-light); border-radius:12px; padding:10px 12px; display:flex; justify-content:space-between; align-items:center;';
            const isCred = parseFloat(t.net_credited || 0) >= 0;
            div.innerHTML = `
                <div>
                    <div style="font-size:0.85rem; font-weight:700;">${t.narration || t.transaction_type}</div>
                    <div style="font-size:0.72rem; color:var(--text-muted);">${t.created_at || 'Recent'}</div>
                </div>
                <div style="font-weight:800; font-size:0.95rem; color:${isCred ? 'var(--primary-green-dark)' : '#ef4444'};">
                    ${isCred ? '+' : ''}₦${Math.abs(parseFloat(t.net_credited || t.gross_amount || 0)).toLocaleString()}
                </div>
            `;
            container.appendChild(div);
        });
    }

    // Top-Up Modal
    const topupModal = document.getElementById('topup-modal');
    const btnConfirmTopup = document.getElementById('btn-confirm-topup');
    const modalDepositAmount = document.getElementById('modal-deposit-amount');
    const modalPlatformCut = document.getElementById('modal-platform-cut-val');
    const modalNetCredit = document.getElementById('modal-net-credit-val');

    function updateSplitPreview() {
        const val = parseFloat(modalDepositAmount?.value || 1000);
        const fee = val * 0.10;
        const net = val - fee;
        if (modalPlatformCut) modalPlatformCut.textContent = `₦${fee.toFixed(2)}`;
        if (modalNetCredit) modalNetCredit.textContent = `₦${net.toFixed(2)}`;
    }

    if (modalDepositAmount) modalDepositAmount.addEventListener('input', updateSplitPreview);

    document.querySelectorAll('.trigger-topup').forEach(btn => {
        btn.addEventListener('click', () => {
            if (topupModal) {
                updateSplitPreview();
                topupModal.classList.add('active');
            }
        });
    });

    const btnCloseTopup = document.getElementById('btn-close-topup-modal');
    if (btnCloseTopup) btnCloseTopup.addEventListener('click', () => {
        if (topupModal) topupModal.classList.remove('active');
    });

    if (btnConfirmTopup) {
        btnConfirmTopup.addEventListener('click', async () => {
            const amount = parseFloat(modalDepositAmount?.value || 1000);
            btnConfirmTopup.disabled = true;
            btnConfirmTopup.textContent = 'Processing Top-Up...';
            try {
                const res = await apiFetch('api/wallet.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'fund_bank_transfer', amount })
                });
                const data = await res.json();
                if (data.success) {
                    userWalletBalance = parseFloat(data.new_balance || (userWalletBalance + amount * 0.9));
                    updateBalanceUI(userWalletBalance);
                    showToast(`Recharge of ₦${amount.toLocaleString()} successful!`, 'success');
                    if (topupModal) topupModal.classList.remove('active');
                    loadWalletData();
                } else {
                    showToast(data.message || 'Deposit failed', 'error');
                }
            } catch (e) {
                userWalletBalance += (amount * 0.9);
                updateBalanceUI(userWalletBalance);
                showToast(`Recharged ₦${amount.toLocaleString()} successfully!`, 'success');
                if (topupModal) topupModal.classList.remove('active');
            } finally {
                btnConfirmTopup.disabled = false;
                btnConfirmTopup.textContent = '⚡ Complete Top-Up to Wallet';
            }
        });
    }

    // Transfer Modal
    const transferModal = document.getElementById('transfer-modal');
    document.querySelectorAll('.trigger-transfer').forEach(btn => {
        btn.addEventListener('click', () => {
            if (transferModal) transferModal.classList.add('active');
        });
    });
    const btnCloseTransfer = document.getElementById('btn-close-transfer-modal');
    if (btnCloseTransfer) btnCloseTransfer.addEventListener('click', () => {
        if (transferModal) transferModal.classList.remove('active');
    });

    const formPhoneTransfer = document.getElementById('form-phone-transfer');
    if (formPhoneTransfer) {
        formPhoneTransfer.addEventListener('submit', async (e) => {
            e.preventDefault();
            const recPhone = document.getElementById('transfer-recipient-phone').value.trim();
            const amt = parseFloat(document.getElementById('transfer-amount').value || 0);

            if (amt > userWalletBalance) {
                showToast(`Insufficient balance (₦${userWalletBalance.toFixed(2)})`, 'error');
                return;
            }

            try {
                const res = await apiFetch('api/wallet.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'transfer_phone', recipient_phone: recPhone, amount: amt })
                });
                const data = await res.json();
                if (data.success) {
                    userWalletBalance = parseFloat(data.new_balance || (userWalletBalance - amt));
                    updateBalanceUI(userWalletBalance);
                    showToast(`Transferred ₦${amt.toLocaleString()} to ${recPhone}!`, 'success');
                    if (transferModal) transferModal.classList.remove('active');
                    formPhoneTransfer.reset();
                    loadWalletData();
                } else {
                    showToast(data.message || 'Transfer failed', 'error');
                }
            } catch (err) {
                userWalletBalance -= amt;
                updateBalanceUI(userWalletBalance);
                showToast(`Transferred ₦${amt.toLocaleString()} successfully!`, 'success');
                if (transferModal) transferModal.classList.remove('active');
            }
        });
    }

    // ----------------------------------------------------
    // Screen 7: Dialer & Dialpad
    // ----------------------------------------------------
    const dialDisplayNumber = document.getElementById('dial-number');
    const btnDialClear = document.getElementById('btn-dial-clear');
    const btnDialBackspace = document.getElementById('btn-dial-backspace');

    function updateDialerDisplay() {
        if (dialDisplayNumber) dialDisplayNumber.textContent = currentDialNumber;
    }

    document.querySelectorAll('.dial-key-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const digit = btn.getAttribute('data-digit');
            if (digit) {
                soundEngine.playDtmf(digit);
                currentDialNumber += digit;
                updateDialerDisplay();
            }
        });
    });

    if (btnDialClear) {
        btnDialClear.addEventListener('click', () => {
            currentDialNumber = selectedCountry.dial_code;
            updateDialerDisplay();
        });
    }

    if (btnDialBackspace) {
        btnDialBackspace.addEventListener('click', () => {
            if (currentDialNumber.length > selectedCountry.dial_code.length) {
                currentDialNumber = currentDialNumber.slice(0, -1);
            } else {
                currentDialNumber = selectedCountry.dial_code;
            }
            updateDialerDisplay();
        });
    }

    // Country Picker Modal (Screen 10)
    const countryModal = document.getElementById('country-selector-modal');
    const btnOpenCountry = document.getElementById('btn-open-country-modal');
    const btnCloseCountry = document.getElementById('btn-close-country-modal');
    const countryModalList = document.getElementById('country-modal-list');
    const countryModalSearch = document.getElementById('country-modal-search');

    function renderCountryList(filter = '') {
        if (!countryModalList) return;
        countryModalList.innerHTML = '';
        const list = availableRates.filter(c => 
            c.country_name.toLowerCase().includes(filter.toLowerCase()) ||
            c.dial_code.includes(filter)
        );

        list.forEach(c => {
            const btn = document.createElement('button');
            btn.className = `country-item-btn ${c.country_code === selectedCountry.country_code ? 'selected' : ''}`;
            btn.innerHTML = `
                <span style="display:flex; align-items:center; gap:8px;">
                    <span style="font-size:1.2rem;">${c.flag}</span>
                    <span>${c.country_name}</span>
                </span>
                <span style="color:var(--primary-blue); font-weight:700;">${c.dial_code}</span>
            `;
            btn.addEventListener('click', () => {
                selectedCountry = c;
                currentDialNumber = c.dial_code;
                updateDialerDisplay();
                const dialFlag = document.getElementById('dialer-flag');
                const dialName = document.getElementById('dialer-country-name');
                if (dialFlag) dialFlag.textContent = c.flag;
                if (dialName) dialName.textContent = `${c.country_name} (${c.dial_code})`;
                if (countryModal) countryModal.classList.remove('active');
            });
            countryModalList.appendChild(btn);
        });
    }

    if (btnOpenCountry) {
        btnOpenCountry.addEventListener('click', () => {
            renderCountryList();
            if (countryModal) countryModal.classList.add('active');
        });
    }

    if (btnCloseCountry) {
        btnCloseCountry.addEventListener('click', () => {
            if (countryModal) countryModal.classList.remove('active');
        });
    }

    if (countryModalSearch) {
        countryModalSearch.addEventListener('input', (e) => {
            renderCountryList(e.target.value);
        });
    }

    // ----------------------------------------------------
    // Screen 8: In-Call Overlay Screen
    // ----------------------------------------------------
    const callingOverlay = document.getElementById('calling-overlay');
    const btnMakeCall = document.getElementById('btn-make-call');
    const btnEndCall = document.getElementById('btn-end-call');
    const overlayNumber = document.getElementById('overlay-phone-number');
    const overlayCountry = document.getElementById('overlay-country-name');
    const overlayTimer = document.getElementById('overlay-call-timer');

    function startCall() {
        if (userWalletBalance < 12.0) {
            showToast('Insufficient calling balance. Please top up your wallet.', 'error');
            return;
        }

        if (overlayNumber) overlayNumber.textContent = currentDialNumber;
        if (overlayCountry) overlayCountry.textContent = selectedCountry.country_name;
        if (callingOverlay) callingOverlay.classList.add('active');

        activeCallDuration = 0;
        if (overlayTimer) overlayTimer.textContent = '00:00';

        clearInterval(callTimerInterval);
        callTimerInterval = setInterval(() => {
            activeCallDuration++;
            const mins = String(Math.floor(activeCallDuration / 60)).padStart(2, '0');
            const secs = String(activeCallDuration % 60).padStart(2, '0');
            if (overlayTimer) overlayTimer.textContent = `${mins}:${secs}`;

            // Deduct rate every 60 seconds
            if (activeCallDuration % 60 === 0) {
                userWalletBalance = Math.max(0, userWalletBalance - (selectedCountry.rate || 12.0));
                updateBalanceUI(userWalletBalance);
            }
        }, 1000);
    }

    function endCall() {
        clearInterval(callTimerInterval);
        if (callingOverlay) callingOverlay.classList.remove('active');
        showToast(`Call ended. Duration: ${activeCallDuration}s`, 'info');
        loadWalletData();
    }

    if (btnMakeCall) btnMakeCall.addEventListener('click', startCall);
    if (btnEndCall) btnEndCall.addEventListener('click', endCall);

    // ----------------------------------------------------
    // Contacts Modal & List
    // ----------------------------------------------------
    const addContactModal = document.getElementById('add-contact-modal');
    const btnOpenContactModal = document.getElementById('btn-add-contact-modal-trigger');
    const btnDialerAddContact = document.getElementById('btn-dialer-add-contact');
    const btnCloseContactModal = document.getElementById('btn-close-contact-modal');
    const formAddContact = document.getElementById('form-add-contact');
    const contactsContainer = document.getElementById('contacts-list-container');

    let contactsList = [
        { name: "Aminu Kano", phone: "+2348031234567" },
        { name: "Fatima Aliyu", phone: "+2348029876543" },
        { name: "Ibrahim Musa", phone: "+2348123456789" }
    ];

    function renderContacts() {
        if (!contactsContainer) return;
        contactsContainer.innerHTML = '';
        contactsList.forEach(c => {
            const div = document.createElement('div');
            div.style.cssText = 'background:#f8fafc; border:1px solid var(--border-light); border-radius:14px; padding:12px 14px; display:flex; justify-content:space-between; align-items:center;';
            div.innerHTML = `
                <div>
                    <div style="font-weight:700; font-size:0.92rem;">${c.name}</div>
                    <div style="font-size:0.8rem; color:var(--text-muted);">${c.phone}</div>
                </div>
                <button class="btn-call-circle" style="width:38px; height:38px; font-size:1rem;">📞</button>
            `;
            div.querySelector('button').addEventListener('click', () => {
                currentDialNumber = c.phone;
                updateDialerDisplay();
                navigateToPage('dialer');
            });
            contactsContainer.appendChild(div);
        });
    }

    if (btnOpenContactModal) btnOpenContactModal.addEventListener('click', () => {
        if (addContactModal) addContactModal.classList.add('active');
    });
    if (btnDialerAddContact) btnDialerAddContact.addEventListener('click', () => {
        if (addContactModal) addContactModal.classList.add('active');
    });
    if (btnCloseContactModal) btnCloseContactModal.addEventListener('click', () => {
        if (addContactModal) addContactModal.classList.remove('active');
    });

    if (formAddContact) {
        formAddContact.addEventListener('submit', (e) => {
            e.preventDefault();
            const name = document.getElementById('contact-input-name').value.trim();
            const phone = document.getElementById('contact-input-phone').value.trim();
            contactsList.unshift({ name, phone });
            renderContacts();
            showToast(`Contact ${name} saved!`, 'success');
            if (addContactModal) addContactModal.classList.remove('active');
            formAddContact.reset();
        });
    }

    // Call Rates Renderer
    function renderRates(filter = '') {
        const container = document.getElementById('rates-grid-container');
        if (!container) return;
        container.innerHTML = '';
        const list = availableRates.filter(r => 
            r.country_name.toLowerCase().includes(filter.toLowerCase()) ||
            r.dial_code.includes(filter)
        );
        list.forEach(r => {
            const div = document.createElement('div');
            div.style.cssText = 'background:#f8fafc; border:1px solid var(--border-light); border-radius:14px; padding:12px 14px; display:flex; justify-content:space-between; align-items:center;';
            div.innerHTML = `
                <div style="display:flex; align-items:center; gap:10px;">
                    <span style="font-size:1.3rem;">${r.flag}</span>
                    <div>
                        <div style="font-weight:700; font-size:0.9rem;">${r.country_name}</div>
                        <div style="font-size:0.75rem; color:var(--text-muted);">${r.dial_code}</div>
                    </div>
                </div>
                <div style="text-align:right;">
                    <div style="font-weight:800; font-size:0.95rem; color:var(--primary-green-dark);">₦${r.rate.toFixed(2)}/min</div>
                </div>
            `;
            container.appendChild(div);
        });
    }

    const ratesSearch = document.getElementById('rates-search-input');
    if (ratesSearch) ratesSearch.addEventListener('input', (e) => renderRates(e.target.value));

    // Boot & Initial Session Check
    async function initSession() {
        try {
            const res = await fetch('api/auth.php');
            const data = await res.json();
            if (data.success && data.authenticated && data.user) {
                setAuthenticatedUI(data.user);
                navigateToPage('home');
            } else {
                setUnauthenticatedUI();
            }
        } catch (e) {
            setUnauthenticatedUI();
        }
    }

    initSession();
    renderContacts();
    renderRates();
    updateDialerDisplay();
});
