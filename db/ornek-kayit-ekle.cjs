#!/usr/bin/env node
/**
 * Tek seferlik: örnek müşteri ve ona bağlı iki poliçe takip kaydı ekler.
 *
 * Panelden girilemediği (oturum açılamadığı) için doğrudan veritabanına yazar ama
 * uygulamanın kurallarına birebir uyar: müşteri numarası en büyük numaradan türetilir,
 * ad/soyad biçim kuralına göre normalleştirilir, araç bilgileri poliçenin
 * `brans_alanlari` sözlüğünde saklanır (spesifikasyondaki dinamik alan motoru).
 *
 * Tekrar çalıştırılabilir: aynı telefon numarası kayıtlıysa yeni müşteri açmaz.
 */

const mysql = require('mysql2/promise');
const { randomUUID } = require('node:crypto');

function gerekli(ad) {
  if (!process.env[ad]) {
    console.error(`${ad} tanımlı değil.`);
    process.exit(1);
  }
  return process.env[ad];
}

const MUSTERI = {
  ad: 'Mehmet Mesut',
  soyad: 'YILMAZ',
  email: 'mehmetmesut@gmail.com',
  telefon: '0(530) 730 20 02',
  telefonRakam: '5307302002',
  il: 'Antalya',
  ilce: 'Kepez',
};

/** Araç bilgileri poliçeye bağlanır — müşteriye değil (spesifikasyon kuralı 2). */
const ARAC = {
  Plaka: '07 MMY 68',
  'Tescil Belge Seri No': 'ID265026',
  'Ticari Adı': 'BYD SEAL U DM-İ',
  Marka: 'BYD',
  'Model Yılı': '2025',
  'Tescil Tarihi': '21.11.2025',
  'Sahiplik Belge Tarihi': '20.11.2025',
};

const RISK_TANIMI = '07 MMY 68 · BYD SEAL U DM-İ (2025)';

/**
 * Poliçeler HÂLEN BAŞKA BİR ARACIDA. SBM kaydına göre ikisi de AXA Sigorta'da,
 * SİGORTALADIM brokerliği üzerinden düzenlenmiş ve 20.11.2026'da bitiyor.
 * Kayıt, yenileme döneminde zamanında dönülebilmesi için takibe alınıyor.
 */
const NOT =
  'Poliçe hâlen SİGORTALADIM Sigorta ve Reasürans Brokerliği A.Ş. (acente kodu 252164620) ' +
  'üzerinden AXA Sigorta’da. Yenileme döneminde devralınacak; web sitesi çalışması ' +
  'karşılığı ücretsiz düzenlenecek.';

// SBM "Araç Poliçe Bilgileri" ekranından alındı.
const BASLANGIC = '2025-11-20';
const BITIS = '2026-11-20';
const SIGORTA_SIRKETI = 'AXA Sigorta';

const POLICELER = [
  { turu: 'Zorunlu Trafik Sigortası', no: '622288108', tramer: '792305187' },
  { turu: 'Kasko Sigortası', no: '622207437', tramer: '792301895' },
];

