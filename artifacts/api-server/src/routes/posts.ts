import { Router, type IRouter } from "express";
import { and, count, desc, eq } from "drizzle-orm";
import { z } from "zod/v4";
import { db, membersTable, postsTable, sharesTable } from "../db";
import { requireAuth } from "../middleware/auth";
import { HttpError } from "../utils/errors";

const router: IRouter = Router();

const uuidSchema = z.string().uuid();
const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
const createPostSchema = z.object({
  caption: z.string().trim().min(1).max(5_000),
  imageUrl: z.string().trim().url().max(2_048).nullable().optional(),
});

const postRowSelection = {
  id: postsTable.id,
  authorId: postsTable.authorId,
  caption: postsTable.caption,
  imageUrl: postsTable.imageUrl,
  createdAt: postsTable.createdAt,
  updatedAt: postsTable.updatedAt,
  authorName: membersTable.name,
  authorTitle: membersTable.title,
  authorCompany: membersTable.company,
  authorChapter: membersTable.chapter,
  authorProfilePictureUrl: membersTable.profilePictureUrl,
  shareCount: count(sharesTable.id),
};

const postGroupByColumns = [
  postsTable.id,
  postsTable.authorId,
  postsTable.caption,
  postsTable.imageUrl,
  postsTable.createdAt,
  postsTable.updatedAt,
  membersTable.name,
  membersTable.title,
  membersTable.company,
  membersTable.chapter,
  membersTable.profilePictureUrl,
] as const;

interface PostRow {
  id: string;
  authorId: string;
  caption: string;
  imageUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
  authorName: string;
  authorTitle: string;
  authorCompany: string;
  authorChapter: string;
  authorProfilePictureUrl: string | null;
  shareCount: number;
}

function serializePost(row: PostRow) {
  return {
    id: row.id,
    caption: row.caption,
    imageUrl: row.imageUrl,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    author: {
      id: row.authorId,
      name: row.authorName,
      title: row.authorTitle,
      company: row.authorCompany,
      chapter: row.authorChapter,
      profilePictureUrl: row.authorProfilePictureUrl,
    },
    shareCount: Number(row.shareCount),
  };
}

function parseId(value: unknown, resource: "post" | "member"): string {
  const parsedId = uuidSchema.safeParse(value);

  if (!parsedId.success) {
    throw new HttpError(400, `A valid ${resource} ID is required.`);
  }

  return parsedId.data;
}

function buildPagination(page: number, limit: number, total: number) {
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

async function findVisiblePost(postId: string) {
  const [row] = await db
    .select(postRowSelection)
    .from(postsTable)
    .innerJoin(membersTable, eq(postsTable.authorId, membersTable.id))
    .leftJoin(sharesTable, eq(sharesTable.postId, postsTable.id))
    .where(
      and(
        eq(postsTable.id, postId),
        eq(membersTable.status, "active"),
      ),
    )
    .groupBy(...postGroupByColumns)
    .limit(1);

  return row ? serializePost(row) : undefined;
}

router.post("/posts", requireAuth, async (request, response, next) => {
  try {
    const input = createPostSchema.parse(request.body);
    const [createdPost] = await db
      .insert(postsTable)
      .values({
        authorId: request.user!.id,
        caption: input.caption,
        imageUrl: input.imageUrl ?? null,
      })
      .returning({ id: postsTable.id });

    const post = await findVisiblePost(createdPost.id);
    if (!post) {
      throw new HttpError(500, "The post was created but could not be loaded.");
    }

    response.status(201).json({ post });
  } catch (error) {
    next(error);
  }
});

router.get("/posts/feed", requireAuth, async (request, response, next) => {
  try {
    const { page, limit } = paginationSchema.parse(request.query);
    const offset = (page - 1) * limit;
    const [rows, totals] = await Promise.all([
      db
        .select(postRowSelection)
        .from(postsTable)
        .innerJoin(membersTable, eq(postsTable.authorId, membersTable.id))
        .leftJoin(sharesTable, eq(sharesTable.postId, postsTable.id))
        .where(eq(membersTable.status, "active"))
        .groupBy(...postGroupByColumns)
        .orderBy(desc(postsTable.createdAt), desc(postsTable.id))
        .limit(limit)
        .offset(offset),
      db
        .select({ total: count(postsTable.id) })
        .from(postsTable)
        .innerJoin(membersTable, eq(postsTable.authorId, membersTable.id))
        .where(eq(membersTable.status, "active")),
    ]);

    const total = totals[0]?.total ?? 0;
    response.json({
      posts: rows.map(serializePost),
      pagination: buildPagination(page, limit, total),
    });
  } catch (error) {
    next(error);
  }
});

router.get("/posts/:id", requireAuth, async (request, response, next) => {
  try {
    const postId = parseId(request.params.id, "post");
    const post = await findVisiblePost(postId);

    if (!post) {
      throw new HttpError(404, "Post not found.");
    }

    response.json({ post });
  } catch (error) {
    next(error);
  }
});

router.delete("/posts/:id", requireAuth, async (request, response, next) => {
  try {
    const postId = parseId(request.params.id, "post");
    const [post] = await db
      .select({ authorId: postsTable.authorId })
      .from(postsTable)
      .where(eq(postsTable.id, postId))
      .limit(1);

    if (!post) {
      throw new HttpError(404, "Post not found.");
    }

    if (post.authorId !== request.user!.id) {
      throw new HttpError(403, "You can only delete your own posts.");
    }

    const [deletedPost] = await db
      .delete(postsTable)
      .where(
        and(
          eq(postsTable.id, postId),
          eq(postsTable.authorId, request.user!.id),
        ),
      )
      .returning({ id: postsTable.id });

    if (!deletedPost) {
      throw new HttpError(404, "Post not found.");
    }

    response.status(204).send();
  } catch (error) {
    next(error);
  }
});

router.get(
  "/members/:id/posts",
  requireAuth,
  async (request, response, next) => {
    try {
      const memberId = parseId(request.params.id, "member");
      const { page, limit } = paginationSchema.parse(request.query);
      const offset = (page - 1) * limit;

      const [member] = await db
        .select({
          id: membersTable.id,
          name: membersTable.name,
          title: membersTable.title,
          company: membersTable.company,
          chapter: membersTable.chapter,
          profilePictureUrl: membersTable.profilePictureUrl,
        })
        .from(membersTable)
        .where(
          and(
            eq(membersTable.id, memberId),
            eq(membersTable.status, "active"),
          ),
        )
        .limit(1);

      if (!member) {
        throw new HttpError(404, "Member not found.");
      }

      const [rows, totals] = await Promise.all([
        db
          .select(postRowSelection)
          .from(postsTable)
          .innerJoin(membersTable, eq(postsTable.authorId, membersTable.id))
          .leftJoin(sharesTable, eq(sharesTable.postId, postsTable.id))
          .where(
            and(
              eq(postsTable.authorId, memberId),
              eq(membersTable.status, "active"),
            ),
          )
          .groupBy(...postGroupByColumns)
          .orderBy(desc(postsTable.createdAt), desc(postsTable.id))
          .limit(limit)
          .offset(offset),
        db
          .select({ total: count(postsTable.id) })
          .from(postsTable)
          .where(eq(postsTable.authorId, memberId)),
      ]);

      const total = totals[0]?.total ?? 0;
      response.json({
        member,
        posts: rows.map(serializePost),
        pagination: buildPagination(page, limit, total),
      });
    } catch (error) {
      next(error);
    }
  },
);

export default router;