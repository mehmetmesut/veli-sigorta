import assert from 'node:assert/strict';
import test from 'node:test';
import {
  EXPIRY_FILTERS,
  aciliyet,
  bicimlendirAd,
  bicimlendirSoyad,
  filtreyeUyuyorMu,
  formatTarih,
  hatirlatmaMetniOlustur,
  YENILEME_ESIKLERI,
  YENILEME_PENCERESI_GUN,
  kalanGun,
  musteriAdi,
  yenilemeEsigi,
  musteriKidemi,
  oncekiPoliceyiBul,
  yenilemeZincirleri,
  zincirYenilenmedi,
  tcKimlikGecerliMi,
  toWhatsAppNumber,
  whatsappBaglantisi,
} from '../lib/police';
import type { Policy } from '../lib/types';

/** Testler sabit bir "bugün" kullanır; aksi hâlde gece yarısı geçişinde kırılırlardı. */
const BUGUN = new Date(2026, 7, 14); // 14 Ağustos 2026, yerel saat

function police(bitisTarihi: string): Policy {
  return {
    id: 'p1', musteriId: 'c1', sigortaSirketi: 'X', sigortaTuru: 'Kasko',
    policeNo: 'PN-1', baslangicTarihi: '2026-01-01', bitisTarihi,
    durum: 'Aktif', yenilemeMi: false,
    createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z',
  };
}

test('kalanGun bugün biten poliçe için sıfır döner', () => {
  // Arrange & Act
  const sonuc = kalanGun('2026-08-14', BUGUN);

  // Assert
  assert.equal(sonuc, 0);
});

test('kalanGun geçmiş tarihlerde negatif, gelecekte pozitif döner', () => {
  assert.equal(kalanGun('2026-08-09', BUGUN), -5);
  assert.equal(kalanGun('2026-09-13', BUGUN), 30);
});

test('kalanGun geçersiz tarihte null döner', () => {
  assert.equal(kalanGun('', BUGUN), null);
  assert.equal(kalanGun('gecersiz', BUGUN), null);
});

test('yaklaşan filtreler süresi geçmiş poliçeleri dışarıda bırakır', () => {
  // Arrange
  const otuzGun = EXPIRY_FILTERS.find((f) => f.key === '30')!;

  // Act & Assert
  assert.equal(filtreyeUyuyorMu(police('2026-08-20'), otuzGun, BUGUN), true, 'altı gün kalan girmeli');
  assert.equal(filtreyeUyuyorMu(police('2026-08-14'), otuzGun, BUGUN), true, 'bugün biten girmeli');
  assert.equal(filtreyeUyuyorMu(police('2026-09-20'), otuzGun, BUGUN), false, '37 gün kalan girmemeli');
  assert.equal(filtreyeUyuyorMu(police('2026-08-13'), otuzGun, BUGUN), false, 'dün biten girmemeli');
});

test('"Son gün" filtresi yalnızca bugün biten poliçeyi getirir', () => {
  const sonGun = EXPIRY_FILTERS.find((f) => f.key === 'songun')!;

  assert.equal(filtreyeUyuyorMu(police('2026-08-14'), sonGun, BUGUN), true);
  assert.equal(filtreyeUyuyorMu(police('2026-08-15'), sonGun, BUGUN), false);
  assert.equal(filtreyeUyuyorMu(police('2026-08-13'), sonGun, BUGUN), false);
});

test('"Son 30 günde bitenler" yalnızca geçmiş aralığı kapsar', () => {
  const gecmis = EXPIRY_FILTERS.find((f) => f.key === 'gecmis30')!;

  assert.equal(filtreyeUyuyorMu(police('2026-08-13'), gecmis, BUGUN), true, 'dün biten girmeli');
  assert.equal(filtreyeUyuyorMu(police('2026-07-15'), gecmis, BUGUN), true, '30 gün önce biten girmeli');
  assert.equal(filtreyeUyuyorMu(police('2026-07-10'), gecmis, BUGUN), false, '35 gün önce biten girmemeli');
  assert.equal(filtreyeUyuyorMu(police('2026-08-14'), gecmis, BUGUN), false, 'bugün biten girmemeli');
});

