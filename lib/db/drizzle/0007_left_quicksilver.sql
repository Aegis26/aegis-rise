CREATE TYPE "public"."social_platform" AS ENUM('facebook', 'linkedin', 'instagram');--> statement-breakpoint
CREATE TABLE "social_accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"member_id" uuid NOT NULL,
	"platform" "social_platform" NOT NULL,
	"access_token" text NOT NULL,
	"refresh_token" text,
	"external_user_id" text NOT NULL,
	"connected_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "social_oauth_states" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"state_hash" text NOT NULL,
	"member_id" uuid NOT NULL,
	"platform" "social_platform" NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"consumed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "social_oauth_states_state_hash_unique" UNIQUE("state_hash")
);
--> statement-breakpoint
ALTER TABLE "members" ADD COLUMN "auto_post_shares" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "members" ADD COLUMN "preferred_post_platforms" "social_platform"[] DEFAULT ARRAY[]::social_platform[] NOT NULL;--> statement-breakpoint
ALTER TABLE "social_accounts" ADD CONSTRAINT "social_accounts_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "social_oauth_states" ADD CONSTRAINT "social_oauth_states_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "social_accounts_member_platform_idx" ON "social_accounts" USING btree ("member_id","platform");--> statement-breakpoint
CREATE INDEX "social_accounts_member_active_idx" ON "social_accounts" USING btree ("member_id","is_active");--> statement-breakpoint
CREATE INDEX "social_oauth_states_expiry_idx" ON "social_oauth_states" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "social_oauth_states_member_idx" ON "social_oauth_states" USING btree ("member_id");