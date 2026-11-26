import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getBaseUrl } from '@/lib/page-metadata';

/**
 * Kısa yorum bağlantısı: velisigorta.com.tr/yorum → Google İşletme Profili yorum formu.
 *
 * Ofis masasındaki QR kodda, makbuzda ve WhatsApp mesajında g.page yerine acentenin kendi
 * alan adı görünür; müşteri bağlantıya daha kolay güvenir. Yorum adresi değişirse yalnız
 * firma bilgisi güncellenir, basılı QR kodlar geçerliliğini korur.
 */
export const dynamic = 'force-dynamic';

export async function GET() {
  const db = await getDb();
  const hedef = db.companyInfo.googleReviewUrl || getBaseUrl();
  return NextResponse.redirect(hedef, 302);
}
