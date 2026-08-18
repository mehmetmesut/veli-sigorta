import type {
  BlogPost,
  CampaignItem,
  CompanyInfo,
  FAQItem,
  InsuranceCategory,
  InsuranceService,
  PartnerCompany,
  SiteSettings,
} from './types';
import { kampanyaSiralariniNormalize, sonrakiKampanyaSirasi } from './kampanya-sirasi';
import {
  boolCoz,
  calistir,
  isoToDate,
  jsonCoz,
  metinVeyaNull,
  sorgula,
  tekSatir,
} from './mysql';
import { sanitizeStoredHtml } from './html-sanitizer';

/**
 * İçerik deposu: site sayfalarının okuduğu, panelden düzenlenen veriler.
 *
 * Bu koleksiyonlar küçüktür (onlarca kayıt) ve her sayfa üretiminde okunur; bu yüzden
 * tamamı belleğe alınabilir. Büyüyen operasyonel veri (ziyaret, müşteri, poliçe) burada
 * DEĞİLDİR — onlar `repo-crm.ts` ve `repo-ops.ts` içinde tek tek sorgulanır.
 *
 * Sütun/JSON ayrımı: filtrelenen ve sıralanan alanlar gerçek sütun, uzun kuyruk (diziler,
 * iç içe nesneler) `veri` JSON sütunudur.
 */

// --- Kategoriler -------------------------------------------------------------

export async function kategorileriGetir(): Promise<InsuranceCategory[]> {
  const satirlar = await sorgula(
    'SELECT id, name, slug, description, icon_name, sort_order FROM categories ORDER BY sort_order, name',
  );
  return satirlar.map((r) => ({
    id: String(r.id),
    name: String(r.name),
    slug: String(r.slug),
    description: String(r.description ?? ''),
    iconName: String(r.icon_name ?? 'Shield'),
    order: Number(r.sort_order ?? 0),
  }));
}

export async function kategoriKaydet(k: InsuranceCategory): Promise<void> {
  await calistir(
    `INSERT INTO categories (id, name, slug, description, icon_name, sort_order, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, UTC_TIMESTAMP(3))
     ON DUPLICATE KEY UPDATE
       name = VALUES(name), slug = VALUES(slug), description = VALUES(description),
       icon_name = VALUES(icon_name), sort_order = VALUES(sort_order), updated_at = UTC_TIMESTAMP(3)`,
    [k.id, k.name, k.slug, k.description, k.iconName, k.order],
  );
}

// --- Hizmetler ---------------------------------------------------------------

/** Sütunlara açılmayan, JSON'da saklanan hizmet alanları. */
type ServiceVeri = Pick<
  InsuranceService,
  | 'coverage' | 'exclusions' | 'documents' | 'priceFactors' | 'faq' | 'relatedServiceIds'
  | 'relatedBlogIds' | 'relatedBlogSlugs' | 'semanticTopics' | 'entityTags' | 'searchIntentTags'
  | 'userQuestionTags' | 'alternateNames' | 'serviceAreaTags' | 'keyFacts' | 'sourceReferences'
  | 'ogTitle' | 'ogDescription' | 'ogImage'
>;

function bosServiceVeri(): ServiceVeri {
  return {
    coverage: [], exclusions: [], documents: [], priceFactors: [], faq: [],
    relatedServiceIds: [], relatedBlogIds: [], relatedBlogSlugs: [],
    semanticTopics: [], entityTags: [], searchIntentTags: [], userQuestionTags: [],
    alternateNames: [], serviceAreaTags: [], keyFacts: [], sourceReferences: [],
  };
}

