import type { Request } from "express";
import { HttpError } from "../utils/errors";
import type { SocialPlatform } from "../db";

export const socialPlatforms = [
  "facebook",
  "linkedin",
  "instagram",
] as const satisfies readonly SocialPlatform[];

export type SupportedSocialPlatform = (typeof socialPlatforms)[number];

export interface SocialProviderConfig {
  platform: SupportedSocialPlatform;
  label: string;
  clientId: string;
  clientSecret: string;
  authorizationUrl: string;
  tokenUrl: string;
  scopes: string[];
  loginConfigurationId?: string;
}

export interface SocialTokenResult {
  accessToken: string;
  refreshToken?: string;
  externalUserId: string;
  expiresAt?: Date;
  isPublishingEligible: boolean;
  publishingError?: string;
}

interface ProviderErrorPayload {
  error?: {
    message?: string;
    type?: string;
  };
  message?: string;
  error_description?: string;
}

function configuredValue(name: string): string | undefined {
  return process.env[name]?.trim() || undefined;
}

function requireConfiguredValue(name: string, label: string): string {
  const value = configuredValue(name);
  if (!value) {
    throw new HttpError(503, `${label} connections are not configured.`);
  }
  return value;
}

export function isSocialPlatform(
  value: string,
): value is SupportedSocialPlatform {
  return socialPlatforms.includes(value as SupportedSocialPlatform);
}

export function getSocialProvider(
  platform: SupportedSocialPlatform,
): SocialProviderConfig {
  switch (platform) {
    case "facebook":
      const facebookLoginConfigurationId = configuredValue(
        "FACEBOOK_LOGIN_CONFIG_ID",
      );
      return {
        platform,
        label: "Facebook",
        clientId: requireConfiguredValue("FACEBOOK_CLIENT_ID", "Facebook"),
        clientSecret: requireConfiguredValue(
          "FACEBOOK_CLIENT_SECRET",
          "Facebook",
        ),
        authorizationUrl: "https://www.facebook.com/v20.0/dialog/oauth",
        tokenUrl: "https://graph.facebook.com/v20.0/oauth/access_token",
        scopes: facebookLoginConfigurationId
          ? []
          : [
              "public_profile",
              "pages_show_list",
              "pages_read_engagement",
              "pages_manage_posts",
            ],
        loginConfigurationId: facebookLoginConfigurationId,
      };
    case "linkedin":
      return {
        platform,
        label: "LinkedIn",
        clientId: requireConfiguredValue("LINKEDIN_CLIENT_ID", "LinkedIn"),
        clientSecret: requireConfiguredValue(
          "LINKEDIN_CLIENT_SECRET",
          "LinkedIn",
        ),
        authorizationUrl: "https://www.linkedin.com/oauth/v2/authorization",
        tokenUrl: "https://www.linkedin.com/oauth/v2/accessToken",
        scopes: ["openid", "profile", "w_member_social"],
      };
    case "instagram":
      return {
        platform,
        label: "Instagram",
        clientId: requireConfiguredValue("INSTAGRAM_CLIENT_ID", "Instagram"),
        clientSecret: requireConfiguredValue(
          "INSTAGRAM_CLIENT_SECRET",
          "Instagram",
        ),
        authorizationUrl: "https://www.facebook.com/v20.0/dialog/oauth",
        tokenUrl: "https://graph.facebook.com/v20.0/oauth/access_token",
        scopes: [
          "public_profile",
          "pages_show_list",
          "pages_read_engagement",
          "instagram_basic",
          "instagram_content_publish",
        ],
      };
  }
}

function allowedDevelopmentHosts(): Set<string> {
  return new Set(
    [
      "localhost",
      "127.0.0.1",
      "::1",
      process.env.REPLIT_DEV_DOMAIN,
      ...(process.env.REPLIT_DOMAINS?.split(",") ?? []),
    ]
      .filter(Boolean)
      .map((host) => host!.trim().toLowerCase()),
  );
}

