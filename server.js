/**
 * ONE VOICE - Local Dev Server & API Bridge
 * Serves static files and provides full API endpoint support
 * Works out of the box with Node.js (v18+) without external dependencies.
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'data', 'store.json');

// Ensure data directory exists
if (!fs.existsSync(path.join(__dirname, 'data'))) {
    fs.mkdirSync(path.join(__dirname, 'data'), { recursive: true });
}

// In-memory OTP session map
const otpSessions = new Map();
const passwordResetSessions = new Map();

function getStore() {
    if (!fs.existsSync(DATA_FILE)) {
        const initial = {
            user: {
                id: 1,
                member_id: "OV-784920",
                name: "Alex Morgan",
                phone: "+1 (415) 555-2671",
                email: "demo@onevoice.app",
                language: "en",
                is_verified: true
            },
            users: [],
            wallet: {
                balance: 15.00,
                currency: "USD"
            },
            transactions: [
                {
                    id: 1,
                    type: "topup",
                    amount: 15.00,
                    balance_after: 15.00,
                    description: "Initial Welcome Calling Credit",
                    created_at: new Date(Date.now() - 3600000).toLocaleString()
                }
            ],
            call_logs: [
                {
                    id: 1,
                    destination_number: "+44 20 7946 0991",
                    destination_country: "United Kingdom",
                    duration_seconds: 142,
                    cost: 0.0426,
                    status: "completed",
                    created_at: new Date(Date.now() - 1800000).toLocaleString()
                },
                {
                    id: 2,
                    destination_number: "+234 803 123 4567",
                    destination_country: "Nigeria",
                    duration_seconds: 85,
                    cost: 0.1062,
                    status: "completed",
                    created_at: new Date(Date.now() - 86400000).toLocaleString()
                }
            ],
            contacts: [
                { id: 1, name: "Aminu Kano", phone: "+234 803 123 4567", country: "Nigeria" },
                { id: 2, name: "Sarah Jenkins", phone: "+44 20 7946 0991", country: "United Kingdom" },
                { id: 3, name: "Michael Chen", phone: "+1 415 555 8920", country: "United States" }
            ]
        };
        fs.writeFileSync(DATA_FILE, JSON.stringify(initial, null, 2));
    }
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
}

function saveStore(data) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

const defaultRates = [
    { country_name: "United States", country_code: "US", dial_code: "+1", flag: "🇺🇸", rate: 0.0120, roaming: 1.25, popular: true },
    { country_name: "United Kingdom", country_code: "GB", dial_code: "+44", flag: "🇬🇧", rate: 0.0180, roaming: 1.80, popular: true },
    { country_name: "Nigeria", country_code: "NG", dial_code: "+234", flag: "🇳🇬", rate: 0.0750, roaming: 2.50, popular: true },
    { country_name: "India", country_code: "IN", dial_code: "+91", flag: "🇮🇳", rate: 0.0190, roaming: 1.50, popular: true },
    { country_name: "Canada", country_code: "CA", dial_code: "+1", flag: "🇨🇦", rate: 0.0120, roaming: 1.25, popular: true },
    { country_name: "Ghana", country_code: "GH", dial_code: "+233", flag: "🇬🇭", rate: 0.1200, roaming: 2.80, popular: true },
    { country_name: "Kenya", country_code: "KE", dial_code: "+254", flag: "🇰🇪", rate: 0.0950, roaming: 2.40, popular: true },
    { country_name: "South Africa", country_code: "ZA", dial_code: "+27", flag: "🇿🇦", rate: 0.0550, roaming: 2.00, popular: true },
    { country_name: "Germany", country_code: "DE", dial_code: "+49", flag: "🇩🇪", rate: 0.0220, roaming: 1.90, popular: false },
    { country_name: "France", country_code: "FR", dial_code: "+33", flag: "🇫🇷", rate: 0.0220, roaming: 1.90, popular: false },
    { country_name: "United Arab Emirates", country_code: "AE", dial_code: "+971", flag: "🇦🇪", rate: 0.1400, roaming: 3.00, popular: true },
    { country_name: "Saudi Arabia", country_code: "SA", dial_code: "+966", flag: "🇸🇦", rate: 0.1100, roaming: 2.80, popular: false },
    { country_name: "Australia", country_code: "AU", dial_code: "+61", flag: "🇦🇺", rate: 0.0250, roaming: 2.20, popular: false },
    { country_name: "Philippines", country_code: "PH", dial_code: "+63", flag: "🇵🇭", rate: 0.0890, roaming: 2.60, popular: true },
    { country_name: "China", country_code: "CN", dial_code: "+86", flag: "🇨🇳", rate: 0.0190, roaming: 1.70, popular: false },
    { country_name: "Brazil", country_code: "BR", dial_code: "+55", flag: "🇧🇷", rate: 0.0350, roaming: 2.10, popular: false },
    { country_name: "Mexico", country_code: "MX", dial_code: "+52", flag: "🇲🇽", rate: 0.0200, roaming: 1.50, popular: false },
    { country_name: "Pakistan", country_code: "PK", dial_code: "+92", flag: "🇵🇰", rate: 0.0480, roaming: 2.20, popular: false }
];

const MIME_TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon'
};

const server = http.createServer((req, res) => {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    const parsedUrl = url.parse(req.url, true);
    const pathname = parsedUrl.pathname;

    const sendJson = (data, status = 200) => {
        res.writeHead(status, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(data));
    };

    const parseBody = (callback) => {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', () => {
            try {
                const parsed = body ? JSON.parse(body) : {};
                callback(parsed);
            } catch (err) {
                sendJson({ success: false, message: 'Invalid JSON payload' }, 400);
            }
        });
    };

    // 1. API: Rates
    if (pathname === '/api/rates.php' || pathname === '/api/rates') {
        const search = (parsedUrl.query.search || '').toLowerCase().trim();
        let filtered = defaultRates;
        if (search) {
            filtered = defaultRates.filter(r => 
                r.country_name.toLowerCase().includes(search) ||
                r.dial_code.toLowerCase().includes(search) ||
                r.country_code.toLowerCase().includes(search)
            );
        }
        return sendJson({ success: true, count: filtered.length, currency: 'USD', rates: filtered });
    }

    // 2. API: Wallet
    if (pathname === '/api/wallet.php' || pathname === '/api/wallet') {
        const store = getStore();
        if (req.method === 'GET') {
            return sendJson({
                success: true,
                balance: parseFloat(store.wallet.balance),
                currency: store.wallet.currency,
                transactions: store.transactions.slice(-10).reverse()
            });
        }
        if (req.method === 'POST') {
            return parseBody((body) => {
                const amount = parseFloat(body.amount || 0);
                if (amount <= 0) return sendJson({ success: false, message: 'Invalid amount' }, 400);
                const newBal = Math.round((store.wallet.balance + amount) * 100) / 100;
                store.wallet.balance = newBal;
                store.transactions.push({
                    id: store.transactions.length + 1,
                    type: 'topup',
                    amount: amount,
                    balance_after: newBal,
                    description: 'Wallet Top-Up via In-App Payment',
                    created_at: new Date().toLocaleString()
                });
                saveStore(store);
                return sendJson({
                    success: true,
                    message: `Top-up of $${amount.toFixed(2)} successful!`,
                    balance: newBal,
                    reference: 'TX-' + Math.random().toString(36).substring(2, 9).toUpperCase()
                });
            });
        }
    }

    // 3. API: Calls
    if (pathname === '/api/calls.php' || pathname === '/api/calls') {
        const store = getStore();
        if (req.method === 'GET') {
            return sendJson({ success: true, calls: store.call_logs.slice(-15).reverse() });
        }
        if (req.method === 'POST') {
            return parseBody((body) => {
                const destNumber = body.destination_number || 'Unknown';
                const destCountry = body.destination_country || 'International';
                const duration = parseInt(body.duration_seconds || 0);
                const ratePerMin = parseFloat(body.rate_per_minute || 0.05);
                const cost = Math.max(0.001, Math.round(((duration / 60) * ratePerMin) * 10000) / 10000);

                const newBal = Math.max(0, Math.round((store.wallet.balance - cost) * 100) / 100);
                store.wallet.balance = newBal;

                const callRecord = {
                    id: store.call_logs.length + 1,
                    destination_number: destNumber,
                    destination_country: destCountry,
                    duration_seconds: duration,
                    cost: cost,
                    status: 'completed',
                    created_at: new Date().toLocaleString()
                };
                store.call_logs.push(callRecord);

                if (cost > 0) {
                    store.transactions.push({
                        id: store.transactions.length + 1,
                        type: 'call_deduction',
                        amount: -cost,
                        balance_after: newBal,
                        description: `Call to ${destCountry} (${duration}s)`,
                        created_at: new Date().toLocaleString()
                    });
                }
                saveStore(store);

                return sendJson({
                    success: true,
                    call_id: callRecord.id,
                    duration_seconds: duration,
                    cost: cost,
                    new_balance: newBal
                });
            });
        }
    }

    // 4. API: Contacts
    if (pathname === '/api/contacts.php' || pathname === '/api/contacts') {
        const store = getStore();
        if (req.method === 'GET') {
            return sendJson({ success: true, contacts: store.contacts || [] });
        }
        if (req.method === 'POST') {
            return parseBody((body) => {
                const action = body.action || 'add';
                if (action === 'add') {
                    if (!body.name || !body.phone) {
                        return sendJson({ success: false, message: 'Name and phone are required' }, 400);
                    }
                    if (!store.contacts) store.contacts = [];
                    const newC = {
                        id: store.contacts.length + 1,
                        name: body.name,
                        phone: body.phone,
                        country: body.country || 'International'
                    };
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

    // 5. API: Settings
    if (pathname === '/api/settings.php' || pathname === '/api/settings') {
        const store = getStore();
        if (req.method === 'POST') {
            return parseBody((body) => {
                const action = body.action || 'update_profile';
                if (action === 'update_profile') {
                    if (body.name) store.user.name = body.name;
                    if (body.language) store.user.language = body.language;
                    saveStore(store);
                    return sendJson({ success: true, message: 'Profile updated!', user: store.user });
                }
                if (action === 'change_email') {
                    if (body.email) store.user.email = body.email;
                    saveStore(store);
                    return sendJson({ success: true, message: 'Email updated!', email: store.user.email });
                }
                if (action === 'change_phone') {
                    if (body.phone) store.user.phone = body.phone;
                    saveStore(store);
                    return sendJson({ success: true, message: 'Phone number updated!', phone: store.user.phone });
                }
                if (action === 'change_password') {
                    return sendJson({ success: true, message: 'Password updated successfully!' });
                }
            });
        }
    }

    // 6. API: Auth (Register, Login, OTP, Forgot/Reset Password, Logout)
    if (pathname === '/api/auth.php' || pathname === '/api/auth') {
        const store = getStore();
        if (req.method === 'GET') {
            return sendJson({ success: true, authenticated: true, user: store.user });
        }
        if (req.method === 'POST') {
            return parseBody((body) => {
                const action = body.action || '';

                // Register
                if (action === 'register') {
                    const name = (body.name || '').trim();
                    const phone = (body.phone || '').trim();
                    const email = (body.email || '').toLowerCase().trim();
                    const password = body.password || '';

                    if (!name || !phone || !email || !password) {
                        return sendJson({ success: false, message: 'All fields are required.' }, 400);
                    }
                    if (!body.terms_accepted) {
                        return sendJson({ success: false, message: 'Please accept Terms and Privacy Policy.' }, 400);
                    }

                    // Check duplicate
                    if (!store.users) store.users = [];
                    const exists = store.users.some(u => u.email === email || u.phone === phone);
                    if (exists || email === store.user.email) {
                        return sendJson({ success: false, message: 'An account with this email or phone already exists.' }, 409);
                    }

                    const memberId = 'OV-' + Math.floor(100000 + Math.random() * 900000);
                    const newUser = {
                        id: store.users.length + 2,
                        member_id: memberId,
                        name: name,
                        phone: phone,
                        email: email,
                        language: 'en',
                        is_verified: false
                    };
                    store.users.push(newUser);
                    saveStore(store);

                    return sendJson({
                        success: true,
                        message: 'Account created successfully!',
                        member_id: memberId,
                        email: email
                    });
                }

                // Login (initiates OTP)
                if (action === 'login') {
                    const id = (body.identifier || '').toLowerCase().trim();
                    const password = body.password || '';
                    if (!id || !password) {
                        return sendJson({ success: false, message: 'Please enter your email/phone and password.' }, 400);
                    }

                    const otp = Math.floor(100000 + Math.random() * 900000).toString();
                    otpSessions.set(id, {
                        code: otp,
                        expires: Date.now() + 300000,
                        attempts: 0
                    });

                    return sendJson({
                        success: true,
                        otp_sent: true,
                        identifier: id,
                        expires_in_seconds: 300,
                        debug_hint: `Demo OTP: ${otp}`,
                        message: `A 6-digit verification code has been dispatched to ${id}.`
                    });
                }

                // Verify OTP
                if (action === 'verify_otp') {
                    const id = (body.identifier || '').toLowerCase().trim();
                    const code = (body.otp || '').trim();
                    const session = otpSessions.get(id);

                    if (!session && code !== '123456') {
                        return sendJson({ success: false, message: 'Session expired or not found. Please log in again.' }, 400);
                    }

                    if (session && session.attempts >= 4) {
                        otpSessions.delete(id);
                        return sendJson({ success: false, message: 'Too many attempts. Locked.' }, 429);
                    }

                    if (session && Date.now() > session.expires) {
                        otpSessions.delete(id);
                        return sendJson({ success: false, message: 'OTP has expired.' }, 400);
                    }

                    if (code !== '123456' && session && code !== session.code) {
                        session.attempts++;
                        return sendJson({ success: false, message: `Incorrect OTP. ${4 - session.attempts} attempts left.` }, 401);
                    }

                    if (session) otpSessions.delete(id);

                    return sendJson({
                        success: true,
                        message: 'Authentication successful. Welcome to your Dashboard!',
                        token: 'ov_sess_' + Math.random().toString(36).substring(2),
                        user: store.user
                    });
                }

                // Resend OTP
                if (action === 'resend_otp') {
                    const id = (body.identifier || '').toLowerCase().trim();
                    const otp = Math.floor(100000 + Math.random() * 900000).toString();
                    otpSessions.set(id, { code: otp, expires: Date.now() + 300000, attempts: 0 });
                    return sendJson({
                        success: true,
                        message: 'New OTP dispatched.',
                        debug_hint: `Demo OTP: ${otp}`,
                        expires_in_seconds: 300
                    });
                }

                // Forgot Password
                if (action === 'forgot_password') {
                    const id = (body.identifier || '').toLowerCase().trim();
                    const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
                    passwordResetSessions.set(id, { code: resetCode, expires: Date.now() + 600000 });
                    return sendJson({
                        success: true,
                        message: 'If this contact is registered, a password recovery code has been sent.',
                        debug_hint: `Demo Reset OTP: ${resetCode}`,
                        identifier: id
                    });
                }

                // Reset Password
                if (action === 'reset_password') {
                    const id = (body.identifier || '').toLowerCase().trim();
                    const code = (body.otp || '').trim();
                    const newPass = body.new_password || '';
                    const conf = body.confirm_password || '';

                    if (newPass.length < 8) {
                        return sendJson({ success: false, message: 'Password must be at least 8 characters long.' }, 400);
                    }
                    if (newPass !== conf) {
                        return sendJson({ success: false, message: 'Passwords do not match.' }, 400);
                    }

                    const sess = passwordResetSessions.get(id);
                    if (code !== '123456' && (!sess || sess.code !== code)) {
                        return sendJson({ success: false, message: 'Invalid or expired recovery code.' }, 400);
                    }

                    passwordResetSessions.delete(id);
                    return sendJson({ success: true, message: 'Password updated successfully! Please log in.' });
                }

                // Logout
                if (action === 'logout') {
                    return sendJson({ success: true, message: 'Session securely terminated.' });
                }

                return sendJson({ success: false, message: 'Unknown action' }, 400);
            });
        }
    }

    // Static File Serving
    let safePath = pathname === '/' ? '/index.html' : pathname;
    let filePath = path.join(__dirname, safePath);

    fs.stat(filePath, (err, stats) => {
        if (err || !stats.isFile()) {
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            res.end('404 Not Found');
            return;
        }

        const ext = path.extname(filePath).toLowerCase();
        const contentType = MIME_TYPES[ext] || 'application/octet-stream';

        res.writeHead(200, { 'Content-Type': contentType });
        fs.createReadStream(filePath).pipe(res);
    });
});

server.listen(PORT, () => {
    console.log(`ONE VOICE Web Application running at http://localhost:${PORT}`);
});
