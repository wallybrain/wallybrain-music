ALTER TABLE `collections` ADD COLUMN `sort_order` integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
UPDATE `collections` SET `sort_order` = (
  SELECT COUNT(*) FROM `collections` c2 WHERE c2.`created_at` < `collections`.`created_at`
);
