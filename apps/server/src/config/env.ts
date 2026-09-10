import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().default(4000),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  JWT_SECRET: z.string().min(1, "JWT_SECRET is required"),
  JWT_EXPIRES_IN: z.string().default("7d"),
  WEB_ORIGIN: z.string().default("http://localhost:3000"),
  OTP_TTL_MINUTES: z.coerce.number().default(5),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Invalid environment variables:", parsed.error.flatten().fieldErrors);
  throw new Error("Invalid environment variables");
}

export const env = parsed.data;
export const isProd = env.NODE_ENV === "production";

// WEB_ORIGIN accepts a comma-separated list (e.g. the localhost origin used
// on this machine plus its LAN IP, for testing from a phone/tablet on the
// same network) so CORS doesn't have to pick just one.
export const webOrigins = env.WEB_ORIGIN.split(",").map((o) => o.trim());
