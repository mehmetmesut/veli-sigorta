'use client';

import React from 'react';
import { Mars, Venus } from 'lucide-react';

/**
 * Cinsiyet seçimi.
 *
 * NEDEN VAR: "Devrim Deniz", "Yağmur Aydın" gibi adlarda kişinin kadın mı erkek mi
 * olduğu isimden anlaşılmıyor. Poliçe düzenlerken ve müşteriye hitap ederken bu
 * ayrım gerekiyor; sistemde tutulmadığında personel her seferinde müşteriyi arayıp
 * sormak ya da tahmin etmek zorunda kalıyordu.
 *
 * NEDEN AÇILIR LİSTE DEĞİL: Alan iki seçenekli ve ad/soyadın hemen yanında duruyor.
 * Açılır listede seçim üç etkileşim (aç, seç, kapat) sürüyor ve seçili değer ancak
 * okunarak anlaşılıyordu; iki düğmede seçim tek tıkla yapılır ve mevcut değer
 * bakışta görülür. Kalıp, aynı formdaki "Müşteri Tipi" seçicisiyle birebir aynıdır.
 *
 * SEÇİM ZORUNLU DEĞİLDİR: seçili düğmeye tekrar basmak seçimi kaldırır. Üçüncü bir
 * "Belirtilmemiş" düğmesi eklemek, alanın büyük çoğunlukta boş kalacağı bir yerde
 * satırı gereksiz genişletirdi.
 */

/** Veritabanına yazılan değerler. Müşteri kartında da bu metin gösterilir. */
export const CINSIYET_SECENEKLERI = [
  { deger: 'Kadın', Icon: Venus },
  { deger: 'Erkek', Icon: Mars },
] as const;

interface CinsiyetSeciciProps {
  deger?: string;
  /** Seçim kaldırıldığında `undefined` gelir. */
  onDegisim: (deger: string | undefined) => void;
}

export function CinsiyetSecici({ deger, onDegisim }: CinsiyetSeciciProps) {
  return (
    <div>
      {/* Etiket `Field` bileşeniyle aynı biçimde çizilir ama onun içine KONMAZ:
          `Field` tek bir denetime işaret eden `<label>` üretiyor, buradaysa iki
          düğmeden oluşan bir grup var. Aynı sebeple "Müşteri Tipi" seçicisi de
          kendi etiketini çiziyor. */}
      <div className="text-[11px] font-bold text-slate-700 mb-1">Cinsiyeti</div>

      <div role="group" aria-label="Cinsiyeti" className="inline-flex p-1 rounded-xl bg-slate-100 gap-1">
        {CINSIYET_SECENEKLERI.map(({ deger: secenek, Icon }) => {
          const secili = deger === secenek;

          return (
            <button
              key={secenek}
              type="button"
              onClick={() => onDegisim(secili ? undefined : secenek)}
              aria-pressed={secili}
              title={secili ? `${secenek} seçili — kaldırmak için tekrar tıklayın` : secenek}
              className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold inline-flex items-center gap-1.5 transition-colors ${
                secili
                  ? 'bg-blue-900 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-white hover:text-slate-900'
              }`}
            >
              {/* İkon tek başına anlam taşımıyor; etiket metni yanında duruyor. */}
              <Icon className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              {secenek}
            </button>
          );
        })}
      </div>
    </div>
  );
}