export async function hizmetleriGetir(): Promise<InsuranceService[]> {
  const satirlar = await sorgula('SELECT * FROM services ORDER BY sort_order, title');
  return satirlar.map((r) => {
    const veri = { ...bosServiceVeri(), ...jsonCoz<Partial<ServiceVeri>>(r.veri, {}) };
    return {
      id: String(r.id),
      title: String(r.title),
      slug: String(r.slug),
      categoryId: String(r.category_id ?? ''),
      shortDescription: String(r.short_description ?? ''),
      richContent: String(r.rich_content ?? ''),
      featuredImage: String(r.featured_image ?? ''),
      iconName: String(r.icon_name ?? ''),
      legalBasis: String(r.legal_basis ?? ''),
      whoNeedsIt: String(r.who_needs_it ?? ''),
      isMandatory: boolCoz(r.is_mandatory),
      isPublished: boolCoz(r.is_published),
      order: Number(r.sort_order ?? 0),
      seoTitle: String(r.seo_title ?? ''),
      metaDescription: String(r.meta_description ?? ''),
      canonicalUrl: String(r.canonical_url ?? ''),
      aiSummary: String(r.ai_summary ?? ''),
      shortDirectAnswer: String(r.short_direct_answer ?? ''),
      lastReviewedDate: String(r.last_reviewed_date ?? ''),
      ...veri,
    } as InsuranceService;
  });
}

export async function hizmetKaydet(s: InsuranceService): Promise<void> {
  const veri: ServiceVeri = {
    coverage: s.coverage ?? [], exclusions: s.exclusions ?? [], documents: s.documents ?? [],
    priceFactors: s.priceFactors ?? [], faq: s.faq ?? [], relatedServiceIds: s.relatedServiceIds ?? [],
    relatedBlogIds: s.relatedBlogIds ?? [], relatedBlogSlugs: s.relatedBlogSlugs ?? [],
    semanticTopics: s.semanticTopics ?? [], entityTags: s.entityTags ?? [],
    searchIntentTags: s.searchIntentTags ?? [], userQuestionTags: s.userQuestionTags ?? [],
    alternateNames: s.alternateNames ?? [], serviceAreaTags: s.serviceAreaTags ?? [],
    keyFacts: s.keyFacts ?? [], sourceReferences: s.sourceReferences ?? [],
    ogTitle: s.ogTitle, ogDescription: s.ogDescription, ogImage: s.ogImage,
  };

  await calistir(
    `INSERT INTO services (
       id, title, slug, category_id, short_description, rich_content, featured_image, icon_name,
       legal_basis, who_needs_it, is_mandatory, is_published, sort_order, seo_title,
       meta_description, canonical_url, ai_summary, short_direct_answer, last_reviewed_date,
       veri, updated_at
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, UTC_TIMESTAMP(3))
     ON DUPLICATE KEY UPDATE
       title = VALUES(title), slug = VALUES(slug), category_id = VALUES(category_id),
       short_description = VALUES(short_description), rich_content = VALUES(rich_content),
       featured_image = VALUES(featured_image), icon_name = VALUES(icon_name),
       legal_basis = VALUES(legal_basis), who_needs_it = VALUES(who_needs_it),
       is_mandatory = VALUES(is_mandatory), is_published = VALUES(is_published),
       sort_order = VALUES(sort_order), seo_title = VALUES(seo_title),
       meta_description = VALUES(meta_description), canonical_url = VALUES(canonical_url),
       ai_summary = VALUES(ai_summary), short_direct_answer = VALUES(short_direct_answer),
       last_reviewed_date = VALUES(last_reviewed_date), veri = VALUES(veri),
       updated_at = UTC_TIMESTAMP(3)`,
    [
      s.id, s.title, s.slug, s.categoryId, s.shortDescription,
      sanitizeStoredHtml(s.richContent || ''), s.featuredImage ?? '', s.iconName ?? '',
      s.legalBasis ?? '', s.whoNeedsIt ?? '', s.isMandatory ? 1 : 0, s.isPublished ? 1 : 0,
      s.order ?? 0, s.seoTitle ?? '', s.metaDescription ?? '', s.canonicalUrl ?? '',
      s.aiSummary ?? '', s.shortDirectAnswer ?? '', s.lastReviewedDate ?? '',
      JSON.stringify(veri),
    ],
  );
}

// --- S.S.S. ------------------------------------------------------------------

