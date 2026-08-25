---
name: Profile wallpaper security
description: Bound profile wallpaper persistence to validated owner-scoped storage and keep public profile responses presentation-only.
---

Persisted profile wallpaper URLs must be server-issued assets in the authenticated member’s own wallpaper storage prefix. Public member responses expose profile presentation fields only; do not add interface preferences, posting preferences, account state, or contact data.

**Why:** Allowing arbitrary remote URLs bypasses image validation and makes visitors fetch untrusted resources. Returning personal configuration on a public profile unnecessarily leaks member preferences.

**How to apply:** Keep wallpaper uploads owner-scoped and validate any non-null saved URL against that owner’s storage path. When changing the public profile contract, update the database selection, OpenAPI schema, and generated clients together, using a narrow allowlist.