---
name: Aegis Rise API change rollout steps
description: What must run, in order, after adding/changing an admin API route or mod_action-style enum in this monorepo — and why a plain typecheck isn't enough.
---

Adding a new backend route or DB enum value in this project (e.g. a new admin mutation) requires all of:

1. Add the value to the relevant Postgres enum in `lib/db/src/schema/index.ts`, then run `pnpm run generate` and `pnpm run migrate` inside `lib/db` to create and apply the migration.
2. Add the path/operation and any new schema to `lib/api-spec/openapi.yaml` (including updating any enum literal lists duplicated elsewhere in the spec, e.g. an action-type enum used by a logs endpoint).
3. Run `pnpm run codegen` inside `lib/api-spec` (orval) to regenerate `lib/api-client-react` and `lib/api-zod` — this also runs `typecheck:libs`.
4. Restart the `artifacts/api-server: API Server` workflow explicitly.

**Why:** the API server's dev command is `build && start`, a one-shot build — not a watcher. Editing route files does not hot-reload it, and running `tsc --build`/typecheck does not rebuild its bundle either. A new route will 404 ("Cannot DELETE ...") until that workflow is restarted, even though the code and types are correct. This cost a full debug cycle once before the cause was found.

**How to apply:** after any backend route/schema change in this project, restart the API server workflow before testing — don't rely on typecheck passing or the web workflow's HMR as a signal that the backend picked up the change.
