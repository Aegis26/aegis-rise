import { Router, type IRouter } from "express";
import bcrypt from "bcryptjs";
import { and, eq, lt, sql } from "drizzle-orm";
import { z } from "zod/v4";
import {
  chapterConfigsTable,
  db,
  membersTable,
  passwordChangeAttemptsTable,
} from "../db";
import { createAccessToken, requireAuth } from "../middleware/auth";
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

const newPasswordSchema = passwordSchema
  .min(8, "New password must be at least 8 characters.")
  .refine((password) => /[A-Z]/.test(password), {
    message: "New password must include an uppercase letter.",
  })
  .refine((password) => /[a-z]/.test(password), {
    message: "New password must include a lowercase letter.",
  })
  .refine((password) => /[0-9]/.test(password), {
    message: "New password must include a number.",
  })
  .refine((password) => /[^A-Za-z0-9]/.test(password), {
    message: "New password must include a special character.",
  });

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required."),
    newPassword: newPasswordSchema,
    confirmNewPassword: z.string().min(1, "Please confirm your new password."),
  })
  .refine((input) => input.newPassword === input.confirmNewPassword, {
    path: ["confirmNewPassword"],
    message: "New passwords do not match.",
  });

const PASSWORD_CHANGE_LIMIT = 5;
const PASSWORD_CHANGE_WINDOW_MS = 60 * 60 * 1000;

async function recordPasswordChangeAttempt(memberId: string): Promise<boolean> {
  const windowStart = new Date(Date.now() - PASSWORD_CHANGE_WINDOW_MS);

  return db.transaction(async (transaction) => {
    await transaction.execute(sql`
      SELECT pg_advisory_xact_lock(
        hashtextextended(${"password-change:" + memberId}, 0::bigint)
      )
    `);

    await transaction
      .delete(passwordChangeAttemptsTable)
      .where(
        and(
          eq(passwordChangeAttemptsTable.memberId, memberId),
          lt(passwordChangeAttemptsTable.attemptedAt, windowStart),
        ),
      );

    const [attemptCount] = await transaction
      .select({ total: sql<number>`count(*)::int` })
      .from(passwordChangeAttemptsTable)
      .where(eq(passwordChangeAttemptsTable.memberId, memberId));

    if (Number(attemptCount?.total ?? 0) >= PASSWORD_CHANGE_LIMIT) {
      return false;
    }

    await transaction
      .insert(passwordChangeAttemptsTable)
      .values({ memberId });

    return true;
  });
}

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

router.post("/auth/change-password", requireAuth, async (request, response, next) => {
  try {
    const memberId = request.user!.id;
    if (!(await recordPasswordChangeAttempt(memberId))) {
      throw new HttpError(
        429,
        "Too many password change attempts. Please try again later.",
      );
    }

    const parsedInput = changePasswordSchema.safeParse(request.body);
    if (!parsedInput.success) {
      throw new HttpError(
        400,
        parsedInput.error.issues[0]?.message ??
          "Password does not meet the requirements.",
      );
    }

    const { currentPassword, newPassword } = parsedInput.data;
    const [member] = await db
      .select({ passwordHash: membersTable.passwordHash })
      .from(membersTable)
      .where(eq(membersTable.id, memberId))
      .limit(1);

    if (
      !member?.passwordHash ||
      !(await bcrypt.compare(currentPassword, member.passwordHash))
    ) {
      throw new HttpError(401, "Current password is incorrect.");
    }

    if (currentPassword === newPassword) {
      throw new HttpError(
        400,
        "New password must be different from your current password.",
      );
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await db
      .update(membersTable)
      .set({ passwordHash, updatedAt: new Date() })
      .where(eq(membersTable.id, memberId));

    response.json({ message: "Password changed successfully" });
  } catch (error) {
    next(error);
  }
});

router.post("/auth/logout", (_request, response) => {
  response.json({ message: "Logged out successfully." });
});

export default router;