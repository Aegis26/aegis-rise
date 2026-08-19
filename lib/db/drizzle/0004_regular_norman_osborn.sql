CREATE TYPE "public"."mod_action_type" AS ENUM('delete_post', 'feature_post', 'unfeature_post', 'approve_member', 'deny_member', 'ban_member', 'update_settings', 'update_guidelines');--> statement-breakpoint
CREATE TYPE "public"."mod_target_type" AS ENUM('post', 'member', 'chapter');--> statement-breakpoint
ALTER TYPE "public"."member_role" ADD VALUE 'super_admin';--> statement-breakpoint
CREATE TABLE "mod_actions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"admin_id" uuid,
	"admin_name" text NOT NULL,
	"action_type" "mod_action_type" NOT NULL,
	"target_type" "mod_target_type" NOT NULL,
	"target_id" uuid NOT NULL,
	"target_label" text NOT NULL,
	"chapter" text NOT NULL,
	"reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "chapter_configs" ADD COLUMN "guidelines_text" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "chapter_configs" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "members" ADD COLUMN "signup_source" text;--> statement-breakpoint
ALTER TABLE "members" ADD COLUMN "last_login_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "is_featured" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "featured_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "mod_actions" ADD CONSTRAINT "mod_actions_admin_id_members_id_fk" FOREIGN KEY ("admin_id") REFERENCES "public"."members"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "mod_actions_admin_id_idx" ON "mod_actions" USING btree ("admin_id");--> statement-breakpoint
CREATE INDEX "mod_actions_chapter_created_at_idx" ON "mod_actions" USING btree ("chapter","created_at");--> statement-breakpoint
CREATE INDEX "mod_actions_target_id_idx" ON "mod_actions" USING btree ("target_id");--> statement-breakpoint
CREATE INDEX "members_chapter_status_idx" ON "members" USING btree ("chapter","status");--> statement-breakpoint
CREATE INDEX "members_created_at_idx" ON "members" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "posts_author_id_idx" ON "posts" USING btree ("author_id");--> statement-breakpoint
CREATE INDEX "posts_featured_created_at_idx" ON "posts" USING btree ("is_featured","created_at");--> statement-breakpoint
CREATE INDEX "shares_created_at_idx" ON "shares" USING btree ("created_at");