<?php
/**
 * ONE VOICE - Database Connection Helper & Resilient Store
 * Supports Neon PostgreSQL via PDO with fallback to JSON store
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Paystack-Signature, X-Webhook-Secret');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

function getDbConnection() {
    static $pdo = null;
    if ($pdo !== null) {
        return $pdo;
    }

    $dbUrl = getenv('DATABASE_URL');
    if ($dbUrl) {
        try {
            $parsed = parse_url($dbUrl);
            $host = $parsed['host'] ?? 'localhost';
            $port = $parsed['port'] ?? 5432;
            $user = $parsed['user'] ?? '';
            $pass = $parsed['pass'] ?? '';
            $dbname = ltrim($parsed['path'] ?? '', '/');
            
            $dsn = "pgsql:host={$host};port={$port};dbname={$dbname};sslmode=require";
            $pdo = new PDO($dsn, $user, $pass, [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_TIMEOUT => 5
            ]);
            return $pdo;
        } catch (Exception $e) {
            error_log("Postgres connection error: " . $e->getMessage());
        }
    }
    return null;
}

// Fallback JSON Store Helper
function getLocalStore() {
    $filePath = __DIR__ . '/../data/store.json';
    if (!file_exists(dirname($filePath))) {
        mkdir(dirname($filePath), 0777, true);
    }
    
    if (!file_exists($filePath)) {
        $defaultData = [
            "settings" => [
                "platform_revenue_share_pct" => 10.0,
                "platform_fixed_fee" => 0.0,
                "nigeria_call_rate_per_min" => 12.00,
                "carrier_wholesale_cost_per_min" => 8.50,
                "currency" => "NGN",
                "virtual_bank_provider" => "Wema Bank (ONE VOICE NUBAN)"
            ],
            "user" => [
                "id" => 1,
                "member_id" => "OV-784920",
                "name" => "Alex Morgan",
                "phone" => "+2348031234567", // Phone number acts as ONE VOICE Account Number
                "email" => "demo@onevoice.app",
                "virtual_bank_name" => "Wema Bank (ONE VOICE)",
                "virtual_account_number" => "9803123456",
                "virtual_account_name" => "ONE VOICE / Alex Morgan",
                "language" => "en",
                "role" => "admin",
                "status" => "active",
                "is_verified" => true
            ],
            "wallet" => [
                "balance" => 18000.00,
                "currency" => "NGN"
            ],
            "wallet_ledger" => [
                [
                    "id" => 1,
                    "user_id" => 1,
                    "transaction_type" => "bank_deposit",
                    "gross_amount" => 20000.00,
                    "platform_fee" => 2000.00,
                    "net_credited" => 18000.00,
                    "balance_before" => 0.00,
                    "balance_after" => 18000.00,
                    "channel" => "bank_transfer",
                    "provider_reference" => "BANK-WEMA-9803123456-01",
                    "internal_reference" => "OV-DEP-99201",
                    "narration" => "Bank Transfer via Wema NUBAN - Platform Share: 10% (₦2,000.00)",
                    "status" => "successful",
                    "created_at" => date("Y-m-d H:i:s", strtotime("-3 hours"))
                ]
            ],
            "platform_revenue_ledger" => [
                [
                    "id" => 1,
                    "source_type" => "deposit_share",
                    "source_reference" => "OV-DEP-99201",
                    "user_id" => 1,
                    "amount" => 2000.00,
                    "cumulative_platform_revenue" => 2000.00,
                    "settlement_status" => "settled",
                    "settled_at" => date("Y-m-d H:i:s", strtotime("-3 hours")),
                    "created_at" => date("Y-m-d H:i:s", strtotime("-3 hours"))
                ]
            ],
            "call_logs" => [
                [
                    "id" => 1,
                    "destination_number" => "+2348023456789",
                    "destination_country" => "Nigeria (MTN)",
                    "duration_seconds" => 120,
                    "retail_rate_per_min" => 12.00,
                    "cost" => 24.00,
                    "carrier_cost" => 17.00,
                    "platform_margin" => 7.00,
                    "status" => "completed",
                    "created_at" => date("Y-m-d H:i:s", strtotime("-1 hour"))
                ]
            ],
            "contacts" => [
                ["id" => 1, "name" => "Aminu Kano", "phone" => "+2348023456789", "country" => "Nigeria"],
                ["id" => 2, "name" => "Chinedu Okeke", "phone" => "+2348109876543", "country" => "Nigeria"],
                ["id" => 3, "name" => "Folake Adeleke", "phone" => "+2349012345678", "country" => "Nigeria"]
            ],
            "users" => []
        ];
        file_put_contents($filePath, json_encode($defaultData, JSON_PRETTY_PRINT));
    }
    
    return json_decode(file_get_contents($filePath), true);
}

function saveLocalStore($data) {
    $filePath = __DIR__ . '/../data/store.json';
    file_put_contents($filePath, json_encode($data, JSON_PRETTY_PRINT));
}
