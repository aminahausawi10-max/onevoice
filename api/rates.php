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
    ["country_name" => "Egypt", "country_code" => "EG", "dial_code" => "+20", "flag" => "🇪🇬", "rate" => 38.00, "roaming" => 260.00, "popular" => true],
    ["country_name" => "Benin", "country_code" => "BJ", "dial_code" => "+229", "flag" => "🇧🇯", "rate" => 42.00, "roaming" => 260.00, "popular" => true],
    ["country_name" => "Togo", "country_code" => "TG", "dial_code" => "+228", "flag" => "🇹🇬", "rate" => 44.00, "roaming" => 270.00, "popular" => false],
    ["country_name" => "Ivory Coast", "country_code" => "CI", "dial_code" => "+225", "flag" => "🇨🇮", "rate" => 46.00, "roaming" => 280.00, "popular" => false],
    ["country_name" => "Senegal", "country_code" => "SN", "dial_code" => "+221", "flag" => "🇸🇳", "rate" => 48.00, "roaming" => 290.00, "popular" => false],
    ["country_name" => "Uganda", "country_code" => "UG", "dial_code" => "+256", "flag" => "🇺🇬", "rate" => 34.00, "roaming" => 230.00, "popular" => false],
    ["country_name" => "Tanzania", "country_code" => "TZ", "dial_code" => "+255", "flag" => "🇹🇿", "rate" => 36.00, "roaming" => 240.00, "popular" => false],
    ["country_name" => "Rwanda", "country_code" => "RW", "dial_code" => "+250", "flag" => "🇷🇼", "rate" => 35.00, "roaming" => 240.00, "popular" => false],
    ["country_name" => "Ethiopia", "country_code" => "ET", "dial_code" => "+251", "flag" => "🇪🇹", "rate" => 45.00, "roaming" => 280.00, "popular" => false],
    ["country_name" => "Sudan", "country_code" => "SD", "dial_code" => "+249", "flag" => "🇸🇩", "rate" => 48.00, "roaming" => 290.00, "popular" => false],
    ["country_name" => "Morocco", "country_code" => "MA", "dial_code" => "+212", "flag" => "🇲🇦", "rate" => 40.00, "roaming" => 260.00, "popular" => false],
    ["country_name" => "Algeria", "country_code" => "DZ", "dial_code" => "+213", "flag" => "🇩🇿", "rate" => 42.00, "roaming" => 270.00, "popular" => false],
    ["country_name" => "India", "country_code" => "IN", "dial_code" => "+91", "flag" => "🇮🇳", "rate" => 15.00, "roaming" => 150.00, "popular" => true],
    ["country_name" => "Pakistan", "country_code" => "PK", "dial_code" => "+92", "flag" => "🇵🇰", "rate" => 20.00, "roaming" => 170.00, "popular" => false],
    ["country_name" => "Bangladesh", "country_code" => "BD", "dial_code" => "+880", "flag" => "🇧🇩", "rate" => 22.00, "roaming" => 180.00, "popular" => false],
    ["country_name" => "China", "country_code" => "CN", "dial_code" => "+86", "flag" => "🇨🇳", "rate" => 20.00, "roaming" => 170.00, "popular" => true],
    ["country_name" => "Malaysia", "country_code" => "MY", "dial_code" => "+60", "flag" => "🇲🇾", "rate" => 22.00, "roaming" => 180.00, "popular" => true],
    ["country_name" => "Indonesia", "country_code" => "ID", "dial_code" => "+62", "flag" => "🇮🇩", "rate" => 24.00, "roaming" => 180.00, "popular" => false],
    ["country_name" => "Philippines", "country_code" => "PH", "dial_code" => "+63", "flag" => "🇵🇭", "rate" => 30.00, "roaming" => 210.00, "popular" => false],
    ["country_name" => "Turkey", "country_code" => "TR", "dial_code" => "+90", "flag" => "🇹🇷", "rate" => 32.00, "roaming" => 220.00, "popular" => false],
    ["country_name" => "Qatar", "country_code" => "QA", "dial_code" => "+974", "flag" => "🇶🇦", "rate" => 40.00, "roaming" => 270.00, "popular" => true],
    ["country_name" => "Kuwait", "country_code" => "KW", "dial_code" => "+965", "flag" => "🇰🇼", "rate" => 38.00, "roaming" => 260.00, "popular" => false],
    ["country_name" => "Oman", "country_code" => "OM", "dial_code" => "+968", "flag" => "🇴🇲", "rate" => 42.00, "roaming" => 280.00, "popular" => false],
    ["country_name" => "Germany", "country_code" => "DE", "dial_code" => "+49", "flag" => "🇩🇪", "rate" => 25.00, "roaming" => 190.00, "popular" => false],
    ["country_name" => "France", "country_code" => "FR", "dial_code" => "+33", "flag" => "🇫🇷", "rate" => 25.00, "roaming" => 190.00, "popular" => false],
    ["country_name" => "Italy", "country_code" => "IT", "dial_code" => "+39", "flag" => "🇮🇹", "rate" => 26.00, "roaming" => 195.00, "popular" => false],
    ["country_name" => "Spain", "country_code" => "ES", "dial_code" => "+34", "flag" => "🇪🇸", "rate" => 26.00, "roaming" => 195.00, "popular" => false],
    ["country_name" => "Netherlands", "country_code" => "NL", "dial_code" => "+31", "flag" => "🇳🇱", "rate" => 25.00, "roaming" => 190.00, "popular" => false],
    ["country_name" => "Switzerland", "country_code" => "CH", "dial_code" => "+41", "flag" => "🇨🇭", "rate" => 28.00, "roaming" => 200.00, "popular" => false],
    ["country_name" => "Australia", "country_code" => "AU", "dial_code" => "+61", "flag" => "🇦🇺", "rate" => 24.00, "roaming" => 185.00, "popular" => false],
    ["country_name" => "Brazil", "country_code" => "BR", "dial_code" => "+55", "flag" => "🇧🇷", "rate" => 30.00, "roaming" => 210.00, "popular" => false],
    ["country_name" => "Ireland", "country_code" => "IE", "dial_code" => "+353", "flag" => "🇮🇪", "rate" => 24.00, "roaming" => 180.00, "popular" => false]
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
