---
name: Drizzle migration generation
description: Migration output conventions for this workspace's Drizzle package.
---

Drizzle Kit expects the migration output path to be relative to the package working directory and requires `drizzle/meta/_journal.json` to exist before the first generation.

**Why:** An absolute `out` path and a missing journal caused generation to look for malformed paths instead of creating the initial migration.

**How to apply:** Keep `out` as `./drizzle`, create the initial journal when bootstrapping a new schema, then use the package's `generate` script.