import { Router, type IRouter } from "express";
import crypto from "node:crypto";
import { LoginBody } from "@workspace/api-zod";
import {
  createSessionToken,
  isValidSessionToken,
  SESSION_COOKIE_NAME,
  SESSION_MAX_AGE_MS,
} from "../lib/auth";

const router: IRouter = Router();

function timingSafeEqualStrings(a: string, b: string): boolean {
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  if (aBuf.length !== bBuf.length) return false;
  return crypto.timingSafeEqual(aBuf, bBuf);
}

router.post("/auth/login", (req, res) => {
  const parsed = LoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request" });
    return;
  }

  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) {
    req.log.error("ADMIN_PASSWORD is not configured");
    res.status(500).json({ error: "Server is not configured" });
    return;
  }

  if (!timingSafeEqualStrings(parsed.data.password, adminPassword)) {
    res.status(401).json({ error: "Incorrect password" });
    return;
  }

  res.cookie(SESSION_COOKIE_NAME, createSessionToken(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: SESSION_MAX_AGE_MS,
  });
  res.json({ authenticated: true });
});

router.post("/auth/logout", (_req, res) => {
  res.clearCookie(SESSION_COOKIE_NAME);
  res.json({ authenticated: false });
});

router.get("/auth/me", (req, res) => {
  const token = req.cookies?.[SESSION_COOKIE_NAME] as string | undefined;
  res.json({ authenticated: isValidSessionToken(token) });
});

export default router;
