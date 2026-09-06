/**
 * Müşteri aktif/pasif geçiş metinlerinin testleri.
 *
 * NEDEN VAR: Onay kutusundaki cümle, personelin işlemi yapıp yapmamasını belirliyor.
 * "Silinecek mi?" korkusu doğuran ya da poliçelerin duracağını ima eden bir metin
 * özelliği kullanılmaz kılar. Metin saf işlevde tutulduğu için burada kilitlenebiliyor.
 */

import assert from 'node:assert/strict';
import test from 'node:test';

import { durumBildirimi, durumOnayMetni } from '../lib/musteri-durum';

test('aktife alma onayı kısadır ve poliçeden hiç söz etmez', () => {
  // Aktifleştirme geri alıcı bir işlem; uyarı cümlesi eklemek gereksiz korku yaratır.
  const metin = durumOnayMetni('Mehmet Mesut YILMAZ', true, 3);

  assert.match(metin, /yeniden aktif/);
  assert.doesNotMatch(metin, /poliçe/i);
});

test('pasife alma onayı kaydın silinmediğini açıkça söyler', () => {
  const metin = durumOnayMetni('Saime BEDEL', false, 0);

  assert.match(metin, /pasife alınsın mı/);
  assert.match(metin, /silinmez/);
  assert.match(metin, /"Pasif"/);
});

test('yürürlükteki poliçe sayısı onay metninde adıyla geçer', () => {
  // Personel "pasife alırsam poliçe takibi durur mu?" diye tereddüt ediyordu.
  const metin = durumOnayMetni('Işık Turizm A.Ş.', false, 2);

  assert.match(metin, /Yürürlükte 2 poliçesi var/);
  assert.match(metin, /poliçe takibinden düşmez/);
});

test('poliçesi olmayan müşteride poliçe uyarısı eklenmez', () => {
  const metin = durumOnayMetni('Arif KARABEN', false, 0);

  assert.doesNotMatch(metin, /Yürürlükte/);
  // Kaydın silinmediği bilgisi yine de verilir; asıl korku budur.
  assert.match(metin, /silinmez/);
});

test('müşteri adı onay metninde tırnak içinde geçer', () => {
  // Uzun kurumsal unvanlarda cümlenin nerede bittiği anlaşılmıyordu.
  const metin = durumOnayMetni('Akdeniz Atlas Yeraltı Yer Üstü Makina', false, 1);

  assert.match(metin, /"Akdeniz Atlas Yeraltı Yer Üstü Makina"/);
});

test('bildirim metni yapılan işleme göre değişir', () => {
  assert.match(durumBildirimi('Dilek EREN', true), /yeniden aktifleştirildi/);
  assert.match(durumBildirimi('Dilek EREN', false), /pasife alındı/);
});

test('pasife alma bildirimi kaydın listede kalacağını söyler', () => {
  // Kayıt listeden KAYBOLMUYOR; personel kaybolduğunu sanıp paniklemesin.
  assert.match(durumBildirimi('Cem ÇAYIRCI', false), /listede .*görünmeye devam eder/);
});
