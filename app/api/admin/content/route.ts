import { randomUUID } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { revalidatePath } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentAdmin, kendiParolasiniDegistir, logoutAdmin, verifyAdminPassword } from '@/lib/auth';
import { authKaydiniGuncelle, getDb, icerikOnbelleginiTemizle } from '@/lib/db';
import {
  canChangeAdminPassword,
  canManageRestrictedSettings,
  canManageUsers,
  isRestrictedEntity,
} from '@/lib/permissions';
import type { Customer, QuoteRequest, SiteSettings } from '@/lib/types';
import { adSoyadAyir, birYilSonrasi, ilIlceAyir, tamAdBicimlendir, telefonMaskele } from '@/lib/form-helpers';
import { bicimlendirAd, bicimlendirSoyad, musteriAdi } from '@/lib/police';
import {
  consumeRateLimit,
  getClientRateLimitKey,
  readLimitedJson,
  RequestBodyError,
} from '@/lib/rate-limit';
import {
  assertSameOrigin,
  ContentValidationError,
  parseBlog,
  parseCampaign,
  parseCategory,
  parseCompanyInfo,
  parseContentEnvelope,
  parseCustomer,
  parsePolicy,
  parseEntityLinks,
  parseFaq,
  parseIdData,
  parsePartner,
  parsePasswordData,
  parseQuote,
  parseQuoteInput,
  parseTeklifPolicelestir,
  parseQuoteStatus,
  parseService,
  parseSettings,
  requireAction,
} from '@/lib/admin-content-validation';
import {
  blogKaydet,
  hizmetKaydet,
  icerikSil,
  kampanyaKaydet,
  kampanyaSiralamasiniDuzelt,
  yeniKampanyaSirasi,
  kategoriKaydet,
  ortakKaydet,
  slugKullanimda,
  sssKaydet,
  tekilKaydet,
} from '@/lib/repo-content';
import {
  benzerMusteriAra,
  guncellemeZamani,
  musteriBasinaPoliceSayisi,
  musteriKaydet,
  musteriSil,
  musteriVarMi,
  musterileriGetir,
  policeKaydet,
  policeSil,
  policeleriGetir,
} from '@/lib/repo-crm';
import {
  denetimKaydiEkle,
  denetimKayitlariGetir,
  teklifDurumGuncelle,
  teklifKaydet,
  teklifSil,
  teklifleriGetir,
} from '@/lib/repo-ops';
import { calistir } from '@/lib/mysql';

const MAX_CONTENT_BODY_BYTES = 1024 * 1024;
const ADMIN_PASSWORD_RATE_LIMIT = { limit: 5, windowMs: 15 * 60 * 1000 };

function requireNoAction(action: string | undefined): void {
  if (action !== undefined) {
    throw new ContentValidationError('Bu işlem için action alanı gönderilmemelidir.');
  }
}

async function assertUniqueSlug(
  tablo: 'categories' | 'services' | 'blogs',
  id: string,
  slug: string,
  label: string,
): Promise<void> {
  if (await slugKullanimda(tablo, id, slug)) {
    throw new ContentValidationError(`${label} URL kısa adı zaten kullanılıyor.`, 409);
  }
}

/**
 * Ayarlardan gizli anahtar alanlarını çıkarır.
 *
 * Panelin düşük yetkili kullanıcıları bu ekranları yalnızca görüntüleyebiliyor; anahtar
 * değerlerini görmelerine gerek yok. Alanı boş dize yapmak yerine tamamen çıkarmak,
 * arayüzün yanlışlıkla boş değeri geri kaydetmesini de imkânsız kılar.
 */
function gizliAnahtarlariCikar(settings: SiteSettings): Partial<SiteSettings> {
  const {
    googleAnalyticsApiKey: _ga,
    searchConsoleApiKey: _sc,
    pagespeedApiKey: _ps,
    ...gorunebilir
  } = settings;
  return gorunebilir;
}

/**
 * Manuel teklif kaydından müşteri kartı açar.
 *
 * Teklif formu tek satırlık "ad soyad" ve "il / ilçe" topluyor; müşteri kartında bunlar
 * ayrı alanlar. Ad biçimi spesifikasyona göre normalleştirilir (ad ilk harfler büyük,
 * soyad tamamı büyük).
 *
 * Aynı kişi zaten kayıtlıysa yeni kayıt AÇILMAZ: portföyde kopya müşteri birikmesi,
 * poliçe bağlamayı ve arama sonuçlarını bozardı.
 */
