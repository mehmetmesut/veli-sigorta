'use client';

import React, { useMemo } from 'react';
import type { Users } from 'lucide-react';

/**
 * Özet paneldeki ölçüm kutularının ortak parçaları.
 *
 * Grafikler el yazımı SVG ile çizilir; grafik kütüphanesi EKLENMEDİ — birkaç
 * basit çubuk için ~50 KB'lık bağımlılık taşımaya değmez.
 *
 * NEDEN ÇUBUK, NEDEN ÇİZGİ DEĞİL: bu panelde veri seyrek ve küçük (8 gün,
 * günde 0-12 arası değerler). Alan/çizgi grafiği yoğun seriler için yapılmıştır;
 * sekiz noktayla çizilen eğri geniş kutuyu doldurur ama HİÇBİR günün değeri
 * okunmaz. Günlük çubukta her günün kendi yüksekliği var, tepe değeri yazılı ve
 * her çubuk imlecin altında tam sayısını söylüyor.
 */

/** Bir günün bir ölçümü. */
export interface SeriNoktasi {
  date: string;
  deger: number;
}

export interface Seri {
  ad: string;
  renk: string;
  noktalar: SeriNoktasi[];
}

/**
 * Ekranda gösterilecek en fazla gün; en yeniler tutulur. Kırpma sessiz değildir,
 * grafiğin altında kaç günün gösterildiği yazılır.
 */
const EN_FAZLA_GUN = 30;

/** Zaman ekseninde en fazla kaç tarih yazılır. */
const EN_FAZLA_ETIKET = 5;

/** Çubuk yuvası, yuva içi boşluk ve çizim yüksekliği (viewBox birimi). */
const YUVA = 12;
const BOSLUK = 3;
const YUKSEKLIK = 40;

function gunEtiketi(iso: string): string {
  const [, ay, gun] = iso.split('-');
  return ay && gun ? `${gun}.${ay}` : iso;
}

function tamTarih(iso: string): string {
  const [yil, ay, gun] = iso.split('-');
  return yil && ay && gun ? `${gun}.${ay}.${yil}` : iso;
}

/**
 * Günlük çubuk grafiği: günler soldan sağa akar, çubuklar tabandan yükselir.
 *
 * NEDEN BU DÜZEN: 30 günlük aralıkta her güne bir satır ayıran liste kutuyu
 * ekran boyu uzatıyordu. Zaman ekseni yatay olduğunda otuz gün tek bakışta
 * görünür ve eğilim (yükseliş/düşüş) doğrudan okunur.
 *
 * Seriler ORTAK ölçekte çizilir: her seriyi kendi tepesine göre normalleştirmek,
 * "0 tıklama" ile "109 gösterim"i aynı yükseklikte gösterip aradaki uçurumu
 * gizlerdi.
 */
