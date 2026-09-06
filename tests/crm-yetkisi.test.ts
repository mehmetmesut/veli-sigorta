/**
 * CRM (müşteri + poliçe) erişim yetkisinin testleri.
 *
 * NEDEN VAR: Bu koleksiyonlar T.C. kimlik numarası, vergi numarası ve komisyon
 * tutarı taşır. Eskiden oturumu olan her rol `?fields=customers,policies` ile
 * tabloların tamamını indirebiliyordu. Buradaki testler yetkinin BUGÜNKÜ sınırını
 * kilitler: liste daraltıldığı ya da genişletildiği gün test bilerek kırılır ve
 * kararın gözden geçirilmesini zorunlu kılar.
 */

import assert from 'node:assert/strict';
import test from 'node:test';

import { canAccessCrm, isCrmEntity, isCrmField } from '../lib/permissions';

test('CRM verisine bugün her panel rolü erişir', () => {
  // Bu yetki bir DENETİM NOKTASI kurar, erişimi daraltmaz: personel müşteri ve
  // poliçe ekranlarında günlük işini yapıyor. Daraltma ayrı ve bilinçli bir karar.
  assert.equal(canAccessCrm('superadmin'), true);
  assert.equal(canAccessCrm('admin'), true);
  assert.equal(canAccessCrm('user'), true);
});

test('CRM alanları müşteri, poliçe ve poliçe sayılarıdır', () => {
  assert.equal(isCrmField('customers'), true);
  assert.equal(isCrmField('policies'), true);
  // Müşteri başına poliçe sayısı türetilmiş bir veridir ama yine de müşteri
  // kimliklerini sızdırır; CRM sayılmazsa yetki denetimi delinir.
  assert.equal(isCrmField('policeSayilari'), true);
});

test('teklif ve site içeriği alanları CRM sayılmaz', () => {
  // Özet panel (app/admin/page.tsx) ve teklif ekranı HER role açık. Bu alanlar
  // CRM listesine girerse iki ekran birden kapanır.
  assert.equal(isCrmField('quotes'), false);
  assert.equal(isCrmField('settings'), false);
  assert.equal(isCrmField('partners'), false);
  assert.equal(isCrmField('services'), false);
  assert.equal(isCrmField('blogs'), false);
});

test('yazma denetimi müşteri ve poliçe türlerini kapsar', () => {
  assert.equal(isCrmEntity('customers'), true);
  assert.equal(isCrmEntity('policies'), true);
});

test('teklif yazma türü CRM sayılmaz', () => {
  // Teklif kaydında kimlik numarası yoktur (bkz. lib/types.ts QuoteRequest) ve
  // teklif ekranı her role açıktır. Yalnız teklifi poliçeye çeviren 'policelestir'
  // eylemi CRM denetimine girer; bu ayrım uç noktada eylem adıyla yapılır.
  assert.equal(isCrmEntity('quotes'), false);
  assert.equal(isCrmEntity('settings'), false);
});

test('bilinmeyen alan ve tür CRM sayılmaz', () => {
  // Yanlış yönde hata yapmamak için: tanınmayan bir ad CRM denetimini tetiklemez,
  // ama zaten hiçbir CRM verisi de döndürmez.
  assert.equal(isCrmField('bilinmeyen'), false);
  assert.equal(isCrmEntity('bilinmeyen'), false);
});
