import { and, eq } from "drizzle-orm";
import {
  db,
  socialAccountsTable,
  type SocialAccount,
  type SocialPlatform,
} from "../db";
import { formatShareText } from "./share-formatting";
import {
  getSocialProvider,
  refreshMetaAccessToken,
  refreshLinkedInAccessToken,
  type SupportedSocialPlatform,
} from "./social-oauth";
import {
  decryptSocialToken,
  encryptSocialToken,
} from "./social-token-crypto";
import { HttpError } from "../utils/errors";

export interface SocialPostInput {
  id: string;
  caption: string;
  imageUrl: string | null;
  authorName: string;
  chapterName: string;
  postLink: string;
}

export interface SocialPostOutcome {
  status: "success" | "error";
  externalUrl?: string;
  error?: string;
}

export type AutoPostResults = Partial<
  Record<SupportedSocialPlatform, SocialPostOutcome>
>;

interface ProviderResponse {
  id?: string;
}

function asSharePlatform(platform: SupportedSocialPlatform) {
  return (
    platform.charAt(0).toUpperCase() + platform.slice(1)
  ) as "Facebook" | "LinkedIn" | "Instagram";
}

async function providerFetch(
  url: string,
  options: RequestInit,
  label: string,
): Promise<{ body: ProviderResponse; response: Response }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    const body = (await response.json().catch(() => ({}))) as ProviderResponse & {
      error?: { message?: string };
      message?: string;
    };
    if (!response.ok) {
      const detail = body.error?.message ?? body.message;
      throw new Error(
        detail ? `${label} rejected the post: ${detail}` : `${label} rejected the post.`,
      );
    }
    return { body, response };
  } finally {
    clearTimeout(timeout);
  }
}

async function deactivateAccount(accountId: string) {
  await db
    .update(socialAccountsTable)
    .set({ isActive: false, updatedAt: new Date() })
    .where(eq(socialAccountsTable.id, accountId));
}

async function getUsableAccessToken(account: SocialAccount): Promise<string> {
  let accessToken: string;
  try {
    accessToken = decryptSocialToken(account.accessToken);
  } catch {
    await deactivateAccount(account.id);
    throw new Error("This social connection needs to be reconnected.");
  }

  const expiresSoon =
    account.expiresAt !== null &&
    account.expiresAt.getTime() <= Date.now() + 60_000;
  if (!expiresSoon) {
    return accessToken;
  }

  if (!account.refreshToken) {
    await deactivateAccount(account.id);
    throw new Error("This social connection has expired and needs to be reconnected.");
  }

  try {
    const provider = getSocialProvider(account.platform as SupportedSocialPlatform);
    const refreshToken = decryptSocialToken(account.refreshToken);
    let refreshed: {
      accessToken: string;
      refreshToken?: string;
      expiresAt?: Date;
    };
    let externalUserId = account.externalUserId;
    if (account.platform === "linkedin") {
      refreshed = await refreshLinkedInAccessToken(provider, refreshToken);
    } else {
      const metaRefresh = await refreshMetaAccessToken(
        provider,
        refreshToken,
        account.externalUserId,
      );
      refreshed = metaRefresh;
      externalUserId = metaRefresh.externalUserId;
    }
    await db
      .update(socialAccountsTable)
      .set({
        accessToken: encryptSocialToken(refreshed.accessToken),
        refreshToken: refreshed.refreshToken
          ? encryptSocialToken(refreshed.refreshToken)
          : account.refreshToken,
        externalUserId,
        expiresAt: refreshed.expiresAt ?? null,
        isActive: true,
        updatedAt: new Date(),
      })
      .where(eq(socialAccountsTable.id, account.id));
    return refreshed.accessToken;
  } catch (error) {
    if (error instanceof HttpError && error.statusCode >= 500) {
      throw error;
    }
    await deactivateAccount(account.id);
    throw new Error(
      `This ${account.platform} connection has expired and needs to be reconnected.`,
    );
  }
}

