import { useGetNews, getGetNewsQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import { ArrowUpRight, Newspaper } from "lucide-react";

type ProfileNewsSidebarProps = {
  variant: "primary" | "alternative";
};

export function ProfileNewsSidebar({ variant }: ProfileNewsSidebarProps) {
  const { data, isLoading, isError } = useGetNews({
    query: {
      queryKey: getGetNewsQueryKey(),
      staleTime: 30 * 60 * 1000,
      refetchInterval: 30 * 60 * 1000,
    },
  });
  const title = variant === "primary" ? "Top Stories" : "More for You";
  const description =
    variant === "primary"
      ? "Leading stories across your interests."
      : "More recent coverage selected for you.";

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Newspaper className="h-5 w-5 text-primary" />
            {title}
          </CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="flex gap-3">
              <Skeleton className="h-14 w-14 rounded-lg shrink-0" />
              <div className="space-y-2 flex-1 pt-1">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-3 w-2/3" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (isError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Newspaper className="h-5 w-5 text-primary" />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Unable to load news at this time.</p>
        </CardContent>
      </Card>
    );
  }

  const articles =
    variant === "primary"
      ? data?.articles ?? []
      : data?.alternativeArticles ?? [];
  const hasPreferences = Boolean(data?.categories.length);

  return (
    <Card data-testid={`news-sidebar-${variant}`}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Newspaper className="h-5 w-5 text-primary" />
          {title}
        </CardTitle>
        <CardDescription>
          {hasPreferences ? description : "Choose topics to build your feed."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!hasPreferences ? (
          <div className="space-y-3 rounded-lg border border-dashed border-border p-4">
            <p className="text-sm text-muted-foreground">
              Select your interests in Profile Settings to see personalized
              stories here.
            </p>
            <Link
              href="/profile/settings"
              className="text-sm font-medium text-primary hover:underline"
            >
              Choose news interests
            </Link>
          </div>
        ) : articles.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No recent articles matched your interests. Check back soon.
          </p>
        ) : (
          <div className="flex flex-col gap-1">
            {articles.map((article, idx) => (
              <a 
                key={`${article.url}-${idx}`}
                href={article.url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="group flex gap-3 p-3 -mx-3 rounded-xl hover:bg-muted/50 transition-all active:scale-[0.98]"
              >
                {article.thumbnailUrl ? (
                  <img 
                    src={article.thumbnailUrl} 
                    alt="" 
                    className="h-14 w-14 object-cover rounded-lg bg-muted shrink-0 border border-border/50 shadow-sm"
                    loading="lazy"
                  />
                ) : (
                  <div className="h-14 w-14 rounded-lg bg-muted flex items-center justify-center shrink-0 border border-border/50 shadow-sm">
                    <Newspaper className="h-6 w-6 text-muted-foreground/50" />
                  </div>
                )}
                <div className="flex flex-col gap-1.5 flex-1 justify-center">
                  <h4 className="text-sm font-semibold leading-snug line-clamp-2 text-foreground group-hover:text-primary transition-colors">
                    {article.title}
                  </h4>
                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground uppercase tracking-wider font-medium">
                    <span className="truncate max-w-[80px] sm:max-w-[120px]">{article.source}</span>
                    <span className="w-1 h-1 rounded-full bg-border shrink-0"></span>
                    <time dateTime={article.publishedAt} className="shrink-0">{new Date(article.publishedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</time>
                  </div>
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-primary">
                    Read more
                    <ArrowUpRight className="h-3 w-3" aria-hidden="true" />
                  </span>
                </div>
              </a>
            ))}
          </div>
        )}
        {data?.cacheStatus === "stale_fallback" && articles.length > 0 && (
          <p className="mt-3 border-t border-border pt-3 text-xs text-muted-foreground">
            Showing the latest saved stories while the news service refreshes.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
