import { randomUUID } from 'node:crypto';
import type { CorporateContact, Customer, Policy, PolicyStatus, YaklasanBitis } from './types';
import {
  boolCoz,
  calistir,
  dateToIso,
  islem,
  isoToDate,
  jsonCoz,
  metinVeyaNull,
  sayiVeyaUndefined,
  sorgula,
  type SorguParametresi,
  tarihVeyaNull,
  tekSatir,
} from './mysql';

/**
 * Müşteri ve poliçe deposu.
 *
 * Bu iki tablo yıllar içinde büyüyecek asıl operasyonel veridir; hiçbir zaman tamamı
 * belleğe alınmaz. Poliçe bitiş takibi, arama ve sayfalama veritabanında indeks
 * üzerinden yapılır.
 */

// --- Eşleme ------------------------------------------------------------------

function satirdanMusteri(r: Record<string, unknown>): Customer {
  return {
    id: String(r.id),
    musteriNo: String(r.musteri_no),
    tip: r.tip === 'kurumsal' ? 'kurumsal' : 'bireysel',
    tcKimlikNo: r.tc_kimlik_no ? String(r.tc_kimlik_no) : undefined,
    yabanciKimlikNo: r.yabanci_kimlik_no ? String(r.yabanci_kimlik_no) : undefined,
    ad: r.ad ? String(r.ad) : undefined,
    soyad: r.soyad ? String(r.soyad) : undefined,
    dogumTarihi: r.dogum_tarihi ? String(r.dogum_tarihi) : undefined,
    cinsiyet: r.cinsiyet ? String(r.cinsiyet) : undefined,
    uyruk: r.uyruk ? String(r.uyruk) : undefined,
    meslek: r.meslek ? String(r.meslek) : undefined,
    vergiNo: r.vergi_no ? String(r.vergi_no) : undefined,
    vergiDairesi: r.vergi_dairesi ? String(r.vergi_dairesi) : undefined,
    firmaUnvani: r.firma_unvani ? String(r.firma_unvani) : undefined,
    markaAdi: r.marka_adi ? String(r.marka_adi) : undefined,
    mersisNo: r.mersis_no ? String(r.mersis_no) : undefined,
    naceKodu: r.nace_kodu ? String(r.nace_kodu) : undefined,
    faaliyetKonusu: r.faaliyet_konusu ? String(r.faaliyet_konusu) : undefined,
    calisanSayisi: sayiVeyaUndefined(r.calisan_sayisi),
    mobilTelefon: r.mobil_telefon ? String(r.mobil_telefon) : undefined,
    sabitTelefon: r.sabit_telefon ? String(r.sabit_telefon) : undefined,
    email: r.email ? String(r.email) : undefined,
    il: r.il ? String(r.il) : undefined,
    ilce: r.ilce ? String(r.ilce) : undefined,
    acikAdres: r.acik_adres ? String(r.acik_adres) : undefined,
    uavtKodu: r.uavt_kodu ? String(r.uavt_kodu) : undefined,
    musteriTemsilcisi: r.musteri_temsilcisi ? String(r.musteri_temsilcisi) : undefined,
    notlar: r.notlar ? String(r.notlar) : undefined,
    yetkililer: jsonCoz<CorporateContact[]>(r.yetkililer, []),
    isActive: boolCoz(r.is_active),
    createdAt: dateToIso(r.created_at),
    updatedAt: dateToIso(r.updated_at),
  };
}

function satirdanPolice(r: Record<string, unknown>): Policy {
  return {
    id: String(r.id),
    musteriId: String(r.musteri_id),
    sigortaliAdi: r.sigortali_adi ? String(r.sigortali_adi) : undefined,
    sigortaSirketi: String(r.sigorta_sirketi),
    sigortaTuru: String(r.sigorta_turu),
    policeNo: String(r.police_no),
    yenilemeNo: r.yenileme_no ? String(r.yenileme_no) : undefined,
    zeyilNo: r.zeyil_no ? String(r.zeyil_no) : undefined,
    duzenlemeTarihi: r.duzenleme_tarihi ? String(r.duzenleme_tarihi) : undefined,
    baslangicTarihi: String(r.baslangic_tarihi),
    bitisTarihi: String(r.bitis_tarihi),
    durum: String(r.durum) as PolicyStatus,
    yenilemeMi: boolCoz(r.yenileme_mi),
    oncekiPoliceNo: r.onceki_police_no ? String(r.onceki_police_no) : undefined,
    brutPrim: sayiVeyaUndefined(r.brut_prim),
    netPrim: sayiVeyaUndefined(r.net_prim),
    komisyonOrani: sayiVeyaUndefined(r.komisyon_orani),
    komisyonTutari: sayiVeyaUndefined(r.komisyon_tutari),
    paraBirimi: r.para_birimi ? String(r.para_birimi) : undefined,
    odemeSekli: r.odeme_sekli ? String(r.odeme_sekli) : undefined,
    taksitSayisi: sayiVeyaUndefined(r.taksit_sayisi),
    tahsilatDurumu: r.tahsilat_durumu ? String(r.tahsilat_durumu) : undefined,
    riskTanimi: r.risk_tanimi ? String(r.risk_tanimi) : undefined,
    bransAlanlari: jsonCoz<Record<string, string> | undefined>(r.brans_alanlari, undefined),
    policePdfUrl: r.police_pdf_url ? String(r.police_pdf_url) : undefined,
    sorumluPersonel: r.sorumlu_personel ? String(r.sorumlu_personel) : undefined,
    notlar: r.notlar ? String(r.notlar) : undefined,
    createdAt: dateToIso(r.created_at),
    updatedAt: dateToIso(r.updated_at),
  };
}

