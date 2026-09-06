import assert from 'node:assert/strict';
import test from 'node:test';
import {
  adSoyadAyir,
  adSoyadBicimlendir,
  tamAdBicimlendir,
  benzerMusteriBul,
  degisiklikVarMi,
  birYilSonrasi,
  gecmisDegerler,
  ilIlceAyir,
  komisyonHesapla,
  sonrakiMusteriNo,
  telefonMaskele,
  gunFarki,
  sureyiCikar,
  tarihEkle,
} from '../lib/form-helpers';
import type { Customer } from '../lib/types';

function musteri(patch: Partial<Customer>): Customer {
  const now = '2026-01-01T00:00:00.000Z';
  return {
    id: 'c1', musteriNo: 'M-00001', tip: 'bireysel',
    yetkililer: [], isActive: true, createdAt: now, updatedAt: now,
    ...patch,
  };
}

test('telefon maskesi kullanıcı yazarken kademeli oluşur', () => {
  assert.equal(telefonMaskele(''), '');
  assert.equal(telefonMaskele('53'), '0(53');
  assert.equal(telefonMaskele('532'), '0(532');
  assert.equal(telefonMaskele('532111'), '0(532) 111');
  assert.equal(telefonMaskele('5321112233'), '0(532) 111 22 33');
});

test('telefon maskesi 0 ve +90 önekli girişleri aynı sonuca indirger', () => {
  const beklenen = '0(532) 111 22 33';

  assert.equal(telefonMaskele('05321112233'), beklenen);
  assert.equal(telefonMaskele('+90 532 111 22 33'), beklenen);
  assert.equal(telefonMaskele('905321112233'), beklenen);
  assert.equal(telefonMaskele('0(532) 111 22 33'), beklenen, 'maskeli değer yeniden maskelenince bozulmamalı');
});

test('müşteri numarası silme sonrası çakışmaz', () => {
  // Arrange: M-00002 silinmiş, geriye 1 ve 3 kalmış.
  const mevcut = [{ musteriNo: 'M-00001' }, { musteriNo: 'M-00003' }];

  // Act & Assert: sayıya değil en büyük numaraya bakılmalı.
  assert.equal(sonrakiMusteriNo(mevcut), 'M-00004');
  assert.equal(sonrakiMusteriNo([]), 'M-00001');
  assert.equal(sonrakiMusteriNo([{ musteriNo: 'elle-girilmis' }]), 'M-00001', 'biçimsiz numara sayılmaz');
});

test('benzer müşteri kimlik, vergi no veya cep telefonundan yakalanır', () => {
  // Arrange
  const mevcut = [
    musteri({ id: 'c1', tcKimlikNo: '10000000146' }),
    musteri({ id: 'c2', tip: 'kurumsal', vergiNo: '1234567890' }),
    musteri({ id: 'c3', mobilTelefon: '0(532) 111 22 33' }),
  ];

  // Act & Assert
  assert.equal(benzerMusteriBul(mevcut, { id: '', tcKimlikNo: '10000000146' })?.id, 'c1');
  assert.equal(benzerMusteriBul(mevcut, { id: '', vergiNo: '1234567890' })?.id, 'c2');
  assert.equal(
    benzerMusteriBul(mevcut, { id: '', mobilTelefon: '+90 532 111 22 33' })?.id,
    'c3',
    'farklı yazımdaki aynı numara eşleşmeli',
  );
  assert.equal(benzerMusteriBul(mevcut, { id: '', tcKimlikNo: '10000000147' }), null);
});

test('benzer müşteri kontrolü düzenlenen kaydın kendisini uyarı saymaz', () => {
  const mevcut = [musteri({ id: 'c1', tcKimlikNo: '10000000146' })];

  assert.equal(benzerMusteriBul(mevcut, { id: 'c1', tcKimlikNo: '10000000146' }), null);
});

test('bitiş tarihi başlangıcın bir yıl sonrası olarak önerilir', () => {
  assert.equal(birYilSonrasi('2026-08-14'), '2027-08-14');
  assert.equal(birYilSonrasi('2026-01-01'), '2027-01-01');
  assert.equal(birYilSonrasi(''), '');
  assert.equal(birYilSonrasi('gecersiz'), '');
});

