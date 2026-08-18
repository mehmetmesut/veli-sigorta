'use client';

import React, { useState } from 'react';
import { CheckCircle2, X } from 'lucide-react';
import type { QuoteRequest } from '@/lib/types';
import { formatTarih } from '@/lib/police';
import { birYilSonrasi } from '@/lib/form-helpers';
import { Field, FieldRow, inputCls } from './form-ui';
import { useModalErisilebilirlik } from './useModalErisilebilirlik';

/**
 * Onaylanan teklifi poliçeye çeviren pencere.
 *
 * Hem müşteri detay sayfasındaki "Onayla ve poliçeleştir" düğmesi hem teklifler
 * listesinde durumu "Poliçeleştirildi" yapmak buraya düşer: iki yolda da poliçe
 * kaydı oluşturulur. Durum listesinden seçmek eskiden yalnız etiketi değiştiriyor,
 * ortada poliçe kaydı olmuyordu — teklif "poliçeleştirildi" görünürken poliçe
 * takibinde hiçbir şey çıkmıyordu.
 *
 * Poliçe numarası ZORUNLU DEĞİL: acente numarayı çoğu zaman şirketin sisteminde
 * poliçeyi düzenledikten sonra öğreniyor ama takibin hemen başlaması gerekiyor.
 * Sigorta şirketi zorunlu — hangi şirkette olduğu bilinmeyen poliçe takip edilemez.
 */
export interface PolicelestirVerisi {
  baslangicTarihi: string;
  policeNo: string;
  sigortaSirketi: string;
}

export function TeklifPolicelestir({
  teklif, sirketOnerileri, onKapat, onOnay, kaydediliyor,
}: {
  teklif: QuoteRequest;
  sirketOnerileri: string[];
  onKapat: () => void;
  onOnay: (veri: PolicelestirVerisi) => void;
  kaydediliyor: boolean;
}) {
  const { ref, dialogOzellikleri, baslikId } = useModalErisilebilirlik<HTMLFormElement>(true);
  const [baslangic, setBaslangic] = useState(() => new Date().toISOString().slice(0, 10));
  const [policeNo, setPoliceNo] = useState('');
  const [sigortaSirketi, setSigortaSirketi] = useState('');

  function gonder(e: React.FormEvent) {
    e.preventDefault();
    onOnay({ baslangicTarihi: baslangic, policeNo, sigortaSirketi });
  }

  return (
    <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-start justify-center p-4 overflow-y-auto">
      <form ref={ref} {...dialogOzellikleri} onSubmit={gonder} className="bg-white rounded-2xl w-full max-w-lg my-8 shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-slate-200">
          <h2 id={baslikId} className="font-extrabold text-slate-900">Teklifi Poliçeleştir</h2>
          <button type="button" onClick={onKapat} aria-label="Pencereyi kapat" className="p-1.5 rounded-lg hover:bg-slate-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <p className="text-xs text-slate-600">
            <span className="font-bold">{teklif.fullName}</span> için{' '}
            <span className="font-bold">{teklif.serviceName}</span> teklifi poliçe kaydına
            çevrilecek ve Poliçe Takibi ekranına eklenecek.
          </p>

          <FieldRow sutun={2}>
            <Field
              label="Poliçe Başlangıç Tarihi"
              required
              tur="date"
              hint={`Bitiş: ${formatTarih(birYilSonrasi(baslangic))}`}
            >
              <input
                required
                type="date"
                value={baslangic}
                onChange={(e) => setBaslangic(e.target.value)}
                className={inputCls}
              />
            </Field>
            <Field label="Poliçe No" hint="Sonra da girilebilir">
              <input value={policeNo} onChange={(e) => setPoliceNo(e.target.value)} className={inputCls} />
            </Field>
          </FieldRow>

          <Field label="Sigorta Şirketi" required hint="Poliçenin hangi şirkette olduğu">
            <input
              required
              value={sigortaSirketi}
              onChange={(e) => setSigortaSirketi(e.target.value)}
              list="policelestir-sirket"
              className={inputCls}
            />
            <datalist id="policelestir-sirket">
              {sirketOnerileri.map((s) => <option key={s} value={s} />)}
            </datalist>
          </Field>
        </div>

        <div className="p-5 border-t border-slate-200 flex items-center justify-end gap-2">
          <button type="button" onClick={onKapat} className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs">
            Vazgeç
          </button>
          <button type="submit" disabled={kaydediliyor} className="px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 disabled:opacity-60 text-white font-bold text-xs inline-flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" /> {kaydediliyor ? 'Oluşturuluyor…' : 'Poliçeyi Oluştur'}
          </button>
        </div>
      </form>
    </div>
  );
}
