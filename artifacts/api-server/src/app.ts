import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import path from "node:path";
import { existsSync } from "node:fs";
import router from "./routes";
import { logger } from "./lib/logger";
import { errorHandler } from "./utils/errors";

const app: Express = express();

function isAllowedDevelopmentOrigin(origin: string): boolean {
  try {
    const url = new URL(origin);
    if (!["http:", "https:"].includes(url.protocol)) {
      return false;
    }

    const hostname = url.hostname.toLowerCase();
    return (
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname === "::1" ||
      hostname.endsWith(".replit.dev") ||
      hostname.endsWith(".repl.co")
    );
  } catch {
    return false;
  }
}

const configuredAppOrigin = (() => {
  const configuredBaseUrl = process.env.APP_BASE_URL?.trim();
  if (!configuredBaseUrl) {
    return undefined;
  }

  const parsed = new URL(configuredBaseUrl);
  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new Error("APP_BASE_URL must use HTTP or HTTPS.");
  }

  return parsed.origin;
})();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(
  cors({
    origin: (requestOrigin, callback) => {
      const allowedOrigins = new Set(
        [configuredAppOrigin].filter(
          (origin): origin is string => Boolean(origin),
        ),
      );

      if (
        !requestOrigin ||
        allowedOrigins.has(requestOrigin) ||
        (process.env.NODE_ENV !== "production" &&
          isAllowedDevelopmentOrigin(requestOrigin))
      ) {
        callback(null, true);
        return;
      }

      callback(new Error("Origin is not allowed by the API."));
    },
    credentials: true,
  }),
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

const serveWeb = process.env.SERVE_WEB === "true";
const webDistPath = path.resolve(
  process.cwd(),
  "artifacts/aegis-rise-web/dist/public",
);
const webIndexPath = path.join(webDistPath, "index.html");

if (serveWeb && !existsSync(webIndexPath)) {
  throw new Error(
    `The production web bundle is missing at ${webIndexPath}. Run the Railway web build before starting the API.`,
  );
}

if (serveWeb) {
  // Vite fingerprints everything under /assets with a content hash, so those
  // files are safe to cache aggressively: a new deploy always ships new
  // filenames. Everything else (index.html, favicon, robots.txt) keeps no
  // more than the browser's default validation caching so a redeploy can
  // never leave a client referencing assets that no longer exist on disk.
  app.use(
    "/assets",
    express.static(path.join(webDistPath, "assets"), {
      maxAge: "1y",
      immutable: true,
    }),
  );
  app.use(
    express.static(webDistPath, {
      index: false,
      setHeaders: (response) => {
        response.setHeader("Cache-Control", "no-cache");
      },
    }),
  );
  app.use((request, response, next) => {
    if (
      request.method !== "GET" ||
      request.path === "/api" ||
      request.path.startsWith("/api/")
    ) {
      next();
      return;
    }

    response.set("Cache-Control", "no-cache");
    response.sendFile(webIndexPath, (error) => {
      if (error) {
        next(error);
      }
    });
  });
}

app.use(errorHandler);

export default app;
