import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export const revalidate = 60;

export async function GET() {
  const db = await getDb();
  if (!db.settings.enableSitemap) {
    return new NextResponse('Sitemap devre dışı.', {
      status: 404,
      headers: { 'Cache-Control': 'no-store' },
    });
  }
  const baseUrl = process.env.APP_URL || 'https://velisigorta.com.tr';

  const staticPages = [
    '',
    '/hizmetlerimiz',
    '/kurumsal',
    '/bilgi-merkezi',
    '/hasar-aninda',
    '/sss',
    '/haberler',
    '/iletisim',
    '/teklif-al',
  ];

  const servicePages = db.services
    .filter((s) => s.isPublished)
    .map((s) => `/hizmetlerimiz/${s.slug}`);

  const blogPages = db.blogs
    .filter((b) => b.isPublished)
    .map((b) => `/haberler/${b.slug}`);

  const allUrls = [...staticPages, ...servicePages, ...blogPages];

  const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  ${allUrls
    .map((path) => {
      return `
    <url>
      <loc>${baseUrl}${path}</loc>
      <lastmod>${new Date().toISOString().substring(0, 10)}</lastmod>
      <changefreq>weekly</changefreq>
      <priority>${path === '' ? '1.0' : path.startsWith('/hizmetlerimiz/') ? '0.9' : '0.8'}</priority>
    </url>`;
    })
    .join('')}
</urlset>`;

  return new NextResponse(sitemapXml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
    },
  });
}
