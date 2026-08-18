/**
 * Müşteri arama kuralı — panelde müşteri arayan her yer bunu kullanır.
 *
 * Kural tek yerde tutulur: müşteriler listesindeki arama kutusu ile poliçe formundaki
 * açılır seçici farklı davranırsa, kullanıcı bir ekranda bulduğu kaydı diğerinde
 * bulamayıp kaydın silindiğini sanıyor.
 *
 * Dört davranış bilinçli tercih:
 *
 * 1. **Türkçe harfler katlanır.** Yalnız `toLocaleLowerCase('tr-TR')` yetmiyor:
 *    "YILMAZ" küçüldüğünde noktasız "yılmaz" olur, standart klavyeyle yazılan
 *    "yilmaz" ise noktalı kalır ve eşleşme tutmaz. Aynı tuzak "Istanbul"/"İstanbul"
 *    ve "ISIK"/"IŞIK" çiftlerinde de var. Personel kaydı bulamayıp mükerrer müşteri
 *    açtığı için bu, arama kutusunun en pahalı hatasıydı.
 *
 * 2. **Kelimeler ayrı ayrı aranır (VE mantığı).** "mehmet yılmaz" yazan biri
 *    "Mehmet Mesut YILMAZ" kaydını bulabilmeli; düz `includes` aradaki "Mesut"
 *    yüzünden eşleşmezdi.
 *
 * 3. **Telefon biçimi ve ülke kodu önemsizdir.** Kayıt "0(530) 730 20 02";
 *    WhatsApp'tan kopyalanan numara "+90 530 730 20 02". İkisi de son 10 haneye
 *    indirgenip karşılaştırılır. Tamamı rakam ve telefon noktalamasından oluşan
 *    sorgu TEK parça sayılır — boşluklardan bölünseydi "+90" parçası hiçbir alanda
 *    bulunamayıp tüm sorguyu düşürürdü.
 *
 * 4. **Rakam karşılaştırması alan alan yapılır**, tüm alanlar birleştirilerek değil —
 *    yoksa müşteri numarasının sonu ile kimlik numarasının başı yan yana gelip
 *    var olmayan bir eşleşme üretiyordu.
 */

import { musteriAdi } from './police';
import { TELEFON_BICIMI, telefonSadelestir } from './telefon';
import { aramaNormalize } from './turkce';
import type { Customer } from './types';

// Harf katlama kuralı `lib/turkce.ts` içinde: panelin bütün arama kutuları
// (müşteri, poliçe, teklif, günlük, içerik) aynı kaynağı kullanıyor. Buradan
// yeniden dışa verilir; müşteri aramasını içe aktaran yerler ikinci bir modül
// eklemek zorunda kalmasın.
export { aramaNormalize };

/** Serbest metin olarak taranan alanlar. */
function metinAlanlari(c: Customer): string[] {
  return [
    musteriAdi(c), c.musteriNo, c.tcKimlikNo, c.yabanciKimlikNo, c.vergiNo,
    c.firmaUnvani, c.markaAdi, c.mobilTelefon, c.sabitTelefon, c.email,
    c.il, c.ilce,
  ].filter((v): v is string => Boolean(v && String(v).trim()));
}

/**
 * Yalnız rakam içeren karşılaştırma için kullanılan alanlar.
 * Telefonlar hem ham hem 10 haneye indirgenmiş biçimiyle döner.
 */
function rakamAlanlari(c: Customer): string[] {
  const kimlikler = [c.musteriNo, c.tcKimlikNo, c.yabanciKimlikNo, c.vergiNo]
    .map((v) => (v || '').replace(/\D/g, ''))
    .filter(Boolean);

  const telefonlar = [c.mobilTelefon, c.sabitTelefon]
    .map((v) => (v || '').replace(/\D/g, ''))
    .filter(Boolean)
    .flatMap((rakam) => [rakam, telefonSadelestir(rakam)]);

  return [...kimlikler, ...telefonlar];
}

/** Verilen rakam dizisi müşterinin numara alanlarından birinde geçiyor mu? */
function rakamEslesiyorMu(c: Customer, rakam: string): boolean {
  const sade = telefonSadelestir(rakam);
  return rakamAlanlari(c).some((alan) => alan.includes(rakam) || alan.includes(sade));
}

