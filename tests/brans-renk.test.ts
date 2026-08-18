import assert from 'node:assert/strict';
import test from 'node:test';
import { bransKisaAd, bransRengi } from '../lib/brans-renk';

test('araç branşları aynı rengi paylaşır', () => {
  const kasko = bransRengi('Kasko Sigortası');
  assert.equal(bransRengi('Zorunlu Trafik Sigortası'), kasko);
  assert.equal(bransRengi('İhtiyari Mali Mesuliyet (İMM)'), kasko);
});

test('farklı aileler farklı renk alır', () => {
  const arac = bransRengi('Kasko Sigortası');
  const konut = bransRengi('DASK Zorunlu Deprem Sigortası');
  const saglik = bransRengi('Tamamlayıcı Sağlık Sigortası (TSS)');

  assert.notEqual(arac, konut);
  assert.notEqual(arac, saglik);
  assert.notEqual(konut, saglik);
});

test('sağlık, seyahatten önce eşleşir', () => {
  // "Yurt Dışı Seyahat Sağlık Sigortası" iki anahtar da içerir; seyahat kuralı
  // listede önce geldiği için seyahat rengini almalı.
  assert.equal(
    bransRengi('Yurt Dışı Seyahat Sağlık Sigortası'),
    bransRengi('Schengen Seyahat Sağlık Sigortası'),
  );
});

test('tanınmayan branş nötr renk alır, uydurulmaz', () => {
  const notr = bransRengi('Bilinmeyen Bir Branş');
  assert.equal(bransRengi(''), notr);
  assert.equal(bransRengi(undefined), notr);
  assert.ok(notr.includes('slate'));
});

test('kısa ad, sondaki Sigortası ekini ve parantezi atar', () => {
  assert.equal(bransKisaAd('Kasko Sigortası'), 'Kasko');
  assert.equal(bransKisaAd('Tamamlayıcı Sağlık Sigortası (TSS)'), 'Tamamlayıcı Sağlık');
  assert.equal(bransKisaAd('Zorunlu Trafik Sigortası'), 'Zorunlu Trafik');
  assert.equal(bransKisaAd(''), '—');
});

test('kısaltma sonucu boş kalırsa özgün ad korunur', () => {
  // "Sigortası" tek başına yazılmışsa boş dizeye düşmemeli.
  assert.equal(bransKisaAd('Sigortası'), 'Sigortası');
});
