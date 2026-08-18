import React from 'react';
import Image from 'next/image';
import { getSafeExternalUrl } from '@/lib/safe-url';

/**
 * Google değerlendirme rozeti görseli.
 *
 * Genişlik/yükseklik kaynak dosyanın gerçek ölçüleridir; `next/image` en-boy
 * oranını bunlardan hesapladığı için görsel değiştirilirse bu değerler de
 * güncellenmelidir.
 */
const ROZET = {
  src: '/google-degerlendirin.png',
  width: 1182,
  height: 408,
  alt: 'Google’da Veli Sigorta’yı değerlendirin',
} as const;

interface GoogleReviewBadgeProps {
  /**
   * Panelden gelen ham değerlendirme bağlantısı. `getSafeExternalUrl` ile
   * normalize edilir; geçersiz veya `http/https` dışı bir şema ise bileşen
   * hiç render edilmez (depolanmış XSS'e karşı koruma).
   */
  reviewUrl?: string;
  /** Görselin boyut sınıfları. Kullanıldığı yere göre değişir. */
  className?: string;
  /** `next/image` için `sizes`; `className` ile tutarlı olmalıdır. */
  sizes?: string;
}

/**
 * Google değerlendirme rozetini bağlantılı biçimde gösterir.
 *
 * Rozet görseli başlığı, açıklamayı, yıldızları ve "Değerlendir" düğmesini
 * kendi içinde barındırır; bu yüzden kullanıldığı yerde ayrıca yıldız veya
 * ikinci bir çağrı düğmesi koymayın.
 */
export function GoogleReviewBadge({
  reviewUrl,
  className = 'h-auto w-[260px] max-w-full sm:w-[300px]',
  sizes = '(min-width: 640px) 300px, 260px',
}: GoogleReviewBadgeProps) {
  const url = getSafeExternalUrl(reviewUrl);
  if (!url) return null;

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={ROZET.alt}
      className="inline-block rounded-xl transition-transform hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#F27D26]"
    >
      <Image
        src={ROZET.src}
        alt={ROZET.alt}
        width={ROZET.width}
        height={ROZET.height}
        sizes={sizes}
        className={className}
      />
    </a>
  );
}
