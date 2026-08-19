import { Router, type IRouter } from "express";
import { sql } from "drizzle-orm";
import { z } from "zod/v4";
import { db, type SharePlatform } from "../../db";
import { requireAdmin } from "../../middleware/auth";
import { optionalChapterSchema, resolveChapterScope, truncateAdminCaption } from "./shared";

const router: IRouter = Router();
const analyticsQuerySchema = z.object({ chapter: optionalChapterSchema });
const sharePlatforms = [
  "LinkedIn",
  "Instagram",
  "Facebook",
  "TikTok",
  "Direct Link",
] as const satisfies readonly SharePlatform[];

function dayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function buildLastThirtyDays<T>(
  now: Date,
  values: Map<string, T>,
  emptyValue: (date: string) => T,
): T[] {
  return Array.from({ length: 30 }, (_, index) => {
    const date = new Date(
      Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate() - (29 - index),
      ),
    );
    const key = dayKey(date);
    return values.get(key) ?? emptyValue(key);
  });
}

router.get(
  "/admin/analytics/overview",
  requireAdmin,
  async (request, response, next) => {
    try {
      const { chapter: requestedChapter } = analyticsQuerySchema.parse(
        request.query,
      );
      const chapter = resolveChapterScope(request.user!, requestedChapter);
      const memberWhere = chapter
        ? sql`WHERE m.chapter = ${chapter}`
        : sql``;
      const postWhere = chapter
        ? sql`WHERE author.chapter = ${chapter}`
        : sql``;
      const shareCountExpression = chapter
        ? sql`count(s.id) FILTER (WHERE sharing_member.chapter = ${chapter})`
        : sql`count(s.id) FILTER (WHERE sharing_member.chapter = author.chapter)`;
      const now = new Date();
      const trendStart = new Date(
        Date.UTC(
          now.getUTCFullYear(),
          now.getUTCMonth(),
          now.getUTCDate() - 29,
        ),
      );
      const joinTrendWhere = chapter
        ? sql`WHERE m.chapter = ${chapter} AND m.created_at >= ${trendStart}`
        : sql`WHERE m.created_at >= ${trendStart}`;

      type MemberCountsRow = {
        total_members: number;
        active_members: number;
        pending_approvals: number;
        banned_members: number;
      };
      type ContentCountsRow = { total_posts: number; total_shares: number };
      type MostSharedRow = { id: string; caption: string; shares: number };
      type ContributorRow = {
        member_id: string;
        name: string;
        post_count: number;
        share_count: number;
      };
      type TrendRow = { date: string; members: number };

      const [
        memberCountsResult,
        contentCountsResult,
        mostSharedResult,
        topContributorResult,
        joinTrendResult,
      ] = await Promise.all([
        db.execute(sql<MemberCountsRow>`
          SELECT
            count(*)::int AS total_members,
            count(*) FILTER (WHERE m.status = 'active')::int AS active_members,
            count(*) FILTER (WHERE m.status = 'pending')::int AS pending_approvals,
            count(*) FILTER (WHERE m.status = 'banned')::int AS banned_members
          FROM members m
          ${memberWhere}
        `),
        db.execute(sql<ContentCountsRow>`
          SELECT
            count(DISTINCT p.id)::int AS total_posts,
            ${shareCountExpression}::int AS total_shares
          FROM posts p
          INNER JOIN members author ON author.id = p.author_id
          LEFT JOIN shares s ON s.post_id = p.id
          LEFT JOIN members sharing_member ON sharing_member.id = s.shared_by_id
          ${postWhere}
        `),
        db.execute(sql<MostSharedRow>`
          SELECT
            p.id,
            p.caption,
            ${shareCountExpression}::int AS shares
          FROM posts p
          INNER JOIN members author ON author.id = p.author_id
          LEFT JOIN shares s ON s.post_id = p.id
          LEFT JOIN members sharing_member ON sharing_member.id = s.shared_by_id
          ${postWhere}
          GROUP BY p.id, p.caption
          ORDER BY ${shareCountExpression} DESC, p.created_at DESC, p.id ASC
          LIMIT 1
        `),
        db.execute(sql<ContributorRow>`
          SELECT
            m.id AS member_id,
            m.name,
            (
              SELECT count(*)::int
              FROM posts member_posts
              WHERE member_posts.author_id = m.id
            ) AS post_count,
            (
              SELECT count(*)::int
              FROM shares member_shares
              INNER JOIN posts shared_posts ON shared_posts.id = member_shares.post_id
              INNER JOIN members shared_authors ON shared_authors.id = shared_posts.author_id
              WHERE
                member_shares.shared_by_id = m.id
                AND shared_authors.chapter = m.chapter
            ) AS share_count
          FROM members m
          ${memberWhere}
          ORDER BY
            (
              (SELECT count(*) FROM posts member_posts WHERE member_posts.author_id = m.id) +
              (
                SELECT count(*)
                FROM shares member_shares
                INNER JOIN posts shared_posts ON shared_posts.id = member_shares.post_id
                INNER JOIN members shared_authors ON shared_authors.id = shared_posts.author_id
                WHERE
                  member_shares.shared_by_id = m.id
                  AND shared_authors.chapter = m.chapter
              )
            ) DESC,
            m.created_at ASC,
            m.id ASC
          LIMIT 1
        `),
        db.execute(sql<TrendRow>`
          SELECT
            to_char(
              date_trunc('day', m.created_at AT TIME ZONE 'UTC'),
              'YYYY-MM-DD'
            ) AS date,
            count(*)::int AS members
          FROM members m
          ${joinTrendWhere}
          GROUP BY date
          ORDER BY date ASC
        `),
      ]);

      const memberCountsRows =
        memberCountsResult.rows as unknown as MemberCountsRow[];
      const contentCountsRows =
        contentCountsResult.rows as unknown as ContentCountsRow[];
      const mostSharedRows =
        mostSharedResult.rows as unknown as MostSharedRow[];
      const topContributorRows =
        topContributorResult.rows as unknown as ContributorRow[];
      const joinTrendRows = joinTrendResult.rows as unknown as TrendRow[];
      const memberCounts = memberCountsRows[0];
      const contentCounts = contentCountsRows[0];
      const mostShared = mostSharedRows[0];
      const topContributor = topContributorRows[0];
      const trendValues = new Map(
        joinTrendRows.map((row) => [
          row.date,
          { date: row.date, members: Number(row.members) },
        ]),
      );

      response.json({
        totalMembers: Number(memberCounts?.total_members ?? 0),
        activeMembers: Number(memberCounts?.active_members ?? 0),
        pendingApprovals: Number(memberCounts?.pending_approvals ?? 0),
        bannedMembers: Number(memberCounts?.banned_members ?? 0),
        totalPosts: Number(contentCounts?.total_posts ?? 0),
        totalShares: Number(contentCounts?.total_shares ?? 0),
        mostSharedPost: mostShared
          ? {
              id: mostShared.id,
              caption: truncateAdminCaption(mostShared.caption),
              shares: Number(mostShared.shares),
            }
          : null,
        topContributor: topContributor
          ? {
              memberId: topContributor.member_id,
              name: topContributor.name,
              postCount: Number(topContributor.post_count),
              shareCount: Number(topContributor.share_count),
            }
          : null,
        joinTrend: buildLastThirtyDays(
          now,
          trendValues,
          (date) => ({ date, members: 0 }),
        ),
      });
    } catch (error) {
      next(error);
    }
  },
);

