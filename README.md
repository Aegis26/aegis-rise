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

Before accepting live signups, create the first administrator through the
database after their application has been created. Run this in a transaction
and replace the placeholder only in the private database console:

```sql
BEGIN;

UPDATE members
SET role = 'admin', status = 'active', updated_at = NOW()
WHERE email = lower('<administrator-email>')
  AND status = 'pending'
RETURNING id, email, chapter, role, status;
```

Verify that exactly one expected row is returned, then run `COMMIT;`. If no
row or an unexpected row is returned, run `ROLLBACK;`. All later approvals use
the authenticated admin endpoints.

Administrators are chapter-scoped. Set `role = 'super_admin'` only for trusted operators who need access across all chapters. Super-admin endpoints accept an optional `?chapter=...` filter; regular administrators are always restricted to their own chapter.

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

## Admin dashboard backend

All routes below require an active administrator unless noted otherwise. Regular administrators only see and mutate resources from their own chapter.

### Moderation and members

- `GET /api/admin/posts?page=1&limit=50&featured=true&authorId=...` lists all chapter posts, including posts from pending or banned authors.
- `PATCH /api/admin/posts/:id/feature` and `/unfeature` update featured status. Featured posts appear first in the member feed.
- `DELETE /api/admin/posts/:id` accepts an optional `{ "reason": "..." }` and records an audit action.
- `GET /api/admin/members/all?page=1&limit=50&status=active` lists all chapter members with post/share counts and last login activity.
- `GET /api/admin/members/pending` lists pending applications. `/api/admin/pending-members` remains available as a compatibility alias.
- `PATCH /api/admin/members/:id/approve`, `/deny`, and `/ban` perform member moderation and record audit actions.
- `GET /api/admin/members/:id/activity` returns post, share, login, and join activity.

Approval and rejection notification functions currently return `{ "success": true, "delivery": "deferred" }`; no external email is sent in the MVP.

### Chapter settings and guidelines

- `GET` and `PATCH /api/admin/settings` read or update chapter branding and descriptions.
- `GET /api/admin/guidelines` is available to any active member for their chapter.
- `PATCH /api/admin/guidelines` updates chapter guidelines and requires administrator access.

Changing `chapterName` moves the chapter configuration, members, and audit history atomically. The former name becomes permanently reserved so it cannot be claimed by another chapter. To prevent a concurrent signup from silently joining a chapter during a rename, the first signup for the new name receives a `409` confirmation response and succeeds when retried. Super-admins can target a chapter with `?chapter=...`.

### Analytics and audit

- `GET /api/admin/analytics/overview`
- `GET /api/admin/analytics/posts`
- `GET /api/admin/analytics/members`
- `GET /api/admin/analytics/shares-timeline`
- `GET /api/admin/analytics/platforms`
- `GET /api/admin/logs?page=1&limit=50&action=ban_member`

Trend endpoints return exactly 30 UTC date buckets, including zero-activity days. Platform analytics always include all five supported share platforms.