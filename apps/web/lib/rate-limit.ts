import { rateLimit } from "./kv";

export async function checkRateLimit(
  identifier: string,
  limit: number = 10,
  windowMs: number = 60000
): Promise<boolean> {
  const key = `rate_limit:${identifier}`;
  try {
    return await rateLimit(key, limit, windowMs);
  } catch (error) {
    console.warn("Rate limit check failed, allowing request (fail-open):", error);
    return true; // Fail-open: If rate limiting fails, allow the request
  }
}

export async function checkGenerateRateLimit(xUserId: string): Promise<boolean> {
  // Rate limit: 20 per hour (increased for better testing experience)
  // You can adjust this limit or disable rate limiting during development
  return checkRateLimit(`generate:${xUserId}`, 20, 3600000); // 20 per hour (1 hour window)
}

export async function checkMintRateLimit(wallet: string): Promise<boolean> {
  // Rate limit: 10 per hour (increased for better testing experience)
  // You can adjust this limit or use admin endpoint to clear rate limits
  return checkRateLimit(`mint:${wallet}`, 10, 3600000); // 10 per hour (1 hour window)
}

