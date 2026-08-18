export interface CompanyInfo {
  name: string;
  establishedYear: number;
  city: string;
  district: string;
  neighborhood: string;
  address: string;
  phones: string[];
  emails: string[];
  whatsappNumber: string; // e.g. "905423690707"
  taxOffice: string;
  taxNumber: string;
  tradeRegistryNo: string;
  mersisNo: string;
  workingHours: string;
  googleMapsEmbedUrl: string;
  /** Google İşletme Profili'nde doğrudan yorum formunu açan kısa bağlantı. */
  googleReviewUrl?: string;
  socialMedia: {
    facebook?: string;
    instagram?: string;
    linkedin?: string;
    twitter?: string;
  };
}

export interface InsuranceCategory {
  id: string;
  name: string;
  slug: string;
  description: string;
  iconName: string;
  order: number;
}

export interface FAQItem {
  id: string;
  question: string;
  answer: string;
  serviceId?: string; // empty if global
  category?: string;
  order: number;
}

export interface InsuranceService {
  id: string;
  title: string;
  slug: string;
  categoryId: string;
  shortDescription: string;
  richContent: string;
  featuredImage: string;
  iconName: string;
  coverage: string[];
  exclusions: string[];
  documents: string[];
  legalBasis: string;
  isMandatory: boolean;
  whoNeedsIt: string;
  priceFactors: string[];
  faq: { question: string; answer: string }[];
  relatedServiceIds: string[];
  relatedBlogIds?: string[];
  relatedBlogSlugs?: string[];
  seoTitle: string;
  metaDescription: string;
  canonicalUrl: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  semanticTopics: string[];
  entityTags: string[];
  searchIntentTags: string[];
  userQuestionTags: string[];
  alternateNames: string[];
  serviceAreaTags: string[];
  keyFacts: string[];
  aiSummary: string;
  shortDirectAnswer: string;
  sourceReferences: { title: string; url: string }[];
  lastReviewedDate: string;
  isPublished: boolean;
  order: number;
}

export interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string; // rich text or markdown/HTML
  featuredImage: string;
  category: string;
  author: string;
  publishedAt: string;
  isPublished: boolean;
  tags: string[];
  relatedServiceIds?: string[];
  relatedServiceSlugs?: string[];
  relatedBlogIds?: string[];
  readTimeMinutes: number;
  sources?: { title: string; url: string }[];
}

export interface SiteSettings {
  siteTitle: string;
  metaDescription: string;
  defaultOgImage: string;
  aiSearchVisible: boolean; // LLM / AI Search visibility
  robotsTxtCustom: string;
  enableSitemap: boolean;
  enableStructuredData: boolean;
  googleAnalyticsId?: string;
  googleAnalyticsApiKey?: string;
  googleTagManagerId?: string;
  googleSearchConsoleVerificationCode?: string;
  searchConsoleApiKey?: string;
  pagespeedApiKey?: string;
  googleBusinessProfileId?: string;
  googleBusinessPlaceId?: string;
  lookerStudioEmbedUrl?: string;
  customHeaderScript?: string;
  customBodyScript?: string;
  geoLat: number;
  geoLng: number;
  geoRegion?: string;
  geoPlacename?: string;
}

export interface VisitRecord {
  id: string;
  timestamp: string;
  path: string;
  referrer: string;
  referrerCategory: 'Direct' | 'Google' | 'Bing' | 'Yandex' | 'ChatGPT' | 'Perplexity' | 'Gemini' | 'Copilot' | 'Facebook' | 'Instagram' | 'LinkedIn' | 'Other';
  /**
   * Eski kayıtlarda bulunan ham tarayıcı kimliği. Yeni kayıtlarda saklanmaz —
   * ihtiyaç duyulan bilgi `browser` ve `deviceType` alanlarına çıkarılır.
   */
  userAgent?: string;
  browser: string;
  deviceType: 'Desktop' | 'Mobile' | 'Tablet';
  sessionId: string;
  ipHash: string;
}

export interface PartnerCompany {
  id: string;
  name: string;
  logoUrl: string;
  websiteUrl?: string;
  discountNote?: string;
  order: number;
  isActive: boolean;
}

/**
 * Yönetim paneline giriş yapabilen sistem kullanıcıları.
 *
 * Korumalı süper yönetici bu listede tutulmaz; o ayrı ve silinemezdir.
 */
export type SystemUserRole = 'admin' | 'user';

export interface SystemUser {
  id: string;
  name: string;
  email: string;
  role: SystemUserRole;
  passwordHash: string;
  isActive: boolean;
  createdAt: string;
}

/**
 * Ana sayfadaki kayan slaytlar. Tamamı yönetim panelinden düzenlenir.
 *
 * Metin alanları isteğe bağlıdır: bir slayt yalnızca görselle de oluşturulabilir.
 * Kaydetme sırasında yalnızca `title` veya `imageUrl`'den en az birinin dolu
 * olması zorunlu tutulur (bkz. `campaignSchema`).
 */
export interface CampaignItem {
  id: string;
  title?: string;
  badge?: string;
  description?: string;
  ctaText?: string;
  ctaLink?: string;
  isActive: boolean;
  order: number;
  /** Slaytta gösterilecek görsel. Boş bırakılırsa ikonlu varsayılan görünüm kullanılır. */
  imageUrl?: string;
  /**
   * Görsel eklendiğinde rozet/başlık/açıklama/butonların da gösterilip
   * gösterilmeyeceği. `false` ise yalnızca görsel, tam genişlikte gösterilir.
   * Tanımsız olması `true` sayılır; böylece alan eklenmeden önce kaydedilmiş
   * kampanyalar eskisi gibi davranmaya devam eder.
   * Görsel yoksa bu alanın etkisi yoktur — metin her zaman gösterilir.
   */
  showOverlayWithImage?: boolean;
}

