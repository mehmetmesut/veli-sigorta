/**
 * Günlük ölçüm serilerindeki boşlukları doldurur.
 *
 * NEDEN: Google API'leri (GA4 Data API, Search Console) yalnızca VERİ OLAN günler
 * için satır döndürüyor. Ziyaret almayan bir gün yanıttan tamamen düşüyor ve
 * grafik "10, 11, 12, 13, 14, 15, 17" gibi araya delik açılmış bir dizi çiziyor.
 * Bu iki şeyi bozar:
 *  - Gözle okunan eğilim yanlış çıkar; ardışık sanılan iki çubuk aslında ardışık değil.
 *  - Özet paneldeki teklif serisi GA4'ün gün listesinden üretildiği için, GA4'in
 *    atladığı bir günde gelen teklif talepleri de grafikten sessizce kaybolur.
 *
 * Yalnızca ARADAKİ boşluklar doldurulur; serinin başına/sonuna gün EKLENMEZ.
 * İstenen tarih aralığının tamamını sıfırla doldurmak, ölçüm henüz başlamamışken
 * "o gün sıfır ziyaret aldık" diye okunan uydurma bir geçmiş üretirdi.
 */

/** ISO 'YYYY-AA-GG' biçimindeki günü bir gün ileri alır. */
function sonrakiGun(isoTarih: string): string {
  const [yil, ay, gun] = isoTarih.split('-').map(Number);
  const tarih = new Date(Date.UTC(yil, ay - 1, gun + 1));
  return [
    String(tarih.getUTCFullYear()).padStart(4, '0'),
    String(tarih.getUTCMonth() + 1).padStart(2, '0'),
    String(tarih.getUTCDate()).padStart(2, '0'),
  ].join('-');
}

const ISO_GUN = /^\d{4}-\d{2}-\d{2}$/;

/** En fazla kaç gün doldurulur; bozuk bir tarih sonsuz döngüye çevrilmesin. */
const EN_FAZLA_ADIM = 400;

/**
 * Seriyi tarihe göre sıralar ve aradaki eksik günleri `bosGun` ile tamamlar.
 *
 * @param noktalar Her biri ISO 'YYYY-AA-GG' bir `date` taşıyan kayıtlar.
 * @param bosGun Eksik bir gün için üretilecek kaydı döndürür.
 */
export function gunBosluklariniDoldur<T extends { date: string }>(
  noktalar: readonly T[],
  bosGun: (tarih: string) => T,
): T[] {
  // Biçimi tanınmayan tarih varsa dokunulmaz: gün sayamadığımız bir seriyi
  // doldurmaya çalışmak, veriyi düzeltmek yerine bozardı.
  if (noktalar.length < 2 || !noktalar.every((n) => ISO_GUN.test(n.date))) {
    return [...noktalar];
  }

  const sirali = [...noktalar].sort((a, b) => a.date.localeCompare(b.date));
  const sonuc: T[] = [sirali[0]];

  for (let i = 1; i < sirali.length; i += 1) {
    let beklenen = sonrakiGun(sonuc[sonuc.length - 1].date);
    let adim = 0;
    while (beklenen < sirali[i].date && adim < EN_FAZLA_ADIM) {
      sonuc.push(bosGun(beklenen));
      beklenen = sonrakiGun(beklenen);
      adim += 1;
    }
    sonuc.push(sirali[i]);
  }

  return sonuc;
}
