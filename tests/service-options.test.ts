import assert from 'node:assert/strict';
import test from 'node:test';
import { SERVICE_OPTIONS, hizmetParametresiniEslestir, slugla } from '../lib/service-options';

test('slugla Türkçe harfleri ASCII karşılığına çevirir', () => {
  assert.equal(slugla('Kasko Sigortası'), 'kasko-sigortasi');
  assert.equal(slugla('Tamamlayıcı Sağlık Sigortası (TSS)'), 'tamamlayici-saglik-sigortasi-tss');
  assert.equal(slugla('İşyeri Sigortası'), 'isyeri-sigortasi');
  assert.equal(slugla('Konut & Eşya Sigortası'), 'konut-esya-sigortasi');
});

test('blog bağlantısındaki başlık birebir eşleşir', () => {
  // app/haberler/[slug] `encodeURIComponent(srv.title)` gönderiyor.
  assert.equal(hizmetParametresiniEslestir('Kasko Sigortası'), 'Kasko Sigortası');
  assert.equal(hizmetParametresiniEslestir('İşyeri Sigortası'), 'İşyeri Sigortası');
});

test('slaytlardaki slug biçimi eşleşir', () => {
  assert.equal(hizmetParametresiniEslestir('kasko-sigortasi'), 'Kasko Sigortası');
  assert.equal(
    hizmetParametresiniEslestir('dask-zorunlu-deprem-sigortasi'),
    'DASK Zorunlu Deprem Sigortası',
  );
});

test('parantezli ek yüzünden tam eşleşmeyen slug ön ekle bulunur', () => {
  // Hizmet slug'ı "tamamlayici-saglik-sigortasi", listedeki başlık ise "(TSS)" eki taşır.
  assert.equal(
    hizmetParametresiniEslestir('tamamlayici-saglik-sigortasi'),
    'Tamamlayıcı Sağlık Sigortası (TSS)',
  );
});

test('eşleşme yoksa null döner ve çağıran varsayılana düşer', () => {
  assert.equal(hizmetParametresiniEslestir('olmayan-bir-urun'), null);
  assert.equal(hizmetParametresiniEslestir(''), null);
  assert.equal(hizmetParametresiniEslestir(undefined), null);
  assert.equal(hizmetParametresiniEslestir('   '), null);
});

test('eşleştirme her zaman listedeki bir değeri döndürür', () => {
  // Aksi hâlde <select> denetimsiz (uncontrolled) duruma düşer ve seçim boş görünür.
  const sonuc = hizmetParametresiniEslestir('seyahat-saglik-sigortasi');
  assert.ok(sonuc && (SERVICE_OPTIONS as readonly string[]).includes(sonuc));
});
