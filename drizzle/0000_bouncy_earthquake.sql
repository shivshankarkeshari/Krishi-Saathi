CREATE TABLE `assistance` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace` text NOT NULL,
	`case_id` text NOT NULL,
	`revision` integer NOT NULL,
	`stage` text NOT NULL,
	`provider` text NOT NULL,
	`result` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `callbacks` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace` text NOT NULL,
	`name` text NOT NULL,
	`phone` text NOT NULL,
	`village` text NOT NULL,
	`note` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `cases` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace` text NOT NULL,
	`reference` text NOT NULL,
	`data` text NOT NULL,
	`revision` integer DEFAULT 1 NOT NULL,
	`created_at` text NOT NULL,
	`request_key` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `cases_request` ON `cases` (`workspace`,`request_key`);--> statement-breakpoint
CREATE TABLE `documents` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace` text NOT NULL,
	`case_id` text NOT NULL,
	`name` text NOT NULL,
	`object_key` text NOT NULL,
	`content_type` text NOT NULL,
	`size` integer NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `events` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace` text NOT NULL,
	`case_id` text NOT NULL,
	`revision` integer NOT NULL,
	`kind` text NOT NULL,
	`actor` text NOT NULL,
	`note` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `events_revision` ON `events` (`case_id`,`revision`);--> statement-breakpoint
CREATE TABLE `workspaces` (
	`id` text PRIMARY KEY NOT NULL,
	`role` text DEFAULT 'coordinator' NOT NULL,
	`created_at` text NOT NULL
);
