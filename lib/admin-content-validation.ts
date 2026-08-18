import { z } from 'zod';
import { telefonMaskele } from './form-helpers';
import type {
  BlogPost,
  CampaignItem,
  CompanyInfo,
  Customer,
  FAQItem,
  InsuranceCategory,
  InsuranceService,
  PartnerCompany,
  Policy,
  QuoteRequest,
  SiteSettings,
} from './types';

export class ContentValidationError extends Error {
  constructor(message: string, public readonly status = 400) {
    super(message);
    this.name = 'ContentValidationError';
  }
}

const text = (max: number, min = 0) => z.string().trim().min(min).max(max);
const identifier = text(80, 1).regex(/^[A-Za-z0-9_-]+$/);
const slug = text(120, 1).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
const order = z.number().int().min(0).max(100_000);
const stringList = (itemMax = 300, listMax = 100) => z.array(text(itemMax)).max(listMax);

/**
 * Telefon alanları tek biçime indirilir: `0(5XX) XXX XX XX`.
 *
 * İstemcide müşteri formu maskeliyordu ama teklif formu ham yazıyordu; aynı numara
 * kayıtlarda hem "0(530) 730 20 02" hem "5307302002" olarak duruyordu. Biçimlendirme
 * sunucuda da yapılır — tek doğru yer burası, hangi ekranın maskelemeyi atladığına
 * bağlı kalmaz.
 *
 * `telefonMaskele` etkisizdir (idempotent): zaten maskeli bir değeri bozmaz.
 */
const telefonBicimle = (deger: string) => (deger ? telefonMaskele(deger) : deger);

function isHttpUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

function isSafePathOrUrl(value: string): boolean {
  return (value.startsWith('/') && !value.startsWith('//')) || isHttpUrl(value);
}

const urlOrEmpty = text(2_048).refine((value) => value === '' || isHttpUrl(value));
const pathOrUrlOrEmpty = text(2_048).refine(
  (value) => value === '' || isSafePathOrUrl(value),
);
const dateString = text(40, 1).refine((value) => !Number.isNaN(Date.parse(value)));
const sourceReference = z.object({ title: text(300, 1), url: urlOrEmpty }).strict();

const socialMedia = z.object({
  facebook: urlOrEmpty.optional(),
  instagram: urlOrEmpty.optional(),
  linkedin: urlOrEmpty.optional(),
  twitter: urlOrEmpty.optional(),
}).strict();

const companyInfoSchema = z.object({
  name: text(240, 1),
  establishedYear: z.number().int().min(1900).max(2100),
  city: text(100, 1),
  district: text(100, 1),
  neighborhood: text(160),
  address: text(1_000, 1),
  phones: z.array(text(40, 1)).min(1).max(10),
  emails: z.array(z.email().max(254)).min(1).max(10),
  whatsappNumber: text(20, 8).regex(/^\d{8,15}$/),
  taxOffice: text(160),
  taxNumber: text(40),
  tradeRegistryNo: text(80),
  mersisNo: text(80),
  workingHours: text(400),
  googleMapsEmbedUrl: urlOrEmpty,
  googleReviewUrl: urlOrEmpty.optional(),
  socialMedia,
}).strict();

const settingsSchema = z.object({
  siteTitle: text(200, 1),
  metaDescription: text(500, 1),
  defaultOgImage: pathOrUrlOrEmpty,
  aiSearchVisible: z.boolean(),
  robotsTxtCustom: text(20_000),
  enableSitemap: z.boolean(),
  enableStructuredData: z.boolean(),
  googleAnalyticsId: text(80).optional(),
  googleAnalyticsApiKey: text(512).optional(),
  googleTagManagerId: text(80).optional(),
  googleSearchConsoleVerificationCode: text(512).optional(),
  searchConsoleApiKey: text(512).optional(),
  pagespeedApiKey: text(512).optional(),
  googleBusinessProfileId: text(256).optional(),
  googleBusinessPlaceId: text(256).optional(),
  lookerStudioEmbedUrl: urlOrEmpty.optional(),
  customHeaderScript: z.literal('').optional(),
  customBodyScript: z.literal('').optional(),
  geoLat: z.number().min(-90).max(90),
  geoLng: z.number().min(-180).max(180),
  geoRegion: text(32).optional(),
  geoPlacename: text(160).optional(),
}).strict();

