/**
 * Rate Limiting Middleware
 * In-memory rate limiting for API routes
 * For production, consider using Redis or Upstash
 */

import { NextResponse } from 'next/server';

interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Max requests per window
}

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

// In-memory store (use Redis in production for distributed systems)
const rateLimitStore = new Map<string, RateLimitEntry>();

// Cleanup old entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetTime < now) {
      rateLimitStore.delete(key);
    }
  }
}, 5 * 60 * 1000);

/**
 * Rate limit configurations for different endpoints
 */
export const RATE_LIMITS = {
  // Authentication endpoints
  LOGIN: { windowMs: 15 * 60 * 1000, maxRequests: 5 }, // 5 per 15min
  REGISTER: { windowMs: 60 * 60 * 1000, maxRequests: 3 }, // 3 per hour

  // API endpoints
  API_DEFAULT: { windowMs: 60 * 1000, maxRequests: 60 }, // 60 per minute
  API_STRICT: { windowMs: 60 * 1000, maxRequests: 10 }, // 10 per minute
  API_RELAXED: { windowMs: 60 * 1000, maxRequests: 120 }, // 120 per minute

  // Chat endpoints
  CHAT_MESSAGE: { windowMs: 60 * 1000, maxRequests: 30 }, // 30 per minute
  CHAT_CREATE: { windowMs: 60 * 1000, maxRequests: 10 }, // 10 per minute

  // File uploads
  FILE_UPLOAD: { windowMs: 60 * 1000, maxRequests: 10 }, // 10 per minute

  // Project endpoints
  PROJECT_CREATE: { windowMs: 60 * 1000, maxRequests: 5 }, // 5 per minute
  PROJECT_UPDATE: { windowMs: 60 * 1000, maxRequests: 30 }, // 30 per minute
} as const;

/**
 * Get client identifier from request
 */
function getClientId(request: Request): string {
  // Use IP address + user agent for identification
  const forwarded = request.headers.get('x-forwarded-for');
  const real = request.headers.get('x-real-ip');
  const ip = forwarded?.split(',')[0].trim() || real || 'unknown';
  const userAgent = request.headers.get('user-agent') || 'unknown';

  return `${ip}:${userAgent}`;
}

/**
 * Check if request is rate limited
 * @returns null if allowed, NextResponse with 429 status if rate limited
 */
export function checkRateLimit(
  request: Request,
  config: RateLimitConfig
): NextResponse | null {
  const clientId = getClientId(request);
  const key = `${clientId}:${request.url}`;
  const now = Date.now();

  const entry = rateLimitStore.get(key);

  if (!entry || entry.resetTime < now) {
    // New window or expired
    rateLimitStore.set(key, {
      count: 1,
      resetTime: now + config.windowMs
    });
    return null;
  }

  if (entry.count >= config.maxRequests) {
    // Rate limit exceeded
    const retryAfter = Math.ceil((entry.resetTime - now) / 1000);

    return NextResponse.json(
      {
        error: 'Too many requests',
        message: `Rate limit exceeded. Try again in ${retryAfter} seconds.`,
        retryAfter
      },
      {
        status: 429,
        headers: {
          'Retry-After': retryAfter.toString(),
          'X-RateLimit-Limit': config.maxRequests.toString(),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': new Date(entry.resetTime).toISOString()
        }
      }
    );
  }

  // Increment counter
  entry.count++;
  rateLimitStore.set(key, entry);

  return null;
}

/**
 * Rate limit helper for API routes
 */
export function withRateLimit(
  handler: (request: Request, ...args: unknown[]) => Promise<NextResponse>,
  config: RateLimitConfig = RATE_LIMITS.API_DEFAULT
) {
  return async (request: Request, ...args: unknown[]) => {
    const rateLimitResponse = checkRateLimit(request, config);

    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    return handler(request, ...args);
  };
}

/**
 * Get rate limit info for a client
 */
export function getRateLimitInfo(
  request: Request,
  config: RateLimitConfig
): {
  limit: number;
  remaining: number;
  reset: Date;
} {
  const clientId = getClientId(request);
  const key = `${clientId}:${request.url}`;
  const now = Date.now();

  const entry = rateLimitStore.get(key);

  if (!entry || entry.resetTime < now) {
    return {
      limit: config.maxRequests,
      remaining: config.maxRequests,
      reset: new Date(now + config.windowMs)
    };
  }

  return {
    limit: config.maxRequests,
    remaining: Math.max(0, config.maxRequests - entry.count),
    reset: new Date(entry.resetTime)
  };
}
