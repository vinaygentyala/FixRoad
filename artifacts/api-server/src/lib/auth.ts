import type { NextFunction, Request, Response } from "express";
import { store, type Role, type User } from "./store";

export const SESSION_COOKIE = "fmr_session";

type AuthedRequest = Request & { user?: User; sessionToken?: string };

export function getUser(req: Request): User | undefined {
  return (req as AuthedRequest).user;
}

export function getSessionToken(req: Request): string | undefined {
  return (req as AuthedRequest).sessionToken;
}

export function attachUser(req: Request, _res: Response, next: NextFunction) {
  const authed = req as AuthedRequest;
  const token = req.cookies?.[SESSION_COOKIE];
  if (typeof token === "string" && token) {
    const session = store.findSession(token);
    if (session) {
      const user = store.findUserById(session.userId);
      if (user) {
        authed.user = user;
        authed.sessionToken = token;
      }
    }
  }
  next();
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!getUser(req)) {
    res.status(401).json({ error: "Sign in to continue." });
    return;
  }
  next();
}

export function requireRole(role: Role) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = getUser(req);
    if (!user) {
      res.status(401).json({ error: "Sign in to continue." });
      return;
    }
    if (user.role !== role) {
      res.status(403).json({
        error:
          role === "officer"
            ? "This area is for municipal officers only."
            : "This area is for citizen reporters only.",
      });
      return;
    }
    next();
  };
}

export function publicUser(user: User) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    createdAt: user.createdAt,
  };
}
