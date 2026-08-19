import { Router, type IRouter } from "express";
import { and, count, desc, eq, type SQL } from "drizzle-orm";
import { z } from "zod/v4";
import { db, modActionsTable } from "../../db";
import { requireAdmin } from "../../middleware/auth";
import {
  adminPaginationSchema,
  buildAdminPagination,
  optionalChapterSchema,
  resolveChapterScope,
} from "./shared";

const router: IRouter = Router();
const logsQuerySchema = adminPaginationSchema.extend({
  chapter: optionalChapterSchema,
  action: z
    .enum([
      "delete_post",
      "feature_post",
      "unfeature_post",
      "approve_member",
      "deny_member",
      "ban_member",
      "update_settings",
      "update_guidelines",
    ])
    .optional(),
});

router.get("/admin/logs", requireAdmin, async (request, response, next) => {
  try {
    const input = logsQuerySchema.parse(request.query);
    const chapter = resolveChapterScope(request.user!, input.chapter);
    const filters: SQL[] = [];
    if (chapter) {
      filters.push(eq(modActionsTable.chapter, chapter));
    }
    if (input.action) {
      filters.push(eq(modActionsTable.actionType, input.action));
    }

    const where = filters.length > 0 ? and(...filters) : undefined;
    const offset = (input.page - 1) * input.limit;
    const [rows, totalRows] = await Promise.all([
      db
        .select({
          id: modActionsTable.id,
          adminId: modActionsTable.adminId,
          adminName: modActionsTable.adminName,
          action: modActionsTable.actionType,
          targetType: modActionsTable.targetType,
          targetId: modActionsTable.targetId,
          target: modActionsTable.targetLabel,
          chapter: modActionsTable.chapter,
          reason: modActionsTable.reason,
          date: modActionsTable.createdAt,
        })
        .from(modActionsTable)
        .where(where)
        .orderBy(desc(modActionsTable.createdAt), desc(modActionsTable.id))
        .limit(input.limit)
        .offset(offset),
      db
        .select({ total: count(modActionsTable.id) })
        .from(modActionsTable)
        .where(where),
    ]);

    const total = Number(totalRows[0]?.total ?? 0);
    response.json({
      logs: rows,
      pagination: buildAdminPagination(input.page, input.limit, total),
    });
  } catch (error) {
    next(error);
  }
});

export default router;