export async function postToSocial(
  account: SocialAccount,
  post: SocialPostInput,
): Promise<SocialPostOutcome> {
  const platform = account.platform as SupportedSocialPlatform;
  try {
    const accessToken = await getUsableAccessToken(account);
    const caption = formatShareText(
      { id: post.id, caption: post.caption },
      asSharePlatform(platform),
      post.authorName,
      post.chapterName,
      post.postLink,
    );

    if (platform === "facebook") {
      const body = new URLSearchParams({
        message: caption,
        link: post.postLink,
        access_token: accessToken,
      });
      const { body: response } = await providerFetch(
        `https://graph.facebook.com/v20.0/${encodeURIComponent(account.externalUserId)}/feed`,
        {
          method: "POST",
          headers: { "content-type": "application/x-www-form-urlencoded" },
          body,
        },
        "Facebook",
      );
      return {
        status: "success",
        externalUrl: response.id
          ? `https://www.facebook.com/${response.id}`
          : undefined,
      };
    }

    if (platform === "instagram") {
      if (!post.imageUrl) {
        throw new Error("Instagram requires a post image before it can be auto-posted.");
      }

      const mediaBody = new URLSearchParams({
        image_url: post.imageUrl,
        caption,
        access_token: accessToken,
      });
      const { body: container } = await providerFetch(
        `https://graph.facebook.com/v20.0/${encodeURIComponent(account.externalUserId)}/media`,
        {
          method: "POST",
          headers: { "content-type": "application/x-www-form-urlencoded" },
          body: mediaBody,
        },
        "Instagram",
      );
      if (!container.id) {
        throw new Error("Instagram did not create a media container.");
      }

      const publishBody = new URLSearchParams({
        creation_id: container.id,
        access_token: accessToken,
      });
      const { body: published } = await providerFetch(
        `https://graph.facebook.com/v20.0/${encodeURIComponent(account.externalUserId)}/media_publish`,
        {
          method: "POST",
          headers: { "content-type": "application/x-www-form-urlencoded" },
          body: publishBody,
        },
        "Instagram",
      );
      return {
        status: "success",
        externalUrl: published.id
          ? `https://www.instagram.com/p/${published.id}`
          : undefined,
      };
    }

    const { response } = await providerFetch(
      "https://api.linkedin.com/rest/posts",
      {
        method: "POST",
        headers: {
          authorization: `Bearer ${accessToken}`,
          "content-type": "application/json",
          "Linkedin-Version": process.env.LINKEDIN_API_VERSION?.trim() || "202501",
          "X-Restli-Protocol-Version": "2.0.0",
        },
        body: JSON.stringify({
          author: `urn:li:person:${account.externalUserId}`,
          commentary: caption,
          visibility: "PUBLIC",
          distribution: {
            feedDistribution: "MAIN_FEED",
            targetEntities: [],
            thirdPartyDistributionChannels: [],
          },
          lifecycleState: "PUBLISHED",
          isReshareDisabledByAuthor: false,
        }),
      },
      "LinkedIn",
    );
    return {
      status: "success",
      externalUrl: response.headers.get("x-restli-id") ?? undefined,
    };
  } catch (error) {
    return {
      status: "error",
      error:
        error instanceof Error
          ? error.message
          : "This social post could not be published.",
    };
  }
}

export async function autoPostToConnectedAccounts(
  memberId: string,
  platforms: readonly SocialPlatform[],
  post: SocialPostInput,
): Promise<AutoPostResults> {
  if (platforms.length === 0) {
    return {};
  }

  const accounts = await db
    .select()
    .from(socialAccountsTable)
    .where(
      and(
        eq(socialAccountsTable.memberId, memberId),
        eq(socialAccountsTable.isActive, true),
      ),
    );
  const accountsByPlatform = new Map(
    accounts.map((account) => [account.platform, account]),
  );
  const outcomes: AutoPostResults = {};

  await Promise.all(
    platforms.map(async (platform) => {
      const account = accountsByPlatform.get(platform);
      if (!account) {
        outcomes[platform as SupportedSocialPlatform] = {
          status: "error",
          error: `No active ${platform} account is connected.`,
        };
        return;
      }
      outcomes[platform as SupportedSocialPlatform] = await postToSocial(
        account,
        post,
      );
    }),
  );

  return outcomes;
}