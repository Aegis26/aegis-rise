import type { Member, NewsInterest } from "@workspace/api-client-react";

export function loadSavedNewsInterests(
  member: Pick<Member, "newsInterests">,
): NewsInterest[] {
  return [...member.newsInterests];
}