import { Router, type IRouter } from "express";
import {
  and,
  count,
  desc,
  eq,
  inArray,
  isNull,
  lt,
  or,
  sql,
} from "drizzle-orm";
import { z } from "zod/v4";
import {
  db,
  directConversationsTable,
  directMessageBlocksTable,
  directMessagePresenceTable,
  directMessagesTable,
  membersTable,
} from "../db";
import {
  decryptMessage,
  encryptMessage,
  messageAssociatedData,
} from "../lib/message-crypto";
import { requireAuth } from "../middleware/auth";
import { HttpError } from "../utils/errors";

const router: IRouter = Router();
const uuid = z.string().uuid();
const sendSchema = z.object({
  recipientId: uuid,
  body: z.string().trim().min(1).max(4_000),
  clientMessageId: uuid,
  conversationId: uuid.optional(),
});
const typingSchema = z.object({ recipientId: uuid, isTyping: z.boolean() });
const readSchema = z.object({ messageId: uuid });
const threadSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  cursor: z.string().optional(),
});

type MessageRow = typeof directMessagesTable.$inferSelect;

function conversationWhere(conversationId: string, memberId: string) {
  return and(
    eq(directConversationsTable.id, conversationId),
    or(
      eq(directConversationsTable.participantOneId, memberId),
      eq(directConversationsTable.participantTwoId, memberId),
    ),
  );
}

function cursorFor(row: MessageRow): string {
  return Buffer.from(
    JSON.stringify({ createdAt: row.createdAt.toISOString(), id: row.id }),
  ).toString("base64url");
}

function parseCursor(value: string | undefined) {
  if (!value) return undefined;
  try {
    const parsed = z
      .object({ createdAt: z.string().datetime(), id: uuid })
      .parse(JSON.parse(Buffer.from(value, "base64url").toString("utf8")));
    return { createdAt: new Date(parsed.createdAt), id: parsed.id };
  } catch {
    throw new HttpError(400, "The message cursor is invalid.");
  }
}

