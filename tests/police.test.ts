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
  kalanGun,
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
