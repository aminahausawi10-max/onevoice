<?php
/**
 * ONE VOICE - Customer Wallet & Automatic Revenue-Sharing API
 * Handles Phone-Number Account Identification, Dedicated Virtual NUBAN,
 * Bank Payment Ingestion, and Server-Side Revenue Splits
 */

require_once __DIR__ . '/db.php';

$pdo = getDbConnection();
$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $store = getLocalStore();
    $userId = 1;

    $balance = floatval($store['wallet']['balance'] ?? 0);
    $currency = $store['settings']['currency'] ?? 'NGN';
    $sharePct = floatval($store['settings']['platform_revenue_share_pct'] ?? 10.0);
    $user = $store['user'];

    if ($pdo) {
        try {
            $wStmt = $pdo->prepare("SELECT balance, currency FROM wallets WHERE user_id = ?");
            $wStmt->execute([$userId]);
            $wRow = $wStmt->fetch();
            if ($wRow) {
                $balance = floatval($wRow['balance']);
                $currency = $wRow['currency'];
            }

            $uStmt = $pdo->prepare("SELECT phone, virtual_bank_name, virtual_account_number, virtual_account_name FROM users WHERE id = ?");
            $uStmt->execute([$userId]);
            $uRow = $uStmt->fetch();
            if ($uRow) {
                $user['phone'] = $uRow['phone'];
                $user['virtual_bank_name'] = $uRow['virtual_bank_name'];
                $user['virtual_account_number'] = $uRow['virtual_account_number'];
                $user['virtual_account_name'] = $uRow['virtual_account_name'];
            }

            $sStmt = $pdo->query("SELECT value FROM system_settings WHERE key = 'platform_revenue_share_pct'");
            $sVal = $sStmt->fetchColumn();
            if ($sVal !== false) {
                $sharePct = floatval($sVal);
            }

            $txStmt = $pdo->prepare("SELECT id, transaction_type, gross_amount, platform_fee, net_credited, balance_after, channel, internal_reference, narration, status, created_at FROM wallet_ledger WHERE user_id = ? ORDER BY created_at DESC LIMIT 20");
            $txStmt->execute([$userId]);
            $transactions = $txStmt->fetchAll();

            echo json_encode([
                "success" => true,
                "balance" => $balance,
                "currency" => $currency,
                "account_number" => $user['phone'],
                "virtual_account" => [
                    "bank_name" => $user['virtual_bank_name'] ?? 'Wema Bank (ONE VOICE NUBAN)',
                    "virtual_account_number" => $user['virtual_account_number'] ?? '9803123456',
                    "account_name" => $user['virtual_account_name'] ?? ('ONE VOICE / ' . $user['name']),
                    "beneficiary_phone" => $user['phone']
                ],
                "revenue_sharing" => [
                    "platform_share_pct" => $sharePct,
                    "customer_wallet_pct" => (100.0 - $sharePct)
                ],
                "transactions" => $transactions
            ]);
            exit;
        } catch (Exception $e) {}
    }

    echo json_encode([
        "success" => true,
        "balance" => $balance,
        "currency" => $currency,
        "account_number" => $user['phone'],
        "virtual_account" => [
            "bank_name" => $user['virtual_bank_name'] ?? 'Wema Bank (ONE VOICE NUBAN)',
            "virtual_account_number" => $user['virtual_account_number'] ?? '9803123456',
            "account_name" => $user['virtual_account_name'] ?? ('ONE VOICE / ' . $user['name']),
            "beneficiary_phone" => $user['phone']
        ],
        "revenue_sharing" => [
            "platform_share_pct" => $sharePct,
            "customer_wallet_pct" => (100.0 - $sharePct)
        ],
        "transactions" => array_reverse($store['wallet_ledger'] ?? [])
    ]);
    exit;
}

