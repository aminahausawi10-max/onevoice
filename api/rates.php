<?php
/**
 * ONE VOICE - Calling Rates API
 * Returns supported countries, dial codes, rates, and roaming savings
 */

require_once __DIR__ . '/db.php';

$pdo = getDbConnection();
$search = isset($_GET['search']) ? trim(strtolower($_GET['search'])) : '';

$defaultRates = [
    ["country_name" => "United States", "country_code" => "US", "dial_code" => "+1", "flag" => "🇺🇸", "rate" => 0.0120, "roaming" => 1.25, "popular" => true],
    ["country_name" => "United Kingdom", "country_code" => "GB", "dial_code" => "+44", "flag" => "🇬🇧", "rate" => 0.0180, "roaming" => 1.80, "popular" => true],
    ["country_name" => "Nigeria", "country_code" => "NG", "dial_code" => "+234", "flag" => "🇳🇬", "rate" => 0.0750, "roaming" => 2.50, "popular" => true],
    ["country_name" => "India", "country_code" => "IN", "dial_code" => "+91", "flag" => "🇮🇳", "rate" => 0.0190, "roaming" => 1.50, "popular" => true],
    ["country_name" => "Canada", "country_code" => "CA", "dial_code" => "+1", "flag" => "🇨🇦", "rate" => 0.0120, "roaming" => 1.25, "popular" => true],
    ["country_name" => "Ghana", "country_code" => "GH", "dial_code" => "+233", "flag" => "🇬🇭", "rate" => 0.1200, "roaming" => 2.80, "popular" => true],
    ["country_name" => "Kenya", "country_code" => "KE", "dial_code" => "+254", "flag" => "🇰🇪", "rate" => 0.0950, "roaming" => 2.40, "popular" => true],
    ["country_name" => "South Africa", "country_code" => "ZA", "dial_code" => "+27", "flag" => "🇿🇦", "rate" => 0.0550, "roaming" => 2.00, "popular" => true],
    ["country_name" => "Germany", "country_code" => "DE", "dial_code" => "+49", "flag" => "🇩🇪", "rate" => 0.0220, "roaming" => 1.90, "popular" => false],
    ["country_name" => "France", "country_code" => "FR", "dial_code" => "+33", "flag" => "🇫🇷", "rate" => 0.0220, "roaming" => 1.90, "popular" => false],
    ["country_name" => "United Arab Emirates", "country_code" => "AE", "dial_code" => "+971", "flag" => "🇦🇪", "rate" => 0.1400, "roaming" => 3.00, "popular" => true],
    ["country_name" => "Saudi Arabia", "country_code" => "SA", "dial_code" => "+966", "flag" => "🇸🇦", "rate" => 0.1100, "roaming" => 2.80, "popular" => false],
    ["country_name" => "Australia", "country_code" => "AU", "dial_code" => "+61", "flag" => "🇦🇺", "rate" => 0.0250, "roaming" => 2.20, "popular" => false],
    ["country_name" => "Philippines", "country_code" => "PH", "dial_code" => "+63", "flag" => "🇵🇭", "rate" => 0.0890, "roaming" => 2.60, "popular" => true],
    ["country_name" => "China", "country_code" => "CN", "dial_code" => "+86", "flag" => "🇨🇳", "rate" => 0.0190, "roaming" => 1.70, "popular" => false],
    ["country_name" => "Brazil", "country_code" => "BR", "dial_code" => "+55", "flag" => "🇧🇷", "rate" => 0.0350, "roaming" => 2.10, "popular" => false],
    ["country_name" => "Mexico", "country_code" => "MX", "dial_code" => "+52", "flag" => "🇲🇽", "rate" => 0.0200, "roaming" => 1.50, "popular" => false],
    ["country_name" => "Pakistan", "country_code" => "PK", "dial_code" => "+92", "flag" => "🇵🇰", "rate" => 0.0480, "roaming" => 2.20, "popular" => false],
    ["country_name" => "Jamaica", "country_code" => "JM", "dial_code" => "+1876", "flag" => "🇯🇲", "rate" => 0.1800, "roaming" => 3.20, "popular" => false],
    ["country_name" => "Spain", "country_code" => "ES", "dial_code" => "+34", "flag" => "🇪🇸", "rate" => 0.0210, "roaming" => 1.80, "popular" => false],
    ["country_name" => "Italy", "country_code" => "IT", "dial_code" => "+39", "flag" => "🇮🇹", "rate" => 0.0240, "roaming" => 1.80, "popular" => false]
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
    "currency" => "USD",
    "rates" => $rates
]);
