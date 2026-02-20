-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Feb 18, 2026 at 11:24 PM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `janitorial`
--

-- --------------------------------------------------------

--
-- Table structure for table `tblassigned`
--

CREATE TABLE `tblassigned` (
  `assigned_id` int(11) NOT NULL,
  `assigned_user_id` int(11) NOT NULL,
  `assigned_floor_building_id` int(11) NOT NULL,
  `assigned_start_date` date NOT NULL,
  `assigned_end_date` date DEFAULT NULL,
  `assigned_status_enum` enum('active','completed','inactive') NOT NULL DEFAULT 'active',
  `assigned_by_user_id` int(11) NOT NULL,
  `assigned_created_at` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `tblassigned`
--

INSERT INTO `tblassigned` (`assigned_id`, `assigned_user_id`, `assigned_floor_building_id`, `assigned_start_date`, `assigned_end_date`, `assigned_status_enum`, `assigned_by_user_id`, `assigned_created_at`) VALUES
(1, 2, 2, '2026-01-26', '2026-03-31', 'active', 1, '2026-01-26 05:12:56'),
(2, 2, 1, '2026-02-04', '2026-02-05', 'active', 1, '2026-02-04 06:45:06'),
(3, 2, 2, '2026-02-12', '2026-02-18', 'active', 1, '2026-02-04 07:03:06'),
(4, 2, 2, '2026-03-11', '2026-03-12', 'completed', 1, '2026-02-11 22:57:45');

-- --------------------------------------------------------

--
-- Table structure for table `tblassignedoperation`
--

CREATE TABLE `tblassignedoperation` (
  `operation_id` int(11) NOT NULL,
  `operation_is_functional` tinyint(1) NOT NULL,
  `operation_updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `operation_updated_by` int(11) NOT NULL,
  `operation_room_id` int(11) NOT NULL,
  `operation_checklist_id` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `tblassignedoperation`
--

INSERT INTO `tblassignedoperation` (`operation_id`, `operation_is_functional`, `operation_updated_at`, `operation_updated_by`, `operation_room_id`, `operation_checklist_id`) VALUES
(23, 1, '2026-02-04 09:30:31', 2, 6, 7),
(24, 1, '2026-02-04 10:15:19', 2, 7, 8),
(25, 0, '2026-02-04 10:15:27', 2, 8, 9),
(26, 1, '2026-02-11 20:11:49', 2, 6, 7),
(27, 1, '2026-02-11 20:11:51', 2, 7, 8),
(28, 0, '2026-02-11 20:11:53', 2, 8, 9),
(29, 1, '2026-02-15 00:32:47', 2, 6, 7);

-- --------------------------------------------------------

--
-- Table structure for table `tblassignedstatus`
--

CREATE TABLE `tblassignedstatus` (
  `assigned_status_id` int(11) NOT NULL,
  `assigned_id` int(11) NOT NULL,
  `room_id` int(11) NOT NULL,
  `assigned_remarks` text DEFAULT NULL,
  `assigned_status` enum('fair','good','excellent','poor') NOT NULL,
  `assigned_reported_by` int(11) NOT NULL,
  `completion_date` date NOT NULL DEFAULT curdate(),
  `assigned_updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `tblassignedstatus`
--

INSERT INTO `tblassignedstatus` (`assigned_status_id`, `assigned_id`, `room_id`, `assigned_remarks`, `assigned_status`, `assigned_reported_by`, `completion_date`, `assigned_updated_at`) VALUES
(12, 1, 6, 'hehehe', 'excellent', 2, '2026-02-04', '2026-02-04 01:40:43'),
(13, 1, 7, 'asd', 'good', 2, '2026-02-04', '2026-02-04 02:15:19'),
(14, 1, 8, 'dadsa', 'good', 2, '2026-02-04', '2026-02-04 02:15:27'),
(15, 1, 6, 'hehehe', 'excellent', 2, '2026-02-11', '2026-02-11 12:11:49'),
(16, 1, 7, 'asd', 'good', 2, '2026-02-11', '2026-02-11 12:11:51'),
(17, 1, 8, 'dadsa', 'good', 2, '2026-02-11', '2026-02-11 12:11:53'),
(18, 3, 6, 'sample', 'good', 2, '2026-02-15', '2026-02-14 16:32:47');

-- --------------------------------------------------------

--
-- Table structure for table `tblbuilding`
--

CREATE TABLE `tblbuilding` (
  `building_id` int(11) NOT NULL,
  `building_name` varchar(100) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `tblbuilding`
--

INSERT INTO `tblbuilding` (`building_id`, `building_name`) VALUES
(1, 'MSSS');

-- --------------------------------------------------------

--
-- Table structure for table `tblbuildingfloor`
--

CREATE TABLE `tblbuildingfloor` (
  `floorbuilding_id` int(11) NOT NULL,
  `building_id` int(11) NOT NULL,
  `floor_id` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `tblbuildingfloor`
--

INSERT INTO `tblbuildingfloor` (`floorbuilding_id`, `building_id`, `floor_id`) VALUES
(1, 1, 1),
(2, 1, 2);

-- --------------------------------------------------------

--
-- Table structure for table `tblfloor`
--

CREATE TABLE `tblfloor` (
  `floor_id` int(11) NOT NULL,
  `floor_name` varchar(100) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `tblfloor`
--

INSERT INTO `tblfloor` (`floor_id`, `floor_name`) VALUES
(1, '1st floor'),
(2, '2nd floor');

-- --------------------------------------------------------

--
-- Table structure for table `tblrole`
--

CREATE TABLE `tblrole` (
  `role_id` int(11) NOT NULL,
  `role_name` varchar(50) NOT NULL,
  `description` varchar(150) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `tblrole`
--

INSERT INTO `tblrole` (`role_id`, `role_name`, `description`) VALUES
(1, 'Admin', 'System Administrator'),
(2, 'Student', 'Student User');

-- --------------------------------------------------------

--
-- Table structure for table `tblroom`
--

CREATE TABLE `tblroom` (
  `room_id` int(11) NOT NULL,
  `room_number` varchar(50) NOT NULL,
  `room_building_floor_id` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `tblroom`
--

INSERT INTO `tblroom` (`room_id`, `room_number`, `room_building_floor_id`) VALUES
(1, '101', 1),
(2, '102', 1),
(3, '103', 1),
(4, '104', 1),
(5, '105', 1),
(6, '101', 2),
(7, '102', 2),
(8, '103', 2);

-- --------------------------------------------------------

--
-- Table structure for table `tblroomchecklist`
--

CREATE TABLE `tblroomchecklist` (
  `checklist_id` int(11) NOT NULL,
  `checklist_name` varchar(255) NOT NULL,
  `checklist_room_id` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `tblroomchecklist`
--

INSERT INTO `tblroomchecklist` (`checklist_id`, `checklist_name`, `checklist_room_id`) VALUES
(1, 'sample checklist', 1),
(2, 'sample', 1),
(3, 'sample1', 1),
(4, 'so mao to', 2),
(5, 'kani', 2),
(6, 'hehe', 3),
(7, 'asd', 6),
(8, 'hehe', 7),
(9, 'hehehe', 8);

-- --------------------------------------------------------

--
-- Table structure for table `tblstudent_activity`
--

CREATE TABLE `tblstudent_activity` (
  `activity_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `activity_date` date NOT NULL,
  `status` enum('Active','Inactive') NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `tbluser`
--

CREATE TABLE `tbluser` (
  `user_id` int(11) NOT NULL,
  `full_name` varchar(100) NOT NULL,
  `username` varchar(50) NOT NULL,
  `password` varchar(255) NOT NULL,
  `role_id` int(11) NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `tbluser`
--

INSERT INTO `tbluser` (`user_id`, `full_name`, `username`, `password`, `role_id`, `is_active`, `created_at`) VALUES
(1, 'GSD Office', 'gsd', '$2y$10$AH57IY3TS54w.jYWhOMIOOEAfz.baGBmrizhqKVEJPJ1rJesx3d5a', 1, 1, '2026-01-13 14:17:18'),
(2, 'Christian Mark Valle', 'asd', '$2y$10$IeWX54Zx54D0mxKWnkQ5zO.lQc6KT8wYOl6CiLOLz98myo4XNaDq6', 2, 1, '2026-01-13 15:38:46'),
(3, 'asd', 'asdd', '$2y$10$rR5waPRwRz0TA52AL7xZDePv4sI3ehFWthXYGKoG/lHJFvVeExepe', 1, 1, '2026-02-11 14:58:29');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `tblassigned`
--
ALTER TABLE `tblassigned`
  ADD PRIMARY KEY (`assigned_id`),
  ADD KEY `fk_assigned_user` (`assigned_user_id`),
  ADD KEY `fk_assigned_by_user` (`assigned_by_user_id`),
  ADD KEY `fk_assigned_floor_building` (`assigned_floor_building_id`);

--
-- Indexes for table `tblassignedoperation`
--
ALTER TABLE `tblassignedoperation`
  ADD PRIMARY KEY (`operation_id`),
  ADD KEY `fk_operation_updated_by` (`operation_updated_by`),
  ADD KEY `fk_operation_room` (`operation_room_id`),
  ADD KEY `fk_operation_checklist` (`operation_checklist_id`);

--
-- Indexes for table `tblassignedstatus`
--
ALTER TABLE `tblassignedstatus`
  ADD PRIMARY KEY (`assigned_status_id`),
  ADD KEY `fk_assignedstatus_assigned` (`assigned_id`),
  ADD KEY `fk_assignedstatus_user` (`assigned_reported_by`);

--
-- Indexes for table `tblbuilding`
--
ALTER TABLE `tblbuilding`
  ADD PRIMARY KEY (`building_id`);

--
-- Indexes for table `tblbuildingfloor`
--
ALTER TABLE `tblbuildingfloor`
  ADD PRIMARY KEY (`floorbuilding_id`),
  ADD KEY `fk_bf_building` (`building_id`),
  ADD KEY `fk_bf_floor` (`floor_id`);

--
-- Indexes for table `tblfloor`
--
ALTER TABLE `tblfloor`
  ADD PRIMARY KEY (`floor_id`);

--
-- Indexes for table `tblrole`
--
ALTER TABLE `tblrole`
  ADD PRIMARY KEY (`role_id`),
  ADD UNIQUE KEY `role_name` (`role_name`);

--
-- Indexes for table `tblroom`
--
ALTER TABLE `tblroom`
  ADD PRIMARY KEY (`room_id`),
  ADD KEY `fk_room_building_floor` (`room_building_floor_id`);

--
-- Indexes for table `tblroomchecklist`
--
ALTER TABLE `tblroomchecklist`
  ADD PRIMARY KEY (`checklist_id`),
  ADD KEY `fk_checklist_room` (`checklist_room_id`);

--
-- Indexes for table `tblstudent_activity`
--
ALTER TABLE `tblstudent_activity`
  ADD PRIMARY KEY (`activity_id`),
  ADD KEY `user_id` (`user_id`);

--
-- Indexes for table `tbluser`
--
ALTER TABLE `tbluser`
  ADD PRIMARY KEY (`user_id`),
  ADD UNIQUE KEY `username` (`username`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `tblassigned`
--
ALTER TABLE `tblassigned`
  MODIFY `assigned_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `tblassignedoperation`
--
ALTER TABLE `tblassignedoperation`
  MODIFY `operation_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=30;

--
-- AUTO_INCREMENT for table `tblassignedstatus`
--
ALTER TABLE `tblassignedstatus`
  MODIFY `assigned_status_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=19;

--
-- AUTO_INCREMENT for table `tblbuilding`
--
ALTER TABLE `tblbuilding`
  MODIFY `building_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `tblbuildingfloor`
--
ALTER TABLE `tblbuildingfloor`
  MODIFY `floorbuilding_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `tblfloor`
--
ALTER TABLE `tblfloor`
  MODIFY `floor_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `tblrole`
--
ALTER TABLE `tblrole`
  MODIFY `role_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `tblroom`
--
ALTER TABLE `tblroom`
  MODIFY `room_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT for table `tblroomchecklist`
--
ALTER TABLE `tblroomchecklist`
  MODIFY `checklist_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=10;

--
-- AUTO_INCREMENT for table `tblstudent_activity`
--
ALTER TABLE `tblstudent_activity`
  MODIFY `activity_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `tbluser`
--
ALTER TABLE `tbluser`
  MODIFY `user_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `tblassigned`
--
ALTER TABLE `tblassigned`
  ADD CONSTRAINT `fk_assigned_by_user` FOREIGN KEY (`assigned_by_user_id`) REFERENCES `tbluser` (`user_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_assigned_floor_building` FOREIGN KEY (`assigned_floor_building_id`) REFERENCES `tblbuildingfloor` (`floorbuilding_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_assigned_user` FOREIGN KEY (`assigned_user_id`) REFERENCES `tbluser` (`user_id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `tblassignedoperation`
--
ALTER TABLE `tblassignedoperation`
  ADD CONSTRAINT `fk_operation_checklist` FOREIGN KEY (`operation_checklist_id`) REFERENCES `tblroomchecklist` (`checklist_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_operation_room` FOREIGN KEY (`operation_room_id`) REFERENCES `tblroom` (`room_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_operation_updated_by` FOREIGN KEY (`operation_updated_by`) REFERENCES `tbluser` (`user_id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `tblassignedstatus`
--
ALTER TABLE `tblassignedstatus`
  ADD CONSTRAINT `fk_assignedstatus_assigned` FOREIGN KEY (`assigned_id`) REFERENCES `tblassigned` (`assigned_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_assignedstatus_user` FOREIGN KEY (`assigned_reported_by`) REFERENCES `tbluser` (`user_id`) ON UPDATE CASCADE;

--
-- Constraints for table `tblbuildingfloor`
--
ALTER TABLE `tblbuildingfloor`
  ADD CONSTRAINT `fk_bf_building` FOREIGN KEY (`building_id`) REFERENCES `tblbuilding` (`building_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_bf_floor` FOREIGN KEY (`floor_id`) REFERENCES `tblfloor` (`floor_id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `tblroom`
--
ALTER TABLE `tblroom`
  ADD CONSTRAINT `fk_room_building_floor` FOREIGN KEY (`room_building_floor_id`) REFERENCES `tblbuildingfloor` (`floorbuilding_id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `tblroomchecklist`
--
ALTER TABLE `tblroomchecklist`
  ADD CONSTRAINT `fk_checklist_room` FOREIGN KEY (`checklist_room_id`) REFERENCES `tblroom` (`room_id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `tblstudent_activity`
--
ALTER TABLE `tblstudent_activity`
  ADD CONSTRAINT `tblstudent_activity_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `tbluser` (`user_id`);
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
