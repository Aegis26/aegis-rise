CREATE TABLE "news_article_cache" (
	"cache_key" text PRIMARY KEY NOT NULL,
	"articles" jsonb NOT NULL,
	"fetched_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "members" ADD COLUMN "news_interests" text[] DEFAULT ARRAY[]::text[] NOT NULL;--> statement-breakpoint
CREATE INDEX "news_article_cache_fetched_at_idx" ON "news_article_cache" USING btree ("fetched_at");