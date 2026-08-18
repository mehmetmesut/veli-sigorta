/**
 * Panel formlarında veri girişini hızlandıran saf yardımcılar.
 *
 * Buradaki her fonksiyon yan etkisizdir ve "şimdi" gibi değişken girdileri parametre
 * olarak alır; böylece testler tarihe bağlı kırılmaz.
 */

import { bicimlendirAd, bicimlendirSoyad } from './police';
import type { Customer } from './types';

/** Telefon alanındaki rakamları çıkarır (maskeleme ve karşılaştırma için). */
export function telefonRakamlari(deger: string | undefined): string {
  return (deger || '').replace(/\D/g, '');
}

/**
 * Kullanıcı yazarken cep telefonunu okunur biçime çevirir: `0(532) 111 22 33`.
 * Eksik yazılmış numaralarda da bozulmadan çalışır; kullanıcı silerken takılmaz.
 */
export function telefonMaskele(ham: string): string {
  let rakam = telefonRakamlari(ham);

  // +90 veya 90 ile başlayan girişleri yerel biçime indir.
  if (rakam.startsWith('90') && rakam.length > 10) rakam = rakam.slice(2);
  // Baştaki 0'ı at; maskeyi biz ekliyoruz.
  if (rakam.startsWith('0')) rakam = rakam.slice(1);
  rakam = rakam.slice(0, 10);

  if (rakam.length === 0) return '';
  if (rakam.length <= 3) return `0(${rakam}`;
  if (rakam.length <= 6) return `0(${rakam.slice(0, 3)}) ${rakam.slice(3)}`;
  if (rakam.length <= 8) return `0(${rakam.slice(0, 3)}) ${rakam.slice(3, 6)} ${rakam.slice(6)}`;
  return `0(${rakam.slice(0, 3)}) ${rakam.slice(3, 6)} ${rakam.slice(6, 8)} ${rakam.slice(8)}`;
}

/**
 * Sıradaki müşteri numarasını üretir: `M-00001`, `M-00002` …
 *
 * Kayıt sayısı yerine mevcut en büyük numarayı esas alır; aksi hâlde bir müşteri
 * silindikten sonra üretilen numara önceki bir kayıtla çakışırdı.
 */
export function sonrakiMusteriNo(mevcut: ReadonlyArray<{ musteriNo?: string }>): string {
  const enBuyuk = mevcut.reduce((max, m) => {
    const eslesme = /^M-(\d+)$/.exec((m.musteriNo || '').trim());
    if (!eslesme) return max;
    return Math.max(max, Number(eslesme[1]));
  }, 0);

  return `M-${String(enBuyuk + 1).padStart(5, '0')}`;
}

/**
 * Aynı müşteri daha önce kaydedilmiş mi? T.C. kimlik, vergi numarası veya cep
 * telefonu eşleşmesine bakar. Düzenlenen kaydın kendisi sonuçtan çıkarılır.
 */
export function benzerMusteriBul(
  mevcut: readonly Customer[],
  aday: Pick<Customer, 'id' | 'tcKimlikNo' | 'vergiNo' | 'mobilTelefon'>,
): Customer | null {
  const tc = (aday.tcKimlikNo || '').trim();
  const vergi = (aday.vergiNo || '').trim();
  const telefon = telefonRakamlari(aday.mobilTelefon).slice(-10);

  return (
    mevcut.find((c) => {
      if (c.id === aday.id) return false;
      if (tc && (c.tcKimlikNo || '').trim() === tc) return true;
      if (vergi && (c.vergiNo || '').trim() === vergi) return true;
      if (telefon.length === 10 && telefonRakamlari(c.mobilTelefon).slice(-10) === telefon) return true;
      return false;
    }) || null
  );
}

/**
 * Poliçe bitiş tarihi varsayılanı. Türkiye'de poliçeler ağırlıkla bir yıllık
 * düzenlenir; başlangıç girilince bitiş kendiliğinden dolar, kullanıcı isterse değiştirir.
 */
/** Poliçe süresinin ölçüldüğü birim. */
export type SureBirimi = 'gun' | 'yil';

const ISO_TARIH = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Bir tarihe gün ya da yıl ekler, ISO (YYYY-AA-GG) biçiminde döndürür.
 *
 * Yıl `setFullYear` ile verilir: `new Date(50, ...)` gibi çağrılar iki haneli yılı
 * 1950'ye çeviriyor, bu da elle yazılan bozuk bir tarihte sessizce yanlış sonuç
 * üretirdi.
 *
 * 29 Şubat gibi kaymalarda (artık olmayan yıl) tarih 1 Mart'a taşar; JavaScript'in
 * doğal davranışı olduğu gibi bırakılır — sigortacılıkta da bitiş günü böyle kayar.
 */
export function tarihEkle(isoTarih: string, miktar: number, birim: SureBirimi): string {
  if (!ISO_TARIH.test(isoTarih)) return '';
  if (!Number.isFinite(miktar)) return '';

  const [yil, ay, gun] = isoTarih.split('-').map(Number);
  const hedef = new Date(2000, 0, 1);
  hedef.setFullYear(
    birim === 'yil' ? yil + miktar : yil,
    ay - 1,
    birim === 'gun' ? gun + miktar : gun,
  );

  // Yıl da dolgulanır: `<input type="date">` dört haneden kısa yılı geçersiz sayıp
  // alanı sessizce boşaltıyor.
  const p = (n: number) => String(n).padStart(2, '0');
  const y = String(hedef.getFullYear()).padStart(4, '0');
  return `${y}-${p(hedef.getMonth() + 1)}-${p(hedef.getDate())}`;
}

export function birYilSonrasi(isoTarih: string): string {
  return tarihEkle(isoTarih, 1, 'yil');
}

