/**
 * ONE VOICE - Single Page Application Router & Financial Controller
 * Implements:
 * - Phone-Number as Unique Account Number & Dedicated Virtual NUBAN
 * - Fund Wallet via Bank Payment with Server-Enforced Revenue Sharing
 * - Telephony with Nigerian Retail Rates vs Wholesale Carrier Margins
 * - Administrator Finance Dashboard & Ledger Reconciliation
 */

// Global clipboard helper
window.copyText = (text, message = 'Copied to clipboard!') => {
    if (navigator.clipboard) {
        navigator.clipboard.writeText(text).then(() => {
            if (window.showToast) window.showToast(message, 'success');
        });
    } else {
        const temp = document.createElement('input');
        temp.value = text;
        document.body.appendChild(temp);
        temp.select();
        document.execCommand('copy');
        temp.remove();
        if (window.showToast) window.showToast(message, 'success');
    }
};

// ----------------------------------------------------
// SoundEngine - Telephony DTMF & Audio Synthesizer
// ----------------------------------------------------
class SoundEngine {
    constructor() {
        this.ctx = null;
        this.ringTimer = null;
        this.isRinging = false;
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

        gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.18);

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(this.ctx.destination);

        osc1.start();
        osc2.start();
        osc1.stop(this.ctx.currentTime + 0.18);
        osc2.stop(this.ctx.currentTime + 0.18);
    }

    startRingback() {
        this.init();
        if (!this.ctx || this.isRinging) return;
        this.isRinging = true;

        const playRingCycle = () => {
            if (!this.isRinging || !this.ctx) return;

            const osc1 = this.ctx.createOscillator();
            const osc2 = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc1.type = 'sine';
            osc1.frequency.setValueAtTime(440, this.ctx.currentTime);
            osc2.type = 'sine';
            osc2.frequency.setValueAtTime(480, this.ctx.currentTime);

            gain.gain.setValueAtTime(0.12, this.ctx.currentTime);
            gain.gain.setValueAtTime(0.12, this.ctx.currentTime + 1.2);
            gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + 1.3);

            osc1.connect(gain);
            osc2.connect(gain);
            gain.connect(this.ctx.destination);

            osc1.start();
            osc2.start();
            osc1.stop(this.ctx.currentTime + 1.3);
            osc2.stop(this.ctx.currentTime + 1.3);

            if (this.isRinging) {
                this.ringTimer = setTimeout(playRingCycle, 3000);
            }
        };

        playRingCycle();
    }

    stopRingback() {
        this.isRinging = false;
        if (this.ringTimer) clearTimeout(this.ringTimer);
    }

    playConnectBeep() {
        this.init();
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1200, this.ctx.currentTime + 0.15);
        gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.2);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.2);
    }

    playEndCallTone() {
        this.init();
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(450, this.ctx.currentTime);
        gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
        gain.gain.setValueAtTime(0.2, this.ctx.currentTime + 0.2);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.3);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.3);
    }
}
window.soundEngine = new SoundEngine();

// ----------------------------------------------------
// Localization Manager (EN / HA)
// ----------------------------------------------------
const i18n = {
    en: {
        appName: "ONE VOICE",
        welcomeTitle: "Global Calling Without Borders. Pure Crystal Voice.",
        welcomeDesc: "Call real mobile phones and landlines in 190+ countries with HD audio clarity. Transparent per-second billing from your secure digital wallet.",
        createAccount: "Create Account",
        login: "Login",
        signIn: "Sign In",
        register: "Register",
        logout: "Logout",
        dashboard: "Dashboard",
        memberId: "Member ID",
        navHome: "Home",
        navDialer: "Make Call",
        navContacts: "Contacts",
        navWallet: "My Wallet",
        navRates: "Call Rates",
        navSettings: "Settings",
        makeCall: "Make Call",
        rechargeWallet: "Fund Wallet",
        dialNow: "Dial Now",
        exploreRates: "Explore Call Rates",
        fullName: "Full Name",
        phoneNumber: "Phone Number",
        emailAddress: "Email Address",
        password: "Password",
        confirmPassword: "Confirm Password",
        termsAgreement: "I accept the Terms and Conditions and Privacy Policy",
        alreadyAccount: "Already have an account? Login",
        welcomeBack: "Welcome back",
        activeCallingCredit: "Available Calling Credit",
        recentCalls: "Recent Call Logs",
        walletTransactions: "Wallet Transactions",
        topUpNow: "Instant Top-Up",
        settingsTitle: "Account Settings & Security",
        editProfile: "Edit Profile",
        changePhone: "Change Phone Number",
        changePassword: "Change Password",
        languagePreference: "Language Preference",
        contactsTitle: "Saved Contacts",
        addContact: "Add New Contact",
        contactName: "Contact Name",
        contactPhone: "Phone Number",
        saveContact: "Save Contact",
        logoutConfirmTitle: "Confirm Logout",
        logoutConfirmMsg: "Are you sure you want to end your secure session?",
        cancel: "Cancel",
        confirmLogout: "Yes, Logout"
    },
    ha: {
        appName: "ONE VOICE",
        welcomeTitle: "Kiran Ƙasashen Waje Ba Tare Da Shamaki Ba. Muryar Zinare.",
        welcomeDesc: "Kira layukan wayar salula da na gida a ƙasashe sama da 190 da tsaftatacciyar muryar HD. Caji na gaskiya a kowace daƙiƙa daga walat ɗinka mai aminci.",
        createAccount: "Buɗe Sabon Asusu",
        login: "Shiga Asusu",
        signIn: "Shiga",
        register: "Yi Rajista",
        logout: "Fita Daga Asusu",
        dashboard: "Dandalin Asusu",
        memberId: "Lambar Zama Mamba",
        navHome: "Babban Dandali",
        navDialer: "Yi Kira",
        navContacts: "Lambobi",
        navWallet: "Walat",
        navRates: "Farashi",
        navSettings: "Saituna",
        makeCall: "Yi Kira",
        rechargeWallet: "Sanya Kuɗi a Walat",
        dialNow: "Kira Yanzu",
        exploreRates: "Duba Farashin Kira",
        fullName: "Cikakken Suna",
        phoneNumber: "Lambar Waya",
        emailAddress: "Adireshin Imel",
        password: "Kalmar Sirri",
        confirmPassword: "Tabbatar da Kalmar Sirri",
        termsAgreement: "Na yarda da Ka'idojin Amfani da Dokar Tsare Sirri",
        alreadyAccount: "Kana da asusu tuni? Shiga nan",
        welcomeBack: "Barka da dawowa",
        activeCallingCredit: "Ragowar Kuɗin Kira a Walat",
        recentCalls: "Tarihin Kiran Kwanan Nan",
        walletTransactions: "Ma'amalolin Walat",
        topUpNow: "Sanya Kuɗi Nan Take",
        settingsTitle: "Saitunan Asusu da Tsaro",
        editProfile: "Gyara Bayanai",
        changePhone: "Sauya Lambar Waya",
        changePassword: "Sauya Kalmar Sirri",
        languagePreference: "Zaɓin Harshe",
        contactsTitle: "Lambobin Sadarwa da Aka Ajiye",
        addContact: "Ƙara Sabuwar Lamba",
        contactName: "Sunan Mai Lamba",
        contactPhone: "Lambar Waya",
        saveContact: "Ajiye Lamba",
        logoutConfirmTitle: "Tabbatar da Fita",
        logoutConfirmMsg: "Shin da gaske kana son rufe wannan zama na asusunka?",
        cancel: "Soke",
        confirmLogout: "Eh, Fita Yanzu"
    }
};

class LocalizationManager {
    constructor() {
        this.currentLang = localStorage.getItem('onevoice_lang') || 'en';
    }

    setLanguage(lang) {
        if (!i18n[lang]) return;
        this.currentLang = lang;
        localStorage.setItem('onevoice_lang', lang);
        this.applyTranslations();
    }

    t(key) {
        return i18n[this.currentLang]?.[key] || i18n['en']?.[key] || key;
    }

    applyTranslations() {
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            const translation = this.t(key);
            if (translation) {
                if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
                    el.placeholder = translation;
                } else {
                    el.textContent = translation;
                }
            }
        });

        const langSelectors = document.querySelectorAll('.lang-select-btn');
        langSelectors.forEach(btn => {
            if (btn.getAttribute('data-lang') === this.currentLang) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });

        window.dispatchEvent(new CustomEvent('languageChanged', { detail: { lang: this.currentLang } }));
    }
}
window.locManager = new LocalizationManager();

