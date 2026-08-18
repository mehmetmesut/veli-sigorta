import React from 'react';
import { ImageOff } from 'lucide-react';

interface ContentImageProps {
  /** Panelden girilen görsel adresi. Boş veya tanımsız olabilir. */
  src?: string;
  alt: string;
  className?: string;
  /** Görsel yokken gösterilen kutunun sınıfları; kapsayıcı düzeni bozulmasın diye verilir. */
  placeholderClassName?: string;
  loading?: 'eager' | 'lazy';
}

/**
 * Panelden gelen içerik görsellerini güvenli biçimde gösterir.
 *
 * Neden gerekli: `<img src={post.featuredImage} />` yazıldığında alan boş bırakılmışsa
 * tarayıcı `src=""` değerini **geçerli bir adres** sayar ve sayfanın kendi adresini görsel
 * olarak yeniden indirir. Bu hem gereksiz bir tam sayfa isteği hem de bozuk görsel ikonu
 * demektir. Burada adres boşsa hiç `<img>` üretilmez, yerine nötr bir yer tutucu konur.
 *
 * Görseller `next/image` yerine ham `<img>` ile veriliyor; çünkü panelden yüklenen dosyalar
 * `/yuklenen/` altında nginx tarafından servis ediliyor ve Next'in görsel iyileştirici ucu
 * bu yolu çözemiyor (HTTP 400).
 */
export function ContentImage({
  src,
  alt,
  className,
  placeholderClassName,
  loading = 'lazy',
}: ContentImageProps) {
  const adres = (src || '').trim();

  if (!adres) {
    return (
      <div
        role="img"
        aria-label={`${alt} — görsel eklenmemiş`}
        className={
          placeholderClassName ||
          `${className || ''} bg-[#F5F2EC] flex items-center justify-center text-[#B9B0A4]`
        }
      >
        <ImageOff className="w-8 h-8" aria-hidden="true" />
      </div>
    );
  }

  /* eslint-disable-next-line @next/next/no-img-element */
  return <img src={adres} alt={alt} className={className} loading={loading} />;
}
