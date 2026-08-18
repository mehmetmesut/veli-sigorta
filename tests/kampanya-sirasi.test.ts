import test from 'node:test';
import assert from 'node:assert/strict';
import { kampanyaSiralariniNormalize, sonrakiKampanyaSirasi } from '../lib/kampanya-sirasi';

const k = (id: string, order: number, guncellendi = 0) => ({ id, order, guncellendi });

test('canlıdaki çakışık sıralamayı 1..N olarak düzeltir', () => {
  // Arrange — canlıda bulunan gerçek durum: 1, 2, 4, 4, 6, 6
  const kayitlar = [
    k('a', 1), k('b', 2), k('c', 4, 200), k('d', 4, 100), k('e', 6, 200), k('f', 6, 100),
  ];

  // Act
  const sonuc = kampanyaSiralariniNormalize(kayitlar);

  // Assert
  assert.deepEqual(
    sonuc.map((x) => [x.id, x.order]),
    [['a', 1], ['b', 2], ['c', 3], ['d', 4], ['e', 5], ['f', 6]],
  );
});

test('aynı numarada en son güncellenen öne geçer', () => {
  // Yönetici "bu 2 olsun" dediğinde onun kaydı 2 olmalı, eskisi 3'e kaymalı.
  const sonuc = kampanyaSiralariniNormalize([
    k('eski', 2, 100),
    k('yeni', 2, 999),
    k('ilk', 1, 50),
  ]);

  assert.deepEqual(sonuc.map((x) => x.id), ['ilk', 'yeni', 'eski']);
  assert.deepEqual(sonuc.map((x) => x.order), [1, 2, 3]);
});

test('boşluklar kapanır', () => {
  const sonuc = kampanyaSiralariniNormalize([k('a', 3), k('b', 9), k('c', 40)]);
  assert.deepEqual(sonuc.map((x) => x.order), [1, 2, 3]);
  assert.deepEqual(sonuc.map((x) => x.id), ['a', 'b', 'c']);
});

test('tam eşitlikte sonuç her çalıştırmada aynıdır', () => {
  const girdi = [k('z', 1, 5), k('a', 1, 5), k('m', 1, 5)];
  const bir = kampanyaSiralariniNormalize(girdi).map((x) => x.id);
  const iki = kampanyaSiralariniNormalize(girdi).map((x) => x.id);
  assert.deepEqual(bir, iki);
  assert.deepEqual(bir, ['a', 'm', 'z']);
});

test('girdi dizisini değiştirmez', () => {
  const girdi = [k('b', 5), k('a', 1)];
  kampanyaSiralariniNormalize(girdi);
  assert.deepEqual(girdi.map((x) => [x.id, x.order]), [['b', 5], ['a', 1]]);
});

test('boş liste boş döner', () => {
  assert.deepEqual(kampanyaSiralariniNormalize([]), []);
});

test('yeni kayıt listenin sonuna eklenir', () => {
  assert.equal(sonrakiKampanyaSirasi([1, 2, 3]), 4);
  assert.equal(sonrakiKampanyaSirasi([]), 1);
});

test('silme sonrası yeni kayıt mevcut numarayla ÇAKIŞMAZ', () => {
  // Hatanın tam senaryosu: 6 kayıttan biri silinince uzunluk 5 olur ve
  // `uzunluk + 1 = 6` zaten var olan bir numaradır.
  const kalanSiralar = [1, 2, 4, 5, 6];
  const yeni = sonrakiKampanyaSirasi(kalanSiralar);

  assert.equal(yeni, 7);
  assert.ok(!kalanSiralar.includes(yeni), 'yeni numara mevcut numaralardan biri olmamalı');
});
