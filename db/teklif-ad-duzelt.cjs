#!/usr/bin/env node
/**
 * Tek seferlik: teklif kayıtlarındaki ad soyadını yazım kuralına çevirir.
 *
 * Müşteri kartı açılırken ad zaten normalleştiriliyordu ama teklifin kendisi ham
 * metni saklıyordu; "saime bedeloğlu" teklif listesinde öyle, müşteri listesinde
 * "Saime BEDELOĞLU" olarak görünüyordu. Kural artık sunucu tarafında da
 * uygulanıyor (app/api/admin/content/route.ts); bu betik geçmiş kayıtları
 * hizaya getirir.
 *
 * Tekrar çalıştırılabilir: zaten kurala uyan kayıtlara dokunmaz.
 *
 * Kural, lib/police.ts içindeki bicimlendirAd/bicimlendirSoyad ile birebir aynıdır:
 * ad yalnızca baş harfler büyük, soyad tamamı büyük, Türkçe yerel ayarla.
 */

const mysql = require('mysql2/promise');

function gerekli(ad) {
  if (!process.env[ad]) {
    console.error(`${ad} tanımlı değil.`);
    process.exit(1);
  }
  return process.env[ad];
}

function bicimlendirAd(value) {
  return value
    .trim()
    .toLocaleLowerCase('tr-TR')
    .split(/\s+/)
    .filter(Boolean)
    .map((k) => k.charAt(0).toLocaleUpperCase('tr-TR') + k.slice(1))
    .join(' ');
}

function bicimlendirSoyad(value) {
  return value.trim().toLocaleUpperCase('tr-TR').replace(/\s+/g, ' ');
}

/** Soyadı son kelimedir; tek kelime girilmişse soyad uydurulmaz. */
function tamAdBicimlendir(tamAd) {
  const parcalar = (tamAd || '').trim().split(/\s+/).filter(Boolean);
  if (parcalar.length === 0) return '';
  if (parcalar.length === 1) return bicimlendirAd(parcalar[0]);

  const ad = bicimlendirAd(parcalar.slice(0, -1).join(' '));
  const soyad = bicimlendirSoyad(parcalar[parcalar.length - 1]);
  return `${ad} ${soyad}`;
}

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

  const [satirlar] = await baglanti.execute('SELECT id, full_name FROM quotes');

  let degisen = 0;
  for (const satir of satirlar) {
    const yeni = tamAdBicimlendir(satir.full_name);
    if (!yeni || yeni === satir.full_name) continue;

    console.log(`${satir.id}\n   "${satir.full_name}" → "${yeni}"`);
    if (!kuruMu) {
      await baglanti.execute('UPDATE quotes SET full_name = ? WHERE id = ?', [yeni, satir.id]);
    }
    degisen += 1;
  }

  console.log(
    degisen === 0
      ? `\n${satirlar.length} teklifin tamamı zaten kurala uygun.`
      : `\n${satirlar.length} teklifin ${degisen} tanesi ${kuruMu ? 'düzeltilecek' : 'düzeltildi'}.`,
  );

  await baglanti.end();
}

main().catch((e) => {
  console.error('Düzeltme yapılamadı:', e.message);
  process.exit(1);
});
