import { CompanyInfo, InsuranceService, FAQItem, BlogPost } from './types';

/** Acente şemasına eklenen, firma künyesi dışındaki kaynaklardan gelen bilgiler. */
export interface AcenteSemaEki {
  /** Yetkili acentesi olunan sigorta şirketleri (anlaşmalı şirketler tablosu). */
  yetkiliSirketler?: string[];
  /** Harita iğnesinin gerçek konumu; ayarlardaki değer esas alınır. */
  enlem?: number;
  boylam?: number;
  googlePlaceId?: string;
}

/**
 * "AXA Sigorta, Sompo Sigorta ve Türkiye Sigorta" biçiminde yetkili şirket cümlesi.
 * Yalnız etkin anlaşmalı şirketler sayılır; hiç yoksa boş metin döner ve cümle basılmaz.
 */
export function yetkiliSirketMetni(partners: { name: string; isActive: boolean }[]): string {
  const adlar = partners.filter((p) => p.isActive && p.name.trim()).map((p) => p.name.trim());
  if (adlar.length < 2) return adlar.join('');
  return `${adlar.slice(0, -1).join(', ')} ve ${adlar[adlar.length - 1]}`;
}

/** Şema ekini veritabanı anlık görüntüsünden kurar; ana sayfa ve kurumsal sayfa aynı bilgiyi basar. */
export function acenteSemaEki(db: {
  partners?: { name: string; isActive: boolean }[];
  settings: { geoLat: number; geoLng: number; googleBusinessPlaceId?: string };
}): AcenteSemaEki {
  return {
    yetkiliSirketler: (db.partners || []).filter((p) => p.isActive).map((p) => p.name),
    enlem: db.settings.geoLat,
    boylam: db.settings.geoLng,
    googlePlaceId: db.settings.googleBusinessPlaceId,
  };
}

/** Google İşletme Profili'nin kalıcı bağlantısı; `sameAs` ile site ve harita kaydı tek varlık olarak eşleşir. */
export function googleHaritaUrl(placeId?: string): string | undefined {
  return placeId ? `https://www.google.com/maps/place/?q=place_id:${placeId}` : undefined;
}

// shortcut: ekip kodda sabit; kadro sık değişirse panelden düzenlenebilir firma alanına taşınmalı.
// Antalya'nın 19 ilçesi; büyük nüfuslu merkez ilçeler önde. Şema, llms.txt ve kurumsal sayfa aynı listeyi kullanır
// ki görünür metin ile yapısal veri çelişmesin.
export const ANTALYA_ILCELERI = [
  'Muratpaşa', 'Kepez', 'Konyaaltı', 'Döşemealtı', 'Aksu', 'Alanya', 'Manavgat', 'Serik', 'Kemer', 'Kumluca',
  'Finike', 'Kaş', 'Demre', 'Elmalı', 'Korkuteli', 'Gazipaşa', 'Akseki', 'Gündoğmuş', 'İbradı',
] as const;

export const ACENTE_EKIBI = [
  { ad: 'Veli UĞURCU', unvan: 'Kurucu ve Müdür' },
  { ad: 'Özlem GÖKÇE', unvan: 'Bireysel Sigortalar Sorumlusu' },
  { ad: 'İsmail GÖKÇE', unvan: 'Kurumsal Anlaşmalar Sorumlusu' },
] as const;

