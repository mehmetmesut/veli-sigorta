import test from 'node:test';
import assert from 'node:assert/strict';
import { gunBosluklariniDoldur } from '../lib/gun-serisi';

const bos = (date: string) => ({ date, deger: 0 });

test('aradaki eksik günü sıfır değerle tamamlar', () => {
  // Arrange — GA4'ün gerçekte döndürdüğü delikli seri: 16.08 yok.
  const noktalar = [
    { date: '2026-08-15', deger: 4 },
    { date: '2026-08-17', deger: 5 },
  ];

  // Act
  const sonuc = gunBosluklariniDoldur(noktalar, bos);

  // Assert
  assert.deepEqual(sonuc, [
    { date: '2026-08-15', deger: 4 },
    { date: '2026-08-16', deger: 0 },
    { date: '2026-08-17', deger: 5 },
  ]);
});

test('serinin başına ve sonuna gün eklemez', () => {
  const noktalar = [
    { date: '2026-08-15', deger: 4 },
    { date: '2026-08-16', deger: 2 },
  ];

  const sonuc = gunBosluklariniDoldur(noktalar, bos);

  assert.equal(sonuc.length, 2);
  assert.equal(sonuc[0].date, '2026-08-15');
  assert.equal(sonuc[1].date, '2026-08-16');
});

test('sırasız gelen seriyi tarihe göre sıralar', () => {
  const noktalar = [
    { date: '2026-08-17', deger: 5 },
    { date: '2026-08-15', deger: 4 },
  ];

  const sonuc = gunBosluklariniDoldur(noktalar, bos);

  assert.deepEqual(sonuc.map((n) => n.date), ['2026-08-15', '2026-08-16', '2026-08-17']);
});

test('ay ve yıl sınırını doğru aşar', () => {
  const noktalar = [
    { date: '2026-12-30', deger: 1 },
    { date: '2027-01-02', deger: 3 },
  ];

  const sonuc = gunBosluklariniDoldur(noktalar, bos);

  assert.deepEqual(sonuc.map((n) => n.date), [
    '2026-12-30', '2026-12-31', '2027-01-01', '2027-01-02',
  ]);
});

test('artık yıl 29 Şubat gününü atlamaz', () => {
  const noktalar = [
    { date: '2028-02-28', deger: 1 },
    { date: '2028-03-01', deger: 2 },
  ];

  const sonuc = gunBosluklariniDoldur(noktalar, bos);

  assert.deepEqual(sonuc.map((n) => n.date), ['2028-02-28', '2028-02-29', '2028-03-01']);
});

test('tarih biçimi tanınmayan seriye dokunmaz', () => {
  const noktalar = [{ date: '20260815', deger: 4 }, { date: '20260817', deger: 5 }];

  const sonuc = gunBosluklariniDoldur(noktalar, bos);

  assert.deepEqual(sonuc, noktalar);
});

test('tek noktalı ve boş seri olduğu gibi döner', () => {
  assert.deepEqual(gunBosluklariniDoldur([], bos), []);
  assert.deepEqual(
    gunBosluklariniDoldur([{ date: '2026-08-15', deger: 4 }], bos),
    [{ date: '2026-08-15', deger: 4 }],
  );
});

test('girdi dizisini değiştirmez', () => {
  const noktalar = [
    { date: '2026-08-17', deger: 5 },
    { date: '2026-08-15', deger: 4 },
  ];

  gunBosluklariniDoldur(noktalar, bos);

  assert.deepEqual(noktalar.map((n) => n.date), ['2026-08-17', '2026-08-15']);
});
