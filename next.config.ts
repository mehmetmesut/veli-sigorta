import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  typescript: {
    ignoreBuildErrors: false,
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {key: 'X-Content-Type-Options', value: 'nosniff'},
          {key: 'X-Frame-Options', value: 'SAMEORIGIN'},
          {key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin'},
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
          },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "base-uri 'self'",
              "object-src 'none'",
              "frame-ancestors 'self'",
              "form-action 'self'",
              "script-src 'self' 'unsafe-inline' https://www.googletagmanager.com",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' data: https://fonts.gstatic.com",
              // Panelden serbest metin olarak görsel adresi girilebiliyor (hizmet, blog ve
              // şirket logoları). Beyaz liste yalnız birkaç alan adı içerdiğinden başka bir
              // adres yapıştırıldığında görsel sessizce engelleniyordu. Görseller betik
              // çalıştıramaz; https genelini açmak XSS riski doğurmaz.
              "img-src 'self' data: blob: https:",
              "connect-src 'self' https://www.google-analytics.com https://analytics.google.com https://region1.google-analytics.com",
              // lookerstudio.google.com/embed/... adresi 301 ile datastudio.google.com'a
              // yonlendiriyor ve CSP yonlendirme zincirini de denetliyor; iki alan adi da gerekli.
              "frame-src 'self' https://www.google.com https://maps.google.com https://lookerstudio.google.com https://datastudio.google.com",
              "worker-src 'self' blob:",
              "manifest-src 'self'",
              'upgrade-insecure-requests',
            ].join('; '),
          },
        ],
      },
    ];
  },
  // Allow access to remote image placeholder.
  images: {
    // Next.js 16 yalnizca bu listedeki kalite degerlerine izin verir; liste
    // disindaki her istek 400 doner. Logo bileseni 90 kalitesini kullaniyor.
    qualities: [75, 90],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**', // This allows any path under the hostname
      },
    ],
  },
  output: 'standalone',
  transpilePackages: ['motion'],
};

export default nextConfig;
