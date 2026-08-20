import { Router, type IRouter } from "express";
import {
  and,
  asc,
  count,
  desc,
  eq,
  inArray,
  sql,
  type SQL,
} from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { z } from "zod/v4";
import {
  db,
  membersTable,
  postImagesTable,
  postsTable,
  sharesTable,
} from "../../db";
import { requireAdmin } from "../../middleware/auth";
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
  truncateAdminCaption,
} from "./shared";

const router: IRouter = Router();
const sharingMember = alias(membersTable, "admin_post_sharing_member");

const listPostsSchema = adminPaginationSchema.extend({
  featured: z
    .enum(["true", "false"])
    .transform((value) => value === "true")
    .optional(),
  authorId: z.string().uuid().optional(),
  chapter: optionalChapterSchema,
});

const adminPostSelection = {
  postId: postsTable.id,
  authorId: postsTable.authorId,
  authorName: membersTable.name,
  authorChapter: membersTable.chapter,
  caption: postsTable.caption,
  imageUrl: postsTable.imageUrl,
  isFeatured: postsTable.isFeatured,
  featuredAt: postsTable.featuredAt,
  shares: sql<number>`count(${sharesTable.id}) FILTER (
    WHERE ${sharingMember.chapter} = ${membersTable.chapter}
  )`,
  createdAt: postsTable.createdAt,
  updatedAt: postsTable.updatedAt,
};

const adminPostGroupBy = [
  postsTable.id,
  postsTable.authorId,
  membersTable.name,
  membersTable.chapter,
  postsTable.caption,
  postsTable.imageUrl,
  postsTable.isFeatured,
  postsTable.featuredAt,
  postsTable.createdAt,
  postsTable.updatedAt,
] as const;

function serializeAdminPost(
  row: typeof adminPostSelection extends infer _Selection
    ? {
        postId: string;
        authorId: string;
        authorName: string;
        authorChapter: string;
        caption: string;
        imageUrl: string | null;
        isFeatured: boolean;
        featuredAt: Date | null;
        shares: number;
        createdAt: Date;
        updatedAt: Date;
    }
    : never,
  images: Array<{ id: string; imageUrl: string; position: number }> = [],
) {
  return {
    postId: row.postId,
    author: {
      id: row.authorId,
      name: row.authorName,
      chapter: row.authorChapter,
    },
    caption: truncateAdminCaption(row.caption),
    imageUrl: row.imageUrl,
    images,
    shares: Number(row.shares),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    featuredAt: row.featuredAt,
    status: row.isFeatured ? "featured" : "normal",
  };
}

async function serializeAdminPosts(
  rows: Parameters<typeof serializeAdminPost>[0][],
) {
  if (rows.length === 0) {
    return [];
  }

  const imageRows = await db
    .select({
      id: postImagesTable.id,
      postId: postImagesTable.postId,
      imageUrl: postImagesTable.imageUrl,
      position: postImagesTable.position,
    })
    .from(postImagesTable)
    .where(inArray(postImagesTable.postId, rows.map((row) => row.postId)))
    .orderBy(asc(postImagesTable.position));
  const imagesByPostId = new Map<
    string,
    Array<{ id: string; imageUrl: string; position: number }>
  >();
  for (const image of imageRows) {
    const images = imagesByPostId.get(image.postId) ?? [];
    images.push({
      id: image.id,
      imageUrl: image.imageUrl,
      position: image.position,
    });
    imagesByPostId.set(image.postId, images);
  }

  return rows.map((row) =>
    serializeAdminPost(row, imagesByPostId.get(row.postId) ?? []),
  );
}

async function loadAdminPost(postId: string) {
  const [row] = await db
    .select(adminPostSelection)
    .from(postsTable)
    .innerJoin(membersTable, eq(postsTable.authorId, membersTable.id))
    .leftJoin(sharesTable, eq(sharesTable.postId, postsTable.id))
    .leftJoin(sharingMember, eq(sharingMember.id, sharesTable.sharedById))
    .where(eq(postsTable.id, postId))
    .groupBy(...adminPostGroupBy)
    .limit(1);

  return row;
}

async function loadModeratedPost(
  transaction: DbTransaction,
  postId: string,
) {
  const [post] = await transaction
    .select({
      id: postsTable.id,
      caption: postsTable.caption,
      authorChapter: membersTable.chapter,
    })
    .from(postsTable)
    .innerJoin(membersTable, eq(postsTable.authorId, membersTable.id))
    .where(eq(postsTable.id, postId))
    .limit(1);

  return post;
}