export function getInsuranceAgencySchema(company: CompanyInfo, baseUrl: string, ek: AcenteSemaEki = {}) {
  const sirketler = ek.yetkiliSirketler?.filter(Boolean) ?? [];
  const haritaUrl = googleHaritaUrl(ek.googlePlaceId);

  return {
    '@context': 'https://schema.org',
    '@type': 'InsuranceAgency',
    '@id': `${baseUrl}/#organization`,
    name: company.name,
    alternateName: 'Veli Sigorta',
    legalName: company.name,
    description:
      `${company.establishedYear}'ten beri Antalya'da bireysel ve kurumsal sigorta ihtiyaçları için hizmet veren aile sigorta acentesi.` +
      (sirketler.length ? ` ${sirketler.join(', ')} yetkili acentesi.` : ''),
    url: baseUrl,
    logo: `${baseUrl}/Logo.png`,
    image: `${baseUrl}/Logo.png`,
    telephone: company.phones,
    email: company.emails[0],
    taxID: company.taxNumber,
    foundingDate: String(company.establishedYear),
    // Kişi adları ve görevleri E-E-A-T sinyalidir: yanıt motorları "kim işletiyor" sorusunu buradan yanıtlar.
    founder: { '@type': 'Person', name: ACENTE_EKIBI[0].ad },
    employee: ACENTE_EKIBI.map((k) => ({ '@type': 'Person', name: k.ad, jobTitle: k.unvan })),
    ...(company.levhaNo
      ? {
          identifier: {
            '@type': 'PropertyValue',
            propertyID: 'TOBB Sigorta Acenteleri Levhası Kayıt No',
            value: company.levhaNo,
          },
        }
      : {}),
    address: {
      '@type': 'PostalAddress',
      streetAddress: company.address,
      addressLocality: company.district,
      addressRegion: company.city,
      postalCode: '07025',
      addressCountry: 'TR',
    },
    // Koordinat ve saatler eskiden sabit yazılıydı ve sitedeki bilgiyle çelişiyordu
    // (08:30–18:30, Cumartesi 13:30'a kadar); tutarsız işletme bilgisi yerel aramada güven kaybettirir.
    geo: {
      '@type': 'GeoCoordinates',
      latitude: ek.enlem ?? 36.9132296,
      longitude: ek.boylam ?? 30.674736,
    },
    ...(haritaUrl ? { hasMap: haritaUrl } : {}),
    openingHoursSpecification: [
      {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
        opens: '09:00',
        closes: '18:00',
      },
    ],
    priceRange: '₺₺',
    areaServed: [
      { '@type': 'AdministrativeArea', name: 'Antalya' },
      ...ANTALYA_ILCELERI.map((name) => ({
        '@type': 'AdministrativeArea',
        name,
        containedInPlace: { '@type': 'AdministrativeArea', name: 'Antalya' },
      })),
    ],
    knowsAbout: ['Kasko sigortası', 'Zorunlu trafik sigortası', 'Tamamlayıcı sağlık sigortası', 'DASK', 'Konut sigortası', 'İşyeri sigortası'],
    ...(sirketler.length
      ? { brand: sirketler.map((name) => ({ '@type': 'Brand', name })) }
      : {}),
    hasOfferCatalog: {
      '@type': 'OfferCatalog',
      name: 'Veli Sigorta Hizmet Kataloğu',
      itemListElement: [
        { '@type': 'Offer', itemOffered: { '@type': 'Service', name: 'Zorunlu Trafik Sigortası' } },
        { '@type': 'Offer', itemOffered: { '@type': 'Service', name: 'Kasko Sigortası' } },
        { '@type': 'Offer', itemOffered: { '@type': 'Service', name: 'Tamamlayıcı Sağlık Sigortası' } },
        { '@type': 'Offer', itemOffered: { '@type': 'Service', name: 'DASK Zorunlu Deprem Sigortası' } },
      ],
    },
    // Boş kalan `sameAs`, yapay zekâ ve bilgi grafiğinin siteyi harita kaydıyla aynı varlık
    // olarak eşleştirmesini engelliyordu; harita bağlantısı her zaman eklenir.
    sameAs: [haritaUrl, ...Object.values(company.socialMedia || {})].filter(Boolean),
  };
}

export function getServiceSchema(service: InsuranceService, company: CompanyInfo, baseUrl: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Service',
    '@id': `${baseUrl}/hizmetlerimiz/${service.slug}/#service`,
    name: service.title,
    description: service.shortDescription,
    provider: {
      '@type': 'InsuranceAgency',
      name: company.name,
      url: baseUrl,
    },
    serviceType: service.title,
    areaServed: {
      '@type': 'AdministrativeArea',
      name: 'Antalya',
    },
    hasOfferCatalog: {
      '@type': 'OfferCatalog',
      name: `${service.title} Teminat Kataloğu`,
      itemListElement: service.coverage.map((cov, idx) => ({
        '@type': 'Offer',
        itemOffered: { '@type': 'Service', name: cov },
        position: idx + 1,
      })),
    },
  };
}

/**
 * S.S.S. şeması.
 *
 * `kimlik` verildiğinde bu kayıt sayfanın KENDİSİNİ de tanımlar. Neden gerekli:
 * `/sss` sayfasında hem sayfa kimliği için bir `FAQPage` hem de soruları taşıyan
 * ayrı bir `FAQPage` basılıyordu; aynı adreste iki FAQPage çakışıyor ve
 * `mainEntity` içermeyen boş olanı geçersiz yapısal veri sayılıyordu.
 *
 * Hizmet detay sayfalarında `kimlik` verilmez: orada sayfanın kimliğini `Service`
 * şeması taşır, S.S.S. yalnızca ek bir bölümdür.
 */
