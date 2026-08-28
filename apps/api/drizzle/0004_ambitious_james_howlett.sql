CREATE TABLE "fbr_submissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"invoice_id" uuid NOT NULL,
	"invoice_number" varchar(50),
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"environment" varchar(20) DEFAULT 'sandbox' NOT NULL,
	"request_body" text,
	"fbr_number" varchar(40),
	"error_message" text,
	"response_body" text,
	"submitted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "fbr_number" varchar(40);--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "fbr_status" varchar(20);--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "fbr_submitted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "fbr_sandbox_token" text;--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "fbr_production_token" text;--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "fbr_province" varchar(30);--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "fbr_buyer_defaults" varchar(60);--> statement-breakpoint
ALTER TABLE "fbr_submissions" ADD CONSTRAINT "fbr_submissions_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fbr_submissions" ADD CONSTRAINT "fbr_submissions_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE cascade ON UPDATE no action;