ALTER TABLE "settings" ADD COLUMN "watermark_mode" varchar(10) DEFAULT 'text' NOT NULL;--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "watermark_text" varchar(40) DEFAULT 'DRAFT' NOT NULL;