test('aciliyet seviyeleri kalan güne göre belirlenir', () => {
  assert.equal(aciliyet(-1), 'gecmis');
  assert.equal(aciliyet(0), 'kritik');
  assert.equal(aciliyet(7), 'kritik');
  assert.equal(aciliyet(8), 'uyari');
  assert.equal(aciliyet(30), 'uyari');
  assert.equal(aciliyet(31), 'yaklasiyor');
  assert.equal(aciliyet(91), 'normal');
});

test('toWhatsAppNumber farklı yazımlardaki cep numaralarını normalize eder', () => {
  // Arrange & Act & Assert
  assert.equal(toWhatsAppNumber('0(532) 111 22 33'), '905321112233');
  assert.equal(toWhatsAppNumber('0532 111 22 33'), '905321112233');
  assert.equal(toWhatsAppNumber('+90 532 111 22 33'), '905321112233');
  assert.equal(toWhatsAppNumber('905321112233'), '905321112233');
  assert.equal(toWhatsAppNumber('5321112233'), '905321112233');
});

test('toWhatsAppNumber sabit hat ve eksik numaraları reddeder', () => {
  assert.equal(toWhatsAppNumber('0242 334 12 12'), null, 'sabit hat cep değildir');
  assert.equal(toWhatsAppNumber('053211122'), null, 'eksik hane');
  assert.equal(toWhatsAppNumber(''), null);
  assert.equal(toWhatsAppNumber(undefined), null);
});

test('whatsappBaglantisi geçersiz numarada null döner, geçerlide mesajı kodlar', () => {
  assert.equal(whatsappBaglantisi('0242 334 12 12', 'merhaba'), null);

  const link = whatsappBaglantisi('0532 111 22 33', 'Poliçeniz bitiyor');
  assert.equal(link, 'https://wa.me/905321112233?text=Poli%C3%A7eniz%20bitiyor');
});

test('hatırlatma metni yer tutucuları doldurur, bilinmeyeni bozmaz', () => {
  // Arrange
  const sablon = 'Sayın {musteri}, {brans} poliçeniz {bitis} tarihinde bitiyor. {yok}';

  // Act
  const sonuc = hatirlatmaMetniOlustur(sablon, {
    musteri: 'Mehmet Mesut YILMAZ', sirket: 'X Sigorta', brans: 'Kasko',
    policeNo: 'PN-1', bitis: '14.08.2026', kalanGun: '0',
  });

  // Assert
  assert.equal(sonuc, 'Sayın Mehmet Mesut YILMAZ, Kasko poliçeniz 14.08.2026 tarihinde bitiyor. {yok}');
});

test('ad ve soyad spesifikasyondaki biçime çevrilir', () => {
  assert.equal(bicimlendirAd('MEHMET  mesut'), 'Mehmet Mesut', 'fazla boşluklar da temizlenmeli');
  assert.equal(bicimlendirSoyad('yılmaz'), 'YILMAZ');
});

test('Türkçe i/ı dönüşümü doğru yapılır', () => {
  // Düz toUpperCase() kullanılsaydı "işık" → "ISIK" olurdu; Türkçe'de noktalı i
  // noktalı İ'ye, noktasız ı ise noktasız I'ya dönüşmelidir.
  assert.equal(bicimlendirSoyad('işık'), 'İŞIK');
  assert.equal(bicimlendirSoyad('ırmak'), 'IRMAK');
  // Küçültmede de aynı kural: "IŞIK" → "ışık", "İSMAİL" → "ismail"
  assert.equal(bicimlendirAd('IŞIK'), 'Işık');
  assert.equal(bicimlendirAd('İSMAİL'), 'İsmail');
});

test('formatTarih ISO tarihi GG.AA.YYYY olarak gösterir', () => {
  assert.equal(formatTarih('2026-08-14'), '14.08.2026');
  assert.equal(formatTarih(''), '—');
  assert.equal(formatTarih(undefined), '—');
});

test('TCKN doğrulaması geçerli numarayı kabul, bozuğu reddeder', () => {
  // 10000000146 bilinen geçerli bir test numarasıdır (algoritmayı sağlar).
  assert.equal(tcKimlikGecerliMi('10000000146'), true);
  assert.equal(tcKimlikGecerliMi('10000000147'), false, 'son hane bozuk');
  assert.equal(tcKimlikGecerliMi('01234567890'), false, 'ilk hane sıfır olamaz');
  assert.equal(tcKimlikGecerliMi('123'), false, 'eksik hane');
});

