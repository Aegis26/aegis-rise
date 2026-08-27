---
name: Authenticated query cache boundaries
description: Security rule for cached API data when users or privilege levels change in the same browser.
---

Clear protected client-side query caches whenever the authentication token,
member identity, role, or account status changes.

**Why:** Query keys based only on endpoint parameters can otherwise reuse a
master administrator's unfiltered program data after a chapter administrator
signs in within the same browser, briefly crossing authorization boundaries
even when the server correctly scopes every fresh request.

**How to apply:** Any authentication or role-management change must preserve
this cache reset. Regression tests should load privileged data, switch to a
lower-privileged account without replacing the browser context, and verify no
old data appears before or during refetching.