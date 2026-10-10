<?php
/**
 * ONE VOICE - Database Connection Helper
 * Supports Neon PostgreSQL via PDO with fallback to JSON store
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

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
    
    // Check if DATABASE_URL or individual PG credentials exist
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
            // Neon connection failed or not yet provisioned; fall back safely
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
            "user" => [
                "id" => 1,
                "name" => "Alex Morgan",
                "phone" => "+1 (415) 555-2671",
                "email" => "alex.morgan@onevoice.app"
            ],
            "wallet" => [
                "balance" => 15.00,
                "currency" => "USD"
            ],
            "transactions" => [
                [
                    "id" => 1,
                    "type" => "topup",
                    "amount" => 15.00,
                    "balance_after" => 15.00,
                    "description" => "Initial Welcome Bonus Credit",
                    "created_at" => date("Y-m-d H:i:s", strtotime("-2 hours"))
                ]
            ],
            "call_logs" => [
                [
                    "id" => 1,
                    "destination_number" => "+44 20 7946 0991",
                    "destination_country" => "United Kingdom",
                    "duration_seconds" => 142,
                    "cost" => 0.0426,
                    "status" => "completed",
                    "created_at" => date("Y-m-d H:i:s", strtotime("-45 minutes"))
                ],
                [
                    "id" => 2,
                    "destination_number" => "+234 803 123 4567",
                    "destination_country" => "Nigeria",
                    "duration_seconds" => 85,
                    "cost" => 0.1062,
                    "status" => "completed",
                    "created_at" => date("Y-m-d H:i:s", strtotime("-1 day"))
                ]
            ]
        ];
        file_put_contents($filePath, json_encode($defaultData, JSON_PRETTY_PRINT));
    }
    
    return json_decode(file_get_contents($filePath), true);
}

function saveLocalStore($data) {
    $filePath = __DIR__ . '/../data/store.json';
    file_put_contents($filePath, json_encode($data, JSON_PRETTY_PRINT));
}
