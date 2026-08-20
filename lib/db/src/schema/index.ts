import { createInsertSchema } from "drizzle-zod";
import {
  boolean,
  integer,
  pgEnum,
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { z } from "zod/v4";

export const themePreferenceEnum = pgEnum("theme_preference", ["light", "dark"]);
export const memberRoleEnum = pgEnum("member_role", [
  "member",
  "admin",
  "super_admin",
]);
export const memberStatusEnum = pgEnum("member_status", [
  "pending",
  "active",
  "banned",
]);
export const sharePlatformEnum = pgEnum("share_platform", [
  "LinkedIn",
  "Instagram",
  "Facebook",
  "TikTok",
  "Direct Link",
]);
export const socialPlatformEnum = pgEnum("social_platform", [
  "facebook",
  "linkedin",
  "instagram",
]);
export const modActionTypeEnum = pgEnum("mod_action_type", [
  "delete_post",
  "feature_post",
  "unfeature_post",
  "approve_member",
  "deny_member",
  "ban_member",
  "update_settings",
  "update_guidelines",
]);
export const modTargetTypeEnum = pgEnum("mod_target_type", [
  "post",
  "member",
  "chapter",
]);

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
};

export const membersTable = pgTable(
  "members",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    email: text("email").notNull().unique(),
    // Nullable for members created before authentication was introduced.
    // New signups always provide a hash, while legacy accounts must establish one.
    passwordHash: text("password_hash"),
    name: text("name").notNull(),
    title: text("title").notNull(),
    company: text("company").notNull(),
    chapter: text("chapter").notNull(),
    bio: text("bio"),
    profilePictureUrl: text("profile_picture_url"),
    signupSource: text("signup_source"),
    lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
    themePreference: themePreferenceEnum("theme_preference")
      .default("dark")
      .notNull(),
    primaryColor: text("primary_color").default("#007BFF").notNull(),
    autoPostShares: boolean("auto_post_shares").default(false).notNull(),
    preferredPostPlatforms: socialPlatformEnum("preferred_post_platforms")
      .array()
      .default(sql`ARRAY[]::social_platform[]`)
      .notNull(),
    role: memberRoleEnum("role").default("member").notNull(),
    status: memberStatusEnum("status").default("pending").notNull(),
    ...timestamps,
  },
  (table) => [
    index("members_chapter_status_idx").on(table.chapter, table.status),
    index("members_created_at_idx").on(table.createdAt),
  ],
);

export const socialAccountsTable = pgTable(
  "social_accounts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    memberId: uuid("member_id")
      .notNull()
      .references(() => membersTable.id, { onDelete: "cascade" }),
    platform: socialPlatformEnum("platform").notNull(),
    accessToken: text("access_token").notNull(),
    refreshToken: text("refresh_token"),
    externalUserId: text("external_user_id").notNull(),
    connectedAt: timestamp("connected_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    isActive: boolean("is_active").default(true).notNull(),
    isPublishingEligible: boolean("is_publishing_eligible")
      .default(false)
      .notNull(),
    publishingError: text("publishing_error"),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("social_accounts_member_platform_idx").on(
      table.memberId,
      table.platform,
    ),
    index("social_accounts_member_active_idx").on(
      table.memberId,
      table.isActive,
    ),
  ],
);

export const socialOAuthStatesTable = pgTable(
  "social_oauth_states",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    stateHash: text("state_hash").notNull().unique(),
    memberId: uuid("member_id")
      .notNull()
      .references(() => membersTable.id, { onDelete: "cascade" }),
    platform: socialPlatformEnum("platform").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    consumedAt: timestamp("consumed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("social_oauth_states_expiry_idx").on(table.expiresAt),
    index("social_oauth_states_member_idx").on(table.memberId),
  ],
);

export const postsTable = pgTable(
  "posts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    authorId: uuid("author_id")
      .notNull()
      .references(() => membersTable.id, { onDelete: "cascade" }),
    caption: text("caption").notNull(),
    imageUrl: text("image_url"),
    isFeatured: boolean("is_featured").default(false).notNull(),
    featuredAt: timestamp("featured_at", { withTimezone: true }),
    ...timestamps,
  },
  (table) => [
    index("posts_author_id_idx").on(table.authorId),
    index("posts_featured_created_at_idx").on(
      table.isFeatured,
      table.createdAt,
    ),
  ],
);