/**
 * İki tarih arasındaki gün sayısı. Geçersiz tarihte `null` döner.
 *
 * UTC üzerinden hesaplanır: yerel saatte yaz saati geçişleri olan aralıklarda
 * 24 saatlik bölme bir gün eksik ya da fazla verebiliyor.
 */
export function gunFarki(baslangic: string, bitis: string): number | null {
  if (!ISO_TARIH.test(baslangic) || !ISO_TARIH.test(bitis)) return null;

  const [by, ba, bg] = baslangic.split('-').map(Number);
  const [sy, sa, sg] = bitis.split('-').map(Number);

  const fark = Date.UTC(sy, sa - 1, sg) - Date.UTC(by, ba - 1, bg);
  return Math.round(fark / 86_400_000);
}

/** Tam yıl olarak gösterilebilecek en uzun süre; ötesi gün olarak yazılır. */
const EN_FAZLA_YIL = 10;

/**
 * İki tarihten süreyi geri çıkarır.
 *
 * Bitiş tarihi elle değiştirildiğinde "Süre" alanı eski değerinde kalırsa ekran
 * yalan söyler (1 yıl yazarken tarihler 6 ay gösterir). Aralık tam yıla denk
 * geliyorsa yıl, gelmiyorsa gün olarak döndürülür.
 */
export function sureyiCikar(
  baslangic: string,
  bitis: string,
): { miktar: number; birim: SureBirimi } | null {
  const gun = gunFarki(baslangic, bitis);
  if (gun === null || gun <= 0) return null;

  for (let yil = 1; yil <= EN_FAZLA_YIL; yil += 1) {
    if (tarihEkle(baslangic, yil, 'yil') === bitis) return { miktar: yil, birim: 'yil' };
  }

  return { miktar: gun, birim: 'gun' };
}

/** Brüt prim ve komisyon oranından komisyon tutarını hesaplar (2 ondalık). */
export function komisyonHesapla(
  brutPrim: number | undefined,
  oran: number | undefined,
): number | undefined {
  if (typeof brutPrim !== 'number' || typeof oran !== 'number') return undefined;
  if (!Number.isFinite(brutPrim) || !Number.isFinite(oran)) return undefined;

  return Math.round(brutPrim * oran) / 100;
}

/**
 * Tek satırlık bir ad soyadı, ad ve soyad olarak ayırır.
 *
 * Türkçede soyadı son kelimedir; ondan önceki her şey addır ("Mehmet Mesut YILMAZ" →
 * ad "Mehmet Mesut", soyad "YILMAZ"). Tek kelime girilmişse soyadı boş bırakılır —
 * uydurmak yerine eksik bırakmak doğrudur, kullanıcı müşteri kartından tamamlar.
 */
export function adSoyadAyir(tamAd: string | undefined | null): { ad: string; soyad: string } {
  const parcalar = (tamAd || '').trim().split(/\s+/).filter(Boolean);
  if (parcalar.length === 0) return { ad: '', soyad: '' };
  if (parcalar.length === 1) return { ad: parcalar[0], soyad: '' };

  return {
    ad: parcalar.slice(0, -1).join(' '),
    soyad: parcalar[parcalar.length - 1],
  };
}

/**
 * Tek satırlık ad soyadı, müşteri kartındaki yazım kuralına göre biçimlendirir:
 * ad yalnızca baş harfleri büyük, soyad tamamen büyük ("mehmet mesut yılmaz" →
 * "Mehmet Mesut YILMAZ").
 *
 * Teklif formunda ad ve soyad tek alanda toplanıyor; müşteri kartına aktarılırken
 * zaten ayrıştırılıp biçimlendiriliyordu. Teklif kaydının kendisi ham metni
 * saklayınca aynı kişi iki ekranda iki farklı yazımla görünüyordu.
 *
 * Tek kelime girilmişse ad kabul edilir — soyad uydurulmaz.
 */
export function tamAdBicimlendir(tamAd: string | undefined | null): string {
  const { ad, soyad } = adSoyadAyir(tamAd);
  if (!ad && !soyad) return '';

  return [ad && bicimlendirAd(ad), soyad && bicimlendirSoyad(soyad)]
    .filter(Boolean)
    .join(' ');
}

/**
 * "Antalya / Kepez" biçimindeki serbest metni il ve ilçeye ayırır.
 *
 * Teklif formunda tek alan olarak toplanıyor; müşteri kartında iki ayrı alan var.
 * Ayraç yoksa değerin tamamı il kabul edilir.
 */
export function ilIlceAyir(deger: string | undefined | null): { il: string; ilce: string } {
  const ham = (deger || '').trim();
  if (!ham) return { il: '', ilce: '' };

  const parcalar = ham.split(/[/,\-–]/).map((p) => p.trim()).filter(Boolean);
  if (parcalar.length === 0) return { il: '', ilce: '' };
  if (parcalar.length === 1) return { il: parcalar[0], ilce: '' };

  return { il: parcalar[0], ilce: parcalar[1] };
}

/**
 * Bir alanda daha önce kullanılmış değerleri, en sık kullanılandan başlayarak listeler.
 * Şirket/branş gibi alanlarda otomatik tamamlama önerisi olarak kullanılır.
 */
export function gecmisDegerler<T>(kayitlar: readonly T[], sec: (kayit: T) => string | undefined): string[] {
  const sayac = new Map<string, number>();

  kayitlar.forEach((kayit) => {
    const deger = (sec(kayit) || '').trim();
    if (deger) sayac.set(deger, (sayac.get(deger) || 0) + 1);
  });

  return [...sayac.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'tr-TR'))
    .map(([deger]) => deger);
}
