import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getBaseUrl } from '@/lib/page-metadata';

export const dynamic = 'force-dynamic';

/**
 * humans.txt — yalnızca sitede zaten kamuya açık olan kurumsal bilgiler ve
 * teknoloji yığını. Kişisel ad/iletişim bilgisi eklenmez.
 */
export async function GET() {
  const db = await getDb();
  const company = db.companyInfo;
  const base = getBaseUrl();

  const content = `/* EKİP */
Kurum: ${company.name}
Konum: ${company.district}, ${company.city}, Türkiye
Site: ${base}
İletişim: ${company.emails[0]}

/* SİTE */
Faaliyet başlangıcı: ${company.establishedYear}
Dil: Türkçe
Standartlar: HTML5, CSS3, ES2022
Teknoloji: Next.js, React, TypeScript, Tailwind CSS
Barındırma: Türkiye
`;

  return new NextResponse(content, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=86400',
    },
  });
}
