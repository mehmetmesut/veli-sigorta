import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
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

// --- Yukleme ucu ile lib arasindaki sozlesme --------------------------------
//
// Varyant genislikleri iki yerde elle eslenirse (lib + yukleme ucu) ayrisma
// derleme hatasi vermez; srcset diskte olmayan bir dosyayi adres gosterir ve
// tarayici gorseli hic yukleyemez. Uc artik listeyi lib'den ICE AKTARIYOR;
// bu test o baglantiyi kilitler.

test('yükleme ucu varyant genişliklerini lib’den içe aktarır', () => {
  const uc = fs.readFileSync(
    path.join(import.meta.dirname, '..', 'app/api/admin/upload/route.ts'),
    'utf8',
  );

  assert.match(uc, /import \{ VARYANT_GENISLIKLERI \} from '@\/lib\/gorsel-varyant'/);
  // Kendi kopyasını yeniden tanımlamamalı.
  assert.doesNotMatch(uc, /const VARYANT_GENISLIKLERI\s*=/);
});

test('ana dosya varyantlardan SONRA yazılır', () => {
  // Ana dosyanın varlığı "varyantlar da hazır" anlamına gelir. Sıra bozulursa
  // varyant hatasında diskte sahipsiz ana dosya kalır ve kullanıcı hata görür.
  const uc = fs.readFileSync(
    path.join(import.meta.dirname, '..', 'app/api/admin/upload/route.ts'),
    'utf8',
  );

  const varyantYazimi = uc.indexOf('varyant.ad');
  const anaYazim = uc.indexOf('path.join(hedefDizin, dosyaAdi), webp');

  assert.ok(varyantYazimi > 0 && anaYazim > 0, 'yazma çağrıları bulunamadı');
  assert.ok(varyantYazimi < anaYazim, 'ana dosya varyantlardan önce yazılıyor');
});

test('varyantlar ana çıktıdan türetilir, ham girdiden değil', () => {
  // Ham girdiden türetilince yalnız genişlik sınırlanıyor; uzun oranlı görsellerde
  // varyant ana dosyadan BÜYÜK çıkıyordu.
  const uc = fs.readFileSync(
    path.join(import.meta.dirname, '..', 'app/api/admin/upload/route.ts'),
    'utf8',
  );

  assert.match(uc, /sharp\(webp, \{ failOn: 'error' \}\)/);
});
