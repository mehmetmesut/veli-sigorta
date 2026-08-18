#!/usr/bin/env node
/**
 * Varyant düzeni gelmeden önce yüklenmiş slider görselleri için dar ekran
 * varyantlarını sonradan üretir.
 *
 * Sunucuda çalıştırılır:
 *   set -a; . private/velisigorta.env; set +a
 *   node db/varyant-uret.cjs           # ne yapılacağını gösterir
 *   node db/varyant-uret.cjs --uygula  # dosyaları üretir
 *
 * Yalnızca EKLEME yapar; hiçbir dosyayı silmez veya değiştirmez. Varyantı zaten olan
 * görseller atlanır, böylece tekrar çalıştırılabilir.
 */

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

// lib/gorsel-varyant.ts ve app/api/admin/upload/route.ts ile aynı olmalıdır.
const VARYANT_GENISLIKLERI = [720, 1200];
const WEBP_KALITE = 82;
const ANA_DOSYA_DUZENI = /^slider-[0-9a-f-]+\.webp$/i;

const uygula = process.argv.includes('--uygula');
const dizin = process.env.UPLOAD_DIR;

if (!dizin) {
  console.error('UPLOAD_DIR tanımlı değil.');
  process.exit(1);
}

async function main() {
  const dosyalar = fs.readdirSync(dizin).filter((f) => ANA_DOSYA_DUZENI.test(f));
  console.log(`Ana slider görseli: ${dosyalar.length}`);
  console.log(uygula ? 'Mod: UYGULA\n' : 'Mod: ön izleme (değişiklik yapılmaz)\n');

  let uretilen = 0;
  let atlanan = 0;

  for (const dosya of dosyalar) {
    const taban = dosya.replace(/\.webp$/i, '');
    const kaynak = path.join(dizin, dosya);

    for (const genislik of VARYANT_GENISLIKLERI) {
      const hedefAd = `${taban}-${genislik}w.webp`;
      const hedef = path.join(dizin, hedefAd);

      if (fs.existsSync(hedef)) {
        atlanan++;
        continue;
      }

      if (!uygula) {
        console.log(`  üretilecek: ${hedefAd}`);
        uretilen++;
        continue;
      }

      const veri = await sharp(kaynak, { failOn: 'error' })
        .resize({ width: genislik, fit: 'inside', withoutEnlargement: true })
        .webp({ quality: WEBP_KALITE })
        .toBuffer();

      fs.writeFileSync(hedef, veri);
      const kb = Math.round(veri.length / 1024);
      const anaKb = Math.round(fs.statSync(kaynak).size / 1024);
      console.log(`  ${hedefAd.padEnd(52)} ${String(kb).padStart(4)} KB (ana: ${anaKb} KB)`);
      uretilen++;
    }
  }

  console.log(`\nÜretilen: ${uretilen} | Zaten vardı: ${atlanan}`);
  if (!uygula && uretilen > 0) {
    console.log('Uygulamak için: node db/varyant-uret.cjs --uygula');
  }
}

main().catch((e) => {
  console.error('Varyant üretimi başarısız:', e.message);
  process.exit(1);
});
