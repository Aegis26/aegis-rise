import { createInsertSchema } from "drizzle-zod";
import {
  pgEnum,
  index,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { z } from "zod/v4";

export const themePreferenceEnum = pgEnum("theme_preference", ["light", "dark"]);
export const memberRoleEnum = pgEnum("member_role", ["member", "admin"]);
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

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
};

export const membersTable = pgTable("members", {
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
  themePreference: themePreferenceEnum("theme_preference")
    .default("dark")
    .notNull(),
  primaryColor: text("primary_color").default("#007BFF").notNull(),
  role: memberRoleEnum("role").default("member").notNull(),
  status: memberStatusEnum("status").default("pending").notNull(),
  ...timestamps,
});

export const postsTable = pgTable("posts", {
  id: uuid("id").defaultRandom().primaryKey(),
  authorId: uuid("author_id")
    .notNull()
    .references(() => membersTable.id, { onDelete: "cascade" }),
  caption: text("caption").notNull(),
  imageUrl: text("image_url"),
  ...timestamps,
});

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
  ],
);

export const chapterConfigsTable = pgTable("chapter_configs", {
  id: uuid("id").defaultRandom().primaryKey(),
  chapterName: text("chapter_name").notNull().unique(),
  chapterLogoUrl: text("chapter_logo_url"),
  primaryColor: text("primary_color").notNull(),
  secondaryColor: text("secondary_color").notNull(),
  chapterDescription: text("chapter_description"),
});

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
export const insertChapterConfigSchema = createInsertSchema(
  chapterConfigsTable,
).omit({ id: true });

export type Member = typeof membersTable.$inferSelect;
export type NewMember = z.infer<typeof insertMemberSchema>;
export type Post = typeof postsTable.$inferSelect;
export type NewPost = z.infer<typeof insertPostSchema>;
export type Share = typeof sharesTable.$inferSelect;
export type NewShare = z.infer<typeof insertShareSchema>;
export type ChapterConfig = typeof chapterConfigsTable.$inferSelect;
export type NewChapterConfig = z.infer<typeof insertChapterConfigSchema>;

export type MemberRole = Member["role"];
export type MemberStatus = Member["status"];
export type ThemePreference = Member["themePreference"];
export type SharePlatform = Share["platform"];