// --- Müşteriler --------------------------------------------------------------

export async function musterileriGetir(): Promise<Customer[]> {
  const satirlar = await sorgula('SELECT * FROM customers ORDER BY musteri_no');
  return satirlar.map(satirdanMusteri);
}

export async function musteriGetir(id: string): Promise<Customer | null> {
  const satir = await tekSatir('SELECT * FROM customers WHERE id = ?', [id]);
  return satir ? satirdanMusteri(satir) : null;
}

/**
 * Sıradaki müşteri numarasını üretir (M-00001, M-00002 …).
 *
 * Veritabanındaki en büyük numaraya bakar; kayıt sayısına bakılsaydı bir müşteri
 * silindikten sonra üretilen numara mevcut bir kayıtla çakışırdı. Çağıran taraf bunu
 * bir işlem (transaction) içinde kullanmalıdır ki iki eşzamanlı kayıt aynı numarayı almasın.
 */
export async function sonrakiMusteriNoUret(): Promise<string> {
  const satir = await tekSatir(
    `SELECT MAX(CAST(SUBSTRING(musteri_no, 3) AS UNSIGNED)) AS enBuyuk
     FROM customers WHERE musteri_no REGEXP '^M-[0-9]+$'`,
  );
  const enBuyuk = Number(satir?.enBuyuk ?? 0) || 0;
  return `M-${String(enBuyuk + 1).padStart(5, '0')}`;
}