document.addEventListener('DOMContentLoaded', () => {
    // ----------------------------------------------------
    // State Management
    // ----------------------------------------------------
    let currentUser = null;
    let currentPage = 'welcome';
    let otpCountdownTimer = null;
    let otpSecondsLeft = 300;
    let pendingLoginIdentifier = '';
    
    // Financial State (NGN) - Real ledger-backed, zero mock balance
    let userWalletBalance = 0.00;
    let currentCurrency = 'NGN';
    let platformSharePct = 10.0;
    let selectedTopupAmount = 10000;
    let cachedRates = [];

    // Dialer & Telephony State
    let currentDialNumber = '+234';
    let callTimer = null;
    let callSeconds = 0;
    let isCallActive = false;
    let currentCallRate = 12.00; // ₦12.00/min Nigeria default
    let activeCallCountry = 'Nigeria (All Networks)';
    let activeCallFlag = '🇳🇬';

    // API Fetch Wrapper attaching authenticated user context
    function apiFetch(url, options = {}) {
        options = options || {};
        options.headers = options.headers || {};
        if (currentUser && currentUser.id) {
            options.headers['X-User-Id'] = currentUser.id.toString();
        }
        return fetch(url, options);
    }

    // ----------------------------------------------------
    // DOM Elements
    // ----------------------------------------------------
    const allPages = document.querySelectorAll('.app-page');
    const allPageButtons = document.querySelectorAll('.nav-page-btn');
    const publicNavLinks = document.getElementById('public-nav-links');
    const authNavLinks = document.getElementById('auth-nav-links');
    const publicAuthBtns = document.getElementById('public-auth-btns');
    const authUserBtns = document.getElementById('auth-user-btns');
    const mobileDock = document.getElementById('mobile-dock');
    const navMemberBadge = document.getElementById('nav-member-badge');
    const navBalanceDisplay = document.getElementById('nav-balance');
    const brandLogo = document.getElementById('nav-brand-logo');

    // Dashboard & Profile Elements
    const dashUserName = document.getElementById('dash-user-name');
    const dashMemberId = document.getElementById('dash-member-id');
    const dashWalletBalance = document.getElementById('dash-wallet-balance');
    const dashLangBadge = document.getElementById('dash-language-badge');
    const dashPhoneAccount = document.getElementById('dash-phone-account-number');
    const userDisplayName = document.getElementById('user-display-name');
    const userMemberDisplay = document.getElementById('user-member-display');
    const dialerBalancePill = document.getElementById('dialer-balance-pill');

    // Virtual Bank Elements
    const walletBankName = document.getElementById('wallet-bank-name');
    const walletVirtualNuban = document.getElementById('wallet-virtual-nuban');
    const walletAccountName = document.getElementById('wallet-account-name');
    const walletPhoneAccount = document.getElementById('wallet-phone-account');
    const modalVirtualNuban = document.getElementById('modal-virtual-nuban');

    // Modal Revenue Split Elements
    const modalDepositInput = document.getElementById('modal-deposit-amount');
    const modalSharePctLabel = document.getElementById('modal-share-pct-label');
    const modalPlatformCutVal = document.getElementById('modal-platform-cut-val');
    const modalNetCreditVal = document.getElementById('modal-net-credit-val');

    // Dialer & Country Picker Elements
    const dialDisplay = document.getElementById('dial-number');
    const dialCountry = document.getElementById('dial-country');
    const dialerCountrySelect = document.getElementById('dialer-country-select');
    const dialerRateBadge = document.getElementById('dialer-rate-badge');
    const dialerAvailableMins = document.getElementById('dialer-available-mins');
    const dialerWalletStat = document.getElementById('dialer-wallet-stat');
    const screenCountryText = document.getElementById('screen-country-text');
    const screenCountryRate = document.getElementById('screen-country-rate');
    const countryChipBtns = document.querySelectorAll('.country-chip-btn');
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
    
    // Wallet & Tables
    const walletBalanceEl = document.getElementById('wallet-balance');
    const ratesGrid = document.getElementById('rates-grid');
    const ratesSearch = document.getElementById('rates-search');
    const transactionsList = document.getElementById('transactions-body');
    const callLogsList = document.getElementById('call-logs-body');
    const homeCallLogsList = document.getElementById('home-call-logs-body');
    const contactsContainer = document.getElementById('contacts-list-container');

    // Admin Dashboard Elements
    const adminGrossDeposits = document.getElementById('admin-gross-deposits');
    const adminPlatformRev = document.getElementById('admin-platform-rev');
    const adminCustomerBalances = document.getElementById('admin-customer-balances');
    const adminTelephonyMargin = document.getElementById('admin-telephony-margin');
    const inputAdminSharePct = document.getElementById('input-admin-share-pct');
    const inputAdminCallRate = document.getElementById('input-admin-call-rate');
    const adminLedgerBody = document.getElementById('admin-ledger-body');
    const adminSearchInput = document.getElementById('admin-search-input');
    const formAdminSettings = document.getElementById('form-admin-settings');
    const btnRefreshAdmin = document.getElementById('btn-refresh-admin');

    // Modals
    const topupModal = document.getElementById('topup-modal');
    const logoutModal = document.getElementById('logout-modal');
    const addContactModal = document.getElementById('add-contact-modal');
    const transferModal = document.getElementById('transfer-modal');
    const formPhoneTransfer = document.getElementById('form-phone-transfer');
    const transferRecipientPhone = document.getElementById('transfer-recipient-phone');
    const transferLookupBadge = document.getElementById('transfer-lookup-badge');
    const transferAmountInput = document.getElementById('transfer-amount');
    const transferModalBalance = document.getElementById('transfer-modal-balance');
    const transferChipBtns = document.querySelectorAll('.transfer-chip-btn');
    const btnConfirmTransfer = document.getElementById('btn-confirm-transfer');

    // ----------------------------------------------------
    // 1. Single Page Application Routing
    // ----------------------------------------------------
    function navigateToPage(pageName) {
        if (!pageName) return;

        const protectedPages = ['home', 'contacts', 'settings', 'admin'];
        if (!currentUser && protectedPages.includes(pageName)) {
            showToast('Please sign in to access this page', 'warning');
            pageName = 'login';
        }

        const targetEl = document.getElementById('page-' + pageName);
        if (!targetEl) return;

        allPages.forEach(p => p.classList.remove('active'));
        targetEl.classList.add('active');
        currentPage = pageName;

        allPageButtons.forEach(btn => {
            if (btn.getAttribute('data-page') === pageName) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });

        window.scrollTo({ top: 0, behavior: 'smooth' });

        if (pageName === 'contacts') {
            loadContacts();
        } else if (pageName === 'wallet' || pageName === 'home') {
            loadWalletData();
            loadCallLogs();
        } else if (pageName === 'admin') {
            loadAdminData();
        } else if (pageName === 'rates') {
            loadRates();
        } else if (pageName === 'dialer') {
            if (dialerBalancePill) dialerBalancePill.textContent = `₦${userWalletBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
        }

        try {
            history.pushState(null, '', `#${pageName}`);
        } catch (e) {}
    }

    document.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-page]');
        if (btn) {
            e.preventDefault();
            navigateToPage(btn.getAttribute('data-page'));
        }
    });

    window.addEventListener('popstate', () => {
        const hash = window.location.hash.replace('#', '') || (currentUser ? 'home' : 'welcome');
        navigateToPage(hash);
    });

    window.navigateToPage = navigateToPage;

    // Explicit listeners for Login and Create Account buttons (navbar & hero)
    const navBtnLogin = document.getElementById('nav-btn-login');
    if (navBtnLogin) navBtnLogin.addEventListener('click', () => navigateToPage('login'));

    const navBtnRegister = document.getElementById('nav-btn-register');
    if (navBtnRegister) navBtnRegister.addEventListener('click', () => navigateToPage('register'));

    const heroBtnLogin = document.getElementById('hero-btn-login');
    if (heroBtnLogin) heroBtnLogin.addEventListener('click', () => navigateToPage('login'));

    const heroBtnCreateAccount = document.getElementById('hero-btn-create-account');
    if (heroBtnCreateAccount) heroBtnCreateAccount.addEventListener('click', () => navigateToPage('register'));

    if (brandLogo) {
        brandLogo.addEventListener('click', (e) => {
            e.preventDefault();
            navigateToPage(currentUser ? 'home' : 'welcome');
        });
    }

    // Copy Account Number button on Dashboard
    const btnCopyDashPhone = document.getElementById('btn-copy-dash-phone');
    if (btnCopyDashPhone) {
        btnCopyDashPhone.addEventListener('click', () => {
            const phone = (currentUser ? currentUser.phone : '+2348031234567');
            window.copyText(phone, `ONE VOICE Account Number (${phone}) copied!`);
        });
    }

    // ----------------------------------------------------
    // 2. Localization (EN / HA)
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
    function formatPhoneToAccountNumber(phone) {
        if (!phone) return '9090809080';
        let digits = phone.toString().replace(/[^0-9]/g, '');
        let tenDigits = digits.length > 10 ? digits.slice(-10) : digits;
        if (tenDigits.startsWith('0')) {
            tenDigits = tenDigits.replace(/^0+/, '');
        }
        return tenDigits;
    }

    // ----------------------------------------------------
    // 3. User Authentication Setup
    // ----------------------------------------------------
    function setAuthenticatedUI(user) {
        if (!user) return;
        currentUser = user;

        if (publicNavLinks) publicNavLinks.style.display = 'none';
        if (authNavLinks) authNavLinks.style.display = 'flex';
        if (publicAuthBtns) publicAuthBtns.style.display = 'none';
        if (authUserBtns) authUserBtns.style.display = 'flex';
        if (mobileDock) mobileDock.style.display = 'flex';

        if (navMemberBadge) navMemberBadge.textContent = user.member_id || 'OV-784920';
        if (dashUserName) dashUserName.textContent = user.name;
        if (dashMemberId) dashMemberId.textContent = user.member_id || 'OV-784920';
        if (userDisplayName) userDisplayName.textContent = user.name;
        if (userMemberDisplay) userMemberDisplay.textContent = `Member ID: ${user.member_id || 'OV-784920'}`;

        const phoneNum = user.phone || '+2348031234567';
        const accountNum = formatPhoneToAccountNumber(phoneNum);

        if (dashPhoneAccount) dashPhoneAccount.textContent = accountNum;
        if (walletPhoneAccount) walletPhoneAccount.textContent = accountNum;
        if (walletAccountName) walletAccountName.textContent = "ONE VOICE / " + user.name;
        const modalUserPhone = document.getElementById('modal-user-phone-account');
        const modalUserName = document.getElementById('modal-user-name-account');
        if (modalUserPhone) modalUserPhone.textContent = accountNum;
        if (modalUserName) modalUserName.textContent = "ONE VOICE / " + user.name;

        // Hide Admin menu links for all non-admin users
        const navAdminLi = document.getElementById('nav-admin-li');
        const mobileDockAdmin = document.getElementById('mobile-dock-admin');
        const isAdmin = user.role === 'admin';
        if (navAdminLi) navAdminLi.style.display = isAdmin ? 'block' : 'none';
        if (mobileDockAdmin) mobileDockAdmin.style.display = isAdmin ? 'flex' : 'none';

        if (dashLangBadge) {
            dashLangBadge.textContent = (user.language === 'ha') ? 'Hausa (ha)' : 'English (en)';
        }

        const settingsNameEl = document.getElementById('settings-name');
        const settingsPhoneEl = document.getElementById('settings-phone');
        const settingsLangEl = document.getElementById('settings-language');
        const modalCurPhoneEl = document.getElementById('modal-current-phone');

        if (settingsNameEl) settingsNameEl.value = user.name || '';
        if (settingsPhoneEl) settingsPhoneEl.value = phoneNum;
        if (settingsLangEl) settingsLangEl.value = user.language || 'en';
        if (modalCurPhoneEl) modalCurPhoneEl.textContent = phoneNum;

        loadWalletData();
        loadCallLogs();
    }

    function setUnauthenticatedUI() {
        currentUser = null;
        userWalletBalance = 0.00;
        updateBalanceUI(0.00);
        if (publicNavLinks) publicNavLinks.style.display = 'flex';
        if (authNavLinks) authNavLinks.style.display = 'none';
        if (publicAuthBtns) publicAuthBtns.style.display = 'flex';
        if (authUserBtns) authUserBtns.style.display = 'none';
        if (mobileDock) mobileDock.style.display = 'none';
    }

    // ----------------------------------------------------
    // 4. Registration & Login Handlers
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
            btn.textContent = 'Allocating Account...';

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
                    showToast('Account created with phone identity!', 'success');
                    const succId = document.getElementById('success-member-id');
                    if (succId) succId.textContent = `Member ID: ${data.member_id} • Account: ${phone}`;
                    navigateToPage('reg-success');
                } else {
                    showToast(data.message || 'Registration failed', 'error');
                }
            } catch (err) {
                showToast('Registration network error', 'error');
            } finally {
                btn.disabled = false;
                btn.textContent = 'Register';
            }
        });
    }

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
                    currentUser = data.user;
                    setAuthenticatedUI(currentUser);
                    showToast(data.message || `Welcome back, ${data.user.name}!`, 'success');
                    navigateToPage('home');
                } else if (data.success && data.otp_sent) {
                    pendingLoginIdentifier = id;
                    const otpTarget = document.getElementById('otp-target-display');
                    if (otpTarget) otpTarget.textContent = id;

                    showToast(data.message, 'success');
                    navigateToPage('otp');
                    startOtpTimer(data.expires_in_seconds || 300);
                } else {
                    showToast(data.message || 'Invalid credentials', 'error');
                }
            } catch (err) {
                showToast('Login server error', 'error');
            } finally {
                btn.disabled = false;
                btn.textContent = 'Sign In';
            }
        });
    }

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
                showToast('OTP has expired.', 'warning');
            }
            otpSecondsLeft--;
        };

        updateTimer();
        otpCountdownTimer = setInterval(updateTimer, 1000);
    }

    const formOtp = document.getElementById('form-otp-verify');
    if (formOtp) {
        formOtp.addEventListener('submit', async (e) => {
            e.preventDefault();
            const otpCode = document.getElementById('otp-input').value.trim();
            const btn = document.getElementById('btn-submit-otp');
            btn.disabled = true;
            btn.textContent = 'Verifying OTP...';

            try {
                const res = await fetch('api/auth.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'verify_otp', identifier: pendingLoginIdentifier, otp: otpCode })
                });
                const data = await res.json();

                if (data.success) {
                    currentUser = data.user;
                    if (otpCountdownTimer) clearInterval(otpCountdownTimer);
                    setAuthenticatedUI(currentUser);
                    showToast(data.message, 'success');
                    navigateToPage('home');
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
    // 5. Wallet & Automated Revenue-Sharing Engine
    // ----------------------------------------------------
    async function loadWalletData() {
        try {
            const res = await apiFetch('api/wallet.php');
            const data = await res.json();
            if (data.success) {
                userWalletBalance = parseFloat(data.balance);
                currentCurrency = data.currency || 'NGN';
                platformSharePct = parseFloat(data.revenue_sharing?.platform_share_pct || 10.0);

                updateBalanceUI(userWalletBalance);

                const RANDOM_BANKS = [
                    "Kuda Microfinance Bank",
                    "Wema Bank",
                    "Moniepoint MFB",
                    "OPay (Paycom)",
                    "Palmpay",
                    "Sterling Bank",
                    "Providus Bank",
                    "FairMoney MFB"
                ];
                const assignedBank = data.virtual_account?.bank_name || data.bank_name || RANDOM_BANKS[(currentUser?.id || 1) % RANDOM_BANKS.length];
                if (walletBankName) walletBankName.textContent = assignedBank;
                const modalUserBank = document.getElementById('modal-user-bank-name');
                if (modalUserBank) modalUserBank.textContent = assignedBank;
                const modalBankHint = document.getElementById('modal-bank-hint');
                if (modalBankHint) modalBankHint.textContent = assignedBank;

                const accountNum = formatPhoneToAccountNumber(currentUser?.phone || data.account_number);
                if (walletPhoneAccount) walletPhoneAccount.textContent = accountNum;
                const modalUserPhone = document.getElementById('modal-user-phone-account');
                if (modalUserPhone) modalUserPhone.textContent = accountNum;

                updateModalSplitPreview();
                if (data.transactions) renderTransactions(data.transactions);
            }
        } catch (err) {}
    }

    function updateBalanceUI(balance) {
        const formatted = `₦${balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
        if (walletBalanceEl) walletBalanceEl.textContent = formatted;
        if (dashWalletBalance) dashWalletBalance.textContent = formatted;
        if (navBalanceDisplay) navBalanceDisplay.textContent = formatted;
        if (dialerBalancePill) dialerBalancePill.textContent = formatted;
        if (transferModalBalance) transferModalBalance.textContent = formatted;
        updateCallEstimator();
    }

    // Live Revenue Split calculation in Deposit Modal
    function updateModalSplitPreview() {
        if (!modalDepositInput) return;
        const gross = parseFloat(modalDepositInput.value) || 0;
        const platformCut = Math.round((gross * (platformSharePct / 100.0)) * 100) / 100;
        const netCredit = Math.round((gross - platformCut) * 100) / 100;

        if (modalSharePctLabel) modalSharePctLabel.textContent = `${platformSharePct}%`;
        if (modalPlatformCutVal) modalPlatformCutVal.textContent = `₦${platformCut.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
        if (modalNetCreditVal) modalNetCreditVal.textContent = `₦${netCredit.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
    }

    if (modalDepositInput) {
        modalDepositInput.addEventListener('input', updateModalSplitPreview);
    }

    // Quick chip selection on Wallet page
    const topupChips = document.querySelectorAll('.topup-chip-btn');
    topupChips.forEach(chip => {
        chip.addEventListener('click', () => {
            topupChips.forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            selectedTopupAmount = parseFloat(chip.getAttribute('data-amount'));
            const customInput = document.getElementById('custom-topup-input');
            if (customInput) customInput.value = selectedTopupAmount;
            if (modalDepositInput) {
                modalDepositInput.value = selectedTopupAmount;
                updateModalSplitPreview();
            }
        });
    });

    const customInput = document.getElementById('custom-topup-input');
    if (customInput) {
        customInput.addEventListener('input', (e) => {
            selectedTopupAmount = parseFloat(e.target.value) || 0;
            topupChips.forEach(c => c.classList.remove('active'));
            if (modalDepositInput) {
                modalDepositInput.value = selectedTopupAmount;
                updateModalSplitPreview();
            }
        });
    }

    window.openTopupModal = () => {
        if (modalDepositInput && selectedTopupAmount) {
            modalDepositInput.value = selectedTopupAmount;
        }
        const modalUserPhone = document.getElementById('modal-user-phone-account');
        const modalUserName = document.getElementById('modal-user-name-account');
        if (modalUserPhone && currentUser) modalUserPhone.textContent = formatPhoneToAccountNumber(currentUser.phone);
        if (modalUserName && currentUser) modalUserName.textContent = "ONE VOICE / " + currentUser.name;
        updateModalSplitPreview();
        if (topupModal) topupModal.classList.add('active');
    };
    window.closeTopupModal = () => { if (topupModal) topupModal.classList.remove('active'); };

    const triggerTopupBtns = document.querySelectorAll('.trigger-topup');
    triggerTopupBtns.forEach(btn => btn.addEventListener('click', window.openTopupModal));

    // Reusable Deposit Execution Function (Internal Bank Simulation - No External API)
    async function completeDeposit(amount, channel = 'bank_transfer', ref = null) {
        if (!ref) ref = 'DEP-' + Date.now();
        const btnConfirm = document.getElementById('btn-confirm-topup');
        if (btnConfirm) { btnConfirm.disabled = true; btnConfirm.textContent = 'Processing Deposit...'; }

        try {
            const res = await apiFetch('api/wallet.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'fund_bank_transfer',
                    amount: amount,
                    channel: channel,
                    provider_reference: ref
                })
            });
            const data = await res.json();

            if (data.success) {
                userWalletBalance = parseFloat(data.new_balance);
                updateBalanceUI(userWalletBalance);
                const b = data.deposit_breakdown;
                showToast(`🎉 ₦${b.net_credited_to_user.toFixed(2)} credited to your wallet successfully!`, 'success');
                closeTopupModal();
                loadWalletData();
            } else {
                showToast(data.message || 'Deposit verification failed', 'error');
            }
        } catch (err) {
            showToast('Deposit could not be completed', 'error');
        } finally {
            if (btnConfirm) { btnConfirm.disabled = false; btnConfirm.textContent = '⚡ Complete Deposit to Wallet'; }
        }
    }

    const confirmTopupBtn = document.getElementById('btn-confirm-topup');
    if (confirmTopupBtn) {
        confirmTopupBtn.addEventListener('click', () => {
            const amount = parseFloat(modalDepositInput ? modalDepositInput.value : selectedTopupAmount);
            if (amount < 10) {
                showToast('Minimum deposit is ₦10.00', 'error');
                return;
            }
            completeDeposit(amount, 'bank_transfer', 'DEP-' + Date.now());
        });
    }

    // ----------------------------------------------------
    // 5b. Phone Number-to-Phone Number Account Transfers
    // ----------------------------------------------------
    let transferDebounceTimer = null;
    let verifiedRecipient = null;

    window.openTransferModal = () => {
        if (transferModalBalance) {
            transferModalBalance.textContent = `₦${userWalletBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
        }
        if (transferAmountInput && (!transferAmountInput.value || transferAmountInput.value === '0')) {
            transferAmountInput.value = '1000';
        }
        if (transferLookupBadge) transferLookupBadge.style.display = 'none';
        verifiedRecipient = null;
        if (transferModal) transferModal.classList.add('active');
    };

    window.closeTransferModal = () => {
        if (transferModal) transferModal.classList.remove('active');
    };

    const triggerTransferBtns = document.querySelectorAll('.trigger-transfer');
    triggerTransferBtns.forEach(btn => btn.addEventListener('click', window.openTransferModal));

    transferChipBtns.forEach(chip => {
        chip.addEventListener('click', () => {
            transferChipBtns.forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            const amt = chip.getAttribute('data-amt');
            if (transferAmountInput) transferAmountInput.value = amt;
        });
    });

    if (transferRecipientPhone) {
        transferRecipientPhone.addEventListener('input', (e) => {
            clearTimeout(transferDebounceTimer);
            const rawPhone = e.target.value.trim();
            if (rawPhone.length < 7) {
                if (transferLookupBadge) transferLookupBadge.style.display = 'none';
                verifiedRecipient = null;
                return;
            }

            transferDebounceTimer = setTimeout(async () => {
                try {
                    const res = await apiFetch(`api/wallet.php?lookup_phone=${encodeURIComponent(rawPhone)}`);
                    const data = await res.json();
                    if (data.success && data.user) {
                        verifiedRecipient = data.user;
                        if (transferLookupBadge) {
                            transferLookupBadge.style.display = 'block';
                            transferLookupBadge.style.background = '#d1fae5';
                            transferLookupBadge.style.color = 'var(--clay-mint-dark)';
                            transferLookupBadge.innerHTML = `✓ Verified Beneficiary: <strong>${data.user.name}</strong> (${data.user.phone})`;
                        }
                    } else {
                        verifiedRecipient = null;
                        if (transferLookupBadge) {
                            transferLookupBadge.style.display = 'block';
                            transferLookupBadge.style.background = '#fee2e2';
                            transferLookupBadge.style.color = 'var(--clay-coral-dark)';
                            transferLookupBadge.innerHTML = `⚠️ No registered ONE VOICE user found with this number`;
                        }
                    }
                } catch (err) {}
            }, 300);
        });
    }

    if (formPhoneTransfer) {
        formPhoneTransfer.addEventListener('submit', async (e) => {
            e.preventDefault();
            const recipientPhone = transferRecipientPhone ? transferRecipientPhone.value.trim() : '';
            const amount = parseFloat(transferAmountInput ? transferAmountInput.value : 0);

            if (!recipientPhone) {
                showToast('Please enter recipient phone number', 'error');
                return;
            }
            if (amount < 50) {
                showToast('Minimum transfer amount is ₦50.00', 'error');
                return;
            }
            if (amount > userWalletBalance) {
                showToast(`Insufficient balance (₦${userWalletBalance.toFixed(2)}). Fund your wallet first.`, 'error');
                return;
            }

            if (btnConfirmTransfer) {
                btnConfirmTransfer.textContent = 'Processing Transfer...';
                btnConfirmTransfer.disabled = true;
            }

            try {
                const res = await apiFetch('api/wallet.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        action: 'transfer_phone',
                        recipient_phone: recipientPhone,
                        amount: amount
                    })
                });
                const data = await res.json();

                if (data.success) {
                    userWalletBalance = parseFloat(data.new_balance);
                    updateBalanceUI(userWalletBalance);
                    showToast(data.message || `Transferred ₦${amount.toLocaleString()} successfully!`, 'success');
                    closeTransferModal();
                    formPhoneTransfer.reset();
                    if (transferLookupBadge) transferLookupBadge.style.display = 'none';
                    loadWalletData();
                } else {
                    showToast(data.message || 'Transfer failed', 'error');
                }
            } catch (err) {
                showToast('Transfer request failed. Check server connection.', 'error');
            } finally {
                if (btnConfirmTransfer) {
                    btnConfirmTransfer.textContent = '💸 Confirm & Send Transfer';
                    btnConfirmTransfer.disabled = false;
                }
            }
        });
    }

    function renderTransactions(txs) {
        if (!transactionsList) return;
        transactionsList.innerHTML = '';
        if (!txs || txs.length === 0) {
            transactionsList.innerHTML = `<tr><td colspan="5" style="text-align:center;">No financial transactions recorded yet</td></tr>`;
            return;
        }

        txs.forEach(t => {
            const tr = document.createElement('tr');
            const gross = parseFloat(t.gross_amount || 0);
            const fee = parseFloat(t.platform_fee || 0);
            const net = parseFloat(t.net_credited || 0);

            tr.innerHTML = `
                <td>
                    <strong>${t.narration || t.transaction_type}</strong>
                    <div style="font-size:0.75rem; color:var(--text-muted); font-family:var(--font-mono);">${t.internal_reference || t.provider_reference}</div>
                </td>
                <td style="font-family:var(--font-mono); font-weight:700;">₦${gross.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                <td style="font-family:var(--font-mono); color:var(--clay-coral-dark); font-weight:700;">-₦${fee.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                <td style="font-family:var(--font-mono); color:var(--clay-mint-dark); font-weight:800;">+₦${net.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                <td><span class="clay-badge badge-mint">${t.status || 'successful'}</span></td>
            `;
            transactionsList.appendChild(tr);
        });
    }

    // ----------------------------------------------------
    // 6. Administrator Finance Dashboard Controller
    // ----------------------------------------------------
    async function loadAdminData(searchQuery = '') {
        try {
            const url = searchQuery ? `api/admin.php?search=${encodeURIComponent(searchQuery)}` : 'api/admin.php';
            const res = await fetch(url);
            const data = await res.json();

            if (data.success) {
                const m = data.metrics;
                if (adminGrossDeposits) adminGrossDeposits.textContent = `₦${m.total_gross_deposits.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
                if (adminPlatformRev) adminPlatformRev.textContent = `₦${m.total_platform_revenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
                if (adminCustomerBalances) adminCustomerBalances.textContent = `₦${m.total_customer_balances.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
                if (adminTelephonyMargin) adminTelephonyMargin.textContent = `₦${m.total_telephony_margin.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;

                const c = data.configuration;
                if (inputAdminSharePct) inputAdminSharePct.value = c.platform_revenue_share_pct;
                if (inputAdminCallRate) inputAdminCallRate.value = c.nigeria_call_rate_per_min;

                renderAdminLedger(data.ledger || []);
                renderAdminUsers(data.users || []);
            }
        } catch (err) {}
    }

    function renderAdminUsers(users) {
        const adminUsersBody = document.getElementById('admin-users-body');
        const adminMembersCount = document.getElementById('admin-members-count');
        if (adminMembersCount) {
            adminMembersCount.textContent = `${users.length} Registered Member${users.length === 1 ? '' : 's'}`;
        }
        if (!adminUsersBody) return;
        adminUsersBody.innerHTML = '';

        if (!users || users.length === 0) {
            adminUsersBody.innerHTML = `<tr><td colspan="8" style="text-align:center;">No registered members found in database</td></tr>`;
            return;
        }

        users.forEach(u => {
            const tr = document.createElement('tr');
            const bal = parseFloat(u.balance || 0);
            const initial = (u.name || 'U').charAt(0).toUpperCase();
            const isAdmin = u.role === 'admin';

            tr.innerHTML = `
                <td>
                    <span class="member-id-tag" style="font-size:0.8rem; padding:4px 10px;">${u.member_id || 'OV-' + u.id}</span>
                </td>
                <td>
                    <div style="display:flex; align-items:center; gap:8px;">
                        <div class="contact-avatar" style="width:32px; height:32px; font-size:0.85rem; border-radius:50%; background:#e0e7ff; color:var(--clay-primary); display:flex; align-items:center; justify-content:center; font-weight:700;">${initial}</div>
                        <strong>${u.name}</strong>
                    </div>
                </td>
                <td style="font-family:var(--font-mono); font-weight:700; color:var(--clay-primary);">
                    ${u.phone}
                    <button class="clay-action-icon-btn" style="width:26px; height:26px; font-size:0.75rem; margin-left:6px;" onclick="copyText('${u.phone}', 'Phone number copied!')" title="Copy">📋</button>
                </td>
                <td style="font-family:var(--font-mono); font-size:0.85rem;">
                    ${u.virtual_account_number || ('9' + (u.phone || '').replace(/[^0-9]/g, '').slice(-10))}
                </td>
                <td style="font-size:0.85rem; color:var(--text-secondary);">${u.email}</td>
                <td>
                    <span class="clay-badge ${isAdmin ? 'badge-primary' : 'badge-mint'}" style="font-size:0.75rem;">
                        ${isAdmin ? '👑 Admin' : '👤 Member'}
                    </span>
                </td>
                <td style="font-family:var(--font-mono); font-weight:800; color:var(--clay-mint-dark);">
                    ₦${bal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </td>
                <td>
                    <button class="clay-btn clay-btn-primary" style="padding:4px 10px; font-size:0.75rem;" onclick="quickTransferTo('${u.phone}')">
                        💸 Transfer
                    </button>
                </td>
            `;
            adminUsersBody.appendChild(tr);
        });
    }

    window.quickTransferTo = (phone) => {
        const transferPhoneInput = document.getElementById('transfer-recipient-phone');
        if (transferPhoneInput) {
            transferPhoneInput.value = phone;
            transferPhoneInput.dispatchEvent(new Event('input'));
        }
        window.openTransferModal();
    };

    function renderAdminLedger(ledger) {
        if (!adminLedgerBody) return;
        adminLedgerBody.innerHTML = '';

        if (!ledger || ledger.length === 0) {
            adminLedgerBody.innerHTML = `<tr><td colspan="8" style="text-align:center;">No matching transactions found in audit ledger</td></tr>`;
            return;
        }

        ledger.forEach(entry => {
            const tr = document.createElement('tr');
            const gross = parseFloat(entry.gross_amount || 0);
            const fee = parseFloat(entry.platform_fee || 0);
            const net = parseFloat(entry.net_credited || 0);
            const isReconciled = entry.status === 'reconciled';

            tr.innerHTML = `
                <td style="font-size:0.82rem; color:var(--text-muted);">${entry.created_at || 'Just now'}</td>
                <td style="font-family:var(--font-mono); font-size:0.85rem;"><strong>${entry.internal_reference}</strong></td>
                <td style="font-family:var(--font-mono);">₦${gross.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                <td style="font-family:var(--font-mono); color:var(--clay-coral-dark); font-weight:700;">₦${fee.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                <td style="font-family:var(--font-mono); color:var(--clay-mint-dark); font-weight:700;">₦${net.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                <td><span class="clay-badge">${entry.channel}</span></td>
                <td><span class="clay-badge ${isReconciled ? 'badge-primary' : 'badge-mint'}">${entry.status}</span></td>
                <td>
                    ${!isReconciled ? `<button class="clay-btn clay-btn-white" style="padding:6px 12px; font-size:0.75rem;" onclick="reconcileEntry('${entry.internal_reference}')">Reconcile</button>` : `<span style="color:var(--clay-primary);font-size:0.8rem;">✓ Audited</span>`}
                </td>
            `;
            adminLedgerBody.appendChild(tr);
        });
    }

    window.reconcileEntry = async (reference) => {
        try {
            const res = await fetch('api/admin.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'reconcile_entry', reference: reference })
            });
            const data = await res.json();
            if (data.success) {
                showToast(`Transaction ${reference} reconciled!`, 'success');
                loadAdminData();
            }
        } catch (e) {}
    };

    if (formAdminSettings) {
        formAdminSettings.addEventListener('submit', async (e) => {
            e.preventDefault();
            const share = parseFloat(inputAdminSharePct.value);
            const rate = parseFloat(inputAdminCallRate.value);

            try {
                const res = await fetch('api/admin.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        action: 'update_settings',
                        platform_revenue_share_pct: share,
                        nigeria_call_rate_per_min: rate
                    })
                });
                const data = await res.json();
                if (data.success) {
                    platformSharePct = share;
                    currentCallRate = rate;
                    showToast(`Financial rules updated! Platform share set to ${share}%.`, 'success');
                    loadAdminData();
                    loadWalletData();
                }
            } catch (err) {
                showToast('Failed to update admin settings', 'error');
            }
        });
    }

    if (btnRefreshAdmin) btnRefreshAdmin.addEventListener('click', () => loadAdminData());

    if (adminSearchInput) {
        let deb;
        adminSearchInput.addEventListener('input', (e) => {
            clearTimeout(deb);
            deb = setTimeout(() => loadAdminData(e.target.value.trim()), 300);
        });
    }

    // ----------------------------------------------------
    // 7. Interactive Dialer & Telephony Margins (Nigeria)
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
            currentDialNumber = activeCallFlag === '🇳🇬' ? '+234' : (currentDialNumber.split(' ')[0] || '+234');
            updateDialDisplay();
        });
    }

    // Supported Countries Table
    const countryDatabase = [
        { code: 'NG', dial: '+234', name: 'Nigeria (All Networks)', rate: 12.00, flag: '🇳🇬' },
        { code: 'US', dial: '+1', name: 'United States', rate: 18.00, flag: '🇺🇸' },
        { code: 'GB', dial: '+44', name: 'United Kingdom', rate: 22.00, flag: '🇬🇧' },
        { code: 'CA', dial: '+1', name: 'Canada', rate: 18.00, flag: '🇨🇦' },
        { code: 'GH', dial: '+233', name: 'Ghana', rate: 35.00, flag: '🇬🇭' },
        { code: 'SA', dial: '+966', name: 'Saudi Arabia', rate: 40.00, flag: '🇸🇦' },
        { code: 'AE', dial: '+971', name: 'United Arab Emirates', rate: 42.00, flag: '🇦🇪' },
        { code: 'NE', dial: '+227', name: 'Niger', rate: 45.00, flag: '🇳🇪' },
        { code: 'CM', dial: '+237', name: 'Cameroon', rate: 40.00, flag: '🇨🇲' },
        { code: 'ZA', dial: '+27', name: 'South Africa', rate: 28.00, flag: '🇿🇦' },
        { code: 'KE', dial: '+254', name: 'Kenya', rate: 32.00, flag: '🇰🇪' },
        { code: 'IN', dial: '+91', name: 'India', rate: 15.00, flag: '🇮🇳' },
        { code: 'CN', dial: '+86', name: 'China', rate: 20.00, flag: '🇨🇳' },
        { code: 'DE', dial: '+49', name: 'Germany', rate: 25.00, flag: '🇩🇪' },
        { code: 'FR', dial: '+33', name: 'France', rate: 25.00, flag: '🇫🇷' },
        { code: 'MY', dial: '+60', name: 'Malaysia', rate: 22.00, flag: '🇲🇾' }
    ];

    function detectCountry(number) {
        if (!number) return { name: 'Nigeria (All Networks)', rate: 12.00, flag: '🇳🇬', code: 'NG' };
        const cleaned = number.replace(/\s+/g, '');

        if (cleaned.startsWith('+234') || cleaned.startsWith('234') || cleaned.startsWith('080') || cleaned.startsWith('081') || cleaned.startsWith('090') || cleaned.startsWith('070')) {
            return { name: 'Nigeria (All Networks)', rate: 12.00, flag: '🇳🇬', code: 'NG' };
        }
        if (cleaned.startsWith('+966')) return { name: 'Saudi Arabia', rate: 40.00, flag: '🇸🇦', code: 'SA' };
        if (cleaned.startsWith('+971')) return { name: 'United Arab Emirates', rate: 42.00, flag: '🇦🇪', code: 'AE' };
        if (cleaned.startsWith('+233')) return { name: 'Ghana', rate: 35.00, flag: '🇬🇭', code: 'GH' };
        if (cleaned.startsWith('+227')) return { name: 'Niger', rate: 45.00, flag: '🇳🇪', code: 'NE' };
        if (cleaned.startsWith('+237')) return { name: 'Cameroon', rate: 40.00, flag: '🇨🇲', code: 'CM' };
        if (cleaned.startsWith('+254')) return { name: 'Kenya', rate: 32.00, flag: '🇰🇪', code: 'KE' };
        if (cleaned.startsWith('+27')) return { name: 'South Africa', rate: 28.00, flag: '🇿🇦', code: 'ZA' };
        if (cleaned.startsWith('+91')) return { name: 'India', rate: 15.00, flag: '🇮🇳', code: 'IN' };
        if (cleaned.startsWith('+86')) return { name: 'China', rate: 20.00, flag: '🇨🇳', code: 'CN' };
        if (cleaned.startsWith('+44') || cleaned.startsWith('44')) return { name: 'United Kingdom', rate: 22.00, flag: '🇬🇧', code: 'GB' };
        if (cleaned.startsWith('+1') || cleaned.startsWith('1')) return { name: 'United States / Canada', rate: 18.00, flag: '🇺🇸', code: 'US' };
        if (cleaned.startsWith('+49')) return { name: 'Germany', rate: 25.00, flag: '🇩🇪', code: 'DE' };
        if (cleaned.startsWith('+33')) return { name: 'France', rate: 25.00, flag: '🇫🇷', code: 'FR' };
        if (cleaned.startsWith('+60')) return { name: 'Malaysia', rate: 22.00, flag: '🇲🇾', code: 'MY' };
        return { name: 'International Call', rate: 35.00, flag: '🌐', code: 'INTL' };
    }

    function updateCallEstimator() {
        if (dialerWalletStat) {
            dialerWalletStat.textContent = `₦${userWalletBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
        }
        if (dialerAvailableMins) {
            if (userWalletBalance <= 0 || currentCallRate <= 0) {
                dialerAvailableMins.textContent = '0 mins (Fund Wallet)';
                dialerAvailableMins.style.color = 'var(--clay-coral-dark)';
            } else {
                const mins = Math.floor(userWalletBalance / currentCallRate);
                dialerAvailableMins.textContent = `${mins} min${mins === 1 ? '' : 's'}`;
                dialerAvailableMins.style.color = 'var(--clay-mint-dark)';
            }
        }
        if (dialerRateBadge) {
            dialerRateBadge.textContent = `Rate: ₦${currentCallRate.toFixed(2)} / min`;
        }
        if (screenCountryRate) {
            screenCountryRate.textContent = `₦${currentCallRate.toFixed(2)}/min`;
        }
        if (screenCountryText) {
            screenCountryText.textContent = `${activeCallFlag} ${activeCallCountry.split('(')[0].trim()}`;
        }
    }

    function updateDialDisplay() {
        if (!dialDisplay) return;
        dialDisplay.textContent = currentDialNumber || '—';
        const detected = detectCountry(currentDialNumber);
        activeCallCountry = detected.name;
        currentCallRate = detected.rate;
        activeCallFlag = detected.flag;

        if (dialCountry) {
            dialCountry.innerHTML = `${detected.flag} ${detected.name} <span style="color:var(--clay-primary);font-weight:700;">(₦${detected.rate.toFixed(2)}/min)</span>`;
        }

        // Sync dropdown & chips if recognized
        if (detected.code && dialerCountrySelect && dialerCountrySelect.value !== detected.code) {
            const hasOption = Array.from(dialerCountrySelect.options).some(o => o.value === detected.code);
            if (hasOption) dialerCountrySelect.value = detected.code;
        }

        countryChipBtns.forEach(btn => {
            if (btn.getAttribute('data-code') === detected.code) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });

        updateCallEstimator();
    }

    // Country Dropdown Change Listener
    if (dialerCountrySelect) {
        dialerCountrySelect.addEventListener('change', () => {
            const opt = dialerCountrySelect.options[dialerCountrySelect.selectedIndex];
            if (opt) {
                const dial = opt.getAttribute('data-dial') || '+234';
                const rate = parseFloat(opt.getAttribute('data-rate') || '12.00');
                const flag = opt.getAttribute('data-flag') || '🇳🇬';
                const code = opt.value;

                currentDialNumber = dial;
                currentCallRate = rate;
                activeCallFlag = flag;
                activeCallCountry = opt.text.split('—')[0].trim();

                countryChipBtns.forEach(btn => {
                    if (btn.getAttribute('data-code') === code) {
                        btn.classList.add('active');
                    } else {
                        btn.classList.remove('active');
                    }
                });

                updateDialDisplay();
            }
        });
    }

    // Country Shortcut Chips Listeners
    countryChipBtns.forEach(chip => {
        chip.addEventListener('click', () => {
            countryChipBtns.forEach(c => c.classList.remove('active'));
            chip.classList.add('active');

            const code = chip.getAttribute('data-code');
            const dial = chip.getAttribute('data-dial') || '+234';
            const rate = parseFloat(chip.getAttribute('data-rate') || '12.00');
            const flag = chip.getAttribute('data-flag') || '🇳🇬';

            currentDialNumber = dial;
            currentCallRate = rate;
            activeCallFlag = flag;
            activeCallCountry = chip.textContent.trim();

            if (dialerCountrySelect) {
                dialerCountrySelect.value = code;
            }

            updateDialDisplay();
        });
    });

    if (callBtn) callBtn.addEventListener('click', startCall);
    if (endCallBtn) endCallBtn.addEventListener('click', endCall);

    function startCall() {
        if (!currentDialNumber || currentDialNumber.length < 5) {
            showToast('Please dial a valid phone number first', 'error');
            return;
        }

        const minRequired = (currentCallRate / 60.0); // Cost for at least 1 second
        if (userWalletBalance <= 0 || userWalletBalance < minRequired) {
            showToast(`Insufficient balance (₦${userWalletBalance.toFixed(2)}). Please fund your wallet via bank transfer to call ${activeCallCountry}.`, 'error');
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
        overlayStatus.textContent = 'Routing through carrier...';
        overlayTimer.textContent = '00:00';
        overlayRate.textContent = `Rate: ₦${detected.rate.toFixed(2)}/min`;
        callingOverlay.style.display = 'flex';

        if (window.soundEngine) window.soundEngine.startRingback();

        setTimeout(() => {
            if (!isCallActive) return;
            if (window.soundEngine) {
                window.soundEngine.stopRingback();
                window.soundEngine.playConnectBeep();
            }

            overlayStatus.textContent = 'Connected (HD Telecom)';
            showToast(`Call connected to ${activeCallCountry} gateway`, 'success');

            callTimer = setInterval(() => {
                callSeconds++;
                const mins = String(Math.floor(callSeconds / 60)).padStart(2, '0');
                const secs = String(callSeconds % 60).padStart(2, '0');
                overlayTimer.textContent = `${mins}:${secs}`;

                const perSecondCost = currentCallRate / 60.0;
                userWalletBalance = Math.max(0, userWalletBalance - perSecondCost);
                updateBalanceUI(userWalletBalance);

                if (userWalletBalance <= 0) {
                    showToast('Call ended: wallet balance depleted', 'warning');
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
        const finalCost = (finalDuration / 60.0) * currentCallRate;

        showToast(`Call ended. Duration: ${finalDuration}s • Cost: ₦${finalCost.toFixed(2)}`, 'info');
        logCallToBackend(currentDialNumber, activeCallCountry, finalDuration, currentCallRate);
    }

    async function logCallToBackend(number, country, duration, rate) {
        try {
            const res = await apiFetch('api/calls.php', {
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
                loadWalletData();
            }
        } catch (err) {}
    }

    async function loadCallLogs() {
        try {
            const res = await apiFetch('api/calls.php');
            const data = await res.json();
            if (data.success && data.calls) {
                renderCallLogs(data.calls);
            }
        } catch (err) {}
    }

    function renderCallLogs(calls) {
        const renderTo = (container, list) => {
            if (!container) return;
            container.innerHTML = '';
            if (!list || list.length === 0) {
                container.innerHTML = `<tr><td colspan="5" style="text-align:center;">No calls recorded yet</td></tr>`;
                return;
            }
            list.forEach(c => {
                const tr = document.createElement('tr');
                const mins = Math.floor(c.duration_seconds / 60);
                const secs = c.duration_seconds % 60;
                tr.innerHTML = `
                    <td><strong>${c.destination_country}</strong></td>
                    <td style="font-family:var(--font-mono);">${c.destination_number}</td>
                    <td>${mins}m ${secs}s</td>
                    <td style="color:var(--clay-coral-dark); font-weight:700; font-family:var(--font-mono);">-₦${parseFloat(c.cost).toFixed(2)}</td>
                    <td><span class="clay-badge badge-mint">${c.status || 'completed'}</span></td>
                `;
                container.appendChild(tr);
            });
        };

        renderTo(callLogsList, calls);
        renderTo(homeCallLogsList, calls.slice(0, 5));
    }

    // ----------------------------------------------------
    // 8. Rates & Contacts Management
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
                        <span class="rate-price-big">₦${parseFloat(r.rate).toFixed(2)}</span>
                        <span class="rate-price-unit">/min</span>
                    </div>
                    <span class="roaming-savings">Save ${savingsPercent}%</span>
                </div>
                <button class="clay-btn clay-btn-primary" style="padding: 10px 18px; font-size: 0.9rem;" data-dial="${r.dial_code}">
                    📞 Dial Now
                </button>
            `;

            card.querySelector('button').addEventListener('click', () => {
                currentDialNumber = r.dial_code;
                updateDialDisplay();
                navigateToPage('dialer');
                showToast(`Dial code for ${r.country_name} (${r.dial_code}) loaded`, 'info');
            });

            ratesGrid.appendChild(card);
        });
    }

    async function loadContacts() {
        try {
            const res = await apiFetch('api/contacts.php');
            const data = await res.json();
            if (data.success && data.contacts) renderContacts(data.contacts);
        } catch (err) {}
    }

    function renderContacts(contacts) {
        if (!contactsContainer) return;
        contactsContainer.innerHTML = '';

        if (!contacts || contacts.length === 0) {
            contactsContainer.innerHTML = `<p style="text-align:center; color:var(--text-muted); padding:30px;">No saved contacts yet.</p>`;
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
                    <button class="clay-btn clay-btn-primary" style="padding:8px 18px; font-size:0.85rem;" data-dial="${c.phone}">
                        📞 Call
                    </button>
                    <button class="clay-action-icon-btn" style="width:38px; height:38px; font-size:0.9rem;" data-delete="${c.id}" title="Delete">
                        🗑️
                    </button>
                </div>
            `;

            item.querySelector('button[data-dial]').addEventListener('click', () => {
                currentDialNumber = c.phone;
                updateDialDisplay();
                navigateToPage('dialer');
                showToast(`Calling ${c.name} (${c.phone})...`, 'info');
                setTimeout(() => startCall(), 500);
            });

            item.querySelector('button[data-delete]').addEventListener('click', async () => {
                await fetch('api/contacts.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'delete', id: c.id })
                });
                showToast('Contact removed', 'info');
                loadContacts();
            });

            contactsContainer.appendChild(item);
        });
    }

    const btnAddContactModal = document.getElementById('btn-add-contact-modal');
    if (btnAddContactModal) btnAddContactModal.addEventListener('click', () => {
        if (addContactModal) addContactModal.classList.add('active');
    });

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
                    showToast('Contact saved!', 'success');
                    closeAddContactModal();
                    formAddContact.reset();
                    loadContacts();
                }
            } catch (err) {}
        });
    }

    // ----------------------------------------------------
    // 8b. Settings Profile & Secure Phone Number Change
    // ----------------------------------------------------
    const changePhoneModal = document.getElementById('change-phone-modal');
    const modalCurrentPhone = document.getElementById('modal-current-phone');
    const modalNewPhoneInput = document.getElementById('modal-new-phone-input');
    const formRequestPhoneChange = document.getElementById('form-request-phone-change');
    const phoneChangeOtpBox = document.getElementById('phone-change-otp-box');
    const modalPhoneOtpInput = document.getElementById('modal-phone-otp-input');
    const phoneChangeOtpHint = document.getElementById('phone-change-otp-hint');
    const btnSendPhoneOtp = document.getElementById('btn-send-phone-otp');
    const btnConfirmPhoneChange = document.getElementById('btn-confirm-phone-change');
    const btnResendPhoneOtp = document.getElementById('btn-resend-phone-otp');
    const btnOpenChangePhone = document.getElementById('btn-open-change-phone');
    const formUpdateProfile = document.getElementById('form-update-profile');
    const formChangePassword = document.getElementById('form-change-password');
    const settingsPhoneInput = document.getElementById('settings-phone');
    const settingsNameInput = document.getElementById('settings-name');
    const settingsLangInput = document.getElementById('settings-language');

    let pendingNewPhone = '';

    window.openChangePhoneModal = () => {
        const curPhone = (currentUser ? currentUser.phone : '+2348031234567');
        if (modalCurrentPhone) modalCurrentPhone.textContent = curPhone;

        if (settingsPhoneInput && settingsPhoneInput.value && settingsPhoneInput.value.trim() !== curPhone) {
            if (modalNewPhoneInput) modalNewPhoneInput.value = settingsPhoneInput.value.trim();
        } else {
            if (modalNewPhoneInput) modalNewPhoneInput.value = '';
        }

        if (phoneChangeOtpBox) phoneChangeOtpBox.style.display = 'none';
        if (modalPhoneOtpInput) modalPhoneOtpInput.value = '';
        if (phoneChangeOtpHint) phoneChangeOtpHint.textContent = '';
        if (btnSendPhoneOtp) {
            btnSendPhoneOtp.disabled = false;
            btnSendPhoneOtp.textContent = '📲 Send Verification OTP to New Number';
        }
        if (changePhoneModal) changePhoneModal.classList.add('active');
    };

    window.closeChangePhoneModal = () => {
        if (changePhoneModal) changePhoneModal.classList.remove('active');
    };

    if (btnOpenChangePhone) {
        btnOpenChangePhone.addEventListener('click', window.openChangePhoneModal);
    }

    if (formRequestPhoneChange) {
        formRequestPhoneChange.addEventListener('submit', async (e) => {
            e.preventDefault();
            const newPhone = modalNewPhoneInput.value.trim();
            if (!newPhone || newPhone.length < 7) {
                showToast('Please enter a valid phone number', 'error');
                return;
            }

            if (btnSendPhoneOtp) {
                btnSendPhoneOtp.disabled = true;
                btnSendPhoneOtp.textContent = 'Sending OTP...';
            }

            try {
                const res = await apiFetch('api/settings.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        action: 'request_phone_change',
                        new_phone: newPhone
                    })
                });
                const data = await res.json();

                if (data.success) {
                    pendingNewPhone = data.new_phone || newPhone;
                    showToast(data.message, 'success');
                    if (data.debug_hint) {
                        setTimeout(() => showToast(`🔑 ${data.debug_hint}`, 'info'), 800);
                        if (phoneChangeOtpHint) phoneChangeOtpHint.textContent = `💡 Hint: ${data.debug_hint}`;
                    }
                    if (phoneChangeOtpBox) phoneChangeOtpBox.style.display = 'block';
                    if (modalPhoneOtpInput) modalPhoneOtpInput.focus();
                } else {
                    showToast(data.message || 'Failed to send OTP to new number', 'error');
                }
            } catch (err) {
                showToast('Connection error while requesting phone change', 'error');
            } finally {
                if (btnSendPhoneOtp) {
                    btnSendPhoneOtp.disabled = false;
                    btnSendPhoneOtp.textContent = '📲 Resend OTP to New Number';
                }
            }
        });
    }

    if (btnResendPhoneOtp) {
        btnResendPhoneOtp.addEventListener('click', () => {
            if (formRequestPhoneChange) formRequestPhoneChange.dispatchEvent(new Event('submit'));
        });
    }

    if (btnConfirmPhoneChange) {
        btnConfirmPhoneChange.addEventListener('click', async () => {
            const otpCode = modalPhoneOtpInput.value.trim();
            if (!otpCode) {
                showToast('Please enter the 6-digit OTP code', 'error');
                return;
            }

            btnConfirmPhoneChange.disabled = true;
            btnConfirmPhoneChange.textContent = 'Verifying...';

            try {
                const res = await apiFetch('api/settings.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        action: 'verify_phone_change',
                        otp: otpCode,
                        new_phone: pendingNewPhone
                    })
                });
                const data = await res.json();

                if (data.success) {
                    currentUser = data.user;
                    setAuthenticatedUI(currentUser);
                    showToast(`🎉 ${data.message}`, 'success');
                    closeChangePhoneModal();
                    loadWalletData();
                } else {
                    showToast(data.message || 'Invalid OTP code', 'error');
                }
            } catch (err) {
                showToast('Verification server error', 'error');
            } finally {
                btnConfirmPhoneChange.disabled = false;
                btnConfirmPhoneChange.textContent = '✓ Verify & Update Account';
            }
        });
    }

    if (formUpdateProfile) {
        formUpdateProfile.addEventListener('submit', async (e) => {
            e.preventDefault();
            const newName = settingsNameInput ? settingsNameInput.value.trim() : '';
            const newLang = settingsLangInput ? settingsLangInput.value : 'en';
            const newPhone = settingsPhoneInput ? settingsPhoneInput.value.trim() : '';

            // If phone was changed in the input field, prompt to verify it via modal
            if (currentUser && newPhone && newPhone !== currentUser.phone) {
                showToast('Phone number changed! Please verify with SMS OTP.', 'info');
                window.openChangePhoneModal();
                return;
            }

            try {
                const res = await apiFetch('api/settings.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        action: 'update_profile',
                        name: newName,
                        language: newLang
                    })
                });
                const data = await res.json();
                if (data.success) {
                    currentUser = data.user;
                    setAuthenticatedUI(currentUser);
                    if (window.locManager) window.locManager.setLanguage(newLang);
                    showToast('Profile updated successfully!', 'success');
                } else {
                    showToast(data.message || 'Failed to update profile', 'error');
                }
            } catch (err) {
                showToast('Network error updating profile', 'error');
            }
        });
    }

    if (formChangePassword) {
        formChangePassword.addEventListener('submit', async (e) => {
            e.preventDefault();
            const oldPass = document.getElementById('settings-old-pass').value;
            const newPass = document.getElementById('settings-new-pass').value;
            const confirmPass = document.getElementById('settings-confirm-pass').value;

            if (newPass.length < 8) {
                showToast('Password must be at least 8 characters long', 'error');
                return;
            }
            if (newPass !== confirmPass) {
                showToast('Passwords do not match', 'error');
                return;
            }

            try {
                const res = await apiFetch('api/settings.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        action: 'change_password',
                        old_password: oldPass,
                        new_password: newPass,
                        confirm_password: confirmPass
                    })
                });
                const data = await res.json();
                if (data.success) {
                    showToast('Password changed successfully!', 'success');
                    formChangePassword.reset();
                } else {
                    showToast(data.message || 'Failed to update password', 'error');
                }
            } catch (err) {
                showToast('Network error updating password', 'error');
            }
        });
    }

    // ----------------------------------------------------
    // 9. Toast Notification Helper
    // ----------------------------------------------------
    window.showToast = (message, type = 'info') => {
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
        }, 4000);
    };

    // ----------------------------------------------------
    // 10. Logout & Session Boot
    // ----------------------------------------------------
    window.openLogoutModal = () => { if (logoutModal) logoutModal.classList.add('active'); };
    window.closeLogoutModal = () => { if (logoutModal) logoutModal.classList.remove('active'); };

    const navBtnLogout = document.getElementById('btn-trigger-logout');
    if (navBtnLogout) navBtnLogout.addEventListener('click', window.openLogoutModal);

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
            navigateToPage('welcome');
        });
    }

    async function initSession() {
        try {
            const res = await fetch('api/auth.php');
            const data = await res.json();
            if (data.success && data.authenticated && data.user) {
                setAuthenticatedUI(data.user);
                const initialHash = window.location.hash.replace('#', '') || 'home';
                navigateToPage(initialHash);
            } else {
                setUnauthenticatedUI();
                navigateToPage('welcome');
            }
        } catch (err) {
            setUnauthenticatedUI();
            navigateToPage('welcome');
        }
    }

    initSession();
    loadRates();
    loadWalletData();
    loadCallLogs();
    updateDialDisplay();
});
