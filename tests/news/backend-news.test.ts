import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { HttpError } from "../../artifacts/api-server/src/utils/errors.ts";
import {
  buildNewsQuery,
  interestQueries,
  normalizeArticles,
  resolveNews,
  type NewsArticle,
  type NewsCacheEntry,
  type NewsInterest,
} from "../../artifacts/api-server/src/routes/news.ts";

const now = new Date("2026-08-31T12:00:00.000Z");

function article(index: number): NewsArticle {
  return {
    title: `Article ${index}`,
    source: "Aegis News",
    publishedAt: new Date(now.getTime() - index * 1_000).toISOString(),
    url: `https://example.com/articles/${index}`,
    thumbnailUrl: `https://example.com/images/${index}.jpg`,
  };
}

function dependencies(options: {
  cached?: NewsCacheEntry;
  providerArticles?: NewsArticle[];
  providerError?: Error;
}) {
  const saved: Array<{
    cacheKey: string;
    articles: NewsArticle[];
    fetchedAt: Date;
  }> = [];
  let fetchCount = 0;
  let providerErrorCount = 0;

  return {
    saved,
    get fetchCount() {
      return fetchCount;
    },
    get providerErrorCount() {
      return providerErrorCount;
    },
    resolver: {
      now: () => now,
      getCached: async () => options.cached,
      saveCached: async (
        cacheKey: string,
        articles: NewsArticle[],
        fetchedAt: Date,
      ) => {
        saved.push({ cacheKey, articles, fetchedAt });
      },
      fetchArticles: async () => {
        fetchCount += 1;
        if (options.providerError) {
          throw options.providerError;
        }
        return options.providerArticles ?? [];
      },
      onProviderError: () => {
        providerErrorCount += 1;
      },
    },
  };
}

describe("personalized news backend", () => {
  it("serves live provider results and refreshes the cache", async () => {
    const harness = dependencies({
      providerArticles: Array.from({ length: 12 }, (_, index) => article(index)),
    });

    const result = await resolveNews(["business"], harness.resolver);

    assert.equal(result.cacheStatus, "live");
    assert.equal(result.servedFromCache, false);
    assert.equal(result.articles.length, 6);
    assert.equal(result.alternativeArticles.length, 6);
    assert.equal(harness.fetchCount, 1);
    assert.equal(harness.saved.length, 1);
    assert.equal(harness.saved[0]?.cacheKey, "business");
  });

  it("serves a fresh cache without calling the provider", async () => {
    const harness = dependencies({
      cached: {
        articles: [article(1)],
        fetchedAt: new Date(now.getTime() - 10 * 60 * 1_000),
      },
      providerError: new Error("provider must not run"),
    });

    const result = await resolveNews(["construction"], harness.resolver);

    assert.equal(result.cacheStatus, "fresh_cache");
    assert.equal(result.servedFromCache, true);
    assert.equal(harness.fetchCount, 0);
    assert.equal(harness.saved.length, 0);
  });

  it("serves stale cached articles when the provider fails", async () => {
    const harness = dependencies({
      cached: {
        articles: [article(2)],
        fetchedAt: new Date(now.getTime() - 31 * 60 * 1_000),
      },
      providerError: new Error("provider unavailable"),
    });

    const result = await resolveNews(["travel"], harness.resolver);

    assert.equal(result.cacheStatus, "stale_fallback");
    assert.equal(result.servedFromCache, true);
    assert.equal(result.articles[0]?.url, article(2).url);
    assert.equal(harness.fetchCount, 1);
    assert.equal(harness.providerErrorCount, 1);
  });

  it("returns an empty live response without cache or provider work", async () => {
    const harness = dependencies({
      providerError: new Error("provider must not run"),
    });

    const result = await resolveNews([], harness.resolver);

    assert.deepEqual(result.categories, []);
    assert.deepEqual(result.articles, []);
    assert.deepEqual(result.alternativeArticles, []);
    assert.equal(result.cacheStatus, "live");
    assert.equal(result.fetchedAt, null);
    assert.equal(harness.fetchCount, 0);
  });

  it("returns a stable 502 when no cache can cover provider failure", async () => {
    const harness = dependencies({
      providerError: new Error("provider unavailable"),
    });

    await assert.rejects(
      resolveNews(["politics"], harness.resolver),
      (error) =>
        error instanceof HttpError &&
        error.statusCode === 502 &&
        error.message === "News is temporarily unavailable.",
    );
    assert.equal(harness.providerErrorCount, 1);
  });

  it("normalizes only unique safe HTTP articles", () => {
    const normalized = normalizeArticles([
      {
        title: "  Safe story  ",
        source: { name: "  Publisher  " },
        publishedAt: "2026-08-31T10:00:00Z",
        url: "https://example.com/safe",
        urlToImage: "https://example.com/safe.jpg",
      },
      {
        title: "Duplicate",
        source: null,
        publishedAt: "2026-08-31T10:00:00Z",
        url: "https://example.com/safe",
      },
      {
        title: "Unsafe",
        publishedAt: "2026-08-31T10:00:00Z",
        url: "javascript:alert(1)",
      },
      {
        title: "Bad thumbnail",
        publishedAt: "2026-08-31T10:00:00Z",
        url: "http://example.com/no-image",
        urlToImage: "data:image/png;base64,unsafe",
      },
      {
        title: "",
        publishedAt: "not-a-date",
        url: "https://example.com/invalid",
      },
    ]);

    assert.deepEqual(normalized, [
      {
        title: "Safe story",
        source: "Publisher",
        publishedAt: "2026-08-31T10:00:00.000Z",
        url: "https://example.com/safe",
        thumbnailUrl: "https://example.com/safe.jpg",
      },
      {
        title: "Bad thumbnail",
        source: "News",
        publishedAt: "2026-08-31T10:00:00.000Z",
        url: "http://example.com/no-image",
        thumbnailUrl: null,
      },
    ]);
  });

  it("keeps the all-14-interest provider query below 500 characters", () => {
    const allInterests = Object.keys(interestQueries) as NewsInterest[];
    const query = buildNewsQuery(allInterests);

    assert.equal(allInterests.length, 14);
    assert.ok(query.length < 500, `Expected query below 500 chars, got ${query.length}`);
  });
});