import type { SharePlatform } from "../db";

export const sharePlatforms = [
  "LinkedIn",
  "Instagram",
  "Facebook",
  "TikTok",
  "Direct Link",
] as const satisfies readonly SharePlatform[];

export interface ShareablePost {
  id: string;
  caption: string;
}

const platformNotes: Record<SharePlatform, string> = {
  LinkedIn: "Copy this text into your LinkedIn post.",
  Instagram: "Copy this text into your Instagram caption.",
  Facebook: "Copy this text into your Facebook post.",
  TikTok: "Copy this text into your TikTok caption.",
  "Direct Link": "Copy the link to share this post directly.",
};

export function formatShareText(
  post: ShareablePost,
  _platform: SharePlatform,
  _authorName: string,
  _chapterName: string,
  _postLink: string,
): string {
  return post.caption.trim();
}

export function getShareHashtags(_platform: SharePlatform): string {
  return "";
}

export function getShareNote(platform: SharePlatform): string {
  return platformNotes[platform];
}