import React from 'react';
import { serializeJsonLd } from '@/lib/json-ld';

/**
 * Sayfaya JSON-LD yapısal veri basar.
 *
 * Neden ayrı bileşen: her sayfada aynı üç satır tekrarlanıyordu —
 * `enableStructuredData` kontrolü, `<script type="application/ld+json">` ve
 * `dangerouslySetInnerHTML` + `serializeJsonLd`. Beş yeni sayfaya daha
 * eklenecekken bu kalıbı çoğaltmak, ileride kaçış kuralı değişirse dokuz ayrı
 * yerde düzeltme gerektirirdi.
 *
 * `serializeJsonLd` şart: içerik panelden geliyor ve `</script>` gibi diziler
 * kaçırılmazsa sayfaya script enjekte edilebilir.
 */
export function YapisalVeri({
  etkin,
  semalar,
}: {
  /** `settings.enableStructuredData`; kapalıysa hiçbir şey basılmaz. */
  etkin: boolean;
  /** Basılacak şemalar; `null`/`undefined` olanlar atlanır (ör. S.S.S. yoksa). */
  semalar: (object | null | undefined)[];
}) {
  if (!etkin) return null;

  return (
    <>
      {semalar.filter(Boolean).map((sema, i) => (
        <script
          // Şemalar sayfa başına sabit sırada üretiliyor; dizin anahtar olarak güvenli.
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: serializeJsonLd(sema) }}
        />
      ))}
    </>
  );
}
