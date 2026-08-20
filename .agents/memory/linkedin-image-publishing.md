---
name: LinkedIn image publishing
description: Requirements and safety constraints for attaching member images to LinkedIn posts.
---

LinkedIn post payloads cannot use a public image URL directly. Initialize an image upload, send the binary to LinkedIn's one-time upload URL, then use the returned `urn:li:image` as the post media ID.

**Why:** LinkedIn accepted text-only posts but only renders an image after its asset is first uploaded to LinkedIn. The initialization response contains a signed URL and must be redacted from all application logs.

**How to apply:** Keep the post caption unchanged, allow only managed member-upload images as source content, bound download and upload work, and log the image URN and upload outcome rather than a signed URL or OAuth token.