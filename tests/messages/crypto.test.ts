import assert from "node:assert/strict";
import test from "node:test";
import {
  decryptMessage,
  encryptMessage,
  messageAssociatedData,
} from "../../artifacts/api-server/src/lib/message-crypto.ts";

const key = Buffer.alloc(32, 7).toString("base64");
const associatedData = messageAssociatedData({
  conversationId: "11111111-1111-4111-8111-111111111111",
  senderId: "22222222-2222-4222-8222-222222222222",
  recipientId: "33333333-3333-4333-8333-333333333333",
});

test("direct-message encryption round trips with its associated data", () => {
  process.env.SOCIAL_TOKEN_ENCRYPTION_KEY = key;
  const encrypted = encryptMessage("private message", associatedData);
  assert.notEqual(encrypted, "private message");
  assert.equal(decryptMessage(encrypted, associatedData), "private message");
});

test("direct-message encryption rejects tampering", () => {
  process.env.SOCIAL_TOKEN_ENCRYPTION_KEY = key;
  const encrypted = encryptMessage("private message", associatedData);
  const parts = encrypted.split(".");
  const tag = Buffer.from(parts[2]!, "base64url");
  tag[0] = tag[0]! ^ 1;
  parts[2] = tag.toString("base64url");
  assert.throws(
    () => decryptMessage(parts.join("."), associatedData),
    /could not be read securely/,
  );
});