import type { Request, Response } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../prisma";
import { requestOtp, verifyOtp, OtpRateLimitError } from "../services/otp.service";
import { assertNotLocked, recordFailedAttempt, clearAttempts, LoginRateLimitError } from "../services/login-rate-limit.service";
import { signAuthToken } from "../utils/jwt";
import { COOKIE_NAME } from "../middleware/auth";
import { isProd } from "../config/env";

const cookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: isProd,
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

const phoneSchema = z.object({ phone: z.string().min(10).max(15) });

export async function requestCustomerOtp(req: Request, res: Response) {
  const parsed = phoneSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Valid phone number is required" });

  try {
    const { devCode } = await requestOtp(parsed.data.phone);
    res.json({ message: "OTP sent", devCode });
  } catch (err) {
    if (err instanceof OtpRateLimitError) return res.status(429).json({ error: err.message });
    throw err;
  }
}

const verifyOtpSchema = z.object({
  phone: z.string().min(10).max(15),
  code: z.string().length(4),
  name: z.string().min(1).max(100).optional(),
});

export async function verifyCustomerOtp(req: Request, res: Response) {
  const parsed = verifyOtpSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Phone and 4-digit code are required" });

  const { phone, code, name } = parsed.data;
  let isValid: boolean;
  try {
    isValid = await verifyOtp(phone, code);
  } catch (err) {
    if (err instanceof OtpRateLimitError) return res.status(429).json({ error: err.message });
    throw err;
  }
  if (!isValid) return res.status(400).json({ error: "Invalid or expired OTP" });

  let user = await prisma.user.findUnique({ where: { phone } });
  if (!user) {
    user = await prisma.user.create({
      data: { phone, name: name?.trim() || "Customer", role: "CUSTOMER" },
    });
  }
  if (user.isBlocked) return res.status(403).json({ error: "This account has been blocked" });

  const token = signAuthToken({ id: user.id, role: user.role });
  res.cookie(COOKIE_NAME, token, cookieOptions);
  res.json({ user: { id: user.id, name: user.name, phone: user.phone, role: user.role } });
}

const staffLoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export async function staffLogin(req: Request, res: Response) {
  const parsed = staffLoginSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Valid email and password are required" });

  const { email, password } = parsed.data;
  const rateLimitKey = `staff-login:${email.toLowerCase()}`;
  try {
    assertNotLocked(rateLimitKey);
  } catch (err) {
    if (err instanceof LoginRateLimitError) return res.status(429).json({ error: err.message });
    throw err;
  }

  const user = await prisma.user.findUnique({ where: { email }, include: { deliveryAgentProfile: true } });
  if (!user || !user.passwordHash || user.role === "CUSTOMER") {
    recordFailedAttempt(rateLimitKey);
    return res.status(401).json({ error: "Invalid credentials" });
  }
  if (user.isBlocked) return res.status(403).json({ error: "This account has been blocked" });
  // Admin's "Deactivated" toggle on a delivery agent only ever gated new
  // order *assignment* — the agent could still log in and keep acting on
  // deliveries already assigned to them. If an admin deactivates an agent
  // (e.g. they've left, or for cause) the reasonable expectation is that
  // their portal access stops too, not just new work drying up.
  if (user.role === "DELIVERY_AGENT" && user.deliveryAgentProfile?.isActive === false) {
    return res.status(403).json({ error: "This account has been deactivated" });
  }

  const passwordMatches = await bcrypt.compare(password, user.passwordHash);
  if (!passwordMatches) {
    recordFailedAttempt(rateLimitKey);
    return res.status(401).json({ error: "Invalid credentials" });
  }
  clearAttempts(rateLimitKey);

  const token = signAuthToken({ id: user.id, role: user.role });
  res.cookie(COOKIE_NAME, token, cookieOptions);
  res.json({ user: { id: user.id, name: user.name, email: user.email, role: user.role } });
}

export async function logout(_req: Request, res: Response) {
  res.clearCookie(COOKIE_NAME);
  res.json({ message: "Logged out" });
}

export async function me(req: Request, res: Response) {
  const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
  if (!user) return res.status(404).json({ error: "User not found" });
  res.json({
    user: { id: user.id, name: user.name, phone: user.phone, email: user.email, role: user.role },
  });
}
