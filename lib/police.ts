import type { Customer, Policy } from './types';

/**
 * Poliçe takibi için saf yardımcı fonksiyonlar.
 *
 * Tamamı yan etkisiz ve "şu an" değerini dışarıdan alır; böylece testler
 * sabit bir tarihe göre çalışabilir ve gece yarısı/saat dilimi kaymalarında
 * davranış değişmez.
 */

/** Hızlı filtre tanımı. `gun` değeri "kalan gün" üst sınırıdır. */
export interface ExpiryFilter {
  key: string;
  label: string;
  /** Kalan gün <= bu değer olanlar. `gecmis` filtresinde kullanılmaz. */
  gun?: number;
  /** Geçmişte biten poliçeler için: son N gün içinde bitmiş olanlar. */
  gecmisGun?: number;
}

/**
 * Kullanıcının istediği hızlı filtre seti. Sıra bilinçlidir: en geniş aralıktan
 * en dara doğru gider, sonunda geçmişte bitenler gelir.
 */
export const EXPIRY_FILTERS: readonly ExpiryFilter[] = [
  { key: '90', label: '90 gün', gun: 90 },
  { key: '60', label: '60 gün', gun: 60 },
  { key: '45', label: '45 gün', gun: 45 },
  { key: '30', label: '30 gün', gun: 30 },
  { key: '15', label: '15 gün', gun: 15 },
  { key: '7', label: '7 gün', gun: 7 },
  { key: '3', label: '3 gün', gun: 3 },
  { key: 'songun', label: 'Son gün', gun: 0 },
  { key: 'gecmis30', label: 'Son 30 günde bitenler', gecmisGun: 30 },
] as const;

const GUN_MS = 24 * 60 * 60 * 1000;

/** Tarihi yerel saat diliminde gün başına sabitler (saat farkı kaymasını önler). */
function gunBasi(value: Date): number {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate()).getTime();
}

/**
 * Bitiş tarihine kalan gün sayısı. Bugün bitiyorsa 0, geçmişte kaldıysa negatif.
 * Geçersiz tarihte `null` döner — çağıran taraf bu kaydı filtre dışında tutmalıdır.
 */
export function kalanGun(bitisTarihi: string, simdi: Date): number | null {
  if (!bitisTarihi) return null;
  const bitis = new Date(bitisTarihi);
  if (Number.isNaN(bitis.getTime())) return null;
  return Math.round((gunBasi(bitis) - gunBasi(simdi)) / GUN_MS);
}

/** Bir poliçe verilen hızlı filtreye giriyor mu? */
export function filtreyeUyuyorMu(
  policy: Policy,
  filtre: ExpiryFilter,
  simdi: Date,
): boolean {
  const kalan = kalanGun(policy.bitisTarihi, simdi);
  if (kalan === null) return false;

  if (filtre.gecmisGun !== undefined) {
    // Geçmişte biten: dün ve daha öncesi, ama en fazla N gün geriye.
    return kalan < 0 && kalan >= -filtre.gecmisGun;
  }

  if (filtre.gun === undefined) return false;
  // Yaklaşan: bugün dahil, üst sınıra kadar. Süresi geçmişler dışarıda kalır.
  return kalan >= 0 && kalan <= filtre.gun;
}

/** Aciliyet seviyesi — tabloda renk/rozet seçimi için. */
export type Aciliyet = 'gecmis' | 'kritik' | 'uyari' | 'yaklasiyor' | 'normal';

export function aciliyet(kalan: number | null): Aciliyet {
  if (kalan === null) return 'normal';
  if (kalan < 0) return 'gecmis';
  if (kalan <= 7) return 'kritik';
  if (kalan <= 30) return 'uyari';
  if (kalan <= 90) return 'yaklasiyor';
  return 'normal';
}

/** ISO (YYYY-MM-DD) tarihi spesifikasyondaki GG.AA.YYYY biçimine çevirir. */
export function formatTarih(iso?: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  const gun = String(d.getDate()).padStart(2, '0');
  const ay = String(d.getMonth() + 1).padStart(2, '0');
  return `${gun}.${ay}.${d.getFullYear()}`;
}

