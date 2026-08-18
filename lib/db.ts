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
import { hashClientIp } from './rate-limit';
import { createSuperAdminAccount, SuperAdminAccount } from './superadmin';
import {
  ayarlariGetir,
  bloglariGetir,
  firmaBilgisiGetir,
  kampanyalariGetir,
  kategorileriGetir,
  hizmetleriGetir,
  ortaklariGetir,
  ssslariGetir,
  tekilGetir,
  tekilKaydet,
} from './repo-content';
import { denetimKaydiEkle, ziyaretKaydet } from './repo-ops';

/**
 * İçerik veri katmanı.
 *
 * 2026-08-15'te tek JSON dosyasından MySQL'e geçildi. Bu modül artık YALNIZCA site
 * sayfalarının ihtiyaç duyduğu İÇERİĞİ döndürür. Ziyaret, müşteri, poliçe, teklif ve
 * denetim kayıtları buraya DAHİL DEĞİLDİR — onlar yıllar içinde büyüyecek veridir ve
 * `repo-crm.ts` / `repo-ops.ts` üzerinden tek tek sorgulanır. Eskiden tamamı belleğe
 * alınıyor, her yazmada tüm dosya baştan yazılıyordu.
 */

const DEFAULT_COMPANY_INFO: CompanyInfo = {
  name: 'Veli Sigorta Aracılık Hizmetleri Limited Şirketi',
  establishedYear: 2004,
  city: 'Antalya',
  district: 'Kepez',
  neighborhood: 'Özgürlük Mahallesi',
  address:
    'Pamuklu Dokuma Fabrikası Giriş Kapısı Karşısı, Özgürlük Mh. Tevfik Fikret Cad. Gökkaya Apt. No:2/A, Kepez / Antalya, 07025',
  phones: ['0242 334 12 12', '0242 345 08 08', '0542 369 07 07'],
  emails: ['info@velisigorta.com.tr', 'velisigorta@gmail.com'],
  whatsappNumber: '905423690707',
  taxOffice: 'Antalya Kurumlar',
  taxNumber: '924 035 5813',
  tradeRegistryNo: '40933',
  mersisNo: '0924035 5813 00011',
  workingHours: 'Güncel çalışma saatleri için lütfen arayın.',
  googleMapsEmbedUrl: '',
  googleReviewUrl: '',
  socialMedia: { facebook: '', instagram: '', linkedin: '' },
};

const DEFAULT_SETTINGS: SiteSettings = {
  siteTitle: 'Veli Sigorta | Antalya Kepez Kurumsal ve Aile Sigorta Acentesi',
  metaDescription:
    "2004'ten beri Antalya Kepez'de hizmet veren aile sigorta acentesi. Trafik, Kasko, Sağlık, DASK, Konut ve diğer sigorta ihtiyaçlarınız için bilgi alın.",
  // Paylaşım için hazırlanmış 1200×630 / ~34 KB görsel; ham Logo.png 2,2 MB ve
  // saydam zeminliydi, WhatsApp önizlemeyi hiç göstermiyordu.
  defaultOgImage: '/paylasim-gorseli.jpg',
  aiSearchVisible: true,
  robotsTxtCustom: 'User-agent: *\nAllow: /\nDisallow: /admin/\nDisallow: /api/admin/\n',
  enableSitemap: true,
  enableStructuredData: true,
  geoLat: 36.9085,
  geoLng: 30.6823,
  geoRegion: 'TR-07',
  geoPlacename: 'Antalya Kepez Dokuma',
};

/** Kimlik doğrulama tekil kaydı: ortak yönetici parolası ve korumalı süper yönetici. */
interface AuthKaydi {
  adminPasswordHash: string;
  superAdmin: SuperAdminAccount;
}

/** Site sayfalarının ve panelin okuduğu içerik anlık görüntüsü. */
export interface ContentSnapshot {
  companyInfo: CompanyInfo;
  categories: InsuranceCategory[];
  services: InsuranceService[];
  faqs: FAQItem[];
  blogs: BlogPost[];
  campaigns: CampaignItem[];
  partners: PartnerCompany[];
  settings: SiteSettings;
  adminPasswordHash: string;
  superAdmin: SuperAdminAccount;
}

/**
 * Kısa ömürlü bellek önbelleği.
 *
 * İçerik her sayfa üretiminde okunur ama nadiren değişir. TTL kısa tutulur ve panelden
 * yapılan her yazmadan sonra `icerikOnbelleginiTemizle()` ile açıkça geçersizleştirilir;
 * böylece kaydedilen değişiklik anında görünür.
 */
const ONBELLEK_SURESI_MS = 5_000;

interface OnbellekDurumu {
  veri: ContentSnapshot | null;
  zaman: number;
  bekleyen: Promise<ContentSnapshot> | null;
}

const globalDurum = globalThis as unknown as { __velisigortaIcerik?: OnbellekDurumu };

function durum(): OnbellekDurumu {
  if (!globalDurum.__velisigortaIcerik) {
    globalDurum.__velisigortaIcerik = { veri: null, zaman: 0, bekleyen: null };
  }
  return globalDurum.__velisigortaIcerik;
}

