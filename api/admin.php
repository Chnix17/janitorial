<?php
 
 include 'header.php';
 include 'connection-pdo.php';
 
 class Admin{
     private $conn;
 
     public function __construct($connection) {
         $this->conn = $connection;
     }

     private function normalizeBoolInt($value, $default = 1) {
         if ($value === null) return (int)$default;
         if (is_bool($value)) return $value ? 1 : 0;
         if (is_numeric($value)) return ((int)$value) ? 1 : 0;
         $v = strtolower(trim((string)$value));
         if ($v === 'true' || $v === 'yes' || $v === 'on') return 1;
         if ($v === 'false' || $v === 'no' || $v === 'off') return 0;
         return (int)$default;
     }
 
     public function save($data) {
         try {
             if (!is_array($data)) {
                 return json_encode([
                     'success' => false,
                     'message' => 'Invalid payload.'
                 ]);
             }
 
             if (!isset($data['full_name'], $data['username'], $data['password'])) {
                 return json_encode([
                     'success' => false,
                     'message' => 'Missing required fields: full_name, username, password'
                 ]);
             }
 
             $full_name = trim((string)$data['full_name']);
             $username = trim((string)$data['username']);
             $password = (string)$data['password'];
             $role_id = isset($data['role_id']) ? (int)$data['role_id'] : 1;
             $is_active = isset($data['is_active']) ? (int)$data['is_active'] : 1;
 
             if ($full_name === '' || $username === '' || $password === '') {
                 return json_encode([
                     'success' => false,
                     'message' => 'full_name, username, and password cannot be empty.'
                 ]);
             }
 
             $check_stmt = $this->conn->prepare('SELECT user_id FROM tbluser WHERE username = ?');
             $check_stmt->execute([$username]);
             if ($check_stmt->fetch(PDO::FETCH_ASSOC)) {
                 return json_encode([
                     'success' => false,
                     'message' => 'Username already exists'
                 ]);
             }
 
             $hashed_password = password_hash($password, PASSWORD_DEFAULT);
 
             $stmt = $this->conn->prepare('INSERT INTO tbluser (full_name, username, password, role_id, is_active, created_at) VALUES (?, ?, ?, ?, ?, NOW())');
             $stmt->execute([$full_name, $username, $hashed_password, $role_id, $is_active]);
 
             return json_encode([
                 'success' => true,
                 'message' => 'User created successfully',
                 'user_id' => $this->conn->lastInsertId()
             ]);
 
         } catch (PDOException $e) {
             return json_encode([
                 'success' => false,
                 'message' => 'Database error: ' . $e->getMessage()
             ]);
         }
     }
 
     public function getData() {
         try {
             $stmt = $this->conn->prepare('SELECT user_id, full_name, username, role_id, is_active, created_at FROM tbluser ORDER BY created_at DESC');
             $stmt->execute();
             $users = $stmt->fetchAll(PDO::FETCH_ASSOC);
 
             return json_encode([
                 'success' => true,
                 'data' => $users
             ]);
 
         } catch (PDOException $e) {
             return json_encode([
                 'success' => false,
                 'message' => 'Database error: ' . $e->getMessage()
             ]);
         }
     }

     public function update($data) {
         try {
             if (!is_array($data)) {
                 return json_encode([
                     'success' => false,
                     'message' => 'Invalid payload.'
                 ]);
             }

             if (!isset($data['user_id'], $data['full_name'], $data['username'], $data['role_id'])) {
                 return json_encode([
                     'success' => false,
                     'message' => 'Missing required fields: user_id, full_name, username, role_id'
                 ]);
             }

             $user_id = (int)$data['user_id'];
             $full_name = trim((string)$data['full_name']);
             $username = trim((string)$data['username']);
             $role_id = (int)$data['role_id'];
             $is_active = $this->normalizeBoolInt($data['is_active'] ?? 1, 1);
             $password = isset($data['password']) ? (string)$data['password'] : '';

             if ($user_id <= 0) {
                 return json_encode([
                     'success' => false,
                     'message' => 'Invalid user_id.'
                 ]);
             }

             if ($full_name === '' || $username === '') {
                 return json_encode([
                     'success' => false,
                     'message' => 'full_name and username cannot be empty.'
                 ]);
             }

             $check_stmt = $this->conn->prepare('SELECT user_id FROM tbluser WHERE username = ? AND user_id <> ?');
             $check_stmt->execute([$username, $user_id]);
             if ($check_stmt->fetch(PDO::FETCH_ASSOC)) {
                 return json_encode([
                     'success' => false,
                     'message' => 'Username already exists'
                 ]);
             }

             if ($password !== '') {
                 $hashed_password = password_hash($password, PASSWORD_DEFAULT);
                 $stmt = $this->conn->prepare('UPDATE tbluser SET full_name = ?, username = ?, password = ?, role_id = ?, is_active = ? WHERE user_id = ?');
                 $stmt->execute([$full_name, $username, $hashed_password, $role_id, $is_active, $user_id]);
             } else {
                 $stmt = $this->conn->prepare('UPDATE tbluser SET full_name = ?, username = ?, role_id = ?, is_active = ? WHERE user_id = ?');
                 $stmt->execute([$full_name, $username, $role_id, $is_active, $user_id]);
             }

             return json_encode([
                 'success' => true,
                 'message' => 'User updated successfully'
             ]);
         } catch (PDOException $e) {
             return json_encode([
                 'success' => false,
                 'message' => 'Database error: ' . $e->getMessage()
             ]);
         }
     }

     public function setActive($data) {
         try {
             if (!is_array($data)) {
                 return json_encode([
                     'success' => false,
                     'message' => 'Invalid payload.'
                 ]);
             }

             if (!isset($data['user_id'], $data['is_active'])) {
                 return json_encode([
                     'success' => false,
                     'message' => 'Missing required fields: user_id, is_active'
                 ]);
             }

             $user_id = (int)$data['user_id'];
             $is_active = $this->normalizeBoolInt($data['is_active'], 1);

             if ($user_id <= 0) {
                 return json_encode([
                     'success' => false,
                     'message' => 'Invalid user_id.'
                 ]);
             }

             $stmt = $this->conn->prepare('UPDATE tbluser SET is_active = ? WHERE user_id = ?');
             $stmt->execute([$is_active, $user_id]);

             return json_encode([
                 'success' => true,
                 'message' => $is_active ? 'User activated successfully' : 'User archived successfully'
             ]);
         } catch (PDOException $e) {
             return json_encode([
                 'success' => false,
                 'message' => 'Database error: ' . $e->getMessage()
             ]);
         }
     }

     public function getRoles() {
         try {
             $stmt = $this->conn->prepare('SELECT role_id, role_name, description FROM tblrole ORDER BY role_id ASC');
             $stmt->execute();
             $roles = $stmt->fetchAll(PDO::FETCH_ASSOC);

             return json_encode([
                 'success' => true,
                 'data' => $roles
             ]);
         } catch (PDOException $e) {
             return json_encode([
                 'success' => false,
                 'message' => 'Database error: ' . $e->getMessage()
             ]);
         }
     }
 }
 
 $raw = file_get_contents('php://input');
 $body = json_decode($raw, true);
 
 if ($_SERVER['REQUEST_METHOD'] === 'GET'){
     $operation = $_GET['operation'] ?? '';
     $json = $_GET['json'] ?? [];
 } else if($_SERVER['REQUEST_METHOD'] === 'POST'){
     $operation = $body['operation'] ?? ($_POST['operation'] ?? '');
     $json = $body['json'] ?? ($_POST['json'] ?? []);
 } else {
     $operation = '';
     $json = [];
 }
 
 $user = new Admin($conn);
 
 switch($operation){
     case 'save':
         echo $user->save($json);
         break;
     case 'getData':
         echo $user->getData();
         break;
     case 'update':
         echo $user->update($json);
         break;
     case 'setActive':
         echo $user->setActive($json);
         break;
     case 'getRoles':
         echo $user->getRoles();
         break;
     default:
         echo json_encode([
             'success' => false,
             'message' => 'Invalid operation'
         ]);
 }
 
 ?>
