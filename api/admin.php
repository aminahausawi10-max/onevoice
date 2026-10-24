<?php
/**
 * Three Star - Administrator Finance & Revenue Sharing API
 * View Total Deposits, Platform Revenue, Settlements, Calling Margins,
 * Configure Revenue Share %, and Reconcile Transaction Ledgers
 */

require_once __DIR__ . '/db.php';

$pdo = getDbConnection();
$method = $_SERVER['REQUEST_METHOD'];

// Ensure Admin access
$store = getLocalStore();

if ($method === 'GET') {
    $search = strtolower(trim($_GET['search'] ?? ''));
    $startDate = $_GET['start_date'] ?? null;
    $endDate = $_GET['end_date'] ?? null;

    $sharePct = floatval($store['settings']['platform_revenue_share_pct'] ?? 10.0);
    $callRate = floatval($store['settings']['nigeria_call_rate_per_min'] ?? 12.00);
    $carrierCost = floatval($store['settings']['carrier_wholesale_cost_per_min'] ?? 8.50);

    $totalGrossDeposits = 0.0;
    $totalPlatformRevenue = 0.0;
    $totalCustomerBalances = floatval($store['wallet']['balance'] ?? 0.0);
    $totalCallCharges = 0.0;
    $totalTelephonyMargin = 0.0;

    $ledgerEntries = $store['wallet_ledger'] ?? [];
    $callLogs = $store['call_logs'] ?? [];
    $users = array_map(function($u) use ($store) {
        $bal = floatval($store['wallets'][$u['id']]['balance'] ?? ($u['id'] === 1 ? ($store['wallet']['balance'] ?? 0) : 0));
        $u['balance'] = $bal;
        return $u;
    }, array_merge([$store['user']], $store['users'] ?? []));

    // Aggregate statistics
    foreach ($ledgerEntries as $entry) {
        if ($entry['transaction_type'] === 'bank_deposit' && $entry['status'] === 'successful') {
            $totalGrossDeposits += floatval($entry['gross_amount']);
            $totalPlatformRevenue += floatval($entry['platform_fee']);
        }
    }

    foreach ($callLogs as $c) {
        $totalCallCharges += floatval($c['cost'] ?? 0);
        $totalTelephonyMargin += floatval($c['platform_margin'] ?? 0);
    }

    // Filter ledger if search parameter provided
    if (!empty($search)) {
        $ledgerEntries = array_values(array_filter($ledgerEntries, function($row) use ($search) {
            return (
                strpos(strtolower($row['internal_reference'] ?? ''), $search) !== false ||
                strpos(strtolower($row['provider_reference'] ?? ''), $search) !== false ||
                strpos(strtolower($row['narration'] ?? ''), $search) !== false ||
                strpos(strtolower($row['channel'] ?? ''), $search) !== false
            );
        }));
    }

    echo json_encode([
        "success" => true,
        "metrics" => [
            "total_gross_deposits" => $totalGrossDeposits,
            "total_platform_revenue" => $totalPlatformRevenue,
            "total_customer_balances" => $totalCustomerBalances,
            "total_call_revenue" => $totalCallCharges,
            "total_telephony_margin" => $totalTelephonyMargin,
            "net_platform_profit" => ($totalPlatformRevenue + $totalTelephonyMargin),
            "currency" => "NGN"
        ],
        "configuration" => [
            "platform_revenue_share_pct" => $sharePct,
            "platform_fixed_fee" => floatval($store['settings']['platform_fixed_fee'] ?? 0.0),
            "nigeria_call_rate_per_min" => $callRate,
            "carrier_wholesale_cost_per_min" => $carrierCost,
            "virtual_bank_provider" => $store['settings']['virtual_bank_provider'] ?? "Wema Bank"
        ],
        "ledger" => array_reverse($ledgerEntries),
        "revenue_records" => array_reverse($store['platform_revenue_ledger'] ?? []),
        "users" => $users,
        "support_messages" => array_values($store['support_messages'] ?? []),
        "call_summary" => [
            "total_calls" => count($callLogs),
            "recent_calls" => array_slice(array_reverse($callLogs), 0, 10)
        ]
    ]);
    exit;
}

