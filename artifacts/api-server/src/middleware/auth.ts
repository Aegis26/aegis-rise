import type { RequestHandler } from "express";

/**
 * Authentication is intentionally deferred to Phase 2.
 * Keep this middleware as the stable insertion point for Clerk or Replit Auth.
 */
export const requireAuth: RequestHandler = (_req, _res, next) => {
  next();
};