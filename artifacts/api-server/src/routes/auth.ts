import { Router, type IRouter } from "express";
import bcrypt from "bcryptjs";
import { eq, sql } from "drizzle-orm";
import { z } from "zod/v4";
import { chapterConfigsTable, db, membersTable } from "../db";
import { createAccessToken } from "../middleware/auth";
import { HttpError } from "../utils/errors";

const router: IRouter = Router();

const passwordSchema = z
  .string()
  .min(8)
  .max(128)
  .refine((password) => Buffer.byteLength(password, "utf8") <= 72, {
    message: "Password must be at most 72 bytes when UTF-8 encoded.",
  });

const signupSchema = z.object({
  email: z.string().trim().email().max(320),
  password: passwordSchema,
  name: z.string().trim().min(1).max(120),
  title: z.string().trim().min(1).max(160),
  company: z.string().trim().min(1).max(160),
  chapter: z.string().trim().min(1).max(160),
  bio: z.string().trim().max(2_000).optional(),
  signupSource: z.string().trim().min(1).max(160).optional(),
});

const loginSchema = z.object({
  email: z.string().trim().email().max(320),
  password: passwordSchema,
});

router.post("/auth/signup", async (request, response, next) => {
  try {
    const input = signupSchema.parse(request.body);
    const email = input.email.toLowerCase();

    const [existingMember] = await db
      .select({ id: membersTable.id })
      .from(membersTable)
      .where(eq(membersTable.email, email))
      .limit(1);

    if (existingMember) {
      throw new HttpError(409, "An account with this email already exists.");
    }

    const passwordHash = await bcrypt.hash(input.password, 12);
    const signupResult = await db.transaction(async (transaction) => {
      await transaction.execute(sql`
        SELECT pg_advisory_xact_lock(
          hashtextextended(${input.chapter}, 0::bigint)
        )
      `);

      const [chapterConfig] = await transaction
        .select({
          id: chapterConfigsTable.id,
          nameReserved: chapterConfigsTable.nameReserved,
          signupGuardPending: chapterConfigsTable.signupGuardPending,
        })
        .from(chapterConfigsTable)
        .where(eq(chapterConfigsTable.chapterName, input.chapter))
        .limit(1);
      if (chapterConfig?.nameReserved) {
        return { status: "reserved" as const };
      }
      if (chapterConfig?.signupGuardPending) {
        await transaction
          .update(chapterConfigsTable)
          .set({ signupGuardPending: false })
          .where(eq(chapterConfigsTable.id, chapterConfig.id));

        return { status: "retry" as const };
      }

      const [duplicateMember] = await transaction
        .select({ id: membersTable.id })
        .from(membersTable)
        .where(eq(membersTable.email, email))
        .limit(1);
      if (duplicateMember) {
        throw new HttpError(409, "An account with this email already exists.");
      }

      const [createdMember] = await transaction
        .insert(membersTable)
        .values({
          email,
          passwordHash,
          name: input.name,
          title: input.title,
          company: input.company,
          chapter: input.chapter,
          bio: input.bio,
          signupSource: input.signupSource,
          status: "pending",
        })
        .returning({
          id: membersTable.id,
          email: membersTable.email,
          name: membersTable.name,
          chapter: membersTable.chapter,
          status: membersTable.status,
        });

      return { status: "created" as const, member: createdMember };
    });
    if (signupResult.status === "retry") {
      throw new HttpError(
        409,
        "The selected chapter was recently renamed. Please confirm it and try again.",
      );
    }
    if (signupResult.status === "reserved") {
      throw new HttpError(
        409,
        "The selected chapter name is no longer available.",
      );
    }

    response.status(201).json({
      ...signupResult.member,
      message: "Pending admin approval",
    });
  } catch (error) {
    next(error);
  }
});

router.post("/auth/login", async (request, response, next) => {
  try {
    const input = loginSchema.parse(request.body);
    const email = input.email.toLowerCase();
    const [member] = await db
      .select()
      .from(membersTable)
      .where(eq(membersTable.email, email))
      .limit(1);

    if (
      !member ||
      !member.passwordHash ||
      !(await bcrypt.compare(input.password, member.passwordHash))
    ) {
      throw new HttpError(401, "Invalid email or password.");
    }

    if (member.status !== "active") {
      throw new HttpError(
        401,
        member.status === "pending"
          ? "Your account is awaiting admin approval."
          : "Your account is not eligible for access.",
      );
    }

    const lastLoginAt = new Date();
    await db
      .update(membersTable)
      .set({ lastLoginAt, updatedAt: lastLoginAt })
      .where(eq(membersTable.id, member.id));

    const token = createAccessToken(member);
    response.json({
      token,
      member: {
        id: member.id,
        name: member.name,
        email: member.email,
        role: member.role,
        status: member.status,
      },
    });
  } catch (error) {
    next(error);
  }
});

router.post("/auth/logout", (_request, response) => {
  response.json({ message: "Logged out successfully." });
});

export default router;