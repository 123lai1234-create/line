---
name: LINE bot hosting & webhook wiring
description: Why a published LINE bot goes silent, and what deployment type it needs
---

# Published LINE bot must be wired to the prod URL and run always-on

When a LINE bot "works in Replit but the live/published bot does nothing" (no
real-time replies, broadcasts seem dead), check TWO things before touching code:

1. **Webhook endpoint target.** LINE stores ONE webhook URL per channel. After
   publishing, it often still points at the temporary dev workspace domain
   (`*.replit.dev`), which sleeps when the editor is closed → no replies.
   Check/repoint via the LINE API (token = `LINE_CHANNEL_ACCESS_TOKEN`):
   - GET  `https://api.line.me/v2/bot/channel/webhook/endpoint` → `{endpoint, active}`
   - PUT  same URL with `{"endpoint":"https://<prod>.replit.app/api/line/webhook"}`
   - Get the real prod URL from `getDeploymentInfo().primaryUrl` — NOT `$REPLIT_DOMAINS`
     (that's the dev domain inside the container).
   - Diagnostics that need no user round-trip: `GET /v2/bot/info` (`chatMode` must be
     `"bot"`), `GET /v2/bot/message/quota` + `/quota/consumption` (broadcast needs quota),
     and reply-payload validation by POSTing to `/message/reply` with a dummy
     replyToken — "Invalid reply token" means the message body itself is VALID.

2. **Deployment type.** A bot needs `vm` (always-on), NOT `autoscale`. Autoscale
   scales to zero when idle, so (a) the first webhook after idle can cold-start past
   LINE's timeout and be dropped, and (b) any in-process scheduler (e.g. the 30s
   `setInterval` poller for scheduled broadcasts) never runs while asleep → scheduled
   sends never fire. Switching autoscale→vm is a billing change: needs user consent
   and a re-publish from the Publish UI.

**Why:** the reply pipeline can be 100% correct (signature passes, payloads valid,
no error logs) yet the user sees a dead bot purely from these two config gaps.
