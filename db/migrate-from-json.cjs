#!/usr/bin/env node
/**
 * JSON veritabanından MySQL'e tek seferlik taşıma.
 *
 * Sunucuda çalıştırılır:
 *   set -a; . private/velisigorta.env; set +a
 *   node db/migrate-from-json.cjs
 *
 * Yeniden çalıştırılabilir (idempotent): her kayıt kendi birincil anahtarıyla
 * INSERT ... ON DUPLICATE KEY UPDATE ile yazılır. Ziyaret kayıtları artan tam sayı
 * anahtar kullandığı için yalnızca tablo boşsa aktarılır — aksi hâlde kopyalanırdı.
 *
 * Kaynak dosyaya DOKUNULMAZ; geri dönüş gerekirse JSON olduğu gibi durur.
 */

const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

const DB_PATH = process.env.DB_PATH;
if (!DB_PATH) {
  console.error('DB_PATH tanımlı değil.');
  process.exit(1);
}

function gerekli(ad) {
  if (!process.env[ad]) {
    console.error(`${ad} tanımlı değil.`);
    process.exit(1);
  }
  return process.env[ad];
}

const tarih = (iso) => {
  if (!iso) return new Date();
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? new Date() : d;
};
const gun = (v) => (/^\d{4}-\d{2}-\d{2}$/.test(String(v || '').trim()) ? String(v).trim() : null);
const metin = (v) => {
  const t = String(v ?? '').trim();
  return t === '' ? null : t;
};
const sayi = (v) => (v === undefined || v === null || v === '' ? null : Number(v));

