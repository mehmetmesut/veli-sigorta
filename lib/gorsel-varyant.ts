/**
 * Panelden yüklenen slider görsellerinin dar ekran varyantları.
 *
 * `next/image` `/yuklenen/` yolunu işleyemiyor (o yolu nginx servis ediyor, Next sunucusu
 * 404 veriyor), bu yüzden boyutlandırma yükleme anında yapılıyor ve tarayıcıya `srcset`
 * ile seçtiriliyor. Adlandırma düzeni sabittir:
 *
 *   /yuklenen/slider-<uuid>.webp          → ana dosya (1800 piksel)
 *   /yuklenen/slider-<uuid>-720w.webp     → dar ekran
 *   /yuklenen/slider-<uuid>-1200w.webp    → tablet / küçük masaüstü
 */

/** Yükleme anında üretilen ek genişlikler. Yükleme ucundaki liste ile aynı olmalıdır. */
export const VARYANT_GENISLIKLERI = [720, 1200] as const;

/** Ana dosyanın genişliği; srcset'te en büyük aday olarak bildirilir. */
export const ANA_GENISLIK = 1800;

/**
 * Bu adres için varyant üretilmiş olabilir mi?
 *
 * Yalnız yükleme ucumuzun ürettiği `/yuklenen/slider-*.webp` dosyalarında varyant vardır.
 * Dışarıdan yapıştırılmış adreslerde ve varyant düzeni gelmeden önce yüklenmiş eski
 * dosyalarda yoktur — o durumda `srcset` verilmez ve tarayıcı tek dosyayı indirir.
 */
export function varyantOlabilirMi(url: string | undefined): boolean {
  return /^\/yuklenen\/slider-[0-9a-f-]+\.webp$/i.test(url || '');
}

/**
 * `srcset` değeri üretir. Varyantı olmayan adreslerde `undefined` döner ki
 * `<img>` yalnız `src` ile çalışsın.
 */
export function srcSetUret(url: string | undefined): string | undefined {
  if (!url || !varyantOlabilirMi(url)) return undefined;

  const taban = url.replace(/\.webp$/i, '');
  const adaylar = VARYANT_GENISLIKLERI.map((g) => `${taban}-${g}w.webp ${g}w`);
  adaylar.push(`${url} ${ANA_GENISLIK}w`);

  return adaylar.join(', ');
}
