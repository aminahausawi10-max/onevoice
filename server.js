/**
 * ONE VOICE - Local Dev Server & API Bridge
 * Serves static files and provides full API endpoint support for api/*.php
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

// Initial Data Seed
function getStore() {
    if (!fs.existsSync(DATA_FILE)) {
        const initial = {
            user: {
                id: 1,
                name: "Alex Morgan",
                phone: "+1 (415) 555-2671",
                email: "demo@onevoice.app"
            },
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

    // Helper to send JSON
    const sendJson = (data, status = 200) => {
        res.writeHead(status, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(data));
    };

    // Helper to parse POST JSON body
    const parseBody = (callback) => {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', () => {
            try {
                const parsed = body ? JSON.parse(body) : {};
                callback(parsed);
            } catch (err) {
                sendJson({ success: false, message: 'Invalid JSON body' }, 400);
            }
        });
    };

    // 1. API: Rates endpoint (api/rates.php or api/rates)
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

    // 2. API: Wallet endpoint (api/wallet.php or api/wallet)
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
                if (amount <= 0) {
                    return sendJson({ success: false, message: 'Invalid amount' }, 400);
                }
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

    // 3. API: Calls endpoint (api/calls.php or api/calls)
    if (pathname === '/api/calls.php' || pathname === '/api/calls') {
        const store = getStore();
        if (req.method === 'GET') {
            return sendJson({
                success: true,
                calls: store.call_logs.slice(-15).reverse()
            });
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

    // 4. API: Auth endpoint (api/auth.php or api/auth)
    if (pathname === '/api/auth.php' || pathname === '/api/auth') {
        const store = getStore();
        if (req.method === 'GET') {
            return sendJson({ success: true, user: store.user });
        }
        if (req.method === 'POST') {
            return parseBody((body) => {
                if (body.phone) store.user.phone = body.phone;
                if (body.name) store.user.name = body.name;
                saveStore(store);
                return sendJson({
                    success: true,
                    message: 'Authenticated successfully!',
                    token: 'ov_jwt_' + Math.random().toString(36).substring(2),
                    user: store.user
                });
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
