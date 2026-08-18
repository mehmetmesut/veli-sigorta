import { CompanyInfo, InsuranceService, FAQItem, BlogPost } from './types';

export function getInsuranceAgencySchema(company: CompanyInfo, baseUrl: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'InsuranceAgency',
    '@id': `${baseUrl}/#organization`,
    name: company.name,
    legalName: company.name,
    description: "Antalya Kepez'de 2004'ten beri bireysel ve kurumsal sigorta ihtiyaçları için hizmet veren aile sigorta acentesi.",
    url: baseUrl,
    logo: `${baseUrl}/Logo.png`,
    image: `${baseUrl}/Logo.png`,
    telephone: company.phones,
    email: company.emails[0],
    taxID: company.taxNumber,
    foundingDate: '2004',
    address: {
      '@type': 'PostalAddress',
      streetAddress: company.address,
      addressLocality: company.district,
      addressRegion: company.city,
      postalCode: '07025',
      addressCountry: 'TR',
    },
    geo: {
      '@type': 'GeoCoordinates',
      latitude: 36.9085,
      longitude: 30.6823,
    },
    openingHoursSpecification: [
      {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
        opens: '08:30',
        closes: '18:30',
      },
      {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: ['Saturday'],
        opens: '09:00',
        closes: '13:30',
      },
    ],
    priceRange: '₺₺',
    areaServed: [
      { '@type': 'AdministrativeArea', name: 'Antalya' },
      { '@type': 'AdministrativeArea', name: 'Kepez' },
      { '@type': 'AdministrativeArea', name: 'Muratpaşa' },
      { '@type': 'AdministrativeArea', name: 'Konyaaltı' },
      { '@type': 'AdministrativeArea', name: 'Döşemealtı' },
    ],
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
    sameAs: Object.values(company.socialMedia || {}).filter(Boolean),
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