// --- Yenileme zinciri ------------------------------------------------------
//
// Zincir METIN eslesmesiyle kuruluyor (police numarasi tekil degil, bos olabiliyor).
// Bu yuzden testlerin agirligi mutlu yolda degil, BOZUK VERIDE: yanlis birlesen bir
// zincir musteri kartinda "3 yildir bizimle" gibi YANLIS bir bilgi gosterirdi.

function zincirPolicesi(over: Partial<Policy>): Policy {
  return { ...police('2026-12-31'), ...over };
}

test('yenileme zinciri poliçeleri eskiden yeniye sıralar', () => {
  // Arrange — giriş sırası bilerek karışık
  const y1 = zincirPolicesi({ id: '1', policeNo: 'A1', baslangicTarihi: '2024-01-01', bitisTarihi: '2025-01-01' });
  const y2 = zincirPolicesi({ id: '2', policeNo: 'A2', baslangicTarihi: '2025-01-01', bitisTarihi: '2026-01-01', yenilemeMi: true, oncekiPoliceNo: 'A1' });
  const y3 = zincirPolicesi({ id: '3', policeNo: 'A3', baslangicTarihi: '2026-01-01', bitisTarihi: '2027-01-01', yenilemeMi: true, oncekiPoliceNo: 'A2' });

  // Act
  const zincirler = yenilemeZincirleri([y3, y1, y2]);

  // Assert
  assert.equal(zincirler.length, 1);
  assert.deepEqual(zincirler[0].map((p) => p.id), ['1', '2', '3']);
});

test('boş poliçe numaralı kayıtlar zincire bağlanmaz', () => {
  // Tekliften çevrilen poliçelerde numara boş kalabiliyor; boş numara üzerinden
  // eşleşme kurulsaydı ilgisiz kayıtlar tek zincirde toplanırdı.
  const a = zincirPolicesi({ id: '1', policeNo: '' });
  const b = zincirPolicesi({ id: '2', policeNo: '', yenilemeMi: true, oncekiPoliceNo: '  ' });

  const zincirler = yenilemeZincirleri([a, b]);

  assert.equal(zincirler.length, 2);
});

test('başka müşterinin aynı numaralı poliçesi zincire karışmaz', () => {
  // Poliçe numarası veritabanında tekil değil: iki şirketin numaraları çakışabilir.
  const benim = zincirPolicesi({ id: '1', musteriId: 'c1', policeNo: 'ORTAK' });
  const baskasinin = zincirPolicesi({ id: '2', musteriId: 'c2', policeNo: 'ORTAK' });
  const yenileme = zincirPolicesi({ id: '3', musteriId: 'c1', policeNo: 'Y', yenilemeMi: true, oncekiPoliceNo: 'ORTAK' });

  const onceki = oncekiPoliceyiBul(yenileme, [benim, baskasinin, yenileme]);

  assert.equal(onceki?.id, '1');
});

test('aynı numara iki kayıtta varsa tarihçe en yakını seçilir', () => {
  const eski = zincirPolicesi({ id: '1', policeNo: 'A', bitisTarihi: '2020-01-01' });
  const yakin = zincirPolicesi({ id: '2', policeNo: 'A', bitisTarihi: '2026-01-01' });
  const yenileme = zincirPolicesi({ id: '3', policeNo: 'B', baslangicTarihi: '2026-01-01', yenilemeMi: true, oncekiPoliceNo: 'A' });

  const onceki = oncekiPoliceyiBul(yenileme, [eski, yakin, yenileme]);

  assert.equal(onceki?.id, '2');
});

test('döngüsel veri sonsuz döngüye girmez', () => {
  // A'nın devamı B, B'nin devamı A diye kaydedilmiş bozuk veri tarayıcıyı kilitlerdi.
  const a = zincirPolicesi({ id: '1', policeNo: 'A', yenilemeMi: true, oncekiPoliceNo: 'B' });
  const b = zincirPolicesi({ id: '2', policeNo: 'B', yenilemeMi: true, oncekiPoliceNo: 'A' });

  const zincirler = yenilemeZincirleri([a, b]);

  // Her poliçe zincire yalnız bir kez girer; test donmadan biterse kural işliyor.
  assert.equal(zincirler.flat().length, 2);
});

