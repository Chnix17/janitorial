-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Mar 13, 2026 at 05:16 PM
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

-- --------------------------------------------------------

--
-- Table structure for table `tblassignedoperation`
--

CREATE TABLE `tblassignedoperation` (
  `operation_id` int(11) NOT NULL,
  `operation_assigned_id` int(11) DEFAULT NULL,
  `operation_is_functional` tinyint(1) NOT NULL,
  `operation_updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `operation_updated_by` int(11) NOT NULL,
  `operation_room_id` int(11) NOT NULL,
  `operation_checklist_id` int(11) DEFAULT NULL,
  `operation_quantity` int(11) DEFAULT NULL,
  `operation_condition` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `tblassignedrooms`
--

CREATE TABLE `tblassignedrooms` (
  `assigned_rooms_id` int(11) NOT NULL,
  `assigned_assigned_id` int(11) NOT NULL,
  `assigned_room_id` int(11) NOT NULL,
  `assigned_created_by` int(11) NOT NULL,
  `assigned_created_at` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

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
(1, 'PH');

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
(2, 1, 2),
(3, 1, 3),
(4, 1, 4),
(5, 1, 5),
(6, 1, 6);

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
(2, '2nd floor'),
(3, '3rd floor'),
(4, '4th floor'),
(5, '5th floor'),
(6, '6th floor');

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
(10, '205', 2),
(11, '206', 2),
(12, '207', 2),
(13, '208', 2),
(14, '209', 2),
(15, '210', 2),
(17, '211', 2),
(18, '201', 2),
(19, '301', 3),
(20, '302', 3),
(21, '303', 3),
(22, '304', 3),
(23, '305', 3),
(24, '306', 3),
(25, '307', 3),
(26, '308', 3),
(27, '309', 3),
(28, '310', 3),
(29, '311', 3),
(30, '312', 3),
(31, '313', 3),
(32, '315-A', 3),
(33, '315-B', 3),
(34, '401', 4),
(35, '402', 4),
(36, '403', 4),
(37, '404', 4),
(38, '405', 4),
(39, '406', 4),
(40, '407', 4),
(41, '408', 4),
(42, '409', 4),
(43, '410', 4),
(44, '411', 4),
(45, '415-A', 4),
(46, '415-B', 4),
(47, '416-A', 4),
(48, '416-B', 4),
(49, '417-A', 4),
(50, '417-B', 4),
(51, '419', 4),
(52, '502', 5),
(53, '503', 5),
(54, '506', 5),
(55, '509', 5),
(56, '510', 5),
(57, '511', 5),
(58, '512', 5),
(59, '513', 5),
(60, '515', 5),
(61, '516-A', 5),
(62, '516-B', 5),
(63, '517-A', 5),
(64, '517-B', 5),
(65, '519', 5);

-- --------------------------------------------------------

--
-- Table structure for table `tblroomchecklist`
--

CREATE TABLE `tblroomchecklist` (
  `checklist_id` int(11) NOT NULL,
  `checklist_name` varchar(255) NOT NULL,
  `checklist_type` enum('boolean','quantity','condition') DEFAULT 'boolean',
  `checklist_quantity` int(11) DEFAULT NULL,
  `checklist_options` varchar(500) DEFAULT NULL,
  `checklist_room_id` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `tblroomchecklist`
--

INSERT INTO `tblroomchecklist` (`checklist_id`, `checklist_name`, `checklist_type`, `checklist_quantity`, `checklist_options`, `checklist_room_id`) VALUES
(9, 'LIGHTS', 'quantity', 6, NULL, 18),
(10, 'ORBIT FAN', 'quantity', 4, NULL, 18),
(11, 'TV', 'condition', 1, 'Good, Bad', 18),
(12, 'OUTLET', 'quantity', 2, NULL, 18),
(13, 'BLACK/WHITE BOARD', 'condition', 1, 'Good, Bad', 18),
(14, 'CHAIRS', 'quantity', 50, NULL, 18),
(15, 'TEACHERS TABLE', 'condition', 1, 'Good, Bad', 18),
(16, 'SWITCH', 'condition', 1, 'Good, Bad', 18),
(17, 'LIGHTS', 'quantity', 6, NULL, 10),
(18, 'ORBIT FAN', 'quantity', 4, NULL, 10),
(19, 'TV', 'condition', 1, 'Good, Bad', 10),
(20, 'OUTLET', 'quantity', 3, NULL, 10),
(21, 'BLACK/WHITE BOARD', 'condition', 1, 'Good, Bad', 10),
(22, 'CHAIRS', 'quantity', 50, NULL, 10),
(23, 'TEACHERS TABLE', 'condition', 1, 'Good, Bad', 10),
(24, 'SWITCH', 'condition', 1, 'Good, Bad', 10),
(25, 'LIGHTS', 'quantity', 6, NULL, 11),
(26, 'ORBIT FAN', 'quantity', 4, NULL, 11),
(27, 'TV', 'condition', 1, 'Good, Bad', 11),
(28, 'OUTLET', 'quantity', 2, NULL, 11),
(29, 'BLACK/WHITE BOARD', 'condition', 1, 'Good, Bad', 11),
(30, 'CHAIRS', 'quantity', 50, NULL, 11),
(31, 'TEACHERS TABLE', 'condition', 1, 'Good, Bad', 11),
(32, 'SWITCH', 'condition', 1, 'Good, Bad', 11),
(33, 'LIGHTS', 'quantity', 6, NULL, 12),
(34, 'ORBIT FAN', 'quantity', 4, NULL, 12),
(35, 'TV', 'condition', 1, 'Good, Bad', 12),
(36, 'OUTLET', 'condition', 1, 'Good, Bad', 12),
(37, 'BLACK/WHITE BOARD', 'condition', 1, 'Good, Bad', 12),
(38, 'CHAIRS', 'quantity', 50, NULL, 12),
(39, 'TEACHERS TABLE', 'condition', 1, 'Good, Bad', 12),
(40, 'SWITCH', 'condition', 1, 'Good, Bad', 12),
(41, 'LIGHTS', 'quantity', 6, NULL, 13),
(42, 'ORBIT FAN', 'quantity', 4, NULL, 13),
(43, 'TV', 'condition', 1, 'Good, Bad', 13),
(44, 'OUTLET', 'condition', 1, 'Good, Bad', 13),
(45, 'BLACK/WHITE BOARD', 'condition', 1, 'Good, Bad', 13),
(46, 'CHAIRS', 'quantity', 50, NULL, 13),
(47, 'TEACHERS TABLE', 'condition', 1, 'Good, Bad', 13),
(48, 'SWITCH', 'condition', 1, 'Good, Bad', 13),
(49, 'LIGHTS', 'quantity', 6, NULL, 14),
(50, 'ORBIT FAN', 'quantity', 4, NULL, 14),
(51, 'TV', 'condition', 1, 'Good, Bad', 14),
(52, 'OUTLET', 'condition', 1, 'Good, Bad', 14),
(53, 'BLACK/WHITE BOARD', 'condition', 1, 'Good, Bad', 14),
(54, 'CHAIRS', 'quantity', 50, NULL, 14),
(55, 'TEACHERS TABLE', 'condition', 1, 'Good, Bad', 14),
(56, 'SWITCH', 'condition', 1, 'Good, Bad', 14),
(57, 'LIGHTS', 'quantity', 6, NULL, 15),
(58, 'ORBIT FAN', 'quantity', 4, NULL, 15),
(59, 'TV', 'condition', 1, 'Good, Bad', 15),
(60, 'OUTLET', 'condition', 1, 'Good, Bad', 15),
(61, 'BLACK/WHITE BOARD', 'condition', 1, 'Good, Bad', 15),
(62, 'CHAIRS', 'quantity', 50, NULL, 15),
(63, 'TEACHERS TABLE', 'condition', 1, 'Good, Bad', 15),
(64, 'SWITCH', 'condition', 1, 'Good, Bad', 15),
(65, 'LIGHTS', 'quantity', 6, NULL, 17),
(66, 'ORBIT FAN', 'quantity', 4, NULL, 17),
(67, 'TV', 'condition', 1, 'Good, Bad', 17),
(68, 'OUTLET', 'condition', 1, 'Good, Bad', 17),
(69, 'BLACK/WHITE BOARD', 'condition', 1, 'Good, Bad', 17),
(70, 'CHAIRS', 'quantity', 50, NULL, 17),
(71, 'TEACHERS TABLE', 'condition', 1, 'Good, Bad', 17),
(72, 'SWITCH', 'condition', 1, 'Good, Bad', 17),
(73, 'LIGHTS', 'quantity', 6, NULL, 19),
(74, 'ORBIT FAN', 'quantity', 4, NULL, 19),
(75, 'TV', 'condition', 1, 'Good, Bad', 19),
(76, 'OUTLET', 'condition', 1, 'Good, Bad', 19),
(77, 'BLACK/WHITE BOARD', 'condition', 1, 'Good, Bad', 19),
(78, 'CHAIRS', 'quantity', 50, NULL, 19),
(79, 'TEACHERS TABLE', 'condition', 1, 'Good, Bad', 19),
(80, 'SWITCH', 'condition', 1, 'Good, Bad', 19),
(81, 'LIGHTS', 'quantity', 6, NULL, 20),
(82, 'ORBIT FAN', 'quantity', 4, NULL, 20),
(83, 'TV', 'condition', 1, 'Good, Bad', 20),
(84, 'OUTLET', 'condition', 1, 'Good, Bad', 20),
(85, 'BLACK/WHITE BOARD', 'condition', 1, 'Good, Bad', 20),
(86, 'CHAIRS', 'quantity', 50, NULL, 20),
(87, 'TEACHERS TABLE', 'condition', 1, 'Good, Bad', 20),
(88, 'SWITCH', 'condition', 1, 'Good, Bad', 20),
(89, 'LIGHTS', 'quantity', 6, NULL, 21),
(90, 'ORBIT FAN', 'quantity', 4, NULL, 21),
(91, 'TV', 'condition', 1, 'Good, Bad', 21),
(92, 'OUTLET', 'condition', 1, 'Good, Bad', 21),
(93, 'BLACK/WHITE BOARD', 'condition', 1, 'Good, Bad', 21),
(94, 'CHAIRS', 'quantity', 50, NULL, 21),
(95, 'TEACHERS TABLE', 'condition', 1, 'Good, Bad', 21),
(96, 'SWITCH', 'condition', 1, 'Good, Bad', 21),
(97, 'LIGHTS', 'quantity', 6, NULL, 22),
(98, 'ORBIT FAN', 'quantity', 4, NULL, 22),
(99, 'TV', 'condition', 1, 'Good, Bad', 22),
(100, 'OUTLET', 'condition', 1, 'Good, Bad', 22),
(101, 'BLACK/WHITE BOARD', 'condition', 1, 'Good, Bad', 22),
(102, 'CHAIRS', 'quantity', 50, NULL, 22),
(103, 'TEACHERS TABLE', 'condition', 1, 'Good, Bad', 22),
(104, 'SWITCH', 'condition', 1, 'Good, Bad', 22),
(105, 'LIGHTS', 'quantity', 6, NULL, 23),
(106, 'ORBIT FAN', 'quantity', 4, NULL, 23),
(107, 'TV', 'condition', 1, 'Good, Bad', 23),
(108, 'OUTLET', 'condition', 1, 'Good, Bad', 23),
(109, 'BLACK/WHITE BOARD', 'condition', 1, 'Good, Bad', 23),
(110, 'CHAIRS', 'quantity', 50, NULL, 23),
(111, 'TEACHERS TABLE', 'condition', 1, 'Good, Bad', 23),
(112, 'SWITCH', 'condition', 1, 'Good, Bad', 23),
(113, 'LIGHTS', 'quantity', 6, NULL, 24),
(114, 'ORBIT FAN', 'quantity', 4, NULL, 24),
(115, 'TV', 'condition', 1, 'Good, Bad', 24),
(116, 'OUTLET', 'condition', 1, 'Good, Bad', 24),
(117, 'BLACK/WHITE BOARD', 'condition', 1, 'Good, Bad', 24),
(118, 'CHAIRS', 'quantity', 50, NULL, 24),
(119, 'TEACHERS TABLE', 'condition', 1, 'Good, Bad', 24),
(120, 'SWITCH', 'condition', 1, 'Good, Bad', 24),
(121, 'LIGHTS', 'quantity', 6, NULL, 25),
(122, 'ORBIT FAN', 'quantity', 4, NULL, 25),
(123, 'TV', 'condition', 1, 'Good, Bad', 25),
(124, 'OUTLET', 'condition', 1, 'Good, Bad', 25),
(125, 'BLACK/WHITE BOARD', 'condition', 1, 'Good, Bad', 25),
(126, 'CHAIRS', 'quantity', 50, NULL, 25),
(127, 'TEACHERS TABLE', 'condition', 1, 'Good, Bad', 25),
(128, 'SWITCH', 'condition', 1, 'Good, Bad', 25),
(129, 'LIGHTS', 'quantity', 6, NULL, 26),
(130, 'ORBIT FAN', 'quantity', 4, NULL, 26),
(131, 'TV', 'condition', 1, 'Good, Bad', 26),
(132, 'OUTLET', 'condition', 1, 'Good, Bad', 26),
(133, 'BLACK/WHITE BOARD', 'condition', 1, 'Good, Bad', 26),
(134, 'CHAIRS', 'quantity', 50, NULL, 26),
(135, 'TEACHERS TABLE', 'condition', 1, 'Good, Bad', 26),
(136, 'SWITCH', 'condition', 1, 'Good, Bad', 26),
(137, 'LIGHTS', 'quantity', 6, NULL, 27),
(138, 'ORBIT FAN', 'quantity', 4, NULL, 27),
(139, 'TV', 'condition', 1, 'Good, Bad', 27),
(140, 'OUTLET', 'condition', 1, 'Good, Bad', 27),
(141, 'BLACK/WHITE BOARD', 'condition', 1, 'Good, Bad', 27),
(142, 'CHAIRS', 'quantity', 50, NULL, 27),
(143, 'TEACHERS TABLE', 'condition', 1, 'Good, Bad', 27),
(144, 'SWITCH', 'condition', 1, 'Good, Bad', 27),
(145, 'LIGHTS', 'quantity', 6, NULL, 28),
(146, 'ORBIT FAN', 'quantity', 4, NULL, 28),
(147, 'TV', 'condition', 1, 'Good, Bad', 28),
(148, 'OUTLET', 'quantity', 2, NULL, 28),
(149, 'BLACK/WHITE BOARD', 'condition', 1, 'Good, Bad', 28),
(150, 'CHAIRS', 'quantity', 50, NULL, 28),
(151, 'TEACHERS TABLE', 'condition', 1, 'Good, Bad', 28),
(152, 'SWITCH', 'condition', 1, 'Good, Bad', 28),
(153, 'LIGHTS', 'quantity', 6, NULL, 29),
(154, 'ORBIT FAN', 'quantity', 4, NULL, 29),
(155, 'TV', 'condition', 1, 'Good, Bad', 29),
(156, 'OUTLET', 'condition', 1, 'Good, Bad', 29),
(157, 'BLACK/WHITE BOARD', 'condition', 1, 'Good, Bad', 29),
(158, 'CHAIRS', 'quantity', 50, NULL, 29),
(159, 'TEACHERS TABLE', 'condition', 1, 'Good, Bad', 29),
(160, 'SWITCH', 'condition', 1, 'Good, Bad', 29),
(161, 'LIGHTS', 'quantity', 8, NULL, 30),
(162, 'ORBIT FAN', 'quantity', 6, NULL, 30),
(163, 'TV', 'condition', 1, 'Good, Bad', 30),
(164, 'OUTLET', 'condition', 1, 'Good, Bad', 30),
(165, 'BLACK/WHITE BOARD', 'condition', 1, 'Good, Bad', 30),
(166, 'CHAIRS', 'quantity', 50, NULL, 30),
(167, 'TEACHERS TABLE', 'condition', 1, 'Good, Bad', 30),
(168, 'SWITCH', 'condition', 1, 'Good, Bad', 30),
(169, 'LIGHTS', 'quantity', 10, NULL, 31),
(170, 'ORBIT FAN', 'quantity', 4, NULL, 31),
(171, 'TV', 'condition', 1, 'Good, Bad', 31),
(172, 'OUTLET', 'condition', 1, 'Good, Bad', 31),
(173, 'BLACK/WHITE BOARD', 'condition', 1, 'Good, Bad', 31),
(174, 'CHAIRS', 'quantity', 50, NULL, 31),
(175, 'TEACHERS TABLE', 'condition', 1, 'Good, Bad', 31),
(176, 'SWITCH', 'condition', 1, 'Good, Bad', 31),
(177, 'LIGHTS', 'quantity', 8, NULL, 32),
(178, 'OUTLET', 'quantity', 8, NULL, 32),
(179, 'BLACK/WHITE BOARD', 'condition', 1, 'Good, Bad', 32),
(180, 'CHAIRS', 'quantity', 50, NULL, 32),
(181, 'SWITCH', 'condition', 1, 'Good, Bad', 32),
(182, 'LIGHTS', 'quantity', 8, NULL, 33),
(183, 'OUTLET', 'quantity', 8, NULL, 33),
(184, 'BLACK/WHITE BOARD', 'condition', 1, 'Good, Bad', 33),
(185, 'CHAIRS', 'quantity', 50, NULL, 33),
(186, 'SWITCH', 'condition', 1, 'Good, Bad', 33),
(187, 'LIGHTS', 'quantity', 6, NULL, 34),
(188, 'ORBIT FAN', 'quantity', 4, NULL, 34),
(189, 'TV', 'condition', 1, 'Good, Bad', 34),
(190, 'OUTLET', 'condition', 1, 'Good, Bad', 34),
(191, 'BLACK/WHITE BOARD', 'condition', 1, 'Good, Bad', 34),
(192, 'CHAIRS', 'quantity', 50, NULL, 34),
(193, 'TEACHERS TABLE', 'condition', 1, 'Good, Bad', 34),
(194, 'SWITCH', 'condition', 1, 'Good, Bad', 34),
(195, 'LIGHTS', 'quantity', 6, NULL, 35),
(196, 'ORBIT FAN', 'quantity', 4, NULL, 35),
(197, 'TV', 'condition', 1, 'Good, Bad', 35),
(198, 'OUTLET', 'condition', 1, 'Good, Bad', 35),
(199, 'BLACK/WHITE BOARD', 'condition', 1, 'Good, Bad', 35),
(200, 'CHAIRS', 'quantity', 50, NULL, 35),
(201, 'TEACHERS TABLE', 'condition', 1, 'Good, Bad', 35),
(202, 'SWITCH', 'condition', 1, 'Good, Bad', 35),
(203, 'LIGHTS', 'quantity', 6, NULL, 36),
(204, 'ORBIT FAN', 'quantity', 4, NULL, 36),
(205, 'TV', 'condition', 1, 'Good, Bad', 36),
(206, 'OUTLET', 'condition', 1, 'Good, Bad', 36),
(207, 'BLACK/WHITE BOARD', 'condition', 1, 'Good, Bad', 36),
(208, 'CHAIRS', 'quantity', 50, NULL, 36),
(209, 'TEACHERS TABLE', 'condition', 1, 'Good, Bad', 36),
(210, 'SWITCH', 'condition', 1, 'Good, Bad', 36),
(211, 'LIGHTS', 'quantity', 6, NULL, 37),
(212, 'ORBIT FAN', 'quantity', 4, NULL, 37),
(213, 'TV', 'condition', 1, 'Good, Bad', 37),
(214, 'OUTLET', 'condition', 1, 'Good, Bad', 37),
(215, 'BLACK/WHITE BOARD', 'condition', 1, 'Good, Bad', 37),
(216, 'CHAIRS', 'quantity', 50, NULL, 37),
(217, 'TEACHERS TABLE', 'condition', 1, 'Good, Bad', 37),
(218, 'SWITCH', 'condition', 1, 'Good, Bad', 37),
(219, 'LIGHTS', 'quantity', 6, NULL, 38),
(220, 'ORBIT FAN', 'quantity', 4, NULL, 38),
(221, 'TV', 'condition', 1, 'Good, Bad', 38),
(222, 'OUTLET', 'condition', 1, 'Good, Bad', 38),
(223, 'BLACK/WHITE BOARD', 'condition', 1, 'Good, Bad', 38),
(224, 'CHAIRS', 'quantity', 50, NULL, 38),
(225, 'TEACHERS TABLE', 'condition', 1, 'Good, Bad', 38),
(226, 'SWITCH', 'condition', 1, 'Good, Bad', 38),
(227, 'LIGHTS', 'quantity', 6, NULL, 39),
(228, 'ORBIT FAN', 'quantity', 4, NULL, 39),
(229, 'TV', 'condition', 1, 'Good, Bad', 39),
(230, 'OUTLET', 'condition', 1, 'Good, Bad', 39),
(231, 'BLACK/WHITE BOARD', 'condition', 1, 'Good, Bad', 39),
(232, 'CHAIRS', 'quantity', 50, NULL, 39),
(233, 'TEACHERS TABLE', 'condition', 1, 'Good, Bad', 39),
(234, 'SWITCH', 'condition', 1, 'Good, Bad', 39),
(235, 'LIGHTS', 'quantity', 6, NULL, 40),
(236, 'ORBIT FAN', 'quantity', 4, NULL, 40),
(237, 'TV', 'condition', 1, 'Good, Bad', 40),
(238, 'OUTLET', 'condition', 1, 'Good, Bad', 40),
(239, 'BLACK/WHITE BOARD', 'condition', 1, 'Good, Bad', 40),
(240, 'CHAIRS', 'quantity', 50, NULL, 40),
(241, 'TEACHERS TABLE', 'condition', 1, 'Good, Bad', 40),
(242, 'SWITCH', 'condition', 1, 'Good, Bad', 40),
(243, 'LIGHTS', 'quantity', 6, NULL, 41),
(244, 'ORBIT FAN', 'quantity', 4, NULL, 41),
(245, 'TV', 'condition', 1, 'Good, Bad', 41),
(246, 'OUTLET', 'condition', 1, 'Good, Bad', 41),
(247, 'BLACK/WHITE BOARD', 'condition', 1, 'Good, Bad', 41),
(248, 'CHAIRS', 'quantity', 50, NULL, 41),
(249, 'TEACHERS TABLE', 'condition', 1, 'Good, Bad', 41),
(250, 'SWITCH', 'condition', 1, 'Good, Bad', 41),
(251, 'LIGHTS', 'quantity', 6, NULL, 42),
(252, 'ORBIT FAN', 'quantity', 4, NULL, 42),
(253, 'TV', 'condition', 1, 'Good, Bad', 42),
(254, 'OUTLET', 'condition', 1, 'Good, Bad', 42),
(255, 'BLACK/WHITE BOARD', 'condition', 1, 'Good, Bad', 42),
(256, 'CHAIRS', 'quantity', 50, NULL, 42),
(257, 'TEACHERS TABLE', 'condition', 1, 'Good, Bad', 42),
(258, 'SWITCH', 'condition', 1, 'Good, Bad', 42),
(259, 'LIGHTS', 'quantity', 6, NULL, 43),
(260, 'ORBIT FAN', 'quantity', 4, NULL, 43),
(261, 'TV', 'condition', 1, 'Good, Bad', 43),
(262, 'OUTLET', 'condition', 1, 'Good, Bad', 43),
(263, 'BLACK/WHITE BOARD', 'condition', 1, 'Good, Bad', 43),
(264, 'CHAIRS', 'quantity', 50, NULL, 43),
(265, 'TEACHERS TABLE', 'condition', 1, 'Good, Bad', 43),
(266, 'SWITCH', 'condition', 1, 'Good, Bad', 43),
(267, 'LIGHTS', 'quantity', 6, NULL, 44),
(268, 'ORBIT FAN', 'quantity', 4, NULL, 44),
(269, 'TV', 'condition', 1, 'Good, Bad', 44),
(270, 'OUTLET', 'condition', 1, 'Good, Bad', 44),
(271, 'BLACK/WHITE BOARD', 'condition', 1, 'Good, Bad', 44),
(272, 'CHAIRS', 'quantity', 50, NULL, 44),
(273, 'TEACHERS TABLE', 'condition', 1, 'Good, Bad', 44),
(274, 'SWITCH', 'condition', 1, 'Good, Bad', 44),
(275, 'LIGHTS', 'quantity', 6, NULL, 45),
(276, 'ORBIT FAN', 'quantity', 4, NULL, 45),
(277, 'TV', 'condition', 1, 'Good, Bad', 45),
(278, 'OUTLET', 'condition', 1, 'Good, Bad', 45),
(279, 'BLACK/WHITE BOARD', 'condition', 1, 'Good, Bad', 45),
(280, 'CHAIRS', 'quantity', 50, NULL, 45),
(281, 'TEACHERS TABLE', 'condition', 1, 'Good, Bad', 45),
(282, 'SWITCH', 'condition', 1, 'Good, Bad', 45),
(283, 'LIGHTS', 'quantity', 6, NULL, 46),
(284, 'ORBIT FAN', 'quantity', 4, NULL, 46),
(285, 'TV', 'condition', 1, 'Good, Bad', 46),
(286, 'OUTLET', 'condition', 1, 'Good, Bad', 46),
(287, 'BLACK/WHITE BOARD', 'condition', 1, 'Good, Bad', 46),
(288, 'CHAIRS', 'quantity', 50, NULL, 46),
(289, 'TEACHERS TABLE', 'condition', 1, 'Good, Bad', 46),
(290, 'SWITCH', 'condition', 1, 'Good, Bad', 46),
(291, 'LIGHTS', 'quantity', 6, NULL, 47),
(292, 'ORBIT FAN', 'quantity', 4, NULL, 47),
(293, 'TV', 'condition', 1, 'Good, Bad', 47),
(294, 'OUTLET', 'condition', 1, 'Good, Bad', 47),
(295, 'BLACK/WHITE BOARD', 'condition', 1, 'Good, Bad', 47),
(296, 'CHAIRS', 'quantity', 50, NULL, 47),
(297, 'TEACHERS TABLE', 'condition', 1, 'Good, Bad', 47),
(298, 'SWITCH', 'condition', 1, 'Good, Bad', 47),
(299, 'LIGHTS', 'quantity', 6, NULL, 48),
(300, 'ORBIT FAN', 'quantity', 4, NULL, 48),
(301, 'TV', 'condition', 1, 'Good, Bad', 48),
(302, 'OUTLET', 'condition', 1, 'Good, Bad', 48),
(303, 'BLACK/WHITE BOARD', 'condition', 1, 'Good, Bad', 48),
(304, 'CHAIRS', 'quantity', 50, NULL, 48),
(305, 'TEACHERS TABLE', 'condition', 1, 'Good, Bad', 48),
(306, 'SWITCH', 'condition', 1, 'Good, Bad', 48),
(307, 'LIGHTS', 'quantity', 12, NULL, 49),
(308, 'ORBIT FAN', 'quantity', 8, NULL, 49),
(309, 'OUTLET', 'condition', 1, 'Good, Bad', 49),
(310, 'BLACK/WHITE BOARD', 'condition', 1, 'Good, Bad', 49),
(311, 'CHAIRS', 'quantity', 50, NULL, 49),
(312, 'TEACHERS TABLE', 'condition', 1, 'Good, Bad', 49),
(313, 'SWITCH', 'condition', 1, 'Good, Bad', 49),
(314, 'LIGHTS', 'quantity', 12, NULL, 50),
(315, 'ORBIT FAN', 'quantity', 8, NULL, 50),
(316, 'OUTLET', 'condition', 1, 'Good, Bad', 50),
(317, 'BLACK/WHITE BOARD', 'condition', 1, 'Good, Bad', 50),
(318, 'CHAIRS', 'quantity', 50, NULL, 50),
(319, 'TEACHERS TABLE', 'condition', 1, 'Good, Bad', 50),
(320, 'SWITCH', 'condition', 1, 'Good, Bad', 50),
(321, 'LIGHTS', 'quantity', 12, NULL, 51),
(322, 'ORBIT FAN', 'quantity', 4, NULL, 51),
(323, 'TV', 'condition', 1, 'Good, Bad', 51),
(324, 'OUTLET', 'condition', 1, 'Good, Bad', 51),
(325, 'BLACK/WHITE BOARD', 'condition', 1, 'Good, Bad', 51),
(326, 'CHAIRS', 'quantity', 54, NULL, 51),
(327, 'TEACHERS TABLE', 'condition', 1, 'Good, Bad', 51),
(328, 'SWITCH', 'quantity', 2, NULL, 51),
(329, 'LIGHTS', 'quantity', 8, NULL, 52),
(330, 'ORBIT FAN', 'quantity', 8, NULL, 52),
(331, 'OUTLET', 'quantity', 4, NULL, 52),
(332, 'BLACK/WHITE BOARD', 'condition', 1, 'Good, Bad', 52),
(333, 'CHAIRS', 'quantity', 50, NULL, 52),
(334, 'TEACHERS TABLE', 'condition', 1, 'Good, Bad', 52),
(335, 'SWITCH', 'condition', 1, 'Good, Bad', 52),
(336, 'LIGHTS', 'quantity', 8, NULL, 53),
(337, 'ORBIT FAN', 'quantity', 4, NULL, 53),
(338, 'OUTLET', 'quantity', 4, NULL, 53),
(339, 'BLACK/WHITE BOARD', 'condition', 1, 'Good, Bad', 53),
(340, 'CHAIRS', 'quantity', 50, NULL, 53),
(341, 'TEACHERS TABLE', 'condition', 1, 'Good, Bad', 53),
(342, 'SWITCH', 'condition', 1, 'Good, Bad', 53),
(343, 'LIGHTS', 'quantity', 12, NULL, 54),
(344, 'ORBIT FAN', 'quantity', 4, NULL, 54),
(345, 'OUTLET', 'condition', 1, 'Good, Bad', 54),
(346, 'BLACK/WHITE BOARD', 'condition', 1, 'Good, Bad', 54),
(347, 'CHAIRS', 'quantity', 50, NULL, 54),
(348, 'TEACHERS TABLE', 'condition', 1, 'Good, Bad', 54),
(349, 'SWITCH', 'condition', 1, 'Good, Bad', 54),
(350, 'LIGHTS', 'quantity', 8, NULL, 55),
(351, 'ORBIT FAN', 'quantity', 4, NULL, 55),
(352, 'TV', 'condition', 1, 'Good, Bad', 55),
(353, 'OUTLET', 'condition', 1, 'Good, Bad', 55),
(354, 'BLACK/WHITE BOARD', 'condition', 1, 'Good, Bad', 55),
(355, 'CHAIRS', 'quantity', 50, NULL, 55),
(356, 'TEACHERS TABLE', 'condition', 1, 'Good, Bad', 55),
(357, 'SWITCH', 'condition', 1, 'Good, Bad', 55),
(358, 'LIGHTS', 'quantity', 8, NULL, 56),
(359, 'ORBIT FAN', 'quantity', 4, NULL, 56),
(360, 'TV', 'condition', 1, 'Good, Bad', 56),
(361, 'OUTLET', 'condition', 1, 'Good, Bad', 56),
(362, 'BLACK/WHITE BOARD', 'condition', 1, 'Good, Bad', 56),
(363, 'CHAIRS', 'quantity', 50, NULL, 56),
(364, 'TEACHERS TABLE', 'condition', 1, 'Good, Bad', 56),
(365, 'SWITCH', 'condition', 1, 'Good, Bad', 56),
(366, 'LIGHTS', 'quantity', 8, NULL, 57),
(367, 'ORBIT FAN', 'quantity', 4, NULL, 57),
(368, 'TV', 'condition', 1, 'Good, Bad', 57),
(369, 'OUTLET', 'condition', 1, 'Good, Bad', 57),
(370, 'BLACK/WHITE BOARD', 'condition', 1, 'Good, Bad', 57),
(371, 'CHAIRS', 'quantity', 50, NULL, 57),
(372, 'TEACHERS TABLE', 'condition', 1, 'Good, Bad', 57),
(373, 'SWITCH', 'condition', 1, 'Good, Bad', 57),
(374, 'LIGHTS', 'quantity', 8, NULL, 58),
(375, 'ORBIT FAN', 'quantity', 4, NULL, 58),
(376, 'TV', 'condition', 1, 'Good, Bad', 58),
(377, 'OUTLET', 'condition', 1, 'Good, Bad', 58),
(378, 'BLACK/WHITE BOARD', 'condition', 1, 'Good, Bad', 58),
(379, 'CHAIRS', 'quantity', 50, NULL, 58),
(380, 'TEACHERS TABLE', 'condition', 1, 'Good, Bad', 58),
(381, 'SWITCH', 'condition', 1, 'Good, Bad', 58),
(382, 'LIGHTS', 'quantity', 8, NULL, 59),
(383, 'ORBIT FAN', 'quantity', 4, NULL, 59),
(384, 'TV', 'condition', 1, 'Good, Bad', 59),
(385, 'OUTLET', 'condition', 1, 'Good, Bad', 59),
(386, 'BLACK/WHITE BOARD', 'condition', 1, 'Good, Bad', 59),
(387, 'CHAIRS', 'quantity', 50, NULL, 59),
(388, 'TEACHERS TABLE', 'condition', 1, 'Good, Bad', 59),
(389, 'SWITCH', 'condition', 1, 'Good, Bad', 59),
(390, 'LIGHTS', 'quantity', 6, NULL, 60),
(391, 'ORBIT FAN', 'quantity', 4, NULL, 60),
(392, 'TV', 'condition', 1, 'Good, Bad', 60),
(393, 'OUTLET', 'condition', 1, 'Good, Bad', 60),
(394, 'BLACK/WHITE BOARD', 'condition', 1, 'Good, Bad', 60),
(395, 'CHAIRS', 'quantity', 50, NULL, 60),
(396, 'TEACHERS TABLE', 'condition', 1, 'Good, Bad', 60),
(397, 'SWITCH', 'condition', 1, 'Good, Bad', 60),
(398, 'LIGHTS', 'quantity', 6, NULL, 61),
(399, 'ORBIT FAN', 'quantity', 4, NULL, 61),
(400, 'TV', 'condition', 1, 'Good, Bad', 61),
(401, 'OUTLET', 'condition', 1, 'Good, Bad', 61),
(402, 'BLACK/WHITE BOARD', 'condition', 1, 'Good, Bad', 61),
(403, 'CHAIRS', 'quantity', 50, NULL, 61),
(404, 'TEACHERS TABLE', 'condition', 1, 'Good, Bad', 61),
(405, 'SWITCH', 'condition', 1, 'Good, Bad', 61),
(406, 'LIGHTS', 'quantity', 6, NULL, 62),
(407, 'ORBIT FAN', 'quantity', 4, NULL, 62),
(408, 'TV', 'condition', 1, 'Good, Bad', 62),
(409, 'OUTLET', 'condition', 1, 'Good, Bad', 62),
(410, 'BLACK/WHITE BOARD', 'condition', 1, 'Good, Bad', 62),
(411, 'CHAIRS', 'quantity', 50, NULL, 62),
(412, 'TEACHERS TABLE', 'condition', 1, 'Good, Bad', 62),
(413, 'SWITCH', 'condition', 1, 'Good, Bad', 62),
(414, 'LIGHTS', 'quantity', 6, NULL, 63),
(415, 'ORBIT FAN', 'quantity', 4, NULL, 63),
(416, 'TV', 'condition', 1, 'Good, Bad', 63),
(417, 'OUTLET', 'condition', 1, 'Good, Bad', 63),
(418, 'BLACK/WHITE BOARD', 'condition', 1, 'Good, Bad', 63),
(419, 'CHAIRS', 'quantity', 50, NULL, 63),
(420, 'TEACHERS TABLE', 'condition', 1, 'Good, Bad', 63),
(421, 'SWITCH', 'condition', 1, 'Good, Bad', 63),
(422, 'LIGHTS', 'quantity', 6, NULL, 64),
(423, 'ORBIT FAN', 'quantity', 4, NULL, 64),
(424, 'TV', 'condition', 1, 'Good, Bad', 64),
(425, 'OUTLET', 'condition', 1, 'Good, Bad', 64),
(426, 'BLACK/WHITE BOARD', 'condition', 1, 'Good, Bad', 64),
(427, 'CHAIRS', 'quantity', 50, NULL, 64),
(428, 'TEACHERS TABLE', 'condition', 1, 'Good, Bad', 64),
(429, 'SWITCH', 'condition', 1, 'Good, Bad', 64),
(430, 'LIGHTS', 'quantity', 12, NULL, 65),
(431, 'ORBIT FAN', 'quantity', 4, NULL, 65),
(432, 'OUTLET', 'condition', 1, 'Good, Bad', 65),
(433, 'BLACK/WHITE BOARD', 'condition', 1, 'Good, Bad', 65),
(434, 'CHAIRS', 'quantity', 50, NULL, 65),
(435, 'TEACHERS TABLE', 'condition', 1, 'Good, Bad', 65),
(436, 'SWITCH', 'condition', 1, 'Good, Bad', 65);

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
  ADD KEY `fk_operation_checklist` (`operation_checklist_id`),
  ADD KEY `fk_operation_assigned` (`operation_assigned_id`);

--
-- Indexes for table `tblassignedrooms`
--
ALTER TABLE `tblassignedrooms`
  ADD PRIMARY KEY (`assigned_rooms_id`),
  ADD KEY `fk_assignedrooms_assigned` (`assigned_assigned_id`),
  ADD KEY `fk_assignedrooms_room` (`assigned_room_id`),
  ADD KEY `fk_assignedrooms_user` (`assigned_created_by`);

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
  MODIFY `assigned_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `tblassignedoperation`
--
ALTER TABLE `tblassignedoperation`
  MODIFY `operation_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `tblassignedrooms`
--
ALTER TABLE `tblassignedrooms`
  MODIFY `assigned_rooms_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `tblassignedstatus`
--
ALTER TABLE `tblassignedstatus`
  MODIFY `assigned_status_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `tblbuilding`
--
ALTER TABLE `tblbuilding`
  MODIFY `building_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `tblbuildingfloor`
--
ALTER TABLE `tblbuildingfloor`
  MODIFY `floorbuilding_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT for table `tblfloor`
--
ALTER TABLE `tblfloor`
  MODIFY `floor_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT for table `tblrole`
--
ALTER TABLE `tblrole`
  MODIFY `role_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `tblroom`
--
ALTER TABLE `tblroom`
  MODIFY `room_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=66;

--
-- AUTO_INCREMENT for table `tblroomchecklist`
--
ALTER TABLE `tblroomchecklist`
  MODIFY `checklist_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=437;

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
  ADD CONSTRAINT `fk_operation_assigned` FOREIGN KEY (`operation_assigned_id`) REFERENCES `tblassigned` (`assigned_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_operation_checklist` FOREIGN KEY (`operation_checklist_id`) REFERENCES `tblroomchecklist` (`checklist_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_operation_room` FOREIGN KEY (`operation_room_id`) REFERENCES `tblroom` (`room_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_operation_updated_by` FOREIGN KEY (`operation_updated_by`) REFERENCES `tbluser` (`user_id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `tblassignedrooms`
--
ALTER TABLE `tblassignedrooms`
  ADD CONSTRAINT `fk_assignedrooms_assigned` FOREIGN KEY (`assigned_assigned_id`) REFERENCES `tblassigned` (`assigned_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_assignedrooms_room` FOREIGN KEY (`assigned_room_id`) REFERENCES `tblroom` (`room_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_assignedrooms_user` FOREIGN KEY (`assigned_created_by`) REFERENCES `tbluser` (`user_id`) ON UPDATE CASCADE;

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
