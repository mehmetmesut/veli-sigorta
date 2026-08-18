import { NextRequest, NextResponse } from 'next/server';
import { getCurrentAdmin } from '@/lib/auth';
import { getDb } from '@/lib/db';
import {
  assertSameOrigin,
  ContentValidationError,
} from '@/lib/admin-content-validation';
import { readLimitedJson, RequestBodyError } from '@/lib/rate-limit';

const MAX_BODY_BYTES = 4 * 1024;

export async function POST(req: NextRequest) {
  try {
    assertSameOrigin(req);
    const current = await getCurrentAdmin();
    if (!current) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    const body = await readLimitedJson(req, MAX_BODY_BYTES);
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      throw new ContentValidationError('Geçerli bir ölçüm isteği gönderilmelidir.');
    }
    const keys = Object.keys(body);
    if (keys.some((key) => key !== 'strategy')) {
      throw new ContentValidationError('Ölçüm isteği bilinmeyen alan içeriyor.');
    }
    const strategyValue = (body as Record<string, unknown>).strategy;
    if (strategyValue !== 'mobile' && strategyValue !== 'desktop') {
      throw new ContentValidationError('Strateji mobile veya desktop olmalıdır.');
    }
    const strategy = strategyValue;
    const db = await getDb();
    const apiKey = db.settings?.pagespeedApiKey?.trim();
    const targetUrl = process.env.APP_URL || 'https://velisigorta.com.tr';

    if (!apiKey) {
      return NextResponse.json(
        {error: 'PageSpeed Insights API anahtarı henüz tanımlanmamış.'},
        {status: 503},
      );
    }

    const psiEndpoint = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(
      targetUrl,
    )}&strategy=${strategy}&key=${apiKey}&category=PERFORMANCE&category=ACCESSIBILITY&category=BEST_PRACTICES&category=SEO`;

    const response = await fetch(psiEndpoint, {
      signal: AbortSignal.timeout(30_000),
      cache: 'no-store',
    });
    if (!response.ok) {
      return NextResponse.json(
        {error: 'Google PageSpeed Insights ölçümü şu anda alınamadı.'},
        {status: 502},
      );
    }

    const psiData = await response.json();
    const lighthouse = psiData.lighthouseResult;
    const categories = lighthouse?.categories || {};

    return NextResponse.json({
      success: true,
      isLiveApi: true,
      strategy,
      scores: {
        performance: Math.round((categories.performance?.score ?? 0) * 100),
        accessibility: Math.round((categories.accessibility?.score ?? 0) * 100),
        bestPractices: Math.round((categories['best-practices']?.score ?? 0) * 100),
        seo: Math.round((categories.seo?.score ?? 0) * 100),
      },
      metrics: {
        fcp: lighthouse?.audits?.['first-contentful-paint']?.displayValue ?? 'Ölçülemedi',
        lcp: lighthouse?.audits?.['largest-contentful-paint']?.displayValue ?? 'Ölçülemedi',
        cls: lighthouse?.audits?.['cumulative-layout-shift']?.displayValue ?? 'Ölçülemedi',
        inp: lighthouse?.audits?.['interaction-to-next-paint']?.displayValue ?? 'Ölçülemedi',
        speedIndex: lighthouse?.audits?.['speed-index']?.displayValue ?? 'Ölçülemedi',
        ttfb: lighthouse?.audits?.['server-response-time']?.displayValue ?? 'Ölçülemedi',
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error: unknown) {
    if (error instanceof RequestBodyError) {
      return NextResponse.json({error: error.message}, {status: error.status});
    }
    if (error instanceof ContentValidationError) {
      return NextResponse.json({error: error.message}, {status: error.status});
    }
    console.error('PageSpeed measurement failed.', error);
    return NextResponse.json({error: 'PageSpeed ölçümü başarısız oldu.'}, {status: 500});
  }
}