export function getPublicApplicationBaseUrl(request: Request): string {
  if (process.env.NODE_ENV === "production") {
    const configured = configuredValue("APP_BASE_URL");
    if (!configured) {
      throw new HttpError(
        503,
        "APP_BASE_URL must be configured before social connections can be used.",
      );
    }

    try {
      const url = new URL(configured);
      if (!["http:", "https:"].includes(url.protocol)) {
        throw new Error("Unsupported protocol");
      }
      return url.toString().replace(/\/$/, "");
    } catch {
      throw new HttpError(500, "APP_BASE_URL must be a valid HTTP or HTTPS URL.");
    }
  }

  const host = request.get("host");
  if (!host) {
    throw new HttpError(500, "A social redirect URL could not be generated.");
  }

  const hostname = host.split(":")[0]?.toLowerCase();
  if (!hostname || !allowedDevelopmentHosts().has(hostname)) {
    throw new HttpError(500, "A social redirect URL could not be generated.");
  }

  const forwardedProtocol = request.header("x-forwarded-proto")?.split(",")[0];
  const protocol =
    forwardedProtocol?.trim() === "https" || request.protocol === "https"
      ? "https"
      : "http";
  return `${protocol}://${host}`;
}

export function getSocialCallbackUrl(
  request: Request,
  platform: SupportedSocialPlatform,
): string {
  return new URL(
    `/api/auth/social/callback/${platform}`,
    `${getPublicApplicationBaseUrl(request)}/`,
  ).toString();
}

export function getProfileRedirectUrl(
  request: Request,
  result: "success" | "error",
  platform: SupportedSocialPlatform,
): string {
  const url = new URL("profile", `${getPublicApplicationBaseUrl(request)}/`);
  url.searchParams.set("social", result);
  url.searchParams.set("platform", platform);
  return url.toString();
}

export function buildAuthorizationUrl(
  provider: SocialProviderConfig,
  state: string,
  redirectUri: string,
): string {
  const url = new URL(provider.authorizationUrl);
  url.searchParams.set("client_id", provider.clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("state", state);
  if (provider.loginConfigurationId) {
    url.searchParams.set("config_id", provider.loginConfigurationId);
  } else if (provider.scopes.length > 0) {
    url.searchParams.set("scope", provider.scopes.join(" "));
  }
  return url.toString();
}

async function fetchJson<T>(
  url: string,
  options: RequestInit,
  providerLabel: string,
): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    const contentType = response.headers.get("content-type") ?? "";
    const payload = contentType.includes("application/json")
      ? ((await response.json()) as T & ProviderErrorPayload)
      : ((await response.text()) as unknown as T & ProviderErrorPayload);

    if (!response.ok) {
      const typedPayload = payload as ProviderErrorPayload;
      const detail =
        typedPayload.error_description ??
        typedPayload.error?.message ??
        typedPayload.message;
      throw new HttpError(
        409,
        detail
          ? `${providerLabel} rejected this request: ${detail}`
          : `${providerLabel} rejected this request.`,
      );
    }

    return payload as T;
  } catch (error) {
    if (error instanceof HttpError) {
      throw error;
    }
    throw new HttpError(
      409,
      `${providerLabel} could not be reached. Please try again.`,
    );
  } finally {
    clearTimeout(timeout);
  }
}

function expiryFromSeconds(value: unknown): Date | undefined {
  const seconds = Number(value);
  if (!Number.isFinite(seconds) || seconds <= 0) {
    return undefined;
  }
  return new Date(Date.now() + seconds * 1_000);
}

interface MetaTokenResponse {
  access_token?: string;
  expires_in?: number;
}

interface MetaPage {
  id?: string;
  access_token?: string;
  instagram_business_account?: { id?: string };
}

interface MetaPagesResponse {
  data?: MetaPage[];
}

interface MetaDebugTokenResponse {
  data?: {
    granular_scopes?: Array<{
      scope?: string;
      target_ids?: string[];
    }>;
  };
}

interface MetaUser {
  id?: string;
}

interface LinkedInTokenResponse {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
}

interface LinkedInProfileResponse {
  sub?: string;
}