export async function ssslariGetir(): Promise<FAQItem[]> {
  const satirlar = await sorgula(
    'SELECT id, question, answer, service_id, category, sort_order FROM faqs ORDER BY sort_order, id',
  );
  return satirlar.map((r) => ({
    id: String(r.id),
    question: String(r.question),
    answer: String(r.answer ?? ''),
    serviceId: r.service_id ? String(r.service_id) : undefined,
    category: r.category ? String(r.category) : undefined,
    order: Number(r.sort_order ?? 0),
  }));
}

export async function sssKaydet(f: FAQItem): Promise<void> {
  await calistir(
    `INSERT INTO faqs (id, question, answer, service_id, category, sort_order, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, UTC_TIMESTAMP(3))
     ON DUPLICATE KEY UPDATE
       question = VALUES(question), answer = VALUES(answer), service_id = VALUES(service_id),
       category = VALUES(category), sort_order = VALUES(sort_order), updated_at = UTC_TIMESTAMP(3)`,
    [f.id, f.question, f.answer, metinVeyaNull(f.serviceId), metinVeyaNull(f.category), f.order ?? 0],
  );
}

// --- Blog --------------------------------------------------------------------

type BlogVeri = Pick<BlogPost, 'tags' | 'relatedServiceIds' | 'relatedServiceSlugs' | 'relatedBlogIds' | 'sources'>;

export async function bloglariGetir(): Promise<BlogPost[]> {
  const satirlar = await sorgula('SELECT * FROM blogs ORDER BY published_at DESC, id');
  return satirlar.map((r) => {
    const veri = jsonCoz<Partial<BlogVeri>>(r.veri, {});
    return {
      id: String(r.id),
      title: String(r.title),
      slug: String(r.slug),
      excerpt: String(r.excerpt ?? ''),
      content: String(r.content ?? ''),
      featuredImage: String(r.featured_image ?? ''),
      category: String(r.category ?? ''),
      author: String(r.author ?? ''),
      publishedAt: String(r.published_at ?? ''),
      isPublished: boolCoz(r.is_published),
      readTimeMinutes: Number(r.read_time_minutes ?? 0),
      tags: veri.tags ?? [],
      relatedServiceIds: veri.relatedServiceIds ?? [],
      relatedServiceSlugs: veri.relatedServiceSlugs ?? [],
      relatedBlogIds: veri.relatedBlogIds ?? [],
      sources: veri.sources ?? [],
    };
  });
}

export async function blogKaydet(b: BlogPost): Promise<void> {
  const veri: BlogVeri = {
    tags: b.tags ?? [],
    relatedServiceIds: b.relatedServiceIds ?? [],
    relatedServiceSlugs: b.relatedServiceSlugs ?? [],
    relatedBlogIds: b.relatedBlogIds ?? [],
    sources: b.sources ?? [],
  };

  await calistir(
    `INSERT INTO blogs (
       id, title, slug, excerpt, content, featured_image, category, author,
       published_at, is_published, read_time_minutes, veri, updated_at
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, UTC_TIMESTAMP(3))
     ON DUPLICATE KEY UPDATE
       title = VALUES(title), slug = VALUES(slug), excerpt = VALUES(excerpt),
       content = VALUES(content), featured_image = VALUES(featured_image),
       category = VALUES(category), author = VALUES(author), published_at = VALUES(published_at),
       is_published = VALUES(is_published), read_time_minutes = VALUES(read_time_minutes),
       veri = VALUES(veri), updated_at = UTC_TIMESTAMP(3)`,
    [
      b.id, b.title, b.slug, b.excerpt ?? '', sanitizeStoredHtml(b.content || ''),
      b.featuredImage ?? '', b.category ?? '', b.author ?? '', b.publishedAt ?? '',
      b.isPublished ? 1 : 0, b.readTimeMinutes ?? 0, JSON.stringify(veri),
    ],
  );
}

// --- Kampanyalar (slider) ----------------------------------------------------

