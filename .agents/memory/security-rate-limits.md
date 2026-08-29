---
name: Security rate limits
description: Production rule for rate limiting credential-changing operations across restarts and replicas.
---

Credential-changing rate limits must use shared, durable storage and atomically serialize each member's rolling-window count and attempt insertion.

**Why:** An in-process limiter resets during restarts, grants a separate allowance on every API replica, and can lose active windows during memory eviction.

**How to apply:** For password or other credential mutations, key attempts by authenticated member identity, count failures and successes, expire old attempts, and lock the count-plus-insert operation so concurrent requests cannot exceed the limit.