router.get(
  "/admin/analytics/posts",
  requireAdmin,
  async (request, response, next) => {
    try {
      const { chapter: requestedChapter } = analyticsQuerySchema.parse(
        request.query,
      );
      const chapter = resolveChapterScope(request.user!, requestedChapter);
      const where = chapter
        ? sql`WHERE author.chapter = ${chapter}`
        : sql``;

      type PostRow = {
        id: string;
        caption: string;
        author: string;
        shares: number;
        image: string | null;
        created_at: Date;
      };
      const result = await db.execute(sql<PostRow>`
        SELECT
          p.id,
          p.caption,
          author.name AS author,
          count(s.id) FILTER (
            WHERE sharing_member.chapter = author.chapter
          )::int AS shares,
          p.image_url AS image,
          p.created_at
        FROM posts p
        INNER JOIN members author ON author.id = p.author_id
        LEFT JOIN shares s ON s.post_id = p.id
        LEFT JOIN members sharing_member ON sharing_member.id = s.shared_by_id
        ${where}
        GROUP BY p.id, p.caption, author.name, p.image_url, p.created_at
        ORDER BY
          count(s.id) FILTER (
            WHERE sharing_member.chapter = author.chapter
          ) DESC,
          p.created_at DESC,
          p.id ASC
        LIMIT 20
      `);

      response.json({
        posts: (result.rows as unknown as PostRow[]).map((row) => ({
          id: row.id,
          caption: truncateAdminCaption(row.caption),
          author: row.author,
          shares: Number(row.shares),
          image: row.image,
          createdAt: row.created_at,
        })),
      });
    } catch (error) {
      next(error);
    }
  },
);

