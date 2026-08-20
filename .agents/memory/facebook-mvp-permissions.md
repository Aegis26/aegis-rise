---
name: Facebook MVP permissions
description: MVP boundary for Facebook account connections
---

Facebook uses only `email` and `public_profile` for this MVP. It connects a member identity but is not an auto-post destination.

**Why:** The product explicitly excludes Facebook Page management for the MVP. Meta does not support personal-profile publishing through this integration, so Page permissions would be required for Facebook auto-posting.

**How to apply:** Resolve Facebook through `/me` rather than Page discovery, keep Facebook out of preferred auto-post platforms, and reject Facebook posting defensively in the server.