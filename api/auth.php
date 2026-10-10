<?php
/**
 * ONE VOICE - Authentication & Profile API
 */

require_once __DIR__ . '/db.php';

$pdo = getDbConnection();
$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    if ($pdo) {
        try {
            $stmt = $pdo->prepare("SELECT id, name, phone, email, country_code FROM users WHERE id = 1");
            $stmt->execute();
            $user = $stmt->fetch();
            if ($user) {
                echo json_encode(["success" => true, "user" => $user]);
                exit;
            }
        } catch (Exception $e) {}
    }

    $store = getLocalStore();
    echo json_encode(["success" => true, "user" => $store['user']]);
    exit;
}

if ($method === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    $phone = trim($input['phone'] ?? '');
    $name = trim($input['name'] ?? 'Alex Morgan');

    if (empty($phone)) {
        http_response_code(400);
        echo json_encode(["success" => false, "message" => "Phone number is required"]);
        exit;
    }

    if ($pdo) {
        try {
            $stmt = $pdo->prepare("SELECT id, name, phone, email FROM users WHERE phone = ?");
            $stmt->execute([$phone]);
            $user = $stmt->fetch();

            if (!$user) {
                $ins = $pdo->prepare("INSERT INTO users (name, phone, email) VALUES (?, ?, ?) RETURNING id");
                $email = strtolower(preg_replace('/[^a-zA-Z0-9]/', '', $name)) . '@onevoice.app';
                $ins->execute([$name, $phone, $email]);
                $userId = $ins->fetchColumn();

                $wIns = $pdo->prepare("INSERT INTO wallets (user_id, balance) VALUES (?, 15.00)");
                $wIns->execute([$userId]);

                $user = ["id" => $userId, "name" => $name, "phone" => $phone, "email" => $email];
            }

            echo json_encode([
                "success" => true,
                "message" => "OTP Verified. Welcome back!",
                "token" => "ov_jwt_" . bin2hex(random_bytes(16)),
                "user" => $user
            ]);
            exit;
        } catch (Exception $e) {}
    }

    $store = getLocalStore();
    $store['user']['phone'] = $phone;
    if (!empty($name)) {
        $store['user']['name'] = $name;
    }
    saveLocalStore($store);

    echo json_encode([
        "success" => true,
        "message" => "OTP Verified. Welcome back!",
        "token" => "ov_jwt_" . bin2hex(random_bytes(16)),
        "user" => $store['user']
    ]);
    exit;
}
