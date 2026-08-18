import assert from 'node:assert/strict';
import test from 'node:test';
import { srcSetUret, varyantOlabilirMi } from '../lib/gorsel-varyant';

const ORNEK = '/yuklenen/slider-a2e921f8-e5e9-4cba-a174-f7ff1c3882f0.webp';

test('yükleme ucumuzun ürettiği dosyalarda varyant beklenir', () => {
  assert.equal(varyantOlabilirMi(ORNEK), true);
});

test('varyantı olmayan adreslerde srcset üretilmez', () => {
  // Dış adres, hizmet görseli ve boş değer: bunlarda varyant dosyası yok.
  assert.equal(srcSetUret('https://picsum.photos/seed/x/1200/800'), undefined);
  assert.equal(srcSetUret('/yuklenen/hizmet-kasko-sigortasi.webp'), undefined);
  assert.equal(srcSetUret(''), undefined);
  assert.equal(srcSetUret(undefined), undefined);
});

test('srcset küçükten büyüğe tüm adayları içerir', () => {
  const sonuc = srcSetUret(ORNEK);
  const taban = '/yuklenen/slider-a2e921f8-e5e9-4cba-a174-f7ff1c3882f0';

  assert.equal(
    sonuc,
    `${taban}-720w.webp 720w, ${taban}-1200w.webp 1200w, ${ORNEK} 1800w`,
  );
});

test('büyük harfli uzantı da tanınır', () => {
  // Adlandırmayı biz üretiyoruz ama elle düzenlenmiş kayıtlara karşı dayanıklı olsun.
  assert.equal(varyantOlabilirMi('/yuklenen/slider-abc-123.WEBP'), true);
});
