---
name: Direct messaging delivery
description: Why direct messages use database-backed polling and what is required before adding push delivery.
---

Keep PostgreSQL as the source of truth for messages, read state, blocks, presence timestamps, typing heartbeats, and idempotency. Polling must remain available as the reliable fallback.

**Why:** Railway may run multiple API instances. In-memory WebSocket subscriptions or presence would miss cross-instance events and create inconsistent privacy-sensitive behavior. Durable REST polling works without sticky sessions or proxy upgrade assumptions.

**How to apply:** If adding instant push delivery, use authenticated same-origin WebSockets plus managed cross-instance pub/sub, heartbeat/reconnect handling, cursor replay, and the existing REST polling fallback. Never move authoritative state into process memory.