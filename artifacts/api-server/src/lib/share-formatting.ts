import type { SharePlatform } from "../db";
import { HttpError } from "../utils/errors";

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

const platformCharacterLimits: Record<SharePlatform, number> = {
  LinkedIn: 3_000,
  Instagram: 2_200,
  Facebook: 63_206,
  TikTok: 2_200,
  "Direct Link": 5_000,
};

const platformHashtags: Record<SharePlatform, string> = {
  LinkedIn: "#AegisRise #NetworkingWorks",
  Instagram: "#AegisRise",
  Facebook: "",
  TikTok: "",
  "Direct Link": "",
};

const platformNotes: Record<SharePlatform, string> = {
  LinkedIn: "Copy this text into your LinkedIn post.",
  Instagram: "Copy this text into your Instagram caption.",
  Facebook: "Copy this text into your Facebook post.",
  TikTok: "Copy this text into your TikTok caption.",
  "Direct Link": "Copy the link to share this post directly.",
};

function authorHandle(authorName: string): string {
  const handle = authorName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return handle || "aegis-rise-member";
}

function truncateToLimit(value: string, limit: number): string {
  if (value.length <= limit) {
    return value;
  }

  let truncated = "";
  for (const character of value) {
    if (truncated.length + character.length + 1 > limit) {
      break;
    }

    truncated += character;
  }

  return `${truncated}…`;
}

export function formatShareText(
  post: ShareablePost,
  platform: SharePlatform,
  authorName: string,
  chapterName: string,
  postLink: string,
): string {
  if (platform === "LinkedIn") {
    return post.caption.trim();
  }

  const shareLines = {
    LinkedIn: [
      `Shared from ${authorName} via Aegis Rise 🚀`,
      `${chapterName} - Connect. Collaborate. Grow.`,
      `Learn more: ${postLink}`,
      platformHashtags.LinkedIn,
    ],
    Instagram: [
      `Shared from @${authorHandle(authorName)} via Aegis Rise 🚀`,
      `${chapterName} ${platformHashtags.Instagram}`,
    ],
    Facebook: [
      `Shared from ${authorName} via Aegis Rise`,
      `Check out more from ${chapterName}: ${postLink}`,
    ],
    TikTok: [
      `Shared from ${authorName} via Aegis Rise 🚀`,
      chapterName,
    ],
    "Direct Link": [
      `View on Aegis Rise: ${postLink}`,
      chapterName,
    ],
  }[platform];

  const limit = platformCharacterLimits[platform];
  const suffix = shareLines.filter(Boolean).join("\n");
  if (suffix.length + 3 > limit) {
    throw new HttpError(
      500,
      `${platform} share preview configuration is too long.`,
    );
  }

  const captionBudget = limit - suffix.length - 2;

  const caption = truncateToLimit(post.caption.trim(), captionBudget);
  return caption ? `${caption}\n\n${suffix}` : suffix;
}

export function getShareHashtags(platform: SharePlatform): string {
  return platformHashtags[platform];
}

export function getShareNote(platform: SharePlatform): string {
  return platformNotes[platform];
}