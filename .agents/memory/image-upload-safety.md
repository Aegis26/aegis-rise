---
name: Image upload safety
description: Resource-safety policy for member image uploads.
---

Accept only bounded image-processing work: constrain multipart parts and fields before buffering, cap concurrent upload lifecycles and per-member request frequency, validate decoded pixel dimensions, and keep image processing concurrency low.

**Why:** A small compressed or animated image can otherwise expand into disproportionate CPU and memory use. Text multipart fields can also consume memory outside the file-size limit.

**How to apply:** Preserve the guardrails whenever upload code changes. GIF uploads are supported as a static first-frame GIF rather than preserving every animation frame, so frame decoding remains bounded. Keep both output dimensions at or below the platform image limit.