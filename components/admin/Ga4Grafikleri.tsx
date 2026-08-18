'use client';

import React, { useMemo } from 'react';
import { TrendingUp } from 'lucide-react';
import {
  BaglantiYokKutusu, GunlukCubukGrafigi, Kutu, SeriAciklamasi, type Seri,
} from './grafik-parcalari';

/**
 * GA4 günlük ziyaretçi grafiği.
 *
 * DÖNÜŞÜM SERİSİ BİLİNÇLİ OLARAK YOK. Bir süre bu kutuda ziyaretçinin yanında
 * "teklif talebi" çubuğu da çiziliyordu; o sayı acentenin kendi teklif
 * kayıtlarından geliyor ve kayıtlar siteden değil PANELDEN ELLE giriliyor
 * (sitedeki form veritabanına yazmıyor, WhatsApp'ı açıyor). İki çubuk yan yana
 * durunca "5 ziyaretçi, 9 teklif" gibi satırlar ziyaretin teklife döndüğünü
 * söylüyormuş gibi okunuyordu; oysa aralarında hiçbir nedensellik yok.
 *
 * Site formu gerçekten kayıt oluşturur hâle gelirse dönüşüm serisi geri
 * eklenebilir — o zaman ölçtüğü şey gerçekten dönüşüm olur.
 *
 * Kanal dağılımı bu kutuda DEĞİL: diğer kaynak listeleriyle birlikte bilgi
 * kutuları bölümünde duruyor, böylece grafik satırı iki eşit kutuya bölünebiliyor.
 */

export interface GunlukNokta {
  date: string;
  activeUsers: number;
  sessions: number;
}

export interface KanalNoktasi {
  name: string;
  sessions: number;
}

const BASLIK = 'Günlük Ziyaretçi (GA4)';

export function Ga4Grafikleri({
  gunluk, yapilandirilmamisMesaj,
}: {
  gunluk: GunlukNokta[];
  yapilandirilmamisMesaj?: string;
}) {
  const seriler = useMemo<Seri[]>(
    () => [
      { ad: 'ziyaretçi', renk: '#1e40af', noktalar: gunluk.map((n) => ({ date: n.date, deger: n.activeUsers })) },
    ],
    [gunluk],
  );

  if (yapilandirilmamisMesaj) {
    return <BaglantiYokKutusu baslik={BASLIK} ikon={TrendingUp} mesaj={yapilandirilmamisMesaj} />;
  }

  return (
    <Kutu baslik={BASLIK} ikon={TrendingUp} sagUst={<SeriAciklamasi seriler={seriler} />}>
      <GunlukCubukGrafigi seriler={seriler} />

      <p className="text-[10px] text-slate-400 leading-snug">
        Google Analytics&rsquo;in o gün siteyi gezen olarak saydığı kişi sayısı.
      </p>
    </Kutu>
  );
}
