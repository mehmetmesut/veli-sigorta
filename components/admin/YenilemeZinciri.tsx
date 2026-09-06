'use client';

import React from 'react';
import { History, AlertTriangle } from 'lucide-react';
import type { Policy } from '@/lib/types';
import { formatTarih, zincirYenilenmedi } from '@/lib/police';
import { bransKisaAd, bransRengi } from '@/lib/brans-renk';

/**
 * Yenileme zincirleri kartı.
 *
 * NEDEN AYRI BİR KART: Müşteri kartındaki "Aktif Poliçeler" ve "Poliçe Tarihçesi"
 * listeleri "şu an neyi var?" sorusunu yanıtlıyor. Bu kart bambaşka bir soruyu
 * yanıtlar: "aynı riski kaç yıldır kesintisiz yeniliyor ve bıraktığı bir şey var mı?"
 * İkisini tek listede birleştirmek personelin günlük akışını gürültüye boğardı.
 *
 * Yalnız ANLAMLI zincirler çizilir: gerçekten yenilenmiş olanlar (iki ve daha fazla
 * poliçe) ya da kopmuş olanlar (süresi dolmuş, yerine yenisi girilmemiş). Tek ve hâlâ
 * yürürlükte olan poliçeler için kart hiç görünmez — anlatacak bir geçmiş yok.
 */
export function YenilemeZinciriKarti({
  zincirler,
  simdi,
}: {
  zincirler: Policy[][];
  simdi: Date;
}) {
  const gosterilecek = zincirler.filter((z) => z.length > 1 || zincirYenilenmedi(z, simdi));
  if (gosterilecek.length === 0) return null;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs">
      <div className="flex items-center gap-2 p-5 border-b border-slate-200">
        <History className="w-4 h-4 text-slate-500" />
        <h2 className="font-bold text-slate-900 text-base">Yenileme Geçmişi</h2>
        <span className="text-[11px] text-slate-400">({gosterilecek.length})</span>
      </div>

      <div className="p-5 space-y-3">
        {gosterilecek.map((zincir) => {
          const ilk = zincir[0];
          const son = zincir[zincir.length - 1];
          const kopuk = zincirYenilenmedi(zincir, simdi);

          return (
            <div
              key={ilk.id}
              className="rounded-xl border border-slate-200 p-3.5 space-y-2 bg-slate-50/60"
            >
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded ${bransRengi(ilk.sigortaTuru)}`}
                >
                  {bransKisaAd(ilk.sigortaTuru)}
                </span>
                <span className="text-[11px] font-bold text-slate-700">
                  {zincir.length > 1 ? `${zincir.length} dönem` : 'tek dönem'}
                </span>
                <span className="text-[11px] text-slate-500">
                  {formatTarih(ilk.baslangicTarihi)} — {formatTarih(son.bitisTarihi)}
                </span>

                {kopuk && (
                  // Kayıp müşteri işareti: personelin arayıp geri kazanabileceği tek
                  // yer burası. Kırmızı değil amber — kayıp kesin değil, fırsat.
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-800 inline-flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" /> Yenilenmedi
                  </span>
                )}
              </div>

              {/* Poliçe numaraları eskiden yeniye. Zincirin kendisi bilgi taşıyor:
                  numaralar arasındaki ok "bu, şunun yenilemesi" demek. */}
              <div className="flex items-center gap-1.5 flex-wrap text-[11px]">
                {zincir.map((p, sira) => (
                  <React.Fragment key={p.id}>
                    {sira > 0 && <span className="text-slate-300">→</span>}
                    <span
                      className={`font-mono px-1.5 py-0.5 rounded border ${
                        sira === zincir.length - 1
                          ? 'bg-white border-slate-300 text-slate-800 font-bold'
                          : 'bg-white border-slate-200 text-slate-500'
                      }`}
                      title={`${formatTarih(p.baslangicTarihi)} — ${formatTarih(p.bitisTarihi)} · ${p.sigortaSirketi}`}
                    >
                      {p.policeNo || '—'}
                    </span>
                  </React.Fragment>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
