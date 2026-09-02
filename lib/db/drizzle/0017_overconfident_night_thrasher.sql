CREATE TABLE "direct_conversations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"chapter" text NOT NULL,
	"participant_one_id" uuid,
	"participant_two_id" uuid,
	"last_message_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "direct_message_blocks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"blocker_id" uuid NOT NULL,
	"blocked_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "direct_message_presence" (
	"member_id" uuid PRIMARY KEY NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"typing_to_member_id" uuid,
	"typing_updated_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "direct_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversation_id" uuid NOT NULL,
	"sender_id" uuid,
	"recipient_id" uuid,
	"chapter" text NOT NULL,
	"client_message_id" uuid NOT NULL,
	"encrypted_body" text NOT NULL,
	"read_at" timestamp with time zone,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "direct_conversations" ADD CONSTRAINT "direct_conversations_participant_one_id_members_id_fk" FOREIGN KEY ("participant_one_id") REFERENCES "public"."members"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "direct_conversations" ADD CONSTRAINT "direct_conversations_participant_two_id_members_id_fk" FOREIGN KEY ("participant_two_id") REFERENCES "public"."members"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "direct_message_blocks" ADD CONSTRAINT "direct_message_blocks_blocker_id_members_id_fk" FOREIGN KEY ("blocker_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "direct_message_blocks" ADD CONSTRAINT "direct_message_blocks_blocked_id_members_id_fk" FOREIGN KEY ("blocked_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "direct_message_presence" ADD CONSTRAINT "direct_message_presence_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "direct_message_presence" ADD CONSTRAINT "direct_message_presence_typing_to_member_id_members_id_fk" FOREIGN KEY ("typing_to_member_id") REFERENCES "public"."members"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "direct_messages" ADD CONSTRAINT "direct_messages_conversation_id_direct_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."direct_conversations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "direct_messages" ADD CONSTRAINT "direct_messages_sender_id_members_id_fk" FOREIGN KEY ("sender_id") REFERENCES "public"."members"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "direct_messages" ADD CONSTRAINT "direct_messages_recipient_id_members_id_fk" FOREIGN KEY ("recipient_id") REFERENCES "public"."members"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "direct_conversations_participants_idx" ON "direct_conversations" USING btree ("participant_one_id","participant_two_id");--> statement-breakpoint
CREATE INDEX "direct_conversations_participant_one_idx" ON "direct_conversations" USING btree ("participant_one_id","last_message_at");--> statement-breakpoint
CREATE INDEX "direct_conversations_participant_two_idx" ON "direct_conversations" USING btree ("participant_two_id","last_message_at");--> statement-breakpoint
CREATE UNIQUE INDEX "direct_message_blocks_pair_idx" ON "direct_message_blocks" USING btree ("blocker_id","blocked_id");--> statement-breakpoint
CREATE INDEX "direct_message_blocks_blocked_idx" ON "direct_message_blocks" USING btree ("blocked_id");--> statement-breakpoint
CREATE INDEX "direct_message_presence_seen_idx" ON "direct_message_presence" USING btree ("last_seen_at");--> statement-breakpoint
CREATE UNIQUE INDEX "direct_messages_sender_client_idx" ON "direct_messages" USING btree ("sender_id","client_message_id");--> statement-breakpoint
CREATE INDEX "direct_messages_conversation_time_idx" ON "direct_messages" USING btree ("conversation_id","created_at");--> statement-breakpoint
CREATE INDEX "direct_messages_recipient_read_idx" ON "direct_messages" USING btree ("recipient_id","read_at");