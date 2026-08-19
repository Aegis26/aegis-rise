---
name: Password auth rollout
description: Safe migration rule for adding password authentication to pre-existing members.
---

Do not consider a nullable password-hash migration sufficient when adding password authentication to an existing member base. It only keeps the database migration running; legacy members, including administrators, still need a secure, expiring credential-setup or reset path before they can use protected routes.

**Why:** A pre-auth administrator with no password hash cannot log in to approve pending members, which can block the entire approval workflow after rollout.

**How to apply:** Ship a server-stored, single-use password-establishment/reset flow with rate limiting before enabling password auth for a populated environment. Keep the bcrypt byte-limit validation consistent between signup, login, and reset.