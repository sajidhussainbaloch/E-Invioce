ALTER TABLE "products" ADD COLUMN "barcode" varchar(64);
--> statement-breakpoint
CREATE UNIQUE INDEX "products_business_barcode_unique" ON "products" USING btree ("business_id","barcode");