async function main() {
  const ham = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));

  const baglanti = await mysql.createConnection({
    host: process.env.MYSQL_HOST || '127.0.0.1',
    port: Number(process.env.MYSQL_PORT || 3306),
    database: gerekli('MYSQL_DATABASE'),
    user: gerekli('MYSQL_USER'),
    password: gerekli('MYSQL_PASSWORD'),
    charset: 'utf8mb4_unicode_ci',
    timezone: 'Z',
    dateStrings: ['DATE'],
    multipleStatements: false,
  });

  const say = {};
  const yaz = async (etiket, sql, satirlar) => {
    let n = 0;
    for (const p of satirlar) {
      await baglanti.execute(sql, p);
      n++;
    }
    say[etiket] = n;
    console.log(`  ${etiket.padEnd(14)} ${n}`);
  };

  console.log('Taşıma başlıyor...\n');

  // --- Tekil kayıtlar --------------------------------------------------------
  const tekiller = [
    ['companyInfo', ham.companyInfo || {}],
    ['settings', ham.settings || {}],
    ['auth', { adminPasswordHash: ham.adminPasswordHash || '', superAdmin: ham.superAdmin || null }],
  ];
  await yaz(
    'singletons',
    `INSERT INTO singletons (ad, veri, updated_at) VALUES (?, ?, UTC_TIMESTAMP(3))
     ON DUPLICATE KEY UPDATE veri = VALUES(veri), updated_at = UTC_TIMESTAMP(3)`,
    tekiller.map(([ad, veri]) => [ad, JSON.stringify(veri)]),
  );

  // --- Kategoriler -----------------------------------------------------------
  await yaz(
    'categories',
    `INSERT INTO categories (id, name, slug, description, icon_name, sort_order, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, UTC_TIMESTAMP(3))
     ON DUPLICATE KEY UPDATE name=VALUES(name), slug=VALUES(slug), description=VALUES(description),
       icon_name=VALUES(icon_name), sort_order=VALUES(sort_order), updated_at=UTC_TIMESTAMP(3)`,
    (ham.categories || []).map((c) => [
      c.id, c.name, c.slug, c.description ?? '', c.iconName ?? 'Shield', c.order ?? 0,
    ]),
  );

  // --- Hizmetler -------------------------------------------------------------
  const servisJsonAlanlari = (s) => ({
    coverage: s.coverage ?? [], exclusions: s.exclusions ?? [], documents: s.documents ?? [],
    priceFactors: s.priceFactors ?? [], faq: s.faq ?? [], relatedServiceIds: s.relatedServiceIds ?? [],
    relatedBlogIds: s.relatedBlogIds ?? [], relatedBlogSlugs: s.relatedBlogSlugs ?? [],
    semanticTopics: s.semanticTopics ?? [], entityTags: s.entityTags ?? [],
    searchIntentTags: s.searchIntentTags ?? [], userQuestionTags: s.userQuestionTags ?? [],
    alternateNames: s.alternateNames ?? [], serviceAreaTags: s.serviceAreaTags ?? [],
    keyFacts: s.keyFacts ?? [], sourceReferences: s.sourceReferences ?? [],
    ogTitle: s.ogTitle, ogDescription: s.ogDescription, ogImage: s.ogImage,
  });

  await yaz(
    'services',
    `INSERT INTO services (id, title, slug, category_id, short_description, rich_content,
       featured_image, icon_name, legal_basis, who_needs_it, is_mandatory, is_published, sort_order,
       seo_title, meta_description, canonical_url, ai_summary, short_direct_answer,
       last_reviewed_date, veri, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, UTC_TIMESTAMP(3))
     ON DUPLICATE KEY UPDATE title=VALUES(title), slug=VALUES(slug), category_id=VALUES(category_id),
       short_description=VALUES(short_description), rich_content=VALUES(rich_content),
       featured_image=VALUES(featured_image), icon_name=VALUES(icon_name),
       legal_basis=VALUES(legal_basis), who_needs_it=VALUES(who_needs_it),
       is_mandatory=VALUES(is_mandatory), is_published=VALUES(is_published),
       sort_order=VALUES(sort_order), seo_title=VALUES(seo_title),
       meta_description=VALUES(meta_description), canonical_url=VALUES(canonical_url),
       ai_summary=VALUES(ai_summary), short_direct_answer=VALUES(short_direct_answer),
       last_reviewed_date=VALUES(last_reviewed_date), veri=VALUES(veri), updated_at=UTC_TIMESTAMP(3)`,
    (ham.services || []).map((s) => [
      s.id, s.title, s.slug, s.categoryId ?? '', s.shortDescription ?? '', s.richContent ?? '',
      s.featuredImage ?? '', s.iconName ?? '', s.legalBasis ?? '', s.whoNeedsIt ?? '',
      s.isMandatory ? 1 : 0, s.isPublished ? 1 : 0, s.order ?? 0, s.seoTitle ?? '',
      s.metaDescription ?? '', s.canonicalUrl ?? '', s.aiSummary ?? '', s.shortDirectAnswer ?? '',
      s.lastReviewedDate ?? '', JSON.stringify(servisJsonAlanlari(s)),
    ]),
  );

  // --- S.S.S. ----------------------------------------------------------------
  await yaz(
    'faqs',
    `INSERT INTO faqs (id, question, answer, service_id, category, sort_order, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, UTC_TIMESTAMP(3))
     ON DUPLICATE KEY UPDATE question=VALUES(question), answer=VALUES(answer),
       service_id=VALUES(service_id), category=VALUES(category), sort_order=VALUES(sort_order),
       updated_at=UTC_TIMESTAMP(3)`,
    (ham.faqs || []).map((f) => [
      f.id, f.question, f.answer ?? '', metin(f.serviceId), metin(f.category), f.order ?? 0,
    ]),
  );

  // --- Blog ------------------------------------------------------------------
  await yaz(
    'blogs',
    `INSERT INTO blogs (id, title, slug, excerpt, content, featured_image, category, author,
       published_at, is_published, read_time_minutes, veri, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, UTC_TIMESTAMP(3))
     ON DUPLICATE KEY UPDATE title=VALUES(title), slug=VALUES(slug), excerpt=VALUES(excerpt),
       content=VALUES(content), featured_image=VALUES(featured_image), category=VALUES(category),
       author=VALUES(author), published_at=VALUES(published_at), is_published=VALUES(is_published),
       read_time_minutes=VALUES(read_time_minutes), veri=VALUES(veri), updated_at=UTC_TIMESTAMP(3)`,
    (ham.blogs || []).map((b) => [
      b.id, b.title, b.slug, b.excerpt ?? '', b.content ?? '', b.featuredImage ?? '',
      b.category ?? '', b.author ?? '', b.publishedAt ?? '', b.isPublished ? 1 : 0,
      b.readTimeMinutes ?? 0,
      JSON.stringify({
        tags: b.tags ?? [], relatedServiceIds: b.relatedServiceIds ?? [],
        relatedServiceSlugs: b.relatedServiceSlugs ?? [], relatedBlogIds: b.relatedBlogIds ?? [],
        sources: b.sources ?? [],
      }),
    ]),
  );

  // --- Kampanyalar -----------------------------------------------------------
  await yaz(
    'campaigns',
    `INSERT INTO campaigns (id, title, badge, description, cta_text, cta_link, image_url,
       show_overlay_with_image, is_active, sort_order, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, UTC_TIMESTAMP(3))
     ON DUPLICATE KEY UPDATE title=VALUES(title), badge=VALUES(badge), description=VALUES(description),
       cta_text=VALUES(cta_text), cta_link=VALUES(cta_link), image_url=VALUES(image_url),
       show_overlay_with_image=VALUES(show_overlay_with_image), is_active=VALUES(is_active),
       sort_order=VALUES(sort_order), updated_at=UTC_TIMESTAMP(3)`,
    (ham.campaigns || []).map((c) => [
      c.id, metin(c.title), metin(c.badge), metin(c.description), metin(c.ctaText),
      metin(c.ctaLink), metin(c.imageUrl),
      c.showOverlayWithImage === undefined ? null : (c.showOverlayWithImage ? 1 : 0),
      c.isActive ? 1 : 0, c.order ?? 0,
    ]),
  );

  // --- Anlaşmalı şirketler ---------------------------------------------------
  await yaz(
    'partners',
    `INSERT INTO partners (id, name, logo_url, website_url, discount_note, is_active, sort_order, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, UTC_TIMESTAMP(3))
     ON DUPLICATE KEY UPDATE name=VALUES(name), logo_url=VALUES(logo_url),
       website_url=VALUES(website_url), discount_note=VALUES(discount_note),
       is_active=VALUES(is_active), sort_order=VALUES(sort_order), updated_at=UTC_TIMESTAMP(3)`,
    (ham.partners || []).map((p) => [
      p.id, p.name, p.logoUrl ?? '', metin(p.websiteUrl), metin(p.discountNote),
      p.isActive ? 1 : 0, p.order ?? 0,
    ]),
  );

  // --- Sistem kullanıcıları --------------------------------------------------
  await yaz(
    'system_users',
    `INSERT INTO system_users (id, name, email, role, password_hash, is_active, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE name=VALUES(name), role=VALUES(role),
       password_hash=VALUES(password_hash), is_active=VALUES(is_active)`,
    (ham.systemUsers || []).map((u) => [
      u.id, u.name, u.email, u.role === 'admin' ? 'admin' : 'user',
      u.passwordHash, u.isActive ? 1 : 0, tarih(u.createdAt),
    ]),
  );

  // --- Müşteriler ------------------------------------------------------------
  await yaz(
    'customers',
    `INSERT INTO customers (id, musteri_no, tip, tc_kimlik_no, yabanci_kimlik_no, ad, soyad,
       dogum_tarihi, cinsiyet, uyruk, meslek, vergi_no, vergi_dairesi, firma_unvani, marka_adi,
       mersis_no, nace_kodu, faaliyet_konusu, calisan_sayisi, mobil_telefon, sabit_telefon, email,
       il, ilce, acik_adres, uavt_kodu, musteri_temsilcisi, notlar, yetkililer, is_active,
       created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE musteri_no=VALUES(musteri_no), tip=VALUES(tip), updated_at=VALUES(updated_at)`,
    (ham.customers || []).map((m) => [
      m.id, m.musteriNo, m.tip, metin(m.tcKimlikNo), metin(m.yabanciKimlikNo), metin(m.ad),
      metin(m.soyad), gun(m.dogumTarihi), metin(m.cinsiyet), metin(m.uyruk), metin(m.meslek),
      metin(m.vergiNo), metin(m.vergiDairesi), metin(m.firmaUnvani), metin(m.markaAdi),
      metin(m.mersisNo), metin(m.naceKodu), metin(m.faaliyetKonusu), sayi(m.calisanSayisi),
      metin(m.mobilTelefon), metin(m.sabitTelefon), metin(m.email), metin(m.il), metin(m.ilce),
      metin(m.acikAdres), metin(m.uavtKodu), metin(m.musteriTemsilcisi), metin(m.notlar),
      JSON.stringify(m.yetkililer ?? []), m.isActive === false ? 0 : 1,
      tarih(m.createdAt), tarih(m.updatedAt),
    ]),
  );

  // --- Poliçeler -------------------------------------------------------------
  await yaz(
    'policies',
    `INSERT INTO policies (id, musteri_id, sigortali_adi, sigorta_sirketi, sigorta_turu, police_no,
       yenileme_no, zeyil_no, duzenleme_tarihi, baslangic_tarihi, bitis_tarihi, durum, yenileme_mi,
       onceki_police_no, brut_prim, net_prim, komisyon_orani, komisyon_tutari, para_birimi,
       odeme_sekli, taksit_sayisi, tahsilat_durumu, risk_tanimi, brans_alanlari, police_pdf_url,
       sorumlu_personel, notlar, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE police_no=VALUES(police_no), updated_at=VALUES(updated_at)`,
    (ham.policies || []).map((p) => [
      p.id, p.musteriId, metin(p.sigortaliAdi), p.sigortaSirketi, p.sigortaTuru, p.policeNo,
      metin(p.yenilemeNo), metin(p.zeyilNo), gun(p.duzenlemeTarihi), gun(p.baslangicTarihi),
      gun(p.bitisTarihi), p.durum || 'Aktif', p.yenilemeMi ? 1 : 0, metin(p.oncekiPoliceNo),
      sayi(p.brutPrim), sayi(p.netPrim), sayi(p.komisyonOrani), sayi(p.komisyonTutari),
      metin(p.paraBirimi), metin(p.odemeSekli), sayi(p.taksitSayisi), metin(p.tahsilatDurumu),
      metin(p.riskTanimi), p.bransAlanlari ? JSON.stringify(p.bransAlanlari) : null,
      metin(p.policePdfUrl), metin(p.sorumluPersonel), metin(p.notlar),
      tarih(p.createdAt), tarih(p.updatedAt),
    ]),
  );

  // --- Teklifler -------------------------------------------------------------
  await yaz(
    'quotes',
    `INSERT INTO quotes (id, ts, service_name, full_name, phone, email, city_district, notes, admin_notes, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE status=VALUES(status), admin_notes=VALUES(admin_notes)`,
    (ham.quotes || []).map((q) => [
      q.id, tarih(q.timestamp), q.serviceName ?? '', q.fullName ?? '', q.phone ?? '',
      metin(q.email), metin(q.cityDistrict), metin(q.notes), metin(q.adminNotes), q.status || 'Yeni',
    ]),
  );

  // --- Denetim kayıtları (artan anahtar: yalnız tablo boşsa aktar) ------------
  const [[logSayim]] = await baglanti.query('SELECT COUNT(*) AS adet FROM audit_logs');
  if (Number(logSayim.adet) === 0) {
    await yaz(
      'audit_logs',
      'INSERT INTO audit_logs (ts, user_email, action, details) VALUES (?, ?, ?, ?)',
      (ham.auditLogs || []).slice().reverse().map((l) => [
        tarih(l.timestamp), l.userEmail ?? '', l.action ?? '', l.details ?? '',
      ]),
    );
  } else {
    console.log(`  audit_logs     atlandi (tabloda ${logSayim.adet} kayit var)`);
  }

  // --- Ziyaretler (artan anahtar: yalnız tablo boşsa aktar) ------------------
  const [[ziyaretSayim]] = await baglanti.query('SELECT COUNT(*) AS adet FROM visits');
  if (Number(ziyaretSayim.adet) === 0) {
    const ziyaretler = (ham.visits || []).slice().reverse();
    // Toplu ekleme: 448 satır tek tek eklenirse gereksiz yere yavaş olur.
    const PARCA = 200;
    let n = 0;
    for (let i = 0; i < ziyaretler.length; i += PARCA) {
      const parca = ziyaretler.slice(i, i + PARCA);
      const yerTutucu = parca.map(() => '(?, ?, ?, ?, ?, ?, ?, ?)').join(', ');
      const degerler = parca.flatMap((v) => [
        tarih(v.timestamp), v.path ?? '/', v.referrer ?? '', v.referrerCategory ?? 'Direct',
        v.browser ?? 'Unknown', v.deviceType ?? 'Desktop', v.sessionId ?? '', v.ipHash ?? '',
      ]);
      await baglanti.query(
        `INSERT INTO visits (ts, path, referrer, referrer_category, browser, device_type, session_id, ip_hash)
         VALUES ${yerTutucu}`,
        degerler,
      );
      n += parca.length;
    }
    say.visits = n;
    console.log(`  visits         ${n}`);
  } else {
    console.log(`  visits         atlandi (tabloda ${ziyaretSayim.adet} kayit var)`);
  }

  // --- Doğrulama -------------------------------------------------------------
  console.log('\nDoğrulama (MySQL / JSON):');
  const kontroller = [
    ['categories', (ham.categories || []).length],
    ['services', (ham.services || []).length],
    ['faqs', (ham.faqs || []).length],
    ['blogs', (ham.blogs || []).length],
    ['campaigns', (ham.campaigns || []).length],
    ['partners', (ham.partners || []).length],
    ['system_users', (ham.systemUsers || []).length],
    ['customers', (ham.customers || []).length],
    ['policies', (ham.policies || []).length],
    ['quotes', (ham.quotes || []).length],
    ['visits', (ham.visits || []).length],
    ['audit_logs', (ham.auditLogs || []).length],
  ];

  let hataVar = false;
  for (const [tablo, beklenen] of kontroller) {
    const [[r]] = await baglanti.query(`SELECT COUNT(*) AS adet FROM \`${tablo}\``);
    const gercek = Number(r.adet);
    const durum = gercek === beklenen ? 'OK' : (gercek > beklenen ? 'FAZLA' : 'EKSIK');
    if (durum === 'EKSIK') hataVar = true;
    console.log(`  ${tablo.padEnd(14)} ${String(gercek).padStart(5)} / ${String(beklenen).padStart(5)}  ${durum}`);
  }

  // Süper yönetici korunmuş mu?
  const [[tekil]] = await baglanti.query("SELECT veri FROM singletons WHERE ad = 'auth'");
  const auth = typeof tekil.veri === 'string' ? JSON.parse(tekil.veri) : tekil.veri;
  console.log(`\n  superAdmin      ${auth?.superAdmin ? 'AKTARILDI' : 'KAYIP!'}`);
  console.log(`  adminPasswordHash ${auth?.adminPasswordHash ? 'AKTARILDI' : 'KAYIP!'}`);
  if (!auth?.superAdmin || !auth?.adminPasswordHash) hataVar = true;

  await baglanti.end();
  console.log(hataVar ? '\nTAŞIMA EKSİK — inceleyin.' : '\nTaşıma tamamlandı.');
  process.exit(hataVar ? 1 : 0);
}

main().catch((e) => {
  console.error('Taşıma hatası:', e.message);
  process.exit(1);
});
