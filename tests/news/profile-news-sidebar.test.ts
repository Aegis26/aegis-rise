import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { NewsArticle, NewsResponse } from "@workspace/api-client-react";
import {
  getProfileNewsSidebarState,
  NEWS_ARTICLE_LINK_ATTRIBUTES,
} from "../../artifacts/aegis-rise-web/src/pages/components/profile-news-sidebar-state.ts";

function article(index: number): NewsArticle {
  return {
    title: `Story ${index}`,
    source: "Aegis News",
    publishedAt: "2026-08-31T10:00:00.000Z",
    url: `https://example.com/story/${index}`,
    thumbnailUrl: null,
  };
}

function response(overrides: Partial<NewsResponse> = {}): NewsResponse {
  return {
    articles: [article(1), article(2)],
    alternativeArticles: [article(3), article(4)],
    categories: ["business"],
    servedFromCache: false,
    cacheStatus: "live",
    fetchedAt: "2026-08-31T10:00:00.000Z",
    ...overrides,
  };
}

describe("profile news sidebars", () => {
  it("keeps primary and alternative sidebars distinct", () => {
    const data = response();
    const primary = getProfileNewsSidebarState({
      variant: "primary",
      data,
      isLoading: false,
      isError: false,
    });
    const alternative = getProfileNewsSidebarState({
      variant: "alternative",
      data,
      isLoading: false,
      isError: false,
    });

    assert.equal(primary.title, "Top Stories");
    assert.equal(alternative.title, "More for You");
    assert.deepEqual(
      primary.articles.map(({ url }) => url),
      ["https://example.com/story/1", "https://example.com/story/2"],
    );
    assert.deepEqual(
      alternative.articles.map(({ url }) => url),
      ["https://example.com/story/3", "https://example.com/story/4"],
    );
    assert.equal(
      new Set([...primary.articles, ...alternative.articles].map(({ url }) => url))
        .size,
      4,
    );
  });

  it("exposes loading before evaluating feed data", () => {
    const result = getProfileNewsSidebarState({
      variant: "primary",
      isLoading: true,
      isError: false,
    });

    assert.equal(result.state, "loading");
  });

  it("shows interest guidance when no interests are saved", () => {
    const result = getProfileNewsSidebarState({
      variant: "alternative",
      data: response({ categories: [], articles: [], alternativeArticles: [] }),
      isLoading: false,
      isError: false,
    });

    assert.equal(result.state, "choose_interests");
  });

  it("shows a no-results state when interests have no matching articles", () => {
    const result = getProfileNewsSidebarState({
      variant: "primary",
      data: response({ articles: [] }),
      isLoading: false,
      isError: false,
    });

    assert.equal(result.state, "empty");
  });

  it("opens every article in a protected new tab", () => {
    assert.deepEqual(NEWS_ARTICLE_LINK_ATTRIBUTES, {
      target: "_blank",
      rel: "noopener noreferrer",
    });
  });
});