test('komisyon tutarı brüt prim ve orandan hesaplanır', () => {
  assert.equal(komisyonHesapla(10000, 15), 1500);
  assert.equal(komisyonHesapla(1234.56, 12.5), 154.32);
  assert.equal(komisyonHesapla(undefined, 15), undefined);
  assert.equal(komisyonHesapla(10000, undefined), undefined);
});

test('geçmiş değerler en sık kullanılandan başlayarak sıralanır', () => {
  // Arrange
  const kayitlar = [
    { sirket: 'Anadolu Sigorta' },
    { sirket: 'Allianz' },
    { sirket: 'Anadolu Sigorta' },
    { sirket: '' },
  ];

  // Act
  const sonuc = gecmisDegerler(kayitlar, (k) => k.sirket);

  // Assert
  assert.deepEqual(sonuc, ['Anadolu Sigorta', 'Allianz'], 'boş değerler listelenmemeli');
});

test('ad soyad ayrımında soyadı son kelimedir', () => {
  assert.deepEqual(adSoyadAyir('Mehmet Mesut YILMAZ'), { ad: 'Mehmet Mesut', soyad: 'YILMAZ' });
  assert.deepEqual(adSoyadAyir('Ayşe Demir'), { ad: 'Ayşe', soyad: 'Demir' });
  assert.deepEqual(adSoyadAyir('  fazla   boşluklu   ad  '), { ad: 'fazla boşluklu', soyad: 'ad' });
});

test('tek kelime girildiğinde soyadı uydurulmaz', () => {
  // Eksik bırakmak, yanlış doldurmaktan iyidir; kullanıcı müşteri kartından tamamlar.
  assert.deepEqual(adSoyadAyir('Mehmet'), { ad: 'Mehmet', soyad: '' });
  assert.deepEqual(adSoyadAyir(''), { ad: '', soyad: '' });
  assert.deepEqual(adSoyadAyir(undefined), { ad: '', soyad: '' });
});

test('il ve ilçe farklı ayraçlarla ayrılır', () => {
  assert.deepEqual(ilIlceAyir('Antalya / Kepez'), { il: 'Antalya', ilce: 'Kepez' });
  assert.deepEqual(ilIlceAyir('Antalya, Muratpaşa'), { il: 'Antalya', ilce: 'Muratpaşa' });
  assert.deepEqual(ilIlceAyir('Antalya'), { il: 'Antalya', ilce: '' });
  assert.deepEqual(ilIlceAyir(''), { il: '', ilce: '' });
});

test('tam ad, ad baş harfleri büyük ve soyadı tamamen büyük olacak şekilde biçimlenir', () => {
  assert.equal(tamAdBicimlendir('mehmet mesut yılmaz'), 'Mehmet Mesut YILMAZ');
  assert.equal(tamAdBicimlendir('AYŞE DEMİR'), 'Ayşe DEMİR');
  assert.equal(tamAdBicimlendir('  ahmet   ÇELİK '), 'Ahmet ÇELİK');
});

test('tek kelime girildiğinde soyadı uydurulmaz', () => {
  assert.equal(tamAdBicimlendir('mehmet'), 'Mehmet');
});

test('boş ad boş metne dönüşür', () => {
  assert.equal(tamAdBicimlendir(''), '');
  assert.equal(tamAdBicimlendir(undefined), '');
});

test('Türkçe harfler doğru büyütülür (i → İ, ı → I)', () => {
  assert.equal(tamAdBicimlendir('ilker ışık'), 'İlker IŞIK');
});

// --- Süre ve tarih hesabı ----------------------------------------------------
// Poliçe formunda bitiş tarihi "başlangıç + süre" ile doluyor; süre kayıtta
// saklanmadığı için iki tarihten geri de çıkarılabilmesi gerekiyor.

test('tarihe yıl eklenir', () => {
  assert.equal(tarihEkle('2026-08-17', 1, 'yil'), '2027-08-17');
  assert.equal(tarihEkle('2026-08-17', 3, 'yil'), '2029-08-17');
});

test('tarihe gün eklenirken ay ve yıl taşması doğru yürür', () => {
  assert.equal(tarihEkle('2026-08-17', 30, 'gun'), '2026-09-16');
  assert.equal(tarihEkle('2026-12-25', 10, 'gun'), '2027-01-04');
});

