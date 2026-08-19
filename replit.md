# Aegis Rise

A multi-chapter social platform where members connect, collaborate, and amplify each other's reach.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string
- API health checks: `/api/health` and `/api/healthz`

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/api-server/src` — Express entry point, routes, middleware, and server-facing types.
- `lib/db/src/schema/index.ts` — Drizzle source schema for members, posts, shares, and chapter configuration.
- `lib/db/drizzle` — generated/applicable PostgreSQL migrations.

## Architecture decisions

- Database schema is kept in the shared `@workspace/db` library so future frontend and API packages use the same model definitions.
- Authentication is intentionally deferred to Phase 2; `src/middleware/auth.ts` is the insertion point for managed auth.
- The API is mounted at `/api` to match the workspace proxy routing.

## Product

_Describe the high-level user-facing capabilities of this app once they exist._

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

_Populate as you build — sharp edges, "always run X before Y" rules._

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