async function main() {
  const baglanti = await mysql.createConnection({
    host: process.env.MYSQL_HOST || '127.0.0.1',
    port: Number(process.env.MYSQL_PORT || 3306),
    database: gerekli('MYSQL_DATABASE'),
    user: gerekli('MYSQL_USER'),
    password: gerekli('MYSQL_PASSWORD'),
    charset: 'utf8mb4_unicode_ci',
    timezone: 'Z',
    dateStrings: ['DATE'],
  });

  // --- Müşteri --------------------------------------------------------------
  const [mevcutlar] = await baglanti.execute(
    `SELECT id, musteri_no FROM customers
     WHERE RIGHT(REGEXP_REPLACE(COALESCE(mobil_telefon, ''), '[^0-9]', ''), 10) = ?
     LIMIT 1`,
    [MUSTERI.telefonRakam],
  );

  let musteriId;
  let musteriNo;

  if (mevcutlar.length > 0) {
    musteriId = mevcutlar[0].id;
    musteriNo = mevcutlar[0].musteri_no;
    console.log(`Müşteri zaten kayıtlı: ${musteriNo} — yeni kayıt açılmadı.`);
  } else {
    const [enBuyukSatir] = await baglanti.execute(
      `SELECT MAX(CAST(SUBSTRING(musteri_no, 3) AS UNSIGNED)) AS enBuyuk
       FROM customers WHERE musteri_no REGEXP '^M-[0-9]+$'`,
    );
    const enBuyuk = Number(enBuyukSatir[0]?.enBuyuk ?? 0) || 0;
    musteriNo = `M-${String(enBuyuk + 1).padStart(5, '0')}`;
    musteriId = `cust-${randomUUID()}`;

    await baglanti.execute(
      `INSERT INTO customers
         (id, musteri_no, tip, ad, soyad, mobil_telefon, email, il, ilce, notlar,
          yetkililer, is_active, created_at, updated_at)
       VALUES (?, ?, 'bireysel', ?, ?, ?, ?, ?, ?, ?, '[]', 1, UTC_TIMESTAMP(3), UTC_TIMESTAMP(3))`,
      [
        musteriId, musteriNo, MUSTERI.ad, MUSTERI.soyad, MUSTERI.telefon,
        MUSTERI.email, MUSTERI.il, MUSTERI.ilce,
        'Veli Sigorta web sitesi ve yönetim panelini geliştiren kişi.',
      ],
    );
    console.log(`Müşteri oluşturuldu: ${musteriNo} — ${MUSTERI.ad} ${MUSTERI.soyad}`);
  }

  // --- Poliçeler ------------------------------------------------------------
  for (const p of POLICELER) {
    const [varMi] = await baglanti.execute(
      'SELECT id FROM policies WHERE police_no = ? LIMIT 1',
      [p.no],
    );

    if (varMi.length > 0) {
      console.log(`  ${p.turu.padEnd(28)} zaten var, atlandı.`);
      continue;
    }

    await baglanti.execute(
      `INSERT INTO policies
         (id, musteri_id, sigorta_sirketi, sigorta_turu, police_no, baslangic_tarihi,
          bitis_tarihi, durum, yenileme_mi, para_birimi, risk_tanimi, brans_alanlari,
          notlar, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'Aktif', 0, 'TL', ?, ?, ?, UTC_TIMESTAMP(3), UTC_TIMESTAMP(3))`,
      [
        `pol-${randomUUID()}`, musteriId, SIGORTA_SIRKETI, p.turu, p.no,
        BASLANGIC, BITIS, RISK_TANIMI,
        // Araç bilgileri + SBM/Tramer numarası branşa özel alanlarda saklanır.
        JSON.stringify({ ...ARAC, 'SBM Tramer No': p.tramer, 'Mevcut Acente': 'SİGORTALADIM Brokerlik' }),
        NOT,
      ],
    );
    console.log(`  ${p.turu.padEnd(28)} eklendi (${BASLANGIC} → ${BITIS})`);
  }

  // --- Doğrulama ------------------------------------------------------------
  const [ozet] = await baglanti.execute(
    `SELECT c.musteri_no, c.ad, c.soyad, c.mobil_telefon, c.email,
            p.sigorta_turu, p.police_no, p.bitis_tarihi,
            DATEDIFF(p.bitis_tarihi, CURDATE()) AS kalan_gun, p.risk_tanimi
     FROM customers c JOIN policies p ON p.musteri_id = c.id
     WHERE c.id = ? ORDER BY p.sigorta_turu`,
    [musteriId],
  );

  console.log('\n--- Kayıt özeti ---');
  ozet.forEach((r) => {
    console.log(
      `${r.musteri_no} ${r.ad} ${r.soyad} | ${r.mobil_telefon} | ${r.sigorta_turu}`,
    );
    console.log(`   ${r.risk_tanimi}`);
    console.log(`   ${r.police_no} · bitiş ${r.bitis_tarihi} · ${r.kalan_gun} gün kaldı\n`);
  });

  await baglanti.end();
}

main().catch((e) => {
  console.error('Kayıt eklenemedi:', e.message);
  process.exit(1);
});
