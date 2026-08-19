import { Router, type IRouter, type Request } from "express";
import { and, asc, count, desc, eq, gte, sql } from "drizzle-orm";
import { z } from "zod/v4";
import {
  db,
  membersTable,
  postsTable,
  sharesTable,
  type SharePlatform,
} from "../db";
import { requireAdmin, requireAuth } from "../middleware/auth";
import {
  formatShareText,
  getShareHashtags,
  getShareNote,
  sharePlatforms,
} from "../lib/share-formatting";
import { findVisiblePost, paginationSchema, parseId } from "./posts";
import { HttpError } from "../utils/errors";

const router: IRouter = Router();
const shareInputSchema = z.object({
  platform: z.enum(sharePlatforms),
});
const previewPlatformSchema = z.enum(sharePlatforms);

function getPostLink(request: Request, postId: string): string {
  const configuredBaseUrl = process.env.APP_BASE_URL?.trim();
  if (configuredBaseUrl) {
    try {
      const baseUrl = new URL(configuredBaseUrl);
      if (!["http:", "https:"].includes(baseUrl.protocol)) {
        throw new Error("Unsupported URL protocol.");
      }
      if (baseUrl.toString().length > 1_024) {
        throw new Error("APP_BASE_URL is too long.");
      }

      const normalizedBaseUrl = baseUrl.toString().endsWith("/")
        ? baseUrl.toString()
        : `${baseUrl.toString()}/`;
      return new URL(
        `posts/${encodeURIComponent(postId)}`,
        normalizedBaseUrl,
      ).toString();
    } catch {
      throw new HttpError(
        500,
        "APP_BASE_URL must be a valid HTTP or HTTPS URL.",
      );
    }
  }

  if (process.env.NODE_ENV === "production") {
    throw new HttpError(
      500,
      "APP_BASE_URL must be configured to generate share previews in production.",
    );
  }

  const host = request.get("host");
  if (!host) {
    throw new HttpError(500, "A public post URL could not be generated.");
  }

  let requestUrl: URL;
  try {
    requestUrl = new URL(`http://${host}`);
  } catch {
    throw new HttpError(500, "A public post URL could not be generated.");
  }

  const configuredDevDomains = [
    process.env.REPLIT_DEV_DOMAIN,
    ...(process.env.REPLIT_DOMAINS?.split(",") ?? []),
  ]
    .filter(Boolean)
    .map((domain) => domain!.trim().toLowerCase());
  const allowedDevHosts = new Set([
    "localhost",
    "127.0.0.1",
    "::1",
    ...configuredDevDomains,
  ]);

  if (!allowedDevHosts.has(requestUrl.hostname.toLowerCase())) {
    throw new HttpError(500, "A public post URL could not be generated.");
  }

  const forwardedProtocol = request.header("x-forwarded-proto")?.split(",")[0];
  const protocol =
    forwardedProtocol?.trim() === "https" || request.protocol === "https"
      ? "https"
      : "http";
  return `${protocol}://${host}/posts/${encodeURIComponent(postId)}`;
}

