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
- `JWT_SECRET` — required signing secret for Phase 2 authentication tokens.
- `CLOUDFLARE_ACCOUNT_ID` — Cloudflare account ID for R2.
- `CLOUDFLARE_API_TOKEN` — Cloudflare API token for R2.
- `R2_BUCKET_NAME` — R2 bucket used for image storage.
- `NODE_ENV` — `development` or `production`.
- `PORT` — server port; defaults are supplied by the workspace workflow.

## Database

The Drizzle source schema is in `lib/db/src/schema/index.ts`. The generated migrations are in `lib/db/drizzle`. Generate future migrations with:

```sh
pnpm --filter @workspace/db run generate
```

Run migrations with:

```sh
pnpm --filter @workspace/db run migrate
```

## Authentication and approval

`POST /api/auth/signup` accepts a password along with the member profile fields and always creates a pending member. Pending and banned members cannot log in. An active administrator can then use the protected `/api/admin` routes to approve, deny, or ban applications.

Passwords must be at least 8 characters and no more than 72 UTF-8 bytes, matching bcrypt's secure input limit. Members created before Phase 2 have no password credential and must establish one before they can log in.

Before accepting live signups, create the first administrator through the database after their application has been created:

```sql
UPDATE members
SET role = 'admin', status = 'active', updated_at = NOW()
WHERE email = 'administrator@example.com';
```

Replace the email address with the intended administrator's email. All later approvals use the authenticated admin endpoints.