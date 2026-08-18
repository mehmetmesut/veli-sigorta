import type {Metadata, Viewport} from 'next';
import {Playfair_Display, Plus_Jakarta_Sans} from 'next/font/google';
import './globals.css'; // Global styles
import GoogleScripts from '@/components/GoogleScripts';
import {AnalyticsTracker} from '@/components/AnalyticsTracker';
import {getDb} from '@/lib/db';
import {paylasimGorseli} from '@/lib/page-metadata';

export async function generateMetadata(): Promise<Metadata> {
  const {settings} = await getDb();
  const baseUrl = process.env.APP_URL || 'https://velisigorta.com.tr';
  const ogImage = paylasimGorseli(settings.defaultOgImage, settings.siteTitle);
  return {
    metadataBase: new URL(baseUrl),
    title: settings.siteTitle,
    description: settings.metaDescription,
    applicationName: 'Veli Sigorta',
    manifest: '/site.webmanifest',
    icons: { icon: '/favicon.ico', apple: '/apple-touch-icon.png' },
    robots: { index: true, follow: true },
    openGraph: {
      title: settings.siteTitle,
      description: settings.metaDescription,
      url: baseUrl,
      siteName: 'Veli Sigorta',
      locale: 'tr_TR',
      type: 'website',
      images: [ogImage],
    },
    // Ana sayfada Twitter/X kartı tanımlı değildi; alt sayfalar
    // `buildPageMetadata` üzerinden zaten alıyordu.
    twitter: {
      card: 'summary_large_image',
      title: settings.siteTitle,
      description: settings.metaDescription,
      images: [ogImage],
    },
  };
}

export const viewport: Viewport = {
  themeColor: '#003366',
  colorScheme: 'light',
};

/**
 * Yazı tipleri `next/font` ile kendi sunucumuzdan verilir.
 *
 * Önceden `app/globals.css` içinde `@import url('https://fonts.googleapis.com/...')`
 * vardı ama bu satır `@import "tailwindcss"` satırından SONRA geliyordu. CSS kuralına
 * göre `@import` yalnızca dosyanın başında geçerlidir; Tailwind v4 kendi importunu
 * binlerce kurala genişlettiği için sonraki import geçersiz sayılıp derlemede
 * atılıyordu — site yayında yedek yazı tipleriyle görünüyordu (canlı HTML'de
 * fonts.googleapis.com bağlantısı hiç yoktu).
 *
 * `next/font` hem bu sorunu kökten çözer hem de dış alan adına DNS + TLS turunu ve
 * render engelleyen istek zincirini ortadan kaldırır.
 */
const govdeYazisi = Plus_Jakarta_Sans({
  subsets: ['latin', 'latin-ext'],
  weight: ['300', '400', '500', '600', '700', '800'],
  display: 'swap',
  variable: '--font-govde',
});

const baslikYazisi = Playfair_Display({
  subsets: ['latin', 'latin-ext'],
  weight: ['400', '500', '600', '700', '800', '900'],
  style: ['normal', 'italic'],
  display: 'swap',
  variable: '--font-baslik',
});

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="tr" className={`${govdeYazisi.variable} ${baslikYazisi.variable}`}>
      <head>
        <GoogleScripts />
      </head>
      <body suppressHydrationWarning>
        <AnalyticsTracker />
        {children}
      </body>
    </html>
  );
}
