#!/usr/bin/env node
/**
 * Tek seferlik: teklif ve müşteri kayıtlarındaki telefonları tek biçime çevirir.
 *
 * Müşteri formu telefonu maskeliyordu, teklif formu ham yazıyordu; aynı numara
 * kayıtlarda "0(530) 730 20 02" ve "5307302002" olarak iki farklı biçimde
 * duruyordu. Biçimlendirme artık hem istemcide hem sunucuda (Zod şeması)
 * uygulanıyor; bu betik geçmiş kayıtları hizaya getirir.
 *
 * Tekrar çalıştırılabilir: zaten doğru biçimdeki kayıtlara dokunmaz.
 *
 * Kural `lib/form-helpers.ts::telefonMaskele` ile birebir aynıdır.
 */

const mysql = require('mysql2/promise');

function gerekli(ad) {
  if (!process.env[ad]) {
    console.error(`${ad} tanımlı değil.`);
    process.exit(1);
  }
  return process.env[ad];
}

function telefonMaskele(ham) {
  let rakam = (ham || '').replace(/\D/g, '');

  if (rakam.startsWith('90') && rakam.length > 10) rakam = rakam.slice(2);
  if (rakam.startsWith('0')) rakam = rakam.slice(1);
  rakam = rakam.slice(0, 10);

  if (rakam.length === 0) return '';
  if (rakam.length <= 3) return `0(${rakam}`;
  if (rakam.length <= 6) return `0(${rakam.slice(0, 3)}) ${rakam.slice(3)}`;
  if (rakam.length <= 8) return `0(${rakam.slice(0, 3)}) ${rakam.slice(3, 6)} ${rakam.slice(6)}`;
  return `0(${rakam.slice(0, 3)}) ${rakam.slice(3, 6)} ${rakam.slice(6, 8)} ${rakam.slice(8)}`;
}

/** Hangi tabloda hangi sütunlar telefon tutuyor. */
const HEDEFLER = [
  { tablo: 'quotes', sutunlar: ['phone'] },
  { tablo: 'customers', sutunlar: ['mobil_telefon', 'sabit_telefon'] },
];

async function main() {
  const kuruMu = process.argv.includes('--kuru');

  const baglanti = await mysql.createConnection({
    host: process.env.MYSQL_HOST || '127.0.0.1',
    port: Number(process.env.MYSQL_PORT || 3306),
    database: gerekli('MYSQL_DATABASE'),
    user: gerekli('MYSQL_USER'),
    password: gerekli('MYSQL_PASSWORD'),
    charset: 'utf8mb4_unicode_ci',
  });

  let toplamDegisen = 0;

  for (const { tablo, sutunlar } of HEDEFLER) {
    const [satirlar] = await baglanti.execute(`SELECT id, ${sutunlar.join(', ')} FROM ${tablo}`);

    for (const satir of satirlar) {
      for (const sutun of sutunlar) {
        const mevcut = satir[sutun];
        if (!mevcut) continue;

        const yeni = telefonMaskele(mevcut);
        // Boş sonuç, rakam içermeyen bozuk bir değer demektir; dokunulmaz.
        if (!yeni || yeni === mevcut) continue;

        console.log(`${tablo}.${sutun} ${satir.id}\n   "${mevcut}" → "${yeni}"`);
        if (!kuruMu) {
          await baglanti.execute(`UPDATE ${tablo} SET ${sutun} = ? WHERE id = ?`, [yeni, satir.id]);
        }
        toplamDegisen += 1;
      }
    }
  }

  console.log(
    toplamDegisen === 0
      ? '\nTüm telefonlar zaten doğru biçimde.'
      : `\n${toplamDegisen} telefon ${kuruMu ? 'düzeltilecek' : 'düzeltildi'}.`,
  );

  await baglanti.end();
}

main().catch((e) => {
  console.error('Düzeltme yapılamadı:', e.message);
  process.exit(1);
});