async function touchPresence(memberId: string) {
  await db.transaction(async (tx) => {
    const [current] = await tx.select({
      chapter: membersTable.chapter,
      status: membersTable.status,
    }).from(membersTable).where(eq(membersTable.id, memberId)).limit(1);
    if (!current || current.status !== "active") return;
    await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtextextended(${current.chapter}, 0::bigint))`);
    if (!await activeMember(memberId, current.chapter, tx)) return;
    const now = new Date();
    await tx.insert(directMessagePresenceTable).values({ memberId, lastSeenAt: now })
      .onConflictDoUpdate({
        target: directMessagePresenceTable.memberId,
        set: { lastSeenAt: now },
      });
    });
}

async function activeMember(memberId: string, chapter: string, executor: any = db) {
  const [member] = await executor
    .select({
      id: membersTable.id,
      name: membersTable.name,
      title: membersTable.title,
      company: membersTable.company,
      profilePictureUrl: membersTable.profilePictureUrl,
      chapter: membersTable.chapter,
    })
    .from(membersTable)
    .where(and(eq(membersTable.id, memberId), eq(membersTable.status, "active"), eq(membersTable.chapter, chapter)))
    .limit(1);
  return member;
}

async function blockState(memberId: string, peerId: string, executor: any = db) {
  const rows = await executor
    .select({ blockerId: directMessageBlocksTable.blockerId })
    .from(directMessageBlocksTable)
    .where(
      or(
        and(eq(directMessageBlocksTable.blockerId, memberId), eq(directMessageBlocksTable.blockedId, peerId)),
        and(eq(directMessageBlocksTable.blockerId, peerId), eq(directMessageBlocksTable.blockedId, memberId)),
      ),
    );
  return {
    isBlocked: rows.some((row: { blockerId: string }) => row.blockerId === memberId),
    hasBlockedYou: rows.some((row: { blockerId: string }) => row.blockerId === peerId),
  };
}

function serializeMessage(row: MessageRow, memberId: string) {
  const isDeleted = row.deletedAt !== null;
  return {
    id: row.id,
    senderId: row.senderId!,
    recipientId: row.recipientId!,
    body: isDeleted
      ? "This message was removed."
      : decryptMessage(
          row.encryptedBody,
          messageAssociatedData({
            conversationId: row.conversationId,
            senderId: row.senderId!,
            recipientId: row.recipientId!,
          }),
        ),
    createdAt: row.createdAt,
    readAt: row.readAt,
    isOwn: row.senderId === memberId,
    isDeleted,
  };
}

async function peerDetails(memberId: string, peerId: string, chapter: string) {
  const peer = await activeMember(peerId, chapter);
  if (!peer) return undefined;
  const [presence] = await db
    .select()
    .from(directMessagePresenceTable)
    .where(eq(directMessagePresenceTable.memberId, peerId))
    .limit(1);
  const states = await blockState(memberId, peerId);
  const now = Date.now();
  return {
    id: peer.id, name: peer.name, title: peer.title, company: peer.company,
    profilePictureUrl: peer.profilePictureUrl,
    online: !!presence && now - presence.lastSeenAt.getTime() <= 90_000,
    typing: !!presence && presence.typingToMemberId === memberId &&
      !!presence.typingUpdatedAt && now - presence.typingUpdatedAt.getTime() <= 6_000,
    ...states,
  };
}

async function getConversation(conversationId: string, memberId: string, chapter: string) {
  const [conversation] = await db.select().from(directConversationsTable)
    .where(conversationWhere(conversationId, memberId)).limit(1);
  if (!conversation || !conversation.participantOneId || !conversation.participantTwoId) return undefined;
  const peerId = conversation.participantOneId === memberId ? conversation.participantTwoId : conversation.participantOneId;
  const peer = await peerDetails(memberId, peerId, chapter);
  if (!peer) return undefined;
  const [[unread], [last]] = await Promise.all([
    db.select({ total: count() }).from(directMessagesTable).where(and(eq(directMessagesTable.conversationId, conversation.id), eq(directMessagesTable.recipientId, memberId), isNull(directMessagesTable.readAt))),
    db.select().from(directMessagesTable).where(eq(directMessagesTable.conversationId, conversation.id)).orderBy(desc(directMessagesTable.createdAt), desc(directMessagesTable.id)).limit(1),
  ]);
  return { id: conversation.id, chapter: conversation.chapter, lastMessageAt: conversation.lastMessageAt, peer, unreadCount: Number(unread?.total ?? 0), ...(last ? { lastMessage: serializeMessage(last, memberId) } : {}) };
}

router.get("/messages/conversations", requireAuth, async (request, response, next) => {
  try {
    const memberId = request.user!.id, chapter = request.user!.chapter;
    await touchPresence(memberId);
    const rows = await db.select().from(directConversationsTable).where(or(eq(directConversationsTable.participantOneId, memberId), eq(directConversationsTable.participantTwoId, memberId))).orderBy(desc(directConversationsTable.lastMessageAt));
    const conversations = (await Promise.all(rows.map((row) => getConversation(row.id, memberId, chapter)))).filter((value): value is NonNullable<typeof value> => !!value);
    response.json({ conversations });
  } catch (error) { next(error); }
});

router.get("/messages/conversations/:conversationId", requireAuth, async (request, response, next) => {
  try {
    const conversationId = uuid.parse(request.params.conversationId);
    const { limit, cursor } = threadSchema.parse(request.query);
    const memberId = request.user!.id, chapter = request.user!.chapter;
    await touchPresence(memberId);
    const conversation = await getConversation(conversationId, memberId, chapter);
    if (!conversation) throw new HttpError(404, "Conversation not found.");
    const before = parseCursor(cursor);
    const rows = await db.select().from(directMessagesTable).where(and(eq(directMessagesTable.conversationId, conversationId), ...(before ? [or(lt(directMessagesTable.createdAt, before.createdAt), and(eq(directMessagesTable.createdAt, before.createdAt), lt(directMessagesTable.id, before.id)))] : []))).orderBy(desc(directMessagesTable.createdAt), desc(directMessagesTable.id)).limit(limit + 1);
    const hasMore = rows.length > limit, page = rows.slice(0, limit);
    response.json({ conversation, messages: page.map((row) => serializeMessage(row, memberId)).reverse(), nextCursor: hasMore ? cursorFor(page[page.length - 1]!) : null });
  } catch (error) { next(error); }
});

router.post("/messages", requireAuth, async (request, response, next) => {
  try {
    const input = sendSchema.parse(request.body);
    const senderId = request.user!.id;
    const result = await db.transaction(async (tx) => {
      const [current] = await tx.select({ chapter: membersTable.chapter, status: membersTable.status }).from(membersTable).where(eq(membersTable.id, senderId)).limit(1);
      if (!current || current.status !== "active") throw new HttpError(404, "Member not found.");
      await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtextextended(${current.chapter}, 0::bigint))`);
      const sender = await activeMember(senderId, current.chapter, tx);
      if (!sender) throw new HttpError(404, "Member not found.");
      const [existing] = await tx.select().from(directMessagesTable).where(and(eq(directMessagesTable.senderId, senderId), eq(directMessagesTable.clientMessageId, input.clientMessageId))).limit(1);
       if (existing) {
         if (
           existing.recipientId !== input.recipientId ||
           (input.conversationId &&
             existing.conversationId !== input.conversationId)
         ) {
           throw new HttpError(409, "The message retry identifier is already in use.");
         }
         return { message: existing, idempotent: true };
       }
      const recipient = await activeMember(input.recipientId, current.chapter, tx);
      if (!recipient || senderId === recipient.id) throw new HttpError(404, "Member not found.");
      const blocks = await blockState(senderId, recipient.id, tx);
      if (blocks.isBlocked || blocks.hasBlockedYou) throw new HttpError(403, "Messaging is unavailable for this member.");
      const [conversation] = input.conversationId
        ? await tx.select().from(directConversationsTable).where(conversationWhere(input.conversationId, senderId)).limit(1)
        : await tx.select().from(directConversationsTable).where(and(eq(directConversationsTable.participantOneId, [senderId, recipient.id].sort()[0]!), eq(directConversationsTable.participantTwoId, [senderId, recipient.id].sort()[1]!))).limit(1);
      if (input.conversationId && (!conversation || ![conversation.participantOneId, conversation.participantTwoId].includes(recipient.id))) throw new HttpError(404, "Conversation not found.");
      const resolved = conversation ?? (await tx.insert(directConversationsTable).values({ chapter: current.chapter, participantOneId: [senderId, recipient.id].sort()[0]!, participantTwoId: [senderId, recipient.id].sort()[1]! }).returning())[0]!;
      const [message] = await tx.insert(directMessagesTable).values({ conversationId: resolved.id, senderId, recipientId: recipient.id, chapter: current.chapter, clientMessageId: input.clientMessageId, encryptedBody: encryptMessage(input.body, messageAssociatedData({ conversationId: resolved.id, senderId, recipientId: recipient.id })) }).returning();
      await tx.update(directConversationsTable).set({ lastMessageAt: message.createdAt, updatedAt: new Date() }).where(eq(directConversationsTable.id, resolved.id));
      return { message, idempotent: false };
    });
    await touchPresence(senderId);
    response.status(result.idempotent ? 200 : 201).json({ conversationId: result.message.conversationId, message: serializeMessage(result.message, senderId), idempotent: result.idempotent });
  } catch (error) { next(error); }
});