export async function kampanyalariGetir(): Promise<CampaignItem[]> {
  const satirlar = await sorgula('SELECT * FROM campaigns ORDER BY sort_order, id');
  return satirlar.map((r) => ({
    id: String(r.id),
    title: r.title ? String(r.title) : undefined,
    badge: r.badge ? String(r.badge) : undefined,
    description: r.description ? String(r.description) : undefined,
    ctaText: r.cta_text ? String(r.cta_text) : undefined,
    ctaLink: r.cta_link ? String(r.cta_link) : undefined,
    imageUrl: r.image_url ? String(r.image_url) : undefined,
    showOverlayWithImage: r.show_overlay_with_image === null ? undefined : boolCoz(r.show_overlay_with_image),
    isActive: boolCoz(r.is_active),
    order: Number(r.sort_order ?? 0),
  }));
}

export async function kampanyaKaydet(c: CampaignItem): Promise<void> {
  await calistir(
    `INSERT INTO campaigns (
       id, title, badge, description, cta_text, cta_link, image_url,
       show_overlay_with_image, is_active, sort_order, updated_at
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, UTC_TIMESTAMP(3))
     ON DUPLICATE KEY UPDATE
       title = VALUES(title), badge = VALUES(badge), description = VALUES(description),
       cta_text = VALUES(cta_text), cta_link = VALUES(cta_link), image_url = VALUES(image_url),
       show_overlay_with_image = VALUES(show_overlay_with_image), is_active = VALUES(is_active),
       sort_order = VALUES(sort_order), updated_at = UTC_TIMESTAMP(3)`,
    [
      c.id, metinVeyaNull(c.title), metinVeyaNull(c.badge), metinVeyaNull(c.description),
      metinVeyaNull(c.ctaText), metinVeyaNull(c.ctaLink), metinVeyaNull(c.imageUrl),
      c.showOverlayWithImage === undefined ? null : (c.showOverlayWithImage ? 1 : 0),
      c.isActive ? 1 : 0, c.order ?? 0,
    ],
  );
}

/**
 * Slider sıra numaralarını 1..N olarak yeniden düzenler.
 *
 * Her kampanya yazma/silme işleminden SONRA çağrılır; çakışma ve boşluk
 * oluşması böylece yapısal olarak imkânsız olur. Sıralama kuralı ve gerekçesi
 * `lib/kampanya-sirasi.ts` içinde.
 *
 * Yalnız DEĞİŞEN satırlar güncellenir: her seferinde tüm tabloyu yazmak
 * `updated_at` alanlarını topluca bozar ve "en son güncellenen" ölçütünü
 * anlamsızlaştırırdı.
 */
export async function kampanyaSiralamasiniDuzelt(): Promise<number> {
  const satirlar = await sorgula(
    'SELECT id, sort_order, updated_at FROM campaigns ORDER BY sort_order, id',
  );

  const hedef = kampanyaSiralariniNormalize(
    satirlar.map((r) => ({
      id: String(r.id),
      order: Number(r.sort_order ?? 0),
      guncellendi: r.updated_at ? new Date(r.updated_at as string).getTime() : 0,
    })),
  );

  const mevcut = new Map(satirlar.map((r) => [String(r.id), Number(r.sort_order ?? 0)]));
  const degisenler = hedef.filter((k) => mevcut.get(k.id) !== k.order);

  for (const k of degisenler) {
    // `updated_at` KORUNUR: yalnız sıralama düzeltiliyor, kayıt düzenlenmiyor.
    await calistir('UPDATE campaigns SET sort_order = ? WHERE id = ?', [k.order, k.id]);
  }

  return degisenler.length;
}

/** Yeni kampanyanın alacağı sıra numarası: listenin sonu. */
export async function yeniKampanyaSirasi(): Promise<number> {
  const satirlar = await sorgula('SELECT sort_order FROM campaigns');
  return sonrakiKampanyaSirasi(satirlar.map((r) => Number(r.sort_order ?? 0)));
}

// --- Anlaşmalı şirketler -----------------------------------------------------

export async function ortaklariGetir(): Promise<PartnerCompany[]> {
  const satirlar = await sorgula('SELECT * FROM partners ORDER BY sort_order, name');
  return satirlar.map((r) => ({
    id: String(r.id),
    name: String(r.name),
    logoUrl: String(r.logo_url ?? ''),
    websiteUrl: r.website_url ? String(r.website_url) : undefined,
    discountNote: r.discount_note ? String(r.discount_note) : undefined,
    isActive: boolCoz(r.is_active),
    order: Number(r.sort_order ?? 0),
  }));
}

