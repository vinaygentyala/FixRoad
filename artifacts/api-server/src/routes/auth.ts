import { Router, type IRouter, type Request, type Response } from "express";
import {
  SESSION_COOKIE,
  attachUser,
  getSessionToken,
  getUser,
  publicUser,
  requireAuth,
} from "../lib/auth";
import { store, verifyPassword, type Role } from "../lib/store";

const router: IRouter = Router();
router.use(attachUser);

const WINDOW_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 30;
const attemptsByIp = new Map<string, { count: number; expiresAt: number }>();

function rateLimited(req: Request, res: Response): boolean {
  const now = Date.now();
  const ip = req.ip ?? "unknown";
  const current = attemptsByIp.get(ip);
  if (current && current.expiresAt > now && current.count >= MAX_ATTEMPTS) {
    res.status(429).json({ error: "Too many attempts. Please wait a few minutes and try again." });
    return true;
  }
  if (!current || current.expiresAt <= now) {
    attemptsByIp.set(ip, { count: 1, expiresAt: now + WINDOW_MS });
  } else {
    current.count += 1;
  }
  return false;
}

function setSessionCookie(res: Response, token: string, expiresAt: string) {
  res.cookie(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    expires: new Date(expiresAt),
    path: "/",
  });
}

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function readCredentials(body: unknown): { email: string; password: string; role: Role } | null {
  if (!body || typeof body !== "object") return null;
  const { email, password, role } = body as Record<string, unknown>;
  if (typeof email !== "string" || typeof password !== "string") return null;
  if (role !== "reporter" && role !== "officer") return null;
  return { email: email.trim().toLowerCase(), password, role };
}

router.post("/auth/signup", (req, res) => {
  if (rateLimited(req, res)) return;

  const body = req.body as Record<string, unknown>;
  const credentials = readCredentials(body);
  const name = typeof body?.name === "string" ? body.name.trim() : "";

  if (!credentials || !name || name.length < 2 || name.length > 80) {
    res.status(400).json({ error: "Enter your full name, email, and password." });
    return;
  }
  if (!emailPattern.test(credentials.email)) {
    res.status(400).json({ error: "Enter a valid email address." });
    return;
  }
  if (credentials.password.length < 8 || credentials.password.length > 128) {
    res.status(400).json({ error: "Password must be at least 8 characters." });
    return;
  }
  if (store.findUserByEmail(credentials.email)) {
    res.status(409).json({ error: "An account with this email already exists. Try signing in." });
    return;
  }

  const user = store.createUser({
    name,
    email: credentials.email,
    password: credentials.password,
    role: credentials.role,
  });
  const session = store.createSession(user.id);
  setSessionCookie(res, session.token, session.expiresAt);
  res.status(201).json({ user: publicUser(user) });
});

router.post("/auth/login", (req, res) => {
  if (rateLimited(req, res)) return;

  const credentials = readCredentials(req.body);
  if (!credentials) {
    res.status(400).json({ error: "Enter your email and password." });
    return;
  }

  const user = store.findUserByEmail(credentials.email);
  if (!user || !verifyPassword(credentials.password, user.passwordHash)) {
    res.status(401).json({ error: "Incorrect email or password." });
    return;
  }
  if (user.role !== credentials.role) {
    res.status(403).json({
      error:
        user.role === "officer"
          ? "This is an officer account. Please use the officer portal to sign in."
          : "This is a citizen reporter account. Please use the reporter portal to sign in.",
    });
    return;
  }

  const session = store.createSession(user.id);
  setSessionCookie(res, session.token, session.expiresAt);
  res.json({ user: publicUser(user) });
});

router.post("/auth/logout", (req, res) => {
  const token = getSessionToken(req);
  if (token) store.deleteSession(token);
  res.clearCookie(SESSION_COOKIE, { path: "/" });
  res.json({ ok: true });
});

router.get("/auth/me", (req, res) => {
  const user = getUser(req);
  if (!user) {
    res.status(401).json({ error: "Not signed in." });
    return;
  }
  res.json({ user: publicUser(user) });
});

router.patch("/auth/me", requireAuth, (req, res) => {
  const name = typeof req.body?.name === "string" ? req.body.name.trim() : "";
  if (!name || name.length < 2 || name.length > 80) {
    res.status(400).json({ error: "Enter a valid name." });
    return;
  }
  const user = store.updateUserName(getUser(req)!.id, name);
  res.json({ user: publicUser(user!) });
});

export default router;
