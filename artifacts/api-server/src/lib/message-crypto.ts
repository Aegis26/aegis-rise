import {
  createCipheriv,
  createDecipheriv,
  createHmac,
  randomBytes,
} from "node:crypto";
import { HttpError } from "../utils/errors";

const algorithm = "aes-256-gcm";
const context = "aegis-rise:direct-messages:v1";

function messageKey(): Buffer {
  const configuredKey = process.env.SOCIAL_TOKEN_ENCRYPTION_KEY?.trim();
  if (!configuredKey) {
    throw new HttpError(503, "Secure messaging is not configured.");
  }
  const masterKey = Buffer.from(configuredKey, "base64");
  if (masterKey.length !== 32) {
    throw new HttpError(503, "Secure messaging is not configured.");
  }
  return createHmac("sha256", masterKey).update(context).digest();
}

export function encryptMessage(body: string, associatedData: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv(algorithm, messageKey(), iv);
  cipher.setAAD(Buffer.from(associatedData));
  const encrypted = Buffer.concat([cipher.update(body, "utf8"), cipher.final()]);
  return [
    "v1",
    iv.toString("base64url"),
    cipher.getAuthTag().toString("base64url"),
    encrypted.toString("base64url"),
  ].join(".");
}

export function decryptMessage(value: string, associatedData: string): string {
  const [version, iv, tag, encrypted] = value.split(".");
  if (version !== "v1" || !iv || !tag || !encrypted) {
    throw new HttpError(500, "A message could not be read securely.");
  }
  try {
    const decipher = createDecipheriv(
      algorithm,
      messageKey(),
      Buffer.from(iv, "base64url"),
    );
    decipher.setAAD(Buffer.from(associatedData));
    decipher.setAuthTag(Buffer.from(tag, "base64url"));
    return Buffer.concat([
      decipher.update(Buffer.from(encrypted, "base64url")),
      decipher.final(),
    ]).toString("utf8");
  } catch {
    throw new HttpError(500, "A message could not be read securely.");
  }
}

export function messageAssociatedData(input: {
  conversationId: string;
  senderId: string;
  recipientId: string;
}): string {
  return `${input.conversationId}:${input.senderId}:${input.recipientId}`;
}