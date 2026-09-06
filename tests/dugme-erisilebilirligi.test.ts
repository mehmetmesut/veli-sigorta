/**
 * Düğmelerin klavyeyle etkinleştirilebilir kalmasını güvenceye alan test.
 *
 * NEDEN VAR: Müşteri seçicideki "… adıyla yeni müşteri ekle" düğmesi yalnızca
 * `onMouseDown` dinliyordu. Bu, girdinin blur'unun `click`ten önce gelip listeyi
 * kapatması sorununa karşı bilinçli bir çözümdü — ama yan etkisi ağırdı: klavyeyle
 * (Enter/Space) etkinleştirmede tarayıcı `mousedown` HİÇ üretmez, yalnız `click`
 * gönderir. Yani düğme klavye kullanıcısına tümüyle kapalıydı ve `mousedown`ın
 * herhangi bir sebeple ulaşmadığı her durumda ölü kalıyordu.
 *
 * Kural: `<button>` üzerinde `onMouseDown` varsa `onClick` de bulunmalıdır.
 * `onMouseDown` tek başına bir düğmeyi etkinleştirmenin tek yolu olamaz.
 *
 * Bu kural `<li role="option">` gibi öğelere UYGULANMAZ: birleşik kutu (combobox)
 * kalıbında seçenekler ok tuşları ve Enter ile gezilir, tıklama ikincil yoldur.
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const KOK = path.join(import.meta.dirname, '..');
const TARANAN_DIZINLER = ['app', 'components'];

/** Dizin ağacındaki tüm .tsx dosyalarını toplar. */
function tsxDosyalari(dizin: string, toplanan: string[] = []): string[] {
  for (const girdi of fs.readdirSync(dizin, { withFileTypes: true })) {
    const tam = path.join(dizin, girdi.name);
    if (girdi.isDirectory()) tsxDosyalari(tam, toplanan);
    else if (girdi.name.endsWith('.tsx')) toplanan.push(tam);
  }
  return toplanan;
}

/**
 * `<button` ile başlayan açılış etiketlerinin metnini döndürür.
 *
 * Basit bir `indexOf('>')` YETMEZ: JSX öznitelikleri ok işlevi içerdiğinde
 * (`onClick={() => ...}`) metinde etiketi kapatmayan `>` karakterleri bulunur.
 * Bu yüzden süslü parantez derinliği izlenir ve yalnız derinlik sıfırken görülen
 * `>` etiketin sonu sayılır.
 */
function butonAcilisEtiketleri(icerik: string): string[] {
  const etiketler: string[] = [];
  let konum = icerik.indexOf('<button');

  while (konum !== -1) {
    let derinlik = 0;
    let i = konum;

    for (; i < icerik.length; i += 1) {
      const k = icerik[i];
      if (k === '{') derinlik += 1;
      else if (k === '}') derinlik -= 1;
      else if (k === '>' && derinlik === 0) break;
    }

    etiketler.push(icerik.slice(konum, i + 1));
    konum = icerik.indexOf('<button', i);
  }

  return etiketler;
}

test('onMouseDown dinleyen her düğme onClick de dinler', () => {
  const suclular: string[] = [];

  for (const dizin of TARANAN_DIZINLER) {
    for (const dosya of tsxDosyalari(path.join(KOK, dizin))) {
      const icerik = fs.readFileSync(dosya, 'utf8');
      if (!icerik.includes('onMouseDown')) continue;

      for (const etiket of butonAcilisEtiketleri(icerik)) {
        if (etiket.includes('onMouseDown') && !etiket.includes('onClick')) {
          const goreli = path.relative(KOK, dosya).split(path.sep).join('/');
          suclular.push(`${goreli}: ${etiket.replace(/\s+/g, ' ').slice(0, 90)}`);
        }
      }
    }
  }

  assert.deepEqual(
    suclular,
    [],
    'Şu düğmeler yalnızca fare ile etkinleştirilebiliyor; klavyeyle (Enter/Space) ' +
      `ölüler. onClick ekleyin:\n${suclular.join('\n')}`,
  );
});

test('tarayıcı ok işlevi içeren öznitelikleri etiket sonu sanmaz', () => {
  // Testin kendi ayrıştırıcısının doğruluğu: `=>` içindeki `>` etiketi bitirseydi
  // gerçek kusurlar gözden kaçardı (yanlış negatif — en tehlikeli hata türü).
  const ornek = '<button onMouseDown={(e) => { f(e); }} onClick={() => g()}>Metin</button>';

  const etiketler = butonAcilisEtiketleri(ornek);

  assert.equal(etiketler.length, 1);
  assert.ok(etiketler[0].includes('onClick'), 'ok işlevi etiketi erken kapatmış');
  assert.ok(etiketler[0].endsWith('>'));
});

test('yalnız onMouseDown taşıyan düğme yakalanır', () => {
  // Kuralın gerçekten ayırt ettiğini doğrular; boş liste her zaman geçen bir
  // test yazmış olmayalım.
  const ornek = '<button onMouseDown={(e) => f(e)}>Metin</button>';

  const etiket = butonAcilisEtiketleri(ornek)[0];

  assert.ok(etiket.includes('onMouseDown'));
  assert.ok(!etiket.includes('onClick'));
});
