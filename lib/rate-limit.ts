// Simple in-memory rate limiter
// For production, consider using Redis or Upstash Rate Limit

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const rateLimit = new Map<string, RateLimitEntry>();

// Clean up old entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimit.entries()) {
    if (now > entry.resetTime) {
      rateLimit.delete(key);
    }
  }
}, 5 * 60 * 1000);

export interface RateLimitResult {
  success: boolean;
  remaining: number;
  resetTime: number;
}

/**
 * Rate limiter with configurable limits
 * @param identifier - Unique identifier (e.g., IP address, username)
 * @param limit - Maximum number of attempts
 * @param windowMs - Time window in milliseconds
 */
export function checkRateLimit(
  identifier: string,
  limit: number = 5,
  windowMs: number = 15 * 60 * 1000 // 15 minutes default
): RateLimitResult {
  const now = Date.now();
  const entry = rateLimit.get(identifier);

  // No entry or expired window
  if (!entry || now > entry.resetTime) {
    const resetTime = now + windowMs;
    rateLimit.set(identifier, { count: 1, resetTime });
    return {
      success: true,
      remaining: limit - 1,
      resetTime,
    };
  }

  // Increment attempt count
  entry.count++;

  // Check if limit exceeded
  if (entry.count > limit) {
    return {
      success: false,
      remaining: 0,
      resetTime: entry.resetTime,
    };
  }

  return {
    success: true,
    remaining: limit - entry.count,
    resetTime: entry.resetTime,
  };
}

/**
 * Reset rate limit for an identifier (e.g., after successful login)
 */
export function resetRateLimit(identifier: string): void {
  rateLimit.delete(identifier);
}
