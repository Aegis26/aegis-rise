import { createHash } from "node:crypto";
import { and, eq, gt, isNull, sql } from "drizzle-orm";
import { Router, type IRouter } from "express";
import { z } from "zod/v4";
import {
  db,
  membersTable,
  socialAccountsTable,
  socialOAuthStatesTable,
} from "../db";
import {
  buildAuthorizationUrl,
  exchangeSocialAuthorizationCode,
  getProfileRedirectUrl,
  getSocialCallbackUrl,
  getSocialProvider,
  socialPlatforms,
  type SupportedSocialPlatform,
} from "../lib/social-oauth";
import {
  createSignedSocialState,
  encryptSocialToken,
  isValidSignedSocialState,
} from "../lib/social-token-crypto";
import { logger } from "../lib/logger";
import { requireAuth } from "../middleware/auth";
import { HttpError } from "../utils/errors";

const router: IRouter = Router();
const platformSchema = z.enum(socialPlatforms);
const stateSchema = z.string().min(32).max(256);

function parsePlatform(
  value: string | string[] | undefined,
): SupportedSocialPlatform {
  const result = platformSchema.safeParse(value);
  if (!result.success) {
    throw new HttpError(400, "Invalid social platform.");
  }
  return result.data;
}

function hashState(state: string): string {
  return createHash("sha256").update(state).digest("base64url");
}

async function disconnectAccount(
  memberId: string,
  platform: SupportedSocialPlatform,
): Promise<void> {
  const deleted = await db
    .delete(socialAccountsTable)
    .where(
      and(
        eq(socialAccountsTable.memberId, memberId),
        eq(socialAccountsTable.platform, platform),
      ),
    )
    .returning({ id: socialAccountsTable.id });

  if (deleted.length === 0) {
    throw new HttpError(403, "That social account is not connected.");
  }

  await db
    .update(membersTable)
    .set({
      preferredPostPlatforms: sql`array_remove(${membersTable.preferredPostPlatforms}, ${platform}::social_platform)`,
      updatedAt: new Date(),
    })
    .where(eq(membersTable.id, memberId));
}

router.post(
  "/auth/social/connect/:platform",
  requireAuth,
  async (request, response, next) => {
    try {
      const platform = parsePlatform(request.params.platform);
      const provider = getSocialProvider(platform);
      const state = createSignedSocialState();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1_000);

      await db.insert(socialOAuthStatesTable).values({
        stateHash: hashState(state),
        memberId: request.user!.id,
        platform,
        expiresAt,
      });

      const connectUrl = new URL(
        `/api/auth/social/connect/${platform}`,
        `${getSocialCallbackUrl(request, platform)}`,
      );
      connectUrl.searchParams.set("state", state);
      response.json({
        authorizationUrl: connectUrl.toString(),
        expiresAt,
        provider: provider.label,
      });
    } catch (error) {
      next(error);
    }
  },
);

router.get("/auth/social/connect/:platform", async (request, response, next) => {
  try {
    const platform = parsePlatform(request.params.platform);
    const state = stateSchema.parse(request.query.state);
    if (!isValidSignedSocialState(state)) {
      throw new HttpError(400, "This social connection link is invalid.");
    }
    const [record] = await db
      .select({
        platform: socialOAuthStatesTable.platform,
        expiresAt: socialOAuthStatesTable.expiresAt,
        consumedAt: socialOAuthStatesTable.consumedAt,
      })
      .from(socialOAuthStatesTable)
      .where(eq(socialOAuthStatesTable.stateHash, hashState(state)))
      .limit(1);

    if (
      !record ||
      record.platform !== platform ||
      record.consumedAt !== null ||
      record.expiresAt.getTime() <= Date.now()
    ) {
      throw new HttpError(400, "This social connection link has expired.");
    }

    const provider = getSocialProvider(platform);
    response.redirect(
      302,
      buildAuthorizationUrl(
        provider,
        state,
        getSocialCallbackUrl(request, platform),
      ),
    );
  } catch (error) {
    next(error);
  }
});

