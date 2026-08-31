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

export const interestQueries = {
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

export type NewsInterest = keyof typeof interestQueries;

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

export type NewsArticle = {
  title: string;
  source: string;
  publishedAt: string;
  url: string;
  thumbnailUrl: string | null;
};

export type NewsCacheEntry = {
  articles: NewsArticle[];
  fetchedAt: Date;
};

export function normalizeArticles(value: unknown): NewsArticle[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const seenUrls = new Set<string>();
  const articles: NewsArticle[] = [];

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

export function getCacheKey(categories: NewsInterest[]): string {
  return categories.join("|");
}

export function toNewsResponse(
  articles: NewsArticle[],
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

export function buildNewsQuery(categories: NewsInterest[]): string {
  return categories
    .map((category) => `(${interestQueries[category]})`)
    .join(" OR ");
}

async function fetchNewsArticles(
  categories: NewsInterest[],
  apiKey: string,
): Promise<NewsArticle[]> {
  const query = buildNewsQuery(categories);
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

type NewsResolverDependencies = {
  getCached: (cacheKey: string) => Promise<NewsCacheEntry | undefined>;
  saveCached: (
    cacheKey: string,
    articles: NewsArticle[],
    fetchedAt: Date,
  ) => Promise<void>;
  fetchArticles: (categories: NewsInterest[]) => Promise<NewsArticle[]>;
  onProviderError?: (error: unknown) => void;
  now?: () => Date;
};

export async function resolveNews(
  categories: NewsInterest[],
  dependencies: NewsResolverDependencies,
) {
  if (categories.length === 0) {
    return toNewsResponse([], [], "live", null);
  }

  const cacheKey = getCacheKey(categories);
  const cached = await dependencies.getCached(cacheKey);
  const getCurrentTime = dependencies.now ?? (() => new Date());
  const currentTime = getCurrentTime();

  if (
    cached &&
    currentTime.getTime() - cached.fetchedAt.getTime() < CACHE_TTL_MS
  ) {
    return toNewsResponse(
      cached.articles,
      categories,
      "fresh_cache",
      cached.fetchedAt,
    );
  }

  try {
    const articles = await dependencies.fetchArticles(categories);
    const fetchedAt = getCurrentTime();
    await dependencies.saveCached(cacheKey, articles, fetchedAt);
    return toNewsResponse(articles, categories, "live", fetchedAt);
  } catch (error) {
    dependencies.onProviderError?.(error);
    if (cached) {
      return toNewsResponse(
        cached.articles,
        categories,
        "stale_fallback",
        cached.fetchedAt,
      );
    }
    throw error instanceof HttpError
      ? error
      : new HttpError(502, "News is temporarily unavailable.");
  }
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
    const apiKey = process.env.NEWS_API_KEY?.trim();
    const responseData = await resolveNews(categories, {
      getCached: async (cacheKey) => {
        const [cached] = await db
          .select()
          .from(newsArticleCacheTable)
          .where(eq(newsArticleCacheTable.cacheKey, cacheKey))
          .limit(1);
        return cached;
      },
      saveCached: async (cacheKey, articles, fetchedAt) => {
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
      },
      fetchArticles: async (requestedCategories) => {
        if (!apiKey) {
          throw new HttpError(502, "News is temporarily unavailable.");
        }
        return fetchNewsArticles(requestedCategories, apiKey);
      },
      onProviderError: (error) => {
        request.log.warn(
          { err: error, categoryCount: categories.length },
          "News provider unavailable; using cached articles when available",
        );
      },
    });

    response.json(responseData);
  } catch (error) {
    next(error);
  }
});

export default router;