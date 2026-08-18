'use client';

import React from 'react';
import { useSearchParams } from 'next/navigation';
import { QuickQuoteForm } from './QuickQuoteForm';
import { VARSAYILAN_SERVICE_OPTION, hizmetParametresiniEslestir } from '@/lib/service-options';

/**
 * `/teklif-al?hizmet=...` parametresini okuyup teklif formunda ilgili ürünü seçili getirir.
 *
 * Parametre neden sunucuda okunmuyor? Sunucu bileşeninde `searchParams` kullanmak sayfayı
 * tamamen dinamik hâle getirir; sayfa statik ön-render ve ISR önbelleğini kaybeder, üstelik
 * her istekte veritabanı yeniden okunur. Bu ince sarmalayıcı sayesinde sayfa statik kalır,
 * yalnız bu küçük parça istemcide çözümlenir. Suspense sınırı `useSearchParams` için gereklidir.
 */
export function QuoteFormWithIntent({ whatsappNumber }: { whatsappNumber: string }) {
  const searchParams = useSearchParams();
  const secilen = hizmetParametresiniEslestir(searchParams.get('hizmet')) ?? VARSAYILAN_SERVICE_OPTION;

  return (
    <QuickQuoteForm
      whatsappNumber={whatsappNumber}
      defaultServiceTitle={secilen}
      // Parametre değişince (ör. başka bir hizmet bağlantısına tıklanınca) formun
      // iç durumunu tazelemek için anahtar kullanılır; aksi hâlde ilk seçim kalırdı.
      key={secilen}
    />
  );
}
