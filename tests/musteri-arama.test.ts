import assert from 'node:assert/strict';
import test from 'node:test';
import { aramaNormalize, musteriEslesiyorMu, musterileriAra } from '../lib/musteri-arama';
import type { Customer } from '../lib/types';

function musteri(ozellikler: Partial<Customer>): Customer {
  return {
    id: 'c1', musteriNo: 'M-00001', tip: 'bireysel',
    yetkililer: [], isActive: true,
    createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z',
    ...ozellikler,
  };
}

const MEHMET = musteri({
  id: 'c1', musteriNo: 'M-00002', ad: 'Mehmet Mesut', soyad: 'YILMAZ',
  tcKimlikNo: '12345678950', mobilTelefon: '0(530) 730 20 02', il: 'Antalya',
});

const SAIME = musteri({
  id: 'c2', musteriNo: 'M-00001', ad: 'Saime', soyad: 'BEDELOĞLU',
  mobilTelefon: '0(535) 298 64 04',
});

const FIRMA = musteri({
  id: 'c3', musteriNo: 'M-00003', tip: 'kurumsal',
  firmaUnvani: 'Işık Turizm Ltd. Şti.', vergiNo: '9876543210',
});

test('boş sorgu her kaydı geçirir', () => {
  assert.equal(musteriEslesiyorMu(MEHMET, ''), true);
  assert.equal(musteriEslesiyorMu(MEHMET, '   '), true);
});

test('kelimeler ayrı ayrı aranır, araya giren isim eşleşmeyi bozmaz', () => {
  // Düz `includes` "mehmet yılmaz" ile "Mehmet Mesut YILMAZ" eşleşmezdi.
  assert.equal(musteriEslesiyorMu(MEHMET, 'mehmet yılmaz'), true);
  assert.equal(musteriEslesiyorMu(MEHMET, 'yılmaz mehmet'), true);
});

test('kelimelerin tamamı eşleşmeliyse eksik olanda sonuç dönmez', () => {
  assert.equal(musteriEslesiyorMu(MEHMET, 'mehmet demir'), false);
});

test('Türkçe büyük-küçük harf dönüşümü doğru eşleşir', () => {
  assert.equal(musteriEslesiyorMu(FIRMA, 'ışık'), true);
  assert.equal(musteriEslesiyorMu(FIRMA, 'IŞIK'), true);
  assert.equal(musteriEslesiyorMu(SAIME, 'bedeloğlu'), true);
});

test('telefon biçimden arındırılarak aranır', () => {
  // Kayıtta "0(530) 730 20 02" yazıyor, kullanıcı bitişik yazıyor.
  assert.equal(musteriEslesiyorMu(MEHMET, '5307302002'), true);
  assert.equal(musteriEslesiyorMu(MEHMET, '7302002'), true);
  assert.equal(musteriEslesiyorMu(MEHMET, '5352986404'), false);
});

test('kimlik ve vergi numarası ile aranabilir', () => {
  assert.equal(musteriEslesiyorMu(MEHMET, '12345678950'), true);
  assert.equal(musteriEslesiyorMu(FIRMA, '9876543210'), true);
});

test('müşteri numarası ile aranabilir', () => {
  assert.equal(musteriEslesiyorMu(MEHMET, 'M-00002'), true);
  assert.equal(musteriEslesiyorMu(MEHMET, 'm-00002'), true);
});

test('rakam eşleşmesi alanlar arasında birleşmez', () => {
  // "00002" (müşteri no sonu) + "12345" (kimlik başı) yan yana gelip
  // "0000212345" gibi olmayan bir numarayı eşleştirmemeli.
  assert.equal(musteriEslesiyorMu(MEHMET, '0000212345'), false);
});

test('karışık kelimede rakam kısayolu devreye girmez', () => {
  // "07mmy" gibi harf+rakam karışımı yalnız düz metin olarak aranır.
  assert.equal(musteriEslesiyorMu(MEHMET, '07mmy'), false);
});

test('sonuçlar ad başlangıcına göre önceliklenir', () => {
  const { sonuclar } = musterileriAra([SAIME, MEHMET, FIRMA], 'me', 10);
  assert.equal(sonuclar[0].id, MEHMET.id);
});

test('pasif kayıtlar listenin altına iner', () => {
  const pasif = musteri({ id: 'c9', ad: 'Ahmet', soyad: 'ÇELİK', isActive: false });
  const aktif = musteri({ id: 'c8', ad: 'Zeynep', soyad: 'ÇELİK', isActive: true });

  const { sonuclar } = musterileriAra([pasif, aktif], 'çelik', 10);
  assert.deepEqual(sonuclar.map((c) => c.id), ['c8', 'c9']);
});