function emptyPlatformBreakdown(): Record<SharePlatform, number> {
  return Object.fromEntries(
    sharePlatforms.map((platform) => [platform, 0]),
  ) as Record<SharePlatform, number>;
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

router.post(
  "/posts/:id/share",
  requireAuth,
  async (request, response, next) => {
    try {
      const postId = parseId(request.params.id, "post");
      const { platform } = shareInputSchema.parse(request.body);
      const post = await findVisiblePost(postId);

      if (!post) {
        throw new HttpError(404, "Post not found.");
      }

      await db.insert(sharesTable).values({
        postId,
        sharedById: request.user!.id,
        platform,
      });

      const [result] = await db
        .select({ shareCount: count(sharesTable.id) })
        .from(sharesTable)
        .where(eq(sharesTable.postId, postId));

      response.status(201).json({
        shareCount: Number(result?.shareCount ?? 0),
        message: "Shared successfully",
      });
    } catch (error) {
      next(error);
    }
  },
);

router.get(
  "/posts/:id/shares",
  requireAuth,
  async (request, response, next) => {
    try {
      const postId = parseId(request.params.id, "post");
      const post = await findVisiblePost(postId);

      if (!post) {
        throw new HttpError(404, "Post not found.");
      }

      const rows = await db
        .select({
          platform: sharesTable.platform,
          shareCount: count(sharesTable.id),
        })
        .from(sharesTable)
        .where(eq(sharesTable.postId, postId))
        .groupBy(sharesTable.platform);

      const byPlatform = emptyPlatformBreakdown();
      for (const row of rows) {
        byPlatform[row.platform] = Number(row.shareCount);
      }

      response.json({
        totalShares: Object.values(byPlatform).reduce(
          (total, value) => total + value,
          0,
        ),
        byPlatform,
      });
    } catch (error) {
      next(error);
    }
  },
);

router.get(
  "/members/me/shares",
  requireAuth,
  async (request, response, next) => {
    try {
      const { page, limit } = paginationSchema.parse(request.query);
      const offset = (page - 1) * limit;
      const filters = and(
        eq(sharesTable.sharedById, request.user!.id),
        eq(membersTable.status, "active"),
      );

      const [rows, totals] = await Promise.all([
        db
          .select({
            date: sharesTable.createdAt,
            platform: sharesTable.platform,
            postId: sharesTable.postId,
            postAuthor: membersTable.name,
            postCaption: postsTable.caption,
          })
          .from(sharesTable)
          .innerJoin(postsTable, eq(sharesTable.postId, postsTable.id))
          .innerJoin(membersTable, eq(postsTable.authorId, membersTable.id))
          .where(filters)
          .orderBy(desc(sharesTable.createdAt), desc(sharesTable.id))
          .limit(limit)
          .offset(offset),
        db
          .select({ total: count(sharesTable.id) })
          .from(sharesTable)
          .innerJoin(postsTable, eq(sharesTable.postId, postsTable.id))
          .innerJoin(membersTable, eq(postsTable.authorId, membersTable.id))
          .where(filters),
      ]);

      const total = Number(totals[0]?.total ?? 0);
      response.json({
        shares: rows,
        pagination: buildPagination(page, limit, total),
      });
    } catch (error) {
      next(error);
    }
  },
);

router.get(
  "/posts/:id/share-preview",
  requireAuth,
  async (request, response, next) => {
    try {
      const postId = parseId(request.params.id, "post");
      const post = await findVisiblePost(postId);

      if (!post) {
        throw new HttpError(404, "Post not found.");
      }

      const rawPlatform = request.query.platform;
      const platform =
        rawPlatform === undefined
          ? "Direct Link"
          : previewPlatformSchema.parse(rawPlatform);
      const postLink = getPostLink(request, postId);

      response.json({
        caption: formatShareText(
          post,
          platform,
          post.author.name,
          post.author.chapter,
          postLink,
        ),
        hashtags: getShareHashtags(platform),
        note: getShareNote(platform),
      });
    } catch (error) {
      next(error);
    }
  },
);

router.get(
  "/admin/analytics/shares",
  requireAdmin,
  async (_request, response, next) => {
    try {
      const now = new Date();
      const monthStart = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1),
      );
      const trendStart = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 29),
      );
      const dayExpression = sql<string>`to_char(date_trunc('day', ${sharesTable.createdAt} AT TIME ZONE 'UTC'), 'YYYY-MM-DD')`;

      const [
        totalRows,
        monthRows,
        topPostRows,
        topShaperRows,
        platformRows,
        trendRows,
      ] = await Promise.all([
        db.select({ totalShares: count(sharesTable.id) }).from(sharesTable),
        db
          .select({ sharesThisMonth: count(sharesTable.id) })
          .from(sharesTable)
          .where(gte(sharesTable.createdAt, monthStart)),
        db
          .select({
            postId: postsTable.id,
            postCaption: postsTable.caption,
            postAuthor: membersTable.name,
            shareCount: count(sharesTable.id),
          })
          .from(sharesTable)
          .innerJoin(postsTable, eq(sharesTable.postId, postsTable.id))
          .innerJoin(membersTable, eq(postsTable.authorId, membersTable.id))
          .groupBy(postsTable.id, postsTable.caption, membersTable.name)
          .orderBy(desc(count(sharesTable.id)), asc(postsTable.id))
          .limit(10),
        db
          .select({
            memberId: membersTable.id,
            name: membersTable.name,
            shareCount: count(sharesTable.id),
          })
          .from(sharesTable)
          .innerJoin(membersTable, eq(sharesTable.sharedById, membersTable.id))
          .groupBy(membersTable.id, membersTable.name)
          .orderBy(desc(count(sharesTable.id)), asc(membersTable.id))
          .limit(10),
        db
          .select({
            platform: sharesTable.platform,
            shareCount: count(sharesTable.id),
          })
          .from(sharesTable)
          .groupBy(sharesTable.platform),
        db
          .select({
            date: dayExpression,
            shareCount: count(sharesTable.id),
          })
          .from(sharesTable)
          .where(gte(sharesTable.createdAt, trendStart))
          .groupBy(dayExpression)
          .orderBy(asc(dayExpression)),
      ]);

      const sharesByPlatform = emptyPlatformBreakdown();
      for (const row of platformRows) {
        sharesByPlatform[row.platform] = Number(row.shareCount);
      }

      const trendByDate = new Map(
        trendRows.map((row) => [row.date, Number(row.shareCount)]),
      );
      const sharesTrend = Array.from({ length: 30 }, (_, index) => {
        const date = new Date(
          Date.UTC(
            now.getUTCFullYear(),
            now.getUTCMonth(),
            now.getUTCDate() - (29 - index),
          ),
        )
          .toISOString()
          .slice(0, 10);

        return {
          date,
          shareCount: trendByDate.get(date) ?? 0,
        };
      });

      response.json({
        totalShares: Number(totalRows[0]?.totalShares ?? 0),
        sharesThisMonth: Number(monthRows[0]?.sharesThisMonth ?? 0),
        topPostsShared: topPostRows.map((row) => ({
          ...row,
          shareCount: Number(row.shareCount),
        })),
        topSharingShapers: topShaperRows.map((row) => ({
          ...row,
          shareCount: Number(row.shareCount),
        })),
        sharesByPlatform,
        sharesTrend,
      });
    } catch (error) {
      next(error);
    }
  },
);

export default router;