test('artık gün 29 Şubat bir sonraki yılda 1 Mart’a kayar', () => {
  assert.equal(tarihEkle('2028-02-29', 1, 'yil'), '2029-03-01');
});

test('iki haneli görünen yıl 1900’lere çekilmez', () => {
  // new Date(50, ...) çağrısı 1950 verirdi; setFullYear bunu engeller.
  assert.equal(tarihEkle('0050-01-01', 1, 'yil'), '0051-01-01');
});

test('geçersiz tarih boş metne düşer', () => {
  assert.equal(tarihEkle('', 1, 'yil'), '');
  assert.equal(tarihEkle('17.08.2026', 1, 'yil'), '');
  assert.equal(tarihEkle('2026-08-17', Number.NaN, 'gun'), '');
});

test('birYilSonrasi tarihEkle ile aynı sonucu verir', () => {
  assert.equal(birYilSonrasi('2026-08-17'), tarihEkle('2026-08-17', 1, 'yil'));
});

test('gün farkı yaz saati geçişinden etkilenmez', () => {
  // Mart sonundaki geçiş yerel saatte 23 saatlik bir gün üretiyor.
  assert.equal(gunFarki('2026-03-28', '2026-03-30'), 2);
  assert.equal(gunFarki('2026-08-17', '2027-08-17'), 365);
  assert.equal(gunFarki('2026-08-17', '2026-08-17'), 0);
});

test('tam yıla denk gelen aralık yıl olarak çıkarılır', () => {
  assert.deepEqual(sureyiCikar('2026-08-17', '2027-08-17'), { miktar: 1, birim: 'yil' });
  assert.deepEqual(sureyiCikar('2026-08-17', '2029-08-17'), { miktar: 3, birim: 'yil' });
});

test('tam yıla denk gelmeyen aralık gün olarak çıkarılır', () => {
  assert.deepEqual(sureyiCikar('2026-08-17', '2026-09-16'), { miktar: 30, birim: 'gun' });
});

test('geçersiz veya ters aralıkta süre çıkarılamaz', () => {
  assert.equal(sureyiCikar('2026-08-17', '2026-08-17'), null);
  assert.equal(sureyiCikar('2027-08-17', '2026-08-17'), null);
  assert.equal(sureyiCikar('', '2026-08-17'), null);
});

test('süre çıkarma ile tarih ekleme birbirinin tersidir', () => {
  const baslangic = '2026-08-17';
  for (const [miktar, birim] of [[1, 'yil'], [2, 'yil'], [30, 'gun'], [90, 'gun']] as const) {
    const bitis = tarihEkle(baslangic, miktar, birim);
    const geri = sureyiCikar(baslangic, bitis);
    assert.equal(tarihEkle(baslangic, geri!.miktar, geri!.birim), bitis);
  }
});

// --- Telefon biçimlendirme ---------------------------------------------------

test('telefon maskeleme etkisizdir: maskeli değer bozulmaz', () => {
  const maskeli = telefonMaskele('5307302002');
  assert.equal(maskeli, '0(530) 730 20 02');
  assert.equal(telefonMaskele(maskeli), maskeli);
});

test('ülke kodlu ve sıfırlı girişler aynı biçime iner', () => {
  assert.equal(telefonMaskele('+90 530 730 20 02'), '0(530) 730 20 02');
  assert.equal(telefonMaskele('905307302002'), '0(530) 730 20 02');
  assert.equal(telefonMaskele('05307302002'), '0(530) 730 20 02');
});

// --- degisiklikVarMi: kaydedilmemis veri korumasinin cekirdegi ---------------
//
// Bu kiyas uc formda da (musteri, police, hizli musteri paneli) Esc'e basildiginda
// uyari cikip cikmayacagini belirliyor. Yanlis pozitif personeli her kapatista
// gereksiz onaya zorlar; yanlis negatif dakikalarca suren girisi sessizce siler.

test('ilk hâl null iken değişiklik yok sayılır', () => {
  // Form hiç açılmamışsa (ilk hâl saklanmamışsa) uyarı çıkmamalı.
  assert.equal(degisiklikVarMi(null, { ad: 'Ali' }), false);
});

test('dokunulmamış form kirli sayılmaz', () => {
  const kayit = { ad: 'Ali', soyad: 'YILMAZ', tip: 'bireysel' };

  assert.equal(degisiklikVarMi(JSON.stringify(kayit), kayit), false);
});

