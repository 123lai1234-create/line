---
name: Stateless single-admin auth pattern
description: How to authenticate a private admin panel with exactly one admin user without a database-backed session/user table.
---

For internal admin panels with exactly one operator (password stored as an `ADMIN_PASSWORD` secret), skip building a users table or session store. Use a stateless signed cookie instead:

- Login route compares the submitted password to `ADMIN_PASSWORD` with a constant-time comparison (`crypto.timingSafeEqual`), then issues a cookie whose value is `role.expiresAt.hmacSignature`, where the HMAC key is a separate `SESSION_SECRET`.
- Middleware just recomputes the HMAC and checks expiry — no DB lookup needed per request.
- Cookie should be `httpOnly`, `sameSite: "lax"`, and `secure` in production.

**Why:** avoids provisioning a users/sessions table and express-session/DB session dependency for a product that will only ever have one authenticated identity (the site owner). Keeps the auth surface small and easy to reason about.

**How to apply:** use this pattern for any "single private operator" admin panel (e.g. a bot admin dashboard, a personal CMS) — not for multi-user auth, which should use a real auth provider (Clerk/Replit Auth) instead.
