-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Jan 26, 2026 at 11:13 PM
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
(1, 2, 1, '2026-01-26', '2026-03-31', 'active', 1, '2026-01-26 05:12:56');

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
(1, 1, '2026-01-27 06:01:25', 2, 1, 2),
(2, 1, '2026-01-27 06:01:27', 2, 1, 1),
(3, 0, '2026-01-27 06:01:28', 2, 1, 3),
(4, 1, '2026-01-27 06:11:50', 2, 1, 1),
(5, 1, '2026-01-27 06:11:50', 2, 1, 2),
(6, 0, '2026-01-27 06:11:50', 2, 1, 3);

-- --------------------------------------------------------

--
-- Table structure for table `tblassignedstatus`
--

CREATE TABLE `tblassignedstatus` (
  `assigned_status_id` int(11) NOT NULL,
  `assigned_id` int(11) NOT NULL,
  `assigned_remarks` text DEFAULT NULL,
  `assigned_status` enum('fair','good','excellent','poor') NOT NULL,
  `assigned_reported_by` int(11) NOT NULL,
  `assigned_updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `tblassignedstatus`
--

INSERT INTO `tblassignedstatus` (`assigned_status_id`, `assigned_id`, `assigned_remarks`, `assigned_status`, `assigned_reported_by`, `assigned_updated_at`) VALUES
(1, 1, 'basta mao nani', 'good', 2, '2026-01-26 22:11:50');

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
(1, 1, 1);

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
(1, '1st floor');

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
(5, '105', 1);

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
(3, 'sample1', 1);

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
(2, 'asd', 'asd', '$2y$10$IeWX54Zx54D0mxKWnkQ5zO.lQc6KT8wYOl6CiLOLz98myo4XNaDq6', 2, 1, '2026-01-13 15:38:46');

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
  MODIFY `assigned_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `tblassignedoperation`
--
ALTER TABLE `tblassignedoperation`
  MODIFY `operation_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT for table `tblassignedstatus`
--
ALTER TABLE `tblassignedstatus`
  MODIFY `assigned_status_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `tblbuilding`
--
ALTER TABLE `tblbuilding`
  MODIFY `building_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `tblbuildingfloor`
--
ALTER TABLE `tblbuildingfloor`
  MODIFY `floorbuilding_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `tblfloor`
--
ALTER TABLE `tblfloor`
  MODIFY `floor_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `tblrole`
--
ALTER TABLE `tblrole`
  MODIFY `role_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `tblroom`
--
ALTER TABLE `tblroom`
  MODIFY `room_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `tblroomchecklist`
--
ALTER TABLE `tblroomchecklist`
  MODIFY `checklist_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `tblstudent_activity`
--
ALTER TABLE `tblstudent_activity`
  MODIFY `activity_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `tbluser`
--
ALTER TABLE `tbluser`
  MODIFY `user_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

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
