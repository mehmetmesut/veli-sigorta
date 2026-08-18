import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { buildRobotsTxt } from '@/lib/robots';

export const revalidate = 60;

export async function GET() {
  const db = await getDb();
  const robotsTxt = buildRobotsTxt(
    db.settings.robotsTxtCustom,
    db.settings.enableSitemap,
    db.settings.aiSearchVisible,
    process.env.APP_URL || 'https://velisigorta.com.tr',
  );

  return new NextResponse(robotsTxt, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
    },
  });
}