export function GunlukCubukGrafigi({ seriler }: { seriler: Seri[] }) {
  const { gunler, ilkIndeks, tepe, toplamGun } = useMemo(() => {
    const tumGunler = seriler[0]?.noktalar.map((n) => n.date) ?? [];
    // Dizi tarihe göre artan geliyor; en yeni günler tutulur.
    const gosterilecek = tumGunler.slice(-EN_FAZLA_GUN);
    const baslangic = tumGunler.length - gosterilecek.length;
    const degerler = seriler.flatMap((s) => s.noktalar.slice(baslangic).map((n) => n.deger));

    return {
      gunler: gosterilecek,
      ilkIndeks: baslangic,
      tepe: Math.max(...degerler, 0),
      toplamGun: tumGunler.length,
    };
  }, [seriler]);

  /**
   * Eksende yazılacak tarihlerin sırası. Otuz tarih yan yana sığmıyor; eşit
   * aralıklı birkaç tarih yazılır ve her biri kendi çubuğunun tam altında durur.
   */
  const etiketSiralari = useMemo(() => {
    if (gunler.length <= 1) return gunler.map((_, i) => i);
    const adet = Math.min(EN_FAZLA_ETIKET, gunler.length);
    const siralar = Array.from({ length: adet }, (_, i) =>
      Math.round((i * (gunler.length - 1)) / (adet - 1)),
    );
    return [...new Set(siralar)];
  }, [gunler]);

  if (gunler.length === 0) {
    return <p className="text-[11px] text-slate-400 py-4 text-center">Bu dönem için veri yok.</p>;
  }

  const olcek = Math.max(tepe, 1);
  const genislik = gunler.length * YUVA;
  const cubukGenisligi = (YUVA - BOSLUK) / seriler.length;

  return (
    /* Grafik kutunun KALAN yüksekliğini doldurur (flex-1). Sabit yükseklikteyken
       yan yandaki Search Console kutusu altındaki ölçüm karolarıyla daha uzun
       oluyor, iki kutu aynı boyda çizildiği için bu kutunun altında kullanılmayan
       bir boşluk kalıyordu. */
    <div className="flex-1 flex flex-col min-h-0">
      {/* Izgara, tarih şeridini eksen sütununun genişliğinden bağımsız olarak
          çizim alanının tam altına hizalar; sabit bir sol boşluk vermek "13" ile
          "109" arasında kayma yaratıyordu. */}
      <div className="grid grid-cols-[auto_1fr] grid-rows-[1fr_auto] gap-x-2 flex-1 min-h-0">
        {/* Tepe değeri eksende yazılı: yükseklikleri bir büyüklüğe bağlamadan
            grafik "çok mu az mı" sorusunu yanıtlayamıyordu. */}
        <div className="flex flex-col justify-between text-[10px] text-slate-400 tabular-nums">
          <span>{tepe.toLocaleString('tr-TR')}</span>
          <span>0</span>
        </div>

        {/* SVG MUTLAK KONUMLU: akışta bıraktığında `viewBox` en-boy oranı üzerinden
            kendi yüksekliğini dayatıyor ve kutuyu ekranın yarısı kadar uzatıyordu.
            Mutlak konumda yükseklik yalnız bu kaptan gelir: en az 80 piksel, kutuda
            yer varsa kalanın tamamı. */}
        <div className="relative min-h-20 min-w-0">
          <svg
            viewBox={`0 0 ${genislik} ${YUKSEKLIK}`}
            preserveAspectRatio="none"
            className="absolute inset-0 w-full h-full"
            role="img"
            aria-label={seriler
              .map((s) => `${s.ad} toplam ${s.noktalar.reduce((t, n) => t + n.deger, 0)}`)
              .join(', ')}
          >
            {gunler.map((gun, i) => (
              <g key={gun}>
                {/* Gün zemini: değeri sıfır olan günler de görünür kalsın. */}
                <rect
                  x={i * YUVA + BOSLUK / 2}
                  y={0}
                  width={YUVA - BOSLUK}
                  height={YUKSEKLIK}
                  className="fill-slate-50"
                />
                {seriler.map((seri, seriIndex) => {
                  const deger = seri.noktalar[ilkIndeks + i]?.deger ?? 0;
                  const y = YUKSEKLIK - (deger / olcek) * YUKSEKLIK;
                  return (
                    <rect
                      key={seri.ad}
                      x={i * YUVA + BOSLUK / 2 + seriIndex * cubukGenisligi}
                      // Sıfır değer ince bir çizgi olarak kalır; hiç çizilmezse
                      // "veri yok" ile "değer sıfır" ayırt edilemiyor.
                      y={deger === 0 ? YUKSEKLIK - 0.6 : y}
                      width={cubukGenisligi}
                      height={deger === 0 ? 0.6 : YUKSEKLIK - y}
                      fill={seri.renk}
                      opacity={deger === 0 ? 0.35 : 1}
                    >
                      <title>{`${tamTarih(gun)} — ${deger.toLocaleString('tr-TR')} ${seri.ad}`}</title>
                    </rect>
                  );
                })}
              </g>
            ))}
          </svg>
        </div>

        <div />

        {/* Tarihler SVG DIŞINDA: esnetilen viewBox içinde yazı da deforme olur.
            Her etiket kendi çubuğunun ortasına yüzdeyle konumlanır. */}
        <div className="relative h-3.5 mt-0.5">
          {etiketSiralari.map((sira) => (
            <span
              key={gunler[sira]}
              className="absolute top-0 text-[10px] text-slate-400 tabular-nums whitespace-nowrap"
              style={{
                left: `${((sira + 0.5) / gunler.length) * 100}%`,
                transform: 'translateX(-50%)',
              }}
            >
              {gunEtiketi(gunler[sira])}
            </span>
          ))}
        </div>
      </div>

      <p className="text-[10px] text-slate-400 mt-0.5">
        {toplamGun > gunler.length
          ? `${toplamGun} günün son ${gunler.length} tanesi gösteriliyor.`
          : `Son ${gunler.length} gün.`}
      </p>
    </div>
  );
}

/** Grafiğin üstündeki renk açıklaması; toplamı da taşır. */
export function SeriAciklamasi({ seriler }: { seriler: Seri[] }) {
  return (
    <div className="flex items-center gap-3 flex-wrap">
      {seriler.map((s) => {
        const toplam = s.noktalar.reduce((t, n) => t + n.deger, 0);
        return (
          <span key={s.ad} className="inline-flex items-baseline gap-1.5 text-[11px]">
            <span className="w-2 h-2 rounded-sm shrink-0 self-center" style={{ backgroundColor: s.renk }} />
            <span className="font-extrabold text-slate-900 tabular-nums">
              {toplam.toLocaleString('tr-TR')}
            </span>
            <span className="text-slate-500">{s.ad}</span>
          </span>
        );
      })}
    </div>
  );
}

