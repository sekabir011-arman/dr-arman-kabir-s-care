<?php
/**
 * Database Configuration
 * Update these credentials with your cPanel database details
 */

// Database credentials
$db_host = 'localhost';  // Usually localhost on cPanel
$db_user = 'your_cpanel_username_dbuser';  // Create via phpMyAdmin
$db_pass = 'your_database_password';  // Set via phpMyAdmin
$db_name = 'your_cpanel_username_database';  // Create via phpMyAdmin

// Create connection
$conn = new mysqli($db_host, $db_user, $db_pass, $db_name);

// Check connection
if ($conn->connect_error) {
    die(json_encode(['error' => 'Database connection failed: ' . $conn->connect_error]));
}

// Set charset to UTF-8
$conn->set_charset('utf8mb4');

// Enable error reporting for development (disable in production)
error_reporting(E_ALL);
ini_set('display_errors', 1);

// API Response helper
function sendResponse($data, $status = 200) {
    http_response_code($status);
    header('Content-Type: application/json');
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization');
    echo json_encode($data);
    exit();
}

// Error response helper
function sendError($message, $status = 400) {
    sendResponse(['error' => $message], $status);
}

// Success response helper
function sendSuccess($data, $message = 'Success') {
    sendResponse(['success' => true, 'message' => $message, 'data' => $data]);
}

// Validate JWT or session token (basic implementation)
function validateAuth() {
    // Check if Authorization header exists
    $headers = getallheaders();
    if (!isset($headers['Authorization'])) {
        sendError('Unauthorized: No authorization header', 401);
    }
    
    $auth = $headers['Authorization'];
    if (strpos($auth, 'Bearer ') === 0) {
        $token = substr($auth, 7);
        // TODO: Implement JWT validation
        return $token;
    }
    
    sendError('Unauthorized: Invalid token format', 401);
}

// Get current user role from token/session
function getUserRole() {
    // TODO: Extract user role from JWT/session
    return 'user';  // Default role
}

// Check user permissions
function checkPermission($required_role) {
    $user_role = getUserRole();
    $allowed_roles = ['admin', 'doctor', 'patient'];
    
    if (!in_array($user_role, $allowed_roles)) {
        sendError('Unauthorized: Insufficient permissions', 403);
    }
}

?>
