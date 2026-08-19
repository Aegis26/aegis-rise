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
- `R2_ACCESS_KEY_ID` — R2 S3 API access key ID.
- `R2_SECRET_ACCESS_KEY` — R2 S3 API secret access key.
- `R2_BUCKET_NAME` — R2 bucket used for image storage.
- `R2_PUBLIC_URL` — public R2 development URL or custom-domain base URL.
- `APP_BASE_URL` — public web-app base URL used in share previews. It is required in production; development falls back to an approved local or Replit development host.
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

## Media uploads and posts

All media and post endpoints require a bearer token for an active member.

- `POST /api/upload/image` accepts one multipart field named `image`. JPG, PNG, and GIF files must be smaller than 5 MB. Images are resized to at most 800 pixels wide, stripped of metadata, and stored in R2. Animated GIFs are stored as a safe, static first-frame GIF.
- `POST /api/posts` creates a post from a required `caption` and optional `imageUrl`.
- `DELETE /api/posts/:id` deletes a post owned by the authenticated member.
- `GET /api/posts/feed?page=1&limit=20` returns active-member posts with author details, share counts, and pagination.
- `GET /api/posts/:id` returns one visible post.
- `GET /api/members/:id/posts?page=1&limit=20` returns an active member's posts with pagination.

Pagination limits are bounded to 1–100 items per page.

## Sharing and analytics

Active members can record and format shares for LinkedIn, Instagram, Facebook, TikTok, and Direct Link:

- `POST /api/posts/:id/share` with `{ "platform": "LinkedIn" }` records a share and returns the updated `shareCount`.
- `GET /api/posts/:id/shares` returns `totalShares` and counts for every supported platform.
- `GET /api/members/me/shares?page=1&limit=20` returns the authenticated member's share history.
- `GET /api/posts/:id/share-preview?platform=LinkedIn` returns copy-ready `caption`, `hashtags`, and `note` fields. The platform defaults to Direct Link.
- `GET /api/admin/analytics/shares` returns all-time/monthly totals, top shared posts, top sharing members, platform totals, and a 30-day daily trend for administrators.

Share previews are truncated to the supported platform character limit. Animated GIFs and share analytics are available through the API; a frontend share button can use these endpoints directly.