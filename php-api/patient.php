<?php
/**
 * Patient API
 * Handles patient data management
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
// GET ALL PATIENTS
// ============================================
if ($action === 'list' && $method === 'GET') {
    validateAuth();
    
    $query = "SELECT * FROM patients ORDER BY created_at DESC";
    $result = $conn->query($query);
    
    if (!$result) {
        sendError('Database error: ' . $conn->error, 500);
    }
    
    $patients = [];
    while ($row = $result->fetch_assoc()) {
        // Parse JSON fields
        $row['allergies'] = json_decode($row['allergies'] ?? '[]');
        $row['chronic_conditions'] = json_decode($row['chronic_conditions'] ?? '[]');
        $patients[] = $row;
    }
    
    sendSuccess($patients, 'Patients retrieved');
}

// ============================================
// GET PATIENT BY ID
// ============================================
else if ($action === 'get' && $method === 'GET') {
    validateAuth();
    $patient_id = $_GET['id'] ?? null;
    
    if (!$patient_id) {
        sendError('Patient ID required', 400);
    }
    
    $query = "SELECT * FROM patients WHERE id = ?";
    $stmt = $conn->prepare($query);
    $stmt->bind_param('i', $patient_id);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($result->num_rows === 0) {
        sendError('Patient not found', 404);
    }
    
    $patient = $result->fetch_assoc();
    $patient['allergies'] = json_decode($patient['allergies'] ?? '[]');
    $patient['chronic_conditions'] = json_decode($patient['chronic_conditions'] ?? '[]');
    
    sendSuccess($patient);
}

// ============================================
// CREATE PATIENT
// ============================================
else if ($action === 'create' && $method === 'POST') {
    validateAuth();
    
    $user_id = $input['user_id'] ?? null;
    $full_name = $input['full_name'] ?? null;
    $name_bn = $input['name_bn'] ?? null;
    $date_of_birth = $input['date_of_birth'] ?? null;
    $gender = $input['gender'] ?? null;
    $phone = $input['phone'] ?? null;
    $email = $input['email'] ?? null;
    $address = $input['address'] ?? null;
    $blood_group = $input['blood_group'] ?? null;
    $weight = $input['weight'] ?? null;
    $height = $input['height'] ?? null;
    $allergies = isset($input['allergies']) ? json_encode($input['allergies']) : json_encode([]);
    $chronic_conditions = isset($input['chronic_conditions']) ? json_encode($input['chronic_conditions']) : json_encode([]);
    $past_surgical_history = $input['past_surgical_history'] ?? null;
    $patient_type = $input['patient_type'] ?? 'outdoor';
    $consultant_email = $input['consultant_email'] ?? null;
    $consultant_name = $input['consultant_name'] ?? null;
    
    if (!$user_id || !$full_name) {
        sendError('user_id and full_name required', 400);
    }
    
    $query = "INSERT INTO patients (
        user_id, full_name, name_bn, date_of_birth, gender, phone, email, address,
        blood_group, weight, height, allergies, chronic_conditions, past_surgical_history,
        patient_type, consultant_email, consultant_name
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
    
    $stmt = $conn->prepare($query);
    $stmt->bind_param(
        'issssssssddssssss',
        $user_id, $full_name, $name_bn, $date_of_birth, $gender, $phone, $email, $address,
        $blood_group, $weight, $height, $allergies, $chronic_conditions, $past_surgical_history,
        $patient_type, $consultant_email, $consultant_name
    );
    
    if ($stmt->execute()) {
        $patient_id = $conn->insert_id;
        sendSuccess(['id' => $patient_id], 'Patient created successfully', 201);
    } else {
        sendError('Failed to create patient: ' . $conn->error, 500);
    }
}

// ============================================
// UPDATE PATIENT
// ============================================
else if ($action === 'update' && $method === 'PUT') {
    validateAuth();
    
    $patient_id = $input['id'] ?? null;
    
    if (!$patient_id) {
        sendError('Patient ID required', 400);
    }
    
    // Build dynamic update query
    $updates = [];
    $params = [];
    $types = '';
    
    $allowed_fields = [
        'full_name', 'name_bn', 'date_of_birth', 'gender', 'phone', 'email',
        'address', 'blood_group', 'weight', 'height', 'past_surgical_history',
        'patient_type', 'consultant_email', 'consultant_name'
    ];
    
    foreach ($allowed_fields as $field) {
        if (isset($input[$field])) {
            $updates[] = "$field = ?";
            $params[] = $input[$field];
            $types .= is_numeric($input[$field]) ? 'd' : 's';
        }
    }
    
    if (empty($updates)) {
        sendError('No fields to update', 400);
    }
    
    $updates[] = 'updated_at = NOW()';
    $params[] = $patient_id;
    $types .= 'i';
    
    $query = "UPDATE patients SET " . implode(', ', $updates) . " WHERE id = ?";
    
    $stmt = $conn->prepare($query);
    $stmt->bind_param($types, ...$params);
    
    if ($stmt->execute()) {
        sendSuccess([], 'Patient updated successfully');
    } else {
        sendError('Failed to update patient: ' . $conn->error, 500);
    }
}

// ============================================
// DELETE PATIENT
// ============================================
else if ($action === 'delete' && $method === 'DELETE') {
    validateAuth();
    
    $patient_id = $input['id'] ?? $_GET['id'] ?? null;
    
    if (!$patient_id) {
        sendError('Patient ID required', 400);
    }
    
    $query = "DELETE FROM patients WHERE id = ?";
    $stmt = $conn->prepare($query);
    $stmt->bind_param('i', $patient_id);
    
    if ($stmt->execute()) {
        sendSuccess([], 'Patient deleted successfully');
    } else {
        sendError('Failed to delete patient: ' . $conn->error, 500);
    }
}

// ============================================
// GET PATIENTS SINCE TIMESTAMP (Sync)
// ============================================
else if ($action === 'sync' && $method === 'GET') {
    validateAuth();
    
    $since_timestamp = $_GET['since'] ?? 0;
    
    $query = "SELECT * FROM patients WHERE UNIX_TIMESTAMP(updated_at) >= ? ORDER BY updated_at DESC";
    $stmt = $conn->prepare($query);
    $stmt->bind_param('i', $since_timestamp);
    $stmt->execute();
    $result = $stmt->get_result();
    
    $patients = [];
    while ($row = $result->fetch_assoc()) {
        $row['allergies'] = json_decode($row['allergies'] ?? '[]');
        $row['chronic_conditions'] = json_decode($row['chronic_conditions'] ?? '[]');
        $patients[] = $row;
    }
    
    sendSuccess($patients, 'Synced patients');
}

// ============================================
// ASSIGN CONSULTANT
// ============================================
else if ($action === 'assign-consultant' && $method === 'POST') {
    validateAuth();
    
    $patient_id = $input['patient_id'] ?? null;
    $consultant_email = $input['consultant_email'] ?? null;
    $consultant_name = $input['consultant_name'] ?? null;
    
    if (!$patient_id || !$consultant_email || !$consultant_name) {
        sendError('patient_id, consultant_email, and consultant_name required', 400);
    }
    
    $query = "UPDATE patients SET consultant_email = ?, consultant_name = ?, updated_at = NOW() WHERE id = ?";
    $stmt = $conn->prepare($query);
    $stmt->bind_param('ssi', $consultant_email, $consultant_name, $patient_id);
    
    if ($stmt->execute()) {
        sendSuccess([], 'Consultant assigned successfully');
    } else {
        sendError('Failed to assign consultant: ' . $conn->error, 500);
    }
}

else {
    sendError('Invalid action or method', 400);
}

?>
