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
import { logger } from "./logger";

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
  [key: string]: unknown;
}

function asSharePlatform(platform: SupportedSocialPlatform) {
  const sharePlatformBySocialPlatform = {
    facebook: "Facebook",
    linkedin: "LinkedIn",
    instagram: "Instagram",
  } as const;
  return sharePlatformBySocialPlatform[platform];
}

function providerErrorMessage(body: ProviderResponse): string | undefined {
  const nestedError = body.error;
  if (
    nestedError &&
    typeof nestedError === "object" &&
    "message" in nestedError &&
    typeof nestedError.message === "string"
  ) {
    return nestedError.message;
  }
  return typeof body.message === "string" ? body.message : undefined;
}

function parseProviderResponse(rawBody: string): ProviderResponse {
  if (!rawBody) {
    return {};
  }
  try {
    return JSON.parse(rawBody) as ProviderResponse;
  } catch {
    return { rawBody };
  }
}

function linkedInResponseHeaders(response: Response) {
  return Object.fromEntries(
    ["content-type", "x-li-request-id", "x-restli-id"]
      .map((header) => [header, response.headers.get(header)] as const)
      .filter(([, value]) => value !== null),
  );
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
    const body = parseProviderResponse(await response.text());
    logger.info(
      {
        provider: label,
        request: { method: options.method ?? "GET", url },
        response: {
          status: response.status,
          statusText: response.statusText,
          headers:
            label === "LinkedIn" ? linkedInResponseHeaders(response) : undefined,
          body,
        },
      },
      "Social provider response received",
    );
    if (!response.ok) {
      const detail = providerErrorMessage(body);
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
  const isLinkedIn = account.platform === "linkedin";
  if (isLinkedIn) {
    logger.info(
      {
        accountId: account.id,
        platform: account.platform,
        hasEncryptedAccessToken: Boolean(account.accessToken),
        expiresAt: account.expiresAt,
      },
      "LinkedIn access token retrieval started",
    );
  }
  try {
    accessToken = decryptSocialToken(account.accessToken);
  } catch {
    await deactivateAccount(account.id);
    throw new Error("This social connection needs to be reconnected.");
  }

  if (isLinkedIn) {
    logger.info(
      {
        accountId: account.id,
        platform: account.platform,
        tokenRetrieved: true,
        tokenIsNonEmpty: accessToken.trim().length > 0,
        tokenHasWhitespace: /\s/.test(accessToken),
        tokenFormat:
          accessToken.trim().length > 0
            ? "opaque OAuth bearer token"
            : "empty token",
      },
      "LinkedIn access token decrypted for API request",
    );
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
    if (platform === "facebook" || platform === "instagram") {
      return {
        status: "error",
        error:
          `${platform === "facebook" ? "Facebook" : "Instagram"} is connected for account authentication only and cannot auto-post in this MVP.`,
      };
    }

    const accessToken = await getUsableAccessToken(account);
    const caption = formatShareText(
      { id: post.id, caption: post.caption },
      asSharePlatform(platform),
      post.authorName,
      post.chapterName,
      post.postLink,
    );
    const linkedInVersion =
      process.env.LINKEDIN_API_VERSION?.trim() || "202501";
    const linkedInPayload = {
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
    };
    logger.info(
      {
        accountId: account.id,
        postId: post.id,
        platform,
        request: {
          method: "POST",
          url: "https://api.linkedin.com/rest/posts",
          headers: {
            authorization: "Bearer [REDACTED]",
            "content-type": "application/json",
            "Linkedin-Version": linkedInVersion,
            "X-Restli-Protocol-Version": "2.0.0",
          },
          body: linkedInPayload,
        },
        bearerTokenPrepared: Boolean(accessToken.trim()),
      },
      "LinkedIn auto-post request starting",
    );

    const { body, response } = await providerFetch(
      "https://api.linkedin.com/rest/posts",
      {
        method: "POST",
        headers: {
          authorization: `Bearer ${accessToken}`,
          "content-type": "application/json",
          "Linkedin-Version": linkedInVersion,
          "X-Restli-Protocol-Version": "2.0.0",
        },
        body: JSON.stringify(linkedInPayload),
      },
      "LinkedIn",
    );
    logger.info(
      {
        accountId: account.id,
        postId: post.id,
        platform,
        outcome: "success",
        linkedInPostId: response.headers.get("x-restli-id") ?? undefined,
        responseBody: body,
      },
      "LinkedIn auto-post request completed",
    );
    return {
      status: "success",
      externalUrl: response.headers.get("x-restli-id") ?? undefined,
    };
  } catch (error) {
    logger.error(
      {
        accountId: account.id,
        postId: post.id,
        platform,
        err: error,
        errorMessage: error instanceof Error ? error.message : String(error),
      },
      "LinkedIn auto-post request failed",
    );
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
  logger.info(
    {
      memberId,
      postId: post.id,
      requestedPlatforms: platforms,
      activeAccountPlatforms: accounts.map((account) => account.platform),
    },
    "Auto-post account lookup completed",
  );

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