const categorySchema = z.object({
  id: identifier,
  name: text(160, 1),
  slug,
  description: text(1_000),
  iconName: text(80),
  order,
}).strict();

const faqSchema = z.object({
  id: identifier,
  question: text(500, 1),
  answer: text(5_000, 1),
  serviceId: identifier.optional(),
  category: text(120).optional(),
  order,
}).strict();

const embeddedFaqSchema = z.object({
  question: text(500, 1),
  answer: text(5_000, 1),
}).strict();

const serviceSchema = z.object({
  id: identifier,
  title: text(240, 1),
  slug,
  categoryId: identifier,
  shortDescription: text(2_000),
  richContent: text(250_000),
  featuredImage: pathOrUrlOrEmpty,
  iconName: text(80),
  coverage: stringList(500),
  exclusions: stringList(500),
  documents: stringList(500),
  legalBasis: text(5_000),
  isMandatory: z.boolean(),
  whoNeedsIt: text(5_000),
  priceFactors: stringList(500),
  faq: z.array(embeddedFaqSchema).max(100),
  relatedServiceIds: z.array(identifier).max(100),
  relatedBlogIds: z.array(identifier).max(100).optional(),
  relatedBlogSlugs: z.array(slug).max(100).optional(),
  seoTitle: text(240),
  metaDescription: text(500),
  canonicalUrl: pathOrUrlOrEmpty,
  ogTitle: text(240).optional(),
  ogDescription: text(500).optional(),
  ogImage: pathOrUrlOrEmpty.optional(),
  semanticTopics: stringList(200),
  entityTags: stringList(200),
  searchIntentTags: stringList(200),
  userQuestionTags: stringList(500),
  alternateNames: stringList(200),
  serviceAreaTags: stringList(200),
  keyFacts: stringList(1_000),
  aiSummary: text(5_000),
  shortDirectAnswer: text(2_000),
  sourceReferences: z.array(sourceReference).max(100),
  lastReviewedDate: text(40),
  isPublished: z.boolean(),
  order,
}).strict();

const blogSchema = z.object({
  id: identifier,
  title: text(240, 1),
  slug,
  excerpt: text(2_000),
  content: text(250_000),
  featuredImage: pathOrUrlOrEmpty,
  category: text(160),
  author: text(160),
  publishedAt: dateString,
  isPublished: z.boolean(),
  tags: stringList(160),
  relatedServiceIds: z.array(identifier).max(100).optional(),
  relatedServiceSlugs: z.array(slug).max(100).optional(),
  relatedBlogIds: z.array(identifier).max(100).optional(),
  readTimeMinutes: z.number().int().min(1).max(1_000),
  sources: z.array(sourceReference).max(100).optional(),
}).strict();

const partnerSchema = z.object({
  id: identifier,
  name: text(200, 1),
  logoUrl: pathOrUrlOrEmpty,
  websiteUrl: urlOrEmpty.optional(),
  discountNote: text(500).optional(),
  order,
  isActive: z.boolean(),
}).strict();

// Metin alanları isteğe bağlıdır: bir slayt yalnızca görselle de oluşturulabilir.
// Nesne düzeyindeki refine, en az title veya imageUrl'den birinin dolu olmasını zorunlu kılar.
const campaignSchema = z.object({
  id: identifier,
  title: text(240).optional(),
  badge: text(160).optional(),
  description: text(2_000).optional(),
  ctaText: text(160).optional(),
  ctaLink: pathOrUrlOrEmpty.optional(),
  isActive: z.boolean(),
  order,
  imageUrl: pathOrUrlOrEmpty.optional(),
  showOverlayWithImage: z.boolean().optional(),
}).strict().refine(
  (campaign) => Boolean(campaign.title?.trim()) || Boolean(campaign.imageUrl?.trim()),
  { message: 'Kampanya başlığı veya görselden en az biri girilmelidir.', path: ['title'] },
);

