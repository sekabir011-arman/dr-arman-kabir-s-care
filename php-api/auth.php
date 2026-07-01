<?php
/**
 * Authentication API
 * Handles user registration, login, and profile management
 */

require_once 'config.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

$action = $_GET['action'] ?? $_POST['action'] ?? null;
$method = $_SERVER['REQUEST_METHOD'];
$input = json_decode(file_get_contents('php://input'), true);

// ============================================
// REGISTER - Create new user account
// ============================================
if ($action === 'register' && $method === 'POST') {
    $email = $input['email'] ?? null;
    $password = $input['password'] ?? null;
    $full_name = $input['full_name'] ?? null;
    $role = $input['role'] ?? 'patient';

    // Validation
    if (!$email || !$password || !$full_name) {
        sendError('Missing required fields: email, password, full_name', 400);
    }

    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        sendError('Invalid email format', 400);
    }

    if (strlen($password) < 6) {
        sendError('Password must be at least 6 characters', 400);
    }

    // Check if user exists
    $check_query = "SELECT id FROM users WHERE email = ?";
    $stmt = $conn->prepare($check_query);
    $stmt->bind_param('s', $email);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($result->num_rows > 0) {
        sendError('Email already registered', 409);
    }

    // Hash password
    $password_hash = password_hash($password, PASSWORD_BCRYPT);

    // Insert new user
    $insert_query = "INSERT INTO users (email, password_hash, full_name, role) VALUES (?, ?, ?, ?)";
    $stmt = $conn->prepare($insert_query);
    $stmt->bind_param('ssss', $email, $password_hash, $full_name, $role);

    if ($stmt->execute()) {
        $user_id = $conn->insert_id;
        
        // Create JWT token (simple implementation)
        $token = generateToken($user_id, $email, $role);
        
        sendSuccess([
            'user_id' => $user_id,
            'email' => $email,
            'full_name' => $full_name,
            'role' => $role,
            'token' => $token
        ], 'User registered successfully');
    } else {
        sendError('Registration failed: ' . $conn->error, 500);
    }
}

// ============================================
// LOGIN - Authenticate user
// ============================================
else if ($action === 'login' && $method === 'POST') {
    $email = $input['email'] ?? null;
    $password = $input['password'] ?? null;

    if (!$email || !$password) {
        sendError('Email and password required', 400);
    }

    // Fetch user
    $query = "SELECT id, email, password_hash, full_name, role FROM users WHERE email = ? AND is_active = TRUE";
    $stmt = $conn->prepare($query);
    $stmt->bind_param('s', $email);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($result->num_rows === 0) {
        sendError('Invalid email or password', 401);
    }

    $user = $result->fetch_assoc();

    // Verify password
    if (!password_verify($password, $user['password_hash'])) {
        sendError('Invalid email or password', 401);
    }

    // Generate JWT token
    $token = generateToken($user['id'], $user['email'], $user['role']);

    sendSuccess([
        'user_id' => $user['id'],
        'email' => $user['email'],
        'full_name' => $user['full_name'],
        'role' => $user['role'],
        'token' => $token
    ], 'Login successful');
}

// ============================================
// GET CURRENT USER - Get logged-in user info
// ============================================
else if ($action === 'current-user' && $method === 'GET') {
    $token = validateAuth();
    $user_data = verifyToken($token);

    if (!$user_data) {
        sendError('Invalid token', 401);
    }

    // Fetch full user details
    $query = "SELECT id, email, full_name, role FROM users WHERE id = ?";
    $stmt = $conn->prepare($query);
    $stmt->bind_param('i', $user_data['user_id']);
    $stmt->execute();
    $result = $stmt->get_result();
    $user = $result->fetch_assoc();

    sendSuccess($user);
}

// ============================================
// UPDATE PROFILE
// ============================================
else if ($action === 'update-profile' && $method === 'POST') {
    $token = validateAuth();
    $user_data = verifyToken($token);

    if (!$user_data) {
        sendError('Invalid token', 401);
    }

    $user_id = $user_data['user_id'];
    $full_name = $input['full_name'] ?? null;
    $phone = $input['phone'] ?? null;

    if ($full_name) {
        $query = "UPDATE users SET full_name = ?, phone = ? WHERE id = ?";
        $stmt = $conn->prepare($query);
        $stmt->bind_param('ssi', $full_name, $phone, $user_id);
        $stmt->execute();

        sendSuccess([], 'Profile updated successfully');
    } else {
        sendError('No fields to update', 400);
    }
}

// ============================================
// CHANGE PASSWORD
// ============================================
else if ($action === 'change-password' && $method === 'POST') {
    $token = validateAuth();
    $user_data = verifyToken($token);

    if (!$user_data) {
        sendError('Invalid token', 401);
    }

    $user_id = $user_data['user_id'];
    $old_password = $input['old_password'] ?? null;
    $new_password = $input['new_password'] ?? null;

    if (!$old_password || !$new_password) {
        sendError('Old and new passwords required', 400);
    }

    // Get current password hash
    $query = "SELECT password_hash FROM users WHERE id = ?";
    $stmt = $conn->prepare($query);
    $stmt->bind_param('i', $user_id);
    $stmt->execute();
    $result = $stmt->get_result();
    $user = $result->fetch_assoc();

    // Verify old password
    if (!password_verify($old_password, $user['password_hash'])) {
        sendError('Current password is incorrect', 401);
    }

    // Hash and update new password
    $new_hash = password_hash($new_password, PASSWORD_BCRYPT);
    $update_query = "UPDATE users SET password_hash = ? WHERE id = ?";
    $stmt = $conn->prepare($update_query);
    $stmt->bind_param('si', $new_hash, $user_id);
    $stmt->execute();

    sendSuccess([], 'Password changed successfully');
}

else {
    sendError('Invalid action or method', 400);
}

// ============================================
// Helper Functions
// ============================================

function generateToken($user_id, $email, $role) {
    // Simple JWT-like token (implement proper JWT library in production)
    $payload = [
        'user_id' => $user_id,
        'email' => $email,
        'role' => $role,
        'iat' => time(),
        'exp' => time() + (24 * 60 * 60) // 24 hours
    ];
    
    // Use a secret key stored in environment or config
    $secret = 'your-secret-key-change-in-production';
    return base64_encode(json_encode($payload)) . '.' . hash_hmac('sha256', base64_encode(json_encode($payload)), $secret);
}

function verifyToken($token) {
    // Simple JWT-like token verification
    $secret = 'your-secret-key-change-in-production';
    $parts = explode('.', $token);
    
    if (count($parts) !== 2) {
        return false;
    }
    
    $payload = json_decode(base64_decode($parts[0]), true);
    $signature = hash_hmac('sha256', $parts[0], $secret);
    
    if ($parts[1] !== $signature) {
        return false;
    }
    
    if ($payload['exp'] < time()) {
        return false;
    }
    
    return $payload;
}

?>
