<?php
/**
 * Visit/Clinical Record API
 * Handles patient visit records and clinical data
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
// GET ALL VISITS
// ============================================
if ($action === 'list' && $method === 'GET') {
    validateAuth();
    
    $query = "SELECT * FROM visits ORDER BY visit_date DESC";
    $result = $conn->query($query);
    
    if (!$result) {
        sendError('Database error: ' . $conn->error, 500);
    }
    
    $visits = $result->fetch_all(MYSQLI_ASSOC);
    sendSuccess($visits, 'Visits retrieved');
}

// ============================================
// GET VISIT BY ID
// ============================================
else if ($action === 'get' && $method === 'GET') {
    validateAuth();
    $visit_id = $_GET['id'] ?? null;
    
    if (!$visit_id) {
        sendError('Visit ID required', 400);
    }
    
    $query = "SELECT * FROM visits WHERE id = ?";
    $stmt = $conn->prepare($query);
    $stmt->bind_param('i', $visit_id);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($result->num_rows === 0) {
        sendError('Visit not found', 404);
    }
    
    $visit = $result->fetch_assoc();
    sendSuccess($visit);
}

// ============================================
// GET VISITS BY PATIENT ID
// ============================================
else if ($action === 'by-patient' && $method === 'GET') {
    validateAuth();
    $patient_id = $_GET['patient_id'] ?? null;
    
    if (!$patient_id) {
        sendError('Patient ID required', 400);
    }
    
    $query = "SELECT * FROM visits WHERE patient_id = ? ORDER BY visit_date DESC";
    $stmt = $conn->prepare($query);
    $stmt->bind_param('i', $patient_id);
    $stmt->execute();
    $result = $stmt->get_result();
    
    $visits = $result->fetch_all(MYSQLI_ASSOC);
    sendSuccess($visits, 'Patient visits retrieved');
}

// ============================================
// CREATE VISIT
// ============================================
else if ($action === 'create' && $method === 'POST') {
    validateAuth();
    
    $patient_id = $input['patient_id'] ?? null;
    $visit_date = $input['visit_date'] ?? null;
    $chief_complaint = $input['chief_complaint'] ?? null;
    $history_of_present_illness = $input['history_of_present_illness'] ?? null;
    $blood_pressure = $input['blood_pressure'] ?? null;
    $pulse = $input['pulse'] ?? null;
    $temperature = $input['temperature'] ?? null;
    $respiratory_rate = $input['respiratory_rate'] ?? null;
    $oxygen_saturation = $input['oxygen_saturation'] ?? null;
    $physical_examination = $input['physical_examination'] ?? null;
    $diagnosis = $input['diagnosis'] ?? null;
    $notes = $input['notes'] ?? null;
    $visit_type = $input['visit_type'] ?? 'outdoor';
    
    if (!$patient_id || !$visit_date || !$chief_complaint) {
        sendError('patient_id, visit_date, and chief_complaint required', 400);
    }
    
    $query = "INSERT INTO visits (
        patient_id, visit_date, chief_complaint, history_of_present_illness,
        blood_pressure, pulse, temperature, respiratory_rate, oxygen_saturation,
        physical_examination, diagnosis, notes, visit_type
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
    
    $stmt = $conn->prepare($query);
    $stmt->bind_param(
        'isssssssssss',
        $patient_id, $visit_date, $chief_complaint, $history_of_present_illness,
        $blood_pressure, $pulse, $temperature, $respiratory_rate, $oxygen_saturation,
        $physical_examination, $diagnosis, $notes, $visit_type
    );
    
    if ($stmt->execute()) {
        $visit_id = $conn->insert_id;
        sendSuccess(['id' => $visit_id], 'Visit created successfully', 201);
    } else {
        sendError('Failed to create visit: ' . $conn->error, 500);
    }
}

// ============================================
// UPDATE VISIT
// ============================================
else if ($action === 'update' && $method === 'PUT') {
    validateAuth();
    
    $visit_id = $input['id'] ?? null;
    
    if (!$visit_id) {
        sendError('Visit ID required', 400);
    }
    
    $updates = [];
    $params = [];
    $types = '';
    
    $allowed_fields = [
        'chief_complaint', 'history_of_present_illness', 'blood_pressure', 'pulse',
        'temperature', 'respiratory_rate', 'oxygen_saturation', 'physical_examination',
        'diagnosis', 'notes', 'visit_type'
    ];
    
    foreach ($allowed_fields as $field) {
        if (isset($input[$field])) {
            $updates[] = "$field = ?";
            $params[] = $input[$field];
            $types .= 's';
        }
    }
    
    if (empty($updates)) {
        sendError('No fields to update', 400);
    }
    
    $updates[] = 'updated_at = NOW()';
    $params[] = $visit_id;
    $types .= 'i';
    
    $query = "UPDATE visits SET " . implode(', ', $updates) . " WHERE id = ?";
    
    $stmt = $conn->prepare($query);
    $stmt->bind_param($types, ...$params);
    
    if ($stmt->execute()) {
        sendSuccess([], 'Visit updated successfully');
    } else {
        sendError('Failed to update visit: ' . $conn->error, 500);
    }
}

// ============================================
// DELETE VISIT
// ============================================
else if ($action === 'delete' && $method === 'DELETE') {
    validateAuth();
    
    $visit_id = $input['id'] ?? $_GET['id'] ?? null;
    
    if (!$visit_id) {
        sendError('Visit ID required', 400);
    }
    
    $query = "DELETE FROM visits WHERE id = ?";
    $stmt = $conn->prepare($query);
    $stmt->bind_param('i', $visit_id);
    
    if ($stmt->execute()) {
        sendSuccess([], 'Visit deleted successfully');
    } else {
        sendError('Failed to delete visit: ' . $conn->error, 500);
    }
}

// ============================================
// GET VISITS SINCE TIMESTAMP (Sync)
// ============================================
else if ($action === 'sync' && $method === 'GET') {
    validateAuth();
    
    $since_timestamp = $_GET['since'] ?? 0;
    
    $query = "SELECT * FROM visits WHERE UNIX_TIMESTAMP(updated_at) >= ? ORDER BY updated_at DESC";
    $stmt = $conn->prepare($query);
    $stmt->bind_param('i', $since_timestamp);
    $stmt->execute();
    $result = $stmt->get_result();
    
    $visits = $result->fetch_all(MYSQLI_ASSOC);
    sendSuccess($visits, 'Synced visits');
}

else {
    sendError('Invalid action or method', 400);
}

?>
