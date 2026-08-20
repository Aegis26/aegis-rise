import {
  createCipheriv,
  createDecipheriv,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";
import { HttpError } from "../utils/errors";

const algorithm = "aes-256-gcm";
const keyLength = 32;
const ivLength = 12;

function getEncryptionKey(): Buffer {
  const configuredKey = process.env.SOCIAL_TOKEN_ENCRYPTION_KEY?.trim();
  if (!configuredKey) {
    throw new HttpError(
      503,
      "Social account connections are not configured on this server.",
    );
  }

  const key = Buffer.from(configuredKey, "base64");
  if (key.length !== keyLength) {
    throw new HttpError(
      503,
      "Social account connections are not configured on this server.",
    );
  }

  return key;
}

export function encryptSocialToken(value: string): string {
  const iv = randomBytes(ivLength);
  const cipher = createCipheriv(algorithm, getEncryptionKey(), iv);
  const encrypted = Buffer.concat([
    cipher.update(value, "utf8"),
    cipher.final(),
  ]);

  return [
    iv.toString("base64url"),
    cipher.getAuthTag().toString("base64url"),
    encrypted.toString("base64url"),
  ].join(".");
}

export function decryptSocialToken(value: string): string {
  const [ivValue, tagValue, encryptedValue] = value.split(".");
  if (!ivValue || !tagValue || !encryptedValue) {
    throw new HttpError(
      500,
      "A connected social account could not be read securely.",
    );
  }

  try {
    const decipher = createDecipheriv(
      algorithm,
      getEncryptionKey(),
      Buffer.from(ivValue, "base64url"),
    );
    decipher.setAuthTag(Buffer.from(tagValue, "base64url"));
    return Buffer.concat([
      decipher.update(Buffer.from(encryptedValue, "base64url")),
      decipher.final(),
    ]).toString("utf8");
  } catch {
    throw new HttpError(
      500,
      "A connected social account could not be read securely.",
    );
  }
}

export function createSignedSocialState(): string {
  const nonce = randomBytes(32).toString("base64url");
  const signature = createHmac("sha256", getEncryptionKey())
    .update(nonce)
    .digest("base64url");
  return `${nonce}.${signature}`;
}

export function isValidSignedSocialState(value: string): boolean {
  const [nonce, signature, extraPart] = value.split(".");
  if (!nonce || !signature || extraPart) {
    return false;
  }

  const expectedSignature = createHmac("sha256", getEncryptionKey())
    .update(nonce)
    .digest("base64url");
  const supplied = Buffer.from(signature);
  const expected = Buffer.from(expectedSignature);
  return (
    supplied.length === expected.length &&
    timingSafeEqual(supplied, expected)
  );
}