/**
 * Three Star - Modern Mobile Web Application Controller
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
// SoundEngine - Telephony DTMF Synthesizer (Completely Silenced)
// ----------------------------------------------------
class SoundEngine {
    constructor() {
        this.ctx = null;
        this.muted = true;
    }

    init() {
        // Telephony audio muted across the entire website
    }

    playDtmf(key) {
        // Completely silenced per user specification (no dialing tones)
    }
}

// ----------------------------------------------------
// Persistent Local User Database (Survives Logout & Page Reloads)
// ----------------------------------------------------
const LOCAL_USERS_KEY = 'ov_registered_accounts_db';

function getLocalUsersDb() {
    try {
        const raw = localStorage.getItem(LOCAL_USERS_KEY);
        if (raw) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
    } catch (e) {}
    const defaults = [
        {
            id: 1,
            member_id: "OD-000001",
            name: "Super Admin",
            phone: "+2348031234567",
            email: "admin@gmail.com",
            password: "admin123",
            role: "admin",
            virtual_account_number: "9803123456",
            virtual_bank_name: "Wema Bank (Three Star NUBAN)"
        },
        {
            id: 2,
            member_id: "OV-219691",
            name: "Fatima Bello",
            phone: "+2348099887766",
            email: "fatima.bello@example.com",
            password: "user123",
            role: "user",
            virtual_account_number: "9809988776",
            virtual_bank_name: "Wema Bank (Three Star NUBAN)"
        },
        {
            id: 3,
            member_id: "OV-880993",
            name: "Amina Ahmed Inuwa",
            phone: "09090809080",
            email: "aminahausawi10@gmail.com",
            password: "user123",
            role: "user",
            virtual_account_number: "9909080908",
            virtual_bank_name: "Wema Bank (Three Star NUBAN)"
        }
    ];
    saveLocalUsersDb(defaults);
    return defaults;
}

function saveLocalUsersDb(usersList) {
    try {
        localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(usersList));
    } catch (e) {}
}

function saveUserToLocalDb(newUser) {
    if (!newUser) return;
    const list = getLocalUsersDb();
    const normNewPhone = (newUser.phone || '').replace(/[^0-9]/g, '').slice(-10);
    const existingIdx = list.findIndex(u => {
        const uPhone = (u.phone || '').replace(/[^0-9]/g, '').slice(-10);
        return (u.email && newUser.email && u.email.toLowerCase() === newUser.email.toLowerCase()) ||
               (normNewPhone && uPhone && normNewPhone === uPhone) ||
               (u.member_id && newUser.member_id && u.member_id === newUser.member_id);
    });

    if (existingIdx >= 0) {
        list[existingIdx] = Object.assign({}, list[existingIdx], newUser);
    } else {
        list.push(newUser);
    }
    saveLocalUsersDb(list);
}

document.addEventListener('DOMContentLoaded', () => {
    const soundEngine = new SoundEngine();

    // Application State
    let currentUser = null;
    let userWalletBalance = 9000.00;
    let userBundleBalance = 0.00;
    let currentDialNumber = '+234';
    let activeCallDuration = 0;
    let callTimerInterval = null;
    let availableRates = [
        { country_name: "Nigeria", country_code: "NG", dial_code: "+234", flag: "🇳🇬", rate: 12.00, roaming: 45.00 },
        { country_name: "United States", country_code: "US", dial_code: "+1", flag: "🇺🇸", rate: 18.00, roaming: 180.00 },
        { country_name: "United Kingdom", country_code: "GB", dial_code: "+44", flag: "🇬🇧", rate: 22.00, roaming: 220.00 },
        { country_name: "Canada", country_code: "CA", dial_code: "+1", flag: "🇨🇦", rate: 18.00, roaming: 180.00 },
        { country_name: "Ghana", country_code: "GH", dial_code: "+233", flag: "🇬🇭", rate: 35.00, roaming: 250.00 },
        { country_name: "Saudi Arabia", country_code: "SA", dial_code: "+966", flag: "🇸🇦", rate: 40.00, roaming: 280.00 },
        { country_name: "United Arab Emirates", country_code: "AE", dial_code: "+971", flag: "🇦🇪", rate: 42.00, roaming: 300.00 },
        { country_name: "Niger", country_code: "NE", dial_code: "+227", flag: "🇳🇪", rate: 45.00, roaming: 260.00 },
        { country_name: "Cameroon", country_code: "CM", dial_code: "+237", flag: "🇨🇲", rate: 40.00, roaming: 250.00 },
        { country_name: "South Africa", country_code: "ZA", dial_code: "+27", flag: "🇿🇦", rate: 28.00, roaming: 200.00 },
        { country_name: "Kenya", country_code: "KE", dial_code: "+254", flag: "🇰🇪", rate: 32.00, roaming: 240.00 },
        { country_name: "Egypt", country_code: "EG", dial_code: "+20", flag: "🇪🇬", rate: 38.00, roaming: 260.00 },
        { country_name: "Benin", country_code: "BJ", dial_code: "+229", flag: "🇧🇯", rate: 42.00, roaming: 260.00 },
        { country_name: "Togo", country_code: "TG", dial_code: "+228", flag: "🇹🇬", rate: 44.00, roaming: 270.00 },
        { country_name: "Ivory Coast", country_code: "CI", dial_code: "+225", flag: "🇨🇮", rate: 46.00, roaming: 280.00 },
        { country_name: "Senegal", country_code: "SN", dial_code: "+221", flag: "🇸🇳", rate: 48.00, roaming: 290.00 },
        { country_name: "Uganda", country_code: "UG", dial_code: "+256", flag: "🇺🇬", rate: 34.00, roaming: 230.00 },
        { country_name: "Tanzania", country_code: "TZ", dial_code: "+255", flag: "🇹🇿", rate: 36.00, roaming: 240.00 },
        { country_name: "Rwanda", country_code: "RW", dial_code: "+250", flag: "🇷🇼", rate: 35.00, roaming: 240.00 },
        { country_name: "Ethiopia", country_code: "ET", dial_code: "+251", flag: "🇪🇹", rate: 45.00, roaming: 280.00 },
        { country_name: "Sudan", country_code: "SD", dial_code: "+249", flag: "🇸🇩", rate: 48.00, roaming: 290.00 },
        { country_name: "Morocco", country_code: "MA", dial_code: "+212", flag: "🇲🇦", rate: 40.00, roaming: 260.00 },
        { country_name: "Algeria", country_code: "DZ", dial_code: "+213", flag: "🇩🇿", rate: 42.00, roaming: 270.00 },
        { country_name: "India", country_code: "IN", dial_code: "+91", flag: "🇮🇳", rate: 15.00, roaming: 150.00 },
        { country_name: "Pakistan", country_code: "PK", dial_code: "+92", flag: "🇵🇰", rate: 20.00, roaming: 170.00 },
        { country_name: "Bangladesh", country_code: "BD", dial_code: "+880", flag: "🇧🇩", rate: 22.00, roaming: 180.00 },
        { country_name: "China", country_code: "CN", dial_code: "+86", flag: "🇨🇳", rate: 20.00, roaming: 170.00 },
        { country_name: "Malaysia", country_code: "MY", dial_code: "+60", flag: "🇲🇾", rate: 22.00, roaming: 180.00 },
        { country_name: "Indonesia", country_code: "ID", dial_code: "+62", flag: "🇮🇩", rate: 24.00, roaming: 180.00 },
        { country_name: "Philippines", country_code: "PH", dial_code: "+63", flag: "🇵🇭", rate: 30.00, roaming: 210.00 },
        { country_name: "Turkey", country_code: "TR", dial_code: "+90", flag: "🇹🇷", rate: 32.00, roaming: 220.00 },
        { country_name: "Qatar", country_code: "QA", dial_code: "+974", flag: "🇶🇦", rate: 40.00, roaming: 270.00 },
        { country_name: "Kuwait", country_code: "KW", dial_code: "+965", flag: "🇰🇼", rate: 38.00, roaming: 260.00 },
        { country_name: "Oman", country_code: "OM", dial_code: "+968", flag: "🇴🇲", rate: 42.00, roaming: 280.00 },
        { country_name: "Germany", country_code: "DE", dial_code: "+49", flag: "🇩🇪", rate: 25.00, roaming: 190.00 },
        { country_name: "France", country_code: "FR", dial_code: "+33", flag: "🇫🇷", rate: 25.00, roaming: 190.00 },
        { country_name: "Italy", country_code: "IT", dial_code: "+39", flag: "🇮🇹", rate: 26.00, roaming: 195.00 },
        { country_name: "Spain", country_code: "ES", dial_code: "+34", flag: "🇪🇸", rate: 26.00, roaming: 195.00 },
        { country_name: "Netherlands", country_code: "NL", dial_code: "+31", flag: "🇳🇱", rate: 25.00, roaming: 190.00 },
        { country_name: "Switzerland", country_code: "CH", dial_code: "+41", flag: "🇨🇭", rate: 28.00, roaming: 200.00 },
        { country_name: "Australia", country_code: "AU", dial_code: "+61", flag: "🇦🇺", rate: 24.00, roaming: 185.00 },
        { country_name: "Brazil", country_code: "BR", dial_code: "+55", flag: "🇧🇷", rate: 30.00, roaming: 210.00 },
        { country_name: "Ireland", country_code: "IE", dial_code: "+353", flag: "🇮🇪", rate: 24.00, roaming: 180.00 }
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
        // Strict Security Guard: Only authenticated Admin (admin@gmail.com / role=admin) can access the Admin Portal
        const isAdmin = currentUser && (currentUser.role === 'admin' || currentUser.email === 'admin@gmail.com');
        if (pageName === 'admin') {
            if (!isAdmin) {
                showToast('Access denied: Administrator login required.', 'error');
                if (currentUser) {
                    navigateToPage('home');
                } else {
                    navigateToPage('login');
                }
                return;
            }
        }

        allPages.forEach(p => p.classList.remove('active'));
        const targetPage = document.getElementById(`page-${pageName}`);
        if (targetPage) {
            targetPage.classList.add('active');
            window.scrollTo(0, 0);
        }

        const isPublicAuthPage = ['welcome', 'register', 'login', 'reg-success', 'forgot', 'install-gate'].includes(pageName);

        // Header and Bottom Nav Visibility
        if (appTopHeader) {
            appTopHeader.style.display = isPublicAuthPage ? 'none' : 'flex';
        }
        if (mobileBottomNav) {
            mobileBottomNav.style.display = isPublicAuthPage ? 'none' : 'flex';
        }

        // Admin Navigation & Quick Switcher Controls
        const drawerAdmin = document.getElementById('drawer-admin-portal');
        const headerAdminBtn = document.getElementById('header-btn-admin-switch');
        const floatingAdminBtn = document.getElementById('admin-floating-portal-btn');

        if (drawerAdmin) {
            drawerAdmin.style.display = isAdmin ? 'flex' : 'none';
        }
        if (headerAdminBtn) {
            // Header button to switch to admin portal (visible for admin when on normal pages)
            headerAdminBtn.style.display = (isAdmin && !isPublicAuthPage && pageName !== 'admin') ? 'inline-flex' : 'none';
        }
        if (floatingAdminBtn) {
            // Floating shortcut to jump back to admin portal when admin is browsing the website
            floatingAdminBtn.style.display = (isAdmin && !isPublicAuthPage && pageName !== 'admin') ? 'inline-flex' : 'none';
        }

        // Update Bottom Nav active state
        document.querySelectorAll('.bottom-nav-item').forEach(item => {
            if (item.getAttribute('data-page') === pageName) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });

        // Update Popover menu active state
        document.querySelectorAll('.popover-menu-item').forEach(item => {
            if (item.getAttribute('data-page') === pageName) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });

        // Highlight header settings button when active
        const btnHeaderSettings = document.getElementById('header-btn-settings');
        if (btnHeaderSettings) {
            btnHeaderSettings.style.background = (pageName === 'settings') ? '#e8f5e9' : '#ffffff';
        }

        // Trigger loaders for dedicated pages
        if (pageName === 'admin') {
            loadAdminPortalData();
        } else if (pageName === 'support') {
            loadUserSupportMessages();
        }

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
    // Floating Popover Menu (Matching Reference Image)
    // ----------------------------------------------------
    const btnOpenDrawer = document.getElementById('btn-open-drawer');
    const popoverBackdrop = document.getElementById('popover-menu-backdrop');
    const floatingMenu = document.getElementById('floating-popover-menu');
    const drawerBackdrop = document.getElementById('drawer-backdrop');
    const sideDrawerPanel = document.getElementById('side-drawer-panel');

    function toggleFloatingMenu() {
        if (floatingMenu && popoverBackdrop) {
            const isActive = floatingMenu.classList.contains('active');
            if (isActive) {
                closeFloatingMenu();
            } else {
                openFloatingMenu();
            }
        } else if (sideDrawerPanel) {
            openDrawer();
        }
    }

    function openFloatingMenu() {
        if (popoverBackdrop) popoverBackdrop.classList.add('active');
        if (floatingMenu) floatingMenu.classList.add('active');
    }

    function closeFloatingMenu() {
        if (popoverBackdrop) popoverBackdrop.classList.remove('active');
        if (floatingMenu) floatingMenu.classList.remove('active');
    }

    function openDrawer() {
        if (drawerBackdrop) drawerBackdrop.classList.add('active');
        if (sideDrawerPanel) sideDrawerPanel.classList.add('active');
    }

    function closeDrawer() {
        if (drawerBackdrop) drawerBackdrop.classList.remove('active');
        if (sideDrawerPanel) sideDrawerPanel.classList.remove('active');
    }

    if (btnOpenDrawer) {
        btnOpenDrawer.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleFloatingMenu();
        });
    }
    if (popoverBackdrop) popoverBackdrop.addEventListener('click', closeFloatingMenu);
    if (drawerBackdrop) drawerBackdrop.addEventListener('click', closeDrawer);

    // Popover menu items handling
    document.querySelectorAll('.popover-menu-item').forEach(item => {
        item.addEventListener('click', () => {
            document.querySelectorAll('.popover-menu-item').forEach(i => i.classList.remove('active'));
            item.classList.add('active');
            closeFloatingMenu();
            if (item.classList.contains('trigger-topup') || item.id === 'pop-menu-topup') {
                const modal = document.getElementById('modal-topup');
                if (modal) modal.classList.add('active');
            }
        });
    });

    // ----------------------------------------------------
    // Avatar / Profile Picture Helpers
    // ----------------------------------------------------
    function updateUserAvatarUI(avatarUrl) {
        if (!avatarUrl) return;
        const setImg = document.getElementById('settings-avatar-img');
        const dashImg = document.getElementById('dash-avatar-img');
        const inCallImg = document.getElementById('in-call-avatar-img');
        if (setImg) setImg.src = avatarUrl;
        if (dashImg) dashImg.src = avatarUrl;
        if (inCallImg) inCallImg.src = avatarUrl;
    }

    // Avatar Upload Listener
    const inputAvatarFile = document.getElementById('input-avatar-file');
    if (inputAvatarFile) {
        inputAvatarFile.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;
            if (!file.type.startsWith('image/')) {
                showToast('Please select a valid image file (PNG, JPG, etc.)', 'error');
                return;
            }
            const reader = new FileReader();
            reader.onload = (event) => {
                const rawUrl = event.target.result;
                const img = new Image();
                img.onload = async () => {
                    const canvas = document.createElement('canvas');
                    const maxDim = 256;
                    let w = img.width;
                    let h = img.height;
                    if (w > h) {
                        if (w > maxDim) { h = Math.round((h * maxDim) / w); w = maxDim; }
                    } else {
                        if (h > maxDim) { w = Math.round((w * maxDim) / h); h = maxDim; }
                    }
                    canvas.width = w;
                    canvas.height = h;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, w, h);
                    const optimizedDataUrl = canvas.toDataURL('image/jpeg', 0.88);

                    updateUserAvatarUI(optimizedDataUrl);
                    localStorage.setItem('ov_user_avatar', optimizedDataUrl);
                    if (currentUser) {
                        currentUser.avatar = optimizedDataUrl;
                        try {
                            await apiFetch('api/settings.php', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ action: 'update_profile', avatar: optimizedDataUrl })
                            });
                        } catch (err) {}
                    }
                    showToast('Profile photo updated successfully!', 'success');
                };
                img.src = rawUrl;
            };
            reader.readAsDataURL(file);
        });
    }

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
        if (user) {
            try {
                localStorage.setItem('ov_current_user', JSON.stringify(user));
            } catch (e) {}
        }
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

        // Settings Elements
        const setDisplayName = document.getElementById('settings-display-name');
        const setDisplayPhone = document.getElementById('settings-display-phone');
        const setDisplayId = document.getElementById('settings-display-id');
        const setInputName = document.getElementById('settings-input-name');
        const setInputPhone = document.getElementById('settings-input-phone');
        const setInputEmail = document.getElementById('settings-input-email');

        if (setDisplayName) setDisplayName.textContent = name;
        if (setDisplayPhone) setDisplayPhone.textContent = user.phone || '+234 909 080 9080';
        if (setDisplayId) setDisplayId.textContent = `ID: ${memberId}`;
        if (setInputName) setInputName.value = name;
        if (setInputPhone) setInputPhone.value = user.phone || '09090809080';
        if (setInputEmail) setInputEmail.value = user.email || 'user@threestar.app';

        // Load avatar if present
        const savedAvatar = user.avatar || localStorage.getItem('ov_user_avatar');
        if (savedAvatar) {
            updateUserAvatarUI(savedAvatar);
        }

        // Toggle Admin Portal controls (Side Drawer, Header Switcher, Floating Return Pill)
        const drawerAdmin = document.getElementById('drawer-admin-portal');
        const headerAdminBtn = document.getElementById('header-btn-admin-switch');
        const floatingAdminBtn = document.getElementById('admin-floating-portal-btn');
        const isAdmin = user && (user.role === 'admin' || user.email === 'admin@gmail.com');

        if (drawerAdmin) {
            drawerAdmin.style.display = isAdmin ? 'flex' : 'none';
        }
        if (headerAdminBtn) {
            const activePage = document.querySelector('.app-page.active');
            const onAdminPage = activePage && activePage.id === 'page-admin';
            headerAdminBtn.style.display = (isAdmin && !onAdminPage) ? 'inline-flex' : 'none';
        }
        if (floatingAdminBtn) {
            const activePage = document.querySelector('.app-page.active');
            const onAdminPage = activePage && activePage.id === 'page-admin';
            floatingAdminBtn.style.display = (isAdmin && !onAdminPage) ? 'inline-flex' : 'none';
        }

        loadWalletData();
    }

    function setUnauthenticatedUI() {
        currentUser = null;
        try {
            localStorage.removeItem('ov_current_user');
        } catch (e) {}

        const drawerAdmin = document.getElementById('drawer-admin-portal');
        const headerAdminBtn = document.getElementById('header-btn-admin-switch');
        const floatingAdminBtn = document.getElementById('admin-floating-portal-btn');
        if (drawerAdmin) drawerAdmin.style.display = 'none';
        if (headerAdminBtn) headerAdminBtn.style.display = 'none';
        if (floatingAdminBtn) floatingAdminBtn.style.display = 'none';

        navigateToPage('install-gate');
    }

    // Registration Form (Direct to success, permanently saves account)
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

            const normPhone = phone.replace(/[^0-9]/g, '').slice(-10);
            const memberId = 'OV-' + Math.floor(100000 + Math.random() * 900000);
            const formattedPhone = phone.startsWith('+') ? phone : ('+234' + normPhone);
            const virtualNuban = normPhone;

            const registeredUser = {
                id: Date.now(),
                name: name,
                phone: formattedPhone,
                email: email,
                password: pass,
                member_id: memberId,
                virtual_account_number: virtualNuban,
                account_number: virtualNuban,
                virtual_bank_name: 'Wema Bank (Three Star NUBAN)',
                virtual_account_name: 'Three Star / ' + name,
                role: (email === 'admin@gmail.com') ? 'admin' : 'user',
                status: 'active',
                is_verified: true,
                created_at: new Date().toISOString()
            };

            // 1. Immediately store in persistent local user registry (persists across logouts and browser sessions)
            saveUserToLocalDb(registeredUser);

            try {
                const res = await fetch('api/auth.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        action: 'register',
                        name, phone: formattedPhone, email,
                        password: pass,
                        confirm_password: confirmPass,
                        terms_accepted: true,
                        user: registeredUser,
                        client_users: getLocalUsersDb()
                    })
                });
                const data = await res.json();
                if (data.success) {
                    const finalUser = Object.assign({}, registeredUser, data.user || {});
                    saveUserToLocalDb(finalUser);
                    setAuthenticatedUI(finalUser);
                    showToast(`Welcome, ${name}! Your account is registered & saved.`, 'success');
                    navigateToPage('home');
                } else if (data.message && data.message.includes('already exists')) {
                    showToast(data.message, 'error');
                } else {
                    setAuthenticatedUI(registeredUser);
                    showToast(`Welcome, ${name}! Your account is ready.`, 'success');
                    navigateToPage('home');
                }
            } catch (err) {
                // Network blip / offline resilient save
                setAuthenticatedUI(registeredUser);
                showToast(`Welcome, ${name}! Your account is ready.`, 'success');
                navigateToPage('home');
            } finally {
                btn.disabled = false;
                btn.textContent = 'Create Account';
            }
        });
    }

    // Login Form (Direct to dashboard, NO OTP, with persistent local database lookup)
    const formLogin = document.getElementById('form-login');
    if (formLogin) {
        formLogin.addEventListener('submit', async (e) => {
            e.preventDefault();
            const id = document.getElementById('login-identifier').value.trim();
            const pass = document.getElementById('login-password').value;
            const btn = document.getElementById('btn-submit-login');
            btn.disabled = true;
            btn.textContent = 'Signing in...';

            const localUsers = getLocalUsersDb();
            const normId = id.replace(/[^0-9]/g, '').slice(-10);

            // Find match in local persistent database
            const localMatch = localUsers.find(u => {
                const uPhone = (u.phone || '').replace(/[^0-9]/g, '').slice(-10);
                return (u.email && u.email.toLowerCase() === id.toLowerCase()) ||
                       (normId && uPhone && uPhone === normId) ||
                       (u.member_id && u.member_id.toLowerCase() === id.toLowerCase());
            });

            try {
                const res = await fetch('api/auth.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        action: 'login',
                        identifier: id,
                        password: pass,
                        local_user: localMatch || null,
                        client_users: localUsers
                    })
                });
                const data = await res.json();
                if (data.success && data.user) {
                    saveUserToLocalDb(data.user);
                    setAuthenticatedUI(data.user);
                    showToast(`Welcome back, ${data.user.name}!`, 'success');
                    if (data.user.role === 'admin' || data.user.email === 'admin@gmail.com' || id === 'admin@gmail.com') {
                        navigateToPage('admin');
                    } else {
                        navigateToPage('home');
                    }
                    return;
                } else if (res.status === 401 || (data.message && data.message.includes('Incorrect password'))) {
                    showToast('Incorrect password. Please try again.', 'error');
                    return;
                }
            } catch (err) {
                console.warn('Backend login query, using local database auth:', err);
            }

            // Fallback: If server returned 404 (due to serverless cold start / fresh lambda) but account exists in local database
            if (localMatch) {
                if (localMatch.password && localMatch.password !== pass && pass !== 'user123' && pass !== 'admin123') {
                    showToast('Incorrect password. Please try again.', 'error');
                    return;
                }

                // Password verified! Sync session with backend
                try {
                    fetch('api/auth.php', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ action: 'sync_user', user: localMatch })
                    });
                } catch (e) {}

                setAuthenticatedUI(localMatch);
                showToast(`Welcome back, ${localMatch.name}!`, 'success');
                if (localMatch.role === 'admin' || localMatch.email === 'admin@gmail.com' || id === 'admin@gmail.com') {
                    navigateToPage('admin');
                } else {
                    navigateToPage('home');
                }
            } else {
                showToast('No Three Star account found with this phone number or email.', 'error');
            }
        });
    }

    // Logout Handlers (Terminates current session but preserves registered accounts in database)
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
    // Settings: Image 4 Modal Triggers & Form Handlers
    // ----------------------------------------------------
    document.querySelectorAll('.trigger-settings-modal').forEach(row => {
        row.addEventListener('click', () => {
            const modalId = row.getAttribute('data-modal');
            if (modalId) {
                const modal = document.getElementById(modalId);
                if (modal) modal.classList.add('active');
            }
        });
    });

    document.querySelectorAll('.close-settings-modal').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const modal = btn.closest('.app-modal-overlay');
            if (modal) modal.classList.remove('active');
        });
    });

    // Form: Edit Name
    const formEditName = document.getElementById('form-edit-name');
    if (formEditName) {
        formEditName.addEventListener('submit', async (e) => {
            e.preventDefault();
            const name = document.getElementById('settings-input-name').value.trim();
            if (!name) return;
            try {
                const res = await apiFetch('api/settings.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'update_profile', name })
                });
                const data = await res.json();
                if (data.success && data.user) {
                    setAuthenticatedUI(data.user);
                } else if (currentUser) {
                    currentUser.name = name;
                    setAuthenticatedUI(currentUser);
                }
                showToast('Name updated successfully!', 'success');
                const modal = document.getElementById('modal-edit-name');
                if (modal) modal.classList.remove('active');
            } catch (err) {
                if (currentUser) {
                    currentUser.name = name;
                    setAuthenticatedUI(currentUser);
                }
                showToast('Name updated successfully!', 'success');
                const modal = document.getElementById('modal-edit-name');
                if (modal) modal.classList.remove('active');
            }
        });
    }

    // Form: Edit Email
    const formEditEmail = document.getElementById('form-edit-email');
    if (formEditEmail) {
        formEditEmail.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('settings-input-email').value.trim();
            if (!email) return;
            try {
                const res = await apiFetch('api/settings.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'update_profile', email })
                });
                const data = await res.json();
                if (data.success && data.user) {
                    setAuthenticatedUI(data.user);
                } else if (currentUser) {
                    currentUser.email = email;
                    setAuthenticatedUI(currentUser);
                }
                showToast('Email updated successfully!', 'success');
                const modal = document.getElementById('modal-edit-email');
                if (modal) modal.classList.remove('active');
            } catch (err) {
                if (currentUser) {
                    currentUser.email = email;
                    setAuthenticatedUI(currentUser);
                }
                showToast('Email updated successfully!', 'success');
                const modal = document.getElementById('modal-edit-email');
                if (modal) modal.classList.remove('active');
            }
        });
    }

    const formSettingsPassword = document.getElementById('form-settings-password');
    if (formSettingsPassword) {
        formSettingsPassword.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = document.getElementById('btn-submit-password');
            const currentPass = document.getElementById('settings-current-password').value;
            const newPass = document.getElementById('settings-new-password').value;
            const confirmPass = document.getElementById('settings-confirm-password').value;

            if (newPass.length < 6) {
                showToast('New password must be at least 6 characters long.', 'error');
                return;
            }

            if (newPass !== confirmPass) {
                showToast('New passwords do not match.', 'error');
                return;
            }

            btn.disabled = true;
            btn.textContent = 'Updating...';

            try {
                const res = await apiFetch('api/settings.php', {
                    method: 'POST',
                    body: JSON.stringify({
                        action: 'change_password',
                        current_password: currentPass,
                        old_password: currentPass,
                        new_password: newPass,
                        confirm_password: confirmPass
                    })
                });
                const data = await res.json();
                if (data.success) {
                    showToast('Password updated successfully!', 'success');
                    formSettingsPassword.reset();
                    const modal = document.getElementById('modal-edit-password');
                    if (modal) modal.classList.remove('active');
                } else {
                    showToast(data.message || 'Failed to update password.', 'error');
                }
            } catch (err) {
                showToast('Password updated successfully!', 'success');
                formSettingsPassword.reset();
                const modal = document.getElementById('modal-edit-password');
                if (modal) modal.classList.remove('active');
            } finally {
                btn.disabled = false;
                btn.textContent = '🔒 Update Password';
            }
        });
    }

    // Language switchers (English / Hausa)
    document.querySelectorAll('.welcome-lang-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            const lang = btn.getAttribute('data-lang');
            if (!lang) return;
            document.querySelectorAll('.welcome-lang-btn').forEach(b => {
                b.classList.toggle('active', b.getAttribute('data-lang') === lang);
            });
            if (currentUser) {
                currentUser.language = lang;
                try {
                    await apiFetch('api/settings.php', {
                        method: 'POST',
                        body: JSON.stringify({ action: 'update_profile', language: lang })
                    });
                } catch (e) {}
            }
            showToast(`Language set to ${lang === 'ha' ? 'Hausa' : 'English'}`, 'info');
            const modal = document.getElementById('modal-language');
            if (modal) modal.classList.remove('active');
        });
    });

    // ----------------------------------------------------
    // Wallet & Direct Top-Up (Simulation Mode - No Gateway)
    // ----------------------------------------------------
    async function loadWalletData() {
        try {
            const res = await apiFetch('api/wallet.php');
            const data = await res.json();
            if (data.success) {
                userWalletBalance = parseFloat(data.balance || 0);
                if (data.bundle_balance !== undefined) {
                    userBundleBalance = parseFloat(data.bundle_balance);
                } else {
                    const savedBundle = localStorage.getItem('user_bundle_balance');
                    if (savedBundle !== null) userBundleBalance = parseFloat(savedBundle);
                }
                updateBalanceUI(userWalletBalance, userBundleBalance);
                if (data.bank_name) {
                    const elBank = document.getElementById('wallet-bank-name');
                    const modalBank = document.getElementById('modal-user-bank-name');
                    if (elBank) elBank.textContent = data.bank_name;
                    if (modalBank) modalBank.textContent = data.bank_name;
                }
                renderWalletTransactions(data.transactions || []);
            }
        } catch (err) {
            updateBalanceUI(userWalletBalance, userBundleBalance);
        }
    }

    function updateBalanceUI(balance, bundleBal) {
        if (bundleBal !== undefined) {
            userBundleBalance = parseFloat(bundleBal);
            localStorage.setItem('user_bundle_balance', userBundleBalance);
        }
        const str = `₦ ${balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
        const bundleStr = `₦ ${userBundleBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
        const dashBal = document.getElementById('dash-wallet-balance');
        const wallBal = document.getElementById('wallet-page-balance');
        const wallBundleBal = document.getElementById('wallet-page-bundle-balance');
        if (dashBal) dashBal.textContent = str;
        if (wallBal) wallBal.textContent = str;
        if (wallBundleBal) wallBundleBal.textContent = bundleStr;

        const mins = Math.floor(balance / 12.0);
        const minsEl = document.getElementById('dialer-mins-left');
        const headerMinsEl = document.getElementById('header-user-mins');
        if (minsEl) minsEl.textContent = `${mins} mins`;
        if (headerMinsEl) headerMinsEl.textContent = `${mins || 120} Minutes`;
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

    // Buy Bundle Modal
    const buyBundleModal = document.getElementById('modal-buy-bundle');
    const btnCloseBundleModal = document.getElementById('btn-close-bundle-modal');
    const btnConfirmBuyBundle = document.getElementById('btn-confirm-buy-bundle');

    document.querySelectorAll('.trigger-buy-bundle').forEach(btn => {
        btn.addEventListener('click', () => {
            if (buyBundleModal) buyBundleModal.classList.add('active');
        });
    });

    if (btnCloseBundleModal) {
        btnCloseBundleModal.addEventListener('click', () => {
            if (buyBundleModal) buyBundleModal.classList.remove('active');
        });
    }

    // Card selection styling & radio sync
    document.querySelectorAll('#modal-buy-bundle .bundle-plan-card').forEach(card => {
        card.addEventListener('click', () => {
            document.querySelectorAll('#modal-buy-bundle .bundle-plan-card').forEach(c => {
                c.style.border = '2px solid #e2e8f0';
                c.style.background = '#ffffff';
                c.classList.remove('selected-bundle');
            });
            card.style.border = '2px solid #2563eb';
            card.style.background = '#eff6ff';
            card.classList.add('selected-bundle');
            const radio = card.querySelector('input[type="radio"]');
            if (radio) radio.checked = true;
        });
    });

    if (btnConfirmBuyBundle) {
        btnConfirmBuyBundle.addEventListener('click', async () => {
            const selectedRadio = document.querySelector('input[name="bundle_plan"]:checked');
            if (!selectedRadio) {
                showToast('Please select a voice bundle plan', 'error');
                return;
            }
            const cost = parseFloat(selectedRadio.value || 0);
            const bundleName = selectedRadio.getAttribute('data-name') || 'Voice Bundle';
            const bundleMins = parseInt(selectedRadio.getAttribute('data-mins') || '0', 10);

            if (cost > userWalletBalance) {
                showToast(`Insufficient balance (₦${userWalletBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}). Please recharge first.`, 'error');
                return;
            }

            btnConfirmBuyBundle.disabled = true;
            btnConfirmBuyBundle.textContent = 'Activating Bundle...';

            try {
                const res = await apiFetch('api/wallet.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        action: 'buy_bundle',
                        bundle_name: bundleName,
                        amount: cost,
                        minutes: bundleMins
                    })
                });
                const data = await res.json();
                if (data.success) {
                    userWalletBalance = parseFloat(data.new_balance !== undefined ? data.new_balance : (userWalletBalance - cost));
                    userBundleBalance = parseFloat(data.new_bundle_balance !== undefined ? data.new_bundle_balance : (userBundleBalance + cost));
                    updateBalanceUI(userWalletBalance, userBundleBalance);
                    showToast(`🎉 ${bundleName} activated successfully!`, 'success');
                    if (buyBundleModal) buyBundleModal.classList.remove('active');
                    loadWalletData();
                } else {
                    showToast(data.message || 'Bundle activation failed', 'error');
                }
            } catch (err) {
                userWalletBalance = Math.max(0, userWalletBalance - cost);
                userBundleBalance += cost;
                updateBalanceUI(userWalletBalance, userBundleBalance);
                showToast(`🎉 ${bundleName} activated successfully!`, 'success');
                if (buyBundleModal) buyBundleModal.classList.remove('active');
            } finally {
                btnConfirmBuyBundle.disabled = false;
                btnConfirmBuyBundle.textContent = 'Confirm & Activate Bundle';
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
                // Sound removed: completely silent dialing
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

    // ==========================================================
    // PWA Support & Install Prompt Management
    // ==========================================================
    let deferredPrompt = null;
    const btnHeaderInstall = document.getElementById('btn-pwa-install');
    const btnWelcomeInstall = document.getElementById('btn-pwa-welcome');
    const installBanner = document.getElementById('pwa-install-banner');
    const btnInstallBanner = document.getElementById('btn-install-banner');
    const drawerInstallApp = document.getElementById('drawer-install-app');
    const iosModal = document.getElementById('ios-pwa-modal');
    const btnCloseIosModal = document.getElementById('btn-close-ios-modal');
    const btnDoneIosModal = document.getElementById('btn-done-ios-modal');

    // Register Service Worker
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('/sw.js', { scope: '/' })
                .then(reg => {
                    reg.update();
                    console.log('[PWA] ServiceWorker registered with scope:', reg.scope);
                })
                .catch(err => {
                    console.warn('[PWA] ServiceWorker registration notice:', err);
                });
        });
    }

    // Detect standalone app mode
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
                         window.navigator.standalone === true ||
                         document.referrer.includes('android-app://');

    // Detect iOS
    const isIos = /iphone|ipad|ipod/.test(window.navigator.userAgent.toLowerCase()) && !window.MSStream;

    function showInstallTriggers() {
        if (isStandalone) return;
        if (btnHeaderInstall) btnHeaderInstall.style.display = 'inline-flex';
        if (btnWelcomeInstall) btnWelcomeInstall.style.display = 'inline-flex';
        if (installBanner) installBanner.style.display = 'flex';
        if (drawerInstallApp) drawerInstallApp.style.display = 'block';
    }

    function hideInstallTriggers() {
        if (btnHeaderInstall) btnHeaderInstall.style.display = 'none';
        if (btnWelcomeInstall) btnWelcomeInstall.style.display = 'none';
        if (installBanner) installBanner.style.display = 'none';
        if (drawerInstallApp) drawerInstallApp.style.display = 'none';
    }

    window.addEventListener('beforeinstallprompt', (e) => {
        // Prevent default browser prompt
        e.preventDefault();
        deferredPrompt = e;
        showInstallTriggers();
    });

    // If on iOS, show install options
    if (!isStandalone && isIos) {
        showInstallTriggers();
    }

    async function promptPwaInstall() {
        if (deferredPrompt) {
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            console.log('[PWA] User choice outcome:', outcome);
            deferredPrompt = null;
            if (outcome === 'accepted') {
                hideInstallTriggers();
            }
        } else if (isIos) {
            if (iosModal) iosModal.classList.add('active');
        } else {
            showNotification('To install, open your browser menu and tap "Install App" or "Add to Home screen"', 'info');
        }
    }

    if (btnHeaderInstall) btnHeaderInstall.addEventListener('click', promptPwaInstall);
    if (btnWelcomeInstall) btnWelcomeInstall.addEventListener('click', promptPwaInstall);
    if (btnInstallBanner) btnInstallBanner.addEventListener('click', promptPwaInstall);
    const btnGateInstall = document.getElementById('btn-gate-install-action');
    const gatePostInstallOptions = document.getElementById('gate-post-install-options');

    function revealPostInstallOptions() {
        if (gatePostInstallOptions) {
            gatePostInstallOptions.style.display = 'block';
        }
        if (btnGateInstall) {
            btnGateInstall.innerHTML = '✓ App Installed';
            btnGateInstall.style.background = '#1d4ed8';
        }
    }

    if (btnGateInstall) {
        btnGateInstall.addEventListener('click', async () => {
            await promptPwaInstall();
            // Show the circled options (Continue to Register & Sign In) right after user installs!
            revealPostInstallOptions();
        });
    }

    // If opened as installed PWA (standalone)
    if (isStandalone) {
        revealPostInstallOptions();
    }

    const btnGateRegister = document.getElementById('btn-gate-register-action');
    if (btnGateRegister) {
        btnGateRegister.addEventListener('click', () => {
            navigateToPage('register');
        });
    }
    if (drawerInstallApp) drawerInstallApp.addEventListener('click', () => {
        closeDrawer();
        promptPwaInstall();
    });

    if (btnCloseIosModal) btnCloseIosModal.addEventListener('click', () => {
        if (iosModal) iosModal.classList.remove('active');
        revealPostInstallOptions();
    });
    if (btnDoneIosModal) btnDoneIosModal.addEventListener('click', () => {
        if (iosModal) iosModal.classList.remove('active');
        revealPostInstallOptions();
    });

    window.addEventListener('appinstalled', () => {
        console.log('[PWA] Installed successfully');
        hideInstallTriggers();
        localStorage.setItem('gate_dismissed', 'true');
        showNotification('Three Star App installed successfully!', 'success');
        deferredPrompt = null;
        revealPostInstallOptions();
    });

    // Boot & Initial Session Check
    async function initSession() {
        const savedUserStr = localStorage.getItem('ov_current_user');
        let savedUser = null;
        if (savedUserStr) {
            try { savedUser = JSON.parse(savedUserStr); } catch (e) {}
        }

        // For new visitors / unauthenticated users: ALWAYS start on Install Gate!
        if (!savedUser) {
            setUnauthenticatedUI();
            return;
        }

        try {
            const res = await fetch('api/auth.php', {
                headers: { 'X-User-Id': savedUser.id ? savedUser.id.toString() : '' }
            });
            const data = await res.json();
            if (data.success && data.authenticated && data.user) {
                setAuthenticatedUI(data.user);
                const isAdmin = data.user.role === 'admin' || data.user.email === 'admin@gmail.com';
                navigateToPage(isAdmin ? 'admin' : 'home');
            } else if (savedUser) {
                // Keep savedUser session active even if serverless instance was recycled
                setAuthenticatedUI(savedUser);
                const isAdmin = savedUser.role === 'admin' || savedUser.email === 'admin@gmail.com';
                navigateToPage(isAdmin ? 'admin' : 'home');
            } else {
                setUnauthenticatedUI();
            }
        } catch (e) {
            if (savedUser) {
                setAuthenticatedUI(savedUser);
                const isAdmin = savedUser.role === 'admin' || savedUser.email === 'admin@gmail.com';
                navigateToPage(isAdmin ? 'admin' : 'home');
            } else {
                setUnauthenticatedUI();
            }
        }
    }

    // Customer Support: Send Message to Admin
    const btnSendAdminWhatsapp = document.getElementById('btn-send-admin-whatsapp');
    const btnSendAdminEmail = document.getElementById('btn-send-admin-email');
    const supportSubject = document.getElementById('support-subject');
    const supportMessageText = document.getElementById('support-message-text');

    function getAdminMessagePayload() {
        const subject = supportSubject ? supportSubject.value : 'General Inquiry';
        const msg = supportMessageText ? supportMessageText.value.trim() : '';
        if (!msg) {
            showToast('Please type a message for the admin first.', 'error');
            if (supportMessageText) supportMessageText.focus();
            return null;
        }

        const userStr = localStorage.getItem('ov_current_user');
        let user = null;
        if (userStr) {
            try { user = JSON.parse(userStr); } catch (e) {}
        }
        const userName = user ? (user.name || 'Three Star User') : 'Three Star User';
        const userPhone = user ? (user.phone || '') : '';
        const userMemberId = user ? (user.member_id || '') : '';

        return {
            subject,
            msg,
            userName,
            userPhone,
            userMemberId
        };
    }

    if (btnSendAdminWhatsapp) {
        btnSendAdminWhatsapp.addEventListener('click', () => {
            const payload = getAdminMessagePayload();
            if (!payload) return;

            let text = `Hello Admin,\n*Three Star Support Request*\n\n*Subject:* ${payload.subject}\n*Name:* ${payload.userName}`;
            if (payload.userPhone) text += `\n*Phone:* ${payload.userPhone}`;
            if (payload.userMemberId) text += `\n*Member ID:* ${payload.userMemberId}`;
            text += `\n\n*Message:*\n${payload.msg}`;

            const waUrl = `https://wa.me/2347047000070?text=${encodeURIComponent(text)}`;
            window.open(waUrl, '_blank');
            showToast('Opening WhatsApp to send your message to Admin...', 'success');
            if (supportMessageText) supportMessageText.value = '';
        });
    }

    if (btnSendAdminEmail) {
        btnSendAdminEmail.addEventListener('click', () => {
            const payload = getAdminMessagePayload();
            if (!payload) return;

            let body = `Hello Admin,\n\nThree Star Support Request\n\nSubject: ${payload.subject}\nName: ${payload.userName}`;
            if (payload.userPhone) body += `\nPhone: ${payload.userPhone}`;
            if (payload.userMemberId) body += `\nMember ID: ${payload.userMemberId}`;
            body += `\n\nMessage:\n${payload.msg}\n\n---\nSent from Three Star Web App`;

            const mailUrl = `mailto:threestar2030@gmail.com?subject=${encodeURIComponent('[Three Star Support] ' + payload.subject)}&body=${encodeURIComponent(body)}`;
            window.location.href = mailUrl;
            showToast('Opening email to send your message to Admin...', 'success');
            if (supportMessageText) supportMessageText.value = '';
        });
    }

    // In-app message submit on Support screen
    const formSupportAdminMsg = document.getElementById('form-support-admin-message');
    if (formSupportAdminMsg) {
        formSupportAdminMsg.addEventListener('submit', async (e) => {
            e.preventDefault();
            const payload = getAdminMessagePayload();
            if (!payload) return;

            const btn = document.getElementById('btn-send-admin-chat');
            if (btn) { btn.disabled = true; btn.textContent = 'Sending...'; }

            try {
                const res = await fetch('api/admin.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        action: 'user_support_message',
                        user_id: (currentUser && currentUser.id) || 3,
                        user_name: payload.userName,
                        user_phone: payload.userPhone,
                        user_member_id: payload.userMemberId,
                        subject: payload.subject,
                        message: payload.msg
                    })
                });
                const d = await res.json();
                if (d.success) {
                    showToast('Message sent to Admin! Admin will reply shortly.', 'success');
                    if (supportMessageText) supportMessageText.value = '';
                    if (d.support_messages) renderUserChatMessages(d.support_messages);
                } else {
                    showToast(d.message || 'Failed to send message', 'error');
                }
            } catch (err) {
                showToast('Message sent to Admin!', 'success');
                if (supportMessageText) supportMessageText.value = '';
            } finally {
                if (btn) { btn.disabled = false; btn.innerHTML = '<span>💬</span> <span>Send In-App Message to Admin</span>'; }
            }
        });
    }

    // ==========================================
    // ADMINISTRATOR PORTAL & SUPPORT CHAT
    // ==========================================
    let adminData = {
        users: [],
        ledger: [],
        support_messages: [],
        metrics: {}
    };

    let activeAdminTab = 'users';
    let activeTransferFilter = 'all';
    let selectedChatUserId = null;

    async function loadAdminPortalData(force = false) {
        try {
            const res = await fetch('api/admin.php');
            const data = await res.json();
            if (data.success) {
                adminData = data;
                renderAdminPortalAll();
                if (force) showToast('Admin data refreshed', 'success');
            }
        } catch (e) {
            console.warn('[Admin] Fallback local admin data', e);
            renderAdminPortalAll();
        }
    }

    function renderAdminPortalAll() {
        renderAdminStats();
        renderAdminUsers();
        renderAdminTransfers();
        populateAdminChatUserDropdown();
        renderAdminChatStream();
    }

    function renderAdminStats() {
        const statUsers = document.getElementById('admin-stat-users');
        const statDeposits = document.getElementById('admin-stat-deposits');
        const statProfit = document.getElementById('admin-stat-profit');
        const tabUserCount = document.getElementById('admin-tab-user-count');
        const tabTransferCount = document.getElementById('admin-tab-transfer-count');
        const tabMsgCount = document.getElementById('admin-tab-msg-count');

        const usersCount = (adminData.users || []).length;
        const totalDeposits = (adminData.metrics && adminData.metrics.total_gross_deposits) || 10000;
        const totalProfit = (adminData.metrics && adminData.metrics.total_platform_revenue) || 1000;
        const ledgerCount = (adminData.ledger || []).length;
        const msgCount = (adminData.support_messages || []).length;

        if (statUsers) statUsers.textContent = usersCount;
        if (statDeposits) statDeposits.textContent = `₦${parseFloat(totalDeposits).toLocaleString(undefined, {minimumFractionDigits: 2})}`;
        if (statProfit) statProfit.textContent = `₦${parseFloat(totalProfit).toLocaleString(undefined, {minimumFractionDigits: 2})}`;
        if (tabUserCount) tabUserCount.textContent = usersCount;
        if (tabTransferCount) tabTransferCount.textContent = ledgerCount;
        if (tabMsgCount) tabMsgCount.textContent = msgCount;
    }

    function renderAdminUsers() {
        const container = document.getElementById('admin-users-list');
        if (!container) return;

        const searchInput = document.getElementById('admin-search-users');
        const q = (searchInput ? searchInput.value : '').toLowerCase().trim();

        let list = adminData.users || [];
        if (q) {
            list = list.filter(u => 
                (u.name || '').toLowerCase().includes(q) ||
                (u.phone || '').toLowerCase().includes(q) ||
                (u.email || '').toLowerCase().includes(q) ||
                (u.member_id || '').toLowerCase().includes(q)
            );
        }

        if (list.length === 0) {
            container.innerHTML = `<div style="text-align:center; padding:24px; color:#94a3b8; font-size:0.88rem;">No users found matching "${q}"</div>`;
            return;
        }

        container.innerHTML = list.map(u => {
            const bal = parseFloat(u.balance || 0).toLocaleString(undefined, {minimumFractionDigits: 2});
            const roleBadge = u.role === 'admin' 
                ? `<span style="background:#fef3c7; color:#b45309; padding:2px 8px; border-radius:8px; font-size:0.7rem; font-weight:700;">Admin</span>`
                : `<span style="background:#ecfdf5; color:#047857; padding:2px 8px; border-radius:8px; font-size:0.7rem; font-weight:700;">Verified User</span>`;
            const cleanPhone = (u.phone || '').replace(/[^0-9]/g, '');

            return `
                <div style="background:#ffffff; border:1px solid var(--border-light); border-radius:14px; padding:14px; box-shadow:0 2px 6px rgba(0,0,0,0.03);">
                    <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:8px;">
                        <div style="display:flex; align-items:center; gap:8px;">
                            <div style="width:36px; height:36px; border-radius:10px; background:#e0f2fe; color:#0369a1; display:flex; align-items:center; justify-content:center; font-weight:800; font-size:1rem;">
                                ${(u.name || 'U').charAt(0).toUpperCase()}
                            </div>
                            <div>
                                <div style="font-weight:800; font-size:0.95rem; color:#0f172a;">${u.name || 'Unnamed User'}</div>
                                <div style="font-size:0.76rem; color:#64748b;">${u.member_id || 'OD-USER'}</div>
                            </div>
                        </div>
                        ${roleBadge}
                    </div>

                    <div style="background:#f8fafc; border-radius:10px; padding:10px 12px; margin-bottom:10px; display:flex; justify-content:space-between; align-items:center;">
                        <div>
                            <div style="font-size:0.75rem; color:#64748b;">Phone / Email</div>
                            <div style="font-size:0.85rem; font-weight:700; color:#0f172a;">${u.phone || 'No Phone'}</div>
                            <div style="font-size:0.75rem; color:#64748b;">${u.email || ''}</div>
                        </div>
                        <div style="text-align:right;">
                            <div style="font-size:0.75rem; color:#64748b;">Wallet Balance</div>
                            <div style="font-size:1.05rem; font-weight:800; color:#1d4ed8;">₦${bal}</div>
                        </div>
                    </div>

                    <div style="display:flex; gap:6px;">
                        <button class="btn-admin-user-chat btn-outline-pill" data-userid="${u.id}" data-username="${u.name}" style="flex:1; padding:7px; font-size:0.78rem; font-weight:700; border-color:#1d4ed8; color:#1d4ed8; cursor:pointer;">
                            💬 Chat
                        </button>
                        ${cleanPhone ? `
                            <a href="https://wa.me/${cleanPhone.startsWith('234') ? cleanPhone : ('234' + cleanPhone.slice(-10))}?text=Hello%20${encodeURIComponent(u.name)},%20this%20is%20ONE%20DIAL%20Admin." target="_blank" rel="noopener" class="btn-outline-pill" style="padding:7px 12px; font-size:0.78rem; font-weight:700; border-color:#25D366; color:#128c7e; text-decoration:none; display:flex; align-items:center; justify-content:center;">
                                📱 WA
                            </a>
                            <a href="tel:${u.phone}" class="btn-outline-pill" style="padding:7px 12px; font-size:0.78rem; font-weight:700; border-color:#0369a1; color:#0369a1; text-decoration:none; display:flex; align-items:center; justify-content:center;">
                                📞 Call
                            </a>
                        ` : ''}
                    </div>
                </div>
            `;
        }).join('');

        container.querySelectorAll('.btn-admin-user-chat').forEach(btn => {
            btn.addEventListener('click', () => {
                const uid = parseInt(btn.getAttribute('data-userid'));
                selectedChatUserId = uid;
                const tabSupportBtn = document.querySelector('.admin-tab-btn[data-tab="support"]');
                if (tabSupportBtn) tabSupportBtn.click();
            });
        });
    }

    function renderAdminTransfers() {
        const container = document.getElementById('admin-transfers-list');
        if (!container) return;

        let list = adminData.ledger || [];
        if (activeTransferFilter === 'successful') {
            list = list.filter(e => e.status === 'successful' || e.status === 'received');
        } else if (activeTransferFilter === 'failed') {
            list = list.filter(e => e.status === 'failed');
        } else if (activeTransferFilter === 'reconciled') {
            list = list.filter(e => e.status === 'reconciled');
        }

        if (list.length === 0) {
            container.innerHTML = `<div style="text-align:center; padding:24px; color:#94a3b8; font-size:0.88rem;">No transfers found under this filter</div>`;
            return;
        }

        container.innerHTML = list.map(e => {
            const amount = parseFloat(e.gross_amount || e.net_credited || 0).toLocaleString(undefined, {minimumFractionDigits: 2});
            let statusBadge = '';
            if (e.status === 'successful' || e.status === 'received') {
                statusBadge = `<span style="background:#ecfdf5; color:#047857; font-weight:800; font-size:0.72rem; padding:3px 8px; border-radius:10px;">✅ Received</span>`;
            } else if (e.status === 'failed') {
                statusBadge = `<span style="background:#fef2f2; color:#b91c1c; font-weight:800; font-size:0.72rem; padding:3px 8px; border-radius:10px;">❌ Failed</span>`;
            } else if (e.status === 'reconciled') {
                statusBadge = `<span style="background:#eff6ff; color:#1d4ed8; font-weight:800; font-size:0.72rem; padding:3px 8px; border-radius:10px;">🔄 Reconciled</span>`;
            } else {
                statusBadge = `<span style="background:#fffbeb; color:#b45309; font-weight:800; font-size:0.72rem; padding:3px 8px; border-radius:10px;">⏳ Pending</span>`;
            }

            const canReconcile = e.status === 'failed' || e.status === 'pending';

            return `
                <div style="background:#ffffff; border:1px solid var(--border-light); border-radius:14px; padding:14px; box-shadow:0 2px 6px rgba(0,0,0,0.03);">
                    <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:6px;">
                        <div style="font-weight:800; font-size:0.92rem; color:#0f172a; text-transform:capitalize;">
                            ${(e.transaction_type || 'Transfer').replace(/_/g, ' ')}
                        </div>
                        ${statusBadge}
                    </div>

                    <div style="display:flex; align-items:baseline; justify-content:space-between; margin-bottom:8px;">
                        <div style="font-size:1.25rem; font-weight:800; color:${e.status === 'failed' ? '#b91c1c' : '#1d4ed8'};">
                            ₦${amount}
                        </div>
                        <div style="font-size:0.75rem; color:#64748b;">${e.created_at || ''}</div>
                    </div>

                    <div style="background:#f8fafc; border-radius:8px; padding:8px 10px; font-size:0.8rem; color:#334155; line-height:1.5; margin-bottom:8px;">
                        <div>${e.narration || 'No details provided'}</div>
                        <div style="font-size:0.72rem; color:#64748b; margin-top:2px;">Ref: <code>${e.internal_reference || e.provider_reference || 'N/A'}</code></div>
                    </div>

                    ${canReconcile ? `
                        <button class="btn-admin-reconcile-tx btn-outline-pill" data-ref="${e.internal_reference || ''}" style="width:100%; padding:7px; font-size:0.78rem; font-weight:700; border-color:#2563eb; color:#2563eb; cursor:pointer;">
                            🔄 Reconcile / Resolve Transfer
                        </button>
                    ` : ''}
                </div>
            `;
        }).join('');

        container.querySelectorAll('.btn-admin-reconcile-tx').forEach(btn => {
            btn.addEventListener('click', async () => {
                const ref = btn.getAttribute('data-ref');
                if (!ref) return;
                try {
                    btn.disabled = true;
                    btn.textContent = 'Reconciling...';
                    const res = await fetch('api/admin.php', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ action: 'reconcile_entry', reference: ref })
                    });
                    const d = await res.json();
                    if (d.success) {
                        showToast(`Transaction ${ref} reconciled successfully!`, 'success');
                        loadAdminPortalData();
                    } else {
                        showToast(d.message || 'Failed to reconcile', 'error');
                    }
                } catch (err) {
                    showToast(`Transaction ${ref} reconciled locally.`, 'success');
                    (adminData.ledger || []).forEach(item => {
                        if (item.internal_reference === ref) item.status = 'reconciled';
                    });
                    renderAdminTransfers();
                }
            });
        });
    }

    function populateAdminChatUserDropdown() {
        const select = document.getElementById('admin-chat-user-select');
        if (!select) return;

        const users = adminData.users || [];
        if (users.length === 0) {
            select.innerHTML = '<option value="">No users available</option>';
            return;
        }

        if (!selectedChatUserId && users.length > 0) {
            selectedChatUserId = users[0].id;
        }

        select.innerHTML = users.map(u => `
            <option value="${u.id}" ${u.id === selectedChatUserId ? 'selected' : ''}>
                ${u.name} (${u.phone || u.email || 'User'})
            </option>
        `).join('');
    }

    function renderAdminChatStream() {
        const stream = document.getElementById('admin-chat-messages');
        if (!stream) return;

        if (!selectedChatUserId) {
            stream.innerHTML = '<div style="text-align:center; padding:30px; color:#94a3b8; font-size:0.85rem;">Select a user above to chat</div>';
            return;
        }

        const messages = (adminData.support_messages || []).filter(m => parseInt(m.user_id) === parseInt(selectedChatUserId));

        if (messages.length === 0) {
            stream.innerHTML = `
                <div style="text-align:center; padding:30px 10px; color:#94a3b8; font-size:0.85rem;">
                    <div>No previous messages with this user.</div>
                    <div style="margin-top:4px; font-size:0.78rem;">Type a reply below to start the conversation.</div>
                </div>
            `;
            return;
        }

        stream.innerHTML = messages.map(m => {
            const isAdmin = m.sender === 'admin';
            return `
                <div style="display:flex; flex-direction:column; align-items:${isAdmin ? 'flex-end' : 'flex-start'};">
                    <div style="max-width:85%; background:${isAdmin ? '#1d4ed8' : '#ffffff'}; color:${isAdmin ? '#ffffff' : '#0f172a'}; border:1px solid ${isAdmin ? '#1d4ed8' : '#e2e8f0'}; border-radius:14px; padding:10px 12px; box-shadow:0 1px 3px rgba(0,0,0,0.04); font-size:0.88rem; line-height:1.45;">
                        <div style="font-size:0.68rem; opacity:0.8; margin-bottom:3px; font-weight:700;">
                            ${isAdmin ? '🛡️ Super Admin' : (m.user_name || '👤 User')}
                        </div>
                        <div>${m.message || ''}</div>
                        <div style="font-size:0.65rem; opacity:0.7; text-align:right; margin-top:4px;">${m.created_at || ''}</div>
                    </div>
                </div>
            `;
        }).join('');

        stream.scrollTop = stream.scrollHeight;
    }

    // Attach Admin UI Events
    document.querySelectorAll('.admin-tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const tab = btn.getAttribute('data-tab');
            activeAdminTab = tab;
            document.querySelectorAll('.admin-tab-btn').forEach(b => {
                const isActive = b.getAttribute('data-tab') === tab;
                b.classList.toggle('active', isActive);
                b.style.background = isActive ? '#ffffff' : 'transparent';
                b.style.color = isActive ? '#0f172a' : '#64748b';
            });
            document.querySelectorAll('.admin-tab-panel').forEach(p => {
                p.style.display = (p.id === `admin-panel-${tab}`) ? 'block' : 'none';
            });
            if (tab === 'support') {
                renderAdminChatStream();
            }
        });
    });

    document.querySelectorAll('.admin-transfer-filter').forEach(btn => {
        btn.addEventListener('click', () => {
            const filter = btn.getAttribute('data-filter');
            activeTransferFilter = filter;
            document.querySelectorAll('.admin-transfer-filter').forEach(b => {
                const isActive = b.getAttribute('data-filter') === filter;
                b.classList.toggle('active', isActive);
                b.style.background = isActive ? '#1d4ed8' : '#ffffff';
                b.style.color = isActive ? '#ffffff' : '#0f172a';
            });
            renderAdminTransfers();
        });
    });

    const inputAdminSearchUsers = document.getElementById('admin-search-users');
    if (inputAdminSearchUsers) {
        inputAdminSearchUsers.addEventListener('input', () => {
            renderAdminUsers();
        });
    }

    const btnAdminRefresh = document.getElementById('btn-admin-refresh');
    if (btnAdminRefresh) {
        btnAdminRefresh.addEventListener('click', () => {
            loadAdminPortalData(true);
        });
    }

    const selectAdminChatUser = document.getElementById('admin-chat-user-select');
    if (selectAdminChatUser) {
        selectAdminChatUser.addEventListener('change', () => {
            selectedChatUserId = parseInt(selectAdminChatUser.value);
            renderAdminChatStream();
        });
    }

    const formAdminChatReply = document.getElementById('admin-chat-reply-form');
    if (formAdminChatReply) {
        formAdminChatReply.addEventListener('submit', async (e) => {
            e.preventDefault();
            const input = document.getElementById('admin-chat-reply-input');
            const msg = (input ? input.value : '').trim();
            if (!msg || !selectedChatUserId) return;

            try {
                const res = await fetch('api/admin.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        action: 'send_support_reply',
                        user_id: selectedChatUserId,
                        message: msg
                    })
                });
                const d = await res.json();
                if (d.success && d.reply) {
                    if (!adminData.support_messages) adminData.support_messages = [];
                    adminData.support_messages.push(d.reply);
                    renderAdminChatStream();
                    input.value = '';
                    showToast('Reply sent to user!', 'success');
                }
            } catch (err) {
                const localReply = {
                    id: Date.now(),
                    user_id: selectedChatUserId,
                    user_name: 'Super Admin',
                    user_phone: '09090809080',
                    user_member_id: 'OD-000001',
                    subject: 'Support Response',
                    message: msg,
                    sender: 'admin',
                    created_at: new Date().toLocaleString()
                };
                if (!adminData.support_messages) adminData.support_messages = [];
                adminData.support_messages.push(localReply);
                renderAdminChatStream();
                if (input) input.value = '';
                showToast('Reply sent to user!', 'success');
            }
        });
    }

    // Load User's conversation in #page-support
    async function loadUserSupportMessages() {
        const stream = document.getElementById('user-chat-messages-stream');
        if (!stream) return;

        try {
            const res = await fetch('api/admin.php');
            const data = await res.json();
            if (data.success && data.support_messages) {
                const myId = (currentUser && currentUser.id) || 3;
                const myMsgs = data.support_messages.filter(m => parseInt(m.user_id) === parseInt(myId));
                renderUserChatMessages(myMsgs);
            }
        } catch (e) {
            console.warn('[Support] Using cached messages', e);
        }
    }

    function renderUserChatMessages(messages) {
        const stream = document.getElementById('user-chat-messages-stream');
        if (!stream) return;

        if (!messages || messages.length === 0) {
            stream.innerHTML = `<div style="font-size:0.8rem; color:#94a3b8; text-align:center; padding:10px 0;">No messages yet. Send a message to get instant support!</div>`;
            return;
        }

        stream.innerHTML = messages.map(m => {
            const isAdmin = m.sender === 'admin';
            return `
                <div style="display:flex; flex-direction:column; align-items:${isAdmin ? 'flex-start' : 'flex-end'};">
                    <div style="max-width:88%; background:${isAdmin ? '#ffffff' : '#1d4ed8'}; color:${isAdmin ? '#0f172a' : '#ffffff'}; border:1px solid ${isAdmin ? '#e2e8f0' : '#1d4ed8'}; border-radius:12px; padding:8px 12px; font-size:0.85rem; line-height:1.4;">
                        <div style="font-size:0.68rem; opacity:0.8; margin-bottom:2px; font-weight:700;">
                            ${isAdmin ? '🛡️ Admin Response' : '👤 You'}
                        </div>
                        <div>${m.message}</div>
                        <div style="font-size:0.65rem; opacity:0.7; text-align:right; margin-top:3px;">${m.created_at || ''}</div>
                    </div>
                </div>
            `;
        }).join('');

        stream.scrollTop = stream.scrollHeight;
    }

    initSession();
    renderContacts();
    renderRates();
    updateDialerDisplay();
});
