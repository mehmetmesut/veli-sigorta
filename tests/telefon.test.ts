import assert from 'node:assert/strict';
import test from 'node:test';
import { telefonAramasiEslesiyorMu, telefonSadelestir } from '../lib/telefon';

test('ülke kodu ve baştaki sıfır atılarak 10 haneye inilir', () => {
  assert.equal(telefonSadelestir('905307302002'), '5307302002');
  assert.equal(telefonSadelestir('05307302002'), '5307302002');
  assert.equal(telefonSadelestir('5307302002'), '5307302002');
});

test('WhatsApp biçimindeki numara panele girilmiş numarayı bulur', () => {
  const kayitli = ['0(530) 730 20 02'];
  assert.equal(telefonAramasiEslesiyorMu(kayitli, '+90 530 730 20 02'), true);
  assert.equal(telefonAramasiEslesiyorMu(kayitli, '+905307302002'), true);
  assert.equal(telefonAramasiEslesiyorMu(kayitli, '905307302002'), true);
  assert.equal(telefonAramasiEslesiyorMu(kayitli, '05307302002'), true);
  assert.equal(telefonAramasiEslesiyorMu(kayitli, '5307302002'), true);
});

test('ülke kodsuz saklanan numara ülke kodlu sorguyla da bulunur', () => {
  // Teklif kayıtları numarayı bitişik ve ülke kodsuz tutuyor.
  assert.equal(telefonAramasiEslesiyorMu(['5423655640'], '+90 542 365 56 40'), true);
});

test('numaranın yalnız son haneleriyle aranabilir', () => {
  assert.equal(telefonAramasiEslesiyorMu(['0(530) 730 20 02'], '7302002'), true);
});

test('başka bir numara eşleşmez', () => {
  assert.equal(telefonAramasiEslesiyorMu(['0(530) 730 20 02'], '5352986404'), false);
});

test('rakam içermeyen sorgu ve boş numara false döner', () => {
  assert.equal(telefonAramasiEslesiyorMu(['0(530) 730 20 02'], 'mehmet'), false);
  assert.equal(telefonAramasiEslesiyorMu([undefined, null, ''], '5307302002'), false);
});
