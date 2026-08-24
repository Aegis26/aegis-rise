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