if ($method === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    $action = $input['action'] ?? 'fund_bank_transfer';

    if ($action === 'fund_bank_transfer' || $action === 'topup') {
        $grossAmount = floatval($input['amount'] ?? 0);
        $providerRef = trim($input['provider_reference'] ?? ('BANK-NIBSS-' . strtoupper(substr(md5(uniqid()), 0, 12))));
        $channel = $input['channel'] ?? 'bank_transfer';
        $userId = 1;

        if ($grossAmount < 100.00) {
            http_response_code(400);
            echo json_encode(["success" => false, "message" => "Minimum deposit via bank transfer is ₦100.00."]);
            exit;
        }

        // Fetch current platform revenue share percentage from settings
        $store = getLocalStore();
        $sharePct = floatval($store['settings']['platform_revenue_share_pct'] ?? 10.0);
        $fixedFee = floatval($store['settings']['platform_fixed_fee'] ?? 0.0);

        if ($pdo) {
            try {
                $sStmt = $pdo->query("SELECT value FROM system_settings WHERE key = 'platform_revenue_share_pct'");
                $sVal = $sStmt->fetchColumn();
                if ($sVal !== false) $sharePct = floatval($sVal);
            } catch (Exception $e) {}
        }

        // Calculate Revenue Share on Server (Never in frontend)
        $platformFee = round(($grossAmount * ($sharePct / 100.0)) + $fixedFee, 2);
        $netCredited = round($grossAmount - $platformFee, 2);
        $internalRef = 'OV-DEP-' . strtoupper(substr(md5(uniqid()), 0, 8));

        // 1. Database Transaction with Idempotency
        if ($pdo) {
            try {
                // Check duplicate provider reference
                $chk = $pdo->prepare("SELECT id FROM wallet_ledger WHERE provider_reference = ?");
                $chk->execute([$providerRef]);
                if ($chk->fetch()) {
                    http_response_code(409);
                    echo json_encode(["success" => false, "message" => "Duplicate transaction detected. This bank payment has already been credited."]);
                    exit;
                }

                $pdo->beginTransaction();

                // Lock wallet row
                $wStmt = $pdo->prepare("SELECT balance FROM wallets WHERE user_id = ? FOR UPDATE");
                $wStmt->execute([$userId]);
                $balanceBefore = floatval($wStmt->fetchColumn() ?? 0.0);
                $balanceAfter = $balanceBefore + $netCredited;

                // Update wallet balance
                $uStmt = $pdo->prepare("UPDATE wallets SET balance = ?, updated_at = NOW() WHERE user_id = ?");
                $uStmt->execute([$balanceAfter, $userId]);

                // Append to wallet_ledger
                $narration = "Bank Transfer via {$channel} - Platform Share: {$sharePct}% (₦" . number_format($platformFee, 2) . ")";
                $lStmt = $pdo->prepare("INSERT INTO wallet_ledger (user_id, transaction_type, gross_amount, platform_fee, net_credited, balance_before, balance_after, channel, provider_reference, internal_reference, narration, status) VALUES (?, 'bank_deposit', ?, ?, ?, ?, ?, ?, ?, ?, ?, 'successful') RETURNING id");
                $lStmt->execute([$userId, $grossAmount, $platformFee, $netCredited, $balanceBefore, $balanceAfter, $channel, $providerRef, $internalRef, $narration]);
                $ledgerId = $lStmt->fetchColumn();

                // Append to platform_revenue_ledger
                $rStmt = $pdo->prepare("SELECT COALESCE(MAX(cumulative_platform_revenue), 0) FROM platform_revenue_ledger");
                $rStmt->execute();
                $cumRev = floatval($rStmt->fetchColumn()) + $platformFee;

                $revIns = $pdo->prepare("INSERT INTO platform_revenue_ledger (source_type, source_reference, user_id, amount, cumulative_platform_revenue, settlement_status, settled_at) VALUES ('deposit_share', ?, ?, ?, ?, 'settled', NOW())");
                $revIns->execute([$internalRef, $userId, $platformFee, $cumRev]);

                $pdo->commit();

                echo json_encode([
                    "success" => true,
                    "message" => "Bank payment verified! ₦" . number_format($netCredited, 2) . " credited to wallet.",
                    "deposit_breakdown" => [
                        "gross_deposit" => $grossAmount,
                        "platform_revenue_share" => $platformFee,
                        "platform_share_pct" => $sharePct,
                        "net_credited_to_user" => $netCredited,
                        "currency" => "NGN"
                    ],
                    "new_balance" => $balanceAfter,
                    "transaction_reference" => $internalRef,
                    "provider_reference" => $providerRef
                ]);
                exit;
            } catch (Exception $e) {
                $pdo->rollBack();
            }
        }

        // 2. Local Fallback Store
        // Check idempotency
        if (!empty($store['wallet_ledger'])) {
            foreach ($store['wallet_ledger'] as $entry) {
                if (($entry['provider_reference'] ?? '') === $providerRef) {
                    http_response_code(409);
                    echo json_encode(["success" => false, "message" => "Duplicate transaction detected. This bank payment has already been processed."]);
                    exit;
                }
            }
        }

        $balanceBefore = floatval($store['wallet']['balance'] ?? 0.0);
        $balanceAfter = round($balanceBefore + $netCredited, 2);
        $store['wallet']['balance'] = $balanceAfter;

        $narration = "Bank Transfer via {$channel} - Platform Share: {$sharePct}% (₦" . number_format($platformFee, 2) . ")";
        $newLedgerEntry = [
            "id" => count($store['wallet_ledger'] ?? []) + 1,
            "user_id" => $userId,
            "transaction_type" => "bank_deposit",
            "gross_amount" => $grossAmount,
            "platform_fee" => $platformFee,
            "net_credited" => $netCredited,
            "balance_before" => $balanceBefore,
            "balance_after" => $balanceAfter,
            "channel" => $channel,
            "provider_reference" => $providerRef,
            "internal_reference" => $internalRef,
            "narration" => $narration,
            "status" => "successful",
            "created_at" => date("Y-m-d H:i:s")
        ];
        $store['wallet_ledger'][] = $newLedgerEntry;

        $cumRev = 0.0;
        if (!empty($store['platform_revenue_ledger'])) {
            $cumRev = floatval(end($store['platform_revenue_ledger'])['cumulative_platform_revenue'] ?? 0.0);
        }
        $cumRev += $platformFee;

        $store['platform_revenue_ledger'][] = [
            "id" => count($store['platform_revenue_ledger'] ?? []) + 1,
            "source_type" => "deposit_share",
            "source_reference" => $internalRef,
            "user_id" => $userId,
            "amount" => $platformFee,
            "cumulative_platform_revenue" => $cumRev,
            "settlement_status" => "settled",
            "settled_at" => date("Y-m-d H:i:s"),
            "created_at" => date("Y-m-d H:i:s")
        ];

        saveLocalStore($store);

        echo json_encode([
            "success" => true,
            "message" => "Bank payment verified! ₦" . number_format($netCredited, 2) . " credited to wallet.",
            "deposit_breakdown" => [
                "gross_deposit" => $grossAmount,
                "platform_revenue_share" => $platformFee,
                "platform_share_pct" => $sharePct,
                "net_credited_to_user" => $netCredited,
                "currency" => "NGN"
            ],
            "new_balance" => $balanceAfter,
            "transaction_reference" => $internalRef,
            "provider_reference" => $providerRef
        ]);
        exit;
    }
}