async function tekliftenMusteriOlustur(
  quote: QuoteRequest,
  yoneticiEpostasi: string,
): Promise<{ durum: 'olusturuldu' | 'mevcut'; musteri: Customer }> {
  const mevcut = await benzerMusteriAra({ mobilTelefon: quote.phone });
  if (mevcut) {
    return { durum: 'mevcut', musteri: mevcut };
  }

  const { ad, soyad } = adSoyadAyir(quote.fullName);
  const { il, ilce } = ilIlceAyir(quote.cityDistrict);
  const simdi = new Date().toISOString();

  const kayit = await musteriKaydet({
    id: 'yeni',
    musteriNo: '', // sunucu üretir
    tip: 'bireysel',
    ad: ad ? bicimlendirAd(ad) : undefined,
    soyad: soyad ? bicimlendirSoyad(soyad) : undefined,
    mobilTelefon: telefonMaskele(quote.phone),
    email: quote.email || undefined,
    il: il || undefined,
    ilce: ilce || undefined,
    notlar: `Teklif talebinden oluşturuldu (${quote.serviceName}).${quote.notes ? ' Not: ' + quote.notes : ''}`,
    yetkililer: [],
    isActive: true,
    createdAt: simdi,
    updatedAt: simdi,
  });

  await denetimKaydiEkle(
    yoneticiEpostasi,
    'SAVE_CUSTOMER',
    `Teklif kaydından müşteri oluşturuldu: ${kayit.musteriNo}`,
  );

  return { durum: 'olusturuldu', musteri: kayit };
}

function assertReferencesExist(
  requestedIds: string[],
  existingIds: Set<string>,
  label: string,
): void {
  if (requestedIds.some((id) => !existingIds.has(id))) {
    throw new ContentValidationError(`${label} bilinmeyen bir kayıt içeriyor.`);
  }
}

/**
 * İki yönetici aynı kaydı açıp sırayla kaydettiğinde ikincinin yazması birincinin
 * değişikliklerini sessizce silerdi ("lost update"). İstemci, kaydı yüklediği andaki
 * `updatedAt` değerini geri gönderir; veritabanındaki değer daha yeniyse işlem reddedilir.
 *
 * Milisaniye toleransı: JSON'dan MySQL'e taşınırken zaman damgaları DATETIME(3)'e
 * yuvarlandığı için birebir eşitlik aranmaz.
 */
async function cakismaDenetle(
  tablo: 'customers' | 'policies',
  id: string,
  istemciZamani: string | undefined,
  etiket: string,
): Promise<void> {
  if (!id || id === 'yeni') return;

  const kayitliZaman = await guncellemeZamani(tablo, id);
  if (!kayitliZaman) return;

  if (!istemciZamani) {
    throw new ContentValidationError(
      `${etiket} kaydı için sürüm bilgisi gönderilmedi. Sayfayı yenileyip tekrar deneyin.`,
      409,
    );
  }

  const istemci = new Date(istemciZamani).getTime();
  if (Number.isNaN(istemci)) return;

  if (kayitliZaman.getTime() - istemci > 1000) {
    throw new ContentValidationError(
      `Bu ${etiket} kaydı siz düzenlerken başka biri tarafından değiştirildi. ` +
        'Değişikliklerinizin kaybolmaması için sayfayı yenileyip yeniden düzenleyin.',
      409,
    );
  }
}

/**
 * Panel verisini döndürür.
 *
 * `?fields=` ile hangi koleksiyonların isteneceği belirtilir. Müşteri, poliçe, teklif ve
 * log gibi hassas ya da büyük koleksiyonlar YALNIZCA açıkça istendiğinde döner; eskiden
 * SSS düzenleyen bir kullanıcı bile tüm müşteri kimlik numaralarını tarayıcısına indiriyordu.
 */
