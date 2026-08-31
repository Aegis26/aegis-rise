---
name: NewsAPI query bounds
description: Constraint and response-shaping rules for personalized NewsAPI requests.
---

Keep every personalized NewsAPI `everything` query below the provider’s
500-character query limit, including when a member selects every supported
interest. Prefer concise canonical search terms over expanding each interest
into several synonyms.

**Why:** Combining verbose synonym groups for all supported interests exceeded
the provider limit and made the valid maximum selection fail before any cache
existed.

**How to apply:** Whenever interests or search terms change, measure the raw
maximum-selection query and test it uncached. Request enough result headroom to
produce distinct primary and alternative lists after validation and
deduplication.