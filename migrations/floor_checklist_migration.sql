-- Migration: Change checklists from per-room to per-floor
-- Date: 2026-02-19

-- Step 1: Add new floorbuilding_id column
ALTER TABLE `tblroomchecklist` 
ADD COLUMN `checklist_floorbuilding_id` int(11) NULL AFTER `checklist_room_id`;

-- Step 2: Migrate data - map room_id to floorbuilding_id
UPDATE `tblroomchecklist` c
JOIN `tblroom` r ON r.room_id = c.checklist_room_id
SET c.checklist_floorbuilding_id = r.room_building_floor_id;

-- Step 3: Add type columns for flexible items
ALTER TABLE `tblroomchecklist`
ADD COLUMN `checklist_type` enum('boolean','quantity','condition') DEFAULT 'boolean' AFTER `checklist_name`,
ADD COLUMN `checklist_quantity` int(11) DEFAULT NULL AFTER `checklist_type`,
ADD COLUMN `checklist_options` varchar(500) DEFAULT NULL AFTER `checklist_quantity`;

-- Step 4: Update foreign key - drop old FK, add new one
ALTER TABLE `tblroomchecklist` 
DROP FOREIGN KEY `fk_checklist_room`,
DROP INDEX `fk_checklist_room`,
DROP COLUMN `checklist_room_id`;

-- Step 5: Make floorbuilding_id required and add FK
ALTER TABLE `tblroomchecklist` 
MODIFY `checklist_floorbuilding_id` int(11) NOT NULL,
ADD KEY `fk_checklist_floorbuilding` (`checklist_floorbuilding_id`),
ADD CONSTRAINT `fk_checklist_floorbuilding` FOREIGN KEY (`checklist_floorbuilding_id`) 
  REFERENCES `tblbuildingfloor` (`floorbuilding_id`) ON DELETE CASCADE ON UPDATE CASCADE;
