---
name: Dependency-light regression tests
description: How to add TypeScript regression coverage when a new test-runner package cannot be fetched.
---

Prefer Node's built-in test runner with the workspace-catalog `tsx` loader when
the package firewall blocks installing a separate test runner.

**Why:** Repeated attempts to add Vitest and DOM-testing dependencies failed at
the package firewall, while the existing catalog already provided `tsx`. Node's
runner still supports deterministic TypeScript unit and contract tests without
an untracked download-time dependency.

**How to apply:** Keep production decision logic behind small pure seams, run
TypeScript tests with `node --import tsx --test`, and add heavier browser tooling
only when interaction coverage cannot be expressed through those production
seams.