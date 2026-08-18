'use client';

import React, { useMemo } from 'react';
import { Search } from 'lucide-react';
import {
  BaglantiYokKutusu, GunlukCubukGrafigi, Kutu, OlcumSatiri, SeriAciklamasi, type Seri,
} from './grafik-parcalari';

/**
 * Search Console arama performansı grafiği.
 *
 * Tıklama ve gösterim gün başına yan yana çubuk olarak, ORTAK ölçekte: ayrı
 * grafiklerde her seri kendi tepesine göre çizildiği için "0 tıklama" ile
 * "109 gösterim" aynı yükseklikte görünüyor, aradaki uçurum kayboluyordu.
 *
 * Sorgu listesi bu kutuda DEĞİL: diğer liste kutularıyla birlikte bilgi kutuları
 * bölümünde duruyor, böylece grafik satırı iki eşit kutuya bölünebiliyor.
 */

export interface AramaSatiri {
  key: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

export interface AramaOzeti {
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

export interface AramaGunlukNoktasi {
  date: string;
  clicks: number;
  impressions: number;
}

export function AramaKonsoluGrafikleri({
  gunluk, ozet, yapilandirilmamisMesaj,
}: {
  gunluk: AramaGunlukNoktasi[];
  ozet: AramaOzeti | null;
  yapilandirilmamisMesaj?: string;
}) {
  const seriler = useMemo<Seri[]>(
    () => [
      { ad: 'gösterim', renk: '#0891b2', noktalar: gunluk.map((n) => ({ date: n.date, deger: n.impressions })) },
      { ad: 'tıklama', renk: '#7c3aed', noktalar: gunluk.map((n) => ({ date: n.date, deger: n.clicks })) },
    ],
    [gunluk],
  );

  if (yapilandirilmamisMesaj) {
    return <BaglantiYokKutusu baslik="Arama Performansı" ikon={Search} mesaj={yapilandirilmamisMesaj} />;
  }

  return (
    <Kutu
      baslik="Arama Performansı (Search Console)"
      ikon={Search}
      sagUst={<SeriAciklamasi seriler={seriler} />}
    >
      <GunlukCubukGrafigi seriler={seriler} />

      {/* CTR ve ortalama sıra grafikte gösterilemeyen ama karar için gereken iki
          ölçüm: "çok gösterim, az tıklama" durumu ancak sırayla yorumlanabiliyor. */}
      {ozet && (
        <OlcumSatiri
          olcumler={[
            {
              etiket: 'Tıklama oranı',
              deger: `%${ozet.ctr.toLocaleString('tr-TR')}`,
              ipucu: 'gösterim başına',
            },
            {
              etiket: 'Ortalama sıra',
              deger: ozet.position.toLocaleString('tr-TR'),
              ipucu: 'küçük olması iyidir',
            },
          ]}
        />
      )}
    </Kutu>
  );
}
