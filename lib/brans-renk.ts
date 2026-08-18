/**
 * Sigorta branşına göre renk etiketi.
 *
 * Poliçe listesinde branş adı düz metindi; onlarca satır arasında "Kasko" ile "Konut"
 * gözle ayırt edilemiyordu. Renk, taramayı hızlandıran ikinci bir işaret katmanıdır.
 *
 * Renkler ANLAMLI gruplanır (rastgele değil): araç, konut, sağlık, seyahat ve ticari
 * branşlar kendi ailesini paylaşır. Böylece kullanıcı rengi bir kez öğrenip listeyi
 * okumadan tarayabilir.
 *
 * Renk tek başına bilgi taşımaz — etiketin içinde branş adı her zaman yazılıdır
 * (WCAG 1.4.1: bilgi yalnızca renkle aktarılamaz).
 */

/** Tailwind sınıf çifti: arka plan + metin + kenarlık. */
export type BransRengi = string;

const ARAC = 'bg-blue-100 text-blue-900 border-blue-200';
const KONUT = 'bg-amber-100 text-amber-900 border-amber-200';
const SAGLIK = 'bg-emerald-100 text-emerald-900 border-emerald-200';
const SEYAHAT = 'bg-sky-100 text-sky-900 border-sky-200';
const TICARI = 'bg-violet-100 text-violet-900 border-violet-200';
const SORUMLULUK = 'bg-rose-100 text-rose-900 border-rose-200';
const HAYAT = 'bg-teal-100 text-teal-900 border-teal-200';
const DIGER = 'bg-slate-100 text-slate-700 border-slate-200';

/**
 * Anahtar kelime → renk eşlemesi. Sıra ÖNEMLİDİR: ilk eşleşen kazanır.
 * Örneğin "Yabancı Öğrenci Sağlık Sigortası" hem "sağlık" hem "öğrenci" içerir;
 * sağlık daha belirleyici olduğu için önce gelir.
 */
const KURALLAR: ReadonlyArray<{ anahtarlar: readonly string[]; renk: BransRengi }> = [
  { anahtarlar: ['kasko'], renk: ARAC },
  { anahtarlar: ['trafik', 'imm', 'mali mesuliyet', 'yesil kart', 'yeşil kart'], renk: ARAC },
  { anahtarlar: ['dask', 'deprem', 'konut', 'esya', 'eşya'], renk: KONUT },
  { anahtarlar: ['seyahat', 'schengen', 'vize', 'bagaj'], renk: SEYAHAT },
  { anahtarlar: ['saglik', 'sağlık', 'tss', 'oss', 'öss', 'tamamlayici', 'tamamlayıcı'], renk: SAGLIK },
  { anahtarlar: ['hayat', 'ferdi kaza', 'birikim'], renk: HAYAT },
  { anahtarlar: ['sorumluluk', 'mesleki', 'isveren', 'işveren', 'siber'], renk: SORUMLULUK },
  { anahtarlar: ['isyeri', 'işyeri', 'nakliyat', 'ticari', 'kobi', 'muhendislik', 'mühendislik', 'tarim', 'tarım'], renk: TICARI },
];

/**
 * Branş adını renge çevirir. Tanınmayan branşlarda nötr gri döner — uydurma renk
 * vermek, kullanıcının öğrendiği renk dilini bozar.
 */
export function bransRengi(sigortaTuru: string | undefined | null): BransRengi {
  const ad = (sigortaTuru || '').toLocaleLowerCase('tr-TR');
  if (!ad.trim()) return DIGER;

  for (const kural of KURALLAR) {
    if (kural.anahtarlar.some((a) => ad.includes(a))) return kural.renk;
  }

  return DIGER;
}

/**
 * Etikette gösterilecek kısa ad.
 *
 * Tam branş adları çok uzun ("Yabancılar İçin Özel Sağlık Sigortası"); tablo sütununda
 * satırı taşırıyordu. Sonundaki "Sigortası/Sigorta" eki ve parantezli açıklama atılır.
 */
export function bransKisaAd(sigortaTuru: string | undefined | null): string {
  const ad = (sigortaTuru || '').trim();
  if (!ad) return '—';

  // Parantez atıldıktan sonra sondaki boşluk temizlenmeli; aksi hâlde "…Sigortası "
  // ifadesindeki sondaki boşluk yüzünden ek kaldırma deseni ($ ile biten) eşleşmiyordu.
  const parantezsiz = ad.replace(/\s*\([^)]*\)\s*/g, ' ').trim();

  return (
    parantezsiz
      .replace(/\s+Sigortas[ıi]$/i, '')
      .replace(/\s+Sigorta$/i, '')
      .trim() || ad
  );
}