export async function ortakKaydet(p: PartnerCompany): Promise<void> {
  await calistir(
    `INSERT INTO partners (id, name, logo_url, website_url, discount_note, is_active, sort_order, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, UTC_TIMESTAMP(3))
     ON DUPLICATE KEY UPDATE
       name = VALUES(name), logo_url = VALUES(logo_url), website_url = VALUES(website_url),
       discount_note = VALUES(discount_note), is_active = VALUES(is_active),
       sort_order = VALUES(sort_order), updated_at = UTC_TIMESTAMP(3)`,
    [
      p.id, p.name, p.logoUrl ?? '', metinVeyaNull(p.websiteUrl),
      metinVeyaNull(p.discountNote), p.isActive ? 1 : 0, p.order ?? 0,
    ],
  );
}

// --- Tekil kayıtlar (firma bilgisi, ayarlar, kimlik doğrulama) ---------------

export type TekilAd = 'companyInfo' | 'settings' | 'auth';

export async function tekilGetir<T>(ad: TekilAd, varsayilan: T): Promise<T> {
  const satir = await tekSatir('SELECT veri FROM singletons WHERE ad = ?', [ad]);
  if (!satir) return varsayilan;
  return jsonCoz<T>(satir.veri, varsayilan);
}

export async function tekilKaydet(ad: TekilAd, veri: unknown): Promise<void> {
  await calistir(
    `INSERT INTO singletons (ad, veri, updated_at) VALUES (?, ?, UTC_TIMESTAMP(3))
     ON DUPLICATE KEY UPDATE veri = VALUES(veri), updated_at = UTC_TIMESTAMP(3)`,
    [ad, JSON.stringify(veri)],
  );
}

export function firmaBilgisiGetir(varsayilan: CompanyInfo): Promise<CompanyInfo> {
  return tekilGetir<CompanyInfo>('companyInfo', varsayilan);
}

export function ayarlariGetir(varsayilan: SiteSettings): Promise<SiteSettings> {
  return tekilGetir<SiteSettings>('settings', varsayilan);
}

// --- Genel silme -------------------------------------------------------------

const SILINEBILIR_TABLOLAR = {
  categories: 'categories',
  services: 'services',
  faqs: 'faqs',
  blogs: 'blogs',
  campaigns: 'campaigns',
  partners: 'partners',
} as const;

export type SilinebilirTablo = keyof typeof SILINEBILIR_TABLOLAR;

/** İçerik kaydını siler; silinen satır sayısını döndürür. */
export async function icerikSil(tablo: SilinebilirTablo, id: string): Promise<number> {
  // Tablo adı sabit listeden gelir; kullanıcı girdisi doğrudan SQL'e yazılmaz.
  const { etkilenen } = await calistir(`DELETE FROM ${SILINEBILIR_TABLOLAR[tablo]} WHERE id = ?`, [id]);
  return etkilenen;
}

/** İçerik türündeki bir kaydın son güncelleme zamanı — çakışma denetimi için. */
export async function icerikGuncellemeZamani(
  tablo: SilinebilirTablo,
  id: string,
): Promise<Date | null> {
  const satir = await tekSatir(
    `SELECT updated_at FROM ${SILINEBILIR_TABLOLAR[tablo]} WHERE id = ?`,
    [id],
  );
  if (!satir) return null;
  return satir.updated_at instanceof Date ? satir.updated_at : new Date(String(satir.updated_at));
}

/** Verilen id dışında aynı slug'ı kullanan kayıt var mı? */
export async function slugKullanimda(
  tablo: 'categories' | 'services' | 'blogs',
  id: string,
  slug: string,
): Promise<boolean> {
  const satir = await tekSatir(
    `SELECT id FROM ${SILINEBILIR_TABLOLAR[tablo]} WHERE slug = ? AND id <> ? LIMIT 1`,
    [slug, id],
  );
  return satir !== null;
}

export { isoToDate };
