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

/**
 * Aciliyet seviyesinin rozet sınıfları.
 *
 * Poliçe takibi ekranında yerel bir sabitti; yenileme panosu da aynı renk dilini
 * kullandığı için buraya taşındı. İki ekranda farklı renkler, aynı poliçeyi iki
 * yerde farklı aciliyette gösterirdi. `Record<Aciliyet, string>` tiplemesi eksik
 * seviyeyi derlemede yakalar.
 */
export const ACILIYET_STIL: Record<Aciliyet, string> = {
  gecmis: 'bg-slate-200 text-slate-700',
  kritik: 'bg-rose-100 text-rose-800',
  uyari: 'bg-amber-100 text-amber-800',
  yaklasiyor: 'bg-blue-100 text-blue-800',
  normal: 'bg-emerald-50 text-emerald-700',
};

/** Yenileme panosunun gün eşikleri; sıra dar → geniş ve bu sıra anlamlıdır. */
export const YENILEME_ESIKLERI = [7, 15, 30] as const;

/**
 * Panonun en geniş penceresi. Eşiklerden TÜRETİLİR: eşik listesi değişince
 * sunucudaki sorgu aralığını ayrıca güncellemek gerekmesin.
 */
export const YENILEME_PENCERESI_GUN = Math.max(...YENILEME_ESIKLERI);

/**
 * Poliçenin düştüğü EN DAR eşik.
 *
 * 5 gün kalan bir poliçe hem 7'ye hem 30'a girer; listede iki kez görünmemesi için
 * en acil kovaya yerleşir. Süresi geçmiş ya da pencere dışındaki poliçe için null
 * döner — pano yalnız "aranacaklar" listesidir, geçmiş poliçe takibinde durur.
 */