test('tek alan değişince kirli olur', () => {
  const ilk = JSON.stringify({ ad: 'Ali', soyad: 'YILMAZ' });

  assert.equal(degisiklikVarMi(ilk, { ad: 'Ali', soyad: 'DEMİR' }), true);
});

test('boş bir alana yazmak da kirli sayılır', () => {
  // Hızlı müşteri panelinde en sık durum: ön dolgunun yanına telefon yazılması.
  const ilk = JSON.stringify({ ad: 'Ali', mobilTelefon: '' });

  assert.equal(degisiklikVarMi(ilk, { ad: 'Ali', mobilTelefon: '0532' }), true);
});

test('Türkçe karakter değişimi yakalanır', () => {
  // JSON kıyası olduğu için harf katlaması YAPILMAZ: "SAHIN" ile "ŞAHİN" ayrı.
  const ilk = JSON.stringify({ soyad: 'SAHIN' });

  assert.equal(degisiklikVarMi(ilk, { soyad: 'ŞAHİN' }), true);
});

// --- adSoyadBicimlendir: hizli musteri panelinin on dolgusu -----------------
//
// Panel, secicide aranip bulunamayan metni Adi/Soyadi alanlarina yerlestiriyor.
// Bicimlendirme eskiden yalniz KAYDETME aninda uygulaniyordu: ekranda "deneme
// amacli test" gorunuyor, kayitta "Deneme Amacli / TEST" oluyordu. Ekranda gorunen
// ile kaydedilecek olanin farkli olmasi, dogru yazilmis kaydi yanlis sanip elle
// duzeltmeye yol aciyordu.

test('ön dolgu ad ilk harfleri büyük, soyad tamamı büyük gelir', () => {
  assert.deepEqual(
    adSoyadBicimlendir('deneme amaçlı test'),
    { ad: 'Deneme Amaçlı', soyad: 'TEST' },
  );
});

test('Türkçe harfler doğru dönüşür', () => {
  // ı→I ve i→İ: yerel ayarsız dönüşüm "Işık"ı "ışık" yerine "IŞIK" yapıp
  // "Isık" gibi bozuk yazımlar üretiyordu.
  assert.deepEqual(
    adSoyadBicimlendir('ışık yıldırım'),
    { ad: 'Işık', soyad: 'YILDIRIM' },
  );
  // Noktalı i büyürken noktasını korur: "ibrahim" → "İbrahim", "Ibrahim" değil.
  assert.deepEqual(
    adSoyadBicimlendir('ibrahim şahin'),
    { ad: 'İbrahim', soyad: 'ŞAHİN' },
  );
});

test('tamamı büyük yazılmış giriş de düzeltilir', () => {
  // Personel Caps Lock açık yazdığında ad "MEHMET MESUT" kalıyordu.
  assert.deepEqual(
    adSoyadBicimlendir('MEHMET MESUT YILMAZ'),
    { ad: 'Mehmet Mesut', soyad: 'YILMAZ' },
  );
});

test('tek kelimede soyadı uydurulmaz', () => {
  assert.deepEqual(adSoyadBicimlendir('mehmet'), { ad: 'Mehmet', soyad: '' });
});

test('boş girdi boş sonuç verir', () => {
  assert.deepEqual(adSoyadBicimlendir(''), { ad: '', soyad: '' });
  assert.deepEqual(adSoyadBicimlendir(undefined), { ad: '', soyad: '' });
  assert.deepEqual(adSoyadBicimlendir('   '), { ad: '', soyad: '' });
});

test('fazla boşluklar tek boşluğa iner', () => {
  assert.deepEqual(
    adSoyadBicimlendir('  ayşe   dilara   yüzgeç  '),
    { ad: 'Ayşe Dilara', soyad: 'YÜZGEÇ' },
  );
});

test('ikinci kez uygulanınca sonuç değişmez', () => {
  // Müşteri tipi bireysel↔kurumsal değiştirildiğinde yazılan ad yeniden bu
  // işlevden geçiyor; kararsız olsaydı her geçişte yazım bozulurdu.
  const birinci = adSoyadBicimlendir('deneme amaçlı test');
  const ikinci = adSoyadBicimlendir(`${birinci.ad} ${birinci.soyad}`);

  assert.deepEqual(ikinci, birinci);
});
