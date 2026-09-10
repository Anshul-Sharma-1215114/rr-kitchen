import { prisma } from "../prisma";
import { env, isProd } from "../config/env";

// Swap this module for a real provider (MSG91/Twilio) later: implement the
// same two functions against their send/verify API and nothing else changes.
export interface OtpProvider {
  sendOtp(phone: string, code: string): Promise<void>;
}

const consoleOtpProvider: OtpProvider = {
  async sendOtp(phone, code) {
    // eslint-disable-next-line no-console
    console.log(`[OTP] Sending code ${code} to ${phone} (mock provider)`);
  },
};

const activeProvider: OtpProvider = consoleOtpProvider;

export class OtpRateLimitError extends Error {}

const REQUEST_COOLDOWN_MS = 30_000;
const MAX_VERIFY_ATTEMPTS = 5;

// In-memory — fine for a single server process (this app's current scale).
// Move to a shared store (Redis) before running multiple instances, or
// these limits would only apply per-instance.
const lastRequestAt = new Map<string, number>();
const verifyAttempts = new Map<string, { count: number; windowExpiresAt: number }>();

function generateCode(): string {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

export async function requestOtp(phone: string): Promise<{ devCode?: string }> {
  const lastAt = lastRequestAt.get(phone);
  if (lastAt && Date.now() - lastAt < REQUEST_COOLDOWN_MS) {
    throw new OtpRateLimitError("Please wait before requesting another code");
  }
  lastRequestAt.set(phone, Date.now());
  verifyAttempts.delete(phone);

  const code = generateCode();
  const expiresAt = new Date(Date.now() + env.OTP_TTL_MINUTES * 60 * 1000);

  await prisma.otpCode.create({ data: { phone, code, expiresAt } });
  await activeProvider.sendOtp(phone, code);

  // Returned only outside production so the app is testable without real SMS.
  return isProd ? {} : { devCode: code };
}

export async function verifyOtp(phone: string, code: string): Promise<boolean> {
  const now = Date.now();
  const attempts = verifyAttempts.get(phone);
  if (attempts && attempts.windowExpiresAt > now && attempts.count >= MAX_VERIFY_ATTEMPTS) {
    throw new OtpRateLimitError("Too many incorrect attempts — request a new code");
  }

  const otp = await prisma.otpCode.findFirst({
    where: { phone, code, consumed: false, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
  });

  if (!otp) {
    const windowExpiresAt = attempts && attempts.windowExpiresAt > now ? attempts.windowExpiresAt : now + env.OTP_TTL_MINUTES * 60 * 1000;
    verifyAttempts.set(phone, { count: (attempts?.count ?? 0) + 1, windowExpiresAt });
    return false;
  }

  verifyAttempts.delete(phone);
  await prisma.otpCode.update({ where: { id: otp.id }, data: { consumed: true } });
  return true;
}
