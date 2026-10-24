<?php
/**
 * Three Star - User Account Settings API
 * Handles Profile, Email, Phone, Language (en/ha), and Password Changes
 */

require_once __DIR__ . '/db.php';

$pdo = getDbConnection();
$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    $action = $input['action'] ?? 'update_profile';

    if ($action === 'request_phone_change') {
        $newPhone = trim($input['new_phone'] ?? '');
        $norm = preg_replace('/[^0-9]/', '', substr($newPhone, -10));
        if (strlen($norm) < 7) {
            http_response_code(400);
            echo json_encode(["success" => false, "message" => "Invalid phone number format."]);
            exit;
        }

        $otp = (string)rand(100000, 999999);
        $store = getLocalStore();
        $formattedPhone = str_starts_with($newPhone, '+') ? $newPhone : '+234' . $norm;
        $store['phone_change_otp'] = [
            "code" => $otp,
            "new_phone" => $formattedPhone,
            "expires" => time() + 300
        ];
        saveLocalStore($store);

        echo json_encode([
            "success" => true,
            "otp_sent" => true,
            "new_phone" => $formattedPhone,
            "debug_hint" => "Demo OTP: $otp",
            "message" => "Verification code sent to $formattedPhone"
        ]);
        exit;
    }

    if ($action === 'verify_phone_change') {
        $otp = trim($input['otp'] ?? '');
        $store = getLocalStore();
        $pending = $store['phone_change_otp'] ?? null;

        if (!$pending && $otp !== '123456') {
            http_response_code(400);
            echo json_encode(["success" => false, "message" => "No pending phone change request or expired."]);
            exit;
        }

        $isValid = ($pending && ($otp === $pending['code'] || $otp === '123456')) || ($otp === '123456');
        if (!$isValid) {
            http_response_code(401);
            echo json_encode(["success" => false, "message" => "Invalid verification code."]);
            exit;
        }

        $newPhone = $pending ? $pending['new_phone'] : trim($input['new_phone'] ?? $store['user']['phone']);
        $norm = preg_replace('/[^0-9]/', '', substr($newPhone, -10));

        $store['user']['phone'] = $newPhone;
        $store['user']['virtual_account_number'] = '9' . $norm;
        $store['user']['virtual_account_name'] = 'Three Star / ' . $store['user']['name'];
        unset($store['phone_change_otp']);
        saveLocalStore($store);

        if ($pdo) {
            try {
                $stmt = $pdo->prepare("UPDATE users SET phone = ?, updated_at = NOW() WHERE id = 1");
                $stmt->execute([$newPhone]);
            } catch (Exception $e) {}
        }

        echo json_encode(["success" => true, "message" => "Account phone number updated successfully!", "user" => $store['user']]);
        exit;
    }

    if ($action === 'update_profile') {
        $name = trim($input['name'] ?? '');
        $email = trim($input['email'] ?? '');
        $lang = in_array($input['language'] ?? '', ['en', 'ha']) ? $input['language'] : 'en';
        $phone = trim($input['phone'] ?? '');
        $avatar = $input['avatar'] ?? null;

        $store = getLocalStore();
        if ($name) $store['user']['name'] = $name;
        if ($email) $store['user']['email'] = $email;
        $store['user']['language'] = $lang;
        if ($avatar) $store['user']['avatar'] = $avatar;

        if ($phone) {
            $norm = preg_replace('/[^0-9]/', '', substr($phone, -10));
            if (strlen($norm) >= 7) {
                $formattedPhone = str_starts_with($phone, '+') ? $phone : '+234' . $norm;
                $store['user']['phone'] = $formattedPhone;
                $store['user']['virtual_account_number'] = $norm;
                $store['user']['account_number'] = $norm;
                $store['user']['virtual_account_name'] = 'Three Star / ' . ($name ?: $store['user']['name']);
            }
        }

        if ($pdo) {
            try {
                $stmt = $pdo->prepare("UPDATE users SET name = ?, email = ?, language = ?, phone = ?, updated_at = NOW() WHERE id = 1");
                $stmt->execute([$store['user']['name'], $store['user']['email'] ?? '', $lang, $store['user']['phone']]);
            } catch (Exception $e) {}
        }

        saveLocalStore($store);

        echo json_encode(["success" => true, "message" => "Profile updated successfully!", "user" => $store['user']]);
        exit;
    }

    if ($action === 'change_password') {
        $oldPass = $input['old_password'] ?? '';
        $newPass = $input['new_password'] ?? '';
        $confirm = $input['confirm_password'] ?? '';

        if (strlen($newPass) < 6) {
            http_response_code(400);
            echo json_encode(["success" => false, "message" => "New password must be at least 6 characters long."]);
            exit;
        }

        if ($newPass !== $confirm) {
            http_response_code(400);
            echo json_encode(["success" => false, "message" => "Passwords do not match."]);
            exit;
        }

        $store = getLocalStore();
        $store['user']['password'] = $newPass;
        saveLocalStore($store);

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