const quoteSchema = z.object({
  id: identifier,
  timestamp: dateString,
  serviceName: text(200, 1),
  fullName: text(120, 2),
  // En az 7 karakter HAM girdide aranır (dönüşüm doğrulamadan sonra çalışır);
  // biçimlendirme uzunluğu artırdığı için sıra tersine dönemez.
  phone: text(40, 7).transform(telefonBicimle),
  email: z.union([z.literal(''), z.email().max(254)]).optional(),
  cityDistrict: text(160).optional(),
  notes: text(2_000).optional(),
  adminNotes: text(2_000).optional(),
  status: z.enum(['Yeni', 'Görüşüldü', 'Revize İstendi', 'Poliçeleştirildi', 'İptal Edildi']),
  musteriId: identifier.optional(),
}).strict();
/**
 * Panelden manuel teklif girişi.
 *
 * `musteriOlustur`, teklifle aynı anda müşteri kartı açılmasını ister. Kayıt gövdesinin
 * bir parçası değildir; sunucu bunu ayıklayıp teklif nesnesine yazmaz.
 */
const quoteInputSchema = quoteSchema
  .omit({ id: true })
  .extend({
    id: identifier.optional(),
    musteriOlustur: z.boolean().optional(),
  })
  .strict();

/**
 * Müşteri ve poliçe şemaları.
 *
 * Alanların çoğu isteğe bağlıdır: acente kaydı çoğu zaman eksik bilgiyle açar,
 * sonra tamamlar. Zorunlu tutulanlar yalnızca kaydı anlamlı kılan ve takibi
 * mümkün kılanlardır (müşteri tipi; poliçede şirket/branş/no ve tarihler).
 */
const trPhone = text(40)
  .regex(/^[0-9+()\s.-]*$/, 'Telefon yalnızca rakam ve ayraç içerebilir')
  .transform(telefonBicimle);
const emailOrEmpty = z.union([z.literal(''), z.email().max(254)]);
const isoDate = text(40, 1).refine((value) => !Number.isNaN(Date.parse(value)));
const isoDateOrEmpty = text(40).refine((value) => value === '' || !Number.isNaN(Date.parse(value)));
const money = z.number().min(0).max(1_000_000_000);

const corporateContactSchema = z.object({
  id: identifier,
  ad: text(120, 1),
  soyad: text(120, 1),
  gorevUnvani: text(160).optional(),
  mobilTelefon: trPhone.optional(),
  email: emailOrEmpty.optional(),
  anaYetkili: z.boolean(),
  policeYetkilisi: z.boolean().optional(),
  hasarYetkilisi: z.boolean().optional(),
  tahsilatYetkilisi: z.boolean().optional(),
  notlar: text(2_000).optional(),
}).strict();

const customerSchema = z.object({
  id: identifier,
  musteriNo: text(40),
  tip: z.enum(['bireysel', 'kurumsal']),

  tcKimlikNo: text(11).regex(/^\d{0,11}$/).optional(),
  yabanciKimlikNo: text(20).optional(),
  ad: text(120).optional(),
  soyad: text(120).optional(),
  dogumTarihi: isoDateOrEmpty.optional(),
  cinsiyet: text(20).optional(),
  uyruk: text(80).optional(),
  meslek: text(160).optional(),

  vergiNo: text(10).regex(/^\d{0,10}$/).optional(),
  vergiDairesi: text(160).optional(),
  firmaUnvani: text(300).optional(),
  markaAdi: text(200).optional(),
  mersisNo: text(40).optional(),
  naceKodu: text(40).optional(),
  faaliyetKonusu: text(300).optional(),
  calisanSayisi: z.number().int().min(0).max(1_000_000).optional(),

  mobilTelefon: trPhone.optional(),
  sabitTelefon: trPhone.optional(),
  email: emailOrEmpty.optional(),
  il: text(80).optional(),
  ilce: text(80).optional(),
  acikAdres: text(1_000).optional(),
  uavtKodu: text(40).optional(),

  musteriTemsilcisi: text(160).optional(),
  notlar: text(4_000).optional(),
  yetkililer: z.array(corporateContactSchema).max(50),
  isActive: z.boolean(),
  createdAt: isoDate,
  updatedAt: isoDate,
}).strict().refine(
  (c) => (c.tip === 'bireysel' ? Boolean(c.ad?.trim() || c.soyad?.trim()) : Boolean(c.firmaUnvani?.trim())),
  { message: 'Bireysel müşteride ad/soyad, kurumsal müşteride firma unvanı zorunludur.' },
);

