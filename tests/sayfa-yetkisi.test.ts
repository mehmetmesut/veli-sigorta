import assert from 'node:assert/strict';
import test from 'node:test';
import { izinliSayfalar, sayfayaErisebilirMi } from '../lib/permissions';

// Süper yönetici sitenin sahibi; hiçbir ekran ondan gizlenmez.
test('süper yönetici her sayfaya erişir', () => {
  assert.equal(izinliSayfalar('superadmin'), null);
  for (const yol of ['/admin', '/admin/ayarlar', '/admin/loglar', '/admin/google-seo']) {
    assert.equal(sayfayaErisebilirMi('superadmin', yol), true);
  }
});

test('admin operasyon ekranlarına erişir', () => {
  const acik = [
    '/admin', '/admin/icerik-haritasi', '/admin/musteriler', '/admin/police-takibi',
    '/admin/teklifler', '/admin/hizmetler', '/admin/kategoriler', '/admin/sirketler',
    '/admin/kampanyalar', '/admin/blog', '/admin/sss', '/admin/kullanicilar',
  ];
  for (const yol of acik) {
    assert.equal(sayfayaErisebilirMi('admin', yol), true, `${yol} açık olmalı`);
  }
});

test('admin site altyapısı ekranlarına erişemez', () => {
  // Bu ekranlar sitenin teknik sahibine ait; yanlış bir değişiklik canlıyı bozar.
  const kapali = ['/admin/google-seo', '/admin/analiz', '/admin/ayarlar', '/admin/loglar'];
  for (const yol of kapali) {
    assert.equal(sayfayaErisebilirMi('admin', yol), false, `${yol} kapalı olmalı`);
  }
});

test('alt yollar üst sayfanın iznini devralır', () => {
  // Müşteri detay sayfası: /admin/musteriler/<id>
  assert.equal(sayfayaErisebilirMi('admin', '/admin/musteriler/cust-123'), true);
  // Kapalı bir sayfanın alt yolu da kapalıdır.
  assert.equal(sayfayaErisebilirMi('admin', '/admin/ayarlar/gelismis'), false);
});

test('/admin ön ek olarak davranmaz', () => {
  // Aksi hâlde "/admin" izni paneldeki HER sayfayı açardı.
  assert.equal(sayfayaErisebilirMi('admin', '/admin'), true);
  assert.equal(sayfayaErisebilirMi('admin', '/admin/loglar'), false);
});

test('sondaki eğik çizgi erişimi değiştirmez', () => {
  assert.equal(sayfayaErisebilirMi('admin', '/admin/blog/'), true);
  assert.equal(sayfayaErisebilirMi('admin', '/admin/loglar/'), false);
  assert.equal(sayfayaErisebilirMi('admin', '/admin/'), true);
});

test('Sistem Kullanıcısı rolü admin ile aynı ekranları görür', () => {
  // Fark ekranların İÇİNDEKİ yetkilerde: sistem kullanıcıları ekranı görünür ama
  // 'user' rolü orada düzenleme yapamaz (canManageUsers).
  assert.equal(sayfayaErisebilirMi('user', '/admin/kullanicilar'), true);
  assert.equal(sayfayaErisebilirMi('user', '/admin/musteriler'), true);
  assert.equal(sayfayaErisebilirMi('user', '/admin/ayarlar'), false);
  assert.equal(sayfayaErisebilirMi('user', '/admin/loglar'), false);
});

test('bilinmeyen yol hiçbir rolde açılmaz', () => {
  assert.equal(sayfayaErisebilirMi('admin', '/admin/olmayan-sayfa'), false);
  assert.equal(sayfayaErisebilirMi('user', '/admin/olmayan-sayfa'), false);
});

test('şifre değiştirme ekranı HER role açıktır', () => {
  // Kısıtlı roldeki personel de kendi parolasını değiştirebilmeli; aksi hâlde
  // parolayı bir yöneticiye söyleyip onun değiştirmesi gerekiyordu.
  assert.equal(sayfayaErisebilirMi('user', '/admin/sifre'), true);
  assert.equal(sayfayaErisebilirMi('admin', '/admin/sifre'), true);
  assert.equal(sayfayaErisebilirMi('superadmin', '/admin/sifre'), true);
});
