import type { Metadata } from 'next';
import { getDb } from './db';

/**
 * Sayfa başına benzersiz başlık, açıklama ve canonical üretir.
 *
 * Önceden yalnızca kök layout metadata tanımlıyordu; bu yüzden tüm sayfalar
 * Google'a aynı başlık ve açıklamayla görünüyordu.
 */
interface PageMetadataInput {
  title: string;
  description: string;
  /** Kök göreli yol, örn. `/kurumsal` */
  path: string;
  ogImage?: string;
  type?: 'website' | 'article';
}

const SITE_NAME = 'Veli Sigorta';

/**
 * Varsayılan paylaşım (Open Graph) görseli: 1200×630 JPEG, ~34 KB.
 *
 * Önceden ham `/Logo.png` veriliyordu ve iki ayrı sorunu vardı:
 *  - **2,2 MB.** WhatsApp bu boyuttaki bir görseli indirmeyip önizlemeyi tümden
 *    atlıyor; bağlantı çıplak metin olarak paylaşılıyordu.
 *  - **Saydam zeminli 1536×1024 PNG.** Paylaşım kartları saydamlığı desteklemez,
 *    zemini kendi renkleriyle (çoğunlukla siyah) doldurur; gümüş logo kayboluyordu.
 *
 * Yeni görsel `public/paylasim-gorseli.jpg`; logo krem zemine yerleştirilip
 * 1200×630 kutusuna oturtuldu. Zemin lacivert DEĞİL: logonun mavi "SİGORTA"
 * yazısı ve alan adı satırı lacivert üstünde okunmuyordu.
 */
export const VARSAYILAN_PAYLASIM_GORSELI = {
  url: '/paylasim-gorseli.jpg',
  width: 1200,
  height: 630,
} as const;

/**
 * Paylaşım görselini `alt` ve — ölçüsünü BİLDİĞİMİZ durumda — en/boy ile verir.
 *
 * Panelden özel bir adres girildiyse ölçü bildirilmez: uydurulmuş bir en/boy,
 * paylaşım kartlarının görseli yanlış oranda kırpmasına yol açar.
 */
export function paylasimGorseli(adres: string | undefined | null, alt: string) {
  const secilen = (adres || '').trim() || VARSAYILAN_PAYLASIM_GORSELI.url;
  return secilen === VARSAYILAN_PAYLASIM_GORSELI.url
    ? { ...VARSAYILAN_PAYLASIM_GORSELI, alt }
    : { url: secilen, alt };
}

export function getBaseUrl(): string {
  return process.env.APP_URL || 'https://velisigorta.com.tr';
}

export async function buildPageMetadata({
  title,
  description,
  path,
  ogImage,
  type = 'website',
}: PageMetadataInput): Promise<Metadata> {
  const { settings } = await getDb();
  const baseUrl = getBaseUrl();
  const image = paylasimGorseli(ogImage || settings.defaultOgImage, title);
  const url = `${baseUrl}${path}`;

  return {
    metadataBase: new URL(baseUrl),
    title,
    description,
    applicationName: SITE_NAME,
    authors: [{ name: SITE_NAME, url: baseUrl }],
    manifest: '/site.webmanifest',
    // Public sayfalar indekslenebilir; admin alanı robots.txt ve middleware ile korunur.
    robots: {
      index: true,
      follow: true,
      googleBot: { index: true, follow: true, 'max-image-preview': 'large' },
    },
    icons: {
      icon: '/favicon.ico',
      apple: '/apple-touch-icon.png',
    },
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      siteName: SITE_NAME,
      locale: 'tr_TR',
      type,
      images: [image],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [image],
    },
  };
}
