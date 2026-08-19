CREATE TYPE "public"."member_role" AS ENUM('member', 'admin');--> statement-breakpoint
CREATE TYPE "public"."member_status" AS ENUM('pending', 'active', 'banned');--> statement-breakpoint
CREATE TYPE "public"."share_platform" AS ENUM('LinkedIn', 'Instagram', 'Facebook', 'TikTok', 'Direct Link');--> statement-breakpoint
CREATE TYPE "public"."theme_preference" AS ENUM('light', 'dark');--> statement-breakpoint
CREATE TABLE "chapter_configs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"chapter_name" text NOT NULL,
	"chapter_logo_url" text,
	"primary_color" text NOT NULL,
	"secondary_color" text NOT NULL,
	"chapter_description" text,
	CONSTRAINT "chapter_configs_chapter_name_unique" UNIQUE("chapter_name")
);
--> statement-breakpoint
CREATE TABLE "members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"name" text NOT NULL,
	"title" text NOT NULL,
	"company" text NOT NULL,
	"chapter" text NOT NULL,
	"bio" text,
	"profile_picture_url" text,
	"theme_preference" "theme_preference" DEFAULT 'dark' NOT NULL,
	"primary_color" text DEFAULT '#007BFF' NOT NULL,
	"role" "member_role" DEFAULT 'member' NOT NULL,
	"status" "member_status" DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "members_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "posts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"author_id" uuid NOT NULL,
	"caption" text NOT NULL,
	"image_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shares" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"post_id" uuid NOT NULL,
	"shared_by_id" uuid NOT NULL,
	"platform" "share_platform" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "posts" ADD CONSTRAINT "posts_author_id_members_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shares" ADD CONSTRAINT "shares_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shares" ADD CONSTRAINT "shares_shared_by_id_members_id_fk" FOREIGN KEY ("shared_by_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;