'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { CalendarClock, MessageCircle } from 'lucide-react';
import type { YaklasanBitis } from '@/lib/types';
import {
  ACILIYET_STIL,
  YENILEME_ESIKLERI,
  aciliyet,
  formatTarih,
  kalanGun,
  musteriAdi,
  toWhatsAppNumber,
  yenilemeEsigi,
} from '@/lib/police';
import { bransKisaAd, bransRengi } from '@/lib/brans-renk';

/**
 * Özet paneldeki yenileme takip panosu.
 *
 * NEDEN ÖZET PANELDE: Acentenin geliri yenilemeden geliyor ama yaklaşan bitişler
 * yalnız poliçe takibi ekranında, süzgeç seçilerek görülebiliyordu. Personelin
 * "bugün kimi aramalıyım?" sorusu panele girer girmez yanıtlanmalı — ayrı bir
 * ekrana gidip süzgeç seçmek, günlük alışkanlığa dönüşmeyen bir adım.
 *
 * Sunum bileşenidir: WhatsApp penceresini kendisi açmaz, isteği `onHatirlat` ile
 * yukarı bildirir. Pencere durumu sayfada durur.
 */

/** Bölümde gösterilecek satır sayısı; gerisi poliçe takibi ekranında. */
const GOSTERILECEK = 8;

export function YaklasanYenilemeler({
  satirlar,
  simdi,
  onHatirlat,
}: {
  satirlar: YaklasanBitis[];
  /** Dışarıdan verilir: her render'da `new Date()` çağırmak listeyi çizim sırasında oynatırdı. */
  simdi: Date;
  onHatirlat: (satir: YaklasanBitis) => void;
}) {
  const [esik, setEsik] = useState<number>(YENILEME_ESIKLERI[YENILEME_ESIKLERI.length - 1]);

  // Kalan gün bir kez hesaplanır; hem çip sayıları hem tablo bunu kullanır.
  const zenginler = useMemo(
    () =>
      satirlar
        .map((s) => ({ satir: s, kalan: kalanGun(s.bitisTarihi, simdi) }))
        .filter((x) => yenilemeEsigi(x.kalan) !== null)
        .sort((a, b) => (a.kalan ?? 0) - (b.kalan ?? 0)),
    [satirlar, simdi],
  );

  const sayilar = useMemo(() => {
    const m: Record<number, number> = {};
    YENILEME_ESIKLERI.forEach((e) => {
      m[e] = zenginler.filter((x) => (x.kalan ?? 0) <= e).length;
    });
    return m;
  }, [zenginler]);

  const secilenler = zenginler.filter((x) => (x.kalan ?? 0) <= esik);

  // Yaklaşan bitişi olmayan bir acentede bölüm hiç çizilmez; boş tablo panelde
  // yer kaplamaktan başka bir şey yapmıyor.
  if (zenginler.length === 0) return null;

  return (
    <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs">
      <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
        <h2 className="font-bold text-slate-900 text-base inline-flex items-center gap-2">
          <CalendarClock className="w-4 h-4 text-amber-600" />
          Yaklaşan Yenilemeler
        </h2>
        <Link
          href="/admin/police-takibi"
          className="text-[11px] font-bold text-blue-800 hover:underline"
        >
          Poliçe Takibi →
        </Link>
      </div>

      {/* Eşik çipleri. Sıra dar → geniş: en acil olan solda, göz oraya ilk gidiyor. */}
      <div className="flex items-center gap-1 overflow-x-auto w-full mb-3">
        {YENILEME_ESIKLERI.map((e) => (
          <button
            key={e}
            type="button"
            onClick={() => setEsik(e)}
            className={`px-3 py-1.5 rounded-lg text-[11px] font-bold whitespace-nowrap border transition-colors ${
              esik === e
                ? 'bg-blue-900 text-white border-blue-900'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >
            {e} gün
            <span className={`ml-1.5 ${esik === e ? 'text-blue-200' : 'text-slate-400'}`}>
              {sayilar[e] ?? 0}
            </span>
          </button>
        ))}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-50 text-slate-500 uppercase font-bold text-[10px] tracking-wider">
              <th className="px-3 py-2">Müşteri</th>
              <th className="px-3 py-2">Branş</th>
              <th className="px-3 py-2">Bitiş</th>
              <th className="px-3 py-2">Kalan</th>
              <th className="px-3 py-2 text-right">Hatırlat</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {secilenler.slice(0, GOSTERILECEK).map(({ satir, kalan }) => {
              // Numara geçersizse WhatsApp düğmesi çalışmaz; düğmeyi gizlemek yerine
              // devre dışı bırakmak "numara eksik" bilgisini de veriyor.
              const waHazir = Boolean(toWhatsAppNumber(satir.musteri.mobilTelefon));

              return (
                <tr key={satir.policeId} className="hover:bg-slate-50/80">
                  <td className="px-3 py-2.5">
                    <Link
                      href={`/admin/musteriler/${satir.musteri.id}`}
                      className="font-bold text-slate-800 hover:text-blue-800 hover:underline"
                    >
                      {musteriAdi(satir.musteri)}
                    </Link>
                    <div className="text-[10px] text-slate-400 font-mono">
                      {satir.policeNo || 'poliçe no yok'}
                    </div>
                  </td>
                  <td className="px-3 py-2.5">
                    <span
                      className={`px-2 py-0.5 rounded border text-[10px] font-bold ${bransRengi(satir.sigortaTuru)}`}
                      title={satir.sigortaTuru}
                    >
                      {bransKisaAd(satir.sigortaTuru)}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-slate-600 whitespace-nowrap">
                    {formatTarih(satir.bitisTarihi)}
                  </td>
                  <td className="px-3 py-2.5">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold whitespace-nowrap ${ACILIYET_STIL[aciliyet(kalan)]}`}
                    >
                      {kalan === 0 ? 'bugün' : `${kalan} gün`}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    <button
                      type="button"
                      onClick={() => onHatirlat(satir)}
                      disabled={!waHazir}
                      title={waHazir ? 'WhatsApp hatırlatması' : 'Cep telefonu kayıtlı değil'}
                      aria-label={`${musteriAdi(satir.musteri)} için WhatsApp hatırlatması`}
                      className="p-1.5 rounded-lg text-emerald-700 hover:bg-emerald-100 disabled:opacity-40 disabled:hover:bg-transparent"
                    >
                      <MessageCircle className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {secilenler.length > GOSTERILECEK && (
        <p className="text-[11px] text-slate-500 mt-3">
          {secilenler.length} poliçeden ilk {GOSTERILECEK} tanesi gösteriliyor.{' '}
          <Link href="/admin/police-takibi" className="font-bold text-blue-800 hover:underline">
            Tümünü poliçe takibinde aç
          </Link>
        </p>
      )}
    </div>
  );
}
