import React from 'react';
import Script from 'next/script';
import { getDb } from '@/lib/db';

export default async function GoogleScripts() {
  const db = await getDb();
  const settings = db.settings || {};

  const gaId = /^G-[A-Z0-9]{4,20}$/.test(settings.googleAnalyticsId || '')
    ? settings.googleAnalyticsId
    : '';
  const gtmId = /^GTM-[A-Z0-9]{4,12}$/.test(settings.googleTagManagerId || '')
    ? settings.googleTagManagerId
    : '';
  const verificationCode = settings.googleSearchConsoleVerificationCode;
  const geoRegion = settings.geoRegion || 'TR-07';
  const geoPlacename = settings.geoPlacename || 'Antalya';
  const geoLat = settings.geoLat || 36.9085;
  const geoLng = settings.geoLng || 30.6823;

  // Clean Google Verification Code if user pasted whole meta tag or just code
  let cleanVerification = verificationCode;
  if (verificationCode && verificationCode.includes('content=')) {
    const match = verificationCode.match(/content=["']([^"']+)["']/);
    if (match) cleanVerification = match[1];
  }
  if (cleanVerification && !/^[A-Za-z0-9_-]{10,256}$/.test(cleanVerification)) {
    cleanVerification = '';
  }

  const serializedGaId = JSON.stringify(gaId);
  const serializedGtmId = JSON.stringify(gtmId);

  return (
    <>
      {/* Google Search Console Meta Verification Tag */}
      {cleanVerification && (
        <meta name="google-site-verification" content={cleanVerification} />
      )}

      {/* GEO & Local SEO Meta Tags */}
      <meta name="geo.region" content={geoRegion} />
      <meta name="geo.placename" content={geoPlacename} />
      <meta name="geo.position" content={`${geoLat};${geoLng}`} />
      <meta name="ICBM" content={`${geoLat}, ${geoLng}`} />

      {/* Google Analytics 4 (gtag.js) */}
      {gaId && (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
            strategy="afterInteractive"
          />
          <Script id="google-analytics" strategy="afterInteractive">
            {`
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', ${serializedGaId}, {
                page_path: window.location.pathname,
              });
            `}
          </Script>
        </>
      )}

      {/* Google Tag Manager (GTM) */}
      {gtmId && (
        <Script id="google-tag-manager" strategy="afterInteractive">
          {`
            (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
            new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
            j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
            'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
            })(window,document,'script','dataLayer',${serializedGtmId});
          `}
        </Script>
      )}
    </>
  );
}