router.get(
  "/admin/analytics/members",
  requireAdmin,
  async (request, response, next) => {
    try {
      const { chapter: requestedChapter } = analyticsQuerySchema.parse(
        request.query,
      );
      const chapter = resolveChapterScope(request.user!, requestedChapter);
      const where = chapter ? sql`WHERE m.chapter = ${chapter}` : sql``;

      type MemberRow = {
        member_id: string;
        name: string;
        chapter: string;
        posts_created: number;
        shares_received: number;
        shares_given: number;
      };
      const result = await db.execute(sql<MemberRow>`
        SELECT
          m.id AS member_id,
          m.name,
          m.chapter,
          (
            SELECT count(*)::int
            FROM posts member_posts
            WHERE member_posts.author_id = m.id
          ) AS posts_created,
          (
            SELECT count(*)::int
            FROM shares received_shares
            INNER JOIN posts received_posts
              ON received_posts.id = received_shares.post_id
            INNER JOIN members received_sharers
              ON received_sharers.id = received_shares.shared_by_id
            WHERE
              received_posts.author_id = m.id
              AND received_sharers.chapter = m.chapter
          ) AS shares_received,
          (
            SELECT count(*)::int
            FROM shares given_shares
            INNER JOIN posts given_posts
              ON given_posts.id = given_shares.post_id
            INNER JOIN members given_authors
              ON given_authors.id = given_posts.author_id
            WHERE
              given_shares.shared_by_id = m.id
              AND given_authors.chapter = m.chapter
          ) AS shares_given
        FROM members m
        ${where}
        ORDER BY
          (
            (SELECT count(*) FROM posts member_posts WHERE member_posts.author_id = m.id) +
            (
              SELECT count(*)
              FROM shares received_shares
              INNER JOIN posts received_posts
                ON received_posts.id = received_shares.post_id
              INNER JOIN members received_sharers
                ON received_sharers.id = received_shares.shared_by_id
              WHERE
                received_posts.author_id = m.id
                AND received_sharers.chapter = m.chapter
            ) +
            (
              SELECT count(*)
              FROM shares given_shares
              INNER JOIN posts given_posts
                ON given_posts.id = given_shares.post_id
              INNER JOIN members given_authors
                ON given_authors.id = given_posts.author_id
              WHERE
                given_shares.shared_by_id = m.id
                AND given_authors.chapter = m.chapter
            )
          ) DESC,
          m.created_at ASC,
          m.id ASC
        LIMIT 20
      `);

      response.json({
        members: (result.rows as unknown as MemberRow[]).map((row) => ({
          memberId: row.member_id,
          name: row.name,
          chapter: row.chapter,
          postsCreated: Number(row.posts_created),
          sharesReceived: Number(row.shares_received),
          sharesGiven: Number(row.shares_given),
        })),
      });
    } catch (error) {
      next(error);
    }
  },
);