test('yenileme işareti olmayan poliçe önceki aramaz', () => {
  const p = zincirPolicesi({ id: '1', yenilemeMi: false, oncekiPoliceNo: 'A' });

  assert.equal(oncekiPoliceyiBul(p, [p]), undefined);
});

test('kıdem ilk poliçenin başlangıcından sayılır', () => {
  const eski = zincirPolicesi({ id: '1', baslangicTarihi: '2023-03-10' });
  const yeni = zincirPolicesi({ id: '2', baslangicTarihi: '2026-01-01' });

  const kidem = musteriKidemi([yeni, eski], BUGUN);

  assert.equal(kidem?.yil, 3);
  assert.equal(kidem?.ilkTarih, '2023-03-10');
});

test('yıl dönümü gelmemişse kıdem bir eksik sayılır', () => {
  // 11 ay önce gelen müşteriye "1 yıldır bizimle" demek yanıltıcı olurdu.
  const p = zincirPolicesi({ baslangicTarihi: '2025-12-01' });

  assert.equal(musteriKidemi([p], BUGUN)?.yil, 0);
});

test('poliçesi olmayan müşteride kıdem yoktur', () => {
  assert.equal(musteriKidemi([], BUGUN), null);
});

test('süresi dolmuş ve yenilenmemiş zincir kayıp sayılır', () => {
  const p = zincirPolicesi({ bitisTarihi: '2026-01-01', durum: 'Aktif' });

  assert.equal(zincirYenilenmedi([p], BUGUN), true);
});

test('iptal edilmiş poliçe kayıp müşteri sayılmaz', () => {
  // Müşteri bilerek ayrılmış; hatırlatma gönderilecek bir durum değil.
  const p = zincirPolicesi({ bitisTarihi: '2026-01-01', durum: 'İptal' });

  assert.equal(zincirYenilenmedi([p], BUGUN), false);
});

test('yürürlükteki poliçe kayıp sayılmaz', () => {
  const p = zincirPolicesi({ bitisTarihi: '2026-12-31', durum: 'Aktif' });

  assert.equal(zincirYenilenmedi([p], BUGUN), false);
});

// --- Yenileme panosu esikleri ----------------------------------------------

test('poliçe düştüğü en dar eşiğe yerleşir', () => {
  // 5 gün kalan poliçe hem 7'ye hem 30'a girer; listede iki kez görünmemesi için
  // en acil kovaya yerleşmeli.
  assert.equal(yenilemeEsigi(0), 7);
  assert.equal(yenilemeEsigi(7), 7);
  assert.equal(yenilemeEsigi(8), 15);
  assert.equal(yenilemeEsigi(15), 15);
  assert.equal(yenilemeEsigi(16), 30);
  assert.equal(yenilemeEsigi(30), 30);
});

test('pencere dışındaki ve süresi geçmiş poliçe panoya girmez', () => {
  // Pano "aranacaklar" listesidir; geçmiş poliçe poliçe takibi ekranında durur.
  assert.equal(yenilemeEsigi(31), null);
  assert.equal(yenilemeEsigi(-1), null);
  assert.equal(yenilemeEsigi(null), null);
});

test('sorgu penceresi eşiklerden türetilir', () => {
  // Sunucudaki sorgu aralığı bu değerle kuruluyor. Elle yazılsaydı eşik listesi
  // değiştiğinde pano sessizce eksik veri gösterirdi.
  assert.equal(YENILEME_PENCERESI_GUN, Math.max(...YENILEME_ESIKLERI));
  assert.equal(YENILEME_PENCERESI_GUN, 30);
});

test('müşteri adı yalnız ad alanlarını taşıyan özet kayıtla da çalışır', () => {
  // Yenileme panosu kimlik numarası taşımayan hafif bir özet satırı kullanıyor;
  // ad kuralının ikinci kez yazılmaması için imza bu alt kümeyi kabul ediyor.
  assert.equal(musteriAdi({ tip: 'bireysel', ad: 'Mehmet Mesut', soyad: 'YILMAZ' }), 'Mehmet Mesut YILMAZ');
  assert.equal(musteriAdi({ tip: 'kurumsal', firmaUnvani: 'Işık Turizm A.Ş.' }), 'Işık Turizm A.Ş.');
});
