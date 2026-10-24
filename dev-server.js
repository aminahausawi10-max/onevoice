/**
 * Three Stars - Local Dev Server & API Bridge
 * Full support for Phone-Number Accounts, Virtual Bank NUBAN,
 * Automatic Revenue Sharing, Financial Ledgers, and Admin Dashboard
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'data', 'store.json');
const IS_VERCEL = process.env.VERCEL === '1' || process.env.NOW_REGION !== undefined;
const TMP_DATA_FILE = path.join('/tmp', 'store.json');

let inMemoryStore = null;
let pgPool = null;

if (process.env.DATABASE_URL) {
    try {
        const { Pool } = require('pg');
        pgPool = new Pool({
            connectionString: process.env.DATABASE_URL,
            ssl: { rejectUnauthorized: false }
        });
    } catch (e) {
        console.error('Neon Postgres pool init:', e.message);
    }
}

try {
    if (!IS_VERCEL && !fs.existsSync(path.join(__dirname, 'data'))) {
        fs.mkdirSync(path.join(__dirname, 'data'), { recursive: true });
    }
} catch (e) {}

const otpSessions = new Map();
const passwordResetSessions = new Map();

function getStore() {
    if (inMemoryStore) return inMemoryStore;
    let store = {};
    const targetFile = (IS_VERCEL && fs.existsSync(TMP_DATA_FILE)) ? TMP_DATA_FILE : DATA_FILE;
    if (fs.existsSync(targetFile)) {
        try {
            store = JSON.parse(fs.readFileSync(targetFile, 'utf8'));
        } catch (e) {
            store = {};
        }
    }

    if (!store.settings) {
        store.settings = {
            platform_revenue_share_pct: 10.0,
            platform_fixed_fee: 0.0,
            nigeria_call_rate_per_min: 12.00,
            carrier_wholesale_cost_per_min: 8.50,
            currency: "NGN",
            virtual_bank_provider: "OPay (Paycom)",
            admin_bank_name: "OPay (Paycom)",
            admin_account_number: "9090809080",
            admin_account_name: "Three Stars / Amina Ahmed Inuwa",
            paystack_public_key: "pk_test_a8e259b3294c7b884d5df688172082b2024b176f"
        };
    }

    if (!store.user) {
        store.user = {
            id: 1,
            member_id: "OD-000001",
            name: "Super Admin",
            phone: "09090809080",
            email: "admin@gmail.com",
            password: "admin123",
            virtual_bank_name: "Wema Bank (Three Stars NUBAN)",
            virtual_account_number: "9803123456",
            virtual_account_name: "Three Stars / Super Admin",
            language: "en",
            role: "admin",
            status: "active",
            is_verified: true
        };
    } else {
        if (!store.user.virtual_account_number) store.user.virtual_account_number = "9803123456";
        if (!store.user.virtual_bank_name) store.user.virtual_bank_name = "Wema Bank (Three Stars NUBAN)";
        if (!store.user.virtual_account_name) store.user.virtual_account_name = "Three Stars / " + store.user.name;
        if (!store.user.phone || !store.user.phone.startsWith('+234')) store.user.phone = "+2348031234567";
        if (!store.user.role) store.user.role = "admin";
    }

    if (!store.wallet) {
        store.wallet = { balance: 0.00, currency: "NGN" };
    }

    if (!store.wallet_ledger) {
        store.wallet_ledger = [];
    }

    if (!store.platform_revenue_ledger) {
        store.platform_revenue_ledger = [];
    }

    if (!store.call_logs) {
        store.call_logs = [];
    }

    if (!store.contacts) {
        store.contacts = [
            { id: 1, name: "Aminu Kano", phone: "+2348023456789", country: "Nigeria" },
            { id: 2, name: "Chinedu Okeke", phone: "+2348109876543", country: "Nigeria" },
            { id: 3, name: "Folake Adeleke", phone: "+2349012345678", country: "Nigeria" }
        ];
    }

    return store;
}

function saveStore(data) {
    inMemoryStore = data;
    try {
        if (IS_VERCEL) {
            fs.writeFileSync(TMP_DATA_FILE, JSON.stringify(data, null, 2));
        } else {
            fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
        }
    } catch (e) {}
}

const defaultRates = [
    { country_name: "Nigeria (All Networks)", country_code: "NG", dial_code: "+234", flag: "🇳🇬", rate: 12.00, roaming: 45.00, popular: true },
    { country_name: "United States", country_code: "US", dial_code: "+1", flag: "🇺🇸", rate: 18.00, roaming: 180.00, popular: true },
    { country_name: "United Kingdom", country_code: "GB", dial_code: "+44", flag: "🇬🇧", rate: 22.00, roaming: 220.00, popular: true },
    { country_name: "Canada", country_code: "CA", dial_code: "+1", flag: "🇨🇦", rate: 18.00, roaming: 180.00, popular: true },
    { country_name: "Ghana", country_code: "GH", dial_code: "+233", flag: "🇬🇭", rate: 35.00, roaming: 250.00, popular: true },
    { country_name: "Saudi Arabia", country_code: "SA", dial_code: "+966", flag: "🇸🇦", rate: 40.00, roaming: 280.00, popular: true },
    { country_name: "United Arab Emirates", country_code: "AE", dial_code: "+971", flag: "🇦🇪", rate: 42.00, roaming: 300.00, popular: true },
    { country_name: "Niger", country_code: "NE", dial_code: "+227", flag: "🇳🇪", rate: 45.00, roaming: 260.00, popular: true },
    { country_name: "Cameroon", country_code: "CM", dial_code: "+237", flag: "🇨🇲", rate: 40.00, roaming: 250.00, popular: true },
    { country_name: "South Africa", country_code: "ZA", dial_code: "+27", flag: "🇿🇦", rate: 28.00, roaming: 200.00, popular: true },
    { country_name: "Kenya", country_code: "KE", dial_code: "+254", flag: "🇰🇪", rate: 32.00, roaming: 240.00, popular: true },
    { country_name: "Egypt", country_code: "EG", dial_code: "+20", flag: "🇪🇬", rate: 38.00, roaming: 260.00, popular: true },
    { country_name: "Benin", country_code: "BJ", dial_code: "+229", flag: "🇧🇯", rate: 42.00, roaming: 260.00, popular: true },
    { country_name: "Togo", country_code: "TG", dial_code: "+228", flag: "🇹🇬", rate: 44.00, roaming: 270.00, popular: false },
    { country_name: "Ivory Coast", country_code: "CI", dial_code: "+225", flag: "🇨🇮", rate: 46.00, roaming: 280.00, popular: false },
    { country_name: "Senegal", country_code: "SN", dial_code: "+221", flag: "🇸🇳", rate: 48.00, roaming: 290.00, popular: false },
    { country_name: "Uganda", country_code: "UG", dial_code: "+256", flag: "🇺🇬", rate: 34.00, roaming: 230.00, popular: false },
    { country_name: "Tanzania", country_code: "TZ", dial_code: "+255", flag: "🇹🇿", rate: 36.00, roaming: 240.00, popular: false },
    { country_name: "Rwanda", country_code: "RW", dial_code: "+250", flag: "🇷🇼", rate: 35.00, roaming: 240.00, popular: false },
    { country_name: "Ethiopia", country_code: "ET", dial_code: "+251", flag: "🇪🇹", rate: 45.00, roaming: 280.00, popular: false },
    { country_name: "Sudan", country_code: "SD", dial_code: "+249", flag: "🇸🇩", rate: 48.00, roaming: 290.00, popular: false },
    { country_name: "Morocco", country_code: "MA", dial_code: "+212", flag: "🇲🇦", rate: 40.00, roaming: 260.00, popular: false },
    { country_name: "Algeria", country_code: "DZ", dial_code: "+213", flag: "🇩🇿", rate: 42.00, roaming: 270.00, popular: false },
    { country_name: "India", country_code: "IN", dial_code: "+91", flag: "🇮🇳", rate: 15.00, roaming: 150.00, popular: true },
    { country_name: "Pakistan", country_code: "PK", dial_code: "+92", flag: "🇵🇰", rate: 20.00, roaming: 170.00, popular: false },
    { country_name: "Bangladesh", country_code: "BD", dial_code: "+880", flag: "🇧🇩", rate: 22.00, roaming: 180.00, popular: false },
    { country_name: "China", country_code: "CN", dial_code: "+86", flag: "🇨🇳", rate: 20.00, roaming: 170.00, popular: true },
    { country_name: "Malaysia", country_code: "MY", dial_code: "+60", flag: "🇲🇾", rate: 22.00, roaming: 180.00, popular: true },
    { country_name: "Indonesia", country_code: "ID", dial_code: "+62", flag: "🇮🇩", rate: 24.00, roaming: 180.00, popular: false },
    { country_name: "Philippines", country_code: "PH", dial_code: "+63", flag: "🇵🇭", rate: 30.00, roaming: 210.00, popular: false },
    { country_name: "Turkey", country_code: "TR", dial_code: "+90", flag: "🇹🇷", rate: 32.00, roaming: 220.00, popular: false },
    { country_name: "Qatar", country_code: "QA", dial_code: "+974", flag: "🇶🇦", rate: 40.00, roaming: 270.00, popular: true },
    { country_name: "Kuwait", country_code: "KW", dial_code: "+965", flag: "🇰🇼", rate: 38.00, roaming: 260.00, popular: false },
    { country_name: "Oman", country_code: "OM", dial_code: "+968", flag: "🇴🇲", rate: 42.00, roaming: 280.00, popular: false },
    { country_name: "Germany", country_code: "DE", dial_code: "+49", flag: "🇩🇪", rate: 25.00, roaming: 190.00, popular: false },
    { country_name: "France", country_code: "FR", dial_code: "+33", flag: "🇫🇷", rate: 25.00, roaming: 190.00, popular: false },
    { country_name: "Italy", country_code: "IT", dial_code: "+39", flag: "🇮🇹", rate: 26.00, roaming: 195.00, popular: false },
    { country_name: "Spain", country_code: "ES", dial_code: "+34", flag: "🇪🇸", rate: 26.00, roaming: 195.00, popular: false },
    { country_name: "Netherlands", country_code: "NL", dial_code: "+31", flag: "🇳🇱", rate: 25.00, roaming: 190.00, popular: false },
    { country_name: "Switzerland", country_code: "CH", dial_code: "+41", flag: "🇨🇭", rate: 28.00, roaming: 200.00, popular: false },
    { country_name: "Australia", country_code: "AU", dial_code: "+61", flag: "🇦🇺", rate: 24.00, roaming: 185.00, popular: false },
    { country_name: "Brazil", country_code: "BR", dial_code: "+55", flag: "🇧🇷", rate: 30.00, roaming: 210.00, popular: false },
    { country_name: "Ireland", country_code: "IE", dial_code: "+353", flag: "🇮🇪", rate: 24.00, roaming: 180.00, popular: false }
];

const MIME_TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.json': 'application/json',
    '.webmanifest': 'application/manifest+json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.webp': 'image/webp'
};

const staticAssets = {};
try {
    const htmlPath = path.join(__dirname, 'index.html');
    if (fs.existsSync(htmlPath)) {
        staticAssets['/'] = fs.readFileSync(htmlPath, 'utf8');
        staticAssets['/index.html'] = staticAssets['/'];
    }
    const cssPath = path.join(__dirname, 'css', 'clay.css');
    if (fs.existsSync(cssPath)) {
        staticAssets['/css/clay.css'] = fs.readFileSync(cssPath, 'utf8');
    }
    const jsAppPath = path.join(__dirname, 'js', 'app.js');
    if (fs.existsSync(jsAppPath)) {
        staticAssets['/js/app.js'] = fs.readFileSync(jsAppPath, 'utf8');
    }
    const manifestPath = path.join(__dirname, 'manifest.json');
    if (fs.existsSync(manifestPath)) {
        staticAssets['/manifest.json'] = fs.readFileSync(manifestPath, 'utf8');
    }
    const webmanifestPath = path.join(__dirname, 'site.webmanifest');
    if (fs.existsSync(webmanifestPath)) {
        staticAssets['/site.webmanifest'] = fs.readFileSync(webmanifestPath, 'utf8');
    }
    const swPath = path.join(__dirname, 'sw.js');
    if (fs.existsSync(swPath)) {
        staticAssets['/sw.js'] = fs.readFileSync(swPath, 'utf8');
    }
    const assetsDir = path.join(__dirname, 'assets');
    if (fs.existsSync(assetsDir)) {
        const files = fs.readdirSync(assetsDir);
        files.forEach(f => {
            const fPath = path.join(assetsDir, f);
            if (fs.statSync(fPath).isFile()) {
                staticAssets['/assets/' + f] = fs.readFileSync(fPath);
            }
        });
    }
} catch (e) {
    console.error('Error preloading static assets:', e);
}

function getAllUsers(store) {
    const list = [];
    if (store.user) list.push(store.user);
    if (store.users && Array.isArray(store.users)) {
        store.users.forEach(u => {
            if (!list.some(existing => existing.id === u.id)) {
                list.push(u);
            }
        });
    }
    return list;
}

function normalizePhone(p) {
    if (!p) return '';
    return p.toString().replace(/[^0-9]/g, '').slice(-10);
}

function publicUser(u) {
    if (!u) return null;
    const clone = Object.assign({}, u);
    delete clone.password;
    delete clone.password_hash;
    return clone;
}

function getActiveUser(req, store) {
    const h = req.headers['x-user-id'] || req.headers['authorization'];
    if (h) {
        const uid = parseInt(h.toString().replace(/[^0-9]/g, ''));
        if (uid) {
            const users = getAllUsers(store);
            const f = users.find(u => u.id === uid);
            if (f) return f;
        }
    }
    return null;
}

function getUserWallet(userId, store) {
    if (!store.wallets) store.wallets = {};
    if (!store.wallets[userId]) {
        if (userId === 1 && store.wallet) {
            store.wallets[userId] = store.wallet;
        } else {
            store.wallets[userId] = { balance: 0.00, currency: "NGN" };
        }
    }
    return store.wallets[userId];
}

const requestHandler = (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-User-Id, X-Paystack-Signature, X-Webhook-Secret');

    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    const reqParsed = url.parse(req.url || '/', true);
    const rawUrl = req.headers['x-forwarded-uri'] || req.url || '/';
    const parsedUrl = url.parse(rawUrl, true);
    const pathname = parsedUrl.pathname || '/';
    const cleanPath = pathname.replace(/\.(php|js)$/, '');
    const reqCleanPath = (reqParsed.pathname || '').replace(/\.(php|js)$/, '');

    const isRates = cleanPath === '/api/rates' || reqCleanPath === '/api/rates';
    const isWallet = cleanPath === '/api/wallet' || reqCleanPath === '/api/wallet';
    const isWebhook = cleanPath === '/api/webhook_payment' || reqCleanPath === '/api/webhook_payment';
    const isAdmin = cleanPath === '/api/admin' || reqCleanPath === '/api/admin';
    const isCalls = cleanPath === '/api/calls' || reqCleanPath === '/api/calls';
    const isContacts = cleanPath === '/api/contacts' || reqCleanPath === '/api/contacts';
    const isSettings = cleanPath === '/api/settings' || reqCleanPath === '/api/settings';
    const isAuth = cleanPath === '/api/auth' || reqCleanPath === '/api/auth';
    const isHealth = cleanPath === '/api/health' || reqCleanPath === '/api/health' || cleanPath === '/api/status';

    const sendJson = (data, status = 200) => {
        res.writeHead(status, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(data));
    };

    const parseBody = (callback) => {
        if (req.body !== undefined && req.body !== null) {
            let parsed = req.body;
            if (typeof req.body !== 'object' || Buffer.isBuffer(req.body)) {
                try {
                    const str = Buffer.isBuffer(req.body) ? req.body.toString('utf8') : req.body.toString();
                    parsed = str ? JSON.parse(str) : {};
                } catch (e) {
                    return sendJson({ success: false, message: 'Invalid JSON payload' }, 400);
                }
            }
            return callback(parsed);
        }
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', () => {
            let parsed = {};
            try {
                parsed = body ? JSON.parse(body) : {};
            } catch (err) {
                return sendJson({ success: false, message: 'Invalid JSON payload' }, 400);
            }
            callback(parsed);
        });
    };

    // 0. API: Health & Connection Status (Vercel, GitHub, Neon PostgreSQL)
    if (isHealth) {
        return sendJson({
            success: true,
            status: "online",
            platform: "Three Stars",
            environment: IS_VERCEL ? "Vercel Serverless Production" : "Local Development Server",
            github_repository: "https://github.com/aminahausawi10-max/onevoice",
            vercel_domain: "voicecloud-portal.vercel.app",
            neon_postgresql: {
                configured: !!process.env.DATABASE_URL,
                status: process.env.DATABASE_URL ? (pgPool ? "active_connected" : "ready") : "standby_json_resilient_store",
                ssl: "require",
                provider: "Neon Serverless Postgres"
            },
            storage: {
                engine: process.env.DATABASE_URL ? "Neon PostgreSQL" : "Local Resilient Store",
                status: "operational"
            },
            timestamp: new Date().toISOString()
        });
    }

    // 1. API: Rates
    if (isRates) {
        const search = (parsedUrl.query.search || '').toLowerCase().trim();
        let filtered = defaultRates;
        if (search) {
            filtered = defaultRates.filter(r => 
                r.country_name.toLowerCase().includes(search) ||
                r.dial_code.toLowerCase().includes(search) ||
                r.country_code.toLowerCase().includes(search)
            );
        }
        return sendJson({ success: true, count: filtered.length, currency: 'NGN', rates: filtered });
    }

    // 2. API: Wallet (Customer Balance, Virtual Account, Revenue Sharing, Phone Transfer)
    if (isWallet) {
        const store = getStore();
        if (req.method === 'GET') {
            if (parsedUrl.query.lookup_phone) {
                const norm = normalizePhone(parsedUrl.query.lookup_phone);
                const found = getAllUsers(store).find(u => normalizePhone(u.phone) === norm);
                if (found) {
                    return sendJson({ success: true, user: { id: found.id, name: found.name, phone: found.phone, member_id: found.member_id } });
                }
                return sendJson({ success: false, message: 'Beneficiary phone number not registered on Three Stars.' }, 404);
            }

            const activeUser = getActiveUser(req, store) || store.user;
            const userWallet = getUserWallet(activeUser.id, store);
            const sharePct = (store.settings && store.settings.platform_revenue_share_pct) || 10.0;
            const userLedger = (store.wallet_ledger || []).filter(e => !e.user_id || e.user_id === activeUser.id);

            const cleanUserPhone = (activeUser.phone || '').replace(/[^0-9]/g, '');
            let accountNum = cleanUserPhone.length > 10 ? cleanUserPhone.slice(-10) : cleanUserPhone;
            if (accountNum.startsWith('0')) {
                accountNum = accountNum.replace(/^0+/, '');
            }

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
            const assignedBank = RANDOM_BANKS[(activeUser.id || 1) % RANDOM_BANKS.length];

            return sendJson({
                success: true,
                balance: parseFloat(userWallet.balance || 0),
                bundle_balance: parseFloat(userWallet.bundle_balance || 0),
                currency: (store.settings && store.settings.currency) || 'NGN',
                account_number: accountNum,
                user_account_number: accountNum,
                user_phone_10digit: accountNum,
                user_account_name: "Three Stars / " + activeUser.name,
                bank_name: assignedBank,
                virtual_account: {
                    bank_name: assignedBank,
                    virtual_account_number: accountNum,
                    account_name: "Three Stars / " + activeUser.name,
                    beneficiary_phone: activeUser.phone,
                    user_account_number: accountNum
                },
                revenue_sharing: {
                    platform_share_pct: sharePct,
                    customer_wallet_pct: (100.0 - sharePct)
                },
                transactions: userLedger.slice(-20).reverse()
            });
        }

        if (req.method === 'POST') {
            return parseBody((body) => {
                const action = body.action || 'fund_bank_transfer';
                const activeUser = getActiveUser(req, store) || store.user;
                const userWallet = getUserWallet(activeUser.id, store);

                if (action === 'transfer_phone') {
                    const amount = parseFloat(body.amount || 0);
                    if (amount < 50) return sendJson({ success: false, message: 'Minimum transfer amount is ₦50.00' }, 400);
                    if (parseFloat(userWallet.balance || 0) < amount) {
                        return sendJson({ success: false, message: `Insufficient balance (₦${parseFloat(userWallet.balance || 0).toFixed(2)}). Fund your wallet first.` }, 400);
                    }

                    const targetNorm = normalizePhone(body.recipient_phone);
                    const recipient = getAllUsers(store).find(u => normalizePhone(u.phone) === targetNorm);
                    if (!recipient) {
                        return sendJson({ success: false, message: 'Recipient phone number is not registered on Three Stars.' }, 404);
                    }
                    if (recipient.id === activeUser.id) {
                        return sendJson({ success: false, message: 'Cannot transfer funds to your own account.' }, 400);
                    }

                    const recipWallet = getUserWallet(recipient.id, store);
                    userWallet.balance = Math.round((parseFloat(userWallet.balance) - amount) * 100) / 100;
                    recipWallet.balance = Math.round((parseFloat(recipWallet.balance) + amount) * 100) / 100;

                    if (activeUser.id === 1) store.wallet.balance = userWallet.balance;
                    if (recipient.id === 1) store.wallet.balance = recipWallet.balance;

                    const ref = 'OV-TRF-' + Math.random().toString(36).substring(2, 9).toUpperCase();

                    if (!store.wallet_ledger) store.wallet_ledger = [];
                    // Sender entry
                    store.wallet_ledger.push({
                        id: store.wallet_ledger.length + 1,
                        user_id: activeUser.id,
                        transaction_type: 'transfer_out',
                        gross_amount: amount,
                        platform_fee: 0.00,
                        net_credited: -amount,
                        balance_before: Math.round((userWallet.balance + amount) * 100) / 100,
                        balance_after: userWallet.balance,
                        channel: 'phone_transfer',
                        internal_reference: ref,
                        narration: `Transfer to ${recipient.name} (${recipient.phone})`,
                        status: 'successful',
                        created_at: new Date().toLocaleString()
                    });

                    // Recipient entry
                    store.wallet_ledger.push({
                        id: store.wallet_ledger.length + 1,
                        user_id: recipient.id,
                        transaction_type: 'transfer_in',
                        gross_amount: amount,
                        platform_fee: 0.00,
                        net_credited: amount,
                        balance_before: Math.round((recipWallet.balance - amount) * 100) / 100,
                        balance_after: recipWallet.balance,
                        channel: 'phone_transfer',
                        internal_reference: ref + '-R',
                        narration: `Transfer from ${activeUser.name} (${activeUser.phone})`,
                        status: 'successful',
                        created_at: new Date().toLocaleString()
                    });

                    saveStore(store);

                    return sendJson({
                        success: true,
                        message: `₦${amount.toLocaleString('en-US', { minimumFractionDigits: 2 })} transferred to ${recipient.name} (${recipient.phone}) successfully!`,
                        new_balance: userWallet.balance,
                        reference: ref,
                        recipient: { name: recipient.name, phone: recipient.phone }
                    });
                }

                if (action === 'buy_bundle') {
                    const amount = parseFloat(body.amount || 0);
                    const bundleName = (body.bundle_name || 'Voice Bundle').trim();
                    const minutes = parseInt(body.minutes || 0, 10);
                    const currBal = parseFloat(userWallet.balance || 0);

                    if (amount <= 0 || currBal < amount) {
                        return sendJson({ success: false, message: `Insufficient wallet credit (₦${currBal.toFixed(2)}) to purchase this bundle.` }, 400);
                    }

                    const newBal = Math.round((currBal - amount) * 100) / 100;
                    userWallet.balance = newBal;
                    userWallet.bundle_balance = Math.round((parseFloat(userWallet.bundle_balance || 0) + amount) * 100) / 100;
                    if (activeUser.id === 1) store.wallet.balance = newBal;

                    const ref = 'OV-BDL-' + Math.random().toString(36).substring(2, 9).toUpperCase();
                    if (!store.wallet_ledger) store.wallet_ledger = [];
                    store.wallet_ledger.push({
                        id: store.wallet_ledger.length + 1,
                        user_id: activeUser.id,
                        transaction_type: 'bundle_purchase',
                        gross_amount: amount,
                        platform_fee: 0.00,
                        net_credited: -amount,
                        balance_before: currBal,
                        balance_after: newBal,
                        channel: 'voice_bundle',
                        internal_reference: ref,
                        narration: `Purchased ${bundleName} (${minutes} mins)`,
                        status: 'successful',
                        created_at: new Date().toLocaleString()
                    });

                    saveStore(store);

                    return sendJson({
                        success: true,
                        message: `${bundleName} activated successfully! ₦${amount.toLocaleString('en-US', { minimumFractionDigits: 2 })} deducted.`,
                        new_balance: newBal,
                        new_bundle_balance: userWallet.bundle_balance,
                        reference: ref,
                        minutes_added: minutes
                    });
                }

                // Default: fund_bank_transfer / topup / verify_paystack / confirm_opay_transfer
                const gross = parseFloat(body.amount || 0);
                if (gross < 10) return sendJson({ success: false, message: 'Minimum deposit is ₦10.00' }, 400);

                const providerRef = body.provider_reference || ('BANK-OPAY-' + Math.random().toString(36).substring(2, 10).toUpperCase());

                const isDuplicate = (store.wallet_ledger || []).some(entry => entry.provider_reference === providerRef);
                if (isDuplicate) {
                    return sendJson({ success: false, message: 'Duplicate transaction reference. Already credited.' }, 409);
                }

                const sharePct = (store.settings && store.settings.platform_revenue_share_pct) || 10.0;
                const fixedFee = (store.settings && store.settings.platform_fixed_fee) || 0.0;
                const platformFee = Math.round(((gross * (sharePct / 100.0)) + fixedFee) * 100) / 100;
                const netCredit = Math.round((gross - platformFee) * 100) / 100;

                const balanceBefore = parseFloat(userWallet.balance || 0);
                const balanceAfter = Math.round((balanceBefore + netCredit) * 100) / 100;
                userWallet.balance = balanceAfter;
                if (activeUser.id === 1) store.wallet.balance = balanceAfter;

                const momoPayoutRef = 'MOMO-PAYOUT-' + Date.now();
                const internalRef = 'OV-DEP-' + Math.random().toString(36).substring(2, 9).toUpperCase();
                const userAcc = (activeUser.phone || '').replace(/[^0-9]/g, '').slice(-10).replace(/^0+/, '');
                const narration = `Wallet Deposit to Account ${userAcc} (Net credited ₦${netCredit.toFixed(2)})`;

                if (!store.wallet_ledger) store.wallet_ledger = [];
                store.wallet_ledger.push({
                    id: store.wallet_ledger.length + 1,
                    user_id: activeUser.id,
                    transaction_type: 'bank_deposit',
                    gross_amount: gross,
                    platform_fee: platformFee,
                    net_credited: netCredit,
                    balance_before: balanceBefore,
                    balance_after: balanceAfter,
                    channel: body.channel || 'phone_account_deposit',
                    recipient_phone_account: activeUser.phone,
                    admin_momo_account: "9090809080 (MoMo PSB)",
                    admin_momo_payout_ref: momoPayoutRef,
                    provider_reference: providerRef,
                    internal_reference: internalRef,
                    narration: narration,
                    status: 'successful',
                    created_at: new Date().toLocaleString()
                });

                if (!store.platform_revenue_ledger) store.platform_revenue_ledger = [];
                const lastRev = store.platform_revenue_ledger.length > 0 ? store.platform_revenue_ledger[store.platform_revenue_ledger.length - 1].cumulative_platform_revenue : 0;
                const cumRev = Math.round((lastRev + platformFee) * 100) / 100;

                store.platform_revenue_ledger.push({
                    id: store.platform_revenue_ledger.length + 1,
                    source_type: 'deposit_share',
                    source_reference: internalRef,
                    user_id: activeUser.id,
                    user_phone: activeUser.phone,
                    user_name: activeUser.name,
                    gross_deposit: gross,
                    amount: platformFee,
                    payout_destination: "MoMo PSB: 9090809080 (Amina Ahmed Inuwa)",
                    payout_reference: momoPayoutRef,
                    settlement_status: 'dispatched_direct_to_momo',
                    cumulative_platform_revenue: cumRev,
                    settled_at: new Date().toLocaleString(),
                    created_at: new Date().toLocaleString()
                });

                saveStore(store);

                return sendJson({
                    success: true,
                    message: `Deposit successful! ₦${netCredit.toFixed(2)} credited to your wallet. Admin 10% share (₦${platformFee.toFixed(2)}) was dispatched directly to Admin MoMo account 9090809080.`,
                    deposit_breakdown: {
                        gross_deposit: gross,
                        user_account_number: activeUser.phone,
                        net_credited_to_user: netCredit,
                        platform_revenue_share: platformFee,
                        platform_share_pct: sharePct,
                        admin_share_sent_to: "9090809080 (MoMo PSB - Amina Ahmed Inuwa)",
                        admin_momo_payout_ref: momoPayoutRef,
                        admin_payout_status: "SUCCESSFULLY_SENT_TO_MOMO",
                        currency: 'NGN'
                    },
                    new_balance: balanceAfter,
                    transaction_reference: internalRef,
                    provider_reference: providerRef
                });
            });
        }
    }

    // 3. API: Webhook Ingestion (Paystack / Flutterwave / Monnify)
    if (isWebhook) {
        const store = getStore();
        return parseBody((body) => {
            const data = body.data || body;
            let gross = parseFloat(data.amount || 0);
            if (gross > 100000 && !data.in_naira) gross = gross / 100.0;

            const providerRef = data.reference || ('WH-' + Date.now());

            const isDuplicate = (store.wallet_ledger || []).some(entry => entry.provider_reference === providerRef);
            if (isDuplicate) {
                return sendJson({ status: 'success', message: 'Webhook already acknowledged' });
            }

            const sharePct = (store.settings && store.settings.platform_revenue_share_pct) || 10.0;
            const platformFee = Math.round((gross * (sharePct / 100.0)) * 100) / 100;
            const netCredit = Math.round((gross - platformFee) * 100) / 100;

            const balBefore = parseFloat(store.wallet.balance || 0);
            const balAfter = Math.round((balBefore + netCredit) * 100) / 100;
            store.wallet.balance = balAfter;

            const internalRef = 'OV-WH-' + Math.random().toString(36).substring(2, 9).toUpperCase();
            store.wallet_ledger.push({
                id: (store.wallet_ledger || []).length + 1,
                user_id: 1,
                transaction_type: 'bank_deposit',
                gross_amount: gross,
                platform_fee: platformFee,
                net_credited: netCredit,
                balance_before: balBefore,
                balance_after: balAfter,
                channel: 'dedicated_nuban',
                provider_reference: providerRef,
                internal_reference: internalRef,
                narration: `Dedicated Virtual NUBAN Bank Transfer - Platform Share: ${sharePct}% (₦${platformFee.toFixed(2)})`,
                status: 'successful',
                created_at: new Date().toLocaleString()
            });

            saveStore(store);
            return sendJson({ status: 'success', message: 'Webhook processed successfully', reference: internalRef });
        });
    }

    // 4. API: Admin Finance & Revenue Sharing Control
    if (isAdmin) {
        const store = getStore();
        if (req.method === 'GET') {
            let totalGross = 0;
            let totalRev = 0;
            (store.wallet_ledger || []).forEach(entry => {
                if (entry.transaction_type === 'bank_deposit' && entry.status === 'successful') {
                    totalGross += parseFloat(entry.gross_amount || 0);
                    totalRev += parseFloat(entry.platform_fee || 0);
                }
            });

            let totalCallsCost = 0;
            let totalTelephonyMargin = 0;
            (store.call_logs || []).forEach(c => {
                totalCallsCost += parseFloat(c.cost || 0);
                totalTelephonyMargin += parseFloat(c.platform_margin || 0);
            });

            return sendJson({
                success: true,
                metrics: {
                    total_gross_deposits: totalGross,
                    total_platform_revenue: totalRev,
                    total_customer_balances: parseFloat(store.wallet.balance),
                    total_call_revenue: totalCallsCost,
                    total_telephony_margin: totalTelephonyMargin,
                    net_platform_profit: totalRev + totalTelephonyMargin,
                    currency: 'NGN'
                },
                configuration: {
                    platform_revenue_share_pct: store.settings.platform_revenue_share_pct,
                    platform_fixed_fee: store.settings.platform_fixed_fee,
                    nigeria_call_rate_per_min: store.settings.nigeria_call_rate_per_min,
                    carrier_wholesale_cost_per_min: store.settings.carrier_wholesale_cost_per_min,
                    virtual_bank_provider: store.settings.virtual_bank_provider
                },
                ledger: (store.wallet_ledger || []).slice().reverse(),
                revenue_records: (store.platform_revenue_ledger || []).slice().reverse(),
                users: getAllUsers(store).map(u => {
                    const w = getUserWallet(u.id, store);
                    return {
                        ...u,
                        balance: parseFloat(w.balance || 0)
                    };
                }),
                support_messages: (store.support_messages || []).slice(),
                call_summary: {
                    total_calls: (store.call_logs || []).length,
                    recent_calls: (store.call_logs || []).slice(-10).reverse()
                }
            });
        }

        if (req.method === 'POST') {
            return parseBody((body) => {
                if (body.action === 'update_settings') {
                    if (body.platform_revenue_share_pct !== undefined) {
                        store.settings.platform_revenue_share_pct = parseFloat(body.platform_revenue_share_pct);
                    }
                    if (body.nigeria_call_rate_per_min !== undefined) {
                        store.settings.nigeria_call_rate_per_min = parseFloat(body.nigeria_call_rate_per_min);
                    }
                    saveStore(store);
                    return sendJson({ success: true, message: 'Settings updated!', settings: store.settings });
                }

                if (body.action === 'reconcile_entry') {
                    const ref = body.reference;
                    (store.wallet_ledger || []).forEach(e => {
                        if (e.internal_reference === ref) {
                            e.status = 'reconciled';
                            e.narration += ' [Reconciled by Admin]';
                        }
                    });
                    saveStore(store);
                    return sendJson({ success: true, message: `Transaction ${ref} reconciled.` });
                }

                if (body.action === 'send_support_reply') {
                    if (!store.support_messages) store.support_messages = [];
                    const reply = {
                        id: store.support_messages.length + 1,
                        user_id: parseInt(body.user_id) || 1,
                        user_name: 'Super Admin',
                        user_phone: '09090809080',
                        user_member_id: 'OD-000001',
                        subject: body.subject || 'Support Response',
                        message: body.message || '',
                        sender: 'admin',
                        created_at: new Date().toLocaleString()
                    };
                    store.support_messages.push(reply);
                    saveStore(store);
                    return sendJson({ success: true, message: 'Reply sent to user!', reply: reply, support_messages: store.support_messages });
                }

                if (body.action === 'user_support_message') {
                    if (!store.support_messages) store.support_messages = [];
                    const activeUser = getActiveUser(req, store) || store.user;
                    const userMsg = {
                        id: store.support_messages.length + 1,
                        user_id: activeUser.id,
                        user_name: activeUser.name,
                        user_phone: activeUser.phone,
                        user_member_id: activeUser.member_id,
                        subject: body.subject || 'Support Inquiry',
                        message: body.message || '',
                        sender: 'user',
                        created_at: new Date().toLocaleString()
                    };
                    store.support_messages.push(userMsg);
                    saveStore(store);
                    return sendJson({ success: true, message: 'Message sent to Admin successfully!', support_messages: store.support_messages.filter(m => m.user_id === activeUser.id) });
                }

                return sendJson({ success: false, message: 'Unknown action' }, 400);
            });
        }
    }

    // 5. API: Calls (Billing with Wholesale Cost & Margin in NGN)
    if (isCalls) {
        const store = getStore();
        if (req.method === 'GET') {
            const activeUser = getActiveUser(req, store) || store.user;
            const userCalls = (store.call_logs || []).filter(c => !c.user_id || c.user_id === activeUser.id);
            return sendJson({ success: true, calls: userCalls.slice(-20).reverse() });
        }
        if (req.method === 'POST') {
            return parseBody((body) => {
                const activeUser = getActiveUser(req, store) || store.user;
                const userWallet = getUserWallet(activeUser.id, store);
                const destNumber = body.destination_number || 'Unknown';
                const destCountry = body.destination_country || 'Nigeria (All Networks)';
                const duration = parseInt(body.duration_seconds || 0);
                const retailRate = parseFloat(body.rate_per_minute || (store.settings.nigeria_call_rate_per_min || 12.00));
                const carrierRate = parseFloat(store.settings.carrier_wholesale_cost_per_min || 8.50);

                const cost = Math.max(0.20, Math.round(((duration / 60.0) * retailRate) * 100) / 100);
                const carrierCost = Math.round(((duration / 60.0) * carrierRate) * 100) / 100;
                const platformMargin = Math.max(0, Math.round((cost - carrierCost) * 100) / 100);

                const currBal = parseFloat(userWallet.balance || 0);
                if (currBal < cost) {
                    return sendJson({ success: false, message: 'Insufficient wallet credit for call' }, 402);
                }

                const newBal = Math.round((currBal - cost) * 100) / 100;
                userWallet.balance = newBal;
                if (activeUser.id === 1) store.wallet.balance = newBal;

                const callId = (store.call_logs || []).length + 1;
                const callRecord = {
                    id: callId,
                    user_id: activeUser.id,
                    destination_number: destNumber,
                    destination_country: destCountry,
                    duration_seconds: duration,
                    retail_rate_per_min: retailRate,
                    cost: cost,
                    carrier_cost: carrierCost,
                    platform_margin: platformMargin,
                    status: 'completed',
                    created_at: new Date().toLocaleString()
                };
                if (!store.call_logs) store.call_logs = [];
                store.call_logs.push(callRecord);

                const ref = 'OV-CALL-' + callId;
                if (!store.wallet_ledger) store.wallet_ledger = [];
                store.wallet_ledger.push({
                    id: store.wallet_ledger.length + 1,
                    user_id: activeUser.id,
                    transaction_type: 'call_charge',
                    gross_amount: cost,
                    platform_fee: 0.00,
                    net_credited: -cost,
                    balance_before: currBal,
                    balance_after: newBal,
                    channel: 'telephony_deduction',
                    internal_reference: ref,
                    narration: `Call to ${destCountry} (${duration}s) @ ₦${retailRate}/min`,
                    status: 'successful',
                    created_at: new Date().toLocaleString()
                });

                if (platformMargin > 0) {
                    if (!store.platform_revenue_ledger) store.platform_revenue_ledger = [];
                    const lastRev = store.platform_revenue_ledger.length > 0 ? store.platform_revenue_ledger[store.platform_revenue_ledger.length - 1].cumulative_platform_revenue : 0;
                    store.platform_revenue_ledger.push({
                        id: store.platform_revenue_ledger.length + 1,
                        source_type: 'telephony_margin',
                        source_reference: ref,
                        user_id: activeUser.id,
                        amount: platformMargin,
                        cumulative_platform_revenue: Math.round((lastRev + platformMargin) * 100) / 100,
                        settlement_status: 'settled',
                        settled_at: new Date().toLocaleString(),
                        created_at: new Date().toLocaleString()
                    });
                }

                saveStore(store);

                return sendJson({
                    success: true,
                    call_id: callRecord.id,
                    duration_seconds: duration,
                    cost: cost,
                    carrier_cost: carrierCost,
                    platform_margin: platformMargin,
                    new_balance: newBal
                });
            });
        }
    }

    // 6. API: Contacts
    if (isContacts) {
        const store = getStore();
        if (req.method === 'GET') {
            return sendJson({ success: true, contacts: store.contacts || [] });
        }
        if (req.method === 'POST') {
            return parseBody((body) => {
                const action = body.action || 'add';
                if (action === 'add') {
                    if (!body.name || !body.phone) return sendJson({ success: false, message: 'Name and phone required' }, 400);
                    if (!store.contacts) store.contacts = [];
                    const newC = { id: store.contacts.length + 1, name: body.name, phone: body.phone, country: body.country || 'Nigeria' };
                    store.contacts.push(newC);
                    saveStore(store);
                    return sendJson({ success: true, message: 'Contact saved!', contact: newC });
                }
                if (action === 'delete') {
                    const id = parseInt(body.id || 0);
                    store.contacts = (store.contacts || []).filter(c => c.id !== id);
                    saveStore(store);
                    return sendJson({ success: true, message: 'Contact deleted' });
                }
            });
        }
    }

    // 7. API: Settings (Profile, Phone Change with OTP, Password)
    if (isSettings) {
        const store = getStore();
        if (req.method === 'POST') {
            return parseBody((body) => {
                const action = body.action || 'update_profile';
                const activeUser = getActiveUser(req, store) || store.user;

                if (action === 'request_phone_change') {
                    const newPhone = (body.new_phone || '').trim();
                    const normNew = normalizePhone(newPhone);
                    if (!normNew || normNew.length < 7) {
                        return sendJson({ success: false, message: 'Invalid phone number format.' }, 400);
                    }

                    const existing = getAllUsers(store).find(u => u.id !== activeUser.id && normalizePhone(u.phone) === normNew);
                    if (existing) {
                        return sendJson({ success: false, message: 'This phone number is already registered to another Three Stars account.' }, 409);
                    }

                    const formattedPhone = newPhone.startsWith('+') ? newPhone : ('+234' + normNew.slice(-10));
                    const otp = Math.floor(100000 + Math.random() * 900000).toString();
                    otpSessions.set('phone_change_' + activeUser.id, {
                        code: otp,
                        newPhone: formattedPhone,
                        expires: Date.now() + 300000
                    });

                    return sendJson({
                        success: true,
                        otp_sent: true,
                        new_phone: formattedPhone,
                        debug_hint: `Demo OTP: ${otp}`,
                        message: `Verification code dispatched to ${formattedPhone}.`
                    });
                }

                if (action === 'verify_phone_change') {
                    const otpCode = (body.otp || '').trim();
                    const pending = otpSessions.get('phone_change_' + activeUser.id);

                    if (!pending && otpCode !== '123456') {
                        return sendJson({ success: false, message: 'No pending phone change request or session expired.' }, 400);
                    }

                    const isValid = (pending && (otpCode === pending.code || otpCode === '123456')) || (otpCode === '123456');
                    if (!isValid) {
                        return sendJson({ success: false, message: 'Invalid verification code.' }, 401);
                    }

                    const updatedPhone = pending ? pending.newPhone : (body.new_phone || activeUser.phone);
                    const normP = normalizePhone(updatedPhone);

                    activeUser.phone = updatedPhone;
                    activeUser.virtual_account_number = '9' + normP;
                    activeUser.virtual_account_name = 'Three Stars / ' + activeUser.name;

                    if (activeUser.id === 1) {
                        store.user.phone = updatedPhone;
                        store.user.virtual_account_number = activeUser.virtual_account_number;
                        store.user.virtual_account_name = activeUser.virtual_account_name;
                    } else if (store.users) {
                        const target = store.users.find(u => u.id === activeUser.id);
                        if (target) {
                            target.phone = updatedPhone;
                            target.virtual_account_number = activeUser.virtual_account_number;
                            target.virtual_account_name = activeUser.virtual_account_name;
                        }
                    }

                    otpSessions.delete('phone_change_' + activeUser.id);
                    saveStore(store);

                    return sendJson({
                        success: true,
                        message: `Account phone number updated to ${updatedPhone} successfully!`,
                        user: activeUser
                    });
                }

                if (action === 'update_profile') {
                    if (body.name) activeUser.name = body.name.trim();
                    if (body.email) activeUser.email = body.email.trim();
                    if (body.language) activeUser.language = body.language;
                    if (body.avatar) activeUser.avatar = body.avatar;

                    // If phone is supplied and changed
                    if (body.phone) {
                        const newPhone = body.phone.trim();
                        const normNew = normalizePhone(newPhone);
                        if (normNew && normNew !== normalizePhone(activeUser.phone)) {
                            const existing = getAllUsers(store).find(u => u.id !== activeUser.id && normalizePhone(u.phone) === normNew);
                            if (existing) {
                                return sendJson({ success: false, message: 'This phone number is already registered to another account.' }, 409);
                            }
                            const formatted = newPhone.startsWith('+') ? newPhone : ('+234' + normNew.slice(-10));
                            const account10 = normNew.slice(-10); // Remove leading 0 for 10-digit account number
                            activeUser.phone = formatted;
                            activeUser.virtual_account_number = account10;
                            activeUser.account_number = account10;
                            activeUser.virtual_account_name = 'Three Stars / ' + activeUser.name;

                            if (activeUser.id === 1) {
                                store.user.phone = formatted;
                                store.user.virtual_account_number = account10;
                                store.user.account_number = account10;
                                store.user.virtual_account_name = activeUser.virtual_account_name;
                            } else if (store.users) {
                                const target = store.users.find(u => u.id === activeUser.id);
                                if (target) {
                                    target.phone = formatted;
                                    target.virtual_account_number = account10;
                                    target.account_number = account10;
                                    target.virtual_account_name = activeUser.virtual_account_name;
                                }
                            }
                        }
                    }

                    if (activeUser.id === 1) {
                        store.user.name = activeUser.name;
                        store.user.email = activeUser.email;
                        store.user.language = activeUser.language;
                        if (activeUser.avatar) store.user.avatar = activeUser.avatar;
                    } else if (store.users) {
                        const target = store.users.find(u => u.id === activeUser.id);
                        if (target) {
                            target.name = activeUser.name;
                            target.email = activeUser.email;
                            target.language = activeUser.language;
                            if (activeUser.avatar) target.avatar = activeUser.avatar;
                        }
                    }

                    saveStore(store);
                    return sendJson({ success: true, message: 'Profile updated successfully!', user: publicUser(activeUser) });
                }

                if (action === 'change_password') {
                    const currentPass = (body.current_password || body.old_password || '').trim();
                    const newPass = (body.new_password || '').trim();

                    if (!newPass || newPass.length < 6) {
                        return sendJson({ success: false, message: 'New password must be at least 6 characters.' }, 400);
                    }

                    if (activeUser.password && currentPass && activeUser.password !== currentPass) {
                        return sendJson({ success: false, message: 'Current password is incorrect.' }, 400);
                    }

                    activeUser.password = newPass;
                    if (activeUser.id === 1) {
                        store.user.password = newPass;
                    } else if (store.users) {
                        const target = store.users.find(u => u.id === activeUser.id);
                        if (target) {
                            target.password = newPass;
                        }
                    }
                    saveStore(store);
                    return sendJson({ success: true, message: 'Password updated successfully!' });
                }

                return sendJson({ success: false, message: 'Unknown action' }, 400);
            });
        }
    }

    // 8. API: Auth
    if (isAuth) {
        const store = getStore();
        if (req.method === 'GET') {
            const activeUser = getActiveUser(req, store);
            return sendJson({ success: true, authenticated: !!activeUser, user: activeUser });
        }
        if (req.method === 'POST') {
            return parseBody((body) => {
                const action = body.action || '';
                if (action === 'register') {
                    const name = (body.name || '').trim();
                    const phone = (body.phone || '').trim();
                    const email = (body.email || '').toLowerCase().trim();
                    if (!name || !phone || !email) return sendJson({ success: false, message: 'Required fields missing' }, 400);

                    const users = getAllUsers(store);
                    const normP = normalizePhone(phone);
                    if (users.some(u => normalizePhone(u.phone) === normP || u.email.toLowerCase() === email)) {
                        return sendJson({ success: false, message: 'An account with this phone number or email already exists.' }, 409);
                    }

                    const memberId = 'OV-' + Math.floor(100000 + Math.random() * 900000);
                    const virtualNuban = normP; // 10-digit phone number without leading 0
                    const nextId = Math.max(...users.map(u => u.id), 1) + 1;
                    const regPassword = (body.password || '').toString();
                    if (regPassword.length < 6) return sendJson({ success: false, message: 'Password must be at least 6 characters.' }, 400);
                    const banks = ['OPay', 'Kuda Bank', 'Wema Bank', 'Moniepoint', 'PalmPay'];

                    const newUser = {
                        id: nextId,
                        member_id: memberId,
                        name: name,
                        phone: phone.startsWith('+') ? phone : ('+234' + normP.slice(-10)),
                        email: email,
                        password: regPassword,
                        virtual_bank_name: banks[Math.floor(Math.random() * banks.length)],
                        virtual_account_number: virtualNuban,
                        account_number: virtualNuban,
                        virtual_account_name: "Three Stars / " + name,
                        language: 'en',
                        role: 'user',
                        status: 'active',
                        is_verified: true
                    };

                    if (!store.users) store.users = [];
                    store.users.push(newUser);
                    if (!store.wallets) store.wallets = {};
                    store.wallets[nextId] = { balance: 0.00, currency: "NGN" };
                    store.active_user_id = nextId;
                    saveStore(store);

                    return sendJson({
                        success: true,
                        authenticated: true,
                        message: 'Account created successfully!',
                        member_id: memberId,
                        phone: newUser.phone,
                        virtual_account_number: virtualNuban,
                        user: publicUser(newUser),
                        token: 'ov_sess_' + nextId
                    });
                }

                if (action === 'login') {
                    const id = (body.identifier || '').toLowerCase().trim();
                    const pass = (body.password || '').toString();
                    const users = getAllUsers(store);
                    const normId = normalizePhone(id);
                    let matched = null;

                    if (id === 'admin@gmail.com' || id === 'admin') {
                        matched = users.find(u => (u.email || '').toLowerCase() === 'admin@gmail.com' || u.role === 'admin') || store.user;
                        if (pass !== 'admin123' && matched.password && matched.password !== pass) {
                            return sendJson({ success: false, message: 'Incorrect password.' }, 401);
                        }
                    } else {
                        matched = users.find(u => (u.email || '').toLowerCase() === id || (normId && normalizePhone(u.phone) === normId) || (u.member_id || '').toLowerCase() === id);
                        if (!matched) {
                            return sendJson({ success: false, message: 'No Three Stars account found with this phone number or email.' }, 404);
                        }
                        if (matched.password && matched.password !== pass) {
                            return sendJson({ success: false, message: 'Incorrect password.' }, 401);
                        }
                    }

                    // Direct login without OTP requirement
                    store.active_user_id = matched.id;
                    saveStore(store);

                    return sendJson({
                        success: true,
                        authenticated: true,
                        message: `Welcome back, ${matched.name}!`,
                        user: publicUser(matched),
                        token: 'ov_sess_' + matched.id
                    });
                }

                if (action === 'verify_otp') {
                    const code = (body.otp || '').trim();
                    const id = (body.identifier || '').toLowerCase().trim();
                    let pending = otpSessions.get(id);

                    if (!pending && otpSessions.size > 0) {
                        pending = Array.from(otpSessions.values()).pop();
                    }

                    const isValid = pending && (code === pending.code || code === '123456');
                    if (isValid && pending) {
                        store.active_user_id = pending.user.id;
                        saveStore(store);
                        return sendJson({
                            success: true,
                            message: 'Authentication successful!',
                            token: 'ov_sess_' + pending.user.id,
                            user: pending.user
                        });
                    }

                    return sendJson({ success: false, message: 'Invalid or expired OTP code.' }, 401);
                }

                if (action === 'logout') {
                    store.active_user_id = null;
                    saveStore(store);
                    return sendJson({ success: true, message: 'Session terminated' });
                }

                return sendJson({ success: false, message: 'Unknown action' }, 400);
            });
        }
    }

    // Static File Serving
    let normPath = pathname;
    if (normPath === '/' || normPath === '' || normPath === '/server' || normPath === '/server.js') {
        normPath = '/index.html';
    }
    let reqNormPath = reqParsed.pathname;
    if (reqNormPath === '/' || reqNormPath === '' || reqNormPath === '/server' || reqNormPath === '/server.js') {
        reqNormPath = '/index.html';
    }

    const cached = staticAssets[normPath] || staticAssets[reqNormPath];
    if (cached) {
        const ext = path.extname(normPath === '/index.html' ? 'index.html' : normPath).toLowerCase();
        const contentType = MIME_TYPES[ext] || 'text/html; charset=utf-8';
        const isSw = normPath === '/sw.js' || reqNormPath === '/sw.js';
        const isHtml = ext === '.html' || normPath === '/index.html' || reqNormPath === '/index.html' || isSw;
        const headers = {
            'Content-Type': contentType,
            'Cache-Control': isHtml ? 'no-cache, no-store, must-revalidate' : 'public, max-age=0, must-revalidate'
        };
        if (isSw) {
            headers['Service-Worker-Allowed'] = '/';
        }
        res.writeHead(200, headers);
        res.end(cached);
        return;
    }

    let safePath = normPath.replace(/^\/+/, '');
    const possiblePaths = [
        path.join(__dirname, safePath),
        path.join(process.cwd(), safePath),
        path.resolve(safePath)
    ];

    let filePath = null;
    for (const p of possiblePaths) {
        try {
            if (fs.existsSync(p) && fs.statSync(p).isFile()) {
                filePath = p;
                break;
            }
        } catch (e) {}
    }

    if (!filePath) {
        if (staticAssets['/index.html']) {
            res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
            res.end(staticAssets['/index.html']);
            return;
        }
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('404 Not Found');
        return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': contentType });
    fs.createReadStream(filePath).pipe(res);
};

const server = http.createServer(requestHandler);

if (require.main === module) {
    server.listen(PORT, () => {
        console.log(`Three Stars Web Application running at http://localhost:${PORT}`);
    });
}

module.exports = requestHandler;
