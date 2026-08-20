---
name: LinkedIn Posts API version
description: Version-header requirement for LinkedIn REST post creation
---

LinkedIn REST post creation requires an active `Linkedin-Version` header in `YYYYMM` format. The Phase 1 integration uses `202608` as the default while retaining an environment override for future version rollovers.

**Why:** LinkedIn rejects inactive API versions with `426 Upgrade Required` and `NONEXISTENT_VERSION`, even when the OAuth token, REST endpoint, and request payload are valid.

**How to apply:** When LinkedIn publishing fails with a version rejection, update the configured header to an active version from the current LinkedIn Posts API documentation; do not diagnose it as an OAuth-token failure.