const policySchema = z.object({
  id: identifier,
  musteriId: identifier,
  sigortaliAdi: text(240).optional(),

  sigortaSirketi: text(160, 1),
  sigortaTuru: text(160, 1),
  // Poliçe numarası BOŞ BIRAKILABİLİR. Onaylanan bir teklif poliçeye çevrilirken
  // numara çoğu zaman henüz belli değil (şirketin sisteminde düzenlenmeden
  // öğrenilemiyor) ama takibin hemen başlaması gerekiyor. Elle giriş formu yine
  // de zorunlu tutar; boş numara yalnızca tekliften dönüşümde oluşur.
  policeNo: text(80),
  yenilemeNo: text(40).optional(),
  zeyilNo: text(40).optional(),

  duzenlemeTarihi: isoDateOrEmpty.optional(),
  baslangicTarihi: isoDate,
  bitisTarihi: isoDate,

  durum: z.enum(['Aktif', 'Yenilendi', 'İptal', 'Süresi Doldu']),
  yenilemeMi: z.boolean(),
  oncekiPoliceNo: text(80).optional(),

  brutPrim: money.optional(),
  netPrim: money.optional(),
  komisyonOrani: z.number().min(0).max(100).optional(),
  komisyonTutari: money.optional(),
  paraBirimi: text(10).optional(),
  odemeSekli: text(80).optional(),
  taksitSayisi: z.number().int().min(0).max(60).optional(),
  tahsilatDurumu: text(80).optional(),

  riskTanimi: text(500).optional(),
  // Branşa özel dinamik alanlar. Anahtar sayısı ve uzunluğu sınırlanır ki
  // tek bir kayıt veritabanını şişirmesin.
  bransAlanlari: z.record(text(120, 1), text(500)).optional(),

  policePdfUrl: pathOrUrlOrEmpty.optional(),
  sorumluPersonel: text(160).optional(),
  notlar: text(4_000).optional(),
  createdAt: isoDate,
  updatedAt: isoDate,
}).strict().refine(
  (p) => Date.parse(p.bitisTarihi) >= Date.parse(p.baslangicTarihi),
  { message: 'Bitiş tarihi başlangıç tarihinden önce olamaz.', path: ['bitisTarihi'] },
);

const envelopeSchema = z.object({
  entity: z.enum([
    // 'password': env'deki ORTAK yönetici parolası (yalnız yönetici rolleri).
    // 'own_password': oturum açan kişinin KENDİ parolası (her role açık).
    'password', 'own_password', 'companyInfo', 'settings', 'categories', 'services', 'partners',
    'campaigns', 'faqs', 'blogs', 'quotes', 'quote_status', 'entityLinks', 'auditLogs',
    'customers', 'policies',
  ]),
  // 'policelestir': onaylanan teklifi poliçe kaydına çevirir (bkz. quotes bloğu).
  action: z.enum(['save', 'delete', 'clear', 'policelestir']).optional(),
  data: z.unknown().optional(),
}).strict();

const idDataSchema = z.object({ id: identifier }).strict();
const passwordDataSchema = z.object({
  currentPassword: text(128, 1),
  newPassword: text(128, 12),
}).strict();
const quoteStatusDataSchema = z.object({
  quoteId: identifier,
  status: z.enum(['Yeni', 'Görüşüldü', 'Revize İstendi', 'Poliçeleştirildi', 'İptal Edildi']),
  adminNotes: text(2_000).optional(),
}).strict();
const entityLinksSchema = z.object({
  services: z.array(z.object({
    id: identifier,
    relatedServiceIds: z.array(identifier).max(100),
    relatedBlogIds: z.array(identifier).max(100),
  }).strict()).max(250),
  blogs: z.array(z.object({
    id: identifier,
    relatedServiceIds: z.array(identifier).max(100),
    relatedBlogIds: z.array(identifier).max(100),
  }).strict()).max(250),
}).strict();

