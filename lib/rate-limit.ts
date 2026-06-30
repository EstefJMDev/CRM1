type RateLimitEntry = {
  count: number;
  resetAt: number;
  blockedUntil: number;
};

type RateLimitOptions = {
  maxAttempts: number;
  windowMs: number;
  blockMs: number;
};

const rateLimitStore = new Map<string, RateLimitEntry>();

function getEntry(key: string, options: RateLimitOptions) {
  const now = Date.now();
  const current = rateLimitStore.get(key);

  if (!current || current.resetAt <= now) {
    const freshEntry: RateLimitEntry = {
      count: 0,
      resetAt: now + options.windowMs,
      blockedUntil: 0,
    };
    rateLimitStore.set(key, freshEntry);
    return freshEntry;
  }

  return current;
}

export function getRateLimitState(key: string, options: RateLimitOptions) {
  const entry = getEntry(key, options);
  const now = Date.now();
  const retryAfterMs =
    entry.blockedUntil > now ? entry.blockedUntil - now : Math.max(0, entry.resetAt - now);

  return {
    blocked: entry.blockedUntil > now,
    retryAfterSeconds: Math.max(1, Math.ceil(retryAfterMs / 1000)),
  };
}

export function registerRateLimitFailure(key: string, options: RateLimitOptions) {
  const entry = getEntry(key, options);
  const now = Date.now();

  entry.count += 1;
  if (entry.count >= options.maxAttempts) {
    entry.blockedUntil = now + options.blockMs;
  }

  rateLimitStore.set(key, entry);

  return {
    blocked: entry.blockedUntil > now,
    retryAfterSeconds: Math.max(1, Math.ceil((entry.blockedUntil - now) / 1000)),
  };
}

export function clearRateLimitFailures(key: string) {
  rateLimitStore.delete(key);
}
