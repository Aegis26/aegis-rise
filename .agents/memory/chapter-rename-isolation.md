---
name: Chapter rename isolation
description: Security rules for keeping mutable chapter names from crossing authorization and audit boundaries.
---

Treat chapter names as security-sensitive namespace labels until the project adopts immutable chapter IDs. Every chapter-scoped write must use the same transaction-level chapter lock as rename, revalidate the acting administrator after acquiring it, and reload mutable targets before writing. A rename must move audit history, reserve the former name with a non-sensitive tombstone, and coordinate target-name signups through the one-time confirmation guard.

**Why:** Concurrent signup and stale in-flight mutations could otherwise recreate a vacated name, merge memberships, or leave audit records that a different chapter could later read.

**How to apply:** Any new chapter-scoped mutation must join the shared lock/revalidation protocol. Never allow reserved names to be reused. If chapter identity moves to immutable IDs later, migrate members, configs, audit ownership, and authorization checks together before removing these safeguards.