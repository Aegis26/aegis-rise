---
name: Password reset serialization
description: Concurrency rule for issuing and consuming emailed password-reset tokens safely.
---

Password-reset issuance and consumption must serialize on the same member-level database advisory lock. Keep previously issued, unexpired links valid until one reset succeeds, then consume every outstanding token for that member atomically.

**Why:** Locking only by token lets a reset race a new issuance and consume a link before or while it is emailed. Invalidating earlier tokens during every request can also make reordered email deliveries contain stale links.

**How to apply:** Hold the member lock through token persistence and email-provider acceptance, re-read token state after acquiring that lock during reset, and update the password plus all unused member tokens in one transaction.