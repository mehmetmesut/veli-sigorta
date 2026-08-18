/**
 * Ölçüm kaynaklarının Türkçe karşılıkları.
 *
 * Google API'leri kanal adlarını İngilizce döndürüyor ("Direct", "Organic Search");
 * panel Türkçe olduğu için ekranda İngilizce etiket görmek personeli "bu ne
 * demek?" diye Google'a bakmaya itiyordu.
 *
 * Tanınmayan bir kanal geldiğinde Google'ın verdiği ad OLDUĞU GİBİ gösterilir —
 * uydurma bir çeviri, olmayan bir kanalı varmış gibi göstermekten kötüdür.
 */

/** GA4 `sessionDefaultChannelGroup` değerleri. */
const GA4_KANALLARI: Record<string, string> = {
  Direct: 'Doğrudan',
  'Organic Search': 'Organik Arama',
  'Paid Search': 'Ücretli Arama',
  'Organic Social': 'Sosyal Medya',
  'Paid Social': 'Ücretli Sosyal Medya',
  'Organic Video': 'Video',
  'Paid Video': 'Ücretli Video',
  'Organic Shopping': 'Alışveriş',
  'Paid Shopping': 'Ücretli Alışveriş',
  Referral: 'Yönlendirme',
  Email: 'E-posta',
  Affiliates: 'İş Ortakları',
  Display: 'Görüntülü Reklam',
  'Cross-network': 'Çapraz Ağ',
  Audio: 'Sesli Yayın',
  SMS: 'SMS',
  'Mobile Push Notifications': 'Mobil Bildirim',
  Unassigned: 'Sınıflandırılmamış',
};

/**
 * Kendi ziyaret kayıtlarımızdaki `referrer_category` değerleri.
 * Bunları `lib/db.ts` yönlendiren adresten üretiyor.
 */
const YONLENDIREN_KATEGORILERI: Record<string, string> = {
  Direct: 'Doğrudan',
  Google: 'Google Arama',
  Bing: 'Bing',
  Yandex: 'Yandex',
  ChatGPT: 'ChatGPT',
  Perplexity: 'Perplexity',
  Gemini: 'Gemini',
  Copilot: 'Copilot',
  Other: 'Diğer Siteler',
};

export function ga4KanalAdi(kanal: string): string {
  return GA4_KANALLARI[kanal] ?? kanal ?? 'Bilinmiyor';
}

export function yonlendirenAdi(kategori: string): string {
  return YONLENDIREN_KATEGORILERI[kategori] ?? kategori ?? 'Bilinmiyor';
}

/** Yapay zekâ arama motorlarından mı geliyor? Rozet rengini bu belirler. */
const YAPAY_ZEKA_KAYNAKLARI = new Set(['ChatGPT', 'Perplexity', 'Gemini', 'Copilot']);

export function yapayZekaKaynagiMi(kategori: string): boolean {
  return YAPAY_ZEKA_KAYNAKLARI.has(kategori);
}
