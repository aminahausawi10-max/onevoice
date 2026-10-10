<?php
/**
 * ONE VOICE - Call Detail Records (CDR) API
 * Logs call duration, deducts calling credit, and returns call history
 */

require_once __DIR__ . '/db.php';

$pdo = getDbConnection();
$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    if ($pdo) {
        try {
            $stmt = $pdo->prepare("SELECT id, destination_number, destination_country, duration_seconds, cost, status, started_at as created_at FROM call_logs WHERE user_id = 1 ORDER BY started_at DESC LIMIT 15");
            $stmt->execute();
            $calls = $stmt->fetchAll();
            echo json_encode(["success" => true, "calls" => $calls]);
            exit;
        } catch (Exception $e) {
            // fallback
        }
    }

    $store = getLocalStore();
    echo json_encode([
        "success" => true,
        "calls" => array_slice(array_reverse($store['call_logs']), 0, 15)
    ]);
    exit;
}

if ($method === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    $destNumber = $input['destination_number'] ?? 'Unknown';
    $destCountry = $input['destination_country'] ?? 'International';
    $duration = intval($input['duration_seconds'] ?? 0);
    $ratePerMin = floatval($input['rate_per_minute'] ?? 0.05);

    // Calculate call cost based on duration in seconds
    $cost = round(($duration / 60) * $ratePerMin, 4);
    if ($cost < 0.001 && $duration > 0) {
        $cost = 0.001; // minimal fraction
    }

    if ($pdo) {
        try {
            $pdo->beginTransaction();
            
            // Deduct from wallet
            $wStmt = $pdo->prepare("SELECT balance FROM wallets WHERE user_id = 1 FOR UPDATE");
            $wStmt->execute();
            $currBal = floatval($wStmt->fetchColumn() ?? 0);
            
            $newBal = max(0, $currBal - $cost);
            $updBal = $pdo->prepare("UPDATE wallets SET balance = ?, updated_at = NOW() WHERE user_id = 1");
            $updBal->execute([$newBal]);

            // Insert call log
            $insCall = $pdo->prepare("INSERT INTO call_logs (user_id, destination_number, destination_country, duration_seconds, cost, status) VALUES (1, ?, ?, ?, ?, 'completed') RETURNING id");
            $insCall->execute([$destNumber, $destCountry, $duration, $cost]);
            $callId = $insCall->fetchColumn();

            // Insert deduction transaction
            if ($cost > 0) {
                $tx = $pdo->prepare("INSERT INTO transactions (user_id, type, amount, balance_after, description, reference) VALUES (1, 'call_deduction', ?, ?, ?, ?)");
                $desc = "Call to {$destCountry} ({$duration}s)";
                $ref = "CDR-{$callId}";
                $tx->execute([-$cost, $newBal, $desc, $ref]);
            }

            $pdo->commit();

            echo json_encode([
                "success" => true,
                "call_id" => $callId,
                "duration_seconds" => $duration,
                "cost" => $cost,
                "new_balance" => $newBal
            ]);
            exit;
        } catch (Exception $e) {
            $pdo->rollBack();
            // fallback
        }
    }

    $store = getLocalStore();
    $currBal = floatval($store['wallet']['balance']);
    $newBal = round(max(0, $currBal - $cost), 2);
    $store['wallet']['balance'] = $newBal;

    $callRecord = [
        "id" => count($store['call_logs']) + 1,
        "destination_number" => $destNumber,
        "destination_country" => $destCountry,
        "duration_seconds" => $duration,
        "cost" => $cost,
        "status" => "completed",
        "created_at" => date("Y-m-d H:i:s")
    ];
    $store['call_logs'][] = $callRecord;

    if ($cost > 0) {
        $store['transactions'][] = [
            "id" => count($store['transactions']) + 1,
            "type" => "call_deduction",
            "amount" => -$cost,
            "balance_after" => $newBal,
            "description" => "Call to {$destCountry} ({$duration}s)",
            "created_at" => date("Y-m-d H:i:s")
        ];
    }
    saveLocalStore($store);

    echo json_encode([
        "success" => true,
        "call_id" => $callRecord['id'],
        "duration_seconds" => $duration,
        "cost" => $cost,
        "new_balance" => $newBal
    ]);
    exit;
}
