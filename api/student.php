<?php
 
 include 'header.php';
 include 'connection-pdo.php';
 
 class Student{
     private $conn;
 
     public function __construct($connection) {
         $this->conn = $connection;
     }

     private function normalizeChecklistStatus($value, $default = 1) {
        if ($value === null) return (int)$default;
        if (is_bool($value)) return $value ? 1 : 0;
        if (is_numeric($value)) {
            $num = (int)$value;
            return in_array($num, [0, 1], true) ? $num : (int)$default;
        }
        $v = strtolower(trim((string)$value));
        if (in_array($v, ['true', 'yes', 'on', 'ok', 'good'], true)) return 1;
        if (in_array($v, ['false', 'no', 'off', 'not ok', 'bad'], true)) return 0;
        return (int)$default;
    }

    private function normalizeAssignedStatus($value) {
        if ($value === null) return null;
        $v = strtolower(trim((string)$value));
        $map = [
            'excellent' => 'Excellent',
            'good' => 'Good',
            'fair' => 'Fair',
            'poor' => 'Poor'
        ];
        return $map[$v] ?? null;
    }

    public function getTodayActivity($data) {
        try {
            if (!is_array($data) || !isset($data['assigned_user_id'])) {
                return json_encode([
                    'success' => false,
                    'message' => 'Missing required field: assigned_user_id'
                ]);
            }

            $assigned_user_id = (int)$data['assigned_user_id'];
            if ($assigned_user_id <= 0) {
                return json_encode([
                    'success' => false,
                    'message' => 'Invalid assigned_user_id.'
                ]);
            }

            $opStmt = $this->conn->prepare('SELECT COUNT(*) AS activity_count, MAX(operation_updated_at) AS last_operation_at FROM tblassignedoperation WHERE operation_updated_by = ? AND DATE(operation_updated_at) = CURDATE()');
            $opStmt->execute([$assigned_user_id]);
            $opRow = $opStmt->fetch(PDO::FETCH_ASSOC);

            $statusStmt = $this->conn->prepare('SELECT COUNT(*) AS rooms_inspected, MAX(assigned_updated_at) AS last_inspection_at FROM tblassignedstatus WHERE assigned_reported_by = ? AND completion_date = CURDATE()');
            $statusStmt->execute([$assigned_user_id]);
            $statusRow = $statusStmt->fetch(PDO::FETCH_ASSOC);

            $activityCount = isset($opRow['activity_count']) ? (int)$opRow['activity_count'] : 0;
            $roomsInspected = isset($statusRow['rooms_inspected']) ? (int)$statusRow['rooms_inspected'] : 0;

            $lastActivityAt = null;
            $lastOpAt = $opRow['last_operation_at'] ?? null;
            $lastInspectionAt = $statusRow['last_inspection_at'] ?? null;
            if ($lastOpAt && $lastInspectionAt) {
                $lastActivityAt = (strtotime($lastOpAt) >= strtotime($lastInspectionAt)) ? $lastOpAt : $lastInspectionAt;
            } elseif ($lastOpAt) {
                $lastActivityAt = $lastOpAt;
            } elseif ($lastInspectionAt) {
                $lastActivityAt = $lastInspectionAt;
            }

            return json_encode([
                'success' => true,
                'data' => [
                    'activity_count' => $activityCount,
                    'rooms_inspected' => $roomsInspected,
                    'last_activity_at' => $lastActivityAt,
                    'is_active_today' => ($activityCount > 0) || ($roomsInspected > 0)
                ]
            ]);
        } catch (PDOException $e) {
            return json_encode([
                'success' => false,
                'message' => 'Database error: ' . $e->getMessage()
            ]);
        }
    }

    public function getMissedClassrooms($data) {
        try {
            if (!is_array($data) || !isset($data['assigned_user_id'])) {
                return json_encode([
                    'success' => false,
                    'message' => 'Missing required field: assigned_user_id'
                ]);
            }

            $assigned_user_id = (int)$data['assigned_user_id'];
            if ($assigned_user_id <= 0) {
                return json_encode([
                    'success' => false,
                    'message' => 'Invalid assigned_user_id.'
                ]);
            }

            $date = $data['date'] ?? date('Y-m-d');
            $d = DateTime::createFromFormat('Y-m-d', $date);
            if (!$d || $d->format('Y-m-d') !== $date) {
                return json_encode([
                    'success' => false,
                    'message' => 'Invalid date format. Use YYYY-MM-DD.'
                ]);
            }

            $assigned_floor_building_id = null;
            if (isset($data['assigned_floor_building_id']) && $data['assigned_floor_building_id'] !== '') {
                $assigned_floor_building_id = (int)$data['assigned_floor_building_id'];
            }
            if (!$assigned_floor_building_id) {
                $active = $this->getCurrentAssignment(['assigned_user_id' => $assigned_user_id]);
                $decoded = json_decode($active, true);
                if (is_array($decoded) && ($decoded['success'] ?? false) && is_array($decoded['data'] ?? null)) {
                    $assigned_floor_building_id = (int)($decoded['data']['assigned_floor_building_id'] ?? 0);
                }
            }
            if (!$assigned_floor_building_id) {
                return json_encode([
                    'success' => false,
                    'message' => 'Missing required field: assigned_floor_building_id (or provide assigned_user_id with an assignment)'
                ]);
            }

            $missedStmt = $this->conn->prepare('
                SELECT
                    r.room_id,
                    r.room_number,
                    bf.building_id,
                    b.building_name,
                    bf.floor_id,
                    f.floor_name
                FROM tblroom r
                JOIN tblbuildingfloor bf ON bf.floorbuilding_id = r.room_building_floor_id
                JOIN tblbuilding b ON b.building_id = bf.building_id
                JOIN tblfloor f ON f.floor_id = bf.floor_id
                LEFT JOIN tblassignedstatus s
                    ON s.room_id = r.room_id
                    AND s.assigned_reported_by = ?
                    AND s.completion_date = ?
                WHERE r.room_building_floor_id = ?
                  AND s.assigned_status_id IS NULL
                ORDER BY r.room_number ASC
            ');
            $missedStmt->execute([$assigned_user_id, $date, $assigned_floor_building_id]);
            $rooms = $missedStmt->fetchAll(PDO::FETCH_ASSOC);

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

            $params = [$assigned_user_id, $date, $assigned_user_id, $date];
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

    public function getInspectionsByDate($data) {
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

    public function getCurrentAssignment($data) {
        try {
            if (!is_array($data) || !isset($data['assigned_user_id'])) {
                return json_encode([
                    'success' => false,
                    'message' => 'Missing required field: assigned_user_id'
                ]);
            }

            $assigned_user_id = (int)$data['assigned_user_id'];
            if ($assigned_user_id <= 0) {
                return json_encode([
                    'success' => false,
                    'message' => 'Invalid assigned_user_id.'
                ]);
            }

            $stmt = $this->conn->prepare('SELECT a.assigned_id, a.assigned_user_id, a.assigned_floor_building_id, bf.building_id, b.building_name, bf.floor_id, f.floor_name, a.assigned_start_date, a.assigned_end_date, a.assigned_by_user_id, a.assigned_created_at FROM tblassigned a JOIN tblbuildingfloor bf ON bf.floorbuilding_id = a.assigned_floor_building_id JOIN tblbuilding b ON b.building_id = bf.building_id JOIN tblfloor f ON f.floor_id = bf.floor_id WHERE a.assigned_user_id = ? AND CURDATE() BETWEEN a.assigned_start_date AND a.assigned_end_date ORDER BY a.assigned_created_at DESC LIMIT 1');
            $stmt->execute([$assigned_user_id]);
            $row = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$row) {
                $stmt2 = $this->conn->prepare('SELECT a.assigned_id, a.assigned_user_id, a.assigned_floor_building_id, bf.building_id, b.building_name, bf.floor_id, f.floor_name, a.assigned_start_date, a.assigned_end_date, a.assigned_by_user_id, a.assigned_created_at FROM tblassigned a JOIN tblbuildingfloor bf ON bf.floorbuilding_id = a.assigned_floor_building_id JOIN tblbuilding b ON b.building_id = bf.building_id JOIN tblfloor f ON f.floor_id = bf.floor_id WHERE a.assigned_user_id = ? ORDER BY a.assigned_created_at DESC LIMIT 1');
                $stmt2->execute([$assigned_user_id]);
                $row = $stmt2->fetch(PDO::FETCH_ASSOC);
            }

            return json_encode([
                'success' => true,
                'data' => $row
            ]);
        } catch (PDOException $e) {
            return json_encode([
                'success' => false,
                'message' => 'Database error: ' . $e->getMessage()
            ]);
        }
    }

    public function getAssignedRooms($data) {
        try {
            $assigned_user_id = null;
            $assigned_floor_building_id = null;

            if (is_array($data) && isset($data['assigned_user_id']) && $data['assigned_user_id'] !== '') {
                $assigned_user_id = (int)$data['assigned_user_id'];
            }
            if (is_array($data) && isset($data['assigned_floor_building_id']) && $data['assigned_floor_building_id'] !== '') {
                $assigned_floor_building_id = (int)$data['assigned_floor_building_id'];
            }

            if (!$assigned_floor_building_id && $assigned_user_id) {
                $active = $this->getCurrentAssignment(['assigned_user_id' => $assigned_user_id]);
                $decoded = json_decode($active, true);
                if (is_array($decoded) && ($decoded['success'] ?? false) && is_array($decoded['data'] ?? null)) {
                    $assigned_floor_building_id = (int)($decoded['data']['assigned_floor_building_id'] ?? 0);
                }
            }

            if (!$assigned_floor_building_id) {
                return json_encode([
                    'success' => false,
                    'message' => 'Missing required field: assigned_floor_building_id (or provide assigned_user_id with an assignment)'
                ]);
            }

            $stmt = $this->conn->prepare('SELECT r.room_id, r.room_number, r.room_building_floor_id, bf.building_id, b.building_name, bf.floor_id, f.floor_name, CASE WHEN s.assigned_status_id IS NOT NULL THEN \'Done\' ELSE \'Pending\' END AS status FROM tblroom r JOIN tblbuildingfloor bf ON bf.floorbuilding_id = r.room_building_floor_id JOIN tblbuilding b ON b.building_id = bf.building_id JOIN tblfloor f ON f.floor_id = bf.floor_id LEFT JOIN tblassignedstatus s ON s.room_id = r.room_id AND s.completion_date = CURDATE() WHERE r.room_building_floor_id = ? ORDER BY r.room_number ASC');
            $stmt->execute([$assigned_floor_building_id]);
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

    public function getRoomChecklist($data) {
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

            $stmt = $this->conn->prepare('SELECT c.checklist_id, c.checklist_name, c.checklist_room_id, o.operation_id, o.operation_is_functional, o.operation_updated_at, o.operation_updated_by FROM tblroomchecklist c LEFT JOIN (SELECT ao1.operation_id, ao1.operation_is_functional, ao1.operation_updated_at, ao1.operation_updated_by, ao1.operation_room_id, ao1.operation_checklist_id FROM tblassignedoperation ao1 INNER JOIN (SELECT operation_room_id, operation_checklist_id, MAX(operation_updated_at) AS max_updated_at FROM tblassignedoperation WHERE DATE(operation_updated_at) = CURDATE() GROUP BY operation_room_id, operation_checklist_id) ao2 ON ao2.operation_room_id = ao1.operation_room_id AND ao2.operation_checklist_id = ao1.operation_checklist_id AND ao2.max_updated_at = ao1.operation_updated_at) o ON o.operation_room_id = c.checklist_room_id AND o.operation_checklist_id = c.checklist_id WHERE c.checklist_room_id = ? ORDER BY c.checklist_name ASC');
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

    public function saveChecklistOperation($data) {
        try {
            if (!is_array($data) || !isset($data['operation_room_id'], $data['operation_checklist_id'], $data['operation_is_functional'], $data['operation_updated_by'])) {
                return json_encode([
                    'success' => false,
                    'message' => 'Missing required fields: operation_room_id, operation_checklist_id, operation_is_functional, operation_updated_by'
                ]);
            }

            $room_id = (int)$data['operation_room_id'];
            $checklist_id = (int)$data['operation_checklist_id'];
            $updated_by = (int)$data['operation_updated_by'];
            $is_functional = $this->normalizeChecklistStatus($data['operation_is_functional'], 1);

            if ($room_id <= 0) {
                return json_encode([
                    'success' => false,
                    'message' => 'Invalid operation_room_id.'
                ]);
            }
            if ($checklist_id <= 0) {
                return json_encode([
                    'success' => false,
                    'message' => 'Invalid operation_checklist_id.'
                ]);
            }
            if ($updated_by <= 0) {
                return json_encode([
                    'success' => false,
                    'message' => 'Invalid operation_updated_by.'
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

            $checkChecklist = $this->conn->prepare('SELECT checklist_id FROM tblroomchecklist WHERE checklist_id = ? AND checklist_room_id = ?');
            $checkChecklist->execute([$checklist_id, $room_id]);
            if (!$checkChecklist->fetch(PDO::FETCH_ASSOC)) {
                return json_encode([
                    'success' => false,
                    'message' => 'Checklist item not found for this room.'
                ]);
            }

            $find = $this->conn->prepare('SELECT operation_id, operation_updated_at FROM tblassignedoperation WHERE operation_room_id = ? AND operation_checklist_id = ? ORDER BY operation_updated_at DESC LIMIT 1');
            $find->execute([$room_id, $checklist_id]);
            $existing = $find->fetch(PDO::FETCH_ASSOC);

            if ($existing && isset($existing['operation_updated_at']) && date('Y-m-d', strtotime($existing['operation_updated_at'])) === date('Y-m-d')) {
                $operation_id = (int)$existing['operation_id'];
                $upd = $this->conn->prepare('UPDATE tblassignedoperation SET operation_is_functional = ?, operation_updated_at = NOW(), operation_updated_by = ? WHERE operation_id = ?');
                $upd->execute([$is_functional, $updated_by, $operation_id]);
                return json_encode([
                    'success' => true,
                    'message' => 'Checklist operation updated successfully',
                    'operation_id' => $operation_id
                ]);
            }

            $ins = $this->conn->prepare('INSERT INTO tblassignedoperation (operation_is_functional, operation_updated_at, operation_updated_by, operation_room_id, operation_checklist_id) VALUES (?, NOW(), ?, ?, ?)');
            $ins->execute([$is_functional, $updated_by, $room_id, $checklist_id]);

            return json_encode([
                'success' => true,
                'message' => 'Checklist operation saved successfully',
                'operation_id' => $this->conn->lastInsertId()
            ]);
        } catch (PDOException $e) {
            return json_encode([
                'success' => false,
                'message' => 'Database error: ' . $e->getMessage()
            ]);
        }
    }

    public function getInspectionHistory($data) {
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

            return json_encode([
                'success' => true,
                'data' => $history
            ]);
        } catch (PDOException $e) {
            return json_encode([
                'success' => false,
                'message' => 'Database error: ' . $e->getMessage()
            ]);
        }
    }

    public function submitInspection($data) {
        try {
            if (!is_array($data) || !isset($data['assigned_id'], $data['assigned_status'], $data['assigned_reported_by'], $data['room_id'])) {
                return json_encode([
                    'success' => false,
                    'message' => 'Missing required fields: assigned_id, assigned_status, assigned_reported_by, room_id'
                ]);
            }

            $assigned_id = (int)$data['assigned_id'];
            $reported_by = (int)$data['assigned_reported_by'];
            $room_id = (int)$data['room_id'];
            $assigned_status = $this->normalizeAssignedStatus($data['assigned_status']);
            $assigned_remarks = isset($data['assigned_remarks']) ? trim((string)$data['assigned_remarks']) : '';
            $operations = is_array($data['operations'] ?? null) ? $data['operations'] : [];

            if ($assigned_id <= 0) {
                return json_encode([
                    'success' => false,
                    'message' => 'Invalid assigned_id.'
                ]);
            }
            if ($reported_by <= 0) {
                return json_encode([
                    'success' => false,
                    'message' => 'Invalid assigned_reported_by.'
                ]);
            }
            if ($room_id <= 0) {
                return json_encode([
                    'success' => false,
                    'message' => 'Invalid room_id.'
                ]);
            }
            if (!$assigned_status) {
                return json_encode([
                    'success' => false,
                    'message' => 'Invalid assigned_status. Use Excellent, Good, Fair, or Poor.'
                ]);
            }
            if (count($operations) === 0) {
                return json_encode([
                    'success' => false,
                    'message' => 'No checklist selections submitted.'
                ]);
            }

            $this->conn->beginTransaction();

            $insStatus = $this->conn->prepare('INSERT INTO tblassignedstatus (assigned_id, room_id, assigned_remarks, assigned_status, assigned_reported_by, completion_date, assigned_updated_at) VALUES (?, ?, ?, ?, ?, CURDATE(), NOW())');
            $insStatus->execute([$assigned_id, $room_id, $assigned_remarks, $assigned_status, $reported_by]);

            $insOperation = $this->conn->prepare('INSERT INTO tblassignedoperation (operation_is_functional, operation_updated_at, operation_updated_by, operation_room_id, operation_checklist_id) VALUES (?, NOW(), ?, ?, ?)');

            foreach ($operations as $op) {
                $checklist_id = (int)($op['checklist_id'] ?? 0);
                $status = $this->normalizeChecklistStatus($op['status'] ?? null, null);
                if ($checklist_id <= 0 || $status === null) {
                    continue;
                }
                $insOperation->execute([$status, $reported_by, $room_id, $checklist_id]);
            }

            $this->conn->commit();

            return json_encode([
                'success' => true,
                'message' => 'Inspection submitted successfully.'
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
}

$raw = file_get_contents('php://input');
$body = json_decode($raw, true);

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

$user = new Student($conn);

switch($operation){
    case 'getCurrentAssignment':
        echo $user->getCurrentAssignment($json);
        break;
    case 'getAssignedRooms':
        echo $user->getAssignedRooms($json);
        break;
    case 'getRoomChecklist':
        echo $user->getRoomChecklist($json);
        break;
    case 'saveChecklistOperation':
        echo $user->saveChecklistOperation($json);
        break;
    case 'getTodayActivity':
        echo $user->getTodayActivity($json);
        break;
    case 'getMissedClassrooms':
        echo $user->getMissedClassrooms($json);
        break;
    case 'submitInspection':
        echo $user->submitInspection($json);
        break;
    case 'getInspectionHistory':
        echo $user->getInspectionHistory($json);
        break;
    case 'getInspectionsByDate':
        echo $user->getInspectionsByDate($json);
        break;

    default:
        echo json_encode([
            'success' => false,
            'message' => 'Invalid operation'
        ]);
}

?>
