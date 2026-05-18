CREATE TABLE `listings` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`description` text NOT NULL,
	`price` text,
	`poster_name` text NOT NULL,
	`contact_info` text NOT NULL,
	`photo_key` text,
	`edit_token` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL CHECK (status IN ('active','taken','deleted')),
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`taken_at` integer,
	`deleted_at` integer
);
