import { eq } from "drizzle-orm";
import { Router, type IRouter } from "express";
import { GetNewsResponse } from "@workspace/api-zod";
import { db, membersTable, newsArticleCacheTable } from "../db";
import { requireAuth } from "../middleware/auth";
import { HttpError } from "../utils/errors";

const router: IRouter = Router();
const CACHE_TTL_MS = 30 * 60 * 1_000;
const ARTICLES_PER_SIDEBAR = 6;
const RESPONSE_ARTICLE_LIMIT = ARTICLES_PER_SIDEBAR * 2;
const PROVIDER_PAGE_SIZE = 30;

const interestQueries = {
  business: "business",
  construction: "construction",
  real_estate: '"real estate"',
  cooking: "cooking",
  entertainment: "entertainment",
  politics: "politics",
  world_news: '"world news"',
  health_wellness: '"health wellness"',
  cybersecurity_it: "cybersecurity",
  general_contractor: '"general contractor"',
  travel: "travel",
  stock_market: '"stock market"',
  financial: "finance",
  diy: "DIY",
} as const;

type NewsInterest = keyof typeof interestQueries;

type NewsApiArticle = {
  title?: unknown;
  source?: { name?: unknown } | null;
  publishedAt?: unknown;
  url?: unknown;
  urlToImage?: unknown;
};

function isSafeHttpUrl(value: unknown): value is string {
  if (typeof value !== "string" || value.length > 2_048) {
    return false;
  }

  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function normalizeArticles(value: unknown): Array<{
  title: string;
  source: string;
  publishedAt: string;
  url: string;
  thumbnailUrl: string | null;
}> {
  if (!Array.isArray(value)) {
    return [];
  }

  const seenUrls = new Set<string>();
  const articles: Array<{
    title: string;
    source: string;
    publishedAt: string;
    url: string;
    thumbnailUrl: string | null;
  }> = [];

  for (const candidate of value as NewsApiArticle[]) {
    const title =
      typeof candidate.title === "string" ? candidate.title.trim() : "";
    const publishedAt =
      typeof candidate.publishedAt === "string" ? candidate.publishedAt : "";
    const url = candidate.url;

    if (
      !title ||
      !publishedAt ||
      Number.isNaN(Date.parse(publishedAt)) ||
      !isSafeHttpUrl(url) ||
      seenUrls.has(url)
    ) {
      continue;
    }

    seenUrls.add(url);
    articles.push({
      title,
      source:
        typeof candidate.source?.name === "string" &&
        candidate.source.name.trim()
          ? candidate.source.name.trim()
          : "News",
      publishedAt: new Date(publishedAt).toISOString(),
      url,
      thumbnailUrl: isSafeHttpUrl(candidate.urlToImage)
        ? candidate.urlToImage
        : null,
    });

    if (articles.length === PROVIDER_PAGE_SIZE) {
      break;
    }
  }

  return articles;
}

function getCacheKey(categories: NewsInterest[]): string {
  return categories.join("|");
}

function toNewsResponse(
  articles: Array<{
    title: string;
    source: string;
    publishedAt: string;
    url: string;
    thumbnailUrl: string | null;
  }>,
  categories: NewsInterest[],
  cacheStatus: "live" | "fresh_cache" | "stale_fallback",
  fetchedAt: Date | null,
) {
  const primaryArticles = articles.slice(0, ARTICLES_PER_SIDEBAR);
  const alternativeArticles = articles.slice(
    ARTICLES_PER_SIDEBAR,
    RESPONSE_ARTICLE_LIMIT,
  );

  return GetNewsResponse.parse({
    articles: primaryArticles,
    alternativeArticles,
    categories,
    servedFromCache: cacheStatus !== "live",
    cacheStatus,
    fetchedAt,
  });
}

async function fetchNewsArticles(
  categories: NewsInterest[],
  apiKey: string,
): Promise<ReturnType<typeof normalizeArticles>> {
  const query = categories
    .map((category) => `(${interestQueries[category]})`)
    .join(" OR ");
  const searchParams = new URLSearchParams({
    q: query,
    language: "en",
    sortBy: "publishedAt",
    pageSize: String(PROVIDER_PAGE_SIZE),
  });

  const response = await fetch(
    `https://newsapi.org/v2/everything?${searchParams.toString()}`,
    {
      headers: {
        Accept: "application/json",
        "X-Api-Key": apiKey,
      },
      signal: AbortSignal.timeout(10_000),
    },
  );

  if (!response.ok) {
    throw new Error(`News provider returned ${response.status}.`);
  }

  const payload = (await response.json()) as {
    status?: unknown;
    articles?: unknown;
  };
  if (payload.status !== "ok") {
    throw new Error("News provider returned an unsuccessful response.");
  }

  return normalizeArticles(payload.articles);
}

router.get("/news", requireAuth, async (request, response, next): Promise<void> => {
  try {
    const [member] = await db
      .select({ newsInterests: membersTable.newsInterests })
      .from(membersTable)
      .where(eq(membersTable.id, request.user!.id))
      .limit(1);

    if (!member) {
      throw new HttpError(404, "Member not found.");
    }

    const categories = Array.from(
      new Set(
        member.newsInterests.filter(
          (interest): interest is NewsInterest => interest in interestQueries,
        ),
      ),
    );
    if (categories.length === 0) {
      response.json(toNewsResponse([], [], "live", null));
      return;
    }

    const cacheKey = getCacheKey(categories);
    const [cached] = await db
      .select()
      .from(newsArticleCacheTable)
      .where(eq(newsArticleCacheTable.cacheKey, cacheKey))
      .limit(1);
    const now = Date.now();

    if (cached && now - cached.fetchedAt.getTime() < CACHE_TTL_MS) {
      response.json(
        toNewsResponse(
          cached.articles,
          categories,
          "fresh_cache",
          cached.fetchedAt,
        ),
      );
      return;
    }

    const apiKey = process.env.NEWS_API_KEY?.trim();
    if (!apiKey) {
      if (cached) {
        response.json(
          toNewsResponse(
            cached.articles,
            categories,
            "stale_fallback",
            cached.fetchedAt,
          ),
        );
        return;
      }
      throw new HttpError(502, "News is temporarily unavailable.");
    }

    try {
      const articles = await fetchNewsArticles(categories, apiKey);
      const fetchedAt = new Date();

      await db
        .insert(newsArticleCacheTable)
        .values({
          cacheKey,
          articles,
          fetchedAt,
          updatedAt: fetchedAt,
        })
        .onConflictDoUpdate({
          target: newsArticleCacheTable.cacheKey,
          set: {
            articles,
            fetchedAt,
            updatedAt: fetchedAt,
          },
        });

      response.json(
        toNewsResponse(articles, categories, "live", fetchedAt),
      );
    } catch (error) {
      request.log.warn(
        { err: error, categoryCount: categories.length },
        "News provider unavailable; using cached articles when available",
      );

      if (cached) {
        response.json(
          toNewsResponse(
            cached.articles,
            categories,
            "stale_fallback",
            cached.fetchedAt,
          ),
        );
        return;
      }

      throw new HttpError(502, "News is temporarily unavailable.");
    }
  } catch (error) {
    next(error);
  }
});

export default router;