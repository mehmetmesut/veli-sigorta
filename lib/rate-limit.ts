import { createHmac } from 'node:crypto';
import { isIP } from 'node:net';

const MINIMUM_SALT_BYTES = 32;
const MAX_RATE_LIMIT_BUCKETS = 10_000;
const CLEANUP_INTERVAL_MS = 60_000;

interface RateLimitBucket {
  count: number;
  resetAt: number;
}

interface RateLimitPolicy {
  limit: number;
  windowMs: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  retryAfterSeconds: number;
}

export class RequestBodyError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = 'RequestBodyError';
  }
}

const rateLimitBuckets = new Map<string, RateLimitBucket>();
let lastCleanupAt = 0;

function getAnalyticsSalt(): string {
  const salt = process.env.ANALYTICS_SALT?.trim();

  if (!salt || Buffer.byteLength(salt, 'utf8') < MINIMUM_SALT_BYTES) {
    throw new Error(`ANALYTICS_SALT must contain at least ${MINIMUM_SALT_BYTES} bytes.`);
  }

  return salt;
}

function normalizeIp(candidate: string | null): string | null {
  if (!candidate) return null;

  const normalized = candidate.trim().toLowerCase();
  return isIP(normalized) ? normalized : null;
}

export function getClientIp(request: Request): string {
  const realIp = normalizeIp(request.headers.get('x-real-ip'));
  if (realIp) return realIp;

  const forwardedIps = (request.headers.get('x-forwarded-for') ?? '')
    .split(',')
    .map((candidate) => normalizeIp(candidate))
    .filter((candidate): candidate is string => candidate !== null);

  return forwardedIps.at(-1) ?? 'unknown';
}

export function hashClientIp(ip: string): string {
  return createHmac('sha256', getAnalyticsSalt())
    .update(ip)
    .digest('hex');
}

export function getClientRateLimitKey(scope: string, request: Request): string {
  return `${scope}:${hashClientIp(getClientIp(request))}`;
}

function cleanupExpiredBuckets(now: number): void {
  if (now - lastCleanupAt < CLEANUP_INTERVAL_MS && rateLimitBuckets.size < MAX_RATE_LIMIT_BUCKETS) {
    return;
  }

  for (const [key, bucket] of rateLimitBuckets) {
    if (bucket.resetAt <= now) {
      rateLimitBuckets.delete(key);
    }
  }

  lastCleanupAt = now;
}

export function consumeRateLimit(
  key: string,
  policy: RateLimitPolicy,
  now = Date.now(),
): RateLimitResult {
  cleanupExpiredBuckets(now);

  const existingBucket = rateLimitBuckets.get(key);
  if (!existingBucket || existingBucket.resetAt <= now) {
    if (!existingBucket && rateLimitBuckets.size >= MAX_RATE_LIMIT_BUCKETS) {
      return {
        allowed: false,
        remaining: 0,
        resetAt: now + policy.windowMs,
        retryAfterSeconds: Math.ceil(policy.windowMs / 1000),
      };
    }

    const resetAt = now + policy.windowMs;
    rateLimitBuckets.set(key, { count: 1, resetAt });
    return {
      allowed: true,
      remaining: Math.max(0, policy.limit - 1),
      resetAt,
      retryAfterSeconds: 0,
    };
  }

  if (existingBucket.count >= policy.limit) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: existingBucket.resetAt,
      retryAfterSeconds: Math.max(1, Math.ceil((existingBucket.resetAt - now) / 1000)),
    };
  }

  const updatedBucket = {
    ...existingBucket,
    count: existingBucket.count + 1,
  };
  rateLimitBuckets.set(key, updatedBucket);

  return {
    allowed: true,
    remaining: Math.max(0, policy.limit - updatedBucket.count),
    resetAt: updatedBucket.resetAt,
    retryAfterSeconds: 0,
  };
}

function validateContentLength(request: Request, maxBytes: number): void {
  const contentLength = request.headers.get('content-length');
  if (!contentLength) return;

  const declaredBytes = Number(contentLength);
  if (!Number.isSafeInteger(declaredBytes) || declaredBytes < 0) {
    throw new RequestBodyError('Geçersiz istek boyutu.', 400);
  }

  if (declaredBytes > maxBytes) {
    throw new RequestBodyError('İstek gövdesi çok büyük.', 413);
  }
}

export async function readLimitedJson(request: Request, maxBytes: number): Promise<unknown> {
  const contentType = request.headers.get('content-type')?.split(';', 1)[0].trim().toLowerCase();
  if (contentType !== 'application/json') {
    throw new RequestBodyError('Content-Type application/json olmalıdır.', 415);
  }

  validateContentLength(request, maxBytes);

  if (!request.body) {
    throw new RequestBodyError('İstek gövdesi boş olamaz.', 400);
  }

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    totalBytes += value.byteLength;
    if (totalBytes > maxBytes) {
      await reader.cancel().catch(() => undefined);
      throw new RequestBodyError('İstek gövdesi çok büyük.', 413);
    }

    chunks.push(value);
  }

  if (totalBytes === 0) {
    throw new RequestBodyError('İstek gövdesi boş olamaz.', 400);
  }

  const bodyBytes = Buffer.concat(chunks.map((chunk) => Buffer.from(chunk)));

  try {
    const bodyText = new TextDecoder('utf-8', { fatal: true }).decode(bodyBytes);
    return JSON.parse(bodyText) as unknown;
  } catch {
    throw new RequestBodyError('Geçerli bir JSON gövdesi gönderilmelidir.', 400);
  }
}