/** Tutarı Türk biçiminde gösterir: 15.000,00 */
export function formatTutar(value?: number): string {
  if (value === undefined || value === null || Number.isNaN(value)) return '—';
  return value.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/**
 * Türk cep telefonunu WhatsApp'ın beklediği biçime çevirir: `905XXXXXXXXX`.
 *
 * Kabul edilen girdiler: `0(532) 111 22 33`, `0532 111 22 33`, `532 111 22 33`,
 * `+90 532 111 22 33`, `90532...`. Cep numarası olmayan (5 ile başlamayan) veya
 * hane sayısı tutmayan girdilerde `null` döner — çağıran taraf butonu kapatmalıdır.
 */
export function toWhatsAppNumber(raw?: string): string | null {
  if (!raw) return null;
  let d = raw.replace(/\D/g, '');

  if (d.startsWith('90') && d.length === 12) d = d.slice(2);
  else if (d.startsWith('0') && d.length === 11) d = d.slice(1);

  // Kalan 10 hane ve cep numarası olmalı (5 ile başlar).
  if (d.length !== 10 || !d.startsWith('5')) return null;
  return `90${d}`;
}

/** Müşterinin ekranda gösterilecek adı. Tip'e göre değişir. */
export function musteriAdi(customer: Customer): string {
  if (customer.tip === 'kurumsal') {
    return customer.firmaUnvani?.trim() || customer.markaAdi?.trim() || 'İsimsiz kurum';
  }
  const ad = [customer.ad, customer.soyad].filter(Boolean).join(' ').trim();
  return ad || 'İsimsiz müşteri';
}

/**
 * Spesifikasyondaki biçim kuralları:
 * - Ad: yalnızca ilk harfler büyük (Mehmet Mesut)
 * - Soyad: tamamı büyük (YILMAZ)
 */
export function bicimlendirAd(value: string): string {
  return value
    .trim()
    .toLocaleLowerCase('tr-TR')
    .split(/\s+/)
    .filter(Boolean)
    .map((k) => k.charAt(0).toLocaleUpperCase('tr-TR') + k.slice(1))
    .join(' ');
}

export function bicimlendirSoyad(value: string): string {
  return value.trim().toLocaleUpperCase('tr-TR').replace(/\s+/g, ' ');
}

/** TCKN doğrulaması — 11 hane, ilk hane 0 olamaz, resmî kontrol algoritması. */
export function tcKimlikGecerliMi(value: string): boolean {
  const d = value.replace(/\D/g, '');
  if (d.length !== 11 || d[0] === '0') return false;

  const h = d.split('').map(Number);
  const tek = h[0] + h[2] + h[4] + h[6] + h[8];
  const cift = h[1] + h[3] + h[5] + h[7];
  if ((tek * 7 - cift) % 10 !== h[9]) return false;

  const ilkOn = h.slice(0, 10).reduce((a, b) => a + b, 0);
  return ilkOn % 10 === h[10];
}

/** Varsayılan hatırlatma metni. `{...}` yer tutucuları doldurulur. */
export const VARSAYILAN_HATIRLATMA_METNI =
  'Sayın {musteri}, {sirket} {brans} poliçeniz ({policeNo}) {bitis} tarihinde sona eriyor. ' +
  'Yenileme ve fiyat karşılaştırması için bize dönebilirsiniz. İyi günler dileriz. — Veli Sigorta';

export interface HatirlatmaBaglami {
  musteri: string;
  sirket: string;
  brans: string;
  policeNo: string;
  bitis: string;
  kalanGun: string;
}

/**
 * Şablondaki yer tutucuları doldurur. Bilinmeyen yer tutucular olduğu gibi
 * bırakılır — sessizce boş metin üretmek yerine sorun görünür kalsın.
 */
export function hatirlatmaMetniOlustur(sablon: string, ctx: HatirlatmaBaglami): string {
  return sablon.replace(/\{(\w+)\}/g, (tam, anahtar: string) =>
    anahtar in ctx ? String(ctx[anahtar as keyof HatirlatmaBaglami]) : tam,
  );
}

/** Hazır mesajla WhatsApp sohbetini açan bağlantı. Numara geçersizse `null`. */
export function whatsappBaglantisi(telefon: string | undefined, mesaj: string): string | null {
  const numara = toWhatsAppNumber(telefon);
  if (!numara) return null;
  return `https://wa.me/${numara}?text=${encodeURIComponent(mesaj)}`;
}

/**
 * Poliçenin branş alanlarından plakayı çıkarır.
 *
 * Plaka veritabanında `bransAlanlari` sözlüğünde AYRI bir değer olarak durur ama
 * ekranda `riskTanimi` cümlesine gömülü gösteriliyordu ("07 MMY 68 · BYD SEAL U
 * DM-İ (2025)"); kopyalamak için elle seçmek gerekiyordu.
 *
 * Alan adları branş formundan geldiği için serbest metin; anahtar büyük/küçük
 * harf farkıyla yazılmış olabilir. Türkçe katlama kullanılır — `toLowerCase()`
 * "PLAKA" içindeki I'yı "i" yapar ve "plaka" ile eşleşmez.
 */
export function plakayiBul(bransAlanlari: Record<string, string> | undefined): string | undefined {
  if (!bransAlanlari) return undefined;
  const anahtar = Object.keys(bransAlanlari).find(
    (k) => k.trim().toLocaleLowerCase('tr-TR') === 'plaka',
  );
  const deger = anahtar ? bransAlanlari[anahtar]?.trim() : '';
  return deger || undefined;
}

/**
 * Risk tanımından baştaki plaka kopyasını ayıklar.
 *
 * Plaka ayrı gösterildiğinde satırda iki kez yazılmasın diye. Tanım plakayla
 * BAŞLAMIYORSA metne dokunulmaz; aksi hâlde farklı biçimde kurulmuş bir tanımın
 * ortasından parça silinebilirdi.
 */
export function riskTanimiPlakasiz(riskTanimi?: string, plaka?: string): string | undefined {
  const tanim = riskTanimi?.trim();
  if (!tanim || !plaka || !tanim.startsWith(plaka)) return tanim || undefined;
  return tanim.slice(plaka.length).replace(/^\s*·\s*/, '').trim() || undefined;
}
