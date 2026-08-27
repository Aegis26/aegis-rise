import { Router, type IRouter, type RequestHandler } from "express";
import { and, asc, count, desc, eq, sql, type SQL } from "drizzle-orm";
import { z } from "zod/v4";
import {
  db,
  membersTable,
  postsTable,
  sharesTable,
  type Member,
} from "../../db";
import {
  sendApprovalNotification,
  sendRejectionNotification,
} from "../../lib/member-notifications";
import { requireAdmin, type AuthenticatedUser } from "../../middleware/auth";
import { HttpError } from "../../utils/errors";
import {
  adminPaginationSchema,
  buildAdminPagination,
  type DbTransaction,
  ensureChapterAccess,
  lockAdminChapter,
  optionalChapterSchema,
  optionalReasonBodySchema,
  parseAdminResourceId,
  recordModAction,
  resolveChapterScope,
} from "./shared";

const router: IRouter = Router();

const listMembersSchema = adminPaginationSchema.extend({
  status: z.enum(["active", "pending", "banned"]).optional(),
  chapter: optionalChapterSchema,
});

const memberSummarySelection = {
  id: membersTable.id,
  email: membersTable.email,
  name: membersTable.name,
  title: membersTable.title,
  company: membersTable.company,
  chapter: membersTable.chapter,
  bio: membersTable.bio,
  role: membersTable.role,
  status: membersTable.status,
  signupSource: membersTable.signupSource,
  lastLoginAt: membersTable.lastLoginAt,
  createdAt: membersTable.createdAt,
  updatedAt: membersTable.updatedAt,
  postsCount: sql<number>`(
    SELECT count(*)::int
    FROM posts member_posts
    WHERE member_posts.author_id = ${membersTable.id}
  )`,
  sharesCount: sql<number>`(
    SELECT count(*)::int
    FROM shares member_shares
    INNER JOIN posts shared_posts ON shared_posts.id = member_shares.post_id
    INNER JOIN members shared_authors ON shared_authors.id = shared_posts.author_id
    WHERE
      member_shares.shared_by_id = "members"."id"
      AND shared_authors.chapter = "members"."chapter"
  )`,
};

const managedMemberSelection = {
  id: membersTable.id,
  email: membersTable.email,
  name: membersTable.name,
  chapter: membersTable.chapter,
  role: membersTable.role,
  status: membersTable.status,
  updatedAt: membersTable.updatedAt,
};

type ManagedMember = Pick<
  Member,
  "id" | "email" | "name" | "chapter" | "role" | "status" | "updatedAt"
>;

async function loadManagedMember(
  transaction: DbTransaction,
  memberId: string,
): Promise<ManagedMember | undefined> {
  const [member] = await transaction
    .select(managedMemberSelection)
    .from(membersTable)
    .where(eq(membersTable.id, memberId))
    .limit(1);

  return member;
}

function ensureMemberMutationAccess(
  admin: AuthenticatedUser,
  target: ManagedMember,
  options: { blockSelf?: boolean; blockSuperAdmin?: boolean } = {},
): void {
  ensureChapterAccess(admin, target.chapter);

  if (target.role === "super_admin" && admin.role !== "super_admin") {
    throw new HttpError(404, "Member not found.");
  }
  if (options.blockSelf && target.id === admin.id) {
    throw new HttpError(403, "You cannot perform this action on yourself.");
  }
  if (options.blockSuperAdmin && target.role === "super_admin") {
    throw new HttpError(
      403,
      "Super-admin accounts cannot be banned, denied, or deleted.",
    );
  }
}

async function loadLockedManagedMember(
  transaction: DbTransaction,
  memberId: string,
  admin: AuthenticatedUser,
  options: { blockSelf?: boolean; blockSuperAdmin?: boolean } = {},
): Promise<ManagedMember> {
  const initialTarget = await loadManagedMember(transaction, memberId);
  if (!initialTarget) {
    throw new HttpError(404, "Member not found.");
  }
  ensureMemberMutationAccess(admin, initialTarget, options);

  await lockAdminChapter(transaction, admin, initialTarget.chapter);

  const target = await loadManagedMember(transaction, memberId);
  if (!target || target.chapter !== initialTarget.chapter) {
    throw new HttpError(
      409,
      "The chapter changed during this request. Please try again.",
    );
  }
  ensureMemberMutationAccess(admin, target, options);

  return target;
}