export const postImagesTable = pgTable(
  "post_images",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    postId: uuid("post_id")
      .notNull()
      .references(() => postsTable.id, { onDelete: "cascade" }),
    imageUrl: text("image_url").notNull(),
    position: integer("position").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("post_images_post_position_idx").on(table.postId, table.position),
    index("post_images_post_id_idx").on(table.postId),
  ],
);

export const sharesTable = pgTable(
  "shares",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    postId: uuid("post_id")
      .notNull()
      .references(() => postsTable.id, { onDelete: "cascade" }),
    sharedById: uuid("shared_by_id")
      .notNull()
      .references(() => membersTable.id, { onDelete: "cascade" }),
    platform: sharePlatformEnum("platform").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("shares_post_id_idx").on(table.postId),
    index("shares_shared_by_id_idx").on(table.sharedById),
    index("shares_created_at_idx").on(table.createdAt),
  ],
);

export const chapterConfigsTable = pgTable("chapter_configs", {
  id: uuid("id").defaultRandom().primaryKey(),
  chapterName: text("chapter_name").notNull().unique(),
  chapterLogoUrl: text("chapter_logo_url"),
  primaryColor: text("primary_color").notNull(),
  secondaryColor: text("secondary_color").notNull(),
  chapterDescription: text("chapter_description"),
  guidelinesText: text("guidelines_text").default("").notNull(),
  signupGuardPending: boolean("signup_guard_pending")
    .default(false)
    .notNull(),
  nameReserved: boolean("name_reserved").default(false).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const modActionsTable = pgTable(
  "mod_actions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    adminId: uuid("admin_id").references(() => membersTable.id, {
      onDelete: "set null",
    }),
    adminName: text("admin_name").notNull(),
    actionType: modActionTypeEnum("action_type").notNull(),
    targetType: modTargetTypeEnum("target_type").notNull(),
    targetId: uuid("target_id").notNull(),
    targetLabel: text("target_label").notNull(),
    chapter: text("chapter").notNull(),
    reason: text("reason"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("mod_actions_admin_id_idx").on(table.adminId),
    index("mod_actions_chapter_created_at_idx").on(
      table.chapter,
      table.createdAt,
    ),
    index("mod_actions_target_id_idx").on(table.targetId),
  ],
);

export const insertMemberSchema = createInsertSchema(membersTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const insertPostSchema = createInsertSchema(postsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const insertShareSchema = createInsertSchema(sharesTable).omit({
  id: true,
  createdAt: true,
});
export const insertPostImageSchema = createInsertSchema(postImagesTable).omit({
  id: true,
  createdAt: true,
});
export const insertSocialAccountSchema = createInsertSchema(
  socialAccountsTable,
).omit({ id: true, connectedAt: true, createdAt: true, updatedAt: true });
export const insertChapterConfigSchema = createInsertSchema(
  chapterConfigsTable,
).omit({ id: true, updatedAt: true });
export const insertModActionSchema = createInsertSchema(modActionsTable).omit({
  id: true,
  createdAt: true,
});

export type Member = typeof membersTable.$inferSelect;
export type NewMember = z.infer<typeof insertMemberSchema>;
export type Post = typeof postsTable.$inferSelect;
export type NewPost = z.infer<typeof insertPostSchema>;
export type PostImage = typeof postImagesTable.$inferSelect;
export type NewPostImage = z.infer<typeof insertPostImageSchema>;
export type Share = typeof sharesTable.$inferSelect;
export type NewShare = z.infer<typeof insertShareSchema>;
export type SocialAccount = typeof socialAccountsTable.$inferSelect;
export type NewSocialAccount = z.infer<typeof insertSocialAccountSchema>;
export type SocialPlatform = SocialAccount["platform"];
export type ChapterConfig = typeof chapterConfigsTable.$inferSelect;
export type NewChapterConfig = z.infer<typeof insertChapterConfigSchema>;
export type ModAction = typeof modActionsTable.$inferSelect;
export type NewModAction = z.infer<typeof insertModActionSchema>;

export type MemberRole = Member["role"];
export type MemberStatus = Member["status"];
export type ThemePreference = Member["themePreference"];
export type SharePlatform = Share["platform"];
export type ModActionType = ModAction["actionType"];
export type ModTargetType = ModAction["targetType"];