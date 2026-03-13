-- Migration: Revert checklists from per-floor back to per-room
-- Date: 2026-03-12

-- Step 1: Add back checklist_room_id column
ALTER TABLE `tblroomchecklist` 
ADD COLUMN `checklist_room_id` int(11) NULL AFTER `checklist_options`;

-- Step 2: Migrate data - map floorbuilding_id back to room_id
-- For each floor, assign checklists to the first room of that floor
-- Note: This is a simplification; you may need to manually adjust room assignments
UPDATE `tblroomchecklist` c
JOIN `tblroom` r ON r.room_building_floor_id = c.checklist_floorbuilding_id
SET c.checklist_room_id = r.room_id
WHERE c.checklist_room_id IS NULL;

-- Step 3: Add foreign key for room
ALTER TABLE `tblroomchecklist` 
ADD KEY `fk_checklist_room` (`checklist_room_id`),
ADD CONSTRAINT `fk_checklist_room` FOREIGN KEY (`checklist_room_id`) 
  REFERENCES `tblroom` (`room_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- Step 4: Drop floor-based columns (optional - keep for rollback safety)
-- Uncomment if you want to completely remove floor-based columns:
-- ALTER TABLE `tblroomchecklist` 
-- DROP FOREIGN KEY `fk_checklist_floorbuilding`,
-- DROP INDEX `fk_checklist_floorbuilding`,
-- DROP COLUMN `checklist_floorbuilding_id`;

-- Note: The checklist_type, checklist_quantity, and checklist_options columns are kept
-- as they provide useful functionality for different checklist item types.
