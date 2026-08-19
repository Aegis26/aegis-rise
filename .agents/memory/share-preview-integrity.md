---
name: Share preview integrity
description: Rules for retaining mandatory share-preview content under platform limits.
---

Build each platform preview by reserving its mandatory attribution, chapter, post-link, and hashtag suffix before truncating the member's caption. If that suffix cannot fit safely, reject the preview rather than returning incomplete copy.

**Why:** Truncating the final assembled string can silently remove the very link, attribution, or hashtag that makes a share useful.

**How to apply:** Keep preview output within each platform's UTF-16 character limit without splitting Unicode code points. Use a configured canonical app URL in production; development-only request-origin fallback must only accept approved local or Replit development hosts.