import { randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';
import { getCurrentAdmin } from '@/lib/auth';
import { addAuditLog } from '@/lib/db';
import { assertSameOrigin } from '@/lib/admin-content-validation';
import { consumeRateLimit, getClientRateLimitKey } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

/**
 * Slider alanının ölçüsü; görsel bu kutuya en-boy oranı korunarak sığdırılır
 * (`fit: 'inside'` — kırpma yapmaz, yalnızca küçültür).
 *
 * Oran 1800/850 ≈ 2,12:1, yani önerilen 900 × 425 görselin oranıyla aynıdır;
 * bu sayede 900 × 425 (veya katları) yüklendiğinde en-boy oranı hiç değişmez.
 * Ölçü, ekrandaki ~903 CSS piksellik alanın iki katıdır: yüksek yoğunluklu
 * (retina) ekranlarda bulanıklaşmaz.
 */
const HEDEF_GENISLIK = 1800;
const HEDEF_YUKSEKLIK = 850;
const MAKS_BOYUT_BAYT = 8 * 1024 * 1024;
const WEBP_KALITE = 82;

/**
 * Dar ekranlar için üretilen ek genişlikler.
 *
 * Slider alanı mobilde ~360, tablette ~740 CSS piksel; iki katı alınarak yüksek
 * yoğunluklu ekranlarda da net kalması sağlanır. 1800 piksellik ana dosya zaten
 * üretiliyor, burada tekrarlanmaz.
 */
const VARYANT_GENISLIKLERI = [720, 1200] as const;

// SVG kabul edilmez: rasterleştirilse bile kaynak dosya XSS taşıyabilir.
const IZINLI_TIPLER = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/avif']);

function getUploadDir(): string {
  const configured = process.env.UPLOAD_DIR?.trim();
  if (!configured) {
    throw new Error('UPLOAD_DIR tanımlı değil.');
  }
  return configured;
}

/**
 * Yükleme başına dakikalık sınır.
 *
 * Her istek 8 MB'a kadar veriyi sharp ile yeniden kodluyor (CPU yoğun) ve diske kalıcı
 * olarak yazıyor. Sınır olmadan tek bir panel hesabı döngüyle CPU'yu doyurabilir ve diski
 * doldurabilirdi; disk dolduğunda MySQL yazmaları da başarısız olur.
 */
const YUKLEME_HIZ_SINIRI = { limit: 20, windowMs: 60 * 1000 };

export async function POST(request: NextRequest) {
  // Diğer tüm yazma uçlarındaki iki katmanlı korumanın burada eksik olan ayağı.
  // Çerez SameSite=lax olduğu için çapraz site POST'ta zaten çerez gitmez; bu denetim
  // ikinci savunma hattıdır.
  try {
    assertSameOrigin(request);
  } catch {
    return NextResponse.json({ error: 'İstek kaynağı doğrulanamadı.' }, { status: 403 });
  }

  const current = await getCurrentAdmin();
  if (!current) {
    return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
  }

  const hizSiniri = consumeRateLimit(
    getClientRateLimitKey('upload', request),
    YUKLEME_HIZ_SINIRI,
  );
  if (!hizSiniri.allowed) {
    return NextResponse.json(
      { error: 'Çok fazla görsel yüklediniz. Lütfen bir dakika sonra tekrar deneyin.' },
      { status: 429, headers: { 'Retry-After': String(hizSiniri.retryAfterSeconds) } },
    );
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: 'Geçersiz form verisi.' }, { status: 400 });
  }

  const file = formData.get('file');
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Dosya bulunamadı.' }, { status: 400 });
  }

  if (file.size > MAKS_BOYUT_BAYT) {
    return NextResponse.json(
      { error: `Dosya çok büyük. En fazla ${MAKS_BOYUT_BAYT / (1024 * 1024)} MB yükleyebilirsiniz.` },
      { status: 413 },
    );
  }

  if (!IZINLI_TIPLER.has(file.type)) {
    return NextResponse.json(
      { error: 'Yalnızca JPEG, PNG, WebP veya AVIF görseller yüklenebilir.' },
      { status: 415 },
    );
  }

  try {
    const girdi = Buffer.from(await file.arrayBuffer());

    // sharp geçersiz/bozuk görselde hata verir; bu aynı zamanda tür doğrulamasıdır.
    const donusturucu = sharp(girdi, { failOn: 'error' });
    const bilgi = await donusturucu.metadata();
    if (!bilgi.width || !bilgi.height) {
      return NextResponse.json({ error: 'Görsel çözümlenemedi.' }, { status: 415 });
    }

    const webp = await donusturucu
      .rotate() // EXIF yönünü uygula
      .resize({
        width: HEDEF_GENISLIK,
        height: HEDEF_YUKSEKLIK,
        fit: 'inside', // en-boy oranı korunur, kutuya sığdırılır
        withoutEnlargement: true,
      })
      .webp({ quality: WEBP_KALITE })
      .toBuffer();

    const kimlik = randomUUID();
    const dosyaAdi = `slider-${kimlik}.webp`;
    const hedefDizin = getUploadDir();
    await fs.mkdir(hedefDizin, { recursive: true });
    await fs.writeFile(path.join(hedefDizin, dosyaAdi), webp);

    // Dar ekranlar için küçük varyantlar. `next/image` bu yolu işleyemediği için
    // (nginx servis ediyor, Next sunucusu 404 veriyor) boyutlandırmayı yükleme
    // anında biz yapıyoruz; bileşen srcset ile tarayıcıya seçtiriyor.
    // Adlandırma düzeni sabittir: `<ad>-<genişlik>w.webp`.
    await Promise.all(
      VARYANT_GENISLIKLERI.map(async (genislik) => {
        const varyant = await sharp(girdi, { failOn: 'error' })
          .rotate()
          .resize({ width: genislik, fit: 'inside', withoutEnlargement: true })
          .webp({ quality: WEBP_KALITE })
          .toBuffer();
        await fs.writeFile(path.join(hedefDizin, `slider-${kimlik}-${genislik}w.webp`), varyant);
      }),
    );

    const url = `/yuklenen/${dosyaAdi}`;

    await addAuditLog(current.email, 'MEDIA_UPLOAD', `Slider görseli yüklendi: ${dosyaAdi}`).catch(
      (error) => console.error('Yükleme denetim kaydı başarısız:', error),
    );

    return NextResponse.json({
      success: true,
      url,
      width: Math.min(bilgi.width, HEDEF_GENISLIK),
      boyutKb: Math.round(webp.length / 1024),
    });
  } catch (error) {
    console.error('Görsel yükleme başarısız:', error);
    return NextResponse.json({ error: 'Görsel işlenemedi.' }, { status: 500 });
  }
}
