# Aegis Rise

Aegis Rise is a multi-chapter social platform where members connect, collaborate, and amplify one another's content.

## Local development

1. Install dependencies with `pnpm install`.
2. Provision a PostgreSQL database and copy `artifacts/api-server/.env.example` to `.env`.
3. Set `DATABASE_URL` and the other environment variables listed below.
4. Apply the initial schema with `pnpm --filter @workspace/db run migrate` or use `pnpm --filter @workspace/db run push` for local development.
5. Start the API with `pnpm --filter @workspace/api-server run dev`.

The API listens on `PORT` (the workspace workflow supplies this automatically). Its health checks are available at `/api/health` and `/api/healthz`.

## Environment variables

- `DATABASE_URL` — PostgreSQL connection string.
- `JWT_SECRET` — reserved for the Phase 2 authentication flow.
- `CLOUDFLARE_ACCOUNT_ID` — Cloudflare account ID for R2.
- `CLOUDFLARE_API_TOKEN` — Cloudflare API token for R2.
- `R2_BUCKET_NAME` — R2 bucket used for image storage.
- `NODE_ENV` — `development` or `production`.
- `PORT` — server port; defaults are supplied by the workspace workflow.

## Database

The Drizzle source schema is in `lib/db/src/schema/index.ts`. The initial migration is in `lib/db/drizzle/0000_initial.sql`. Generate future migrations with:

```sh
pnpm --filter @workspace/db run generate
```

Run migrations with:

```sh
pnpm --filter @workspace/db run migrate
```