'use client';

import { useEffect, useId, useRef } from 'react';

/** Odak alabilen öğeler — odak tuzağı bu listeyi tarar. */
const ODAKLANABILIR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

interface ModalErisilebilirlik<T extends HTMLElement> {
  /** Pencere kutusuna verilecek ref. Kutu bir div ya da form olabilir. */
  ref: React.RefObject<T | null>;
  /** Pencere kutusuna yayılacak ARIA öznitelikleri. */
  dialogOzellikleri: {
    role: 'dialog';
    'aria-modal': true;
    'aria-labelledby': string;
  };
  /** Başlık öğesine verilecek id. */
  baslikId: string;
}

/**
 * Panel pencerelerine (modal) erişilebilirlik davranışı kazandırır.
 *
 * Mevcut pencerelerin hiçbirinde şunlar yoktu:
 * - `role="dialog"` + `aria-modal` + `aria-labelledby`: ekran okuyucu pencerenin
 *   açıldığını ve adını bildirmiyordu.
 * - Odak tuzağı: odak arka plandaki tabloda kalıyordu; Tab ile arka plandaki
 *   bağlantılar arasında gezinilebiliyordu.
 * - Kapanışta odağın iadesi: pencere kapanınca odak sayfanın başına düşüyordu.
 *
 * Kanca olarak yazıldı (sarmalayıcı bileşen yerine): mevcut form yapılarını hiç
 * değiştirmeden, birkaç öznitelik ekleyerek uygulanabilsin.
 *
 * NOT: Esc tuşu BURADA ele alınmaz. Müşteri ve poliçe formlarında Esc,
 * kaydedilmemiş veri uyarısı gösteren `formuKapat()` akışına bağlı; iki ayrı
 * dinleyici olsaydı uyarı iki kez çıkardı. Esc'i çağıran sayfa yönetir.
 */
export function useModalErisilebilirlik<T extends HTMLElement = HTMLDivElement>(
  acikMi: boolean,
): ModalErisilebilirlik<T> {
  const baslikId = useId();
  const ref = useRef<T | null>(null);
  const oncekiOdakRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!acikMi) return;

    oncekiOdakRef.current = document.activeElement as HTMLElement | null;
    ref.current?.querySelector<HTMLElement>(ODAKLANABILIR)?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      const odaklar = ref.current?.querySelectorAll<HTMLElement>(ODAKLANABILIR);
      if (!odaklar || odaklar.length === 0) return;

      const ilk = odaklar[0];
      const son = odaklar[odaklar.length - 1];

      if (e.shiftKey && document.activeElement === ilk) {
        e.preventDefault();
        son.focus();
      } else if (!e.shiftKey && document.activeElement === son) {
        e.preventDefault();
        ilk.focus();
      }
    };

    window.addEventListener('keydown', onKey);
    const iadeEdilecek = oncekiOdakRef.current;

    return () => {
      window.removeEventListener('keydown', onKey);
      // Pencere kapanınca odak, pencereyi açan düğmeye geri döner.
      iadeEdilecek?.focus?.();
    };
  }, [acikMi]);

  return {
    ref,
    dialogOzellikleri: { role: 'dialog', 'aria-modal': true, 'aria-labelledby': baslikId },
    baslikId,
  };
}
