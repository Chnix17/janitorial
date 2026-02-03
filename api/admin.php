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

     public function getRoomChecklists($data) {
         try {
             if (!is_array($data) || !isset($data['room_id'])) {
                 return json_encode([
                     'success' => false,
                     'message' => 'Missing required field: room_id'
                 ]);
             }

             $room_id = (int)$data['room_id'];
             if ($room_id <= 0) {
                 return json_encode([
                     'success' => false,
                     'message' => 'Invalid room_id.'
                 ]);
             }

             $stmt = $this->conn->prepare('SELECT checklist_id, checklist_name, checklist_room_id FROM tblroomchecklist WHERE checklist_room_id = ? ORDER BY checklist_name ASC');
             $stmt->execute([$room_id]);
             $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

             return json_encode([
                 'success' => true,
                 'data' => $rows
             ]);
         } catch (PDOException $e) {
             return json_encode([
                 'success' => false,
                 'message' => 'Database error: ' . $e->getMessage()
             ]);
         }
     }

     public function getAssignedStats($data) {
         try {
             $assigned_user_id = null;
             if (is_array($data) && isset($data['assigned_user_id']) && $data['assigned_user_id'] !== '') {
                 $assigned_user_id = (int)$data['assigned_user_id'];
             }

             if ($assigned_user_id) {
                 $stmt = $this->conn->prepare('
                     SELECT
                         COUNT(*) AS total,
                         SUM(CASE WHEN CURDATE() BETWEEN a.assigned_start_date AND a.assigned_end_date THEN 1 ELSE 0 END) AS active,
                         SUM(CASE WHEN CURDATE() < a.assigned_start_date THEN 1 ELSE 0 END) AS upcoming,
                         SUM(CASE WHEN CURDATE() > a.assigned_end_date THEN 1 ELSE 0 END) AS ended,
                         COUNT(DISTINCT a.assigned_user_id) AS students,
                         COUNT(DISTINCT bf.building_id) AS buildings
                     FROM tblassigned a
                     JOIN tblbuildingfloor bf ON bf.floorbuilding_id = a.assigned_floor_building_id
                     WHERE a.assigned_user_id = ?
                 ');
                 $stmt->execute([$assigned_user_id]);
             } else {
                 $stmt = $this->conn->prepare('
                     SELECT
                         COUNT(*) AS total,
                         SUM(CASE WHEN CURDATE() BETWEEN a.assigned_start_date AND a.assigned_end_date THEN 1 ELSE 0 END) AS active,
                         SUM(CASE WHEN CURDATE() < a.assigned_start_date THEN 1 ELSE 0 END) AS upcoming,
                         SUM(CASE WHEN CURDATE() > a.assigned_end_date THEN 1 ELSE 0 END) AS ended,
                         COUNT(DISTINCT a.assigned_user_id) AS students,
                         COUNT(DISTINCT bf.building_id) AS buildings
                     FROM tblassigned a
                     JOIN tblbuildingfloor bf ON bf.floorbuilding_id = a.assigned_floor_building_id
                 ');
                 $stmt->execute();
             }

             $row = $stmt->fetch(PDO::FETCH_ASSOC);
             if (!$row) {
                 $row = [
                     'total' => 0,
                     'active' => 0,
                     'upcoming' => 0,
                     'ended' => 0,
                     'students' => 0,
                     'buildings' => 0
                 ];
             }

             return json_encode([
                 'success' => true,
                 'data' => [
                     'total' => (int)($row['total'] ?? 0),
                     'active' => (int)($row['active'] ?? 0),
                     'upcoming' => (int)($row['upcoming'] ?? 0),
                     'ended' => (int)($row['ended'] ?? 0),
                     'students' => (int)($row['students'] ?? 0),
                     'buildings' => (int)($row['buildings'] ?? 0)
                 ]
             ]);
         } catch (PDOException $e) {
             return json_encode([
                 'success' => false,
                 'message' => 'Database error: ' . $e->getMessage()
             ]);
         }
     }

     public function createChecklist($data) {
         try {
             if (!is_array($data) || !isset($data['checklist_room_id'], $data['checklist_name'])) {
                 return json_encode([
                     'success' => false,
                     'message' => 'Missing required fields: checklist_room_id, checklist_name'
                 ]);
             }

             $room_id = (int)$data['checklist_room_id'];
             $name = trim((string)$data['checklist_name']);

             if ($room_id <= 0) {
                 return json_encode([
                     'success' => false,
                     'message' => 'Invalid checklist_room_id.'
                 ]);
             }
             if ($name === '') {
                 return json_encode([
                     'success' => false,
                     'message' => 'checklist_name cannot be empty.'
                 ]);
             }

             $checkRoom = $this->conn->prepare('SELECT room_id FROM tblroom WHERE room_id = ?');
             $checkRoom->execute([$room_id]);
             if (!$checkRoom->fetch(PDO::FETCH_ASSOC)) {
                 return json_encode([
                     'success' => false,
                     'message' => 'Room not found.'
                 ]);
             }

             $checkDup = $this->conn->prepare('SELECT checklist_id FROM tblroomchecklist WHERE checklist_room_id = ? AND LOWER(checklist_name) = LOWER(?)');
             $checkDup->execute([$room_id, $name]);
             if ($checkDup->fetch(PDO::FETCH_ASSOC)) {
                 return json_encode([
                     'success' => false,
                     'message' => 'Checklist already exists for this room.'
                 ]);
             }

             $stmt = $this->conn->prepare('INSERT INTO tblroomchecklist (checklist_name, checklist_room_id) VALUES (?, ?)');
             $stmt->execute([$name, $room_id]);

             return json_encode([
                 'success' => true,
                 'message' => 'Checklist created successfully',
                 'checklist_id' => $this->conn->lastInsertId()
             ]);
         } catch (PDOException $e) {
             return json_encode([
                 'success' => false,
                 'message' => 'Database error: ' . $e->getMessage()
             ]);
         }
     }

     public function updateChecklist($data) {
         try {
             if (!is_array($data) || !isset($data['checklist_id'], $data['checklist_name'])) {
                 return json_encode([
                     'success' => false,
                     'message' => 'Missing required fields: checklist_id, checklist_name'
                 ]);
             }

             $checklist_id = (int)$data['checklist_id'];
             $name = trim((string)$data['checklist_name']);

             if ($checklist_id <= 0) {
                 return json_encode([
                     'success' => false,
                     'message' => 'Invalid checklist_id.'
                 ]);
             }
             if ($name === '') {
                 return json_encode([
                     'success' => false,
                     'message' => 'checklist_name cannot be empty.'
                 ]);
             }

             $get = $this->conn->prepare('SELECT checklist_id, checklist_room_id FROM tblroomchecklist WHERE checklist_id = ?');
             $get->execute([$checklist_id]);
             $existing = $get->fetch(PDO::FETCH_ASSOC);
             if (!$existing) {
                 return json_encode([
                     'success' => false,
                     'message' => 'Checklist not found.'
                 ]);
             }

             $room_id = (int)$existing['checklist_room_id'];
             $checkDup = $this->conn->prepare('SELECT checklist_id FROM tblroomchecklist WHERE checklist_room_id = ? AND LOWER(checklist_name) = LOWER(?) AND checklist_id <> ?');
             $checkDup->execute([$room_id, $name, $checklist_id]);
             if ($checkDup->fetch(PDO::FETCH_ASSOC)) {
                 return json_encode([
                     'success' => false,
                     'message' => 'Checklist already exists for this room.'
                 ]);
             }

             $stmt = $this->conn->prepare('UPDATE tblroomchecklist SET checklist_name = ? WHERE checklist_id = ?');
             $stmt->execute([$name, $checklist_id]);

             return json_encode([
                 'success' => true,
                 'message' => 'Checklist updated successfully'
             ]);
         } catch (PDOException $e) {
             return json_encode([
                 'success' => false,
                 'message' => 'Database error: ' . $e->getMessage()
             ]);
         }
     }

     public function deleteChecklist($data) {
         try {
             if (!is_array($data) || !isset($data['checklist_id'])) {
                 return json_encode([
                     'success' => false,
                     'message' => 'Missing required field: checklist_id'
                 ]);
             }

             $checklist_id = (int)$data['checklist_id'];
             if ($checklist_id <= 0) {
                 return json_encode([
                     'success' => false,
                     'message' => 'Invalid checklist_id.'
                 ]);
             }

             $checkUsed = $this->conn->prepare('SELECT operation_id FROM tblassignedoperation WHERE operation_checklist_id = ? LIMIT 1');
             $checkUsed->execute([$checklist_id]);
             if ($checkUsed->fetch(PDO::FETCH_ASSOC)) {
                 return json_encode([
                     'success' => false,
                     'message' => 'Cannot delete checklist with existing operation records.'
                 ]);
             }

             $stmt = $this->conn->prepare('DELETE FROM tblroomchecklist WHERE checklist_id = ?');
             $stmt->execute([$checklist_id]);

             return json_encode([
                 'success' => true,
                 'message' => 'Checklist deleted successfully'
             ]);
         } catch (PDOException $e) {
             return json_encode([
                 'success' => false,
                 'message' => 'Database error: ' . $e->getMessage()
             ]);
         }
     }

     public function createChecklistBulk($data) {
         try {
             if (!is_array($data) || !isset($data['checklist_room_id'], $data['checklist_names'])) {
                 return json_encode([
                     'success' => false,
                     'message' => 'Missing required fields: checklist_room_id, checklist_names'
                 ]);
             }

             $room_id = (int)$data['checklist_room_id'];
             $names = $data['checklist_names'];

             if ($room_id <= 0) {
                 return json_encode([
                     'success' => false,
                     'message' => 'Invalid checklist_room_id.'
                 ]);
             }
             if (!is_array($names) || count($names) === 0) {
                 return json_encode([
                     'success' => false,
                     'message' => 'checklist_names must be a non-empty array.'
                 ]);
             }

             $checkRoom = $this->conn->prepare('SELECT room_id FROM tblroom WHERE room_id = ?');
             $checkRoom->execute([$room_id]);
             if (!$checkRoom->fetch(PDO::FETCH_ASSOC)) {
                 return json_encode([
                     'success' => false,
                     'message' => 'Room not found.'
                 ]);
             }

             $normalized = [];
             foreach ($names as $n) {
                 $value = trim((string)$n);
                 if ($value === '') continue;
                 $normalized[strtolower($value)] = $value;
             }
             if (count($normalized) === 0) {
                 return json_encode([
                     'success' => false,
                     'message' => 'No valid checklist names provided.'
                 ]);
             }

             $this->conn->beginTransaction();

             $inserted = 0;
             $skipped = [];

             $checkDup = $this->conn->prepare('SELECT checklist_id FROM tblroomchecklist WHERE checklist_room_id = ? AND LOWER(checklist_name) = LOWER(?)');
             $ins = $this->conn->prepare('INSERT INTO tblroomchecklist (checklist_name, checklist_room_id) VALUES (?, ?)');

             foreach ($normalized as $val) {
                 $checkDup->execute([$room_id, $val]);
                 if ($checkDup->fetch(PDO::FETCH_ASSOC)) {
                     $skipped[] = $val;
                     continue;
                 }
                 $ins->execute([$val, $room_id]);
                 $inserted++;
             }

             $this->conn->commit();

             return json_encode([
                 'success' => true,
                 'message' => 'Checklist items created successfully',
                 'inserted' => $inserted,
                 'skipped' => $skipped
             ]);
         } catch (PDOException $e) {
             if ($this->conn->inTransaction()) {
                 $this->conn->rollBack();
             }
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

     public function getBuildings() {
         try {
             $stmt = $this->conn->prepare('SELECT building_id, building_name FROM tblbuilding ORDER BY building_name ASC');
             $stmt->execute();
             $buildings = $stmt->fetchAll(PDO::FETCH_ASSOC);

             return json_encode([
                 'success' => true,
                 'data' => $buildings
             ]);
         } catch (PDOException $e) {
             return json_encode([
                 'success' => false,
                 'message' => 'Database error: ' . $e->getMessage()
             ]);
         }
     }

     public function createBuilding($data) {
         try {
             if (!is_array($data) || !isset($data['building_name'])) {
                 return json_encode([
                     'success' => false,
                     'message' => 'Missing required field: building_name'
                 ]);
             }

             $building_name = trim((string)$data['building_name']);
             if ($building_name === '') {
                 return json_encode([
                     'success' => false,
                     'message' => 'building_name cannot be empty.'
                 ]);
             }

             $check = $this->conn->prepare('SELECT building_id FROM tblbuilding WHERE LOWER(building_name) = LOWER(?)');
             $check->execute([$building_name]);
             if ($check->fetch(PDO::FETCH_ASSOC)) {
                 return json_encode([
                     'success' => false,
                     'message' => 'Building name already exists.'
                 ]);
             }

             $stmt = $this->conn->prepare('INSERT INTO tblbuilding (building_name) VALUES (?)');
             $stmt->execute([$building_name]);

             return json_encode([
                 'success' => true,
                 'message' => 'Building created successfully',
                 'building_id' => $this->conn->lastInsertId()
             ]);
         } catch (PDOException $e) {
             return json_encode([
                 'success' => false,
                 'message' => 'Database error: ' . $e->getMessage()
             ]);
         }
     }

     public function updateBuilding($data) {
         try {
             if (!is_array($data) || !isset($data['building_id'], $data['building_name'])) {
                 return json_encode([
                     'success' => false,
                     'message' => 'Missing required fields: building_id, building_name'
                 ]);
             }

             $building_id = (int)$data['building_id'];
             $building_name = trim((string)$data['building_name']);

             if ($building_id <= 0) {
                 return json_encode([
                     'success' => false,
                     'message' => 'Invalid building_id.'
                 ]);
             }
             if ($building_name === '') {
                 return json_encode([
                     'success' => false,
                     'message' => 'building_name cannot be empty.'
                 ]);
             }

             $check = $this->conn->prepare('SELECT building_id FROM tblbuilding WHERE LOWER(building_name) = LOWER(?) AND building_id <> ?');
             $check->execute([$building_name, $building_id]);
             if ($check->fetch(PDO::FETCH_ASSOC)) {
                 return json_encode([
                     'success' => false,
                     'message' => 'Building name already exists.'
                 ]);
             }

             $stmt = $this->conn->prepare('UPDATE tblbuilding SET building_name = ? WHERE building_id = ?');
             $stmt->execute([$building_name, $building_id]);

             return json_encode([
                 'success' => true,
                 'message' => 'Building updated successfully'
             ]);
         } catch (PDOException $e) {
             return json_encode([
                 'success' => false,
                 'message' => 'Database error: ' . $e->getMessage()
             ]);
         }
     }

     public function deleteBuilding($data) {
         try {
             if (!is_array($data) || !isset($data['building_id'])) {
                 return json_encode([
                     'success' => false,
                     'message' => 'Missing required field: building_id'
                 ]);
             }
             $building_id = (int)$data['building_id'];
             if ($building_id <= 0) {
                 return json_encode([
                     'success' => false,
                     'message' => 'Invalid building_id.'
                 ]);
             }

             $checkRooms = $this->conn->prepare('SELECT r.room_id FROM tblroom r JOIN tblbuildingfloor bf ON bf.floorbuilding_id = r.room_building_floor_id WHERE bf.building_id = ? LIMIT 1');
             $checkRooms->execute([$building_id]);
             if ($checkRooms->fetch(PDO::FETCH_ASSOC)) {
                 return json_encode([
                     'success' => false,
                     'message' => 'Cannot delete building with existing rooms.'
                 ]);
             }

             $stmt = $this->conn->prepare('DELETE FROM tblbuilding WHERE building_id = ?');
             $stmt->execute([$building_id]);

             return json_encode([
                 'success' => true,
                 'message' => 'Building deleted successfully'
             ]);
         } catch (PDOException $e) {
             return json_encode([
                 'success' => false,
                 'message' => 'Database error: ' . $e->getMessage()
             ]);
         }
     }

     public function getRooms($data) {
         try {
             $building_id = null;
             $floorbuilding_id = null;

             if (is_array($data) && isset($data['building_id']) && $data['building_id'] !== '') {
                 $building_id = (int)$data['building_id'];
             }
             if (is_array($data) && isset($data['floorbuilding_id']) && $data['floorbuilding_id'] !== '') {
                 $floorbuilding_id = (int)$data['floorbuilding_id'];
             }

             if ($floorbuilding_id) {
                 $stmt = $this->conn->prepare('SELECT r.room_id, r.room_number, r.room_building_floor_id, bf.floorbuilding_id, bf.building_id, b.building_name, bf.floor_id, f.floor_name FROM tblroom r JOIN tblbuildingfloor bf ON bf.floorbuilding_id = r.room_building_floor_id JOIN tblbuilding b ON b.building_id = bf.building_id JOIN tblfloor f ON f.floor_id = bf.floor_id WHERE bf.floorbuilding_id = ? ORDER BY b.building_name ASC, f.floor_name ASC, r.room_number ASC');
                 $stmt->execute([$floorbuilding_id]);
             } elseif ($building_id) {
                 $stmt = $this->conn->prepare('SELECT r.room_id, r.room_number, r.room_building_floor_id, bf.floorbuilding_id, bf.building_id, b.building_name, bf.floor_id, f.floor_name FROM tblroom r JOIN tblbuildingfloor bf ON bf.floorbuilding_id = r.room_building_floor_id JOIN tblbuilding b ON b.building_id = bf.building_id JOIN tblfloor f ON f.floor_id = bf.floor_id WHERE bf.building_id = ? ORDER BY b.building_name ASC, f.floor_name ASC, r.room_number ASC');
                 $stmt->execute([$building_id]);
             } else {
                 $stmt = $this->conn->prepare('SELECT r.room_id, r.room_number, r.room_building_floor_id, bf.floorbuilding_id, bf.building_id, b.building_name, bf.floor_id, f.floor_name FROM tblroom r JOIN tblbuildingfloor bf ON bf.floorbuilding_id = r.room_building_floor_id JOIN tblbuilding b ON b.building_id = bf.building_id JOIN tblfloor f ON f.floor_id = bf.floor_id ORDER BY b.building_name ASC, f.floor_name ASC, r.room_number ASC');
                 $stmt->execute();
             }

             $rooms = $stmt->fetchAll(PDO::FETCH_ASSOC);
             return json_encode([
                 'success' => true,
                 'data' => $rooms
             ]);
         } catch (PDOException $e) {
             return json_encode([
                 'success' => false,
                 'message' => 'Database error: ' . $e->getMessage()
             ]);
         }
     }

     public function createRoom($data) {
         try {
             if (!is_array($data) || !isset($data['room_building_floor_id'], $data['room_number'])) {
                 return json_encode([
                     'success' => false,
                     'message' => 'Missing required fields: room_building_floor_id, room_number'
                 ]);
             }

             $room_building_floor_id = (int)$data['room_building_floor_id'];
             $room_number = trim((string)$data['room_number']);

             if ($room_building_floor_id <= 0) {
                 return json_encode([
                     'success' => false,
                     'message' => 'Invalid room_building_floor_id.'
                 ]);
             }
             if ($room_number === '') {
                 return json_encode([
                     'success' => false,
                     'message' => 'room_number cannot be empty.'
                 ]);
             }

             $checkFloor = $this->conn->prepare('SELECT floorbuilding_id FROM tblbuildingfloor WHERE floorbuilding_id = ?');
             $checkFloor->execute([$room_building_floor_id]);
             if (!$checkFloor->fetch(PDO::FETCH_ASSOC)) {
                 return json_encode([
                     'success' => false,
                     'message' => 'Building floor not found.'
                 ]);
             }

             $check = $this->conn->prepare('SELECT room_id FROM tblroom WHERE room_building_floor_id = ? AND LOWER(room_number) = LOWER(?)');
             $check->execute([$room_building_floor_id, $room_number]);
             if ($check->fetch(PDO::FETCH_ASSOC)) {
                 return json_encode([
                     'success' => false,
                     'message' => 'Room number already exists for this floor.'
                 ]);
             }

             $stmt = $this->conn->prepare('INSERT INTO tblroom (room_number, room_building_floor_id) VALUES (?, ?)');
             $stmt->execute([$room_number, $room_building_floor_id]);

             return json_encode([
                 'success' => true,
                 'message' => 'Room created successfully',
                 'room_id' => $this->conn->lastInsertId()
             ]);
         } catch (PDOException $e) {
             return json_encode([
                 'success' => false,
                 'message' => 'Database error: ' . $e->getMessage()
             ]);
         }
     }

     public function updateRoom($data) {
         try {
             if (!is_array($data) || !isset($data['room_id'], $data['room_building_floor_id'], $data['room_number'])) {
                 return json_encode([
                     'success' => false,
                     'message' => 'Missing required fields: room_id, room_building_floor_id, room_number'
                 ]);
             }

             $room_id = (int)$data['room_id'];
             $room_building_floor_id = (int)$data['room_building_floor_id'];
             $room_number = trim((string)$data['room_number']);

             if ($room_id <= 0) {
                 return json_encode([
                     'success' => false,
                     'message' => 'Invalid room_id.'
                 ]);
             }
             if ($room_building_floor_id <= 0) {
                 return json_encode([
                     'success' => false,
                     'message' => 'Invalid room_building_floor_id.'
                 ]);
             }
             if ($room_number === '') {
                 return json_encode([
                     'success' => false,
                     'message' => 'room_number cannot be empty.'
                 ]);
             }

             $checkFloor = $this->conn->prepare('SELECT floorbuilding_id FROM tblbuildingfloor WHERE floorbuilding_id = ?');
             $checkFloor->execute([$room_building_floor_id]);
             if (!$checkFloor->fetch(PDO::FETCH_ASSOC)) {
                 return json_encode([
                     'success' => false,
                     'message' => 'Building floor not found.'
                 ]);
             }

             $check = $this->conn->prepare('SELECT room_id FROM tblroom WHERE room_building_floor_id = ? AND LOWER(room_number) = LOWER(?) AND room_id <> ?');
             $check->execute([$room_building_floor_id, $room_number, $room_id]);
             if ($check->fetch(PDO::FETCH_ASSOC)) {
                 return json_encode([
                     'success' => false,
                     'message' => 'Room number already exists for this floor.'
                 ]);
             }

             $stmt = $this->conn->prepare('UPDATE tblroom SET room_building_floor_id = ?, room_number = ? WHERE room_id = ?');
             $stmt->execute([$room_building_floor_id, $room_number, $room_id]);

             return json_encode([
                 'success' => true,
                 'message' => 'Room updated successfully'
             ]);
         } catch (PDOException $e) {
             return json_encode([
                 'success' => false,
                 'message' => 'Database error: ' . $e->getMessage()
             ]);
         }
     }

     public function deleteRoom($data) {
         try {
             if (!is_array($data) || !isset($data['room_id'])) {
                 return json_encode([
                     'success' => false,
                     'message' => 'Missing required field: room_id'
                 ]);
             }
             $room_id = (int)$data['room_id'];
             if ($room_id <= 0) {
                 return json_encode([
                     'success' => false,
                     'message' => 'Invalid room_id.'
                 ]);
             }

             $checkAssign = $this->conn->prepare('SELECT assignment_id FROM tblassignment WHERE room_id = ? LIMIT 1');
             $checkAssign->execute([$room_id]);
             if ($checkAssign->fetch(PDO::FETCH_ASSOC)) {
                 return json_encode([
                     'success' => false,
                     'message' => 'Cannot delete room with existing assignments.'
                 ]);
             }

             $stmt = $this->conn->prepare('DELETE FROM tblroom WHERE room_id = ?');
             $stmt->execute([$room_id]);

             return json_encode([
                 'success' => true,
                 'message' => 'Room deleted successfully'
             ]);
         } catch (PDOException $e) {
             return json_encode([
                 'success' => false,
                 'message' => 'Database error: ' . $e->getMessage()
             ]);
         }
     }

    public function getFloorNames() {
        try {
            $stmt = $this->conn->prepare('SELECT floor_id, floor_name FROM tblfloor ORDER BY floor_name ASC');
            $stmt->execute();
            $floors = $stmt->fetchAll(PDO::FETCH_ASSOC);
            return json_encode([
                 'success' => true,
                 'data' => $floors
             ]);
         } catch (PDOException $e) {
             return json_encode([
                 'success' => false,
                 'message' => 'Database error: ' . $e->getMessage()
             ]);
         }
     }

    public function createFloorName($data) {
        try {
            if (!is_array($data) || !isset($data['floor_name'])) {
                return json_encode([
                    'success' => false,
                    'message' => 'Missing required field: floor_name'
                ]);
            }

            $floor_name = trim((string)$data['floor_name']);
            if ($floor_name === '') {
                return json_encode([
                    'success' => false,
                    'message' => 'floor_name cannot be empty.'
                ]);
            }

            $check = $this->conn->prepare('SELECT floor_id FROM tblfloor WHERE LOWER(floor_name) = LOWER(?)');
            $check->execute([$floor_name]);
            if ($check->fetch(PDO::FETCH_ASSOC)) {
                return json_encode([
                    'success' => false,
                    'message' => 'Floor name already exists.'
                ]);
            }

            $stmt = $this->conn->prepare('INSERT INTO tblfloor (floor_name) VALUES (?)');
            $stmt->execute([$floor_name]);

            return json_encode([
                'success' => true,
                'message' => 'Floor name created successfully',
                'floor_id' => $this->conn->lastInsertId()
            ]);
        } catch (PDOException $e) {
            return json_encode([
                'success' => false,
                'message' => 'Database error: ' . $e->getMessage()
            ]);
        }
    }

    public function createRoomsBulk($data) {
        try {
            if (!is_array($data) || !isset($data['room_building_floor_id'], $data['room_numbers'])) {
                return json_encode([
                    'success' => false,
                    'message' => 'Missing required fields: room_building_floor_id, room_numbers'
                ]);
            }

            $room_building_floor_id = (int)$data['room_building_floor_id'];
            $room_numbers = $data['room_numbers'];

            if ($room_building_floor_id <= 0) {
                return json_encode([
                    'success' => false,
                    'message' => 'Invalid room_building_floor_id.'
                ]);
            }
            if (!is_array($room_numbers) || count($room_numbers) === 0) {
                return json_encode([
                    'success' => false,
                    'message' => 'room_numbers must be a non-empty array.'
                ]);
            }

            $checkFloor = $this->conn->prepare('SELECT floorbuilding_id FROM tblbuildingfloor WHERE floorbuilding_id = ?');
            $checkFloor->execute([$room_building_floor_id]);
            if (!$checkFloor->fetch(PDO::FETCH_ASSOC)) {
                return json_encode([
                    'success' => false,
                    'message' => 'Building floor not found.'
                ]);
            }

            $normalized = [];
            foreach ($room_numbers as $rn) {
                $value = trim((string)$rn);
                if ($value === '') continue;
                $normalized[strtolower($value)] = $value;
            }
            if (count($normalized) === 0) {
                return json_encode([
                    'success' => false,
                    'message' => 'No valid room numbers provided.'
                ]);
            }

            $this->conn->beginTransaction();

            $inserted = 0;
            $skipped = [];

            $check = $this->conn->prepare('SELECT room_id FROM tblroom WHERE room_building_floor_id = ? AND LOWER(room_number) = LOWER(?)');
            $ins = $this->conn->prepare('INSERT INTO tblroom (room_number, room_building_floor_id) VALUES (?, ?)');

            foreach ($normalized as $val) {
                $check->execute([$room_building_floor_id, $val]);
                if ($check->fetch(PDO::FETCH_ASSOC)) {
                    $skipped[] = $val;
                    continue;
                }

                $ins->execute([$val, $room_building_floor_id]);
                $inserted++;
            }

            $this->conn->commit();

            return json_encode([
                'success' => true,
                'message' => 'Rooms created successfully',
                'inserted' => $inserted,
                'skipped' => $skipped
            ]);
        } catch (PDOException $e) {
            if ($this->conn->inTransaction()) {
                $this->conn->rollBack();
            }
            return json_encode([
                'success' => false,
                'message' => 'Database error: ' . $e->getMessage()
            ]);
        }
    }

    public function updateFloorName($data) {
        try {
            if (!is_array($data) || !isset($data['floor_id'], $data['floor_name'])) {
                return json_encode([
                    'success' => false,
                    'message' => 'Missing required fields: floor_id, floor_name'
                ]);
            }

            $floor_id = (int)$data['floor_id'];
            $floor_name = trim((string)$data['floor_name']);

            if ($floor_id <= 0) {
                return json_encode([
                    'success' => false,
                    'message' => 'Invalid floor_id.'
                ]);
            }

            if ($floor_name === '') {
                return json_encode([
                    'success' => false,
                    'message' => 'floor_name cannot be empty.'
                ]);
            }

            $check = $this->conn->prepare('SELECT floor_id FROM tblfloor WHERE LOWER(floor_name) = LOWER(?) AND floor_id <> ?');
            $check->execute([$floor_name, $floor_id]);
            if ($check->fetch(PDO::FETCH_ASSOC)) {
                return json_encode([
                    'success' => false,
                    'message' => 'Floor name already exists.'
                ]);
            }

            $stmt = $this->conn->prepare('UPDATE tblfloor SET floor_name = ? WHERE floor_id = ?');
            $stmt->execute([$floor_name, $floor_id]);

            return json_encode([
                'success' => true,
                'message' => 'Floor name updated successfully'
            ]);
        } catch (PDOException $e) {
            return json_encode([
                'success' => false,
                'message' => 'Database error: ' . $e->getMessage()
            ]);
        }
    }

    public function deleteFloorName($data) {
        try {
            if (!is_array($data) || !isset($data['floor_id'])) {
                return json_encode([
                    'success' => false,
                    'message' => 'Missing required field: floor_id'
                ]);
            }

            $floor_id = (int)$data['floor_id'];
            if ($floor_id <= 0) {
                return json_encode([
                    'success' => false,
                    'message' => 'Invalid floor_id.'
                ]);
            }

            $check = $this->conn->prepare('SELECT floorbuilding_id FROM tblbuildingfloor WHERE floor_id = ? LIMIT 1');
            $check->execute([$floor_id]);
            if ($check->fetch(PDO::FETCH_ASSOC)) {
                return json_encode([
                    'success' => false,
                    'message' => 'Cannot delete floor name that is assigned to a building.'
                ]);
            }

            $stmt = $this->conn->prepare('DELETE FROM tblfloor WHERE floor_id = ?');
            $stmt->execute([$floor_id]);

            return json_encode([
                'success' => true,
                'message' => 'Floor name deleted successfully'
            ]);
        } catch (PDOException $e) {
            return json_encode([
                'success' => false,
                'message' => 'Database error: ' . $e->getMessage()
            ]);
        }
    }

    public function getFloors($data) {
        try {
            $building_id = null;
            if (is_array($data) && isset($data['building_id']) && $data['building_id'] !== '') {
                $building_id = (int)$data['building_id'];
            }

            if ($building_id) {
                $stmt = $this->conn->prepare('SELECT bf.floorbuilding_id, bf.building_id, b.building_name, bf.floor_id, f.floor_name FROM tblbuildingfloor bf JOIN tblbuilding b ON b.building_id = bf.building_id JOIN tblfloor f ON f.floor_id = bf.floor_id WHERE bf.building_id = ? ORDER BY b.building_name ASC, f.floor_name ASC');
                $stmt->execute([$building_id]);
            } else {
                $stmt = $this->conn->prepare('SELECT bf.floorbuilding_id, bf.building_id, b.building_name, bf.floor_id, f.floor_name FROM tblbuildingfloor bf JOIN tblbuilding b ON b.building_id = bf.building_id JOIN tblfloor f ON f.floor_id = bf.floor_id ORDER BY b.building_name ASC, f.floor_name ASC');
                $stmt->execute();
            }

            $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
            return json_encode([
                'success' => true,
                'data' => $rows
            ]);
        } catch (PDOException $e) {
            return json_encode([
                'success' => false,
                'message' => 'Database error: ' . $e->getMessage()
            ]);
        }
    }


    public function createFloor($data) {
        try {
            if (!is_array($data) || !isset($data['building_id'], $data['floor_id'])) {
                return json_encode([
                    'success' => false,
                    'message' => 'Missing required fields: building_id, floor_id'
                ]);
            }

            $building_id = (int)$data['building_id'];
            $floor_id = (int)$data['floor_id'];

            if ($building_id <= 0) {
                return json_encode([
                    'success' => false,
                    'message' => 'Invalid building_id.'
                ]);
            }
            if ($floor_id <= 0) {
                return json_encode([
                    'success' => false,
                    'message' => 'Invalid floor_id.'
                ]);
            }

            $checkBuilding = $this->conn->prepare('SELECT building_id FROM tblbuilding WHERE building_id = ?');
            $checkBuilding->execute([$building_id]);
            if (!$checkBuilding->fetch(PDO::FETCH_ASSOC)) {
                return json_encode([
                    'success' => false,
                    'message' => 'Building not found.'
                ]);
            }

            $checkFloor = $this->conn->prepare('SELECT floor_id FROM tblfloor WHERE floor_id = ?');
            $checkFloor->execute([$floor_id]);
            if (!$checkFloor->fetch(PDO::FETCH_ASSOC)) {
                return json_encode([
                    'success' => false,
                    'message' => 'Floor not found.'
                ]);
            }

            $check = $this->conn->prepare('SELECT floorbuilding_id FROM tblbuildingfloor WHERE building_id = ? AND floor_id = ?');
            $check->execute([$building_id, $floor_id]);
            if ($check->fetch(PDO::FETCH_ASSOC)) {
                return json_encode([
                    'success' => false,
                    'message' => 'Floor already assigned to this building.'
                ]);
            }

            $stmt = $this->conn->prepare('INSERT INTO tblbuildingfloor (building_id, floor_id) VALUES (?, ?)');
            $stmt->execute([$building_id, $floor_id]);

            return json_encode([
                'success' => true,
                'message' => 'Floor assigned successfully',
                'floorbuilding_id' => $this->conn->lastInsertId()
            ]);
        } catch (PDOException $e) {
            return json_encode([
                'success' => false,
                'message' => 'Database error: ' . $e->getMessage()
            ]);
        }
    }

    public function updateFloor($data) {
        try {
            if (!is_array($data) || !isset($data['floorbuilding_id'], $data['building_id'], $data['floor_id'])) {
                return json_encode([
                    'success' => false,
                    'message' => 'Missing required fields: floorbuilding_id, building_id, floor_id'
                ]);
            }

            $floorbuilding_id = (int)$data['floorbuilding_id'];
            $building_id = (int)$data['building_id'];
            $floor_id = (int)$data['floor_id'];

            if ($floorbuilding_id <= 0) {
                return json_encode([
                    'success' => false,
                    'message' => 'Invalid floorbuilding_id.'
                ]);
            }
            if ($building_id <= 0) {
                return json_encode([
                    'success' => false,
                    'message' => 'Invalid building_id.'
                ]);
            }
            if ($floor_id <= 0) {
                return json_encode([
                    'success' => false,
                    'message' => 'Invalid floor_id.'
                ]);
            }

            $checkDup = $this->conn->prepare('SELECT floorbuilding_id FROM tblbuildingfloor WHERE building_id = ? AND floor_id = ? AND floorbuilding_id <> ?');
            $checkDup->execute([$building_id, $floor_id, $floorbuilding_id]);
            if ($checkDup->fetch(PDO::FETCH_ASSOC)) {
                return json_encode([
                    'success' => false,
                    'message' => 'Floor already assigned to this building.'
                ]);
            }

            $stmt = $this->conn->prepare('UPDATE tblbuildingfloor SET building_id = ?, floor_id = ? WHERE floorbuilding_id = ?');
            $stmt->execute([$building_id, $floor_id, $floorbuilding_id]);

            return json_encode([
                'success' => true,
                'message' => 'Assignment updated successfully'
            ]);
        } catch (PDOException $e) {
            return json_encode([
                'success' => false,
                'message' => 'Database error: ' . $e->getMessage()
            ]);
        }
    }

    public function deleteFloor($data) {
        try {
            if (!is_array($data) || !isset($data['floorbuilding_id'])) {
                return json_encode([
                    'success' => false,
                    'message' => 'Missing required field: floorbuilding_id'
                ]);
            }

            $floorbuilding_id = (int)$data['floorbuilding_id'];
            if ($floorbuilding_id <= 0) {
                return json_encode([
                    'success' => false,
                    'message' => 'Invalid floorbuilding_id.'
                ]);
            }

            $stmt = $this->conn->prepare('DELETE FROM tblbuildingfloor WHERE floorbuilding_id = ?');
            $stmt->execute([$floorbuilding_id]);

            return json_encode([
                'success' => true,
                'message' => 'Assignment deleted successfully'
            ]);
        } catch (PDOException $e) {
            return json_encode([
                'success' => false,
                'message' => 'Database error: ' . $e->getMessage()
            ]);
        }
    }

     public function getStudents() {
         try {
             $stmt = $this->conn->prepare('SELECT u.user_id, u.full_name, u.username, u.role_id, u.is_active, u.created_at FROM tbluser u JOIN tblrole r ON r.role_id = u.role_id WHERE LOWER(r.role_name) = LOWER(?) AND (u.is_active = 1 OR u.is_active = "1") ORDER BY u.full_name ASC');
             $stmt->execute(['Student']);
             $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

             return json_encode([
                 'success' => true,
                 'data' => $rows
             ]);
         } catch (PDOException $e) {
             return json_encode([
                 'success' => false,
                 'message' => 'Database error: ' . $e->getMessage()
             ]);
         }
     }

     public function getAssigned($data) {
         try {
             $assigned_user_id = null;
             if (is_array($data) && isset($data['assigned_user_id']) && $data['assigned_user_id'] !== '') {
                 $assigned_user_id = (int)$data['assigned_user_id'];
             }

             if ($assigned_user_id) {
                 $stmt = $this->conn->prepare('SELECT a.assigned_id, a.assigned_user_id, u.full_name AS assigned_user_name, a.assigned_floor_building_id, b.building_name, f.floor_name, a.assigned_start_date, a.assigned_end_date, a.assigned_by_user_id, a.assigned_created_at FROM tblassigned a JOIN tbluser u ON u.user_id = a.assigned_user_id JOIN tblbuildingfloor bf ON bf.floorbuilding_id = a.assigned_floor_building_id JOIN tblbuilding b ON b.building_id = bf.building_id JOIN tblfloor f ON f.floor_id = bf.floor_id WHERE a.assigned_user_id = ? ORDER BY a.assigned_created_at DESC');
                 $stmt->execute([$assigned_user_id]);
             } else {
                 $stmt = $this->conn->prepare('SELECT a.assigned_id, a.assigned_user_id, u.full_name AS assigned_user_name, a.assigned_floor_building_id, b.building_name, f.floor_name, a.assigned_start_date, a.assigned_end_date, a.assigned_by_user_id, a.assigned_created_at FROM tblassigned a JOIN tbluser u ON u.user_id = a.assigned_user_id JOIN tblbuildingfloor bf ON bf.floorbuilding_id = a.assigned_floor_building_id JOIN tblbuilding b ON b.building_id = bf.building_id JOIN tblfloor f ON f.floor_id = bf.floor_id ORDER BY a.assigned_created_at DESC');
                 $stmt->execute();
             }

             $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
             return json_encode([
                 'success' => true,
                 'data' => $rows
             ]);
         } catch (PDOException $e) {
             return json_encode([
                 'success' => false,
                 'message' => 'Database error: ' . $e->getMessage()
             ]);
         }
     }

     public function createAssigned($data) {
         try {
             if (!is_array($data) || !isset($data['assigned_user_id'], $data['assigned_floor_building_id'], $data['assigned_start_date'], $data['assigned_end_date'], $data['assigned_by_user_id'])) {
                 return json_encode([
                     'success' => false,
                     'message' => 'Missing required fields: assigned_user_id, assigned_floor_building_id, assigned_start_date, assigned_end_date, assigned_by_user_id'
                 ]);
             }

             $assigned_user_id = (int)$data['assigned_user_id'];
             $assigned_floor_building_id = (int)$data['assigned_floor_building_id'];
             $assigned_by_user_id = (int)$data['assigned_by_user_id'];
             $assigned_start_date = trim((string)$data['assigned_start_date']);
             $assigned_end_date = trim((string)$data['assigned_end_date']);

             if ($assigned_user_id <= 0) {
                 return json_encode([
                     'success' => false,
                     'message' => 'Invalid assigned_user_id.'
                 ]);
             }
             if ($assigned_floor_building_id <= 0) {
                 return json_encode([
                     'success' => false,
                     'message' => 'Invalid assigned_floor_building_id.'
                 ]);
             }
             if ($assigned_by_user_id <= 0) {
                 return json_encode([
                     'success' => false,
                     'message' => 'Invalid assigned_by_user_id.'
                 ]);
             }
             if ($assigned_start_date === '' || $assigned_end_date === '') {
                 return json_encode([
                     'success' => false,
                     'message' => 'Start date and end date are required.'
                 ]);
             }

             $startTs = strtotime($assigned_start_date);
             $endTs = strtotime($assigned_end_date);
             if ($startTs === false || $endTs === false) {
                 return json_encode([
                     'success' => false,
                     'message' => 'Invalid date format.'
                 ]);
             }
             if ($endTs < $startTs) {
                 return json_encode([
                     'success' => false,
                     'message' => 'End date cannot be earlier than start date.'
                 ]);
             }

             $checkUser = $this->conn->prepare('SELECT user_id FROM tbluser WHERE user_id = ?');
             $checkUser->execute([$assigned_user_id]);
             if (!$checkUser->fetch(PDO::FETCH_ASSOC)) {
                 return json_encode([
                     'success' => false,
                     'message' => 'Assigned user not found.'
                 ]);
             }

             $checkFloor = $this->conn->prepare('SELECT floorbuilding_id FROM tblbuildingfloor WHERE floorbuilding_id = ?');
             $checkFloor->execute([$assigned_floor_building_id]);
             if (!$checkFloor->fetch(PDO::FETCH_ASSOC)) {
                 return json_encode([
                     'success' => false,
                     'message' => 'Building floor not found.'
                 ]);
             }

             $stmt = $this->conn->prepare('INSERT INTO tblassigned (assigned_user_id, assigned_floor_building_id, assigned_start_date, assigned_end_date, assigned_by_user_id, assigned_created_at) VALUES (?, ?, ?, ?, ?, NOW())');
             $stmt->execute([$assigned_user_id, $assigned_floor_building_id, $assigned_start_date, $assigned_end_date, $assigned_by_user_id]);

             return json_encode([
                 'success' => true,
                 'message' => 'Assignment created successfully',
                 'assigned_id' => $this->conn->lastInsertId()
             ]);
         } catch (PDOException $e) {
             return json_encode([
                 'success' => false,
                 'message' => 'Database error: ' . $e->getMessage()
             ]);
         }
     }

     public function getStudentInspectionHistory($data) {
         try {
             if (!is_array($data) || !isset($data['user_id'])) {
                 return json_encode([
                     'success' => false,
                     'message' => 'Missing required field: user_id'
                 ]);
             }

             $user_id = (int)$data['user_id'];
             if ($user_id <= 0) {
                 return json_encode([
                     'success' => false,
                     'message' => 'Invalid user_id.'
                 ]);
             }

             $stmt = $this->conn->prepare('SELECT completion_date AS date, COUNT(assigned_status_id) AS count FROM tblassignedstatus WHERE assigned_reported_by = ? GROUP BY completion_date ORDER BY completion_date ASC');
             $stmt->execute([$user_id]);
             $history = $stmt->fetchAll(PDO::FETCH_ASSOC);

             $assignStmt = $this->conn->prepare('SELECT assigned_id, assigned_start_date, assigned_end_date FROM tblassigned WHERE assigned_user_id = ? ORDER BY assigned_created_at DESC');
             $assignStmt->execute([$user_id]);
             $rawAssignments = $assignStmt->fetchAll(PDO::FETCH_ASSOC);

             $assignmentsById = [];
             foreach ($rawAssignments as $a) {
                 $aid = (int)($a['assigned_id'] ?? 0);
                 if ($aid <= 0) continue;
                 if (!isset($assignmentsById[$aid])) {
                     $assignmentsById[$aid] = $a;
                 }
             }
             $assignments = array_values($assignmentsById);

             return json_encode([
                 'success' => true,
                 'data' => $history,
                 'assignments' => $assignments
             ]);
         } catch (PDOException $e) {
             return json_encode([
                 'success' => false,
                 'message' => 'Database error: ' . $e->getMessage()
             ]);
         }
     }

     public function getStudentActivitySummaryByDate($data) {
         try {
             $date = $data['date'] ?? date('Y-m-d');
             $d = DateTime::createFromFormat('Y-m-d', $date);
             if (!$d || $d->format('Y-m-d') !== $date) {
                 return json_encode([
                     'success' => false,
                     'message' => 'Invalid date format. Use YYYY-MM-DD.'
                 ]);
             }

             $stmt = $this->conn->prepare('
                 SELECT
                     u.user_id,
                     u.full_name,
                     u.username,
                     COALESCE(op.activity_count, 0) AS activity_count,
                     COALESCE(st.rooms_inspected, 0) AS rooms_inspected,
                     op.last_operation_at,
                     st.last_inspection_at
                 FROM tbluser u
                 JOIN tblrole r ON r.role_id = u.role_id
                 LEFT JOIN (
                     SELECT operation_updated_by, COUNT(*) AS activity_count, MAX(operation_updated_at) AS last_operation_at
                     FROM tblassignedoperation
                     WHERE DATE(operation_updated_at) = ?
                     GROUP BY operation_updated_by
                 ) op ON op.operation_updated_by = u.user_id
                 LEFT JOIN (
                     SELECT assigned_reported_by, COUNT(*) AS rooms_inspected, MAX(assigned_updated_at) AS last_inspection_at
                     FROM tblassignedstatus
                     WHERE completion_date = ?
                     GROUP BY assigned_reported_by
                 ) st ON st.assigned_reported_by = u.user_id
                 WHERE LOWER(r.role_name) = LOWER(?)
                   AND (u.is_active = 1 OR u.is_active = "1")
                 ORDER BY u.full_name ASC
             ');
             $stmt->execute([$date, $date, 'Student']);
             $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

             $out = [];
             foreach ($rows as $r) {
                 $lastActivityAt = null;
                 $lastOpAt = $r['last_operation_at'] ?? null;
                 $lastInspectionAt = $r['last_inspection_at'] ?? null;
                 if ($lastOpAt && $lastInspectionAt) {
                     $lastActivityAt = (strtotime($lastOpAt) >= strtotime($lastInspectionAt)) ? $lastOpAt : $lastInspectionAt;
                 } elseif ($lastOpAt) {
                     $lastActivityAt = $lastOpAt;
                 } elseif ($lastInspectionAt) {
                     $lastActivityAt = $lastInspectionAt;
                 }

                 $activityCount = (int)($r['activity_count'] ?? 0);
                 $roomsInspected = (int)($r['rooms_inspected'] ?? 0);

                 $out[] = [
                     'user_id' => (int)$r['user_id'],
                     'full_name' => $r['full_name'],
                     'username' => $r['username'],
                     'activity_count' => $activityCount,
                     'rooms_inspected' => $roomsInspected,
                     'last_activity_at' => $lastActivityAt,
                     'is_active_on_date' => ($activityCount > 0) || ($roomsInspected > 0)
                 ];
             }

             return json_encode([
                 'success' => true,
                 'data' => $out
             ]);
         } catch (PDOException $e) {
             return json_encode([
                 'success' => false,
                 'message' => 'Database error: ' . $e->getMessage()
             ]);
         }
     }

     public function getStudentInspectionsByDate($data) {
         try {
             if (!is_array($data) || !isset($data['user_id'], $data['date'])) {
                 return json_encode([
                     'success' => false,
                     'message' => 'Missing required fields: user_id, date'
                 ]);
             }

             $user_id = (int)$data['user_id'];
             $date = $data['date'];
             if ($user_id <= 0) {
                 return json_encode([
                     'success' => false,
                     'message' => 'Invalid user_id.'
                 ]);
             }

             $d = DateTime::createFromFormat('Y-m-d', $date);
             if (!$d || $d->format('Y-m-d') !== $date) {
                 return json_encode([
                     'success' => false,
                     'message' => 'Invalid date format. Use YYYY-MM-DD.'
                 ]);
             }

             $assignmentStmt = $this->conn->prepare('
                 SELECT assigned_id, assigned_floor_building_id
                 FROM tblassigned
                 WHERE assigned_user_id = ?
                   AND ? BETWEEN assigned_start_date AND assigned_end_date
                 ORDER BY assigned_created_at DESC
                 LIMIT 1
             ');
             $assignmentStmt->execute([$user_id, $date]);
             $assignment = $assignmentStmt->fetch(PDO::FETCH_ASSOC);

             if (!$assignment) {
                 return json_encode([
                     'success' => true,
                     'data' => []
                 ]);
             }

             $assigned_id = (int)$assignment['assigned_id'];
             $assigned_floor_building_id = (int)$assignment['assigned_floor_building_id'];

             $roomsStmt = $this->conn->prepare('
                 SELECT
                     r.room_id,
                     r.room_number,
                     b.building_name,
                     f.floor_name,
                     s.assigned_status_id,
                     s.assigned_status,
                     s.assigned_remarks,
                     s.assigned_updated_at
                 FROM tblroom r
                 JOIN tblbuildingfloor bf ON bf.floorbuilding_id = r.room_building_floor_id
                 JOIN tblbuilding b ON b.building_id = bf.building_id
                 JOIN tblfloor f ON f.floor_id = bf.floor_id
                 LEFT JOIN tblassignedstatus s
                     ON s.room_id = r.room_id
                     AND s.assigned_reported_by = ?
                     AND s.completion_date = ?
                 WHERE r.room_building_floor_id = ?
                 ORDER BY r.room_number ASC
             ');
             $roomsStmt->execute([$user_id, $date, $assigned_floor_building_id]);
             $rooms = $roomsStmt->fetchAll(PDO::FETCH_ASSOC);

             if (count($rooms) === 0) {
                 return json_encode([
                     'success' => true,
                     'data' => []
                 ]);
             }

             $roomIds = array_map(function ($r) {
                 return (int)$r['room_id'];
             }, $rooms);
             $placeholders = implode(',', array_fill(0, count($roomIds), '?'));

             $checklistStmt = $this->conn->prepare('
                 SELECT
                     c.checklist_room_id AS room_id,
                     c.checklist_id,
                     c.checklist_name,
                     o.operation_is_functional,
                     o.operation_updated_at
                 FROM tblroomchecklist c
                 LEFT JOIN (
                     SELECT ao1.operation_room_id, ao1.operation_checklist_id, ao1.operation_is_functional, ao1.operation_updated_at
                     FROM tblassignedoperation ao1
                     INNER JOIN (
                         SELECT operation_room_id, operation_checklist_id, MAX(operation_updated_at) AS max_updated_at
                         FROM tblassignedoperation
                         WHERE operation_updated_by = ? AND DATE(operation_updated_at) = ?
                         GROUP BY operation_room_id, operation_checklist_id
                     ) ao2
                         ON ao2.operation_room_id = ao1.operation_room_id
                         AND ao2.operation_checklist_id = ao1.operation_checklist_id
                         AND ao2.max_updated_at = ao1.operation_updated_at
                     WHERE ao1.operation_updated_by = ? AND DATE(ao1.operation_updated_at) = ?
                 ) o
                     ON o.operation_room_id = c.checklist_room_id
                     AND o.operation_checklist_id = c.checklist_id
                 WHERE c.checklist_room_id IN (' . $placeholders . ')
                 ORDER BY c.checklist_room_id ASC, c.checklist_name ASC
             ');

             $params = [$user_id, $date, $user_id, $date];
             foreach ($roomIds as $rid) {
                 $params[] = $rid;
             }
             $checklistStmt->execute($params);
             $checklistRows = $checklistStmt->fetchAll(PDO::FETCH_ASSOC);

             $byRoom = [];
             foreach ($checklistRows as $cr) {
                 $rid = (int)$cr['room_id'];
                 if (!isset($byRoom[$rid])) $byRoom[$rid] = [];
                 $byRoom[$rid][] = [
                     'checklist_id' => (int)$cr['checklist_id'],
                     'checklist_name' => $cr['checklist_name'],
                     'operation_is_functional' => $cr['operation_is_functional'] === null ? null : (int)$cr['operation_is_functional'],
                     'operation_updated_at' => $cr['operation_updated_at']
                 ];
             }

             for ($i = 0; $i < count($rooms); $i++) {
                 $rid = (int)$rooms[$i]['room_id'];
                 $rooms[$i]['assigned_id'] = $assigned_id;
                 $rooms[$i]['is_missed'] = empty($rooms[$i]['assigned_status_id']);
                 $rooms[$i]['checklist'] = $byRoom[$rid] ?? [];
             }

             return json_encode([
                 'success' => true,
                 'data' => $rooms
             ]);
         } catch (PDOException $e) {
             return json_encode([
                 'success' => false,
                 'message' => 'Database error: ' . $e->getMessage()
             ]);
         }
     }

     public function getRecentInspections($data) {
         try {
             $limit = 10;
             if (is_array($data) && isset($data['limit']) && is_numeric($data['limit'])) {
                 $limit = (int)$data['limit'];
             }
             if ($limit <= 0) $limit = 10;
             if ($limit > 50) $limit = 50;

             $stmt = $this->conn->prepare('
                 SELECT
                     s.assigned_status_id,
                     s.assigned_status,
                     s.completion_date,
                     s.assigned_updated_at,
                     u.user_id,
                     u.full_name,
                     r.room_id,
                     r.room_number,
                     b.building_name,
                     f.floor_name
                 FROM tblassignedstatus s
                 JOIN tbluser u ON u.user_id = s.assigned_reported_by
                 JOIN tblroom r ON r.room_id = s.room_id
                 JOIN tblbuildingfloor bf ON bf.floorbuilding_id = r.room_building_floor_id
                 JOIN tblbuilding b ON b.building_id = bf.building_id
                 JOIN tblfloor f ON f.floor_id = bf.floor_id
                 WHERE s.assigned_updated_at IS NOT NULL
                 ORDER BY s.assigned_updated_at DESC
                 LIMIT ' . $limit . '
             ');
             $stmt->execute();
             $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

             return json_encode([
                 'success' => true,
                 'data' => $rows
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
     case 'getBuildings':
         echo $user->getBuildings();
         break;
     case 'createBuilding':
         echo $user->createBuilding($json);
         break;
     case 'updateBuilding':
         echo $user->updateBuilding($json);
         break;
     case 'deleteBuilding':
         echo $user->deleteBuilding($json);
         break;
     case 'getRooms':
         echo $user->getRooms($json);
         break;
     case 'createRoom':
        echo $user->createRoom($json);
        break;
    case 'createRoomsBulk':
        echo $user->createRoomsBulk($json);
        break;
    case 'updateRoom':
        echo $user->updateRoom($json);
        break;
    case 'deleteRoom':
        echo $user->deleteRoom($json);
        break;
     case 'getFloors':
        echo $user->getFloors($json);
        break;
    case 'getFloorNames':
        echo $user->getFloorNames();
        break;
    case 'createFloorName':
        echo $user->createFloorName($json);
        break;
    case 'updateFloorName':
        echo $user->updateFloorName($json);
        break;
    case 'deleteFloorName':
        echo $user->deleteFloorName($json);
        break;
     case 'createFloor':
         echo $user->createFloor($json);
         break;
     case 'updateFloor':
         echo $user->updateFloor($json);
         break;
     case 'deleteFloor':
         echo $user->deleteFloor($json);
         break;
     case 'getStudents':
         echo $user->getStudents();
         break;
     case 'getAssigned':
         echo $user->getAssigned($json);
         break;
     case 'getAssignedStats':
         echo $user->getAssignedStats($json);
         break;
     case 'createAssigned':
         echo $user->createAssigned($json);
         break;
     case 'getRoomChecklists':
         echo $user->getRoomChecklists($json);
         break;
     case 'createChecklist':
         echo $user->createChecklist($json);
         break;
     case 'updateChecklist':
         echo $user->updateChecklist($json);
         break;
     case 'deleteChecklist':
         echo $user->deleteChecklist($json);
         break;
     case 'createChecklistBulk':
         echo $user->createChecklistBulk($json);
         break;
     case 'getStudentInspectionHistory':
        echo $user->getStudentInspectionHistory($json);
        break;
    case 'getInspectionHistory':
        echo $user->getStudentInspectionHistory($json);
        break;
    case 'getStudentActivitySummaryByDate':
        echo $user->getStudentActivitySummaryByDate($json);
        break;
    case 'getStudentInspectionsByDate':
       echo $user->getStudentInspectionsByDate($json);
        break;
    case 'getRecentInspections':
        echo $user->getRecentInspections($json);
        break;
    default:
       echo json_encode([
            'success' => false,
            'message' => 'Invalid operation'
        ]);
}
 
 ?>
