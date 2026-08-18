import { NextRequest, NextResponse } from 'next/server';
import { getCurrentAdmin, loginAdmin, logoutAdmin } from '@/lib/auth';
import { addAuditLog } from '@/lib/db';
import { getClientIp, readLimitedJson, RequestBodyError } from '@/lib/rate-limit';
import { isSuperAdminIdentifier } from '@/lib/superadmin';
import {
  assertSameOrigin,
  ContentValidationError,
} from '@/lib/admin-content-validation';

const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILED_ATTEMPTS = 5;
const MAX_TRACKED_CLIENTS = 10_000;
const MAX_AUTH_BODY_BYTES = 16 * 1024;

interface LoginAttempt {
  failures: number;
  pending: number;
  resetAt: number;
}

const loginAttempts = new Map<string, LoginAttempt>();

function pruneExpiredAttempts(now: number): void {
  for (const [ip, attempt] of loginAttempts) {
    if (attempt.resetAt <= now) loginAttempts.delete(ip);
  }

  while (loginAttempts.size >= MAX_TRACKED_CLIENTS) {
    const oldestIp = loginAttempts.keys().next().value;
    if (typeof oldestIp !== 'string') break;
    loginAttempts.delete(oldestIp);
  }
}

type LoginReservation =
  | { allowed: true; attempt: LoginAttempt }
  | { allowed: false; retryAfterSeconds: number };

function reserveLoginAttempt(ip: string): LoginReservation {
  const now = Date.now();
  pruneExpiredAttempts(now);
  let attempt = loginAttempts.get(ip);

  if (!attempt || attempt.resetAt <= now) {
    attempt = { failures: 0, pending: 0, resetAt: now + LOGIN_WINDOW_MS };
    loginAttempts.set(ip, attempt);
  }

  if (attempt.failures + attempt.pending >= MAX_FAILED_ATTEMPTS) {
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil((attempt.resetAt - now) / 1000)),
    };
  }

  attempt.pending += 1;
  return { allowed: true, attempt };
}

function finishLoginAttempt(
  ip: string,
  attempt: LoginAttempt,
  result: 'success' | 'failure' | 'cancelled',
): void {
  if (loginAttempts.get(ip) !== attempt) return;

  attempt.pending = Math.max(0, attempt.pending - 1);
  if (result === 'success') {
    loginAttempts.delete(ip);
  } else if (result === 'failure') {
    attempt.failures += 1;
  } else if (attempt.failures === 0 && attempt.pending === 0) {
    loginAttempts.delete(ip);
  }
}

export async function POST(req: NextRequest) {
  try {
    assertSameOrigin(req);
    const body = await readLimitedJson(req, MAX_AUTH_BODY_BYTES);
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Geçersiz istek' }, { status: 400 });
    }

    const { action, email, password } = body as Record<string, unknown>;

    if (action === 'login') {
      if (typeof email !== 'string' || typeof password !== 'string' || !email.trim() || !password) {
        return NextResponse.json({ error: 'Kullanıcı adı ve şifre gereklidir' }, { status: 400 });
      }

      const clientIp = getClientIp(req);
      const reservation = reserveLoginAttempt(clientIp);
      if (!reservation.allowed) {
        return NextResponse.json(
          { error: 'Çok fazla başarısız giriş denemesi. Lütfen daha sonra tekrar deneyin.' },
          {
            status: 429,
            headers: { 'Retry-After': String(reservation.retryAfterSeconds) },
          },
        );
      }

      const normalizedEmail = email.trim().toLowerCase();
      let success: boolean;
      try {
        success = await loginAdmin(normalizedEmail, password);
      } catch (error) {
        finishLoginAttempt(clientIp, reservation.attempt, 'cancelled');
        throw error;
      }

      if (!success) {
        finishLoginAttempt(clientIp, reservation.attempt, 'failure');
        return NextResponse.json({ error: 'Geçersiz kullanıcı adı veya şifre' }, { status: 401 });
      }

      finishLoginAttempt(clientIp, reservation.attempt, 'success');

      // Korumalı süper yönetici hesabı denetim kayıtlarında da görünmez.
      if (!isSuperAdminIdentifier(normalizedEmail)) {
        await addAuditLog(normalizedEmail, 'ADMIN_LOGIN', 'Yönetici oturumu başarıyla açıldı.').catch(
          (error) => console.error('Admin login audit failed:', error),
        );
      }
      return NextResponse.json({ success: true });
    }

    if (action === 'logout') {
      const current = await getCurrentAdmin();
      await logoutAdmin();
      if (current && !isSuperAdminIdentifier(current.email)) {
        await addAuditLog(current.email, 'ADMIN_LOGOUT', 'Yönetici oturumu kapatıldı.').catch(
          (error) => console.error('Admin logout audit failed:', error),
        );
      }
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Geçersiz işlem' }, { status: 400 });
  } catch (error) {
    if (error instanceof RequestBodyError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (error instanceof ContentValidationError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error('Admin authentication request failed:', error);
    return NextResponse.json({ error: 'İşlem sırasında bir hata oluştu.' }, { status: 500 });
  }
}

export async function GET() {
  const current = await getCurrentAdmin();
  if (!current) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }
  return NextResponse.json({ authenticated: true, user: current });
}
