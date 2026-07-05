---
name: Broadcast testing safety
description: How to test the LINE broadcast/push endpoint without spamming real friends
---

# Testing the broadcast endpoint safely

`POST /api/broadcasts` with a **valid, non-scheduled** payload sends to ALL real LINE
friends immediately and consumes LINE quota. There is no dry-run flag.

**Why:** during development a curl test with a valid `flex` body actually pushed a
card to real followers before we realized the backend accepts body-only flex.

**How to test without sending:**
- Only exercise **rejection** cases (expect 400): missing required fields, non-https
  URLs, past/invalid `scheduledAt`.
- To test the happy path, use a **future `scheduledAt`** — it stores a `scheduled`
  row without sending. Then **delete that row** (`DELETE FROM broadcasts WHERE ...`)
  so the scheduler doesn't fire it later. There is no admin delete endpoint; use SQL.
- Verify message-building logic offline by bundling `broadcast-build.ts` with esbuild
  and running it under node, instead of hitting the live endpoint.

**Validation contract:** frontend and backend must agree per kind — text needs
`message`; image needs https `imageUrl`; flex needs BOTH `title` and `message`
(image/link optional, https-checked). Keep both sides in sync when changing rules.