export async function GET(req: NextRequest) {
  const current = await getCurrentAdmin();
  if (!current) {
    return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
  }

  const istenen = (req.nextUrl.searchParams.get('fields') || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const ister = (ad: string) => istenen.length === 0 || istenen.includes(ad);

  const db = await getDb();
  const yanit: Record<string, unknown> = {};

  // İçerik: küçük ve panelin her yerinde gerekli; alan verilmezse varsayılan olarak döner.
  if (ister('companyInfo')) yanit.companyInfo = db.companyInfo;
  if (ister('categories')) yanit.categories = db.categories;
  if (ister('services')) yanit.services = db.services;
  if (ister('faqs')) yanit.faqs = db.faqs;
  if (ister('blogs')) yanit.blogs = db.blogs;
  // Ayarlar nesnesi ücretli Google API anahtarlarını içerir. Yazma yetkisi zaten
  // yönetici rolleriyle sınırlı ama OKUMA sınırsızdı: 'user' rolündeki bir hesap
  // ele geçirildiğinde anahtarlar da sızıyordu. Yönetici olmayan rollere anahtar
  // alanları hiç gönderilmez (maskelemek yerine çıkarmak, yanlışlıkla geri
  // yazılmalarını da imkânsız kılar).
  if (ister('settings')) {
    yanit.settings = canManageRestrictedSettings(current.role)
      ? db.settings
      : gizliAnahtarlariCikar(db.settings);
  }
  if (ister('partners')) yanit.partners = db.partners;
  if (ister('campaigns')) yanit.campaigns = db.campaigns;

  // Hassas / büyüyen koleksiyonlar: yalnız açıkça istenirse.
  if (istenen.includes('quotes')) yanit.quotes = await teklifleriGetir();
  if (istenen.includes('customers')) yanit.customers = await musterileriGetir();
  if (istenen.includes('policies')) yanit.policies = await policeleriGetir();
  if (istenen.includes('policeSayilari')) yanit.policeSayilari = await musteriBasinaPoliceSayisi();
  if (istenen.includes('auditLogs')) yanit.auditLogs = await denetimKayitlariGetir(150);

  return NextResponse.json(yanit);
}

async function handleContentPost(req: NextRequest): Promise<NextResponse> {
  try {
    assertSameOrigin(req);
    const current = await getCurrentAdmin();
    if (!current) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    const { entity, action, data } = parseContentEnvelope(
      await readLimitedJson(req, MAX_CONTENT_BODY_BYTES),
    );

    if (isRestrictedEntity(entity) && !canManageRestrictedSettings(current.role)) {
      return NextResponse.json(
        { error: 'Bu bölümde değişiklik yapma yetkiniz yok. Yalnızca görüntüleyebilirsiniz.' },
        { status: 403 },
      );
    }

    /**
     * Oturum açmış kişinin KENDİ parolası.
     *
     * `password` ucundan ayrı: o uç env'deki ORTAK yönetici parolasını değiştirir
     * ve `canChangeAdminPassword` ile yalnız yönetici rollerine açıktır. Bu uç ise
     * her role açık olmalı — "user" rolündeki personel de kendi parolasını
     * değiştirebilmeli. Hangi deponun güncelleneceğine `kendiParolasiniDegistir`
     * hesap türüne bakarak karar verir.
     */
    if (entity === 'own_password') {
      requireNoAction(action);

      const ownRateLimit = consumeRateLimit(
        getClientRateLimitKey('admin-own-password', req),
        ADMIN_PASSWORD_RATE_LIMIT,
      );
      if (!ownRateLimit.allowed) {
        return NextResponse.json(
          { error: 'Çok fazla şifre denemesi yapıldı. Lütfen bir süre sonra tekrar deneyin.' },
          { status: 429, headers: { 'Retry-After': String(ownRateLimit.retryAfterSeconds) } },
        );
      }

      const kendi = parsePasswordData(data);
      const sonuc = await kendiParolasiniDegistir(current, kendi.currentPassword, kendi.newPassword);

      if (sonuc.durum === 'mevcut-yanlis') {
        return NextResponse.json({ error: 'Mevcut şifre doğrulanamadı.' }, { status: 401 });
      }
      if (sonuc.durum === 'ayni-parola') {
        throw new ContentValidationError('Yeni şifre mevcut şifreden farklı olmalıdır.');
      }
      if (sonuc.durum === 'desteklenmiyor') {
        return NextResponse.json({ error: sonuc.mesaj }, { status: 409 });
      }

      await denetimKaydiEkle(current.email, 'CHANGE_OWN_PASSWORD', 'Kullanıcı kendi şifresini değiştirdi.');
      // Oturum kapatılır: yapılandırılmış yönetici oturumları parola özetinden
      // türetilen bir sürüm taşıyor, parola değişince eski jeton zaten geçersiz.
      await logoutAdmin();
      return NextResponse.json({
        success: true,
        requiresLogin: true,
        paylasilanParola: sonuc.paylasilanParola,
      });
    }

    if (entity === 'password') {
      requireNoAction(action);

      if (!canChangeAdminPassword(current.role)) {
        return NextResponse.json(
          { error: 'Yönetici şifresini değiştirme yetkiniz yok.' },
          { status: 403 },
        );
      }

      const passwordRateLimit = consumeRateLimit(
        getClientRateLimitKey('admin-password', req),
        ADMIN_PASSWORD_RATE_LIMIT,
      );
      if (!passwordRateLimit.allowed) {
        return NextResponse.json(
          { error: 'Çok fazla şifre denemesi yapıldı. Lütfen bir süre sonra tekrar deneyin.' },
          { status: 429, headers: { 'Retry-After': String(passwordRateLimit.retryAfterSeconds) } },
        );
      }

      const passwords = parsePasswordData(data);
      if (!(await verifyAdminPassword(passwords.currentPassword))) {
        return NextResponse.json({ error: 'Mevcut şifre doğrulanamadı.' }, { status: 401 });
      }
      if (await verifyAdminPassword(passwords.newPassword)) {
        throw new ContentValidationError('Yeni şifre mevcut şifreden farklı olmalıdır.');
      }

      const passwordHash = await bcrypt.hash(passwords.newPassword, 12);
      await authKaydiniGuncelle({ adminPasswordHash: passwordHash });
      await denetimKaydiEkle(current.email, 'CHANGE_PASSWORD', 'Yönetici şifresi değiştirildi.');
      await logoutAdmin();
      return NextResponse.json({ success: true, requiresLogin: true });
    }

    if (entity === 'companyInfo') {
      requireNoAction(action);
      const companyInfo = parseCompanyInfo(data);
      await tekilKaydet('companyInfo', companyInfo);
      icerikOnbelleginiTemizle();
      await denetimKaydiEkle(current.email, 'UPDATE_COMPANY_INFO', 'Firma ve iletişim bilgileri güncellendi.');
      return NextResponse.json({ success: true, companyInfo });
    }

    if (entity === 'settings') {
      requireNoAction(action);
      const settings = parseSettings(data);
      await tekilKaydet('settings', settings);
      icerikOnbelleginiTemizle();
      await denetimKaydiEkle(current.email, 'UPDATE_SETTINGS', 'Site, SEO ve AI ayarları güncellendi.');
      return NextResponse.json({ success: true, settings });
    }

    if (entity === 'categories') {
      if (action === 'save') {
        const submitted = parseCategory(data);
        const db = await getDb();
        const mevcut = db.categories.find((c) => c.id === submitted.id);
        const id = mevcut ? mevcut.id : `cat-${randomUUID()}`;
        await assertUniqueSlug('categories', id, submitted.slug, 'Kategori');
        await kategoriKaydet({ ...submitted, id });
        icerikOnbelleginiTemizle();
        await denetimKaydiEkle(current.email, 'SAVE_CATEGORY', `Sigorta kategorisi kaydedildi: ${submitted.name}`);
        return NextResponse.json({ success: true, categories: (await getDb()).categories });
      }

      requireAction(action, 'delete');
      const { id } = parseIdData(data);
      const db = await getDb();
      if (db.services.some((s) => s.categoryId === id)) {
        throw new ContentValidationError('Bu kategoriye bağlı hizmetler varken kategori silinemez.', 409);
      }
      if ((await icerikSil('categories', id)) === 0) {
        throw new ContentValidationError('Kategori bulunamadı.', 404);
      }
      icerikOnbelleginiTemizle();
      await denetimKaydiEkle(current.email, 'DELETE_CATEGORY', `Sigorta kategorisi silindi ID: ${id}`);
      return NextResponse.json({ success: true, categories: (await getDb()).categories });
    }

    if (entity === 'services') {
      if (action === 'save') {
        const submitted = parseService(data);
        const db = await getDb();
        const mevcut = db.services.find((s) => s.id === submitted.id);
        const id = mevcut ? mevcut.id : `srv-${randomUUID()}`;
        await assertUniqueSlug('services', id, submitted.slug, 'Hizmet');
        if (!db.categories.some((c) => c.id === submitted.categoryId)) {
          throw new ContentValidationError('Hizmet için geçerli bir kategori seçilmelidir.');
        }
        await hizmetKaydet({ ...submitted, id });
        icerikOnbelleginiTemizle();
        await denetimKaydiEkle(current.email, 'SAVE_SERVICE', `Sigorta hizmeti kaydedildi: ${submitted.title}`);
        return NextResponse.json({ success: true, services: (await getDb()).services });
      }

      requireAction(action, 'delete');
      const { id } = parseIdData(data);
      const db = await getDb();
      const silinen = db.services.find((s) => s.id === id);
      if (!silinen) throw new ContentValidationError('Hizmet bulunamadı.', 404);

      await icerikSil('services', id);
      // Silinen hizmete yapılan atıflar diğer kayıtlardan temizlenir; aksi hâlde
      // sitede var olmayan bir hizmete bağlantı kalırdı.
      for (const s of db.services.filter((x) => x.id !== id && x.relatedServiceIds?.includes(id))) {
        await hizmetKaydet({ ...s, relatedServiceIds: s.relatedServiceIds.filter((r) => r !== id) });
      }
      for (const b of db.blogs.filter(
        (x) => x.relatedServiceIds?.includes(id) || x.relatedServiceSlugs?.includes(silinen.slug),
      )) {
        await blogKaydet({
          ...b,
          relatedServiceIds: (b.relatedServiceIds || []).filter((r) => r !== id),
          relatedServiceSlugs: (b.relatedServiceSlugs || []).filter((r) => r !== silinen.slug),
        });
      }
      icerikOnbelleginiTemizle();
      await denetimKaydiEkle(current.email, 'DELETE_SERVICE', `Sigorta hizmeti silindi ID: ${id}`);
      return NextResponse.json({ success: true, services: (await getDb()).services });
    }

    if (entity === 'partners') {
      if (action === 'save') {
        const submitted = parsePartner(data);
        const db = await getDb();
        const mevcut = db.partners.find((p) => p.id === submitted.id);
        await ortakKaydet({ ...submitted, id: mevcut ? submitted.id : `part-${randomUUID()}` });
        icerikOnbelleginiTemizle();
        await denetimKaydiEkle(current.email, 'SAVE_PARTNER', `Anlaşmalı şirket kaydedildi: ${submitted.name}`);
        return NextResponse.json({ success: true, partners: (await getDb()).partners });
      }

      requireAction(action, 'delete');
      const { id } = parseIdData(data);
      if ((await icerikSil('partners', id)) === 0) {
        throw new ContentValidationError('Anlaşmalı şirket bulunamadı.', 404);
      }
      icerikOnbelleginiTemizle();
      await denetimKaydiEkle(current.email, 'DELETE_PARTNER', `Anlaşmalı şirket silindi ID: ${id}`);
      return NextResponse.json({ success: true, partners: (await getDb()).partners });
    }

    if (entity === 'campaigns') {
      if (action === 'save') {
        const submitted = parseCampaign(data);
        const db = await getDb();
        const mevcut = db.campaigns.find((c) => c.id === submitted.id);

        // YENİ kayda sırayı SUNUCU verir. İstemci `campaigns.length + 1`
        // hesaplıyordu; araya bir kayıt silindiğinde uzunluk mevcut en büyük
        // numaradan küçük kalıp çakışma üretiyordu (canlıda 4,4 ve 6,6).
        await kampanyaKaydet({
          ...submitted,
          id: mevcut ? submitted.id : `camp-${randomUUID()}`,
          order: mevcut ? submitted.order : await yeniKampanyaSirasi(),
        });
        // Yazma sonrası 1..N'e normalize: yönetici mevcut bir kayda başka bir
        // kaydın numarasını verse bile çakışma kalmaz.
        await kampanyaSiralamasiniDuzelt();
        icerikOnbelleginiTemizle();
        await denetimKaydiEkle(current.email, 'SAVE_CAMPAIGN', `Kampanya kaydedildi: ${submitted.title ?? '(görsel)'}`);
        return NextResponse.json({ success: true, campaigns: (await getDb()).campaigns });
      }

      requireAction(action, 'delete');
      const { id } = parseIdData(data);
      if ((await icerikSil('campaigns', id)) === 0) {
        throw new ContentValidationError('Kampanya bulunamadı.', 404);
      }
      // Silme sonrası da normalize edilir; aksi hâlde listede boşluk kalırdı.
      await kampanyaSiralamasiniDuzelt();
      icerikOnbelleginiTemizle();
      await denetimKaydiEkle(current.email, 'DELETE_CAMPAIGN', `Kampanya silindi ID: ${id}`);
      return NextResponse.json({ success: true, campaigns: (await getDb()).campaigns });
    }

    if (entity === 'faqs') {
      if (action === 'save') {
        const submitted = parseFaq(data);
        const db = await getDb();
        const mevcut = db.faqs.find((f) => f.id === submitted.id);
        await sssKaydet({ ...submitted, id: mevcut ? submitted.id : `faq-${randomUUID()}` });
        icerikOnbelleginiTemizle();
        await denetimKaydiEkle(current.email, 'SAVE_FAQ', `SSS sorusu kaydedildi: ${submitted.question}`);
        return NextResponse.json({ success: true, faqs: (await getDb()).faqs });
      }

      requireAction(action, 'delete');
      const { id } = parseIdData(data);
      if ((await icerikSil('faqs', id)) === 0) {
        throw new ContentValidationError('SSS kaydı bulunamadı.', 404);
      }
      icerikOnbelleginiTemizle();
      await denetimKaydiEkle(current.email, 'DELETE_FAQ', `SSS sorusu silindi ID: ${id}`);
      return NextResponse.json({ success: true, faqs: (await getDb()).faqs });
    }

    if (entity === 'blogs') {
      if (action === 'save') {
        const submitted = parseBlog(data);
        const db = await getDb();
        const mevcut = db.blogs.find((b) => b.id === submitted.id);
        const id = mevcut ? mevcut.id : `blog-${randomUUID()}`;
        await assertUniqueSlug('blogs', id, submitted.slug, 'Blog yazısı');
        await blogKaydet({ ...submitted, id });
        icerikOnbelleginiTemizle();
        await denetimKaydiEkle(current.email, 'SAVE_BLOG', `Blog yazısı kaydedildi: ${submitted.title}`);
        return NextResponse.json({ success: true, blogs: (await getDb()).blogs });
      }

      requireAction(action, 'delete');
      const { id } = parseIdData(data);
      const db = await getDb();
      const silinen = db.blogs.find((b) => b.id === id);
      if (!silinen) throw new ContentValidationError('Blog yazısı bulunamadı.', 404);

      await icerikSil('blogs', id);
      for (const s of db.services.filter(
        (x) => x.relatedBlogIds?.includes(id) || x.relatedBlogSlugs?.includes(silinen.slug),
      )) {
        await hizmetKaydet({
          ...s,
          relatedBlogIds: (s.relatedBlogIds || []).filter((r) => r !== id),
          relatedBlogSlugs: (s.relatedBlogSlugs || []).filter((r) => r !== silinen.slug),
        });
      }
      for (const b of db.blogs.filter((x) => x.id !== id && x.relatedBlogIds?.includes(id))) {
        await blogKaydet({ ...b, relatedBlogIds: (b.relatedBlogIds || []).filter((r) => r !== id) });
      }
      icerikOnbelleginiTemizle();
      await denetimKaydiEkle(current.email, 'DELETE_BLOG', `Blog yazısı silindi ID: ${id}`);
      return NextResponse.json({ success: true, blogs: (await getDb()).blogs });
    }

    if (entity === 'quotes') {
      if (action === 'save') {
        const { musteriOlustur, ...teklifAlanlari } = parseQuoteInput(data);
        const quote = parseQuote({
          ...teklifAlanlari,
          id: teklifAlanlari.id || `q-${randomUUID()}`,
          // Ad yazımı müşteri kartındaki kuralla aynı olmalı (ad baş harfler büyük,
          // soyad tamamı büyük). İstemcide de uygulanıyor; burada bir kez daha
          // uygulanır çünkü teklif kaydı müşteri kartının kaynağı ve iki ekranda
          // aynı kişi farklı yazımla görünmemeli.
          fullName: tamAdBicimlendir(teklifAlanlari.fullName),
        });
        await teklifKaydet(quote);
        await denetimKaydiEkle(current.email, 'SAVE_QUOTE', 'Teklif kaydı oluşturuldu veya güncellendi.');

        // Manuel teklif girilirken aynı bilgilerle müşteri kartı da açılabilir.
        // Aynı kişi zaten kayıtlıysa (kimlik/telefon eşleşmesi) YENİ kayıt açılmaz,
        // mevcut kayda bağlanır — böylece portföyde kopya müşteri birikmez.
        let musteriSonucu: { durum: 'olusturuldu' | 'mevcut'; musteri: Customer } | null = null;
        if (musteriOlustur) {
          musteriSonucu = await tekliftenMusteriOlustur(quote, current.email);
        }

        return NextResponse.json({
          success: true,
          quotes: await teklifleriGetir(),
          musteri: musteriSonucu
            ? { durum: musteriSonucu.durum, musteriNo: musteriSonucu.musteri.musteriNo, ad: musteriAdi(musteriSonucu.musteri) }
            : null,
        });
      }

      if (action === 'policelestir') {
        const istek = parseTeklifPolicelestir(data);
        const teklif = (await teklifleriGetir()).find((q) => q.id === istek.quoteId);
        if (!teklif) throw new ContentValidationError('Teklif kaydı bulunamadı.', 404);

        // Poliçe bir müşteriye bağlanmak zorunda. Teklif müşteri kartından
        // verildiyse bağ hazır; site formundan gelen eski tekliflerde telefondan
        // eşleştirilir. İkisi de tutmazsa kullanıcıya önce müşteri kartı açması
        // söylenir — sahipsiz poliçe üretmek veri modelini bozardı.
        const musteri = teklif.musteriId
          ? (await musterileriGetir()).find((c) => c.id === teklif.musteriId)
          : await benzerMusteriAra({ mobilTelefon: teklif.phone });

        if (!musteri) {
          throw new ContentValidationError(
            'Teklif bir müşteriye bağlı değil. Önce müşteri kartı oluşturun.',
            400,
          );
        }

        const simdi = new Date().toISOString();
        const police = parsePolicy({
          id: 'yeni',
          musteriId: musteri.id,
          sigortaSirketi: istek.sigortaSirketi,
          // Teklifteki branş poliçeye taşınır; personel aynı bilgiyi ikinci kez yazmasın.
          sigortaTuru: teklif.serviceName,
          policeNo: istek.policeNo || '',
          baslangicTarihi: istek.baslangicTarihi,
          bitisTarihi: birYilSonrasi(istek.baslangicTarihi),
          durum: 'Aktif',
          yenilemeMi: false,
          paraBirimi: 'TL',
          notlar: teklif.notes || '',
          createdAt: simdi,
          updatedAt: simdi,
        });

        const kayit = await policeKaydet(police);
        await teklifDurumGuncelle(istek.quoteId, 'Poliçeleştirildi');
        await denetimKaydiEkle(
          current.email,
          'QUOTE_TO_POLICY',
          `Teklif poliçeye çevrildi: ${istek.quoteId} → ${kayit.id} (${musteri.musteriNo})`,
        );

        return NextResponse.json({
          success: true,
          quotes: await teklifleriGetir(),
          policies: await policeleriGetir(),
          police: { id: kayit.id, policeNo: kayit.policeNo, bitisTarihi: kayit.bitisTarihi },
        });
      }

      requireAction(action, 'delete');
      const { id } = parseIdData(data);
      if (!(await teklifSil(id))) throw new ContentValidationError('Teklif kaydı bulunamadı.', 404);
      await denetimKaydiEkle(current.email, 'DELETE_QUOTE', `Teklif kaydı silindi ID: ${id}`);
      return NextResponse.json({ success: true, quotes: await teklifleriGetir() });
    }

    if (entity === 'customers') {
      if (action === 'save') {
        const submitted = parseCustomer(data);
        await cakismaDenetle('customers', submitted.id, submitted.updatedAt, 'müşteri');
        const kayit = await musteriKaydet(submitted);
        await denetimKaydiEkle(
          current.email,
          'SAVE_CUSTOMER',
          `Müşteri kaydedildi: ${kayit.musteriNo} (${kayit.tip})`,
        );
        return NextResponse.json({ success: true, customers: await musterileriGetir() });
      }

      requireAction(action, 'delete');
      const { id } = parseIdData(data);
      const sonuc = await musteriSil(id);
      if (sonuc.bagliPolice > 0) {
        throw new ContentValidationError(
          `Bu müşteriye bağlı ${sonuc.bagliPolice} poliçe var. Önce poliçeleri silin veya başka müşteriye taşıyın.`,
          409,
        );
      }
      if (!sonuc.silindi) throw new ContentValidationError('Müşteri bulunamadı.', 404);
      await denetimKaydiEkle(current.email, 'DELETE_CUSTOMER', `Müşteri silindi ID: ${id}`);
      return NextResponse.json({ success: true, customers: await musterileriGetir() });
    }

    if (entity === 'policies') {
      if (action === 'save') {
        const submitted = parsePolicy(data);
        if (!(await musteriVarMi(submitted.musteriId))) {
          throw new ContentValidationError('Poliçe için geçerli bir müşteri seçilmelidir.');
        }
        await cakismaDenetle('policies', submitted.id, submitted.updatedAt, 'poliçe');
        const kayit = await policeKaydet(submitted);
        await denetimKaydiEkle(
          current.email,
          'SAVE_POLICY',
          `Poliçe kaydedildi: ${kayit.policeNo} (${kayit.sigortaTuru})`,
        );
        return NextResponse.json({ success: true, policies: await policeleriGetir() });
      }

      requireAction(action, 'delete');
      const { id } = parseIdData(data);
      if (!(await policeSil(id))) throw new ContentValidationError('Poliçe bulunamadı.', 404);
      await denetimKaydiEkle(current.email, 'DELETE_POLICY', `Poliçe silindi ID: ${id}`);
      return NextResponse.json({ success: true, policies: await policeleriGetir() });
    }

    if (entity === 'quote_status') {
      requireNoAction(action);
      const submitted = parseQuoteStatus(data);
      const guncellendi = await teklifDurumGuncelle(
        submitted.quoteId,
        submitted.status,
        submitted.adminNotes,
      );
      if (!guncellendi) throw new ContentValidationError('Teklif kaydı bulunamadı.', 404);
      await denetimKaydiEkle(
        current.email,
        'UPDATE_QUOTE_STATUS',
        `Teklif durumu güncellendi: ${submitted.status}`,
      );
      return NextResponse.json({ success: true, quotes: await teklifleriGetir() });
    }

    if (entity === 'entityLinks') {
      requireNoAction(action);
      const links = parseEntityLinks(data);
      const db = await getDb();
      const serviceIds = new Set(db.services.map((s) => s.id));
      const blogIds = new Set(db.blogs.map((b) => b.id));
      const serviceSlugById = new Map(db.services.map((s) => [s.id, s.slug]));
      const blogSlugById = new Map(db.blogs.map((b) => [b.id, b.slug]));

      for (const update of links.services) {
        const service = db.services.find((s) => s.id === update.id);
        if (!service) throw new ContentValidationError('Bağlantı kurulacak hizmet bulunamadı.', 404);
        assertReferencesExist(update.relatedServiceIds, serviceIds, 'Hizmet bağlantısı');
        assertReferencesExist(update.relatedBlogIds, blogIds, 'Blog bağlantısı');
        await hizmetKaydet({
          ...service,
          relatedServiceIds: update.relatedServiceIds,
          relatedBlogIds: update.relatedBlogIds,
          relatedBlogSlugs: update.relatedBlogIds.map((id) => blogSlugById.get(id) as string),
        });
      }

      for (const update of links.blogs) {
        const blog = db.blogs.find((b) => b.id === update.id);
        if (!blog) throw new ContentValidationError('Bağlantı kurulacak blog yazısı bulunamadı.', 404);
        assertReferencesExist(update.relatedServiceIds, serviceIds, 'Hizmet bağlantısı');
        assertReferencesExist(update.relatedBlogIds, blogIds, 'Blog bağlantısı');
        await blogKaydet({
          ...blog,
          relatedServiceIds: update.relatedServiceIds,
          relatedServiceSlugs: update.relatedServiceIds.map((id) => serviceSlugById.get(id) as string),
          relatedBlogIds: update.relatedBlogIds,
        });
      }

      icerikOnbelleginiTemizle();
      await denetimKaydiEkle(
        current.email,
        'UPDATE_ENTITY_LINKS',
        'SEO ve içerik varlık ilişki haritası güncellendi.',
      );
      const yeni = await getDb();
      return NextResponse.json({ success: true, services: yeni.services, blogs: yeni.blogs });
    }

    if (entity === 'auditLogs') {
      requireAction(action, 'clear');

      // Log temizleme, yetki sisteminin hesap verebilirliğini tümüyle ortadan kaldırır:
      // kimin neyi sildiği bir daha anlaşılamaz. Bu yüzden en az kullanıcı yönetimi kadar
      // korunmalıdır. Eskiden yalnızca oturum varlığı denetleniyordu; 'user' rolündeki bir
      // hesap doğrudan istek atarak tüm izleri silebiliyordu.
      if (!canManageUsers(current.role)) {
        return NextResponse.json(
          { error: 'Sistem log geçmişini temizleme yetkiniz yok.' },
          { status: 403 },
        );
      }

      if (data !== undefined) {
        throw new ContentValidationError('Log temizleme işleminde data alanı gönderilmemelidir.');
      }
      await calistir('DELETE FROM audit_logs');
      await denetimKaydiEkle(
        current.email,
        'CLEAR_LOGS',
        'Sistem log geçmişi yönetici tarafından temizlendi.',
      );
      return NextResponse.json({ success: true, auditLogs: await denetimKayitlariGetir(150) });
    }

    throw new ContentValidationError('Geçersiz varlık veya işlem.');
  } catch (error) {
    if (error instanceof RequestBodyError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (error instanceof ContentValidationError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error('Admin content mutation failed.', error);
    return NextResponse.json({ error: 'İşlem sırasında bir hata oluştu.' }, { status: 500 });
  }
}

/**
 * Panelden yapılan her başarılı değişiklikten sonra sitenin tamamını yeniden
 * üretilecek biçimde işaretler; ISR süresi beklenmeden değişiklik canlıda görünür.
 */
function revalidateSite(): void {
  revalidatePath('/', 'layout');
}

export async function POST(req: NextRequest) {
  const response = await handleContentPost(req);
  if (response.status < 400) {
    revalidateSite();
  }
  return response;
}
