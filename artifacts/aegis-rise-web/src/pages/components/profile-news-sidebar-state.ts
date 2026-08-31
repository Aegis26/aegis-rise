import type { NewsArticle, NewsResponse } from "@workspace/api-client-react";

export const NEWS_ARTICLE_LINK_ATTRIBUTES = {
  target: "_blank",
  rel: "noopener noreferrer",
} as const;

type SidebarVariant = "primary" | "alternative";

type SidebarInput = {
  variant: SidebarVariant;
  data?: NewsResponse;
  isLoading: boolean;
  isError: boolean;
};

export function getProfileNewsSidebarState({
  variant,
  data,
  isLoading,
  isError,
}: SidebarInput): {
  title: string;
  description: string;
  articles: NewsArticle[];
  state: "loading" | "error" | "choose_interests" | "empty" | "articles";
} {
  const title = variant === "primary" ? "Top Stories" : "More for You";
  const description =
    variant === "primary"
      ? "Leading stories across your interests."
      : "More recent coverage selected for you.";
  const articles =
    variant === "primary"
      ? data?.articles ?? []
      : data?.alternativeArticles ?? [];

  if (isLoading) {
    return { title, description, articles, state: "loading" };
  }
  if (isError) {
    return { title, description, articles, state: "error" };
  }
  if (!data?.categories.length) {
    return { title, description, articles, state: "choose_interests" };
  }
  if (articles.length === 0) {
    return { title, description, articles, state: "empty" };
  }
  return { title, description, articles, state: "articles" };
}