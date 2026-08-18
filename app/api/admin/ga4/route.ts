import { NextResponse } from 'next/server';
import { getCurrentAdmin } from '@/lib/auth';
import { ANALYTICS_SCOPE, callGoogleApi, GoogleApiError, isGoogleApiConfigured } from '@/lib/google-api';
import { gunBosluklariniDoldur } from '@/lib/gun-serisi';

export const dynamic = 'force-dynamic';

const DEFAULT_PROPERTY_ID = '549359035';
/**
 * 30 günlük pencere. Bitiş 'today' olduğu için başlangıç 29 gün önce:
 * '30daysAgo'..'today' 31 gün eder ve grafiğin altındaki "son 30 gün" yazısıyla
 * çelişirdi.
 */
const DEFAULT_RANGE = '29daysAgo';
const ROW_LIMIT = 10;

interface RunReportResponse {
  rows?: { dimensionValues?: { value?: string }[]; metricValues?: { value?: string }[] }[];
}

function toNumber(value: string | undefined): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export async function GET() {
  const current = await getCurrentAdmin();
  if (!current) {
    return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
  }

  if (!isGoogleApiConfigured()) {
    return NextResponse.json(
      { configured: false, error: 'Servis hesabı anahtarı sunucuda tanımlı değil.' },
      { status: 200 },
    );
  }

  const propertyId = process.env.GA4_PROPERTY_ID?.trim() || DEFAULT_PROPERTY_ID;
  const endpoint = `https://analyticsdata.googleapis.com/v1beta/properties/${encodeURIComponent(propertyId)}:runReport`;
  const dateRanges = [{ startDate: DEFAULT_RANGE, endDate: 'today' }];

  try {
    const [summary, channels, pages, daily] = await Promise.all([
      callGoogleApi<RunReportResponse>(endpoint, ANALYTICS_SCOPE, {
        dateRanges,
        metrics: [
          { name: 'activeUsers' },
          { name: 'sessions' },
          { name: 'screenPageViews' },
          { name: 'averageSessionDuration' },
        ],
      }),
      callGoogleApi<RunReportResponse>(endpoint, ANALYTICS_SCOPE, {
        dateRanges,
        dimensions: [{ name: 'sessionDefaultChannelGroup' }],
        metrics: [{ name: 'sessions' }],
        limit: ROW_LIMIT,
      }),
      callGoogleApi<RunReportResponse>(endpoint, ANALYTICS_SCOPE, {
        dateRanges,
        dimensions: [{ name: 'pagePath' }],
        metrics: [{ name: 'screenPageViews' }],
        limit: ROW_LIMIT,
      }),
      // Günlük seri: özet panelindeki ziyaretçi grafiği bunu çizer. Tarihe göre
      // artan sıralanır; GA4 varsayılanı metrik büyüklüğüne göre sıralıyor ve
      // grafik zaman ekseninde zikzak çiziyordu.
      callGoogleApi<RunReportResponse>(endpoint, ANALYTICS_SCOPE, {
        dateRanges,
        dimensions: [{ name: 'date' }],
        metrics: [{ name: 'activeUsers' }, { name: 'sessions' }],
        orderBys: [{ dimension: { dimensionName: 'date' } }],
        limit: 90,
      }),
    ]);

    const totals = summary.rows?.[0]?.metricValues ?? [];

    return NextResponse.json({
      configured: true,
      propertyId,
      range: { startDate: DEFAULT_RANGE, endDate: 'today' },
      summary: {
        activeUsers: toNumber(totals[0]?.value),
        sessions: toNumber(totals[1]?.value),
        pageViews: toNumber(totals[2]?.value),
        averageSessionSeconds: Math.round(toNumber(totals[3]?.value)),
      },
      channels: (channels.rows ?? []).map((row) => ({
        name: row.dimensionValues?.[0]?.value ?? '',
        sessions: toNumber(row.metricValues?.[0]?.value),
      })),
      topPages: (pages.rows ?? []).map((row) => ({
        path: row.dimensionValues?.[0]?.value ?? '',
        views: toNumber(row.metricValues?.[0]?.value),
      })),
      // GA4 tarihi 'YYYYAAGG' biçiminde veriyor; ISO'ya çevrilir ki istemci
      // tarafında ayrıştırma tekrar edilmesin.
      //
      // Ziyaret almayan günler yanıtta HİÇ dönmüyor; boşluk doldurulmazsa grafik
      // ardışık olmayan günleri yan yana çizer ve o güne düşen teklif talepleri
      // (seri GA4'ün gün listesinden üretiliyor) tümden kaybolur.
      daily: gunBosluklariniDoldur(
        (daily.rows ?? []).map((row) => {
          const ham = row.dimensionValues?.[0]?.value ?? '';
          return {
            date: ham.length === 8 ? `${ham.slice(0, 4)}-${ham.slice(4, 6)}-${ham.slice(6)}` : ham,
            activeUsers: toNumber(row.metricValues?.[0]?.value),
            sessions: toNumber(row.metricValues?.[1]?.value),
          };
        }),
        (date) => ({ date, activeUsers: 0, sessions: 0 }),
      ),
    });
  } catch (error) {
    const status = error instanceof GoogleApiError ? error.status : 500;
    const message = error instanceof GoogleApiError ? error.message : 'Beklenmeyen hata.';
    console.error('GA4 Data API isteği başarısız:', error);
    return NextResponse.json({ configured: true, error: message }, { status });
  }
}