router.get(
  "/admin/analytics/shares-timeline",
  requireAdmin,
  async (request, response, next) => {
    try {
      const { chapter: requestedChapter } = analyticsQuerySchema.parse(
        request.query,
      );
      const chapter = resolveChapterScope(request.user!, requestedChapter);
      const now = new Date();
      const trendStart = new Date(
        Date.UTC(
          now.getUTCFullYear(),
          now.getUTCMonth(),
          now.getUTCDate() - 29,
        ),
      );
      const where = chapter
        ? sql`WHERE author.chapter = ${chapter} AND sharing_member.chapter = ${chapter} AND s.created_at >= ${trendStart}`
        : sql`WHERE sharing_member.chapter = author.chapter AND s.created_at >= ${trendStart}`;

      type TimelineRow = {
        date: string;
        shares: number;
        posts_shared: number;
      };
      const result = await db.execute(sql<TimelineRow>`
        SELECT
          to_char(
            date_trunc('day', s.created_at AT TIME ZONE 'UTC'),
            'YYYY-MM-DD'
          ) AS date,
          count(s.id)::int AS shares,
          count(DISTINCT s.post_id)::int AS posts_shared
        FROM shares s
        INNER JOIN posts p ON p.id = s.post_id
        INNER JOIN members author ON author.id = p.author_id
        INNER JOIN members sharing_member ON sharing_member.id = s.shared_by_id
        ${where}
        GROUP BY date
        ORDER BY date ASC
      `);

      const timelineValues = new Map(
        (result.rows as unknown as TimelineRow[]).map((row) => [
          row.date,
          {
            date: row.date,
            shares: Number(row.shares),
            postsShared: Number(row.posts_shared),
          },
        ]),
      );

      response.json(
        buildLastThirtyDays(now, timelineValues, (date) => ({
          date,
          shares: 0,
          postsShared: 0,
        })),
      );
    } catch (error) {
      next(error);
    }
  },
);

router.get(
  "/admin/analytics/platforms",
  requireAdmin,
  async (request, response, next) => {
    try {
      const { chapter: requestedChapter } = analyticsQuerySchema.parse(
        request.query,
      );
      const chapter = resolveChapterScope(request.user!, requestedChapter);
      const where = chapter
        ? sql`WHERE author.chapter = ${chapter} AND sharing_member.chapter = ${chapter}`
        : sql`WHERE sharing_member.chapter = author.chapter`;

      type PlatformRow = { platform: SharePlatform; shares: number };
      const result = await db.execute(sql<PlatformRow>`
        SELECT s.platform, count(s.id)::int AS shares
        FROM shares s
        INNER JOIN posts p ON p.id = s.post_id
        INNER JOIN members author ON author.id = p.author_id
        INNER JOIN members sharing_member ON sharing_member.id = s.shared_by_id
        ${where}
        GROUP BY s.platform
      `);

      const counts = Object.fromEntries(
        sharePlatforms.map((platform) => [platform, 0]),
      ) as Record<SharePlatform, number>;
      for (const row of result.rows as unknown as PlatformRow[]) {
        counts[row.platform] = Number(row.shares);
      }
      const totalShares = Object.values(counts).reduce(
        (total, value) => total + value,
        0,
      );
      const percentages = Object.fromEntries(
        sharePlatforms.map((platform) => [
          platform,
          totalShares === 0
            ? 0
            : Number(((counts[platform] / totalShares) * 100).toFixed(2)),
        ]),
      ) as Record<SharePlatform, number>;

      response.json({ ...percentages, totalShares });
    } catch (error) {
      next(error);
    }
  },
);

export default router;