/**
 * Etiketli tek ölçüm; birkaçı tek satırda yan yana dizilir.
 *
 * Kutulu/karolu düzenden tek satıra indirildi: iki karo kutunun altında 73 piksel
 * yer kaplıyordu ve yanındaki grafik kutusu aynı boya çekildiği için o yerin
 * yarısı boş kalıyordu. Satır hâlinde aynı iki sayı 14 pikselde okunuyor.
 */
export function OlcumSatiri({
  olcumler,
}: {
  olcumler: { etiket: string; deger: string; ipucu?: string }[];
}) {
  return (
    <p className="text-[11px] text-slate-500 flex items-baseline gap-x-3 gap-y-0.5 flex-wrap">
      {olcumler.map((o) => (
        <span key={o.etiket}>
          {o.etiket} <span className="font-extrabold text-slate-900 tabular-nums">{o.deger}</span>
          {/* İpucu sayının ne anlama geldiğini söyler; karolu düzende alt satırda
              duruyordu, satıra inerken kaybolmamalı. */}
          {o.ipucu && <span className="text-slate-400"> ({o.ipucu})</span>}
        </span>
      ))}
    </p>
  );
}

export interface CubukSatiri {
  etiket: string;
  deger: number;
  ikincil?: string;
}

/**
 * Yoğun çubuk listesi: etiket, çubuk ve değer AYNI satırda.
 *
 * Etiket üstte / çubuk altta olan düzende on kayıt ekranın yarısını yiyordu.
 * Çubuk sabit genişlikli sütunda durur, böylece uzunluklar karşılaştırılabilir.
 */
export function KompaktCubuklar({
  satirlar,
  renk = 'bg-blue-700',
  enFazla = 8,
}: {
  satirlar: CubukSatiri[];
  renk?: string;
  enFazla?: number;
}) {
  if (satirlar.length === 0) {
    return <p className="text-[11px] text-slate-400 py-3 text-center">Bu dönem için veri yok.</p>;
  }

  const gosterilen = satirlar.slice(0, enFazla);
  const tepe = Math.max(...gosterilen.map((s) => s.deger), 1);

  return (
    <div className="space-y-1">
      {gosterilen.map((satir) => (
        <div key={satir.etiket} className="flex items-center gap-2 text-[11px]">
          <span className="text-slate-700 font-semibold truncate flex-1 min-w-0" title={satir.etiket}>
            {satir.etiket || 'Bilinmiyor'}
          </span>
          <span className="w-20 h-1.5 rounded-full bg-slate-100 overflow-hidden shrink-0">
            <span
              className={`block h-full rounded-full ${renk}`}
              style={{ width: `${Math.max((satir.deger / tepe) * 100, 3)}%` }}
            />
          </span>
          <span className="text-slate-900 font-bold w-8 text-right shrink-0 tabular-nums">
            {satir.deger.toLocaleString('tr-TR')}
          </span>
          {satir.ikincil && (
            <span className="text-slate-400 w-24 text-right shrink-0 truncate hidden sm:block">
              {satir.ikincil}
            </span>
          )}
        </div>
      ))}
      {satirlar.length > enFazla && (
        <p className="text-[10px] text-slate-400 pt-1">
          {satirlar.length} kayıttan ilk {enFazla} tanesi gösteriliyor.
        </p>
      )}
    </div>
  );
}

export function Kutu({
  baslik,
  ikon: Ikon,
  sagUst,
  children,
}: {
  baslik: string;
  ikon: typeof Users;
  sagUst?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    /* Izgara hücresi yüksekliğini doldurur ve dikey akış flex olur: içindeki
       grafik `flex-1` ile kalan alanı alabilsin, kutunun altında boşluk kalmasın.
       Satırdaki kutular da böylece aynı boyda görünür. */
    <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-3 flex flex-col gap-2 h-full">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h3 className="text-[11px] font-extrabold uppercase tracking-wider text-slate-600 inline-flex items-center gap-2">
          <Ikon className="w-4 h-4 text-blue-800" /> {baslik}
        </h3>
        {sagUst}
      </div>
      {children}
    </div>
  );
}

/** Bağlantı kurulmadığında grafik yerine gösterilen açıklama. */
export function BaglantiYokKutusu({
  baslik,
  ikon,
  mesaj,
}: {
  baslik: string;
  ikon: typeof Users;
  mesaj: string;
}) {
  return (
    <Kutu baslik={baslik} ikon={ikon}>
      <p className="text-xs text-slate-500">{mesaj}</p>
    </Kutu>
  );
}
