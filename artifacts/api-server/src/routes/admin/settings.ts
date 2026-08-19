import { Router, type IRouter } from "express";
import { eq, sql } from "drizzle-orm";
import { z } from "zod/v4";
import {
  chapterConfigsTable,
  db,
  membersTable,
  modActionsTable,
} from "../../db";
import { requireAdmin, requireAuth } from "../../middleware/auth";
import { HttpError } from "../../utils/errors";
import {
  lockAdminChapter,
  optionalChapterSchema,
  recordModAction,
  resolveRequiredChapter,
} from "./shared";

const router: IRouter = Router();
const colorSchema = z.string().regex(/^#[0-9A-Fa-f]{6}$/);
const chapterQuerySchema = z.object({ chapter: optionalChapterSchema });
const settingsUpdateSchema = z
  .object({
    chapterName: z.string().trim().min(1).max(160).optional(),
    chapterLogoUrl: z.string().trim().url().max(2_048).nullable().optional(),
    primaryColor: colorSchema.optional(),
    secondaryColor: colorSchema.optional(),
    chapterDescription: z.string().trim().max(2_000).nullable().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "Provide at least one chapter setting to update.",
  });
const guidelinesUpdateSchema = z.object({
  guidelinesText: z.string().trim().max(20_000),
});

const defaultPrimaryColor = "#007BFF";
const defaultSecondaryColor = "#080D18";

async function loadChapterConfig(chapter: string) {
  const [config] = await db
    .select()
    .from(chapterConfigsTable)
    .where(eq(chapterConfigsTable.chapterName, chapter))
    .limit(1);

  return config;
}

function serializeSettings(
  chapter: string,
  config: Awaited<ReturnType<typeof loadChapterConfig>>,
) {
  return {
    id: config?.id ?? null,
    chapterName: config?.chapterName ?? chapter,
    chapterLogoUrl: config?.chapterLogoUrl ?? null,
    primaryColor: config?.primaryColor ?? defaultPrimaryColor,
    secondaryColor: config?.secondaryColor ?? defaultSecondaryColor,
    chapterDescription: config?.chapterDescription ?? null,
    updatedAt: config?.updatedAt ?? null,
  };
}

router.get(
  "/admin/settings",
  requireAdmin,
  async (request, response, next) => {
    try {
      const { chapter: requestedChapter } = chapterQuerySchema.parse(
        request.query,
      );
      const chapter = resolveRequiredChapter(
        request.user!,
        requestedChapter,
      );
      const config = await loadChapterConfig(chapter);
      response.json({ settings: serializeSettings(chapter, config) });
    } catch (error) {
      next(error);
    }
  },
);

router.patch(
  "/admin/settings",
  requireAdmin,
  async (request, response, next) => {
    try {
      const { chapter: requestedChapter } = chapterQuerySchema.parse(
        request.query,
      );
      const targetChapter = resolveRequiredChapter(
        request.user!,
        requestedChapter,
      );
      const input = settingsUpdateSchema.parse(request.body);
      const admin = request.user!;
      const nextChapter = input.chapterName ?? targetChapter;

      const config = await db.transaction(async (transaction) => {
        const lockedChapterNames = [...new Set([targetChapter, nextChapter])].sort();
        for (const chapterName of lockedChapterNames) {
          await transaction.execute(sql`
            SELECT pg_advisory_xact_lock(
              hashtextextended(${chapterName}, 0::bigint)
            )
          `);
        }

        await lockAdminChapter(transaction, admin, targetChapter);

        const [existing] = await transaction
          .select()
          .from(chapterConfigsTable)
          .where(eq(chapterConfigsTable.chapterName, targetChapter))
          .limit(1);
        if (existing?.nameReserved) {
          throw new HttpError(
            409,
            "This chapter name is reserved and cannot be reused.",
          );
        }

        if (nextChapter !== targetChapter) {
          const [[configConflict], [memberConflict]] = await Promise.all([
            transaction
              .select({ id: chapterConfigsTable.id })
              .from(chapterConfigsTable)
              .where(eq(chapterConfigsTable.chapterName, nextChapter))
              .limit(1),
            transaction
              .select({ id: membersTable.id })
              .from(membersTable)
              .where(eq(membersTable.chapter, nextChapter))
              .limit(1),
          ]);
          if (
            (configConflict && configConflict.id !== existing?.id) ||
            memberConflict
          ) {
            throw new HttpError(
              409,
              "A chapter with that name already exists.",
            );
          }

          await transaction
            .update(membersTable)
            .set({ chapter: nextChapter, updatedAt: new Date() })
            .where(eq(membersTable.chapter, targetChapter));

          await transaction
            .update(modActionsTable)
            .set({ chapter: nextChapter })
            .where(eq(modActionsTable.chapter, targetChapter));
        }

        const values = {
          chapterName: nextChapter,
          chapterLogoUrl:
            input.chapterLogoUrl === undefined
              ? (existing?.chapterLogoUrl ?? null)
              : input.chapterLogoUrl,
          primaryColor:
            input.primaryColor ??
            existing?.primaryColor ??
            defaultPrimaryColor,
          secondaryColor:
            input.secondaryColor ??
            existing?.secondaryColor ??
            defaultSecondaryColor,
          chapterDescription:
            input.chapterDescription === undefined
              ? (existing?.chapterDescription ?? null)
              : input.chapterDescription,
          guidelinesText: existing?.guidelinesText ?? "",
          signupGuardPending:
            nextChapter !== targetChapter
              ? true
              : (existing?.signupGuardPending ?? false),
          nameReserved: false,
          updatedAt: new Date(),
        };

        const [updated] = existing
          ? await transaction
              .update(chapterConfigsTable)
              .set(values)
              .where(eq(chapterConfigsTable.id, existing.id))
              .returning()
          : await transaction
              .insert(chapterConfigsTable)
              .values(values)
              .returning();

        if (nextChapter !== targetChapter) {
          await transaction.insert(chapterConfigsTable).values({
            chapterName: targetChapter,
            chapterLogoUrl: null,
            primaryColor: defaultPrimaryColor,
            secondaryColor: defaultSecondaryColor,
            chapterDescription: null,
            guidelinesText: "",
            signupGuardPending: false,
            nameReserved: true,
            updatedAt: new Date(),
          });
        }

        await recordModAction(transaction, {
          admin,
          actionType: "update_settings",
          targetType: "chapter",
          targetId: updated.id,
          targetLabel: nextChapter,
          chapter: nextChapter,
        });

        return updated;
      });

      response.json({
        settings: serializeSettings(config.chapterName, config),
      });
    } catch (error) {
      next(error);
    }
  },
);

router.get(
  "/admin/guidelines",
  requireAuth,
  async (request, response, next) => {
    try {
      const { chapter: requestedChapter } = chapterQuerySchema.parse(
        request.query,
      );
      const chapter = resolveRequiredChapter(
        request.user!,
        requestedChapter,
      );
      const config = await loadChapterConfig(chapter);
      response.json({
        chapter,
        guidelinesText: config?.guidelinesText ?? "",
      });
    } catch (error) {
      next(error);
    }
  },
);

router.patch(
  "/admin/guidelines",
  requireAdmin,
  async (request, response, next) => {
    try {
      const { chapter: requestedChapter } = chapterQuerySchema.parse(
        request.query,
      );
      const chapter = resolveRequiredChapter(
        request.user!,
        requestedChapter,
      );
      const { guidelinesText } = guidelinesUpdateSchema.parse(request.body);
      const admin = request.user!;

      const config = await db.transaction(async (transaction) => {
        await lockAdminChapter(transaction, admin, chapter);

        const [existing] = await transaction
          .select({
            nameReserved: chapterConfigsTable.nameReserved,
          })
          .from(chapterConfigsTable)
          .where(eq(chapterConfigsTable.chapterName, chapter))
          .limit(1);
        if (existing?.nameReserved) {
          throw new HttpError(
            409,
            "This chapter name is reserved and cannot be reused.",
          );
        }

        const [updated] = await transaction
          .insert(chapterConfigsTable)
          .values({
            chapterName: chapter,
            chapterLogoUrl: null,
            primaryColor: defaultPrimaryColor,
            secondaryColor: defaultSecondaryColor,
            chapterDescription: null,
            guidelinesText,
            updatedAt: new Date(),
          })
          .onConflictDoUpdate({
            target: chapterConfigsTable.chapterName,
            set: { guidelinesText, updatedAt: new Date() },
          })
          .returning();

        await recordModAction(transaction, {
          admin,
          actionType: "update_guidelines",
          targetType: "chapter",
          targetId: updated.id,
          targetLabel: chapter,
          chapter,
        });

        return updated;
      });

      response.json({
        chapter: config.chapterName,
        guidelinesText: config.guidelinesText,
        updatedAt: config.updatedAt,
      });
    } catch (error) {
      next(error);
    }
  },
);

export default router;