import type { NextFunction, Request, Response } from "express";
import type { Role } from "@prisma/client";
import { verifyAuthToken } from "../utils/jwt";

declare global {
  namespace Express {
    interface Request {
      user?: { id: string; role: Role };
    }
  }
}

const COOKIE_NAME = "rrk_token";

function extractToken(req: Request): string | undefined {
  const header = req.headers.authorization;
  if (header?.startsWith("Bearer ")) return header.slice(7);
  return req.cookies?.[COOKIE_NAME];
}

export function requireAuth(...allowedRoles: Role[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const token = extractToken(req);
    if (!token) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    try {
      const payload = verifyAuthToken(token);
      if (allowedRoles.length > 0 && !allowedRoles.includes(payload.role)) {
        return res.status(403).json({ error: "Not authorized for this role" });
      }
      req.user = payload;
      next();
    } catch {
      return res.status(401).json({ error: "Invalid or expired session" });
    }
  };
}

export { COOKIE_NAME };
