---
name: OAuth preview hosts
description: Replit preview host behavior for social OAuth callback URLs
---

Development OAuth requests must derive the callback origin from the incoming preview request host rather than a saved public base URL. Replit preview hosts can differ from the stable or production URL, and redirecting to the configured production host makes the preview appear to do nothing or open the workspace shell.

**Why:** A configured APP_BASE_URL pointed at a different Replit host while the app was being tested in a dynamic preview. The API generated a valid redirect, but the browser left the active preview before reaching the provider.

**How to apply:** Require APP_BASE_URL in production, but use the validated forwarded request host in development. Register provider callback URLs separately for the environment being tested.