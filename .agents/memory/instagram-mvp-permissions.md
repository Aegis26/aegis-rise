---
name: Instagram MVP permissions
description: Phase 1 boundary for Instagram account connections
---

Instagram uses only `public_profile` in Phase 1. It connects a basic Meta identity but is not an auto-post destination; professional-account access and posting are deferred to Phase 2.

**Why:** The product needs to validate the core experience before requesting Instagram publishing permissions or requiring a professional account and Page.

**How to apply:** Resolve Instagram through `/me` rather than Page or professional-account discovery, keep Instagram out of preferred auto-post platforms, and reject Instagram posting defensively in the server.