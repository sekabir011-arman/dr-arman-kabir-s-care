<?php
/**
 * Prescription API
 * Handles prescription management
 */

require_once 'config.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

$action = $_GET['action'] ?? $_POST['action'] ?? null;
$method = $_SERVER['REQUEST_METHOD'];
$input = json_decode(file_get_contents('php://input'), true);

// ============================================
// GET ALL PRESCRIPTIONS
// ============================================
if ($action === 'list' && $method === 'GET') {
    validateAuth();
    
    $query = "SELECT * FROM prescriptions ORDER BY prescription_date DESC";
    $result = $conn->query($query);
    
    if (!$result) {
        sendError('Database error: ' . $conn->error, 500);
    }
    
    $prescriptions = [];
    while ($row = $result->fetch_assoc()) {
        $row['medications'] = json_decode($row['medications'] ?? '[]');
        $prescriptions[] = $row;
    }
    
    sendSuccess($prescriptions, 'Prescriptions retrieved');
}

// ============================================
// GET PRESCRIPTION BY ID
// ============================================
else if ($action === 'get' && $method === 'GET') {
    validateAuth();
    $prescription_id = $_GET['id'] ?? null;
    
    if (!$prescription_id) {
        sendError('Prescription ID required', 400);
    }
    
    $query = "SELECT * FROM prescriptions WHERE id = ?";
    $stmt = $conn->prepare($query);
    $stmt->bind_param('i', $prescription_id);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($result->num_rows === 0) {
        sendError('Prescription not found', 404);
    }
    
    $prescription = $result->fetch_assoc();
    $prescription['medications'] = json_decode($prescription['medications'] ?? '[]');
    
    sendSuccess($prescription);
}

// ============================================
// GET PRESCRIPTIONS BY PATIENT ID
// ============================================
else if ($action === 'by-patient' && $method === 'GET') {
    validateAuth();
    $patient_id = $_GET['patient_id'] ?? null;
    
    if (!$patient_id) {
        sendError('Patient ID required', 400);
    }
    
    $query = "SELECT * FROM prescriptions WHERE patient_id = ? ORDER BY prescription_date DESC";
    $stmt = $conn->prepare($query);
    $stmt->bind_param('i', $patient_id);
    $stmt->execute();
    $result = $stmt->get_result();
    
    $prescriptions = [];
    while ($row = $result->fetch_assoc()) {
        $row['medications'] = json_decode($row['medications'] ?? '[]');
        $prescriptions[] = $row;
    }
    
    sendSuccess($prescriptions, 'Patient prescriptions retrieved');
}

// ============================================
// GET PRESCRIPTIONS BY VISIT ID
// ============================================
else if ($action === 'by-visit' && $method === 'GET') {
    validateAuth();
    $visit_id = $_GET['visit_id'] ?? null;
    
    if (!$visit_id) {
        sendError('Visit ID required', 400);
    }
    
    $query = "SELECT * FROM prescriptions WHERE visit_id = ? ORDER BY prescription_date DESC";
    $stmt = $conn->prepare($query);
    $stmt->bind_param('i', $visit_id);
    $stmt->execute();
    $result = $stmt->get_result();
    
    $prescriptions = [];
    while ($row = $result->fetch_assoc()) {
        $row['medications'] = json_decode($row['medications'] ?? '[]');
        $prescriptions[] = $row;
    }
    
    sendSuccess($prescriptions, 'Visit prescriptions retrieved');
}

// ============================================
// CREATE PRESCRIPTION
// ============================================
else if ($action === 'create' && $method === 'POST') {
    validateAuth();
    
    $patient_id = $input['patient_id'] ?? null;
    $visit_id = $input['visit_id'] ?? null;
    $prescription_date = $input['prescription_date'] ?? date('Y-m-d H:i:s');
    $diagnosis = $input['diagnosis'] ?? null;
    $medications = isset($input['medications']) ? json_encode($input['medications']) : json_encode([]);
    $notes = $input['notes'] ?? null;
    
    if (!$patient_id) {
        sendError('patient_id required', 400);
    }
    
    $query = "INSERT INTO prescriptions (
        patient_id, visit_id, prescription_date, diagnosis, medications, notes
    ) VALUES (?, ?, ?, ?, ?, ?)";
    
    $stmt = $conn->prepare($query);
    $stmt->bind_param('isssss', $patient_id, $visit_id, $prescription_date, $diagnosis, $medications, $notes);
    
    if ($stmt->execute()) {
        $prescription_id = $conn->insert_id;
        sendSuccess(['id' => $prescription_id], 'Prescription created successfully', 201);
    } else {
        sendError('Failed to create prescription: ' . $conn->error, 500);
    }
}

// ============================================
// UPDATE PRESCRIPTION
// ============================================
else if ($action === 'update' && $method === 'PUT') {
    validateAuth();
    
    $prescription_id = $input['id'] ?? null;
    
    if (!$prescription_id) {
        sendError('Prescription ID required', 400);
    }
    
    $updates = [];
    $params = [];
    $types = '';
    
    if (isset($input['diagnosis'])) {
        $updates[] = 'diagnosis = ?';
        $params[] = $input['diagnosis'];
        $types .= 's';
    }
    
    if (isset($input['medications'])) {
        $med_json = json_encode($input['medications']);
        $updates[] = 'medications = ?';
        $params[] = $med_json;
        $types .= 's';
    }
    
    if (isset($input['notes'])) {
        $updates[] = 'notes = ?';
        $params[] = $input['notes'];
        $types .= 's';
    }
    
    if (empty($updates)) {
        sendError('No fields to update', 400);
    }
    
    $updates[] = 'updated_at = NOW()';
    $params[] = $prescription_id;
    $types .= 'i';
    
    $query = "UPDATE prescriptions SET " . implode(', ', $updates) . " WHERE id = ?";
    
    $stmt = $conn->prepare($query);
    $stmt->bind_param($types, ...$params);
    
    if ($stmt->execute()) {
        sendSuccess([], 'Prescription updated successfully');
    } else {
        sendError('Failed to update prescription: ' . $conn->error, 500);
    }
}

// ============================================
// DELETE PRESCRIPTION
// ============================================
else if ($action === 'delete' && $method === 'DELETE') {
    validateAuth();
    
    $prescription_id = $input['id'] ?? $_GET['id'] ?? null;
    
    if (!$prescription_id) {
        sendError('Prescription ID required', 400);
    }
    
    $query = "DELETE FROM prescriptions WHERE id = ?";
    $stmt = $conn->prepare($query);
    $stmt->bind_param('i', $prescription_id);
    
    if ($stmt->execute()) {
        sendSuccess([], 'Prescription deleted successfully');
    } else {
        sendError('Failed to delete prescription: ' . $conn->error, 500);
    }
}

// ============================================
// GET PRESCRIPTIONS SINCE TIMESTAMP (Sync)
// ============================================
else if ($action === 'sync' && $method === 'GET') {
    validateAuth();
    
    $since_timestamp = $_GET['since'] ?? 0;
    
    $query = "SELECT * FROM prescriptions WHERE UNIX_TIMESTAMP(updated_at) >= ? ORDER BY updated_at DESC";
    $stmt = $conn->prepare($query);
    $stmt->bind_param('i', $since_timestamp);
    $stmt->execute();
    $result = $stmt->get_result();
    
    $prescriptions = [];
    while ($row = $result->fetch_assoc()) {
        $row['medications'] = json_decode($row['medications'] ?? '[]');
        $prescriptions[] = $row;
    }
    
    sendSuccess($prescriptions, 'Synced prescriptions');
}

else {
    sendError('Invalid action or method', 400);
}

?>
