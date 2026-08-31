import { Router, type IRouter } from "express";
import { and, asc, eq, ne } from "drizzle-orm";
import { z } from "zod/v4";
import { db, membersTable } from "../db";
import { isMemberProfileWallpaperUrl } from "../lib/r2";
import { requireAuth } from "../middleware/auth";
import { HttpError } from "../utils/errors";

const router: IRouter = Router();
const memberIdSchema = z.string().uuid();
const socialPlatformSchema = z.enum(["facebook", "linkedin", "instagram"]);
const newsInterestSchema = z.enum([
  "business",
  "construction",
  "real_estate",
  "cooking",
  "entertainment",
  "politics",
  "world_news",
  "health_wellness",
  "cybersecurity_it",
  "general_contractor",
  "travel",
  "stock_market",
  "financial",
  "diy",
]);

const updateProfileSchema = z
  .object({
    name: z.string().trim().min(1).max(120).optional(),
    title: z.string().trim().min(1).max(160).optional(),
    company: z.string().trim().min(1).max(160).optional(),
    bio: z.string().trim().max(2_000).nullable().optional(),
    profilePictureUrl: z.string().url().max(2_048).nullable().optional(),
    themePreference: z.enum(["light", "dark"]).optional(),
    primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
    accentColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
    profileBackgroundColor: z
      .string()
      .regex(/^#[0-9A-Fa-f]{6}$/)
      .optional(),
    profileWallpaperUrl: z.string().url().max(2_048).nullable().optional(),
    profileWallpaperScale: z.number().int().min(50).max(200).optional(),
    autoPostShares: z.boolean().optional(),
    preferredPostPlatforms: z.array(socialPlatformSchema).max(3).optional(),
    newsInterests: z
      .array(newsInterestSchema)
      .max(14)
      .refine((values) => new Set(values).size === values.length, {
        message: "News interests must be unique.",
      })
      .optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "Provide at least one profile field to update.",
  });

router.get("/members", requireAuth, async (request, response, next) => {
  try {
    const members = await db
      .select({
        id: membersTable.id,
        name: membersTable.name,
        title: membersTable.title,
        company: membersTable.company,
        profilePictureUrl: membersTable.profilePictureUrl,
      })
      .from(membersTable)
      .where(
        and(
          eq(membersTable.status, "active"),
          eq(membersTable.chapter, request.user!.chapter),
          ne(membersTable.id, request.user!.id),
        ),
      )
      .orderBy(asc(membersTable.name));

    response.json({ members });
  } catch (error) {
    next(error);
  }
});

router.get("/members/me", requireAuth, async (request, response, next) => {
  try {
    const [member] = await db
      .select({
        id: membersTable.id,
        email: membersTable.email,
        name: membersTable.name,
        title: membersTable.title,
        company: membersTable.company,
        chapter: membersTable.chapter,
        bio: membersTable.bio,
        profilePictureUrl: membersTable.profilePictureUrl,
        themePreference: membersTable.themePreference,
        primaryColor: membersTable.primaryColor,
        accentColor: membersTable.accentColor,
        profileBackgroundColor: membersTable.profileBackgroundColor,
        profileWallpaperUrl: membersTable.profileWallpaperUrl,
        profileWallpaperScale: membersTable.profileWallpaperScale,
        autoPostShares: membersTable.autoPostShares,
        preferredPostPlatforms: membersTable.preferredPostPlatforms,
        newsInterests: membersTable.newsInterests,
        role: membersTable.role,
        status: membersTable.status,
        createdAt: membersTable.createdAt,
        updatedAt: membersTable.updatedAt,
      })
      .from(membersTable)
      .where(eq(membersTable.id, request.user!.id))
      .limit(1);

    if (!member) {
      throw new HttpError(404, "Member not found.");
    }

    response.json({ member });
  } catch (error) {
    next(error);
  }
});

router.patch("/members/me", requireAuth, async (request, response, next) => {
  try {
    const update = updateProfileSchema.parse(request.body);
    if (
      update.profileWallpaperUrl &&
      !isMemberProfileWallpaperUrl(
        update.profileWallpaperUrl,
        request.user!.id,
      )
    ) {
      throw new HttpError(
        400,
        "Choose a wallpaper uploaded from your profile settings.",
      );
    }

    const [member] = await db
      .update(membersTable)
      .set({
        ...update,
        updatedAt: new Date(),
      })
      .where(eq(membersTable.id, request.user!.id))
      .returning({
        id: membersTable.id,
        email: membersTable.email,
        name: membersTable.name,
        title: membersTable.title,
        company: membersTable.company,
        chapter: membersTable.chapter,
        bio: membersTable.bio,
        profilePictureUrl: membersTable.profilePictureUrl,
        themePreference: membersTable.themePreference,
        primaryColor: membersTable.primaryColor,
        accentColor: membersTable.accentColor,
        profileBackgroundColor: membersTable.profileBackgroundColor,
        profileWallpaperUrl: membersTable.profileWallpaperUrl,
        profileWallpaperScale: membersTable.profileWallpaperScale,
        autoPostShares: membersTable.autoPostShares,
        preferredPostPlatforms: membersTable.preferredPostPlatforms,
        newsInterests: membersTable.newsInterests,
        role: membersTable.role,
        status: membersTable.status,
        createdAt: membersTable.createdAt,
        updatedAt: membersTable.updatedAt,
      });

    if (!member) {
      throw new HttpError(404, "Member not found.");
    }

    response.json({ member });
  } catch (error) {
    next(error);
  }
});

router.get("/members/:id", requireAuth, async (request, response, next) => {
  try {
    const memberId = memberIdSchema.safeParse(request.params.id);
    if (!memberId.success) {
      throw new HttpError(400, "A valid member ID is required.");
    }

    const [member] = await db
      .select({
        id: membersTable.id,
        name: membersTable.name,
        title: membersTable.title,
        company: membersTable.company,
        chapter: membersTable.chapter,
        bio: membersTable.bio,
        profilePictureUrl: membersTable.profilePictureUrl,
        primaryColor: membersTable.primaryColor,
        accentColor: membersTable.accentColor,
        profileBackgroundColor: membersTable.profileBackgroundColor,
        profileWallpaperUrl: membersTable.profileWallpaperUrl,
        profileWallpaperScale: membersTable.profileWallpaperScale,
      })
      .from(membersTable)
      .where(
        and(
          eq(membersTable.id, memberId.data),
          eq(membersTable.status, "active"),
          eq(membersTable.chapter, request.user!.chapter),
        ),
      )
      .limit(1);

    if (!member) {
      throw new HttpError(404, "Member not found.");
    }

    response.json({ member });
  } catch (error) {
    next(error);
  }
});

export default router;