async function exchangeMetaAuthorizationCode(
  provider: SocialProviderConfig,
  code: string,
  redirectUri: string,
): Promise<SocialTokenResult> {
  const tokenUrl = new URL(provider.tokenUrl);
  tokenUrl.searchParams.set("client_id", provider.clientId);
  tokenUrl.searchParams.set("client_secret", provider.clientSecret);
  tokenUrl.searchParams.set("redirect_uri", redirectUri);
  tokenUrl.searchParams.set("code", code);
  const token = await fetchJson<MetaTokenResponse>(
    tokenUrl.toString(),
    { method: "GET" },
    provider.label,
  );
  if (!token.access_token) {
    throw new HttpError(409, `${provider.label} did not return an access token.`);
  }

  const longLivedToken = await exchangeMetaForLongLivedToken(
    provider,
    token.access_token,
  );
  return resolveMetaAccount(
    provider,
    longLivedToken.access_token,
    expiryFromSeconds(longLivedToken.expires_in),
  );
}

async function exchangeMetaForLongLivedToken(
  provider: SocialProviderConfig,
  accessToken: string,
): Promise<Required<Pick<MetaTokenResponse, "access_token">> & MetaTokenResponse> {
  const tokenUrl = new URL(provider.tokenUrl);
  tokenUrl.searchParams.set("grant_type", "fb_exchange_token");
  tokenUrl.searchParams.set("client_id", provider.clientId);
  tokenUrl.searchParams.set("client_secret", provider.clientSecret);
  tokenUrl.searchParams.set("fb_exchange_token", accessToken);
  const token = await fetchJson<MetaTokenResponse>(
    tokenUrl.toString(),
    { method: "GET" },
    provider.label,
  );
  if (!token.access_token) {
    throw new HttpError(
      409,
      `${provider.label} did not return a long-lived access token.`,
    );
  }
  return token as Required<Pick<MetaTokenResponse, "access_token">> &
    MetaTokenResponse;
}

async function resolveFacebookPageFromGrantedTargets(
  provider: SocialProviderConfig,
  memberAccessToken: string,
): Promise<MetaPage | undefined> {
  const debugUrl = new URL("https://graph.facebook.com/v20.0/debug_token");
  debugUrl.searchParams.set("input_token", memberAccessToken);
  debugUrl.searchParams.set(
    "access_token",
    `${provider.clientId}|${provider.clientSecret}`,
  );
  const debugToken = await fetchJson<MetaDebugTokenResponse>(
    debugUrl.toString(),
    { method: "GET" },
    provider.label,
  );

  const pageScopes = new Set([
    "pages_show_list",
    "pages_read_engagement",
    "pages_manage_posts",
  ]);
  const targetIds = [
    ...new Set(
      (debugToken.data?.granular_scopes ?? [])
        .filter((scope) => pageScopes.has(scope.scope ?? ""))
        .flatMap((scope) => scope.target_ids ?? []),
    ),
  ];

  for (const targetId of targetIds) {
    const pageUrl = new URL(
      `https://graph.facebook.com/v20.0/${encodeURIComponent(targetId)}`,
    );
    pageUrl.searchParams.set("fields", "id,access_token");
    pageUrl.searchParams.set("access_token", memberAccessToken);
    const page = await fetchJson<MetaPage>(
      pageUrl.toString(),
      { method: "GET" },
      provider.label,
    );
    if (page.id && page.access_token) {
      return page;
    }
  }

  return undefined;
}