export async function musteriKaydet(m: Customer): Promise<Customer> {
  return islem(async (baglanti) => {
    const yeni = !m.id || m.id === 'yeni';
    const id = yeni ? `cust-${randomUUID()}` : m.id;

    let musteriNo = (m.musteriNo || '').trim();
    if (!musteriNo) {
      // Numara işlem içinde üretilir: iki yönetici aynı anda kaydetse bile
      // satır kilidi sayesinde ikisi aynı numarayı alamaz.
      const [satirlar] = await baglanti.execute(
        `SELECT MAX(CAST(SUBSTRING(musteri_no, 3) AS UNSIGNED)) AS enBuyuk
         FROM customers WHERE musteri_no REGEXP '^M-[0-9]+$' FOR UPDATE`,
      );
      const enBuyuk = Number((satirlar as Record<string, unknown>[])[0]?.enBuyuk ?? 0) || 0;
      musteriNo = `M-${String(enBuyuk + 1).padStart(5, '0')}`;
    }

    await baglanti.execute(
      `INSERT INTO customers (
         id, musteri_no, tip, tc_kimlik_no, yabanci_kimlik_no, ad, soyad, dogum_tarihi,
         cinsiyet, uyruk, meslek, vergi_no, vergi_dairesi, firma_unvani, marka_adi, mersis_no,
         nace_kodu, faaliyet_konusu, calisan_sayisi, mobil_telefon, sabit_telefon, email,
         il, ilce, acik_adres, uavt_kodu, musteri_temsilcisi, notlar, yetkililer, is_active,
         created_at, updated_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, UTC_TIMESTAMP(3))
       ON DUPLICATE KEY UPDATE
         tip = VALUES(tip), tc_kimlik_no = VALUES(tc_kimlik_no),
         yabanci_kimlik_no = VALUES(yabanci_kimlik_no), ad = VALUES(ad), soyad = VALUES(soyad),
         dogum_tarihi = VALUES(dogum_tarihi), cinsiyet = VALUES(cinsiyet), uyruk = VALUES(uyruk),
         meslek = VALUES(meslek), vergi_no = VALUES(vergi_no), vergi_dairesi = VALUES(vergi_dairesi),
         firma_unvani = VALUES(firma_unvani), marka_adi = VALUES(marka_adi),
         mersis_no = VALUES(mersis_no), nace_kodu = VALUES(nace_kodu),
         faaliyet_konusu = VALUES(faaliyet_konusu), calisan_sayisi = VALUES(calisan_sayisi),
         mobil_telefon = VALUES(mobil_telefon), sabit_telefon = VALUES(sabit_telefon),
         email = VALUES(email), il = VALUES(il), ilce = VALUES(ilce),
         acik_adres = VALUES(acik_adres), uavt_kodu = VALUES(uavt_kodu),
         musteri_temsilcisi = VALUES(musteri_temsilcisi), notlar = VALUES(notlar),
         yetkililer = VALUES(yetkililer), is_active = VALUES(is_active),
         updated_at = UTC_TIMESTAMP(3)`,
      [
        id, musteriNo, m.tip,
        metinVeyaNull(m.tcKimlikNo), metinVeyaNull(m.yabanciKimlikNo),
        metinVeyaNull(m.ad), metinVeyaNull(m.soyad), tarihVeyaNull(m.dogumTarihi),
        metinVeyaNull(m.cinsiyet), metinVeyaNull(m.uyruk), metinVeyaNull(m.meslek),
        metinVeyaNull(m.vergiNo), metinVeyaNull(m.vergiDairesi), metinVeyaNull(m.firmaUnvani),
        metinVeyaNull(m.markaAdi), metinVeyaNull(m.mersisNo), metinVeyaNull(m.naceKodu),
        metinVeyaNull(m.faaliyetKonusu), m.calisanSayisi ?? null,
        metinVeyaNull(m.mobilTelefon), metinVeyaNull(m.sabitTelefon), metinVeyaNull(m.email),
        metinVeyaNull(m.il), metinVeyaNull(m.ilce), metinVeyaNull(m.acikAdres),
        metinVeyaNull(m.uavtKodu), metinVeyaNull(m.musteriTemsilcisi), metinVeyaNull(m.notlar),
        JSON.stringify(m.tip === 'kurumsal' ? m.yetkililer ?? [] : []),
        m.isActive === false ? 0 : 1,
        isoToDate(m.createdAt),
      ],
    );

    const [satirlar] = await baglanti.execute('SELECT * FROM customers WHERE id = ?', [id]);
    return satirdanMusteri((satirlar as Record<string, unknown>[])[0]);
  });
}

/** Müşteriyi siler. Bağlı poliçe varsa yabancı anahtar kısıtı silmeyi engeller. */
export async function musteriSil(id: string): Promise<{ silindi: boolean; bagliPolice: number }> {
  const sayim = await tekSatir('SELECT COUNT(*) AS adet FROM policies WHERE musteri_id = ?', [id]);
  const bagliPolice = Number(sayim?.adet ?? 0);
  if (bagliPolice > 0) return { silindi: false, bagliPolice };

  const { etkilenen } = await calistir('DELETE FROM customers WHERE id = ?', [id]);
  return { silindi: etkilenen > 0, bagliPolice: 0 };
}

/** Müşteri başına poliçe sayısı — listede rozet olarak gösterilir. */
export async function musteriBasinaPoliceSayisi(): Promise<Record<string, number>> {
  const satirlar = await sorgula(
    'SELECT musteri_id, COUNT(*) AS adet FROM policies GROUP BY musteri_id',
  );
  const harita: Record<string, number> = {};
  satirlar.forEach((r) => { harita[String(r.musteri_id)] = Number(r.adet); });
  return harita;
}

/** Aynı kimlik/vergi no/cep numarasıyla kayıtlı başka müşteri var mı? */
export async function benzerMusteriAra(
  aday: { id?: string; tcKimlikNo?: string; vergiNo?: string; mobilTelefon?: string },
): Promise<Customer | null> {
  const kosullar: string[] = [];
  const parametreler: SorguParametresi[] = [];

  if (aday.tcKimlikNo?.trim()) { kosullar.push('tc_kimlik_no = ?'); parametreler.push(aday.tcKimlikNo.trim()); }
  if (aday.vergiNo?.trim()) { kosullar.push('vergi_no = ?'); parametreler.push(aday.vergiNo.trim()); }

  const telefon = (aday.mobilTelefon || '').replace(/\D/g, '').slice(-10);
  if (telefon.length === 10) {
    // Numaralar farklı biçimlerde saklanabildiği için rakamlar üzerinden karşılaştırılır.
    kosullar.push("RIGHT(REGEXP_REPLACE(COALESCE(mobil_telefon, ''), '[^0-9]', ''), 10) = ?");
    parametreler.push(telefon);
  }

  if (kosullar.length === 0) return null;

  let sql = `SELECT * FROM customers WHERE (${kosullar.join(' OR ')})`;
  if (aday.id && aday.id !== 'yeni') {
    sql += ' AND id <> ?';
    parametreler.push(aday.id);
  }
  sql += ' LIMIT 1';

  const satir = await tekSatir(sql, parametreler);
  return satir ? satirdanMusteri(satir) : null;
}