/**
 * Müşteri ve poliçe modeli.
 *
 * Tasarım kuralları `docs/police-modulu-veri-spesifikasyonu.md` belgesinden gelir:
 * 1. Müşteri ≠ Sigortalı — poliçede sigortalı ayrı tutulur.
 * 2. Müşteri ≠ Varlık — araç/konut bilgisi müşteriye değil poliçeye bağlanır.
 * 3. Poliçe ≠ Varlık — aynı varlık birden fazla poliçede geçebilir.
 * 4. Güncel kayıt ≠ geçmiş poliçe bilgisi — poliçedeki `riskTanimi` ve
 *    `bransAlanlari` o poliçe düzenlendiği andaki bilgiyi saklar; müşteri kartı
 *    sonradan değişse bile eski poliçe eski bilgiyi göstermeye devam eder.
 *
 * Branşa özel alanlar (48 branş, her biri onlarca alan) sabit sütunlarla değil
 * `bransAlanlari` sözlüğüyle tutulur — spesifikasyondaki "dinamik form motoru"
 * ilkesi. Böylece yeni branş eklemek şema değişikliği gerektirmez.
 */
export type CustomerType = 'bireysel' | 'kurumsal';

/** Kurumsal müşterinin yetkilisi. Bir kuruma sınırsız yetkili eklenebilir. */
export interface CorporateContact {
  id: string;
  ad: string;
  soyad: string;
  gorevUnvani?: string;
  mobilTelefon?: string;
  email?: string;
  anaYetkili: boolean;
  policeYetkilisi?: boolean;
  hasarYetkilisi?: boolean;
  tahsilatYetkilisi?: boolean;
  notlar?: string;
}

export interface Customer {
  id: string;
  /** Panelde görünen, insan okuyabilir müşteri numarası (otomatik üretilir). */
  musteriNo: string;
  tip: CustomerType;

  // Bireysel
  tcKimlikNo?: string;
  yabanciKimlikNo?: string;
  ad?: string;
  soyad?: string;
  dogumTarihi?: string;
  cinsiyet?: string;
  uyruk?: string;
  meslek?: string;

  // Kurumsal
  vergiNo?: string;
  vergiDairesi?: string;
  firmaUnvani?: string;
  markaAdi?: string;
  mersisNo?: string;
  naceKodu?: string;
  faaliyetKonusu?: string;
  calisanSayisi?: number;

  // Ortak iletişim ve adres
  mobilTelefon?: string;
  sabitTelefon?: string;
  email?: string;
  il?: string;
  ilce?: string;
  acikAdres?: string;
  uavtKodu?: string;

  musteriTemsilcisi?: string;
  notlar?: string;
  /** Yalnızca kurumsal müşterilerde kullanılır. */
  yetkililer: CorporateContact[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export type PolicyStatus = 'Aktif' | 'Yenilendi' | 'İptal' | 'Süresi Doldu';

export interface Policy {
  id: string;
  /** Poliçenin bağlı olduğu müşteri hesabı (sigorta ettiren). */
  musteriId: string;
  /**
   * Sigortalı, sigorta ettirenden farklı olabilir (kural 1). Boş bırakılırsa
   * sigortalı = müşteri kabul edilir.
   */
  sigortaliAdi?: string;

  sigortaSirketi: string;
  /** Branş — paneldeki hizmet listesinden seçilir. */
  sigortaTuru: string;
  policeNo: string;
  yenilemeNo?: string;
  zeyilNo?: string;

  duzenlemeTarihi?: string;
  /** ISO (YYYY-MM-DD). Ekranda GG.AA.YYYY gösterilir. */
  baslangicTarihi: string;
  /** ISO (YYYY-MM-DD). Poliçe takibi bu alan üzerinden yapılır. */
  bitisTarihi: string;

  durum: PolicyStatus;
  yenilemeMi: boolean;
  oncekiPoliceNo?: string;

  brutPrim?: number;
  netPrim?: number;
  komisyonOrani?: number;
  komisyonTutari?: number;
  paraBirimi?: string;
  odemeSekli?: string;
  taksitSayisi?: number;
  tahsilatDurumu?: string;

  /**
   * Poliçe düzenlendiği andaki varlık/risk özeti — örn. "34 ABC 123 · Renault Clio"
   * veya "Kepez / Özgürlük Mah. 120 m² mesken". Kural 4'ün uygulaması: müşteri
   * kartı sonradan değişse de bu alan dokunulmadan kalır.
   */
  riskTanimi?: string;
  /** Branşa özel alanlar (dinamik). Anahtar = CMS'te görünen Türkçe alan adı. */
  bransAlanlari?: Record<string, string>;

  policePdfUrl?: string;
  sorumluPersonel?: string;
  notlar?: string;
  createdAt: string;
  updatedAt: string;
}

export interface QuoteRequest {
  id: string;
  timestamp: string;
  serviceName: string;
  fullName: string;
  phone: string;
  email?: string;
  cityDistrict?: string;
  notes?: string;
  adminNotes?: string;
  status: 'Yeni' | 'Görüşüldü' | 'Revize İstendi' | 'Poliçeleştirildi' | 'İptal Edildi';
  /**
   * Teklifin bağlı olduğu müşteri kaydı. Site formundan gelen tekliflerde boştur;
   * müşteri detay sayfasından 'Teklif Ver' ile açılanlarda doludur. Teklif poliçeye
   * çevrilirken poliçenin sahibi buradan bilinir.
   */
  musteriId?: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  userEmail: string;
  action: string;
  details: string;
}
