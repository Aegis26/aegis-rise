import jwt, { type JwtPayload } from "jsonwebtoken";
import type { Request, RequestHandler } from "express";
import { eq } from "drizzle-orm";
import { db, membersTable, type Member } from "../db";
import { HttpError } from "../utils/errors";

export type AuthenticatedUser = Pick<
  Member,
  "id" | "email" | "name" | "role" | "status"
>;

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

const tokenLifetime = "7d";

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new HttpError(500, "JWT_SECRET is not configured.");
  }
  return secret;
}

function getBearerToken(request: Request): string {
  const authorization = request.header("authorization");
  if (!authorization?.startsWith("Bearer ")) {
    throw new HttpError(401, "A bearer token is required.");
  }

  const token = authorization.slice("Bearer ".length).trim();
  if (!token) {
    throw new HttpError(401, "A bearer token is required.");
  }

  return token;
}

async function authenticate(request: Request): Promise<AuthenticatedUser> {
  let payload: string | JwtPayload;
  const secret = getJwtSecret();

  try {
    payload = jwt.verify(getBearerToken(request), secret);
  } catch {
    throw new HttpError(401, "Your access token is invalid or expired.");
  }

  if (typeof payload === "string" || typeof payload.sub !== "string") {
    throw new HttpError(401, "Your access token is invalid or expired.");
  }

  const [member] = await db
    .select({
      id: membersTable.id,
      email: membersTable.email,
      name: membersTable.name,
      role: membersTable.role,
      status: membersTable.status,
    })
    .from(membersTable)
    .where(eq(membersTable.id, payload.sub))
    .limit(1);

  if (!member || member.status !== "active") {
    throw new HttpError(401, "Your account is not eligible for access.");
  }

  return member;
}

export function createAccessToken(member: AuthenticatedUser): string {
  return jwt.sign(
    { email: member.email, name: member.name, role: member.role },
    getJwtSecret(),
    { subject: member.id, expiresIn: tokenLifetime },
  );
}

export const verifyToken: RequestHandler = (request, _response, next) => {
  void authenticate(request)
    .then((member) => {
      request.user = member;
      next();
    })
    .catch(next);
};

export const requireAuth = verifyToken;

export const requireAdmin: RequestHandler = (request, _response, next) => {
  void authenticate(request)
    .then((member) => {
      if (member.role !== "admin") {
        throw new HttpError(403, "Administrator access is required.");
      }

      request.user = member;
      next();
    })
    .catch(next);
};