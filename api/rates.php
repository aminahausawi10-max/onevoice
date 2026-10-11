<?php
/**
 * ONE VOICE - Calling Rates API
 * Returns supported countries, dial codes, rates, and roaming savings
 */

require_once __DIR__ . '/db.php';

$pdo = getDbConnection();
$search = isset($_GET['search']) ? trim(strtolower($_GET['search'])) : '';

$defaultRates = [
    ["country_name" => "Nigeria (All Networks)", "country_code" => "NG", "dial_code" => "+234", "flag" => "🇳🇬", "rate" => 12.00, "roaming" => 45.00, "popular" => true],
    ["country_name" => "United States", "country_code" => "US", "dial_code" => "+1", "flag" => "🇺🇸", "rate" => 18.00, "roaming" => 180.00, "popular" => true],
    ["country_name" => "United Kingdom", "country_code" => "GB", "dial_code" => "+44", "flag" => "🇬🇧", "rate" => 22.00, "roaming" => 220.00, "popular" => true],
    ["country_name" => "Canada", "country_code" => "CA", "dial_code" => "+1", "flag" => "🇨🇦", "rate" => 18.00, "roaming" => 180.00, "popular" => true],
    ["country_name" => "Ghana", "country_code" => "GH", "dial_code" => "+233", "flag" => "🇬🇭", "rate" => 35.00, "roaming" => 250.00, "popular" => true],
    ["country_name" => "Saudi Arabia", "country_code" => "SA", "dial_code" => "+966", "flag" => "🇸🇦", "rate" => 40.00, "roaming" => 280.00, "popular" => true],
    ["country_name" => "United Arab Emirates", "country_code" => "AE", "dial_code" => "+971", "flag" => "🇦🇪", "rate" => 42.00, "roaming" => 300.00, "popular" => true],
    ["country_name" => "Niger", "country_code" => "NE", "dial_code" => "+227", "flag" => "🇳🇪", "rate" => 45.00, "roaming" => 260.00, "popular" => true],
    ["country_name" => "Cameroon", "country_code" => "CM", "dial_code" => "+237", "flag" => "🇨🇲", "rate" => 40.00, "roaming" => 250.00, "popular" => true],
    ["country_name" => "South Africa", "country_code" => "ZA", "dial_code" => "+27", "flag" => "🇿🇦", "rate" => 28.00, "roaming" => 200.00, "popular" => true],
    ["country_name" => "Kenya", "country_code" => "KE", "dial_code" => "+254", "flag" => "🇰🇪", "rate" => 32.00, "roaming" => 240.00, "popular" => true],
    ["country_name" => "India", "country_code" => "IN", "dial_code" => "+91", "flag" => "🇮🇳", "rate" => 15.00, "roaming" => 150.00, "popular" => true],
    ["country_name" => "China", "country_code" => "CN", "dial_code" => "+86", "flag" => "🇨🇳", "rate" => 20.00, "roaming" => 170.00, "popular" => true],
    ["country_name" => "Germany", "country_code" => "DE", "dial_code" => "+49", "flag" => "🇩🇪", "rate" => 25.00, "roaming" => 190.00, "popular" => false],
    ["country_name" => "France", "country_code" => "FR", "dial_code" => "+33", "flag" => "🇫🇷", "rate" => 25.00, "roaming" => 190.00, "popular" => false],
    ["country_name" => "Malaysia", "country_code" => "MY", "dial_code" => "+60", "flag" => "🇲🇾", "rate" => 22.00, "roaming" => 180.00, "popular" => false]
];

$rates = $defaultRates;

// If Postgres is connected, query DB
if ($pdo) {
    try {
        $stmt = $pdo->query("SELECT country_name, country_code, dial_code, flag_emoji as flag, rate_per_minute as rate, roaming_rate as roaming, is_popular as popular FROM calling_rates ORDER BY is_popular DESC, country_name ASC");
        $dbRates = $stmt->fetchAll();
        if (!empty($dbRates)) {
            $rates = $dbRates;
        }
    } catch (Exception $e) {
        // Fall back to defaultRates
    }
}

// Filter if search query exists
if (!empty($search)) {
    $rates = array_values(array_filter($rates, function($item) use ($search) {
        return (
            strpos(strtolower($item['country_name']), $search) !== false ||
            strpos(strtolower($item['country_code']), $search) !== false ||
            strpos(strtolower($item['dial_code']), $search) !== false
        );
    }));
}

echo json_encode([
    "success" => true,
    "count" => count($rates),
    "currency" => "NGN",
    "rates" => $rates
]);
