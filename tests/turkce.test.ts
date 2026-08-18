import assert from 'node:assert/strict';
import test from 'node:test';
import { aramaNormalize, metinAramasiEslesiyorMu } from '../lib/turkce';

// --- aramaNormalize ---------------------------------------------------------
// Asıl açık: tr-TR küçültme "YILMAZ"ı noktasız "yılmaz" yapıyor, standart klavyeyle
// yazılan "yilmaz" ise noktalı kalıyor ve eşleşme tutmuyordu.

test('noktasız ı ile noktalı i aynı değere katlanır', () => {
  assert.equal(aramaNormalize('YILMAZ'), 'yilmaz');
  assert.equal(aramaNormalize('yılmaz'), 'yilmaz');
  assert.equal(aramaNormalize('yilmaz'), 'yilmaz');
  assert.equal(aramaNormalize('Yilmaz'), 'yilmaz');
});

test('İ ve I her iki yazımda da aynı sonucu verir', () => {
  assert.equal(aramaNormalize('İstanbul'), 'istanbul');
  assert.equal(aramaNormalize('Istanbul'), 'istanbul');
  assert.equal(aramaNormalize('ISTANBUL'), 'istanbul');
  assert.equal(aramaNormalize('ıstanbul'), 'istanbul');
});

test('ş ğ ç ö ü ve düzeltme işaretli harfler ASCII karşılığına iner', () => {
  assert.equal(aramaNormalize('Işık'), 'isik');
  assert.equal(aramaNormalize('BEDELOĞLU'), 'bedeloglu');
  assert.equal(aramaNormalize('ÇELİK'), 'celik');
  assert.equal(aramaNormalize('ÖZTÜRK'), 'ozturk');
  assert.equal(aramaNormalize('Kâmil'), 'kamil');
});

test('boş ve tanımsız değerler boş metne düşer', () => {
  assert.equal(aramaNormalize(''), '');
  assert.equal(aramaNormalize(undefined), '');
  assert.equal(aramaNormalize(null), '');
});

// --- metinAramasiEslesiyorMu -----------------------------------------------

test('boş sorgu her kaydı geçirir', () => {
  assert.equal(metinAramasiEslesiyorMu(['Kasko Sigortası'], ''), true);
  assert.equal(metinAramasiEslesiyorMu(['Kasko Sigortası'], '   '), true);
});

test('Türkçe harf farkına rağmen eşleşir', () => {
  const alanlar = ['Mehmet Mesut YILMAZ', 'Zorunlu Trafik Sigortası'];
  assert.equal(metinAramasiEslesiyorMu(alanlar, 'yilmaz'), true);
  assert.equal(metinAramasiEslesiyorMu(alanlar, 'YILMAZ'), true);
  assert.equal(metinAramasiEslesiyorMu(alanlar, 'trafik sigortasi'), true);
});

test('kelimeler ayrı ayrı aranır ve hepsi bulunmalıdır', () => {
  const alanlar = ['Mehmet Mesut YILMAZ', 'Kasko Sigortası'];
  // Araya giren "Mesut" eşleşmeyi bozmamalı.
  assert.equal(metinAramasiEslesiyorMu(alanlar, 'mehmet yilmaz'), true);
  // Kelimeler farklı alanlarda olabilir.
  assert.equal(metinAramasiEslesiyorMu(alanlar, 'yilmaz kasko'), true);
  // Bir kelime hiç yoksa sonuç düşer.
  assert.equal(metinAramasiEslesiyorMu(alanlar, 'mehmet demir'), false);
});

test('tanımsız ve boş alanlar sorun çıkarmaz', () => {
  assert.equal(metinAramasiEslesiyorMu(['Ali VELİ', undefined, null, ''], 'veli'), true);
  assert.equal(metinAramasiEslesiyorMu([undefined, null], 'veli'), false);
});

test('eşleşmeyen sorgu false döner', () => {
  assert.equal(metinAramasiEslesiyorMu(['Kasko Sigortası'], 'konut'), false);
});
