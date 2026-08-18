/**
 * Türkçe metin işlemleri — karşılaştırma ve arama için tek kaynak.
 *
 * Türkçede `I` küçülünce noktasız `ı`, `İ` küçülünce noktalı `i` olur. Bu yüzden
 * `toLocaleLowerCase('tr-TR')` tek başına aramayı BOZAR: kayıtta "YILMAZ" yazıyorsa
 * küçültülmüş hâli "yılmaz"dır, personel standart klavyeyle "yilmaz" yazdığında
 * `includes` tutmaz ve sonuç sıfır döner. Personel kaydı bulamayıp mükerrer müşteri
 * açtığı için bu, panelin en pahalı sessiz hatasıydı.
 *
 * Aynı tuzak "Istanbul"/"İstanbul" ve "ISIK"/"IŞIK" çiftlerinde de var.
 *
 * DİKKAT: Buradaki katlama YALNIZCA karşılaştırma içindir. Ekrana yazılan hiçbir
 * metin bu fonksiyondan geçmez — kullanıcı adı, unvanı ve şehri her zaman doğru
 * yazımıyla görür. Görünen metnin büyük/küçük dönüşümü `bicimlendirAd` /
 * `bicimlendirSoyad` (lib/police.ts) ile ya da CSS `text-transform` ile yapılır;
 * ikincisi `<html lang="tr">` sayesinde `i → İ` kuralına uyar.
 *
 * E-posta, URL, user-agent ve HTTP başlığı gibi ASCII değerlerde bu fonksiyonu
 * KULLANMAYIN; orada yerel ayarsız `toLowerCase()` doğrudur, Türkçe kural `I`'yı
 * `ı` yapıp eşleşmeyi bozar.
 */

/** Türkçeye özgü harflerin arama karşılığı. */
const HARF_KATLAMA: Record<string, string> = {
  ı: 'i', ş: 's', ğ: 'g', ç: 'c', ö: 'o', ü: 'u',
  â: 'a', î: 'i', û: 'u',
};

/**
 * Karşılaştırma için metni sadeleştirir: Türkçe küçük harf + harf katlama.
 *
 * Hem kayıt hem sorgu bu fonksiyondan geçmeli; tek taraflı uygulanırsa eşleşme
 * yine tutmaz.
 */
export function aramaNormalize(deger: string | undefined | null): string {
  return (deger || '')
    .toLocaleLowerCase('tr-TR')
    .replace(/[ışğçöüâîû]/g, (harf) => HARF_KATLAMA[harf] ?? harf);
}

/**
 * Sorgudaki her kelime, verilen alanlardan en az birinde geçiyor mu?
 *
 * Kelime bazlı VE mantığı: "mehmet yılmaz" yazan biri "Mehmet Mesut YILMAZ"
 * kaydını bulabilmeli — düz `includes` aradaki "Mesut" yüzünden eşleşmezdi.
 *
 * Boş sorgu her kaydı geçirir; çağıran taraf ayrıca kontrol etmek zorunda kalmasın.
 */
export function metinAramasiEslesiyorMu(
  alanlar: ReadonlyArray<string | undefined | null>,
  sorgu: string,
): boolean {
  const kelimeler = aramaNormalize(sorgu.trim()).split(/\s+/).filter(Boolean);
  if (kelimeler.length === 0) return true;

  const metin = aramaNormalize(alanlar.filter(Boolean).join(' '));
  return kelimeler.every((kelime) => metin.includes(kelime));
}
