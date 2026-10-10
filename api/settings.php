<?php
/**
 * ONE VOICE - User Account Settings API
 * Handles Profile, Email, Phone, Language (en/ha), and Password Changes
 */

require_once __DIR__ . '/db.php';

$pdo = getDbConnection();
$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    $action = $input['action'] ?? 'update_profile';

    if ($action === 'update_profile') {
        $name = trim($input['name'] ?? '');
        $lang = in_array($input['language'] ?? '', ['en', 'ha']) ? $input['language'] : 'en';

        if ($pdo) {
            try {
                $stmt = $pdo->prepare("UPDATE users SET name = ?, language = ?, updated_at = NOW() WHERE id = 1");
                $stmt->execute([$name, $lang]);
            } catch (Exception $e) {}
        }

        $store = getLocalStore();
        if ($name) $store['user']['name'] = $name;
        $store['user']['language'] = $lang;
        saveLocalStore($store);

        echo json_encode(["success" => true, "message" => "Profile updated successfully!", "user" => $store['user']]);
        exit;
    }

    if ($action === 'change_password') {
        $oldPass = $input['old_password'] ?? '';
        $newPass = $input['new_password'] ?? '';
        $confirm = $input['confirm_password'] ?? '';

        if (strlen($newPass) < 8) {
            http_response_code(400);
            echo json_encode(["success" => false, "message" => "New password must be at least 8 characters long."]);
            exit;
        }

        if ($newPass !== $confirm) {
            http_response_code(400);
            echo json_encode(["success" => false, "message" => "Passwords do not match."]);
            exit;
        }

        $newHash = password_hash($newPass, PASSWORD_BCRYPT);
        if ($pdo) {
            try {
                $stmt = $pdo->prepare("UPDATE users SET password_hash = ?, updated_at = NOW() WHERE id = 1");
                $stmt->execute([$newHash]);
            } catch (Exception $e) {}
        }

        echo json_encode(["success" => true, "message" => "Password changed successfully!"]);
        exit;
    }

    if ($action === 'change_email') {
        $email = trim(strtolower($input['email'] ?? ''));
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            http_response_code(400);
            echo json_encode(["success" => false, "message" => "Invalid email format."]);
            exit;
        }

        if ($pdo) {
            try {
                $stmt = $pdo->prepare("UPDATE users SET email = ?, updated_at = NOW() WHERE id = 1");
                $stmt->execute([$email]);
            } catch (Exception $e) {}
        }

        $store = getLocalStore();
        $store['user']['email'] = $email;
        saveLocalStore($store);

        echo json_encode(["success" => true, "message" => "Email address updated successfully!", "email" => $email]);
        exit;
    }

    if ($action === 'change_phone') {
        $phone = trim($input['phone'] ?? '');
        if (!$phone) {
            http_response_code(400);
            echo json_encode(["success" => false, "message" => "Phone number required."]);
            exit;
        }

        if ($pdo) {
            try {
                $stmt = $pdo->prepare("UPDATE users SET phone = ?, updated_at = NOW() WHERE id = 1");
                $stmt->execute([$phone]);
            } catch (Exception $e) {}
        }

        $store = getLocalStore();
        $store['user']['phone'] = $phone;
        saveLocalStore($store);

        echo json_encode(["success" => true, "message" => "Phone number updated successfully!", "phone" => $phone]);
        exit;
    }
}

http_response_code(400);
echo json_encode(["success" => false, "message" => "Invalid settings request"]);
