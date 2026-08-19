CREATE INDEX "shares_post_id_idx" ON "shares" USING btree ("post_id");--> statement-breakpoint
CREATE INDEX "shares_shared_by_id_idx" ON "shares" USING btree ("shared_by_id");