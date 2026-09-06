/**
 * Panel pencerelerinin (modal) erişilebilirlik korumasını kilitleyen testler.
 *
 * NEDEN KAYNAK KODU OKUYOR: Proje testleri React bileşeni ÇALIŞTIRMIYOR (node:test,
 * tarayıcı yok). Odak tuzağını çalışırken doğrulamak bir tarayıcı koşucusu gerektirir
 * ve bu proje ona bağımlı değil. Buradaki testler bunun yerine sözleşmenin yerinde
 * durduğunu denetler: her pencere ortak kancayı kullanıyor mu, kapatma düğmelerinin
 * erişilebilir adı var mı?
 *
 * Kaba ama gerçek bir gerilemeyi yakalar: yeni bir pencere kancasız eklendiğinde ya
 * da kanca bir dosyadan sökülüldüğünde test kırmızı yanar. Panel pencerelerinde ARIA
 * ve odak yönetimi eskiden hiç yoktu; sessizce o hâle geri dönülmesin.
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const KOK = path.join(import.meta.dirname, '..');

/** Pencere (modal) barındıran dosyalar; her biri ortak kancayı kullanmak zorunda. */
const PENCERELI_DOSYALAR = [
  'app/admin/musteriler/page.tsx',
  'app/admin/musteriler/[id]/page.tsx',
  'app/admin/police-takibi/page.tsx',
  'app/admin/teklifler/page.tsx',
  'components/admin/TeklifPolicelestir.tsx',
  'components/admin/WhatsAppReminderModal.tsx',
];

const oku = (goreliYol: string) => fs.readFileSync(path.join(KOK, goreliYol), 'utf8');

test('pencere barındıran her dosya ortak erişilebilirlik kancasını kullanır', () => {
  const kancasizlar = PENCERELI_DOSYALAR.filter(
    (dosya) => !oku(dosya).includes('useModalErisilebilirlik'),
  );

  assert.deepEqual(
    kancasizlar,
    [],
    'Şu dosyalarda pencere var ama ortak erişilebilirlik kancası kullanılmıyor: ' +
      `${kancasizlar.join(', ')}. Pencere kutusuna ref + dialogOzellikleri, başlığa baslikId verin.`,
  );
});

test('kanca ARIA, odak tuzağı ve odak iadesinin üçünü de sağlar', () => {
  const kanca = oku('components/admin/useModalErisilebilirlik.ts');

  // Ekran okuyucunun pencereyi tanıması için üçü birden gerekir.
  assert.match(kanca, /role: 'dialog'/);
  assert.match(kanca, /'aria-modal': true/);
  assert.match(kanca, /'aria-labelledby'/);

  // Odak tuzağı: Tab döngüsü kurulmazsa odak arka plandaki tabloya kaçar.
  assert.match(kanca, /e\.key !== 'Tab'/);
  assert.match(kanca, /shiftKey/);

  // Kapanışta odak, pencereyi açan düğmeye döner; yoksa sayfanın başına düşer.
  assert.match(kanca, /iadeEdilecek\?\.focus/);
});

test('kancayı kullanan her dosya ARIA özniteliklerini gerçekten yayar', () => {
  // Kancayı içe aktarıp kutuya bağlamayı unutmak sessiz bir hata olurdu:
  // derleme geçer, ekran okuyucu hiçbir şey duymaz.
  const bagimsizlar = PENCERELI_DOSYALAR.filter((dosya) => {
    const icerik = oku(dosya);
    return !icerik.includes('dialogOzellikleri');
  });

  assert.deepEqual(bagimsizlar, [], `dialogOzellikleri yayılmamış: ${bagimsizlar.join(', ')}`);
});

test('pencerelerdeki kapatma düğmelerinin erişilebilir adı vardır', () => {
  // Yalnız ikon taşıyan bir düğme ekran okuyucuda "düğme" diye okunur; ne yaptığı
  // duyulmaz. Kapatma düğmesi penceredeki en kritik kontrol olduğu için aranıyor.
  const eksikler: string[] = [];

  for (const dosya of PENCERELI_DOSYALAR) {
    const icerik = oku(dosya);
    // Kapatma düğmesi olan her dosyada en az bir "kapat" aria-label'ı bulunmalı.
    if (/<X className/.test(icerik) && !/aria-label="[^"]*[Kk]apat/.test(icerik)) {
      eksikler.push(dosya);
    }
  }

  assert.deepEqual(eksikler, [], `Kapatma düğmesinde aria-label yok: ${eksikler.join(', ')}`);
});
