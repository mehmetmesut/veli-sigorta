/**
 * Teklif formundaki sigorta ürünü listesi ve gelen bağlantı parametresini bu listeyle
 * eşleştiren yardımcılar.
 *
 * Site içindeki bağlantılar `/teklif-al?hizmet=...` biçiminde iki farklı değer gönderiyor:
 * blog sayfaları hizmetin **başlığını** (`Kasko Sigortası`), varsayılan slaytlar ise
 * **slug**'ını (`kasko-sigortasi`). Bu yüzden eşleştirme her iki biçimi de kabul eder.
 */

export const SERVICE_OPTIONS = [
  'Zorunlu Trafik Sigortası',
  'Kasko Sigortası',
  'Tamamlayıcı Sağlık Sigortası (TSS)',
  'Özel Sağlık Sigortası (ÖSS)',
  'DASK Zorunlu Deprem Sigortası',
  'Konut & Eşya Sigortası',
  'İşyeri Sigortası',
  'Seyahat Sağlık Sigortası',
  'İhtiyari Mali Mesuliyet (İMM)',
  'Ferdi Kaza Sigortası',
  'Hayat Sigortası',
  'Nakliyat Sigortası',
  'İşveren Sorumluluk Sigortası',
  'Mesleki Sorumluluk Sigortası',
  'Siber Risk Sigortası',
  'Yabancılar İçin Özel Sağlık Sigortası',
  'İkamet İzni Sağlık Sigortası',
  'Yabancı Öğrenci Sağlık Sigortası',
  'Yabancı Aile Sağlık Sigortası',
  'Türkiye Gelen Seyahat Sağlık Sigortası',
  'Yabancı Misafir Seyahat Sağlık Sigortası',
  'Yurt Dışı Seyahat Sağlık Sigortası',
  'Schengen Seyahat Sağlık Sigortası',
  'Vize Seyahat Sağlık Sigortası',
  'Yurt Dışı Öğrenci/Eğitim Sigortası',
  'Yurt Dışı İş Seyahati Sigortası',
  'Aile Seyahat Sağlık Sigortası',
  'Yıllık Çoklu Seyahat Sigortası',
  'Seyahat Ferdi Kaza',
  'Bagaj ve Seyahat Aksaması Teminatları',
  'Tıbbi Nakil ve Asistans Hizmetleri',
] as const;

export const VARSAYILAN_SERVICE_OPTION = SERVICE_OPTIONS[0];

/**
 * Türkçe karakterleri koruyarak slug üretir: "Tamamlayıcı Sağlık" → "tamamlayici-saglik".
 * Önce Türkçe küçültme yapılır (İ→i, I→ı), ardından aksanlı harfler ASCII karşılığına çevrilir.
 */
export function slugla(deger: string): string {
  return deger
    .toLocaleLowerCase('tr-TR')
    .replace(/ı/g, 'i')
    .replace(/ş/g, 's')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * `?hizmet=` parametresini listedeki bir ürünle eşleştirir.
 *
 * Sırasıyla denenir: birebir başlık, birebir slug, ardından slug ön eki. Ön ek kuralı
 * gereklidir çünkü hizmet slug'ı `tamamlayici-saglik-sigortasi` iken listedeki başlığın
 * slug'ı parantezli ek yüzünden `tamamlayici-saglik-sigortasi-tss` olur.
 *
 * Eşleşme yoksa `null` döner; çağıran taraf varsayılana düşer.
 */
export function hizmetParametresiniEslestir(ham: string | undefined | null): string | null {
  const deger = (ham || '').trim();
  if (!deger) return null;

  const baslikEslesme = SERVICE_OPTIONS.find(
    (o) => o.toLocaleLowerCase('tr-TR') === deger.toLocaleLowerCase('tr-TR'),
  );
  if (baslikEslesme) return baslikEslesme;

  const aranan = slugla(deger);
  if (!aranan) return null;

  const slugEslesme = SERVICE_OPTIONS.find((o) => slugla(o) === aranan);
  if (slugEslesme) return slugEslesme;

  // En uzun ön ek eşleşmesini seç ki "seyahat-saglik-sigortasi" yanlışlıkla
  // "seyahat-ferdi-kaza" gibi kısa bir kayda düşmesin.
  const onEkAdaylari = SERVICE_OPTIONS.filter((o) => {
    const s = slugla(o);
    return s.startsWith(`${aranan}-`) || aranan.startsWith(`${s}-`);
  });
  if (onEkAdaylari.length === 0) return null;

  return onEkAdaylari.reduce((enIyi, aday) =>
    slugla(aday).length > slugla(enIyi).length ? aday : enIyi,
  );
}
