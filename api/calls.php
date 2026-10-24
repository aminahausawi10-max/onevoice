<?php
/**
 * Three Star - Call Detail Records (CDR) & Telephony Margin API
 * Tracks Nigerian & International Calls, Deducts Wallet Credits,
 * and Calculates Platform Profit Margins (Retail Rate - Carrier Cost)
 */

require_once __DIR__ . '/db.php';

$pdo = getDbConnection();
$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $store = getLocalStore();
    if ($pdo) {
        try {
            $stmt = $pdo->prepare("SELECT id, destination_number, destination_country, duration_seconds, retail_rate_per_min, cost, carrier_cost, platform_margin, status, started_at as created_at FROM call_logs WHERE user_id = 1 ORDER BY started_at DESC LIMIT 20");
            $stmt->execute();
            $calls = $stmt->fetchAll();
            echo json_encode(["success" => true, "calls" => $calls]);
            exit;
        } catch (Exception $e) {}
    }

    echo json_encode([
        "success" => true,
        "calls" => array_slice(array_reverse($store['call_logs'] ?? []), 0, 20)
    ]);
    exit;
}

if ($method === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    $destNumber = $input['destination_number'] ?? 'Unknown';
    $destCountry = $input['destination_country'] ?? 'Nigeria (All Networks)';
    $duration = intval($input['duration_seconds'] ?? 0);
    
    $store = getLocalStore();
    $retailRate = floatval($input['rate_per_minute'] ?? ($store['settings']['nigeria_call_rate_per_min'] ?? 12.00));
    $carrierCostRate = floatval($store['settings']['carrier_wholesale_cost_per_min'] ?? 8.50);

    // Calculate retail cost and wholesale provider cost
    $retailCost = round(($duration / 60.0) * $retailRate, 2);
    $carrierCost = round(($duration / 60.0) * $carrierCostRate, 2);
    $platformMargin = round(max(0, $retailCost - $carrierCost), 2);

    if ($retailCost < 0.20 && $duration > 0) {
        $retailCost = 0.20; // Minimum billable unit
    }

    $userId = 1;

    if ($pdo) {
        try {
            $pdo->beginTransaction();
            
            // Check & deduct from wallet
            $wStmt = $pdo->prepare("SELECT balance FROM wallets WHERE user_id = ? FOR UPDATE");
            $wStmt->execute([$userId]);
            $currBal = floatval($wStmt->fetchColumn() ?? 0.0);
            
            if ($currBal < $retailCost) {
                $pdo->rollBack();
                http_response_code(402);
                echo json_encode(["success" => false, "message" => "Insufficient funds in wallet for this call duration."]);
                exit;
            }

            $newBal = round($currBal - $retailCost, 2);
            $pdo->prepare("UPDATE wallets SET balance = ?, updated_at = NOW() WHERE user_id = ?")->execute([$newBal, $userId]);

            // Insert call log
            $insCall = $pdo->prepare("INSERT INTO call_logs (user_id, destination_number, destination_country, duration_seconds, retail_rate_per_min, cost, carrier_cost, platform_margin, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'completed') RETURNING id");
            $insCall->execute([$userId, $destNumber, $destCountry, $duration, $retailRate, $retailCost, $carrierCost, $platformMargin]);
            $callId = $insCall->fetchColumn();

            // Insert deduction into wallet ledger
            $ref = "OV-CALL-" . $callId;
            $narration = "Call to {$destCountry} ({$duration}s) @ â‚¦{$retailRate}/min";
            $pdo->prepare("INSERT INTO wallet_ledger (user_id, transaction_type, gross_amount, platform_fee, net_credited, balance_before, balance_after, channel, internal_reference, narration, status) VALUES (?, 'call_charge', ?, 0.00, ?, ?, ?, 'telephony_deduction', ?, ?, 'successful')")
                ->execute([$userId, $retailCost, -$retailCost, $currBal, $newBal, $ref, $narration]);

            // Record telephony margin into platform revenue ledger
            if ($platformMargin > 0) {
                $pdo->prepare("INSERT INTO platform_revenue_ledger (source_type, source_reference, user_id, amount, cumulative_platform_revenue, settlement_status, settled_at) VALUES ('telephony_margin', ?, ?, ?, (SELECT COALESCE(MAX(cumulative_platform_revenue), 0) + ? FROM platform_revenue_ledger), 'settled', NOW())")
                    ->execute([$ref, $userId, $platformMargin, $platformMargin]);
            }

            $pdo->commit();

            echo json_encode([
                "success" => true,
                "call_id" => $callId,
                "duration_seconds" => $duration,
                "cost" => $retailCost,
                "carrier_cost" => $carrierCost,
                "platform_margin" => $platformMargin,
                "new_balance" => $newBal
            ]);
            exit;
        } catch (Exception $e) {
            $pdo->rollBack();
        }
    }

    // Fallback Store
    $currBal = floatval($store['wallet']['balance'] ?? 0.0);
    if ($currBal < $retailCost) {
        http_response_code(402);
        echo json_encode(["success" => false, "message" => "Insufficient funds in wallet for this call."]);
        exit;
    }

    $newBal = round($currBal - $retailCost, 2);
    $store['wallet']['balance'] = $newBal;

    $callRecord = [
        "id" => count($store['call_logs'] ?? []) + 1,
        "destination_number" => $destNumber,
        "destination_country" => $destCountry,
        "duration_seconds" => $duration,
        "retail_rate_per_min" => $retailRate,
        "cost" => $retailCost,
        "carrier_cost" => $carrierCost,
        "platform_margin" => $platformMargin,
        "status" => "completed",
        "created_at" => date("Y-m-d H:i:s")
    ];
    $store['call_logs'][] = $callRecord;

    $ref = "OV-CALL-" . $callRecord['id'];
    $narration = "Call to {$destCountry} ({$duration}s) @ â‚¦{$retailRate}/min";
    $store['wallet_ledger'][] = [
        "id" => count($store['wallet_ledger'] ?? []) + 1,
        "user_id" => $userId,
        "transaction_type" => "call_charge",
        "gross_amount" => $retailCost,
        "platform_fee" => 0.00,
        "net_credited" => -$retailCost,
        "balance_before" => $currBal,
        "balance_after" => $newBal,
        "channel" => "telephony_deduction",
        "internal_reference" => $ref,
        "narration" => $narration,
        "status" => "successful",
        "created_at" => date("Y-m-d H:i:s")
    ];

    if ($platformMargin > 0) {
        $cumRev = 0.0;
        if (!empty($store['platform_revenue_ledger'])) {
            $cumRev = floatval(end($store['platform_revenue_ledger'])['cumulative_platform_revenue'] ?? 0.0);
        }
        $cumRev += $platformMargin;

        $store['platform_revenue_ledger'][] = [
            "id" => count($store['platform_revenue_ledger'] ?? []) + 1,
            "source_type" => "telephony_margin",
            "source_reference" => $ref,
            "user_id" => $userId,
            "amount" => $platformMargin,
            "cumulative_platform_revenue" => $cumRev,
            "settlement_status" => "settled",
            "settled_at" => date("Y-m-d H:i:s"),
            "created_at" => date("Y-m-d H:i:s")
        ];
    }

    saveLocalStore($store);

    echo json_encode([
        "success" => true,
        "call_id" => $callRecord['id'],
        "duration_seconds" => $duration,
        "cost" => $retailCost,
        "carrier_cost" => $carrierCost,
        "platform_margin" => $platformMargin,
        "new_balance" => $newBal
    ]);
    exit;
}
