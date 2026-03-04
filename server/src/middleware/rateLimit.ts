import { Request, Response, NextFunction } from 'express';

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const limits = new Map<string, RateLimitEntry>();

const FREE_TIER_LIMIT = 10; // chats per month
const WINDOW_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export function rateLimiter(req: Request, res: Response, next: NextFunction): void {
  // Skip rate limiting for premium users (checked via header)
  if (req.headers['x-subscription-tier'] === 'premium') {
    next();
    return;
  }

  const key = req.ip || 'unknown';
  const now = Date.now();
  const entry = limits.get(key);

  if (!entry || now > entry.resetAt) {
    limits.set(key, { count: 1, resetAt: now + WINDOW_MS });
    next();
    return;
  }

  if (entry.count >= FREE_TIER_LIMIT) {
    res.status(429).json({
      error: 'Rate limit exceeded',
      message: `Free tier allows ${FREE_TIER_LIMIT} AI chats per month. Upgrade to Premium for unlimited access.`,
      remaining: 0,
      resetsAt: new Date(entry.resetAt).toISOString(),
    });
    return;
  }

  entry.count++;
  res.setHeader('X-RateLimit-Remaining', (FREE_TIER_LIMIT - entry.count).toString());
  next();
}