router.post("/messages/conversations/:conversationId/read", requireAuth, async (request, response, next) => {
  try {
    const conversationId = uuid.parse(request.params.conversationId);
    const { messageId } = readSchema.parse(request.body);
    const memberId = request.user!.id;
    const updatedCount = await db.transaction(async (tx) => {
      const [current] = await tx.select({ chapter: membersTable.chapter, status: membersTable.status }).from(membersTable).where(eq(membersTable.id, memberId)).limit(1);
      if (!current || current.status !== "active") throw new HttpError(404, "Conversation not found.");
      await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtextextended(${current.chapter}, 0::bigint))`);
      if (!await activeMember(memberId, current.chapter, tx)) throw new HttpError(404, "Conversation not found.");
       const [conversation] = await tx.select().from(directConversationsTable).where(conversationWhere(conversationId, memberId)).limit(1);
      if (!conversation) throw new HttpError(404, "Conversation not found.");
      const peerId = conversation.participantOneId === memberId
        ? conversation.participantTwoId
        : conversation.participantOneId;
      if (!peerId || !await activeMember(peerId, current.chapter, tx)) {
        throw new HttpError(404, "Conversation not found.");
      }
      const [through] = await tx.select({ createdAt: directMessagesTable.createdAt }).from(directMessagesTable).where(and(eq(directMessagesTable.id, messageId), eq(directMessagesTable.conversationId, conversationId))).limit(1);
      if (!through) throw new HttpError(404, "Message not found.");
      const updated = await tx.update(directMessagesTable).set({ readAt: new Date() }).where(and(eq(directMessagesTable.conversationId, conversationId), eq(directMessagesTable.recipientId, memberId), isNull(directMessagesTable.readAt), sql`${directMessagesTable.createdAt} <= ${through.createdAt}`)).returning({ id: directMessagesTable.id });
      return updated.length;
    });
    await touchPresence(memberId);
    response.json({ readThroughMessageId: messageId, updatedCount });
  } catch (error) { next(error); }
});

router.get("/messages/unread-count", requireAuth, async (request, response, next) => {
  try {
    const memberId = request.user!.id;
    await touchPresence(memberId);
    const conversations = await db.select().from(directConversationsTable).where(
      or(eq(directConversationsTable.participantOneId, memberId), eq(directConversationsTable.participantTwoId, memberId)),
    );
    const visibleIds = (await Promise.all(conversations.map(async (conversation) => {
      const peerId = conversation.participantOneId === memberId ? conversation.participantTwoId : conversation.participantOneId;
      return peerId && await activeMember(peerId, request.user!.chapter) ? conversation.id : undefined;
    }))).filter((id): id is string => !!id);
    let unreadCount = 0;
    if (visibleIds.length > 0) {
      const [result] = await db.select({ total: count() }).from(directMessagesTable).where(and(
        inArray(directMessagesTable.conversationId, visibleIds),
        eq(directMessagesTable.recipientId, memberId),
        isNull(directMessagesTable.readAt),
      ));
      unreadCount = Number(result?.total ?? 0);
    }
    response.json({ unreadCount });
  } catch (error) { next(error); }
});

async function changeBlock(memberId: string, peerId: string, blocked: boolean) {
  return db.transaction(async (tx) => {
    const [current] = await tx.select({ chapter: membersTable.chapter, status: membersTable.status }).from(membersTable).where(eq(membersTable.id, memberId)).limit(1);
    if (!current || current.status !== "active") throw new HttpError(404, "Member not found.");
    await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtextextended(${current.chapter}, 0::bigint))`);
    const [self, peer] = await Promise.all([activeMember(memberId, current.chapter, tx), activeMember(peerId, current.chapter, tx)]);
    if (!self || !peer || self.id === peer.id) throw new HttpError(404, "Member not found.");
    if (blocked) {
      await tx.insert(directMessageBlocksTable).values({ blockerId: memberId, blockedId: peerId }).onConflictDoNothing();
    } else {
      await tx.delete(directMessageBlocksTable).where(and(eq(directMessageBlocksTable.blockerId, memberId), eq(directMessageBlocksTable.blockedId, peerId)));
    }
  });
}

