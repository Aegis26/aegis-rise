---
name: Share preview integrity
description: Rules for retaining mandatory share-preview content under platform limits.
---

LinkedIn auto-posts and previews use the member's caption only. Other platform previews may still reserve their configured attribution, chapter, post-link, and hashtag suffix before truncating the caption; if that suffix cannot fit safely, reject the preview rather than returning incomplete copy.

**Why:** Truncating the final assembled string can silently remove the very link, attribution, or hashtag that makes a share useful.

**How to apply:** Keep each platform's output within its UTF-16 character limit without splitting Unicode code points. For LinkedIn, do not append metadata. Use a configured canonical app URL in production; development-only request-origin fallback must only accept approved local or Replit development hosts.