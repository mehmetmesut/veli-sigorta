import { NextRequest, NextResponse } from 'next/server';
import { recordVisit } from '@/lib/db';
import { aramaVeYapayZekaInisleri, sonZiyaretler, ziyaretOzetiGetir } from '@/lib/repo-ops';
import { getCurrentAdmin } from '@/lib/auth';
import {
  consumeRateLimit,
  getClientIp,
  getClientRateLimitKey,
  readLimitedJson,
  RequestBodyError,
  RateLimitResult,
} from '@/lib/rate-limit';

const MAX_BODY_BYTES = 4 * 1024;
const ANALYTICS_RATE_LIMIT = { limit: 30, windowMs: 60 * 1000 };

class AnalyticsValidationError extends Error {}

interface AnalyticsPayload {
  path: string;
  referrer: string;
  sessionId: string;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function readOptionalString(
  body: Record<string, unknown>,
  field: string,
  label: string,
  maxLength: number,
): string {
  const rawValue = body[field];
  if (rawValue === undefined || rawValue === null || rawValue === '') return '';
  if (typeof rawValue !== 'string') {
    throw new AnalyticsValidationError(`${label} metin olmalıdır.`);
  }

  const value = rawValue.trim();
  if (value.length > maxLength) {
    throw new AnalyticsValidationError(`${label} en fazla ${maxLength} karakter olabilir.`);
  }
  return value;
}

function validateAnalyticsPayload(body: unknown): AnalyticsPayload {
  if (!isObject(body)) {
    throw new AnalyticsValidationError('Geçerli bir analitik isteği gönderilmelidir.');
  }

  const path = readOptionalString(body, 'path', 'Sayfa yolu', 512);
  if (!path || !path.startsWith('/') || path.startsWith('//') || /[\r\n\u0000]/.test(path)) {
    throw new AnalyticsValidationError('Geçerli bir sayfa yolu gönderilmelidir.');
  }

  const sessionId = readOptionalString(body, 'sessionId', 'Oturum kimliği', 80);
  if (!/^[a-zA-Z0-9_-]{16,80}$/.test(sessionId)) {
    throw new AnalyticsValidationError('Geçerli bir oturum kimliği gönderilmelidir.');
  }

  return {
    path,
    referrer: readOptionalString(body, 'referrer', 'Yönlendiren adres', 2_048),
    sessionId,
  };
}

function getRateLimitHeaders(result: RateLimitResult): Record<string, string> {
  return {
    'X-RateLimit-Remaining': String(result.remaining),
    'X-RateLimit-Reset': String(Math.ceil(result.resetAt / 1000)),
  };
}

export async function POST(req: NextRequest) {
  try {
    const rateLimit = consumeRateLimit(
      getClientRateLimitKey('analytics', req),
      ANALYTICS_RATE_LIMIT,
    );
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Çok fazla analitik isteği gönderildi.' },
        {
          status: 429,
          headers: {
            ...getRateLimitHeaders(rateLimit),
            'Retry-After': String(rateLimit.retryAfterSeconds),
          },
        },
      );
    }

    const { path, referrer, sessionId } = validateAnalyticsPayload(
      await readLimitedJson(req, MAX_BODY_BYTES),
    );
    const userAgent = req.headers.get('user-agent')?.slice(0, 512) ?? '';

    // Filter out admin routes from analytics
    if (!path.startsWith('/admin') && !path.startsWith('/api')) {
      await recordVisit(path, referrer, userAgent, getClientIp(req), sessionId);
    }

    return NextResponse.json({ ok: true }, { headers: getRateLimitHeaders(rateLimit) });
  } catch (error) {
    if (error instanceof RequestBodyError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (error instanceof AnalyticsValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    console.error('Analytics request failed.', error);
    return NextResponse.json({ error: 'Analitik kaydı oluşturulamadı.' }, { status: 500 });
  }
}

export async function GET() {
  const current = await getCurrentAdmin();
  if (!current) {
    return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
  }

  // Tüm hesaplama veritabanında yapılır. Eskiden 5000 kayda kadar büyüyebilen ziyaret
  // dizisinin tamamı belleğe alınıp JavaScript'te sekiz kez baştan sona taranıyordu.
  const [ozet, inisler, sonZiyaretListesi] = await Promise.all([
    ziyaretOzetiGetir(),
    aramaVeYapayZekaInisleri(),
    sonZiyaretler(50),
  ]);

  const kategoriHaritasi: Record<string, number> = {};
  ozet.kaynakDagilimi.forEach((k) => { kategoriHaritasi[k.kategori] = k.count; });

  const cihazHaritasi: Record<string, number> = {};
  ozet.cihazDagilimi.forEach((c) => { cihazHaritasi[c.cihaz] = c.count; });

  const tarayiciHaritasi: Record<string, number> = {};
  ozet.tarayiciDagilimi.forEach((t) => { tarayiciHaritasi[t.tarayici] = t.count; });

  return NextResponse.json({
    summary: {
      todayViews: ozet.bugun,
      views7d: ozet.son7Gun,
      views30d: ozet.son30Gun,
      sessions30d: ozet.benzersizOturum30Gun,
      uniqueVisitors30d: ozet.benzersizZiyaretci30Gun,
      totalRecordedVisits: ozet.toplam,
    },
    topPages: ozet.enCokGorulenSayfalar,
    referrerCategories: kategoriHaritasi,
    aiSearchLandingReport: inisler,
    deviceBreakdown: cihazHaritasi,
    browserBreakdown: tarayiciHaritasi,
    dailySeries: ozet.gunlukSeri,
    recentVisits: sonZiyaretListesi,
  });
}
