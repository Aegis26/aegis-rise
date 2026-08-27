import { z } from "zod/v4";
import { eq, sql } from "drizzle-orm";
import {
  db,
  membersTable,
  modActionsTable,
  type ModActionType,
  type ModTargetType,
} from "../../db";
import type { AuthenticatedUser } from "../../middleware/auth";
import { HttpError } from "../../utils/errors";

export const adminPaginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export const optionalChapterSchema = z
  .string()
  .trim()
  .min(1)
  .max(160)
  .optional();

export const optionalReasonBodySchema = z.object({
  reason: z.string().trim().min(1).max(1_000).optional(),
});

const uuidSchema = z.string().uuid();

export function parseAdminResourceId(
  value: unknown,
  resource: "post" | "member",
): string {
  const result = uuidSchema.safeParse(value);
  if (!result.success) {
    throw new HttpError(400, `A valid ${resource} ID is required.`);
  }

  return result.data;
}

export function resolveChapterScope(
  user: AuthenticatedUser,
  requestedChapter?: string,
): string | undefined {
  if (user.role === "super_admin") {
    return requestedChapter;
  }

  if (requestedChapter && requestedChapter !== user.chapter) {
    throw new HttpError(403, "You can only manage your own chapter.");
  }

  return user.chapter;
}

export function resolveRequiredChapter(
  user: AuthenticatedUser,
  requestedChapter?: string,
): string {
  return resolveChapterScope(user, requestedChapter) ?? user.chapter;
}

export function ensureChapterAccess(
  user: AuthenticatedUser,
  targetChapter: string,
): void {
  if (user.role !== "super_admin" && user.chapter !== targetChapter) {
    throw new HttpError(404, "Resource not found.");
  }
}

export function requireSuperAdmin(user: AuthenticatedUser): void {
  if (user.role !== "super_admin") {
    throw new HttpError(403, "Master administrator access is required.");
  }
}

export function buildAdminPagination(
  page: number,
  limit: number,
  total: number,
) {
  const totalPages = total === 0 ? 0 : Math.ceil(total / limit);
  return {
    page,
    limit,
    total,
    totalPages,
    hasNextPage: page < totalPages,
    hasPreviousPage: page > 1 && totalPages > 0,
  };
}

export function truncateAdminCaption(caption: string, limit = 240): string {
  if (caption.length <= limit) {
    return caption;
  }

  return `${caption.slice(0, limit - 1)}…`;
}

export type DbTransaction = Parameters<
  Parameters<typeof db.transaction>[0]
>[0];

export async function lockAdminChapters(
  transaction: DbTransaction,
  chapters: string[],
): Promise<void> {
  for (const chapter of [...new Set(chapters)].sort()) {
    await transaction.execute(sql`
      SELECT pg_advisory_xact_lock(
        hashtextextended(${chapter}, 0::bigint)
      )
    `);
  }
}

export async function lockAdminChapter(
  transaction: DbTransaction,
  admin: AuthenticatedUser,
  chapter: string,
): Promise<void> {
  await lockAdminChapters(transaction, [chapter]);

  const [currentAdmin] = await transaction
    .select({
      chapter: membersTable.chapter,
      role: membersTable.role,
      status: membersTable.status,
    })
    .from(membersTable)
    .where(eq(membersTable.id, admin.id))
    .limit(1);

  if (
    !currentAdmin ||
    currentAdmin.status !== "active" ||
    currentAdmin.role !== admin.role
  ) {
    throw new HttpError(403, "Administrator access changed.");
  }
  if (
    admin.role !== "super_admin" &&
    currentAdmin.chapter !== chapter
  ) {
    throw new HttpError(
      409,
      "The chapter changed during this request. Please try again.",
    );
  }
}

export async function recordModAction(
  transaction: DbTransaction,
  input: {
    admin: AuthenticatedUser;
    actionType: ModActionType;
    targetType: ModTargetType;
    targetId: string;
    targetLabel: string;
    chapter: string;
    reason?: string;
  },
): Promise<void> {
  await transaction.insert(modActionsTable).values({
    adminId: input.admin.id,
    adminName: input.admin.name,
    actionType: input.actionType,
    targetType: input.targetType,
    targetId: input.targetId,
    targetLabel: input.targetLabel,
    chapter: input.chapter,
    reason: input.reason ?? null,
  });
}