async function icerikYukle(): Promise<ContentSnapshot> {
  // Bağımsız sorgular paralel yürütülür; sıralı beklemek gereksiz gecikme yaratırdı.
  const [companyInfo, categories, services, faqs, blogs, campaigns, partners, settings, auth] =
    await Promise.all([
      firmaBilgisiGetir(DEFAULT_COMPANY_INFO),
      kategorileriGetir(),
      hizmetleriGetir(),
      ssslariGetir(),
      bloglariGetir(),
      kampanyalariGetir(),
      ortaklariGetir(),
      ayarlariGetir(DEFAULT_SETTINGS),
      tekilGetir<AuthKaydi>('auth', {
        adminPasswordHash: '',
        superAdmin: createSuperAdminAccount(),
      }),
    ]);

  return {
    companyInfo: { ...DEFAULT_COMPANY_INFO, ...companyInfo },
    categories,
    services,
    faqs,
    blogs,
    campaigns,
    partners,
    settings: { ...DEFAULT_SETTINGS, ...settings },
    adminPasswordHash: auth.adminPasswordHash || '',
    // Süper yönetici veritabanında bozulmuş olsa bile sabit hesap geri gelir:
    // bu hesap silinemez olmalıdır.
    superAdmin: auth.superAdmin || createSuperAdminAccount(),
  };
}

/** İçerik anlık görüntüsünü döndürür. Salt okunur kabul edilmelidir. */
export async function getDb(): Promise<ContentSnapshot> {
  const d = durum();
  const simdi = Date.now();

  if (d.veri && simdi - d.zaman < ONBELLEK_SURESI_MS) return d.veri;

  // Aynı anda gelen isteklerin hepsi ayrı ayrı sorgu atmasın; ilk yükleme paylaşılır.
  if (d.bekleyen) return d.bekleyen;

  d.bekleyen = icerikYukle()
    .then((veri) => {
      d.veri = veri;
      d.zaman = Date.now();
      return veri;
    })
    .finally(() => {
      d.bekleyen = null;
    });

  return d.bekleyen;
}

/** Panelden yazma yapıldıktan sonra çağrılır; sonraki okuma taze veri getirir. */
export function icerikOnbelleginiTemizle(): void {
  const d = durum();
  d.veri = null;
  d.zaman = 0;
}

/** Kimlik doğrulama tekil kaydını günceller (parola değişikliği). */
export async function authKaydiniGuncelle(patch: Partial<AuthKaydi>): Promise<void> {
  const mevcut = await tekilGetir<AuthKaydi>('auth', {
    adminPasswordHash: '',
    superAdmin: createSuperAdminAccount(),
  });
  await tekilKaydet('auth', { ...mevcut, ...patch });
  icerikOnbelleginiTemizle();
}

// --- Denetim ve ziyaret kayıtları -------------------------------------------

export async function addAuditLog(
  userEmail: string,
  action: string,
  details: string,
): Promise<void> {
  await denetimKaydiEkle(userEmail, action, details);
}

/**
 * Ziyaret kaydı. Artık tek satır ekler; eskiden tüm veritabanı dosyasını yeniden yazıyordu.
 * Ham `userAgent` saklanmaz — gereken bilgi burada tarayıcı ve cihaz türüne indirgenir.
 */
export async function recordVisit(
  pathStr: string,
  referrer: string,
  userAgent: string,
  ip: string,
  sessionId: string,
): Promise<void> {
  const ipHash = hashClientIp(ip || 'unknown');
  const sanitizedReferrer = stripReferrerQuery(referrer);

  let category: 'Direct' | 'Google' | 'Bing' | 'Yandex' | 'ChatGPT' | 'Perplexity' | 'Gemini' |
    'Copilot' | 'Facebook' | 'Instagram' | 'LinkedIn' | 'Other' = 'Direct';
  const refLower = sanitizedReferrer.toLowerCase();

  if (refLower.includes('google')) category = 'Google';
  else if (refLower.includes('bing')) category = 'Bing';
  else if (refLower.includes('yandex')) category = 'Yandex';
  else if (refLower.includes('chatgpt') || refLower.includes('openai')) category = 'ChatGPT';
  else if (refLower.includes('perplexity')) category = 'Perplexity';
  else if (refLower.includes('gemini')) category = 'Gemini';
  else if (refLower.includes('copilot')) category = 'Copilot';
  else if (refLower.includes('facebook')) category = 'Facebook';
  else if (refLower.includes('instagram')) category = 'Instagram';
  else if (refLower.includes('linkedin')) category = 'LinkedIn';
  else if (sanitizedReferrer) category = 'Other';

  const uaLower = userAgent.toLowerCase();
  let deviceType: 'Desktop' | 'Mobile' | 'Tablet' = 'Desktop';
  if (uaLower.includes('ipad') || uaLower.includes('tablet')) deviceType = 'Tablet';
  else if (uaLower.includes('mobile') || uaLower.includes('android') || uaLower.includes('iphone')) {
    deviceType = 'Mobile';
  }

  let browser = 'Unknown';
  if (uaLower.includes('edge')) browser = 'Edge';
  else if (uaLower.includes('chrome')) browser = 'Chrome';
  else if (uaLower.includes('firefox')) browser = 'Firefox';
  else if (uaLower.includes('safari')) browser = 'Safari';

  await ziyaretKaydet({
    path: pathStr,
    referrer: sanitizedReferrer || 'Doğrudan (Direct)',
    referrerCategory: category,
    browser,
    deviceType,
    sessionId,
    ipHash,
  });
}

/**
 * Yönlendiren adresteki sorgu dizesini atar.
 *
 * Arama sorgusu, oturum kimliği veya e-posta gibi kişisel veriler yönlendiren adreste
 * taşınabiliyor; yalnız köken ve yol saklanır.
 */
function stripReferrerQuery(referrer: string): string {
  const ham = (referrer || '').trim();
  if (!ham) return '';

  try {
    const u = new URL(ham);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return '';
    return `${u.origin}${u.pathname}`.replace(/\/$/, '');
  } catch {
    return '';
  }
}