export function getFAQSchema(
  faqs: { question: string; answer: string }[],
  kimlik?: { ad: string; aciklama: string; yol: string; baseUrl: string },
) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    ...(kimlik
      ? {
          '@id': `${kimlik.baseUrl}${kimlik.yol}#webpage`,
          url: `${kimlik.baseUrl}${kimlik.yol}`,
          name: kimlik.ad,
          description: kimlik.aciklama,
          inLanguage: 'tr-TR',
          isPartOf: { '@type': 'WebSite', '@id': `${kimlik.baseUrl}/#website`, url: kimlik.baseUrl },
          about: { '@id': `${kimlik.baseUrl}/#organization` },
        }
      : {}),
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  };
}

export function getBreadcrumbSchema(items: { name: string; url: string }[], baseUrl: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url.startsWith('http') ? item.url : `${baseUrl}${item.url}`,
    })),
  };
}

/**
 * Sayfanın kendisini tanımlayan şema.
 *
 * Neden gerekli: detay sayfalarında `Service`/`Article` şemaları vardı ama
 * `/kurumsal`, `/sss`, `/iletisim`, `/hizmetlerimiz` ve `/haberler` sayfalarında
 * HİÇ yapısal veri yoktu. Arama motoru bu sayfaların ne olduğunu yalnız metinden
 * tahmin ediyordu. Her sayfa ayrıca kurumun `@id`'sine bağlanır (`isPartOf` /
 * `about`), böylece beş sayfa dağınık değil tek bir kurum etrafında toplanır.
 */
export function getWebPageSchema({
  tur = 'WebPage',
  ad,
  aciklama,
  yol,
  baseUrl,
}: {
  tur?: 'WebPage' | 'AboutPage' | 'ContactPage' | 'CollectionPage' | 'FAQPage';
  ad: string;
  aciklama: string;
  /** Kök göreli yol, örn. `/kurumsal` */
  yol: string;
  baseUrl: string;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': tur,
    '@id': `${baseUrl}${yol}#webpage`,
    url: `${baseUrl}${yol}`,
    name: ad,
    description: aciklama,
    inLanguage: 'tr-TR',
    isPartOf: { '@type': 'WebSite', '@id': `${baseUrl}/#website`, url: baseUrl },
    about: { '@id': `${baseUrl}/#organization` },
  };
}

/**
 * İletişim sayfası için iletişim noktaları.
 *
 * Telefonların tamamı verilir; `contactType` Türkçe değil İngilizce olmalı —
 * schema.org sabit sözlüğü kullanır, Türkçe yazmak alanı geçersiz kılar.
 */
export function getContactPointSchema(company: CompanyInfo, baseUrl: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': `${baseUrl}/#organization`,
    name: company.name,
    url: baseUrl,
    contactPoint: company.phones.map((telefon) => ({
      '@type': 'ContactPoint',
      telephone: telefon,
      contactType: 'customer service',
      areaServed: 'TR',
      availableLanguage: ['Turkish'],
      email: company.emails[0],
    })),
  };
}

/**
 * Liste sayfaları için sıralı öğe listesi (`/hizmetlerimiz`, `/haberler`).
 *
 * `url` mutlak verilir: göreli adresler bazı doğrulayıcılarda çözümlenmiyor.
 */
export function getItemListSchema({
  ad,
  ogeler,
  baseUrl,
}: {
  ad: string;
  ogeler: { name: string; url: string }[];
  baseUrl: string;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: ad,
    numberOfItems: ogeler.length,
    itemListElement: ogeler.map((oge, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: oge.name,
      url: oge.url.startsWith('http') ? oge.url : `${baseUrl}${oge.url}`,
    })),
  };
}

export function getArticleSchema(article: BlogPost, company: CompanyInfo, baseUrl: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: article.title,
    description: article.excerpt,
    image: article.featuredImage,
    datePublished: article.publishedAt,
    dateModified: article.publishedAt,
    author: {
      '@type': 'Organization',
      name: company.name,
      url: baseUrl,
    },
    publisher: {
      '@type': 'Organization',
      name: company.name,
      logo: {
        '@type': 'ImageObject',
        url: `${baseUrl}/Logo.png`,
      },
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `${baseUrl}/haberler/${article.slug}`,
    },
  };
}
