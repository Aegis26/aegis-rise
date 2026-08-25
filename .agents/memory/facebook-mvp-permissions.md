---
name: Facebook Page publishing
description: Meta requirements for connecting Facebook Pages and publishing posts.
---

Facebook connections target managed Facebook Pages for publishing, not personal
profiles. Use Meta's Facebook Login for Business configuration flow for Page
access, including `pages_show_list`, `pages_read_engagement`, and
`pages_manage_posts`.

**Why:** Meta treats Page access as a business integration. Raw Page scopes can
be rejected when the app does not use an appropriate business-login
configuration or lacks the required permissions.

**How to apply:** Create a User access token configuration in the Meta
dashboard, use its configuration identifier in the app environment, register
each environment's exact callback URL, and obtain Advanced Access before
serving Page publishing to people outside Meta app roles.

Facebook Login for Business can grant a selected Page through token
`granular_scopes` while returning an empty `/me/accounts` list. Resolve the
selected Page IDs from the token debug response and obtain each selected Page's
token directly instead of treating an empty list as a failed Page connection.

**Why:** The Page-selection dialog can complete successfully even though the
traditional Page-list endpoint omits the selected asset. Falling back to the
member token makes a connection appear successful but leaves publishing
unavailable.

**How to apply:** Keep `/me/accounts` as the normal path, then use the
Facebook-granted `pages_*` target IDs as a safe fallback for Facebook
connections. Never log member, app, or Page access-token values.