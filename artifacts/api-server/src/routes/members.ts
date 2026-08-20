import { Router, type IRouter } from "express";
import { and, asc, eq } from "drizzle-orm";
import { z } from "zod/v4";
import { db, membersTable } from "../db";
import { requireAuth } from "../middleware/auth";
import { HttpError } from "../utils/errors";

const router: IRouter = Router();
const memberIdSchema = z.string().uuid();
const socialPlatformSchema = z.enum(["facebook", "linkedin", "instagram"]);

const updateProfileSchema = z
  .object({
    name: z.string().trim().min(1).max(120).optional(),
    title: z.string().trim().min(1).max(160).optional(),
    company: z.string().trim().min(1).max(160).optional(),
    bio: z.string().trim().max(2_000).nullable().optional(),
    profilePictureUrl: z.string().url().max(2_048).nullable().optional(),
    themePreference: z.enum(["light", "dark"]).optional(),
    primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
    autoPostShares: z.boolean().optional(),
    preferredPostPlatforms: z.array(socialPlatformSchema).max(3).optional(),
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
        autoPostShares: membersTable.autoPostShares,
        preferredPostPlatforms: membersTable.preferredPostPlatforms,
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
    const preferredPostPlatforms = update.preferredPostPlatforms?.filter(
      (platform) => platform !== "facebook",
    );
    const [member] = await db
      .update(membersTable)
      .set({
        ...update,
        ...(preferredPostPlatforms
          ? { preferredPostPlatforms }
          : {}),
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
        autoPostShares: membersTable.autoPostShares,
        preferredPostPlatforms: membersTable.preferredPostPlatforms,
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
        bio: membersTable.bio,
        profilePictureUrl: membersTable.profilePictureUrl,
        themePreference: membersTable.themePreference,
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