// --- Poliçeler ---------------------------------------------------------------

export async function policeleriGetir(): Promise<Policy[]> {
  const satirlar = await sorgula('SELECT * FROM policies ORDER BY bitis_tarihi');
  return satirlar.map(satirdanPolice);
}

export async function policeGetir(id: string): Promise<Policy | null> {
  const satir = await tekSatir('SELECT * FROM policies WHERE id = ?', [id]);
  return satir ? satirdanPolice(satir) : null;
}

/**
 * Bitiş tarihine göre poliçe sayar. Panel özet kartlarındaki rakamlar bundan gelir;
 * tüm poliçeleri belleğe alıp JS'te süzmek yerine indeksten sayılır.
 */
export async function bitisAraligindaSay(gunBaslangic: number, gunBitis: number): Promise<number> {
  const satir = await tekSatir(
    `SELECT COUNT(*) AS adet FROM policies
     WHERE bitis_tarihi BETWEEN DATE_ADD(CURDATE(), INTERVAL ? DAY) AND DATE_ADD(CURDATE(), INTERVAL ? DAY)`,
    [gunBaslangic, gunBitis],
  );
  return Number(satir?.adet ?? 0);
}

/**
 * Yenileme takibi için yaklaşan bitişler.
 *
 * NEDEN AYRI SORGU: Özet panel bunun için tüm poliçe ve müşteri tablosunu indirmek
 * zorunda kalmasın. Müşteri kaydı T.C. kimlik ve vergi numarası taşıyor; bu ekranda
 * yalnız ad ile cep numarası gerekiyor. `ix_policies_durum_bitis` indeksi kullanılır.
 *
 * Aralık BİR GÜN GERİDEN başlar: sunucunun takvim günü ile tarayıcınınki saat dilimi
 * yüzünden kayabilir. Kesin "kalan gün" kararını istemci `lib/police.ts` ile verir;
 * sorgu yalnızca aday kümeyi daraltır.
 *
 * Yalnız 'Aktif' poliçeler döner: yenilenmiş ya da iptal edilmiş bir poliçe için
 * müşteriyi aramak yanlış olurdu.
 */
export async function yaklasanBitisleriGetir(gun: number): Promise<YaklasanBitis[]> {
  const satirlar = await sorgula(
    `SELECT p.id, p.police_no, p.sigorta_sirketi, p.sigorta_turu, p.bitis_tarihi,
            c.id AS musteri_id, c.tip, c.ad, c.soyad, c.firma_unvani, c.marka_adi,
            c.mobil_telefon
       FROM policies p
       JOIN customers c ON c.id = p.musteri_id
      WHERE p.durum = 'Aktif'
        AND p.bitis_tarihi BETWEEN DATE_SUB(CURDATE(), INTERVAL 1 DAY)
                               AND DATE_ADD(CURDATE(), INTERVAL ? DAY)
      ORDER BY p.bitis_tarihi
      LIMIT 500`,
    [gun],
  );

  return satirlar.map((r) => ({
    policeId: String(r.id),
    policeNo: String(r.police_no ?? ''),
    sigortaSirketi: String(r.sigorta_sirketi ?? ''),
    sigortaTuru: String(r.sigorta_turu ?? ''),
    bitisTarihi: String(r.bitis_tarihi),
    musteri: {
      id: String(r.musteri_id),
      tip: r.tip === 'kurumsal' ? 'kurumsal' : 'bireysel',
      ad: r.ad ? String(r.ad) : undefined,
      soyad: r.soyad ? String(r.soyad) : undefined,
      firmaUnvani: r.firma_unvani ? String(r.firma_unvani) : undefined,
      markaAdi: r.marka_adi ? String(r.marka_adi) : undefined,
      mobilTelefon: r.mobil_telefon ? String(r.mobil_telefon) : undefined,
    },
  }));
}

