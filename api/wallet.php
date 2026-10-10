<?php
/**
 * ONE VOICE - Wallet & Transaction API
 * Handles user balance, balance top-ups, and transaction logs
 */

require_once __DIR__ . '/db.php';

$pdo = getDbConnection();
$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    if ($pdo) {
        try {
            $stmt = $pdo->prepare("SELECT balance, currency FROM wallets WHERE user_id = 1");
            $stmt->execute();
            $wallet = $stmt->fetch();
            
            $txStmt = $pdo->prepare("SELECT id, type, amount, balance_after, description, created_at FROM transactions WHERE user_id = 1 ORDER BY created_at DESC LIMIT 10");
            $txStmt->execute();
            $transactions = $txStmt->fetchAll();

            echo json_encode([
                "success" => true,
                "balance" => floatval($wallet['balance'] ?? 15.00),
                "currency" => $wallet['currency'] ?? 'USD',
                "transactions" => $transactions
            ]);
            exit;
        } catch (Exception $e) {
            // fallback
        }
    }

    $store = getLocalStore();
    echo json_encode([
        "success" => true,
        "balance" => floatval($store['wallet']['balance']),
        "currency" => $store['wallet']['currency'],
        "transactions" => array_slice(array_reverse($store['transactions']), 0, 10)
    ]);
    exit;
}

if ($method === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    $action = $input['action'] ?? 'topup';
    $amount = floatval($input['amount'] ?? 0);

    if ($amount <= 0) {
        http_response_code(400);
        echo json_encode(["success" => false, "message" => "Top-up amount must be greater than $0.00"]);
        exit;
    }

    if ($pdo) {
        try {
            $pdo->beginTransaction();
            $stmt = $pdo->prepare("SELECT balance FROM wallets WHERE user_id = 1 FOR UPDATE");
            $stmt->execute();
            $currBalance = floatval($stmt->fetchColumn() ?? 0);
            
            $newBalance = $currBalance + $amount;
            
            $upd = $pdo->prepare("UPDATE wallets SET balance = ?, updated_at = NOW() WHERE user_id = 1");
            $upd->execute([$newBalance]);

            $tx = $pdo->prepare("INSERT INTO transactions (user_id, type, amount, balance_after, description, reference) VALUES (1, 'topup', ?, ?, ?, ?)");
            $ref = 'TX-' . strtoupper(substr(md5(uniqid()), 0, 10));
            $desc = 'Wallet Top-Up via Card / In-App';
            $tx->execute([$amount, $newBalance, $desc, $ref]);

            $pdo->commit();

            echo json_encode([
                "success" => true,
                "message" => "Top-up of \${$amount} successful!",
                "balance" => $newBalance,
                "reference" => $ref
            ]);
            exit;
        } catch (Exception $e) {
            $pdo->rollBack();
            // fallback
        }
    }

    $store = getLocalStore();
    $current = floatval($store['wallet']['balance']);
    $newBalance = round($current + $amount, 2);
    $store['wallet']['balance'] = $newBalance;

    $newTx = [
        "id" => count($store['transactions']) + 1,
        "type" => "topup",
        "amount" => $amount,
        "balance_after" => $newBalance,
        "description" => "Wallet Top-Up via In-App Payment",
        "created_at" => date("Y-m-d H:i:s")
    ];
    $store['transactions'][] = $newTx;
    saveLocalStore($store);

    echo json_encode([
        "success" => true,
        "message" => "Top-up of $" . number_format($amount, 2) . " successful!",
        "balance" => $newBalance,
        "reference" => "TX-" . strtoupper(substr(md5(uniqid()), 0, 8))
    ]);
    exit;
}
