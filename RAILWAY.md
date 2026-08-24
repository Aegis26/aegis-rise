# Railway deployment

Aegis Rise is configured to run as one Railway application service. The service
builds the React web app and Express API together, serves both from the same
domain, and uses Railway's assigned `PORT`.

## Create the Railway project

1. Create a new Railway project named **Aegis Rise**.
2. Add a **PostgreSQL** service.
3. Add a service from the GitHub repository containing this workspace.
4. Leave the service root directory at the repository root so Railway can use
   `railway.toml`.
5. Generate a public domain for the application service.

Railway should detect `railway.toml` and use:

- Build: `pnpm run build:railway`
- Pre-deploy: `pnpm --filter @workspace/db run migrate`
- Start: `pnpm run start:railway`
- Health check: `/api/readyz`

The pre-deploy migration runs against the Railway `DATABASE_URL` before the
new application process starts. If a migration fails, Railway must not promote
the deployment; inspect the deployment logs and correct the migration before
retrying.

## Environment variables

Add these in the Railway application service. Do not commit their values to
the repository.

### Required

| Variable | Value |
| --- | --- |
| `DATABASE_URL` | Railway PostgreSQL connection URL, preferably through Railway's service reference |
| `JWT_SECRET` | A long, random production signing secret |
| `SOCIAL_TOKEN_ENCRYPTION_KEY` | A base64-encoded random 32-byte key |
| `R2_ACCESS_KEY_ID` | Cloudflare R2 access key |
| `R2_SECRET_ACCESS_KEY` | Cloudflare R2 secret key |
| `LINKEDIN_CLIENT_ID` | LinkedIn application client ID |
| `LINKEDIN_CLIENT_SECRET` | LinkedIn application secret |
| `FACEBOOK_CLIENT_ID` | Meta application client ID |
| `FACEBOOK_CLIENT_SECRET` | Meta application secret |
| `FACEBOOK_LOGIN_CONFIG_ID` | Optional but recommended: Meta Facebook Login for Business Configuration ID for Page publishing |
| `INSTAGRAM_CLIENT_ID` | Instagram/Meta application client ID |
| `INSTAGRAM_CLIENT_SECRET` | Instagram/Meta application secret |
| `APP_BASE_URL` | The generated Railway application URL, including `https://` and no trailing slash |

### Required R2 configuration

| Variable | Value |
| --- | --- |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare account ID |
| `R2_BUCKET_NAME` | R2 bucket name |
| `R2_PUBLIC_URL` | Public R2 URL |

`PORT`, `NODE_ENV`, and `SERVE_WEB` are set by the Railway start command or
provided by Railway. Do not set `PORT` to a fixed local-development port.

## Facebook Page publishing configuration

Facebook Page publishing uses **Facebook Login for Business**. In the Meta App
Dashboard:

1. Use a **Business** type app and add the **Facebook Login for Business**
   product.
2. Create a **User access token** configuration that includes Page assets and
   the `pages_show_list`, `pages_read_engagement`, and `pages_manage_posts`
   permissions.
3. Copy the resulting Configuration ID into `FACEBOOK_LOGIN_CONFIG_ID` for the
   Railway application service and the development environment.
4. Add the exact callback URL for each environment. For production, use:

   ```text
   https://YOUR-RAILWAY-DOMAIN/api/auth/social/callback/facebook
   ```

   For a Replit preview, use the current preview domain with the same callback
   path. Preview domains can change, so update the Meta redirect URI before
   testing from a new development host.
5. While the Meta app is in development mode, the person connecting must be an
   app administrator, developer, or tester and must have access to the target
   Facebook Page. Publishing for people outside those roles requires Meta
   business verification and Advanced Access approval for the Page permissions.

## Database setup

After the Railway PostgreSQL service is available:

1. Confirm the application service receives its production `DATABASE_URL`.
2. Allow Railway's pre-deploy command to run the existing Drizzle migrations.
   Do not run a duplicate manual migration as part of a normal deployment.
3. Do not copy development data into production unless it has been reviewed
   and intentionally approved.

## First administrator bootstrap

A new production database intentionally has no administrator. Create the first
administrator only after:

1. The Railway deployment is healthy at `/api/readyz`.
2. The intended person has completed the normal Aegis Rise signup flow with
   their own strong password.

That signup remains pending by design. In Railway's private PostgreSQL query
console, start a transaction and run the following statement after replacing
`<admin-email>` with the intended administrator's email. Do not save the
email, password, or query history in the repository.

```sql
BEGIN;

UPDATE members
SET role = 'admin', status = 'active', updated_at = NOW()
WHERE email = lower('<admin-email>')
  AND status = 'pending'
RETURNING id, email, chapter, role, status;
```

Confirm that exactly one row is returned and that the chapter is correct, then
run:

```sql
COMMIT;
```

If no row or an unexpected row is returned, run `ROLLBACK;` instead. The new
administrator can then sign in and approve later members through Aegis Rise.
Use `super_admin` only for a trusted operator who must manage multiple
chapters.

## OAuth callback URLs

After the Railway domain is generated, register these exact callback URLs with
each provider:

```text
https://YOUR-RAILWAY-DOMAIN/api/auth/social/callback/linkedin
https://YOUR-RAILWAY-DOMAIN/api/auth/social/callback/facebook
https://YOUR-RAILWAY-DOMAIN/api/auth/social/callback/instagram
```

The Facebook callback also requires a valid Facebook Login for Business
configuration and approved Page permissions. LinkedIn and Meta provider review
requirements still apply.

## Smoke test

1. Open `https://YOUR-RAILWAY-DOMAIN/api/readyz` and confirm `{ "status": "ok" }`.
2. Open `https://YOUR-RAILWAY-DOMAIN/privacy` and confirm the public policy page
   loads without authentication.
3. Create or use an approved test member.
4. Connect an approved social test account.
5. Create a post with multiple images.
6. Share it to LinkedIn and confirm the per-platform publishing result.

Facebook and Instagram publishing should only be tested after their Meta
configuration and publishing eligibility are approved. External shares are
recorded even when a provider rejects a publish request.