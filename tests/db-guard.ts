/**
 * Veritabanı testleri için güvenlik kilidi.
 *
 * NEDEN VAR: Bu testler kayıt yazar ve siler — biri yönetici parola hash'ini değiştirir,
 * biri sistem kullanıcısı ekler. Üretim veritabanına karşı çalıştırılırlarsa panel girişini
 * bozar ve gerçek veriye test kaydı karıştırırlar. (2026-08-15'te tam olarak bu oldu:
 * üretime üç test kullanıcısı sızdı ve elle temizlendi.)
 *
 * Bu yüzden testler YALNIZCA adı `_test` ile biten bir veritabanında çalışır. Aksi hâlde
 * bağlantı kurulmadan hata verilir.
 */

export function testVeritabaniniDogrula(): void {
  const ad = process.env.MYSQL_DATABASE;

  if (!ad) {
    throw new Error(
      'MYSQL_DATABASE tanımlı değil. Veritabanı testleri için ayrı bir test veritabanı gerekir.',
    );
  }

  if (!ad.endsWith('_test')) {
    throw new Error(
      `GÜVENLİK KİLİDİ: "${ad}" bir test veritabanı değil. Bu testler veri yazıp siler; ` +
        'üretim veritabanına karşı çalıştırılamaz. Adı "_test" ile biten bir veritabanı kullanın ' +
        '(ör. MYSQL_DATABASE=velisigorta_test).',
    );
  }
}
