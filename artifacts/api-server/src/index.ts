import "dotenv/config";
import app from "./app";
import { logger } from "./lib/logger";

function validateProductionConfiguration(): void {
  if (process.env.NODE_ENV !== "production") {
    return;
  }

  const requiredVariables = [
    "APP_BASE_URL",
    "CLOUDFLARE_ACCOUNT_ID",
    "FACEBOOK_CLIENT_ID",
    "FACEBOOK_CLIENT_SECRET",
    "INSTAGRAM_CLIENT_ID",
    "INSTAGRAM_CLIENT_SECRET",
    "JWT_SECRET",
    "LINKEDIN_CLIENT_ID",
    "LINKEDIN_CLIENT_SECRET",
    "NEWS_API_KEY",
    "RESEND_API_KEY",
    "RESEND_FROM_EMAIL",
    "R2_ACCESS_KEY_ID",
    "R2_BUCKET_NAME",
    "R2_PUBLIC_URL",
    "R2_SECRET_ACCESS_KEY",
    "SOCIAL_TOKEN_ENCRYPTION_KEY",
  ] as const;

  const missingVariables = requiredVariables.filter(
    (name) => !process.env[name]?.trim(),
  );
  if (missingVariables.length > 0) {
    throw new Error(
      `Missing required production environment variables: ${missingVariables.join(", ")}.`,
    );
  }

  const appBaseUrl = new URL(process.env.APP_BASE_URL!);
  if (appBaseUrl.protocol !== "https:") {
    throw new Error("APP_BASE_URL must use HTTPS in production.");
  }
  if (appBaseUrl.username || appBaseUrl.password) {
    throw new Error("APP_BASE_URL must not include URL credentials.");
  }

  const publicR2Url = new URL(process.env.R2_PUBLIC_URL!);
  if (!["http:", "https:"].includes(publicR2Url.protocol)) {
    throw new Error("R2_PUBLIC_URL must use HTTP or HTTPS in production.");
  }

  if (process.env.JWT_SECRET!.trim().length < 32) {
    throw new Error("JWT_SECRET must be at least 32 characters in production.");
  }

  const socialEncryptionKey = Buffer.from(
    process.env.SOCIAL_TOKEN_ENCRYPTION_KEY!.trim(),
    "base64",
  );
  if (socialEncryptionKey.length !== 32) {
    throw new Error(
      "SOCIAL_TOKEN_ENCRYPTION_KEY must be a base64-encoded 32-byte key in production.",
    );
  }
}

validateProductionConfiguration();

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");
});
