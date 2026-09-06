'use client';

import React, { useState } from 'react';
import { Check, Copy } from 'lucide-react';

/**
 * Panoya kopyalama düğmesi.
 *
 * Kimlik, poliçe ve iletişim numaraları sigorta şirketlerinin kendi ekranlarına elle
 * yazılıyordu; tek haneli bir hata poliçenin yanlış kişiye düzenlenmesine ya da
 * sorgunun boş dönmesine yol açıyor. Kopyalandığında düğme kısa süre onay gösterir —
 * tıklamanın işe yaradığı görünür olmalı.
 *
 * Müşteriler ve poliçe takibi sayfaları aynı bileşeni kullanır; iki ayrı kopya
 * tutulsaydı biri onay göstergesini ya da pano hatası davranışını kaybederdi.
 */
export function KopyaDugmesi({ deger, etiket }: { deger: string; etiket: string }) {
  const [kopyalandi, setKopyalandi] = useState(false);

  const kopyala = async () => {
    try {
      await navigator.clipboard.writeText(deger);
      setKopyalandi(true);
      setTimeout(() => setKopyalandi(false), 1500);
    } catch {
      // Pano izni yoksa sessiz kalmak yerine kullanıcıya değeri gösterip elle
      // kopyalamasına imkân ver.
      window.prompt(`${etiket} — kopyalamak için Ctrl+C`, deger);
    }
  };

  return (
    <button
      type="button"
      onClick={kopyala}
      aria-label={`${etiket} değerini kopyala`}
      title={kopyalandi ? 'Kopyalandı' : `${etiket} kopyala`}
      /* Dolgu 4 değil 6 piksel: 14 piksellik ikonla birlikte tıklama alanı 22×22'den
         26×26'ya çıkar. WCAG 2.5.8 asgari 24×24 ister; dokunmatik ekranda 22 piksellik
         hedef komşu satıra basılmasına yol açıyordu. */
      className={`p-1.5 rounded transition-colors ${
        kopyalandi ? 'text-emerald-700 bg-emerald-100' : 'text-slate-400 hover:bg-slate-200 hover:text-slate-700'
      }`}
    >
      {kopyalandi ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
}

/**
 * Tek satırda değer + kopyalama düğmesi.
 *
 * İkincil bilgi olarak durur; asıl metne göre daha küçük ve soluk yazılır ki satırı
 * tararken önce isim okunsun. `title` niteliği ne numarası olduğunu söyler —
 * "12345678901" tek başına TCKN mi vergi no mu belli olmuyor.
 */
export function KopyalanabilirDeger({ deger, etiket }: { deger: string; etiket: string }) {
  return (
    <span className="inline-flex items-center gap-1" title={etiket}>
      <span className="font-mono text-[10px] text-slate-500">{deger}</span>
      <KopyaDugmesi deger={deger} etiket={etiket} />
    </span>
  );
}
