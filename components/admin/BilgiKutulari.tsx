'use client';

import React, { useMemo } from 'react';
import { BarChart3, Bot, FileText, ListOrdered } from 'lucide-react';
import { KompaktCubuklar, Kutu, type CubukSatiri } from './grafik-parcalari';
import { ga4KanalAdi, yapayZekaKaynagiMi, yonlendirenAdi } from '@/lib/olcum-etiketleri';
import type { AramaSatiri } from './AramaKonsoluGrafikleri';
import type { KanalNoktasi } from './Ga4Grafikleri';

/**
 * Özet panelin alt bölümündeki dört bilgi kutusu.
 *
 * Hepsi "hangi kaynak / hangi sayfa / hangi kelime" sorusunu yanıtlıyor; grafik
 * satırından ayrılıp burada toplandılar. Böylece üstteki iki grafik ekranın tam
 * genişliğini eşit paylaşıyor, listeler de aşağıda birbirleriyle karşılaştırılabilir
 * duruyor.
 *
 * İKİ FARKLI KAYNAK bilinçli olarak ayrı kutularda:
 * - "Trafik Kaynakları" GA4'ün kanal sınıflandırması (Google'ın gördüğü),
 * - "Arama Motoru & AI Yönlendirmeleri" sitenin KENDİ ziyaret kaydı.
 * Sayılar birbirini tutmayabilir; ikisi farklı şeyi ölçüyor ve tek kutuda
 * birleştirmek yanıltıcı olurdu.
 */

export interface ZiyaretSayfasi {
  path: string;
  count: number;
}

export function BilgiKutulari({
  kanallar, sorgular, ziyaretSayfalari, yonlendirenler,
}: {
  kanallar: KanalNoktasi[];
  sorgular: AramaSatiri[];
  ziyaretSayfalari: ZiyaretSayfasi[];
  /** Kendi ziyaret kayıtlarımızdaki kaynak kırılımı: { Direct: 453, Google: 2, … } */
  yonlendirenler: Record<string, number>;
}) {
  const kanalSatirlari = useMemo<CubukSatiri[]>(
    () => kanallar.map((k) => ({ etiket: ga4KanalAdi(k.name), deger: k.sessions })),
    [kanallar],
  );

  // Gösterime göre sıralanır: tıklama henüz sıfırken tıklamaya göre sıralamak
  // listeyi rastgele gösteriyordu.
  const sorguSatirlari = useMemo<CubukSatiri[]>(
    () =>
      [...sorgular]
        .sort((a, b) => b.impressions - a.impressions)
        .map((s) => ({
          etiket: s.key,
          deger: s.impressions,
          ikincil: `${s.clicks} tıklama · ${s.position.toLocaleString('tr-TR')}. sıra`,
        })),
    [sorgular],
  );

  const sayfaSatirlari = useMemo<CubukSatiri[]>(
    () => ziyaretSayfalari.map((s) => ({ etiket: s.path === '/' ? '/ (ana sayfa)' : s.path, deger: s.count })),
    [ziyaretSayfalari],
  );

  /**
   * "Doğrudan" girişler bu kutuda gösterilmez: kutunun sorusu "beni hangi arama
   * motoru ya da yapay zekâ yönlendirdi?" — doğrudan giriş bir yönlendirme değil
   * ve 453 değeriyle listeyi ezip diğerlerini görünmez yapıyordu.
   */
  const yonlendirenSatirlari = useMemo<CubukSatiri[]>(
    () =>
      Object.entries(yonlendirenler)
        .filter(([kategori]) => kategori !== 'Direct')
        .sort((a, b) => b[1] - a[1])
        .map(([kategori, adet]) => ({
          etiket: yonlendirenAdi(kategori),
          deger: adet,
          ikincil: yapayZekaKaynagiMi(kategori) ? 'yapay zekâ' : undefined,
        })),
    [yonlendirenler],
  );

  const dogrudanSayisi = yonlendirenler.Direct ?? 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
      <Kutu baslik="Trafik Kaynakları" ikon={BarChart3}>
        <KompaktCubuklar satirlar={kanalSatirlari} enFazla={6} />
      </Kutu>

      <Kutu baslik="Aramada Çıkan Kelimeler" ikon={ListOrdered}>
        <KompaktCubuklar satirlar={sorguSatirlari} renk="bg-cyan-600" enFazla={6} />
      </Kutu>

      <Kutu baslik="En Çok Ziyaret Edilen Sayfalar (30 Gün)" ikon={FileText}>
        <KompaktCubuklar satirlar={sayfaSatirlari} renk="bg-emerald-600" enFazla={6} />
      </Kutu>

      <Kutu baslik="Arama Motoru & AI Yönlendirmeleri" ikon={Bot}>
        <KompaktCubuklar satirlar={yonlendirenSatirlari} renk="bg-violet-600" enFazla={6} />
        {dogrudanSayisi > 0 && (
          <p className="text-[10px] text-slate-400 pt-1">
            Ayrıca {dogrudanSayisi.toLocaleString('tr-TR')} doğrudan giriş var (yönlendiren
            adresi olmayan ziyaretler listeye alınmaz).
          </p>
        )}
      </Kutu>
    </div>
  );
}
