/**
 * Slider (kampanya) sıra numaralarını sistemin yönetmesi.
 *
 * SORUN: Yeni kampanyaya panelde `campaigns.length + 1` veriliyordu. Araya bir
 * kayıt silindiğinde uzunluk küçülüyor ve yeni numara mevcut bir kayıtla
 * ÇAKIŞIYOR. Canlıda tam bunun sonucu vardı: `1, 2, 4, 4, 6, 6` — iki çift
 * çakışma, 3 ve 5 boş. Çakışan numaralarda sıralama `id`'ye düşüyor, yani
 * panelden sıra değiştirmek beklenmedik sonuç veriyordu.
 *
 * ÇÖZÜM: numara istemciden gelmez; her yazma sonrası tüm liste 1..N olarak
 * yeniden numaralanır. Böylece çakışma ve boşluk oluşması yapısal olarak
 * imkânsız hâle gelir.
 */

export interface SiralanabilirKampanya {
  id: string;
  /** Kaydın o anki sıra numarası. */
  order: number;
  /** Son güncelleme zamanı (epoch ms); eşitlik bozmakta kullanılır. */
  guncellendi: number;
}

/**
 * Kayıtları 1..N olarak yeniden numaralar.
 *
 * Sıralama ölçütleri, önem sırasıyla:
 *  1. **Mevcut sıra numarası** — yöneticinin verdiği düzen korunur.
 *  2. **En son güncellenen önce** — aynı numara iki kayıtta varsa, yöneticinin
 *     az önce "bu 3 olsun" dediği kayıt öne geçer; eskisi bir sıra kayar.
 *     `id`'ye göre bozmak, hangi kaydın öne geçeceğini rastgeleye bırakırdı.
 *  3. **id** — tam eşitlikte sonucun her çalıştırmada aynı çıkması için.
 *
 * Girdi dizisi DEĞİŞTİRİLMEZ; yeni bir dizi döner.
 */
export function kampanyaSiralariniNormalize<T extends SiralanabilirKampanya>(
  kayitlar: readonly T[],
): (T & { order: number })[] {
  return [...kayitlar]
    .sort(
      (a, b) =>
        a.order - b.order ||
        b.guncellendi - a.guncellendi ||
        a.id.localeCompare(b.id),
    )
    .map((kayit, i) => ({ ...kayit, order: i + 1 }));
}

/**
 * Yeni kayda verilecek sıra numarası: listenin sonu.
 *
 * `uzunluk + 1` DEĞİL — silme sonrası uzunluk mevcut en büyük numaradan küçük
 * kalabiliyor ve çakışma üretiyordu.
 */
export function sonrakiKampanyaSirasi(mevcutSiralar: readonly number[]): number {
  return mevcutSiralar.length === 0 ? 1 : Math.max(...mevcutSiralar) + 1;
}
