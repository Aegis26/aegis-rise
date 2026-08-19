import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { HttpError } from "../utils/errors";

interface R2Config {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucketName: string;
  publicUrl: string;
}

interface UploadObjectInput {
  key: string;
  body: Buffer;
  contentType: string;
}

let r2Client: S3Client | undefined;

function requireEnvironmentVariable(name: string): string {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new HttpError(
      500,
      `R2 storage is not configured: ${name} is missing.`,
    );
  }

  return value;
}

function getR2Config(): R2Config {
  const publicUrl = requireEnvironmentVariable("R2_PUBLIC_URL");

  try {
    const parsedPublicUrl = new URL(publicUrl);
    if (!["http:", "https:"].includes(parsedPublicUrl.protocol)) {
      throw new Error("Unsupported URL protocol.");
    }
  } catch {
    throw new HttpError(
      500,
      "R2 storage is not configured: R2_PUBLIC_URL must be a valid HTTP URL.",
    );
  }

  return {
    accountId: requireEnvironmentVariable("CLOUDFLARE_ACCOUNT_ID"),
    accessKeyId: requireEnvironmentVariable("R2_ACCESS_KEY_ID"),
    secretAccessKey: requireEnvironmentVariable("R2_SECRET_ACCESS_KEY"),
    bucketName: requireEnvironmentVariable("R2_BUCKET_NAME"),
    publicUrl,
  };
}

function getR2Client(config: R2Config): S3Client {
  r2Client ??= new S3Client({
    region: "auto",
    endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });

  return r2Client;
}

function buildPublicUrl(baseUrl: string, key: string): string {
  const normalizedBaseUrl = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
  const encodedKey = key.split("/").map(encodeURIComponent).join("/");

  return new URL(encodedKey, normalizedBaseUrl).toString();
}

export async function uploadObjectToR2({
  key,
  body,
  contentType,
}: UploadObjectInput): Promise<string> {
  const config = getR2Config();

  await getR2Client(config).send(
    new PutObjectCommand({
      Bucket: config.bucketName,
      Key: key,
      Body: body,
      ContentType: contentType,
      CacheControl: "public, max-age=31536000, immutable",
    }),
  );

  return buildPublicUrl(config.publicUrl, key);
}