async function resolveMetaAccount(
  provider: SocialProviderConfig,
  memberAccessToken: string,
  expiresAt: Date | undefined,
): Promise<SocialTokenResult> {
  if (provider.platform !== "facebook" && provider.platform !== "instagram") {
    throw new HttpError(500, "This provider does not use Meta account resolution.");
  }

  const userUrl = new URL("https://graph.facebook.com/v20.0/me");
  userUrl.searchParams.set("fields", "id");
  userUrl.searchParams.set("access_token", memberAccessToken);
  const user = await fetchJson<MetaUser>(
    userUrl.toString(),
    { method: "GET" },
    provider.label,
  );
  if (!user.id) {
    throw new HttpError(
      409,
      `${provider.label} did not return a member identity.`,
    );
  }
  const pagesUrl = new URL("https://graph.facebook.com/v20.0/me/accounts");
  pagesUrl.searchParams.set(
    "fields",
    "id,access_token,instagram_business_account{id}",
  );
  pagesUrl.searchParams.set("access_token", memberAccessToken);
  const pages = await fetchJson<MetaPagesResponse>(
    pagesUrl.toString(),
    { method: "GET" },
    provider.label,
  );
  const listedPage =
    provider.platform === "instagram"
      ? pages.data?.find(
          (candidate) =>
            candidate.id &&
            candidate.access_token &&
            candidate.instagram_business_account?.id,
        )
      : pages.data?.find(
          (candidate) => candidate.id && candidate.access_token,
        );
  const page =
    listedPage ??
    (provider.platform === "facebook"
      ? await resolveFacebookPageFromGrantedTargets(provider, memberAccessToken)
      : undefined);

  if (!page?.id || !page.access_token) {
    return {
      accessToken: memberAccessToken,
      refreshToken: memberAccessToken,
      externalUserId: user.id,
      expiresAt,
      isPublishingEligible: false,
      publishingError:
        provider.platform === "facebook"
          ? "Connect a Facebook Page you can publish to, then reconnect."
          : "Connect an Instagram Business or Creator account to a Facebook Page, then reconnect.",
    };
  }

  const targetId =
    provider.platform === "instagram"
      ? page.instagram_business_account?.id
      : page.id;
  if (!targetId) {
    return {
      accessToken: memberAccessToken,
      refreshToken: memberAccessToken,
      externalUserId: user.id,
      expiresAt,
      isPublishingEligible: false,
      publishingError:
        "Connect an Instagram Business or Creator account to a Facebook Page, then reconnect.",
    };
  }

  return {
    accessToken: page.access_token,
    refreshToken: page.access_token,
    externalUserId: targetId,
    expiresAt,
    isPublishingEligible: true,
  };
}

async function exchangeLinkedInAuthorizationCode(
  provider: SocialProviderConfig,
  code: string,
  redirectUri: string,
): Promise<SocialTokenResult> {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
    client_id: provider.clientId,
    client_secret: provider.clientSecret,
  });
  const token = await fetchJson<LinkedInTokenResponse>(
    provider.tokenUrl,
    {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body,
    },
    provider.label,
  );
  if (!token.access_token) {
    throw new HttpError(409, "LinkedIn did not return an access token.");
  }

  const profile = await fetchJson<LinkedInProfileResponse>(
    "https://api.linkedin.com/v2/userinfo",
    {
      method: "GET",
      headers: { authorization: `Bearer ${token.access_token}` },
    },
    provider.label,
  );
  if (!profile.sub) {
    throw new HttpError(409, "LinkedIn did not return a member identity.");
  }

  return {
    accessToken: token.access_token,
    refreshToken: token.refresh_token,
    externalUserId: profile.sub,
    expiresAt: expiryFromSeconds(token.expires_in),
    isPublishingEligible: true,
  };
}

export async function exchangeSocialAuthorizationCode(
  provider: SocialProviderConfig,
  code: string,
  redirectUri: string,
): Promise<SocialTokenResult> {
  return provider.platform === "linkedin"
    ? exchangeLinkedInAuthorizationCode(provider, code, redirectUri)
    : exchangeMetaAuthorizationCode(provider, code, redirectUri);
}

export async function refreshLinkedInAccessToken(
  provider: SocialProviderConfig,
  refreshToken: string,
): Promise<Pick<SocialTokenResult, "accessToken" | "refreshToken" | "expiresAt">> {
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    client_id: provider.clientId,
    client_secret: provider.clientSecret,
  });
  const token = await fetchJson<LinkedInTokenResponse>(
    provider.tokenUrl,
    {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body,
    },
    provider.label,
  );
  if (!token.access_token) {
    throw new HttpError(409, "LinkedIn did not return a refreshed access token.");
  }

  return {
    accessToken: token.access_token,
    refreshToken: token.refresh_token,
    expiresAt: expiryFromSeconds(token.expires_in),
  };
}

export async function refreshMetaAccessToken(
  provider: SocialProviderConfig,
  refreshToken: string,
): Promise<SocialTokenResult> {
  const longLivedToken = await exchangeMetaForLongLivedToken(
    provider,
    refreshToken,
  );
  return resolveMetaAccount(
    provider,
    longLivedToken.access_token,
    expiryFromSeconds(longLivedToken.expires_in),
  );
}