router.get("/admin/posts", requireAdmin, async (request, response, next) => {
  try {
    const input = listPostsSchema.parse(request.query);
    const chapter = resolveChapterScope(request.user!, input.chapter);
    const filters: SQL[] = [];
    if (chapter) {
      filters.push(eq(membersTable.chapter, chapter));
    }
    if (input.featured !== undefined) {
      filters.push(eq(postsTable.isFeatured, input.featured));
    }
    if (input.authorId) {
      filters.push(eq(postsTable.authorId, input.authorId));
    }

    const where = filters.length > 0 ? and(...filters) : undefined;
    const offset = (input.page - 1) * input.limit;
    const [rows, totalRows] = await Promise.all([
      db
        .select(adminPostSelection)
        .from(postsTable)
        .innerJoin(membersTable, eq(postsTable.authorId, membersTable.id))
        .leftJoin(sharesTable, eq(sharesTable.postId, postsTable.id))
        .leftJoin(sharingMember, eq(sharingMember.id, sharesTable.sharedById))
        .where(where)
        .groupBy(...adminPostGroupBy)
        .orderBy(
          desc(postsTable.isFeatured),
          desc(postsTable.featuredAt),
          desc(postsTable.createdAt),
          asc(postsTable.id),
        )
        .limit(input.limit)
        .offset(offset),
      db
        .select({ total: count(postsTable.id) })
        .from(postsTable)
        .innerJoin(membersTable, eq(postsTable.authorId, membersTable.id))
        .where(where),
    ]);

    const total = Number(totalRows[0]?.total ?? 0);
    response.json({
      posts: await serializeAdminPosts(rows),
      pagination: buildAdminPagination(input.page, input.limit, total),
    });
  } catch (error) {
    next(error);
  }
});

async function setFeaturedStatus(
  request: Parameters<Parameters<typeof router.patch>[1]>[0],
  response: Parameters<Parameters<typeof router.patch>[1]>[1],
  isFeatured: boolean,
) {
  const postId = parseAdminResourceId(request.params.id, "post");
  const admin = request.user!;
  const actionType = isFeatured ? "feature_post" : "unfeature_post";
  const now = new Date();

  await db.transaction(async (transaction) => {
    const initialPost = await loadModeratedPost(transaction, postId);
    if (!initialPost) {
      throw new HttpError(404, "Post not found.");
    }
    ensureChapterAccess(admin, initialPost.authorChapter);
    await lockAdminChapter(transaction, admin, initialPost.authorChapter);

    const post = await loadModeratedPost(transaction, postId);
    if (!post || post.authorChapter !== initialPost.authorChapter) {
      throw new HttpError(
        409,
        "The chapter changed during this request. Please try again.",
      );
    }
    ensureChapterAccess(admin, post.authorChapter);

    await transaction
      .update(postsTable)
      .set({
        isFeatured,
        featuredAt: isFeatured ? now : null,
        updatedAt: now,
      })
      .where(eq(postsTable.id, postId));

    await recordModAction(transaction, {
      admin,
      actionType,
      targetType: "post",
      targetId: post.id,
      targetLabel: truncateAdminCaption(post.caption, 160),
      chapter: post.authorChapter,
    });
  });

  const post = await loadAdminPost(postId);
  if (!post) {
    throw new HttpError(404, "Post not found.");
  }

  response.json({ post: (await serializeAdminPosts([post]))[0] });
}

router.patch(
  "/admin/posts/:id/feature",
  requireAdmin,
  async (request, response, next) => {
    try {
      await setFeaturedStatus(request, response, true);
    } catch (error) {
      next(error);
    }
  },
);

router.patch(
  "/admin/posts/:id/unfeature",
  requireAdmin,
  async (request, response, next) => {
    try {
      await setFeaturedStatus(request, response, false);
    } catch (error) {
      next(error);
    }
  },
);

router.delete(
  "/admin/posts/:id",
  requireAdmin,
  async (request, response, next) => {
    try {
      const postId = parseAdminResourceId(request.params.id, "post");
      const { reason } = optionalReasonBodySchema.parse(request.body ?? {});
      const admin = request.user!;

      await db.transaction(async (transaction) => {
        const initialPost = await loadModeratedPost(transaction, postId);
        if (!initialPost) {
          throw new HttpError(404, "Post not found.");
        }
        ensureChapterAccess(admin, initialPost.authorChapter);
        await lockAdminChapter(
          transaction,
          admin,
          initialPost.authorChapter,
        );

        const post = await loadModeratedPost(transaction, postId);
        if (!post || post.authorChapter !== initialPost.authorChapter) {
          throw new HttpError(
            409,
            "The chapter changed during this request. Please try again.",
          );
        }
        ensureChapterAccess(admin, post.authorChapter);

        await transaction.delete(postsTable).where(eq(postsTable.id, postId));
        await recordModAction(transaction, {
          admin,
          actionType: "delete_post",
          targetType: "post",
          targetId: post.id,
          targetLabel: truncateAdminCaption(post.caption, 160),
          chapter: post.authorChapter,
          reason,
        });
      });

      response.json({ message: "Post deleted successfully." });
    } catch (error) {
      next(error);
    }
  },
);

export default router;