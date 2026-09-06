/**
 * Test betiğinin kapsam denetimi.
 *
 * NEDEN VAR: `npm test` çalıştırılacak dosyaları tek tek sayar. Bu, veritabanı isteyen
 * testleri (permissions/security/superadmin) ayrı tutabilmek için bilinçli bir tercih —
 * ama yan etkisi tehlikeli: `tests/` altına yeni bir test dosyası eklendiğinde betiğe
 * yazılmadığı sürece hiç çalışmaz ve kimse fark etmez. Test yeşil görünür, oysa yeni
 * test hiç koşmamıştır.
 *
 * Bu dosya o boşluğu kapatır: her `*.test.ts`, ya `test` ya da `test:db` betiğinde
 * geçmek zorundadır. Geçmiyorsa burada gürültülü biçimde hata verir ve hangi dosyanın
 * unutulduğunu söyler.
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const KOK = path.join(import.meta.dirname, '..');

function betikleriOku(): { test: string; testDb: string } {
  const paket = JSON.parse(fs.readFileSync(path.join(KOK, 'package.json'), 'utf8'));
  return { test: paket.scripts?.test ?? '', testDb: paket.scripts?.['test:db'] ?? '' };
}

test('tests/ altındaki her test dosyası bir npm betiğinde sayılmıştır', () => {
  const dosyalar = fs
    .readdirSync(path.join(KOK, 'tests'))
    .filter((d) => d.endsWith('.test.ts'))
    .sort();

  assert.ok(dosyalar.length > 0, 'tests/ altında test dosyası bulunamadı');

  const { test: betik, testDb } = betikleriOku();
  const tumu = `${betik} ${testDb}`;

  const unutulanlar = dosyalar.filter((d) => !tumu.includes(`tests/${d}`));

  assert.deepEqual(
    unutulanlar,
    [],
    `Şu test dosyaları hiçbir npm betiğinde geçmiyor, bu yüzden hiç çalışmıyorlar: ` +
      `${unutulanlar.join(', ')}. Veritabanı gerektirmiyorlarsa package.json içindeki ` +
      `"test" betiğine, gerektiriyorlarsa "test:db" betiğine ekleyin.`,
  );
});

test('veritabanı isteyen testler varsayılan test betiğine karışmamıştır', () => {
  const { test: betik, testDb } = betikleriOku();

  assert.ok(testDb.length > 0, '"test:db" betiği tanımlı değil');

  // Bu üç dosya kayıt yazıp siler; ayrı bir _test veritabanı olmadan çalıştırılamazlar
  // (bkz. tests/db-guard.ts). Varsayılan `npm test` içine sızarlarsa her geliştiricide
  // kırmızı yanarlar ve testlere güven kaybolur.
  for (const dosya of ['permissions.test.ts', 'security.test.ts', 'superadmin.test.ts']) {
    assert.ok(
      !betik.includes(`tests/${dosya}`),
      `${dosya} veritabanı ister; varsayılan "test" betiğinde yer almamalı, "test:db" içinde olmalı.`,
    );
    assert.ok(testDb.includes(`tests/${dosya}`), `${dosya} "test:db" betiğinde eksik.`);
  }
});