test('liste kırpılır ama toplam gerçek sayıyı taşır', () => {
  const cok = Array.from({ length: 120 }, (_, i) =>
    musteri({ id: `c${i}`, musteriNo: `M-${i}`, ad: 'Test', soyad: `KAYIT${i}` }));

  const { sonuclar, toplam } = musterileriAra(cok, 'test', 50);
  assert.equal(sonuclar.length, 50);
  assert.equal(toplam, 120);
});

test('arama girdi dizisini değiştirmez', () => {
  const liste = [SAIME, MEHMET];
  const kopya = [...liste];
  musterileriAra(liste, '', 10);
  assert.deepEqual(liste, kopya);
});

// --- Türkçe harf katlama -----------------------------------------------------
// Bu testler bir denetimde çıkan gerçek açığı kilitler: yalnız tr-TR küçültme
// yapıldığında "YILMAZ" → "yılmaz" (noktasız) oluyor, standart klavyeyle yazılan
// "yilmaz" (noktalı) eşleşmiyordu. Personel kaydı bulamayıp mükerrer açıyordu.

test('noktasız ı ile noktalı i arasında arama yapılabilir', () => {
  assert.equal(musteriEslesiyorMu(MEHMET, 'yilmaz'), true);
  assert.equal(musteriEslesiyorMu(MEHMET, 'Yilmaz'), true);
  assert.equal(musteriEslesiyorMu(MEHMET, 'yılmaz'), true);
  assert.equal(musteriEslesiyorMu(MEHMET, 'YILMAZ'), true);
});

test('İ/I ayrımı olan il adları her iki yazımla bulunur', () => {
  const istanbullu = musteri({ id: 'c7', ad: 'Ali', soyad: 'VELİ', il: 'İstanbul' });
  assert.equal(musteriEslesiyorMu(istanbullu, 'istanbul'), true);
  assert.equal(musteriEslesiyorMu(istanbullu, 'Istanbul'), true);
  assert.equal(musteriEslesiyorMu(istanbullu, 'ıstanbul'), true);
});

test('ş/g/ç/ö/ü harfleri ASCII karşılığıyla da aranabilir', () => {
  assert.equal(musteriEslesiyorMu(FIRMA, 'isik'), true);
  assert.equal(musteriEslesiyorMu(SAIME, 'bedeloglu'), true);
  assert.equal(musteriEslesiyorMu(SAIME, 'BEDELOGLU'), true);
});

test('harf katlama gösterimi değil yalnız karşılaştırmayı etkiler', () => {
  assert.equal(aramaNormalize('Mehmet Mesut YILMAZ'), 'mehmet mesut yilmaz');
  assert.equal(aramaNormalize('Işık Turizm'), 'isik turizm');
});

// --- Telefon normalleştirme --------------------------------------------------

test('ülke kodlu telefon numarasıyla arama yapılabilir', () => {
  // WhatsApp numarayı "+90 530 730 20 02" biçiminde kopyalatıyor.
  assert.equal(musteriEslesiyorMu(MEHMET, '+90 530 730 20 02'), true);
  assert.equal(musteriEslesiyorMu(MEHMET, '+905307302002'), true);
  assert.equal(musteriEslesiyorMu(MEHMET, '905307302002'), true);
  assert.equal(musteriEslesiyorMu(MEHMET, '0530 730 20 02'), true);
});

test('telefon biçimli sorgu boşluklardan bölünmez', () => {
  // Bölünseydi "+90" parçası hiçbir alanda bulunamayıp tüm sorguyu düşürürdü.
  assert.equal(musteriEslesiyorMu(SAIME, '+90 530 730 20 02'), false);
});

test('başka birinin numarası eşleşmez', () => {
  assert.equal(musteriEslesiyorMu(MEHMET, '+90 535 298 64 04'), false);
});

// --- Sıralama ----------------------------------------------------------------

test('adı sorguyla başlayan pasif kayıt, gevşek eşleşen aktif kaydın üstünde kalır', () => {
  // Aktiflik alakadan önce gelseydi bu kayıt 50'lik kırpmayla listeden düşerdi.
  const pasifTam = musteri({ id: 'p1', ad: 'Mehmet', soyad: 'ARSLAN', isActive: false });
  const aktifGevsek = musteri({ id: 'a1', ad: 'Ayşe', soyad: 'DEMİR', il: 'Mehmetçik', isActive: true });

  const { sonuclar } = musterileriAra([aktifGevsek, pasifTam], 'mehmet', 10);
  assert.deepEqual(sonuclar.map((c) => c.id), ['p1', 'a1']);
});

test('eşit alakada aktif kayıt pasiften önce gelir', () => {
  const pasif = musteri({ id: 'c9', ad: 'Ahmet', soyad: 'ÇELİK', isActive: false });
  const aktif = musteri({ id: 'c8', ad: 'Ahmet', soyad: 'ÇELİK', isActive: true });

  const { sonuclar } = musterileriAra([pasif, aktif], 'ahmet', 10);
  assert.deepEqual(sonuclar.map((c) => c.id), ['c8', 'c9']);
});
