<?php
// Admin Reports API - Standalone endpoint for admin reports

include 'header.php';
include 'connection-pdo.php';

class AdminReports {
    private $conn;

    public function __construct($connection) {
        $this->conn = $connection;
    }

    public function getStudentAssignmentReport($data) {
        try {
            $building_id = null;
            $floor_id = null;
            $user_id = null;
            $status = null;

            if (is_array($data)) {
                if (isset($data['building_id']) && $data['building_id'] !== '') {
                    $building_id = (int)$data['building_id'];
                }
                if (isset($data['floor_id']) && $data['floor_id'] !== '') {
                    $floor_id = (int)$data['floor_id'];
                }
                if (isset($data['user_id']) && $data['user_id'] !== '') {
                    $user_id = (int)$data['user_id'];
                }
                if (isset($data['status']) && $data['status'] !== '' && $data['status'] !== 'all') {
                    $status = trim((string)$data['status']);
                }
            }

            $whereConditions = [];
            $params = [];

            if ($building_id) {
                $whereConditions[] = 'bf.building_id = ?';
                $params[] = $building_id;
            }
            if ($floor_id) {
                $whereConditions[] = 'bf.floor_id = ?';
                $params[] = $floor_id;
            }
            if ($user_id) {
                $whereConditions[] = 'a.assigned_user_id = ?';
                $params[] = $user_id;
            }
            if ($status) {
                $whereConditions[] = 'a.assigned_status_enum = ?';
                $params[] = $status;
            }

            $whereClause = count($whereConditions) > 0 ? 'WHERE ' . implode(' AND ', $whereConditions) : '';

            $stmt = $this->conn->prepare("
                SELECT 
                    bf.floorbuilding_id,
                    bf.building_id,
                    b.building_name,
                    bf.floor_id,
                    f.floor_name,
                    COUNT(DISTINCT a.assigned_user_id) as student_count,
                    GROUP_CONCAT(DISTINCT u.full_name ORDER BY u.full_name SEPARATOR ', ') as student_names
                FROM tblbuildingfloor bf
                JOIN tblbuilding b ON b.building_id = bf.building_id
                JOIN tblfloor f ON f.floor_id = bf.floor_id
                LEFT JOIN tblassigned a ON a.assigned_floor_building_id = bf.floorbuilding_id
                LEFT JOIN tbluser u ON u.user_id = a.assigned_user_id AND u.role_id = 2
                $whereClause
                GROUP BY bf.floorbuilding_id, bf.building_id, b.building_name, bf.floor_id, f.floor_name
                ORDER BY b.building_name ASC, f.floor_name ASC
            ");
            $stmt->execute($params);
            $assignments = $stmt->fetchAll(PDO::FETCH_ASSOC);

            $detailedAssignments = [];
            foreach ($assignments as $a) {
                $fbId = (int)$a['floorbuilding_id'];
                
                $studentStmt = $this->conn->prepare("
                    SELECT 
                        a.assigned_id,
                        u.user_id,
                        u.full_name,
                        a.assigned_status_enum as status,
                        a.assigned_start_date as start_date,
                        a.assigned_end_date as end_date
                    FROM tblassigned a
                    JOIN tbluser u ON u.user_id = a.assigned_user_id
                    WHERE a.assigned_floor_building_id = ?
                    ORDER BY u.full_name ASC
                ");
                $studentStmt->execute([$fbId]);
                $students = $studentStmt->fetchAll(PDO::FETCH_ASSOC);

                $detailedAssignments[] = [
                    'floorbuilding_id' => $a['floorbuilding_id'],
                    'building_id' => $a['building_id'],
                    'building_name' => $a['building_name'],
                    'floor_id' => $a['floor_id'],
                    'floor_name' => $a['floor_name'],
                    'student_count' => (int)$a['student_count'],
                    'student_names' => $a['student_names'] ?? '',
                    'students' => $students
                ];
            }

            $summaryStmt = $this->conn->prepare("
                SELECT 
                    COUNT(DISTINCT bf.building_id) as total_buildings,
                    COUNT(DISTINCT bf.floor_id) as total_floors,
                    COUNT(DISTINCT a.assigned_user_id) as total_students,
                    COUNT(*) as total_assignments
                FROM tblbuildingfloor bf
                LEFT JOIN tblassigned a ON a.assigned_floor_building_id = bf.floorbuilding_id
                $whereClause
            ");
            $summaryStmt->execute($params);
            $summary = $summaryStmt->fetch(PDO::FETCH_ASSOC);

            return json_encode([
                'success' => true,
                'data' => [
                    'summary' => [
                        'total_buildings' => (int)($summary['total_buildings'] ?? 0),
                        'total_floors' => (int)($summary['total_floors'] ?? 0),
                        'total_students' => (int)($summary['total_students'] ?? 0),
                        'total_assignments' => (int)($summary['total_assignments'] ?? 0)
                    ],
                    'assignments' => $detailedAssignments
                ]
            ]);
        } catch (PDOException $e) {
            return json_encode([
                'success' => false,
                'message' => 'Database error: ' . $e->getMessage()
            ]);
        }
    }

    public function getInspectionSummaryReport($data) {
        try {
            $building_id = null;
            $floor_id = null;
            $user_id = null;
            $date_from = null;
            $date_to = null;

            if (is_array($data)) {
                if (isset($data['building_id']) && $data['building_id'] !== '') {
                    $building_id = (int)$data['building_id'];
                }
                if (isset($data['floor_id']) && $data['floor_id'] !== '') {
                    $floor_id = (int)$data['floor_id'];
                }
                if (isset($data['user_id']) && $data['user_id'] !== '') {
                    $user_id = (int)$data['user_id'];
                }
                if (isset($data['date_from']) && $data['date_from'] !== '') {
                    $date_from = trim((string)$data['date_from']);
                }
                if (isset($data['date_to']) && $data['date_to'] !== '') {
                    $date_to = trim((string)$data['date_to']);
                }
            }

            $whereConditions = [];
            $params = [];

            if ($building_id) {
                $whereConditions[] = 'bf.building_id = ?';
                $params[] = $building_id;
            }
            if ($floor_id) {
                $whereConditions[] = 'bf.floor_id = ?';
                $params[] = $floor_id;
            }
            if ($user_id) {
                $whereConditions[] = 's.assigned_reported_by = ?';
                $params[] = $user_id;
            }
            if ($date_from) {
                $whereConditions[] = 's.completion_date >= ?';
                $params[] = $date_from;
            }
            if ($date_to) {
                $whereConditions[] = 's.completion_date <= ?';
                $params[] = $date_to;
            }

            $whereClause = count($whereConditions) > 0 ? 'WHERE ' . implode(' AND ', $whereConditions) : '';

            $stmt = $this->conn->prepare(" 
                SELECT 
                    s.assigned_status_id,
                    r.room_id,
                    b.building_name,
                    f.floor_name,
                    r.room_number,
                    s.assigned_status,
                    s.assigned_remarks,
                    s.assigned_reported_by,
                    u.full_name as inspected_by,
                    s.completion_date as inspected_date,
                    s.assigned_updated_at
                FROM tblassignedstatus s
                JOIN tblroom r ON r.room_id = s.room_id
                JOIN tblbuildingfloor bf ON bf.floorbuilding_id = r.room_building_floor_id
                JOIN tblbuilding b ON b.building_id = bf.building_id
                JOIN tblfloor f ON f.floor_id = bf.floor_id
                JOIN tbluser u ON u.user_id = s.assigned_reported_by
                $whereClause
                ORDER BY DATE(s.completion_date) DESC, s.assigned_updated_at DESC, b.building_name ASC, f.floor_name ASC, r.room_number ASC
            ");
            $stmt->execute($params);
            $inspections = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // Attach checklist details for each inspection (similar to AdminActivity modal)
            if (count($inspections) > 0) {
                $roomIds = [];
                $userIds = [];
                $dates = [];

                foreach ($inspections as $insp) {
                    $roomIds[(int)$insp['room_id']] = true;
                    $userIds[(int)$insp['assigned_reported_by']] = true;
                    $dates[(string)$insp['inspected_date']] = true;
                }

                $roomIds = array_keys($roomIds);
                $userIds = array_keys($userIds);
                $dates = array_keys($dates);

                if (count($roomIds) > 0) {
                    $roomPlaceholders = implode(',', array_fill(0, count($roomIds), '?'));

                    $checklistStmt = $this->conn->prepare('
                        SELECT
                            r.room_id,
                            c.checklist_id,
                            c.checklist_name,
                            c.checklist_type,
                            c.checklist_quantity
                        FROM tblroom r
                        JOIN tblroomchecklist c ON c.checklist_floorbuilding_id = r.room_building_floor_id
                        WHERE r.room_id IN (' . $roomPlaceholders . ')
                        ORDER BY r.room_id ASC, c.checklist_name ASC
                    ');
                    $checklistStmt->execute($roomIds);
                    $checklistRows = $checklistStmt->fetchAll(PDO::FETCH_ASSOC);

                    $byRoomChecklist = [];
                    foreach ($checklistRows as $cr) {
                        $rid = (int)$cr['room_id'];
                        if (!isset($byRoomChecklist[$rid])) $byRoomChecklist[$rid] = [];
                        $byRoomChecklist[$rid][] = [
                            'checklist_id' => (int)$cr['checklist_id'],
                            'checklist_name' => $cr['checklist_name'],
                            'checklist_type' => $cr['checklist_type'] ?? 'boolean',
                            'checklist_quantity' => $cr['checklist_quantity'] ?? null
                        ];
                    }

                    // Load latest operations per (room, checklist, user, date) for the involved roomIds and date range
                    $opsParams = [];
                    $opsWhere = [];

                    $opsWhere[] = 'ao.operation_room_id IN (' . $roomPlaceholders . ')';
                    foreach ($roomIds as $rid) $opsParams[] = (int)$rid;

                    if (count($userIds) > 0) {
                        $userPlaceholders = implode(',', array_fill(0, count($userIds), '?'));
                        $opsWhere[] = 'ao.operation_updated_by IN (' . $userPlaceholders . ')';
                        foreach ($userIds as $uid) $opsParams[] = (int)$uid;
                    }

                    if ($date_from) {
                        $opsWhere[] = 'DATE(ao.operation_updated_at) >= ?';
                        $opsParams[] = $date_from;
                    }
                    if ($date_to) {
                        $opsWhere[] = 'DATE(ao.operation_updated_at) <= ?';
                        $opsParams[] = $date_to;
                    }

                    $opsWhereClause = count($opsWhere) > 0 ? ('WHERE ' . implode(' AND ', $opsWhere)) : '';

                    $opsStmt = $this->conn->prepare('
                        SELECT
                            ao.operation_room_id AS room_id,
                            ao.operation_checklist_id AS checklist_id,
                            ao.operation_updated_by AS user_id,
                            DATE(ao.operation_updated_at) AS op_date,
                            ao.operation_is_functional,
                            ao.operation_updated_at
                        FROM tblassignedoperation ao
                        INNER JOIN (
                            SELECT
                                operation_room_id,
                                operation_checklist_id,
                                operation_updated_by,
                                DATE(operation_updated_at) AS op_date,
                                MAX(operation_updated_at) AS max_updated_at
                            FROM tblassignedoperation ao
                            ' . $opsWhereClause . '
                            GROUP BY operation_room_id, operation_checklist_id, operation_updated_by, DATE(operation_updated_at)
                        ) latest
                          ON latest.operation_room_id = ao.operation_room_id
                         AND latest.operation_checklist_id = ao.operation_checklist_id
                         AND latest.operation_updated_by = ao.operation_updated_by
                         AND latest.op_date = DATE(ao.operation_updated_at)
                         AND latest.max_updated_at = ao.operation_updated_at
                    ');
                    $opsStmt->execute($opsParams);
                    $opsRows = $opsStmt->fetchAll(PDO::FETCH_ASSOC);

                    $opsMap = [];
                    foreach ($opsRows as $op) {
                        $key = (int)$op['room_id'] . '|' . (int)$op['user_id'] . '|' . (string)$op['op_date'] . '|' . (int)$op['checklist_id'];
                        $opsMap[$key] = [
                            'operation_is_functional' => $op['operation_is_functional'] === null ? null : (int)$op['operation_is_functional'],
                            'operation_updated_at' => $op['operation_updated_at']
                        ];
                    }

                    for ($i = 0; $i < count($inspections); $i++) {
                        $rid = (int)$inspections[$i]['room_id'];
                        $uid = (int)$inspections[$i]['assigned_reported_by'];
                        $d = (string)$inspections[$i]['inspected_date'];

                        $baseChecklist = $byRoomChecklist[$rid] ?? [];
                        $withOps = [];
                        foreach ($baseChecklist as $ci) {
                            $cid = (int)$ci['checklist_id'];
                            $okey = $rid . '|' . $uid . '|' . $d . '|' . $cid;
                            $opInfo = $opsMap[$okey] ?? null;
                            $withOps[] = [
                                'checklist_id' => $cid,
                                'checklist_name' => $ci['checklist_name'],
                                'operation_is_functional' => $opInfo ? $opInfo['operation_is_functional'] : null,
                                'operation_updated_at' => $opInfo ? $opInfo['operation_updated_at'] : null,
                            ];
                        }

                        $inspections[$i]['checklist'] = $withOps;
                    }
                }
            }

            $summaryStmt = $this->conn->prepare("
                SELECT 
                    COUNT(*) as total_inspections,
                    SUM(CASE WHEN s.assigned_status = 'excellent' THEN 1 ELSE 0 END) as excellent,
                    SUM(CASE WHEN s.assigned_status = 'good' THEN 1 ELSE 0 END) as good,
                    SUM(CASE WHEN s.assigned_status = 'fair' THEN 1 ELSE 0 END) as fair,
                    SUM(CASE WHEN s.assigned_status = 'poor' THEN 1 ELSE 0 END) as poor
                FROM tblassignedstatus s
                JOIN tblroom r ON r.room_id = s.room_id
                JOIN tblbuildingfloor bf ON bf.floorbuilding_id = r.room_building_floor_id
                $whereClause
            ");
            $summaryStmt->execute($params);
            $summary = $summaryStmt->fetch(PDO::FETCH_ASSOC);

            $dateRangeStr = 'All Time';
            if ($date_from && $date_to) {
                $dateRangeStr = date('M j, Y', strtotime($date_from)) . ' - ' . date('M j, Y', strtotime($date_to));
            } elseif ($date_from) {
                $dateRangeStr = 'From ' . date('M j, Y', strtotime($date_from));
            } elseif ($date_to) {
                $dateRangeStr = 'Until ' . date('M j, Y', strtotime($date_to));
            }

            $avgPerDay = 0;
            if ($date_from && $date_to) {
                $days = (strtotime($date_to) - strtotime($date_from)) / 86400 + 1;
                $totalInspections = (int)($summary['total_inspections'] ?? 0);
                $avgPerDay = $days > 0 ? round($totalInspections / $days, 1) : 0;
            }

            return json_encode([
                'success' => true,
                'data' => [
                    'summary' => [
                        'total_inspections' => (int)($summary['total_inspections'] ?? 0),
                        'date_range' => $dateRangeStr,
                        'excellent' => (int)($summary['excellent'] ?? 0),
                        'good' => (int)($summary['good'] ?? 0),
                        'fair' => (int)($summary['fair'] ?? 0),
                        'poor' => (int)($summary['poor'] ?? 0),
                        'inspections_per_day_avg' => $avgPerDay
                    ],
                    'inspections' => $inspections
                ]
            ]);
        } catch (PDOException $e) {
            return json_encode([
                'success' => false,
                'message' => 'Database error: ' . $e->getMessage()
            ]);
        }
    }

    public function getOverallConditionReport($data) {
        try {
            $building_id = null;
            $floor_id = null;
            $date_from = null;
            $date_to = null;

            if (is_array($data)) {
                if (isset($data['building_id']) && $data['building_id'] !== '') {
                    $building_id = (int)$data['building_id'];
                }
                if (isset($data['floor_id']) && $data['floor_id'] !== '') {
                    $floor_id = (int)$data['floor_id'];
                }
                if (isset($data['date_from']) && $data['date_from'] !== '') {
                    $date_from = trim((string)$data['date_from']);
                }
                if (isset($data['date_to']) && $data['date_to'] !== '') {
                    $date_to = trim((string)$data['date_to']);
                }
            }

            $roomWhereConditions = ['bf.floorbuilding_id = r.room_building_floor_id'];
            $statusWhereConditions = ['s.room_id = r.room_id'];
            $params = [];

            if ($building_id) {
                $roomWhereConditions[] = 'bf.building_id = ?';
                $statusWhereConditions[] = 'bf.building_id = ?';
                $params[] = $building_id;
            }
            if ($floor_id) {
                $roomWhereConditions[] = 'bf.floor_id = ?';
                $statusWhereConditions[] = 'bf.floor_id = ?';
                $params[] = $floor_id;
            }
            if ($date_from) {
                $statusWhereConditions[] = 's.completion_date >= ?';
                $params[] = $date_from;
            }
            if ($date_to) {
                $statusWhereConditions[] = 's.completion_date <= ?';
                $params[] = $date_to;
            }

            $roomWhereClause = implode(' AND ', $roomWhereConditions);
            $statusWhereClause = implode(' AND ', $statusWhereConditions);

            $stmt = $this->conn->prepare("
                SELECT 
                    bf.floorbuilding_id,
                    bf.building_id,
                    b.building_name,
                    bf.floor_id,
                    f.floor_name,
                    COUNT(DISTINCT r.room_id) as total_rooms,
                    COALESCE(SUM(CASE WHEN s.assigned_status = 'excellent' THEN 1 ELSE 0 END), 0) as excellent_count,
                    COALESCE(SUM(CASE WHEN s.assigned_status = 'good' THEN 1 ELSE 0 END), 0) as good_count,
                    COALESCE(SUM(CASE WHEN s.assigned_status = 'fair' THEN 1 ELSE 0 END), 0) as fair_count,
                    COALESCE(SUM(CASE WHEN s.assigned_status = 'poor' THEN 1 ELSE 0 END), 0) as poor_count,
                    COUNT(s.assigned_status_id) as total_ratings,
                    MAX(s.completion_date) as last_inspection_date
                FROM tblbuildingfloor bf
                JOIN tblbuilding b ON b.building_id = bf.building_id
                JOIN tblfloor f ON f.floor_id = bf.floor_id
                LEFT JOIN tblroom r ON $roomWhereClause
                LEFT JOIN tblassignedstatus s ON $statusWhereClause
                GROUP BY bf.floorbuilding_id, bf.building_id, b.building_name, bf.floor_id, f.floor_name
                ORDER BY b.building_name ASC, f.floor_name ASC
            ");
            $stmt->execute($params);
            $floors = $stmt->fetchAll(PDO::FETCH_ASSOC);

            $processedFloors = [];
            foreach ($floors as $floor) {
                $totalRatings = (int)$floor['total_ratings'];
                $totalRooms = (int)$floor['total_rooms'];
                $excellent = (int)$floor['excellent_count'];
                $good = (int)$floor['good_count'];
                $fair = (int)$floor['fair_count'];
                $poor = (int)$floor['poor_count'];

                $excellentPct = $totalRatings > 0 ? round(($excellent / $totalRatings) * 100, 1) : 0;
                $goodPct = $totalRatings > 0 ? round(($good / $totalRatings) * 100, 1) : 0;
                $fairPct = $totalRatings > 0 ? round(($fair / $totalRatings) * 100, 1) : 0;
                $poorPct = $totalRatings > 0 ? round(($poor / $totalRatings) * 100, 1) : 0;

                $conditionScore = 0;
                if ($totalRatings > 0) {
                    $conditionScore = (($excellent * 4) + ($good * 3) + ($fair * 2) + ($poor * 1)) / $totalRatings;
                }

                $rating = 'No Data';
                if ($conditionScore >= 3.5) $rating = 'Excellent';
                elseif ($conditionScore >= 2.5) $rating = 'Good';
                elseif ($conditionScore >= 1.5) $rating = 'Fair';
                elseif ($conditionScore > 0) $rating = 'Poor';

                $processedFloors[] = [
                    'floorbuilding_id' => $floor['floorbuilding_id'],
                    'building_id' => $floor['building_id'],
                    'building_name' => $floor['building_name'],
                    'floor_id' => $floor['floor_id'],
                    'floor_name' => $floor['floor_name'],
                    'total_rooms' => $totalRooms,
                    'total_ratings' => $totalRatings,
                    'excellent_count' => $excellent,
                    'good_count' => $good,
                    'fair_count' => $fair,
                    'poor_count' => $poor,
                    'excellent_pct' => $excellentPct,
                    'good_pct' => $goodPct,
                    'fair_pct' => $fairPct,
                    'poor_pct' => $poorPct,
                    'condition_score' => round($conditionScore, 2),
                    'overall_rating' => $rating,
                    'last_inspection_date' => $floor['last_inspection_date']
                ];
            }

            return json_encode([
                'success' => true,
                'data' => [
                    'conditions' => $processedFloors
                ]
            ]);
        } catch (PDOException $e) {
            return json_encode([
                'success' => false,
                'message' => 'Database error: ' . $e->getMessage()
            ]);
        }
    }

    public function getConditionTrendsReport($data) {
        try {
            $building_id = null;
            $floor_id = null;
            $date_from = null;
            $date_to = null;
            $group_by = 'week';

            if (is_array($data)) {
                if (isset($data['building_id']) && $data['building_id'] !== '') {
                    $building_id = (int)$data['building_id'];
                }
                if (isset($data['floor_id']) && $data['floor_id'] !== '') {
                    $floor_id = (int)$data['floor_id'];
                }
                if (isset($data['date_from']) && $data['date_from'] !== '') {
                    $date_from = trim((string)$data['date_from']);
                }
                if (isset($data['date_to']) && $data['date_to'] !== '') {
                    $date_to = trim((string)$data['date_to']);
                }
                if (isset($data['group_by']) && in_array($data['group_by'], ['day', 'week', 'month'])) {
                    $group_by = $data['group_by'];
                }
            }

            $whereConditions = [];
            $params = [];

            if ($building_id) {
                $whereConditions[] = 'bf.building_id = ?';
                $params[] = $building_id;
            }
            if ($floor_id) {
                $whereConditions[] = 'bf.floor_id = ?';
                $params[] = $floor_id;
            }
            if ($date_from) {
                $whereConditions[] = 's.completion_date >= ?';
                $params[] = $date_from;
            }
            if ($date_to) {
                $whereConditions[] = 's.completion_date <= ?';
                $params[] = $date_to;
            }

            $whereClause = count($whereConditions) > 0 ? 'AND ' . implode(' AND ', $whereConditions) : '';

            $trends = [];

            if ($group_by === 'day') {
                $stmt = $this->conn->prepare("
                    SELECT 
                        s.completion_date as period_date,
                        DATE_FORMAT(s.completion_date, '%b %d') as period_label,
                        DATE(s.completion_date) as date_key,
                        SUM(CASE WHEN s.assigned_status = 'excellent' THEN 1 ELSE 0 END) as excellent,
                        SUM(CASE WHEN s.assigned_status = 'good' THEN 1 ELSE 0 END) as good,
                        SUM(CASE WHEN s.assigned_status = 'fair' THEN 1 ELSE 0 END) as fair,
                        SUM(CASE WHEN s.assigned_status = 'poor' THEN 1 ELSE 0 END) as poor,
                        COUNT(*) as total
                    FROM tblassignedstatus s
                    JOIN tblroom r ON r.room_id = s.room_id
                    JOIN tblbuildingfloor bf ON bf.floorbuilding_id = r.room_building_floor_id
                    WHERE 1=1 $whereClause
                    GROUP BY s.completion_date
                    ORDER BY s.completion_date ASC
                ");
                $stmt->execute($params);
                $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

                foreach ($rows as $row) {
                    $total = (int)$row['total'];
                    $conditionScore = $total > 0 ? (($row['excellent'] * 4) + ($row['good'] * 3) + ($row['fair'] * 2) + ($row['poor'] * 1)) / $total : 0;
                    
                    $trends[] = [
                        'period' => $row['period_label'],
                        'date_range' => $row['period_label'],
                        'excellent' => (int)$row['excellent'],
                        'good' => (int)$row['good'],
                        'fair' => (int)$row['fair'],
                        'poor' => (int)$row['poor'],
                        'total' => $total,
                        'condition_score' => round($conditionScore, 1)
                    ];
                }
            } elseif ($group_by === 'week') {
                $stmt = $this->conn->prepare("
                    SELECT 
                        YEARWEEK(s.completion_date, 1) as week_key,
                        MIN(s.completion_date) as week_start,
                        MAX(s.completion_date) as week_end,
                        DATE_FORMAT(MIN(s.completion_date), '%b %d') as period_label,
                        SUM(CASE WHEN s.assigned_status = 'excellent' THEN 1 ELSE 0 END) as excellent,
                        SUM(CASE WHEN s.assigned_status = 'good' THEN 1 ELSE 0 END) as good,
                        SUM(CASE WHEN s.assigned_status = 'fair' THEN 1 ELSE 0 END) as fair,
                        SUM(CASE WHEN s.assigned_status = 'poor' THEN 1 ELSE 0 END) as poor,
                        COUNT(*) as total
                    FROM tblassignedstatus s
                    JOIN tblroom r ON r.room_id = s.room_id
                    JOIN tblbuildingfloor bf ON bf.floorbuilding_id = r.room_building_floor_id
                    WHERE 1=1 $whereClause
                    GROUP BY YEARWEEK(s.completion_date, 1)
                    ORDER BY week_key ASC
                ");
                $stmt->execute($params);
                $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

                foreach ($rows as $row) {
                    $total = (int)$row['total'];
                    $conditionScore = $total > 0 ? (($row['excellent'] * 4) + ($row['good'] * 3) + ($row['fair'] * 2) + ($row['poor'] * 1)) / $total : 0;
                    
                    $trends[] = [
                        'period' => 'Week of ' . $row['period_label'],
                        'date_range' => date('M d', strtotime($row['week_start'])) . ' - ' . date('M d', strtotime($row['week_end'])),
                        'excellent' => (int)$row['excellent'],
                        'good' => (int)$row['good'],
                        'fair' => (int)$row['fair'],
                        'poor' => (int)$row['poor'],
                        'total' => $total,
                        'condition_score' => round($conditionScore, 1)
                    ];
                }
            } else {
                $stmt = $this->conn->prepare("
                    SELECT 
                        DATE_FORMAT(s.completion_date, '%Y-%m') as month_key,
                        DATE_FORMAT(s.completion_date, '%b %Y') as period_label,
                        SUM(CASE WHEN s.assigned_status = 'excellent' THEN 1 ELSE 0 END) as excellent,
                        SUM(CASE WHEN s.assigned_status = 'good' THEN 1 ELSE 0 END) as good,
                        SUM(CASE WHEN s.assigned_status = 'fair' THEN 1 ELSE 0 END) as fair,
                        SUM(CASE WHEN s.assigned_status = 'poor' THEN 1 ELSE 0 END) as poor,
                        COUNT(*) as total
                    FROM tblassignedstatus s
                    JOIN tblroom r ON r.room_id = s.room_id
                    JOIN tblbuildingfloor bf ON bf.floorbuilding_id = r.room_building_floor_id
                    WHERE 1=1 $whereClause
                    GROUP BY DATE_FORMAT(s.completion_date, '%Y-%m')
                    ORDER BY month_key ASC
                ");
                $stmt->execute($params);
                $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

                foreach ($rows as $row) {
                    $total = (int)$row['total'];
                    $conditionScore = $total > 0 ? (($row['excellent'] * 4) + ($row['good'] * 3) + ($row['fair'] * 2) + ($row['poor'] * 1)) / $total : 0;
                    
                    $trends[] = [
                        'period' => $row['period_label'],
                        'date_range' => $row['period_label'],
                        'excellent' => (int)$row['excellent'],
                        'good' => (int)$row['good'],
                        'fair' => (int)$row['fair'],
                        'poor' => (int)$row['poor'],
                        'total' => $total,
                        'condition_score' => round($conditionScore, 1)
                    ];
                }
            }

            $overallTrend = 'stable';
            if (count($trends) >= 2) {
                $firstScore = $trends[0]['condition_score'];
                $lastScore = $trends[count($trends) - 1]['condition_score'];
                $diff = $lastScore - $firstScore;
                if ($diff > 0.3) $overallTrend = 'improving';
                elseif ($diff < -0.3) $overallTrend = 'declining';
                else $overallTrend = 'stable';
            } elseif (count($trends) === 1) {
                $score = $trends[0]['condition_score'];
                if ($score >= 3.5) $overallTrend = 'good';
                elseif ($score >= 2.5) $overallTrend = 'average';
                else $overallTrend = 'needs_attention';
            }

            for ($i = 0; $i < count($trends); $i++) {
                if ($i === 0) {
                    $trends[$i]['trend'] = '-';
                } else {
                    $diff = $trends[$i]['condition_score'] - $trends[$i - 1]['condition_score'];
                    if ($diff > 0.3) $trends[$i]['trend'] = '↑';
                    elseif ($diff < -0.3) $trends[$i]['trend'] = '↓';
                    else $trends[$i]['trend'] = '→';
                }
            }

            $dateRangeStr = 'All Time';
            if ($date_from && $date_to) {
                $dateRangeStr = date('M j, Y', strtotime($date_from)) . ' - ' . date('M j, Y', strtotime($date_to));
            } elseif ($date_from) {
                $dateRangeStr = 'From ' . date('M j, Y', strtotime($date_from));
            } elseif ($date_to) {
                $dateRangeStr = 'Until ' . date('M j, Y', strtotime($date_to));
            }

            $totalInspections = array_sum(array_column($trends, 'total'));

            return json_encode([
                'success' => true,
                'data' => [
                    'summary' => [
                        'period' => $dateRangeStr,
                        'group_by' => $group_by,
                        'total_inspections' => $totalInspections,
                        'overall_trend' => $overallTrend
                    ],
                    'trends' => $trends
                ]
            ]);
        } catch (PDOException $e) {
            return json_encode([
                'success' => false,
                'message' => 'Database error: ' . $e->getMessage()
            ]);
        }
    }
}

// Handle request
$raw = file_get_contents('php://input');
$body = json_decode($raw, true);

$operation = $body['operation'] ?? '';
$json = $body['json'] ?? [];

$reports = new AdminReports($conn);

switch($operation) {
    case 'getStudentAssignmentReport':
        echo $reports->getStudentAssignmentReport($json);
        break;
    case 'getInspectionSummaryReport':
        echo $reports->getInspectionSummaryReport($json);
        break;
    case 'getOverallConditionReport':
        echo $reports->getOverallConditionReport($json);
        break;
    case 'getConditionTrendsReport':
        echo $reports->getConditionTrendsReport($json);
        break;
    default:
        echo json_encode([
            'success' => false,
            'message' => 'Invalid operation'
        ]);
}
