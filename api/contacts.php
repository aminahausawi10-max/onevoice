<?php
/**
 * ONE VOICE - Contacts Management API
 * Add, List, and Delete Contacts
 */

require_once __DIR__ . '/db.php';

$pdo = getDbConnection();
$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    if ($pdo) {
        try {
            $stmt = $pdo->prepare("SELECT id, name, phone, country, notes, created_at FROM contacts WHERE user_id = 1 ORDER BY name ASC");
            $stmt->execute();
            $contacts = $stmt->fetchAll();
            echo json_encode(["success" => true, "contacts" => $contacts]);
            exit;
        } catch (Exception $e) {}
    }

    $store = getLocalStore();
    if (!isset($store['contacts'])) {
        $store['contacts'] = [
            ["id" => 1, "name" => "Aminu Kano", "phone" => "+234 803 123 4567", "country" => "Nigeria"],
            ["id" => 2, "name" => "Sarah Jenkins", "phone" => "+44 20 7946 0991", "country" => "United Kingdom"],
            ["id" => 3, "name" => "Michael Chen", "phone" => "+1 415 555 8920", "country" => "United States"]
        ];
        saveLocalStore($store);
    }

    echo json_encode(["success" => true, "contacts" => $store['contacts']]);
    exit;
}

if ($method === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    $action = $input['action'] ?? 'add';

    if ($action === 'add') {
        $name = trim($input['name'] ?? '');
        $phone = trim($input['phone'] ?? '');
        $country = trim($input['country'] ?? 'International');

        if (!$name || !$phone) {
            http_response_code(400);
            echo json_encode(["success" => false, "message" => "Name and phone number are required."]);
            exit;
        }

        if ($pdo) {
            try {
                $stmt = $pdo->prepare("INSERT INTO contacts (user_id, name, phone, country) VALUES (1, ?, ?, ?) RETURNING id");
                $stmt->execute([$name, $phone, $country]);
                $id = $stmt->fetchColumn();
                echo json_encode(["success" => true, "message" => "Contact added successfully!", "id" => $id]);
                exit;
            } catch (Exception $e) {}
        }

        $store = getLocalStore();
        if (!isset($store['contacts'])) $store['contacts'] = [];
        $newContact = [
            "id" => count($store['contacts']) + 1,
            "name" => $name,
            "phone" => $phone,
            "country" => $country
        ];
        $store['contacts'][] = $newContact;
        saveLocalStore($store);

        echo json_encode(["success" => true, "message" => "Contact saved!", "contact" => $newContact]);
        exit;
    }

    if ($action === 'delete') {
        $id = intval($input['id'] ?? 0);
        if ($pdo) {
            try {
                $stmt = $pdo->prepare("DELETE FROM contacts WHERE id = ? AND user_id = 1");
                $stmt->execute([$id]);
                echo json_encode(["success" => true, "message" => "Contact deleted"]);
                exit;
            } catch (Exception $e) {}
        }

        $store = getLocalStore();
        if (isset($store['contacts'])) {
            $store['contacts'] = array_values(array_filter($store['contacts'], function($c) use ($id) {
                return $c['id'] !== $id;
            }));
            saveLocalStore($store);
        }

        echo json_encode(["success" => true, "message" => "Contact deleted"]);
        exit;
    }
}