export async function policeKaydet(p: Policy): Promise<Policy> {
  const yeni = !p.id || p.id === 'yeni';
  const id = yeni ? `pol-${randomUUID()}` : p.id;

  await calistir(
    `INSERT INTO policies (
       id, musteri_id, sigortali_adi, sigorta_sirketi, sigorta_turu, police_no, yenileme_no,
       zeyil_no, duzenleme_tarihi, baslangic_tarihi, bitis_tarihi, durum, yenileme_mi,
       onceki_police_no, brut_prim, net_prim, komisyon_orani, komisyon_tutari, para_birimi,
       odeme_sekli, taksit_sayisi, tahsilat_durumu, risk_tanimi, brans_alanlari,
       police_pdf_url, sorumlu_personel, notlar, created_at, updated_at
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, UTC_TIMESTAMP(3))
     ON DUPLICATE KEY UPDATE
       musteri_id = VALUES(musteri_id), sigortali_adi = VALUES(sigortali_adi),
       sigorta_sirketi = VALUES(sigorta_sirketi), sigorta_turu = VALUES(sigorta_turu),
       police_no = VALUES(police_no), yenileme_no = VALUES(yenileme_no), zeyil_no = VALUES(zeyil_no),
       duzenleme_tarihi = VALUES(duzenleme_tarihi), baslangic_tarihi = VALUES(baslangic_tarihi),
       bitis_tarihi = VALUES(bitis_tarihi), durum = VALUES(durum), yenileme_mi = VALUES(yenileme_mi),
       onceki_police_no = VALUES(onceki_police_no), brut_prim = VALUES(brut_prim),
       net_prim = VALUES(net_prim), komisyon_orani = VALUES(komisyon_orani),
       komisyon_tutari = VALUES(komisyon_tutari), para_birimi = VALUES(para_birimi),
       odeme_sekli = VALUES(odeme_sekli), taksit_sayisi = VALUES(taksit_sayisi),
       tahsilat_durumu = VALUES(tahsilat_durumu), risk_tanimi = VALUES(risk_tanimi),
       brans_alanlari = VALUES(brans_alanlari), police_pdf_url = VALUES(police_pdf_url),
       sorumlu_personel = VALUES(sorumlu_personel), notlar = VALUES(notlar),
       updated_at = UTC_TIMESTAMP(3)`,
    [
      id, p.musteriId, metinVeyaNull(p.sigortaliAdi), p.sigortaSirketi, p.sigortaTuru,
      p.policeNo, metinVeyaNull(p.yenilemeNo), metinVeyaNull(p.zeyilNo),
      tarihVeyaNull(p.duzenlemeTarihi), tarihVeyaNull(p.baslangicTarihi) ?? p.baslangicTarihi,
      tarihVeyaNull(p.bitisTarihi) ?? p.bitisTarihi, p.durum, p.yenilemeMi ? 1 : 0,
      metinVeyaNull(p.oncekiPoliceNo), p.brutPrim ?? null, p.netPrim ?? null,
      p.komisyonOrani ?? null, p.komisyonTutari ?? null, metinVeyaNull(p.paraBirimi),
      metinVeyaNull(p.odemeSekli), p.taksitSayisi ?? null, metinVeyaNull(p.tahsilatDurumu),
      metinVeyaNull(p.riskTanimi),
      p.bransAlanlari ? JSON.stringify(p.bransAlanlari) : null,
      metinVeyaNull(p.policePdfUrl), metinVeyaNull(p.sorumluPersonel), metinVeyaNull(p.notlar),
      isoToDate(p.createdAt),
    ],
  );

  const kayit = await policeGetir(id);
  if (!kayit) throw new Error('Poliçe kaydedildi ama geri okunamadı.');
  return kayit;
}

export async function policeSil(id: string): Promise<boolean> {
  const { etkilenen } = await calistir('DELETE FROM policies WHERE id = ?', [id]);
  return etkilenen > 0;
}

/** Bir müşterinin var olup olmadığını kontrol eder (poliçe kaydederken gerekir). */
export async function musteriVarMi(id: string): Promise<boolean> {
  const satir = await tekSatir('SELECT id FROM customers WHERE id = ? LIMIT 1', [id]);
  return satir !== null;
}

/** Kaydın son güncelleme zamanı — iyimser çakışma denetimi için. */
export async function guncellemeZamani(
  tablo: 'customers' | 'policies',
  id: string,
): Promise<Date | null> {
  const satir = await tekSatir(`SELECT updated_at FROM ${tablo} WHERE id = ?`, [id]);
  if (!satir) return null;
  return satir.updated_at instanceof Date ? satir.updated_at : new Date(String(satir.updated_at));
}