export function yenilemeEsigi(kalan: number | null): number | null {
  if (kalan === null || kalan < 0) return null;
  return YENILEME_ESIKLERI.find((esik) => kalan <= esik) ?? null;
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

/**
 * Müşterinin ekranda gösterilecek adı. Tip'e göre değişir.
 *
 * Parametre TAM `Customer` değil, ad üretimi için gereken alanlardır: yenileme
 * panosu kimlik numarası taşımayan hafif bir özet satırı kullanıyor ve aynı ad
 * kuralını ikinci kez yazmak zorunda kalmasın. Tam `Customer` geçen mevcut
 * çağrılar yapısal olarak bunu karşıladığı için hiçbiri değişmedi.
 */
export function musteriAdi(
  customer: Pick<Customer, 'tip' | 'ad' | 'soyad' | 'firmaUnvani' | 'markaAdi'>,
): string {
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

// --- Yenileme zinciri -------------------------------------------------------
//
// Müşterinin aynı riski yıl yıl yenileyip yenilemediğini görünür kılar. Bağ
// `oncekiPoliceNo` METNİ üzerinden kurulur: veritabanında poliçe numarası TEKİL
// DEĞİL ve tekliften çevrilen kayıtlarda boş olabiliyor. Bu yüzden boş numara hiç
// eşleşmez ve eşleşme aynı müşteriyle sınırlanır.

/** Zincirde kullanılabilir poliçe numarası; boş/boşluk numara bağ kurmaz. */
function zincirNosu(deger: string | undefined): string {
  return (deger || '').trim();
}

/** Bir poliçenin yenilemesi olduğu poliçeyi bulur. */
export function oncekiPoliceyiBul(police: Policy, adaylar: readonly Policy[]): Policy | undefined {
  const aranan = zincirNosu(police.oncekiPoliceNo);
  if (!police.yenilemeMi || !aranan) return undefined;

  const eslesenler = adaylar.filter(
    (a) => a.id !== police.id && a.musteriId === police.musteriId && zincirNosu(a.policeNo) === aranan,
  );
  if (eslesenler.length < 2) return eslesenler[0];

  // Numara tekil olmadığı için başka ayırt edici yok: yenilemenin başlangıcına
  // tarih olarak en yakın biten kayıt doğru öncekidir.
  const baslangic = Date.parse(police.baslangicTarihi);
  return [...eslesenler].sort(
    (a, b) =>
      Math.abs(Date.parse(a.bitisTarihi) - baslangic) - Math.abs(Date.parse(b.bitisTarihi) - baslangic),
  )[0];
}

/**
 * Poliçeleri yenileme zincirlerine ayırır; her zincir ESKİDEN YENİYE sıralıdır.
 *
 * Zincire girmeyen tek poliçeler de tek elemanlı zincir olarak döner ki çağıran
 * taraf listeyi ikiye bölmek zorunda kalmasın.
 */
export function yenilemeZincirleri(policeler: readonly Policy[]): Policy[][] {
  const oncekiId = new Map<string, string>();
  const sonraki = new Map<string, Policy>();

  for (const p of policeler) {
    const onceki = oncekiPoliceyiBul(p, policeler);
    if (!onceki) continue;

    const mevcut = sonraki.get(onceki.id);
    // Aynı poliçeyi iki kayıt birden "önceki" gösterebilir (veri hatası). Zincir
    // çatallanmasın diye erken başlayan devam sayılır, diğeri kendi zincirinin
    // başı olarak kalır.
    if (mevcut && Date.parse(mevcut.baslangicTarihi) <= Date.parse(p.baslangicTarihi)) continue;
    if (mevcut) oncekiId.delete(mevcut.id);
    sonraki.set(onceki.id, p);
    oncekiId.set(p.id, onceki.id);
  }

  const zincirler: Policy[][] = [];
  const ziyaret = new Set<string>();

  for (const kok of policeler.filter((p) => !oncekiId.has(p.id))) {
    const zincir: Policy[] = [];
    let imlec: Policy | undefined = kok;

    // Bozuk veride döngüsellik (A'nın devamı B, B'nin devamı A) tarayıcıyı
    // kilitlerdi; her poliçe zincire yalnız bir kez girer.
    while (imlec && !ziyaret.has(imlec.id)) {
      ziyaret.add(imlec.id);
      zincir.push(imlec);
      imlec = sonraki.get(imlec.id);
    }

    if (zincir.length > 0) zincirler.push(zincir);
  }

  // Kök bulunamayan kayıtlar buradan toplanır. Tam döngüde (A→B, B→A) HER poliçenin
  // bir öncekisi olur, yani hiç kök kalmaz ve döngüdeki poliçeler sessizce listeden
  // düşerdi — müşteri kartında poliçe kaybolması, gösterilememesinden çok daha kötü.
  for (const p of policeler) {
    if (ziyaret.has(p.id)) continue;
    ziyaret.add(p.id);
    zincirler.push([p]);
  }

  // Uzun zincirler önce: "kaç yıldır sürdürüyor" bilgisi en değerli olan.
  return zincirler.sort((a, b) => b.length - a.length);
}

/** Müşterinin kıdemi: ilk poliçesinin tarihi ve üzerinden geçen tam yıl. */
export interface MusteriKidemi {
  yil: number;
  ilkTarih: string;
}

/**
 * Müşteri kaç yıldır bizimle?
 *
 * İlk poliçenin BAŞLANGIÇ tarihinden bugüne geçen tam yıl sayılır. Poliçe yoksa
 * ya da hiçbirinin tarihi çözülemiyorsa null döner; çağıran taraf rozet basmaz.
 */
export function musteriKidemi(policeler: readonly Policy[], simdi: Date): MusteriKidemi | null {
  const tarihler = policeler
    .map((p) => Date.parse(p.baslangicTarihi))
    .filter((t) => !Number.isNaN(t));
  if (tarihler.length === 0) return null;

  const ilk = new Date(Math.min(...tarihler));
  let yil = simdi.getFullYear() - ilk.getFullYear();
  // Yıl dönümü henüz gelmediyse bir eksiği doğrudur: 11 ay önce gelen müşteriye
  // "1 yıldır bizimle" demek yanıltıcı.
  const donumGecti =
    simdi.getMonth() > ilk.getMonth() ||
    (simdi.getMonth() === ilk.getMonth() && simdi.getDate() >= ilk.getDate());
  if (!donumGecti) yil -= 1;

  return { yil: Math.max(0, yil), ilkTarih: ilk.toISOString().slice(0, 10) };
}

/**
 * Zincir kopmuş mu? (kayıp müşteri işareti)
 *
 * Zincirin SON poliçesinin süresi dolmuş ve yerine yenisi girilmemişse doğrudur.
 * İptal edilmiş poliçeler kayıp sayılmaz: müşteri zaten bilerek ayrılmış, hatırlatma
 * gönderilecek bir durum değil.
 */
export function zincirYenilenmedi(zincir: readonly Policy[], simdi: Date): boolean {
  const son = zincir[zincir.length - 1];
  if (!son || son.durum === 'İptal' || son.durum === 'Yenilendi') return false;

  const kalan = kalanGun(son.bitisTarihi, simdi);
  return kalan !== null && kalan < 0;
}
