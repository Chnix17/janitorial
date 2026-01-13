<?php

include 'header.php';
include 'connection-pdo.php';

class Login{
    private $conn;
    
    public function __construct($connection) {
        $this->conn = $connection;
    }
    
    public function login($data) {
        try {
            if (!isset($data['username']) || !isset($data['password'])) {
                return json_encode([
                    "success" => false,
                    "message" => "Username and password are required"
                ]);
            }
            
            $username = trim($data['username']);
            $password = $data['password'];
            
            // Get user by username
            $stmt = $this->conn->prepare("
                SELECT user_id, full_name, username, password, role_id, is_active, created_at 
                FROM tbluser 
                WHERE username = ? AND is_active = 1
            ");
            $stmt->execute([$username]);
            $user = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if (!$user) {
                return json_encode([
                    "success" => false,
                    "message" => "Invalid username or password"
                ]);
            }
            
            // Verify password
            if (!password_verify($password, $user['password'])) {
                return json_encode([
                    "success" => false,
                    "message" => "Invalid username or password"
                ]);
            }
            
            // Remove password from response
            unset($user['password']);
            
            return json_encode([
                "success" => true,
                "message" => "Login successful",
                "user" => $user
            ]);
            
        } catch (PDOException $e) {
            return json_encode([
                "success" => false,
                "message" => "Database error: " . $e->getMessage()
            ]);
        }
    }
}

$raw = file_get_contents('php://input');
$body = json_decode($raw, true);

// Get operation and JSON input
if ($_SERVER['REQUEST_METHOD'] === 'GET'){
    $operation = $_GET['operation'] ?? '';
    $json = $_GET['json'] ?? [];
    if (is_string($json)) {
        $decoded = json_decode($json, true);
        if (is_array($decoded)) {
            $json = $decoded;
        }
    }
} else if($_SERVER['REQUEST_METHOD'] === 'POST'){
    $operation = $body['operation'] ?? ($_POST['operation'] ?? '');
    $json = $body['json'] ?? ($_POST['json'] ?? []);
} else {
    $operation = '';
    $json = [];
}

$user = new Login($conn);

switch($operation){
    case "login":
        echo $user->login($json);
        break;

    default:
        echo json_encode([
            "success" => false,
            "message" => "Invalid operation"
        ]);
}

?>