router.get(
  "/admin/members/all",
  requireAdmin,
  async (request, response, next) => {
    try {
      const input = listMembersSchema.parse(request.query);
      const chapter = resolveChapterScope(request.user!, input.chapter);
      const filters: SQL[] = [];
      if (chapter) {
        filters.push(eq(membersTable.chapter, chapter));
      }
      if (input.status) {
        filters.push(eq(membersTable.status, input.status));
      }

      const where = filters.length > 0 ? and(...filters) : undefined;
      const offset = (input.page - 1) * input.limit;
      const [rows, totalRows] = await Promise.all([
        db
          .select(memberSummarySelection)
          .from(membersTable)
          .where(where)
          .orderBy(desc(membersTable.createdAt), asc(membersTable.id))
          .limit(input.limit)
          .offset(offset),
        db
          .select({ total: count(membersTable.id) })
          .from(membersTable)
          .where(where),
      ]);

      const total = Number(totalRows[0]?.total ?? 0);
      response.json({
        members: rows.map((row) => ({
          ...row,
          postsCount: Number(row.postsCount),
          sharesCount: Number(row.sharesCount),
          lastActive: row.lastLoginAt,
        })),
        pagination: buildAdminPagination(input.page, input.limit, total),
      });
    } catch (error) {
      next(error);
    }
  },
);

const listPendingMembers: RequestHandler = async (
  request,
  response,
  next,
) => {
  try {
    const input = adminPaginationSchema
      .extend({ chapter: optionalChapterSchema })
      .parse(request.query);
    const chapter = resolveChapterScope(request.user!, input.chapter);
    const filters: SQL[] = [eq(membersTable.status, "pending")];
    if (chapter) {
      filters.push(eq(membersTable.chapter, chapter));
    }

    const where = and(...filters);
    const offset = (input.page - 1) * input.limit;
    const [rows, totalRows] = await Promise.all([
      db
        .select({
          id: membersTable.id,
          name: membersTable.name,
          email: membersTable.email,
          title: membersTable.title,
          company: membersTable.company,
          chapter: membersTable.chapter,
          bio: membersTable.bio,
          signupSource: membersTable.signupSource,
          createdAt: membersTable.createdAt,
        })
        .from(membersTable)
        .where(where)
        .orderBy(asc(membersTable.createdAt), asc(membersTable.id))
        .limit(input.limit)
        .offset(offset),
      db
        .select({ total: count(membersTable.id) })
        .from(membersTable)
        .where(where),
    ]);

    const total = Number(totalRows[0]?.total ?? 0);
    response.json({
      members: rows,
      pagination: buildAdminPagination(input.page, input.limit, total),
    });
  } catch (error) {
    next(error);
  }
};

router.get("/admin/members/pending", requireAdmin, listPendingMembers);
router.get("/admin/pending-members", requireAdmin, listPendingMembers);

router.patch(
  "/admin/members/:id/approve",
  requireAdmin,
  async (request, response, next) => {
    try {
      const memberId = parseAdminResourceId(request.params.id, "member");
      const admin = request.user!;
      const member = await db.transaction(async (transaction) => {
        const target = await loadLockedManagedMember(
          transaction,
          memberId,
          admin,
        );
        if (target.status !== "pending") {
          throw new HttpError(400, "Only pending members can be approved.");
        }

        const [updatedMember] = await transaction
          .update(membersTable)
          .set({ status: "active", updatedAt: new Date() })
          .where(eq(membersTable.id, memberId))
          .returning(managedMemberSelection);

        await recordModAction(transaction, {
          admin,
          actionType: "approve_member",
          targetType: "member",
          targetId: target.id,
          targetLabel: target.name,
          chapter: target.chapter,
        });

        return updatedMember;
      });

      const notification = await sendApprovalNotification(member);
      response.json({ member, notification });
    } catch (error) {
      next(error);
    }
  },
);

router.patch(
  "/admin/members/:id/deny",
  requireAdmin,
  async (request, response, next) => {
    try {
      const memberId = parseAdminResourceId(request.params.id, "member");
      const { reason } = optionalReasonBodySchema.parse(request.body ?? {});
      const admin = request.user!;
      const deniedMember = await db.transaction(async (transaction) => {
        const target = await loadLockedManagedMember(
          transaction,
          memberId,
          admin,
          {
            blockSelf: true,
            blockSuperAdmin: true,
          },
        );
        if (target.status !== "pending") {
          throw new HttpError(400, "Only pending members can be denied.");
        }

        await transaction.delete(membersTable).where(eq(membersTable.id, memberId));
        await recordModAction(transaction, {
          admin,
          actionType: "deny_member",
          targetType: "member",
          targetId: target.id,
          targetLabel: target.name,
          chapter: target.chapter,
          reason,
        });

        return target;
      });

      const notification = await sendRejectionNotification(deniedMember);
      response.json({
        message: "Member application denied.",
        notification,
      });
    } catch (error) {
      next(error);
    }
  },
);