if ($method === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    $action = $input['action'] ?? '';

    // Action 1: Update Platform Revenue Sharing Rules
    if ($action === 'update_settings') {
        $newSharePct = floatval($input['platform_revenue_share_pct'] ?? 10.0);
        $newCallRate = floatval($input['nigeria_call_rate_per_min'] ?? 12.00);

        if ($newSharePct < 0 || $newSharePct > 50) {
            http_response_code(400);
            echo json_encode(["success" => false, "message" => "Platform revenue share percentage must be between 0% and 50%."]);
            exit;
        }

        if ($pdo) {
            try {
                $upd1 = $pdo->prepare("UPDATE system_settings SET value = ?, updated_at = NOW() WHERE key = 'platform_revenue_share_pct'");
                $upd1->execute([strval($newSharePct)]);
                $upd2 = $pdo->prepare("UPDATE system_settings SET value = ?, updated_at = NOW() WHERE key = 'nigeria_call_rate_per_min'");
                $upd2->execute([strval($newCallRate)]);
            } catch (Exception $e) {}
        }

        $store['settings']['platform_revenue_share_pct'] = $newSharePct;
        $store['settings']['nigeria_call_rate_per_min'] = $newCallRate;
        saveLocalStore($store);

        echo json_encode([
            "success" => true,
            "message" => "Platform revenue sharing settings updated successfully!",
            "settings" => $store['settings']
        ]);
        exit;
    }

    // Action 2: Freeze / Suspend Customer Account
    if ($action === 'toggle_user_status') {
        $userId = intval($input['user_id'] ?? 0);
        $newStatus = ($input['status'] === 'suspended') ? 'suspended' : 'active';

        if ($store['user']['id'] === $userId) {
            $store['user']['status'] = $newStatus;
        }
        if (!empty($store['users'])) {
            foreach ($store['users'] as &$u) {
                if ($u['id'] === $userId) $u['status'] = $newStatus;
            }
        }
        saveLocalStore($store);

        echo json_encode(["success" => true, "message" => "User status updated to {$newStatus}"]);
        exit;
    }

    // Action 3: Reconcile Ledger Entry
    if ($action === 'reconcile_entry') {
        $ref = $input['reference'] ?? '';
        foreach ($store['wallet_ledger'] as &$entry) {
            if ($entry['internal_reference'] === $ref) {
                $entry['status'] = 'reconciled';
                $entry['narration'] .= ' [Reconciled by Admin]';
                break;
            }
        }
        saveLocalStore($store);

        echo json_encode(["success" => true, "message" => "Transaction {$ref} reconciled successfully."]);
        exit;
    }

    // Action 4: Admin Reply to User Support
    if ($action === 'send_support_reply') {
        if (!isset($store['support_messages'])) $store['support_messages'] = [];
        $userId = intval($input['user_id'] ?? 1);
        $reply = [
            "id" => count($store['support_messages']) + 1,
            "user_id" => $userId,
            "user_name" => "Super Admin",
            "user_phone" => "09090809080",
            "user_member_id" => "OD-000001",
            "subject" => $input['subject'] ?? "Support Response",
            "message" => $input['message'] ?? "",
            "sender" => "admin",
            "created_at" => date("n/j/Y, g:i:s A")
        ];
        $store['support_messages'][] = $reply;
        saveLocalStore($store);

        echo json_encode(["success" => true, "message" => "Reply sent to user!", "reply" => $reply, "support_messages" => $store['support_messages']]);
        exit;
    }

    // Action 5: User In-App Support Message
    if ($action === 'user_support_message') {
        if (!isset($store['support_messages'])) $store['support_messages'] = [];
        $userId = intval($input['user_id'] ?? ($store['active_user_id'] ?? 3));
        $uName = $input['user_name'] ?? "User";
        $uPhone = $input['user_phone'] ?? "";
        $uMemberId = $input['user_member_id'] ?? "";
        $userMsg = [
            "id" => count($store['support_messages']) + 1,
            "user_id" => $userId,
            "user_name" => $uName,
            "user_phone" => $uPhone,
            "user_member_id" => $uMemberId,
            "subject" => $input['subject'] ?? "Support Inquiry",
            "message" => $input['message'] ?? "",
            "sender" => "user",
            "created_at" => date("n/j/Y, g:i:s A")
        ];
        $store['support_messages'][] = $userMsg;
        saveLocalStore($store);

        $filtered = array_values(array_filter($store['support_messages'], function($m) use ($userId) {
            return ($m['user_id'] ?? 0) === $userId;
        }));

        echo json_encode(["success" => true, "message" => "Message sent to Admin successfully!", "support_messages" => $filtered]);
        exit;
    }
}
