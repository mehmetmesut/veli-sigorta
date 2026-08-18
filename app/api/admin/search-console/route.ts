import { NextResponse } from 'next/server';
import { getCurrentAdmin } from '@/lib/auth';
import { callGoogleApi, GoogleApiError, isGoogleApiConfigured, SEARCH_CONSOLE_SCOPE } from '@/lib/google-api';
import { gunBosluklariniDoldur } from '@/lib/gun-serisi';

export const dynamic = 'force-dynamic';

const DEFAULT_SITE_URL = 'sc-domain:velisigorta.com.tr';
/**
 * 30 günlük pencere; GA4 kutusuyla aynı olsun diye 28'den çıkarıldı. Yan yana
 * duran iki grafiğin farklı aralıkta olması "neden biri daha uzun?" sorusunu
 * doğuruyordu.
 *
 * Aralık `isoDate(30)`..`isoDate(1)` yani 30 gün önceden düne kadar, iki uç dâhil
 * = tam 30 gün. Bitiş bugün DEĞİL: Search Console verisi 2-3 gün gecikmeli gelir,
 * bugünü istemek her seferinde boş bir gün eklerdi.
 */
const DEFAULT_RANGE_DAYS = 30;
const ROW_LIMIT = 10;

interface SearchAnalyticsRow {
  keys?: string[];
  clicks?: number;
  impressions?: number;
  ctr?: number;
  position?: number;
}

interface SearchAnalyticsResponse {
  rows?: SearchAnalyticsRow[];
}

function isoDate(daysAgo: number): string {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - daysAgo);
  return date.toISOString().slice(0, 10);
}

function mapRows(rows: SearchAnalyticsRow[] | undefined) {
  return (rows ?? []).map((row) => ({
    key: row.keys?.[0] ?? '',
    clicks: row.clicks ?? 0,
    impressions: row.impressions ?? 0,
    ctr: Number(((row.ctr ?? 0) * 100).toFixed(2)),
    position: Number((row.position ?? 0).toFixed(1)),
  }));
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

  const siteUrl = process.env.SEARCH_CONSOLE_SITE_URL?.trim() || DEFAULT_SITE_URL;
  const endpoint = `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`;
  const range = { startDate: isoDate(DEFAULT_RANGE_DAYS), endDate: isoDate(1) };

  try {
    const [totals, queries, pages, daily] = await Promise.all([
      callGoogleApi<SearchAnalyticsResponse>(endpoint, SEARCH_CONSOLE_SCOPE, { ...range }),
      callGoogleApi<SearchAnalyticsResponse>(endpoint, SEARCH_CONSOLE_SCOPE, {
        ...range,
        dimensions: ['query'],
        rowLimit: ROW_LIMIT,
      }),
      callGoogleApi<SearchAnalyticsResponse>(endpoint, SEARCH_CONSOLE_SCOPE, {
        ...range,
        dimensions: ['page'],
        rowLimit: ROW_LIMIT,
      }),
      // Gunluk seri: ozet panelindeki arama grafikleri bunu cizer. Search Console
      // 'date' boyutunda satirlari tarihe gore artan dondurur.
      callGoogleApi<SearchAnalyticsResponse>(endpoint, SEARCH_CONSOLE_SCOPE, {
        ...range,
        dimensions: ['date'],
        rowLimit: 90,
      }),
    ]);

    const summary = mapRows(totals.rows)[0] ?? { clicks: 0, impressions: 0, ctr: 0, position: 0 };

    return NextResponse.json({
      configured: true,
      siteUrl,
      range,
      summary,
      topQueries: mapRows(queries.rows),
      topPages: mapRows(pages.rows),
      // Gösterim almayan günler yanıtta hiç dönmüyor; boşluk doldurulmazsa
      // grafik ardışık olmayan günleri yan yana çizip eğilimi yanlış gösterir.
      daily: gunBosluklariniDoldur(
        (daily.rows ?? []).map((row) => ({
          date: row.keys?.[0] ?? '',
          clicks: row.clicks ?? 0,
          impressions: row.impressions ?? 0,
        })),
        (date) => ({ date, clicks: 0, impressions: 0 }),
      ),
    });
  } catch (error) {
    const status = error instanceof GoogleApiError ? error.status : 500;
    const message = error instanceof GoogleApiError ? error.message : 'Beklenmeyen hata.';
    console.error('Search Console isteği başarısız:', error);
    return NextResponse.json({ configured: true, error: message }, { status });
  }
}
