---
name: LinkedIn OAuth scopes
description: Scope constraints for standard LinkedIn OAuth applications
---

Standard LinkedIn apps should request only `openid`, `profile`, and `w_member_social` when using OpenID Connect and member posting. Do not request `offline_access` unless the application is an approved Marketing Developer Platform partner with refresh-token access.

**Why:** LinkedIn rejected the combined request with `invalid_scope_error` because standard apps do not support the refresh-token permission.

**How to apply:** Keep refresh-token handling optional in the server, but omit `offline_access` from the standard authorization URL and rely on member reauthorization when the access token expires.