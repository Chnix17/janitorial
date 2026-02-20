-- Migration: Add operation_assigned_id column to tblassignedoperation
-- This links each operation to a specific assignment

ALTER TABLE `tblassignedoperation`
  ADD COLUMN `operation_assigned_id` int(11) DEFAULT NULL AFTER `operation_id`,
  ADD KEY `fk_operation_assigned` (`operation_assigned_id`);

-- Add foreign key constraint
ALTER TABLE `tblassignedoperation`
  ADD CONSTRAINT `fk_operation_assigned` 
  FOREIGN KEY (`operation_assigned_id`) 
  REFERENCES `tblassigned` (`assigned_id`) 
  ON DELETE SET NULL 
  ON UPDATE CASCADE;