function parse<T>(schema: z.ZodType<T>, value: unknown, label: string): T {
  const result = schema.safeParse(value);
  if (!result.success) {
    const firstIssue = result.error.issues[0];
    const path = firstIssue?.path.length ? ` (${firstIssue.path.join('.')})` : '';
    throw new ContentValidationError(`${label} doğrulanamadı${path}.`);
  }
  return result.data;
}

export type ContentEnvelope = z.infer<typeof envelopeSchema>;

export function parseContentEnvelope(value: unknown): ContentEnvelope {
  return parse(envelopeSchema, value, 'İstek');
}

export function parseIdData(value: unknown): { id: string } {
  return parse(idDataSchema, value, 'Kayıt kimliği');
}

export function parsePasswordData(value: unknown): { currentPassword: string; newPassword: string } {
  return parse(passwordDataSchema, value, 'Şifre bilgileri');
}

export function parseCompanyInfo(value: unknown): CompanyInfo {
  return parse(companyInfoSchema, value, 'Firma bilgileri');
}

export function parseSettings(value: unknown): SiteSettings {
  return parse(settingsSchema, value, 'Site ayarları');
}

export function parseCategory(value: unknown): InsuranceCategory {
  return parse(categorySchema, value, 'Kategori');
}

export function parseFaq(value: unknown): FAQItem {
  return parse(faqSchema, value, 'SSS kaydı');
}

export function parseService(value: unknown): InsuranceService {
  return parse(serviceSchema, value, 'Hizmet');
}

export function parseBlog(value: unknown): BlogPost {
  return parse(blogSchema, value, 'Blog yazısı');
}

export function parsePartner(value: unknown): PartnerCompany {
  return parse(partnerSchema, value, 'Anlaşmalı şirket');
}

export function parseCampaign(value: unknown): CampaignItem {
  return parse(campaignSchema, value, 'Kampanya');
}

export function parseQuote(value: unknown): QuoteRequest {
  return parse(quoteSchema, value, 'Teklif');
}

/**
 * Onaylanan teklifin poliçeye çevrilmesi.
 *
 * Poliçe numarası ZORUNLU DEĞİL: acente çoğu zaman poliçeyi şirketin sisteminde
 * düzenlemeden numarayı öğrenemiyor, ama takibin hemen başlaması gerekiyor.
 * Başlangıç tarihi zorunlu — bitiş tarihi ondan hesaplanıyor.
 */
const teklifPolicelestirSchema = z.object({
  quoteId: identifier,
  baslangicTarihi: isoDate,
  policeNo: text(80).optional(),
  sigortaSirketi: text(160, 1),
}).strict();

export function parseTeklifPolicelestir(value: unknown) {
  return parse(teklifPolicelestirSchema, value, 'Teklif poliçeleştirme');
}

export function parseQuoteInput(value: unknown) {
  return parse(quoteInputSchema, value, 'Teklif');
}

export function parseQuoteStatus(value: unknown) {
  return parse(quoteStatusDataSchema, value, 'Teklif durumu');
}

export function parseEntityLinks(value: unknown) {
  return parse(entityLinksSchema, value, 'İçerik bağlantıları');
}

export function parseCustomer(value: unknown): Customer {
  return parse(customerSchema, value, 'Müşteri');
}

export function parsePolicy(value: unknown): Policy {
  return parse(policySchema, value, 'Poliçe');
}

export function requireAction(
  actual: ContentEnvelope['action'],
  expected: 'save' | 'delete' | 'clear' | 'policelestir',
): void {
  if (actual !== expected) {
    throw new ContentValidationError('Geçersiz işlem türü.');
  }
}

export function assertSameOrigin(request: Request): void {
  const origin = request.headers.get('origin');
  let expectedOrigin: string;

  try {
    expectedOrigin = new URL(process.env.APP_URL?.trim() || request.url).origin;
  } catch {
    throw new Error('APP_URL geçerli bir mutlak adres olmalıdır.');
  }

  if (!origin || origin !== expectedOrigin) {
    throw new ContentValidationError('İstek kaynağı doğrulanamadı.', 403);
  }
}
