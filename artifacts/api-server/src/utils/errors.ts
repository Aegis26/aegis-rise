import type { ErrorRequestHandler } from "express";
import { z } from "zod/v4";
import { logger } from "../lib/logger";

export class HttpError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
  ) {
    super(message);
    this.name = "HttpError";
  }
}

export const errorHandler: ErrorRequestHandler = (error, req, res, _next) => {
  logger.error({ err: error, requestId: req.id }, "Unhandled request error");

  if (res.headersSent) {
    return;
  }

  if (error instanceof HttpError) {
    res.status(error.statusCode).json({
      error: error.statusCode >= 500 ? "Internal Server Error" : error.name,
      message: error.message,
    });
    return;
  }

  if (error instanceof z.ZodError) {
    res.status(400).json({
      error: "Validation Error",
      message: "Invalid request input.",
      issues: error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
      })),
    });
    return;
  }

  res.status(500).json({
    error: "Internal Server Error",
    message:
      process.env.NODE_ENV === "production"
        ? "An unexpected error occurred."
        : error instanceof Error
          ? error.message
          : "An unexpected error occurred.",
  });
};