router.patch(
  "/admin/members/:id/ban",
  requireAdmin,
  async (request, response, next) => {
    try {
      const memberId = parseAdminResourceId(request.params.id, "member");
      const { reason } = optionalReasonBodySchema.parse(request.body ?? {});
      const admin = request.user!;
      const member = await db.transaction(async (transaction) => {
        const target = await loadLockedManagedMember(
          transaction,
          memberId,
          admin,
          {
            blockSelf: true,
            blockSuperAdmin: true,
          },
        );
        if (target.status === "banned") {
          throw new HttpError(400, "Member is already banned.");
        }

        const [updatedMember] = await transaction
          .update(membersTable)
          .set({ status: "banned", updatedAt: new Date() })
          .where(eq(membersTable.id, memberId))
          .returning(managedMemberSelection);

        await recordModAction(transaction, {
          admin,
          actionType: "ban_member",
          targetType: "member",
          targetId: target.id,
          targetLabel: target.name,
          chapter: target.chapter,
          reason,
        });

        return updatedMember;
      });

      response.json({ member });
    } catch (error) {
      next(error);
    }
  },
);

router.delete(
  "/admin/members/:id",
  requireAdmin,
  async (request, response, next) => {
    try {
      const memberId = parseAdminResourceId(request.params.id, "member");
      const { reason } = optionalReasonBodySchema.parse(request.body ?? {});
      const admin = request.user!;
      const deletedMember = await db.transaction(async (transaction) => {
        const target = await loadLockedManagedMember(
          transaction,
          memberId,
          admin,
          {
            blockSelf: true,
            blockSuperAdmin: true,
          },
        );

        await transaction
          .delete(membersTable)
          .where(eq(membersTable.id, memberId));
        await recordModAction(transaction, {
          admin,
          actionType: "delete_member",
          targetType: "member",
          targetId: target.id,
          targetLabel: target.name,
          chapter: target.chapter,
          reason,
        });

        return target;
      });

      response.json({
        message: `${deletedMember.name} was permanently deleted, along with their posts, shares, and social connections.`,
      });
    } catch (error) {
      next(error);
    }
  },
);

router.get(
  "/admin/members/:id/activity",
  requireAdmin,
  async (request, response, next) => {
    try {
      const memberId = parseAdminResourceId(request.params.id, "member");
      const admin = request.user!;
      const [member] = await db
        .select({
          id: membersTable.id,
          name: membersTable.name,
          chapter: membersTable.chapter,
          role: membersTable.role,
          status: membersTable.status,
          lastLoginAt: membersTable.lastLoginAt,
          joinDate: membersTable.createdAt,
          postsCreated: sql<number>`(
            SELECT count(*)::int
            FROM posts member_posts
            WHERE member_posts.author_id = ${membersTable.id}
          )`,
          sharesMade: sql<number>`(
            SELECT count(*)::int
            FROM shares member_shares
            INNER JOIN posts shared_posts ON shared_posts.id = member_shares.post_id
            INNER JOIN members shared_authors ON shared_authors.id = shared_posts.author_id
            WHERE
              member_shares.shared_by_id = "members"."id"
              AND shared_authors.chapter = "members"."chapter"
          )`,
        })
        .from(membersTable)
        .where(eq(membersTable.id, memberId))
        .limit(1);

      if (!member) {
        throw new HttpError(404, "Member not found.");
      }
      ensureChapterAccess(admin, member.chapter);
      if (member.role === "super_admin" && admin.role !== "super_admin") {
        throw new HttpError(404, "Member not found.");
      }

      response.json({
        activity: {
          memberId: member.id,
          name: member.name,
          chapter: member.chapter,
          status: member.status,
          postsCreated: Number(member.postsCreated),
          sharesMade: Number(member.sharesMade),
          lastLoginDate: member.lastLoginAt,
          joinDate: member.joinDate,
        },
      });
    } catch (error) {
      next(error);
    }
  },
);

export default router;