router.get(
  "/auth/social/callback/:platform",
  async (request, response, next) => {
    let platform: SupportedSocialPlatform;
    try {
      platform = parsePlatform(request.params.platform);
    } catch (error) {
      next(error);
      return;
    }

    const sendResult = (result: "success" | "error") => {
      try {
        response.redirect(302, getProfileRedirectUrl(request, result, platform));
      } catch (error) {
        next(error);
      }
    };

    try {
      const state = stateSchema.parse(request.query.state);
      if (!isValidSignedSocialState(state)) {
        sendResult("error");
        return;
      }
      const [record] = await db
        .select()
        .from(socialOAuthStatesTable)
        .where(eq(socialOAuthStatesTable.stateHash, hashState(state)))
        .limit(1);

      if (
        !record ||
        record.platform !== platform ||
        record.consumedAt !== null ||
        record.expiresAt.getTime() <= Date.now()
      ) {
        sendResult("error");
        return;
      }

      if (typeof request.query.error === "string") {
        logger.warn(
          {
            platform,
            providerError: request.query.error.slice(0, 120),
            providerErrorDescription:
              typeof request.query.error_description === "string"
                ? request.query.error_description.slice(0, 500)
                : undefined,
          },
          "Social OAuth provider declined authorization",
        );
        await db
          .update(socialOAuthStatesTable)
          .set({ consumedAt: new Date() })
          .where(
            and(
              eq(socialOAuthStatesTable.id, record.id),
              isNull(socialOAuthStatesTable.consumedAt),
            ),
          );
        sendResult("error");
        return;
      }

      const code = z.string().min(1).max(4_096).parse(request.query.code);
      const provider = getSocialProvider(platform);
      const token = await exchangeSocialAuthorizationCode(
        provider,
        code,
        getSocialCallbackUrl(request, platform),
      );
      const now = new Date();
      const consumed = await db
        .update(socialOAuthStatesTable)
        .set({ consumedAt: now })
        .where(
          and(
            eq(socialOAuthStatesTable.id, record.id),
            isNull(socialOAuthStatesTable.consumedAt),
            gt(socialOAuthStatesTable.expiresAt, now),
          ),
        )
        .returning({ id: socialOAuthStatesTable.id });

      if (consumed.length === 0) {
        sendResult("error");
        return;
      }

      await db
        .insert(socialAccountsTable)
        .values({
          memberId: record.memberId,
          platform,
          accessToken: encryptSocialToken(token.accessToken),
          refreshToken: token.refreshToken
            ? encryptSocialToken(token.refreshToken)
            : null,
          externalUserId: token.externalUserId,
          connectedAt: now,
          expiresAt: token.expiresAt ?? null,
          isActive: true,
          isPublishingEligible: token.isPublishingEligible,
          publishingError: token.publishingError ?? null,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: [
            socialAccountsTable.memberId,
            socialAccountsTable.platform,
          ],
          set: {
            accessToken: encryptSocialToken(token.accessToken),
            refreshToken: token.refreshToken
              ? encryptSocialToken(token.refreshToken)
              : null,
            externalUserId: token.externalUserId,
            connectedAt: now,
            expiresAt: token.expiresAt ?? null,
            isActive: true,
            isPublishingEligible: token.isPublishingEligible,
            publishingError: token.publishingError ?? null,
            updatedAt: now,
          },
        });

      sendResult("success");
    } catch {
      sendResult("error");
    }
  },
);

router.get("/auth/social/accounts", requireAuth, async (request, response, next) => {
  try {
    const accounts = await db
      .select({
        platform: socialAccountsTable.platform,
        connectedAt: socialAccountsTable.connectedAt,
        expiresAt: socialAccountsTable.expiresAt,
        isActive: socialAccountsTable.isActive,
        isPublishingEligible: socialAccountsTable.isPublishingEligible,
        publishingError: socialAccountsTable.publishingError,
      })
      .from(socialAccountsTable)
      .where(eq(socialAccountsTable.memberId, request.user!.id));

    response.json({ accounts });
  } catch (error) {
    next(error);
  }
});

router.delete(
  "/auth/social/disconnect/:platform",
  requireAuth,
  async (request, response, next) => {
    try {
      const platform = parsePlatform(request.params.platform);
      await disconnectAccount(request.user!.id, platform);
      response.json({ message: "Social account disconnected." });
    } catch (error) {
      next(error);
    }
  },
);

router.get(
  "/auth/social/disconnect/:platform",
  requireAuth,
  async (request, response, next) => {
    try {
      const platform = parsePlatform(request.params.platform);
      await disconnectAccount(request.user!.id, platform);
      response.json({ message: "Social account disconnected." });
    } catch (error) {
      next(error);
    }
  },
);

export default router;