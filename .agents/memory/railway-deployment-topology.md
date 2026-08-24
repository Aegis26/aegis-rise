---
name: Railway deployment topology
description: The production deployment shape for Aegis Rise on Railway.
---

Deploy Aegis Rise to Railway as one application service that serves both the
compiled web app and the API, backed by a separate Railway PostgreSQL service.

**Why:** The browser client calls `/api` relatively and social OAuth callback
construction uses one configured public base URL. Separate frontend and API
domains would require new CORS, client-base-URL, and callback-domain decisions
and would make the existing deployment behavior less reliable.

**How to apply:** Keep the compiled SPA and `/api` routes on the same Railway
domain. Use the database-backed readiness endpoint for Railway health checks,
run migrations in pre-deploy, and bootstrap the first administrator only
through the documented, one-time private database procedure.

Railway's PostgreSQL service being online does not automatically expose its
connection or application configuration to the app service. The app service
must receive a `DATABASE_URL` reference to the PostgreSQL service and all
production variables before startup.

**Why:** Railway completed the build and migration, but the process could not
start until the app service's production environment variables were configured.

**How to apply:** Configure the database reference and required production
variables in the app service's production environment before retrying a
deployment; do not weaken the startup validation or remove the pre-deploy
migration.