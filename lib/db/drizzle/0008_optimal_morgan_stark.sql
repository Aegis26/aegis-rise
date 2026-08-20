CREATE TABLE "post_images" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"post_id" uuid NOT NULL,
	"image_url" text NOT NULL,
	"position" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "social_accounts" ADD COLUMN "is_publishing_eligible" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "social_accounts" ADD COLUMN "publishing_error" text;--> statement-breakpoint
INSERT INTO "post_images" ("post_id", "image_url", "position")
SELECT "id", "image_url", 0
FROM "posts"
WHERE "image_url" IS NOT NULL;--> statement-breakpoint
UPDATE "social_accounts"
SET "is_publishing_eligible" = true
WHERE "platform" = 'linkedin';--> statement-breakpoint
UPDATE "social_accounts"
SET "publishing_error" = 'Reconnect this account to enable publishing.'
WHERE "platform" IN ('facebook', 'instagram');--> statement-breakpoint
ALTER TABLE "post_images" ADD CONSTRAINT "post_images_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "post_images_post_position_idx" ON "post_images" USING btree ("post_id","position");--> statement-breakpoint
CREATE INDEX "post_images_post_id_idx" ON "post_images" USING btree ("post_id");