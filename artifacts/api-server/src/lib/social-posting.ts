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

interface LinkedInImageUpload {
  imageUrn: string;
  uploadUrl: string;
}

interface DownloadedImage {
  bytes: Buffer;
  contentType: "image/gif" | "image/jpeg" | "image/png";
}

const linkedInImageContentTypes = new Set([
  "image/gif",
  "image/jpeg",
  "image/png",
]);
const maxLinkedInImageBytes = 10 * 1024 * 1024;

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

function requireObject(value: unknown, message: string): Record<string, unknown> {
  if (!value || typeof value !== "object") {
    throw new Error(message);
  }
  return value as Record<string, unknown>;
}

function imageUploadFromResponse(body: ProviderResponse): LinkedInImageUpload {
  const value = requireObject(
    body.value,
    "LinkedIn did not return an image upload destination.",
  );
  const imageUrn = value.image;
  const uploadUrl = value.uploadUrl;
  if (
    typeof imageUrn !== "string" ||
    !imageUrn.startsWith("urn:li:image:") ||
    typeof uploadUrl !== "string"
  ) {
    throw new Error("LinkedIn did not return a valid image upload destination.");
  }
  return { imageUrn, uploadUrl };
}

function responseBodyForLogs(url: string, body: ProviderResponse): ProviderResponse {
  if (
    url !==
      "https://api.linkedin.com/rest/images?action=initializeUpload" ||
    !body.value ||
    typeof body.value !== "object"
  ) {
    return body;
  }

  return {
    ...body,
    value: {
      ...(body.value as Record<string, unknown>),
      uploadUrl: "[REDACTED signed upload URL]",
    },
  };
}

function assertManagedImageUrl(imageUrl: string): URL {
  const publicImageBaseUrl = process.env.R2_PUBLIC_URL?.trim();
  if (!publicImageBaseUrl) {
    throw new Error("Attached images are not available for LinkedIn publishing.");
  }

  const baseUrl = new URL(publicImageBaseUrl);
  const sourceUrl = new URL(imageUrl);
  const basePath = baseUrl.pathname.endsWith("/")
    ? baseUrl.pathname
    : `${baseUrl.pathname}/`;
  if (
    sourceUrl.protocol !== "https:" ||
    sourceUrl.origin !== baseUrl.origin ||
    !sourceUrl.pathname.startsWith(basePath)
  ) {
    throw new Error(
      "Only images uploaded to Aegis Rise can be included in LinkedIn posts.",
    );
  }
  return sourceUrl;
}

async function downloadLinkedInImage(imageUrl: string): Promise<DownloadedImage> {
  const sourceUrl = assertManagedImageUrl(imageUrl);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);
  try {
    const response = await fetch(sourceUrl, {
      method: "GET",
      redirect: "error",
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new Error("The attached image could not be downloaded for LinkedIn.");
    }

    const contentType = response.headers
      .get("content-type")
      ?.split(";")[0]
      ?.trim()
      .toLowerCase();
    if (!contentType || !linkedInImageContentTypes.has(contentType)) {
      throw new Error(
        "LinkedIn supports attached JPG, PNG, and GIF images only.",
      );
    }

    const declaredSize = Number(response.headers.get("content-length"));
    if (
      Number.isFinite(declaredSize) &&
      declaredSize > maxLinkedInImageBytes
    ) {
      throw new Error("The attached image is too large for LinkedIn publishing.");
    }

    const bytes = Buffer.from(await response.arrayBuffer());
    if (bytes.byteLength === 0 || bytes.byteLength > maxLinkedInImageBytes) {
      throw new Error("The attached image is too large for LinkedIn publishing.");
    }
    return {
      bytes,
      contentType: contentType as DownloadedImage["contentType"],
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function uploadImageToLinkedIn(
  accessToken: string,
  owner: string,
  imageUrl: string,
  linkedInVersion: string,
  postId: string,
): Promise<string> {
  const { body } = await providerFetch(
    "https://api.linkedin.com/rest/images?action=initializeUpload",
    {
      method: "POST",
      headers: {
        authorization: `Bearer ${accessToken}`,
        "content-type": "application/json",
        "Linkedin-Version": linkedInVersion,
        "X-Restli-Protocol-Version": "2.0.0",
      },
      body: JSON.stringify({
        initializeUploadRequest: { owner },
      }),
    },
    "LinkedIn",
  );
  const { imageUrn, uploadUrl } = imageUploadFromResponse(body);
  const image = await downloadLinkedInImage(imageUrl);

  logger.info(
    {
      postId,
      imageUrn,
      contentType: image.contentType,
      bytes: image.bytes.byteLength,
    },
    "LinkedIn image binary upload starting",
  );
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30_000);
  try {
    const response = await fetch(uploadUrl, {
      method: "PUT",
      headers: {
        authorization: `Bearer ${accessToken}`,
        "content-type": image.contentType,
      },
      body: image.bytes,
      signal: controller.signal,
    });
    const responseBody = parseProviderResponse(await response.text());
    logger.info(
      {
        provider: "LinkedIn",
        request: {
          method: "PUT",
          url: "[REDACTED signed upload URL]",
          contentType: image.contentType,
          bytes: image.bytes.byteLength,
        },
        response: {
          status: response.status,
          statusText: response.statusText,
          body: responseBody,
        },
      },
      "LinkedIn image binary upload completed",
    );
    if (!response.ok) {
      const detail = providerErrorMessage(responseBody);
      throw new Error(
        detail
          ? `LinkedIn rejected the image upload: ${detail}`
          : "LinkedIn rejected the image upload.",
      );
    }
  } finally {
    clearTimeout(timeout);
  }

  return imageUrn;
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
    const logBody = responseBodyForLogs(url, body);
    logger.info(
      {
        provider: label,
        request: { method: options.method ?? "GET", url },
        response: {
          status: response.status,
          statusText: response.statusText,
          headers:
            label === "LinkedIn" ? linkedInResponseHeaders(response) : undefined,
          body: logBody,
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
      process.env.LINKEDIN_API_VERSION?.trim() || "202608";
    const author = `urn:li:person:${account.externalUserId}`;
    const imageUrn = post.imageUrl
      ? await uploadImageToLinkedIn(
          accessToken,
          author,
          post.imageUrl,
          linkedInVersion,
          post.id,
        )
      : undefined;
    const linkedInPayload = {
      author,
      commentary: caption,
      visibility: "PUBLIC",
      distribution: {
        feedDistribution: "MAIN_FEED",
        targetEntities: [],
        thirdPartyDistributionChannels: [],
      },
      ...(imageUrn
        ? {
            content: {
              media: {
                id: imageUrn,
              },
            },
          }
        : {}),
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