router.put("/messages/blocks/:memberId", requireAuth, async (request, response, next) => {
  try {
    const peerId = uuid.parse(request.params.memberId);
    await changeBlock(request.user!.id, peerId, true);
    await touchPresence(request.user!.id);
    response.json({ memberId: peerId, blocked: true });
  } catch (error) { next(error); }
});

router.delete("/messages/blocks/:memberId", requireAuth, async (request, response, next) => {
  try {
    const peerId = uuid.parse(request.params.memberId);
    await changeBlock(request.user!.id, peerId, false);
    await touchPresence(request.user!.id);
    response.json({ memberId: peerId, blocked: false });
  } catch (error) { next(error); }
});

router.post("/messages/typing", requireAuth, async (request, response, next) => {
  try {
    const { recipientId, isTyping } = typingSchema.parse(request.body);
    const memberId = request.user!.id;
    await db.transaction(async (tx) => {
      const [current] = await tx.select({ chapter: membersTable.chapter, status: membersTable.status }).from(membersTable).where(eq(membersTable.id, memberId)).limit(1);
      if (!current || current.status !== "active") throw new HttpError(404, "Member not found.");
      await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtextextended(${current.chapter}, 0::bigint))`);
      const [self, peer] = await Promise.all([activeMember(memberId, current.chapter, tx), activeMember(recipientId, current.chapter, tx)]);
      if (!self || !peer || self.id === peer.id) throw new HttpError(404, "Member not found.");
      const blocks = await blockState(memberId, recipientId, tx);
      if (blocks.isBlocked || blocks.hasBlockedYou) throw new HttpError(403, "Messaging is unavailable for this member.");
      const now = new Date();
      await tx.insert(directMessagePresenceTable).values({ memberId, lastSeenAt: now, typingToMemberId: isTyping ? recipientId : null, typingUpdatedAt: isTyping ? now : null }).onConflictDoUpdate({
        target: directMessagePresenceTable.memberId,
        set: { lastSeenAt: now, typingToMemberId: isTyping ? recipientId : null, typingUpdatedAt: isTyping ? now : null },
      });
    });
    response.json({ recipientId, isTyping });
  } catch (error) { next(error); }
});

export default router;