/** Sorgudaki her kelime müşterinin bir alanında geçiyor mu? */
export function musteriEslesiyorMu(c: Customer, sorgu: string): boolean {
  const ham = sorgu.trim();
  if (!ham) return true;

  // Telefon biçimli sorgu bölünmeden, tek parça olarak aranır.
  if (TELEFON_BICIMI.test(ham)) {
    const rakam = ham.replace(/\D/g, '');
    if (rakam) return rakamEslesiyorMu(c, rakam);
  }

  const kelimeler = aramaNormalize(ham).split(/\s+/).filter(Boolean);
  if (kelimeler.length === 0) return true;

  const metin = aramaNormalize(metinAlanlari(c).join(' '));

  return kelimeler.every((kelime) => {
    if (metin.includes(kelime)) return true;

    // Yalnız tamamen rakamdan oluşan kelimeler biçimsiz karşılaştırmaya girer;
    // "07mmy" gibi harf içeren bir plaka parçasının numaralara denk gelmesini
    // istemiyoruz.
    const sadeceRakam = kelime.replace(/\D/g, '');
    if (!sadeceRakam || sadeceRakam !== kelime) return false;

    return rakamEslesiyorMu(c, sadeceRakam);
  });
}

/**
 * Eşleşmeyi ne kadar "iyi" saydığımız — küçük olan üste çıkar.
 *
 * Adın başından eşleşenler önce gelir: "meh" yazan kişi büyük ihtimalle Mehmet'i
 * arıyordur, notunda "mehmet" geçen başka bir kaydı değil.
 */
function siraPuani(normalAd: string, normalSorgu: string): number {
  if (!normalSorgu) return 1;
  if (normalAd.startsWith(normalSorgu)) return 0;
  if (normalAd.includes(normalSorgu)) return 1;
  return 2;
}

/**
 * Modül düzeyinde tek karşılaştırıcı.
 *
 * `localeCompare(..., 'tr-TR')` her çağrıda yerel ayar çözümlemesi yapar;
 * karşılaştırıcının kendisi sıralama boyunca binlerce kez çağrıldığı için bir
 * kez kurulup yeniden kullanılır.
 */
const KARSILASTIRICI = new Intl.Collator('tr-TR');

export interface MusteriAramaSonucu {
  /** Gösterilecek kayıtlar (en fazla `limit` tane). */
  sonuclar: Customer[];
  /** Eşleşen toplam kayıt sayısı — kırpıldığında kullanıcıya söylenir. */
  toplam: number;
}

/**
 * Müşterileri filtreler, en iyi eşleşmeler üstte olacak şekilde sıralar ve listeyi
 * kırpar.
 *
 * Sıralama anahtarları kayıt başına BİR KEZ hesaplanır (Schwartzian dönüşümü).
 * Karşılaştırıcının içinde hesaplamak, 5000 kayıtlık bir portföyde her tuş
 * vuruşunda ~160 ms'lik bir sıralamaya yol açıyordu; anahtarlar önceden
 * çıkarılınca aynı iş ~13 ms'ye iniyor.
 *
 * Kırpma sessiz değildir: `toplam` her zaman gerçek sayıyı taşır, çağıran taraf
 * "listede daha çok kayıt var" uyarısını gösterir. Sessiz kırpma, kullanıcının
 * aradığı kaydın var olmadığı sonucuna varmasına yol açardı.
 */
export function musterileriAra(
  musteriler: readonly Customer[],
  sorgu: string,
  limit: number,
): MusteriAramaSonucu {
  const normalSorgu = aramaNormalize(sorgu.trim());

  const anahtarli = musteriler
    .filter((c) => musteriEslesiyorMu(c, sorgu))
    .map((c) => {
      const ad = musteriAdi(c);
      return { musteri: c, ad, puan: siraPuani(aramaNormalize(ad), normalSorgu) };
    });

  anahtarli.sort((a, b) => {
    // Alaka ÖNCE gelir. Aktiflik önce gelseydi, adı sorguyla birebir başlayan pasif
    // bir kayıt, notunda sorgu geçen tüm aktif kayıtların altına düşer; 50'lik
    // kırpmayla birleşince açılır listede hiç görünmez olurdu.
    if (a.puan !== b.puan) return a.puan - b.puan;
    if (a.musteri.isActive !== b.musteri.isActive) return a.musteri.isActive ? -1 : 1;
    return KARSILASTIRICI.compare(a.ad, b.ad);
  });

  return {
    sonuclar: anahtarli.slice(0, limit).map((x) => x.musteri),
    toplam: anahtarli.length,
  };
}
