---
name: Testing auth-gated flows protected by secret credentials
description: Playwright test subagents run in an isolated context without access to env secrets, so password-gated login flows can't be tested end-to-end through the UI.
---

The `runTest` Playwright test subagent runs in a separate environment that cannot read `process.env` secrets (e.g. `ADMIN_PASSWORD`), and the main agent is also instructed never to display/access secret values directly. This makes it impossible to have the browser test subagent log in with a real secret-based password.

**Why:** secret values must never be echoed into a test plan or read by the orchestrating agent, so there's no safe way to hand a real password to the Playwright subagent.

**How to apply:**
- Verify the wrong-password path and general login page rendering with the Playwright subagent (no secret needed).
- Verify the full authenticated flow (correct login, protected CRUD routes, logout) with direct `curl` calls from bash, referencing the secret as a shell variable (e.g. `"$ADMIN_PASSWORD"`) so it's substituted by the shell and never printed or logged.
- Be aware that hitting real third-party APIs (e.g. a LINE broadcast) during this curl-based testing has real side effects — avoid test messages that would confuse or spam real end users, and revert any test data changes afterward.
