import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getBaseUrl } from '@/lib/page-metadata';

export const dynamic = 'force-dynamic';

const GECERLILIK_GUN = 365;

/**
 * RFC 9116 uyumlu security.txt.
 *
 * İletişim adresi sitedeki gerçek kurumsal e-postadan alınır; uydurma bilgi
 * üretilmez. `Expires` her istekte ileri tarihli üretilir, böylece dosya
 * kendiliğinden bayatlamaz.
 */
export async function GET() {
  const db = await getDb();
  const company = db.companyInfo;
  const base = getBaseUrl();

  const iletisim = process.env.SECURITY_CONTACT_EMAIL?.trim() || company.emails[0];
  const expires = new Date(Date.now() + GECERLILIK_GUN * 24 * 60 * 60 * 1000).toISOString();

  const content = `Contact: mailto:${iletisim}
Expires: ${expires}
Preferred-Languages: tr, en
Canonical: ${base}/.well-known/security.txt

# Güvenlik açığı bildirimi
# Bir güvenlik sorunu tespit ettiyseniz lütfen yukarıdaki adrese bildirin.
# Bildiriminizde sorunu yeniden üretmek için gereken adımları paylaşın.
# Sorunu kamuya açıklamadan önce yanıt vermemiz için makul bir süre tanımanızı rica ederiz.
`;

  return new NextResponse(content, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=86400',
    },
  });
}
