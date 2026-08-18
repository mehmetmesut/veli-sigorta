'use client';

import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';

export const inputCls = 'w-full px-3 py-2 rounded-lg border border-slate-300 text-xs focus:border-blue-700 focus:ring-1 focus:ring-blue-700 outline-hidden';

/**
 * Alan genişliğine eklenen sabit paylar (piksel).
 *
 * `ch` birimi yazı tipindeki "0" karakterinin genişliğidir; alanın alabileceği en uzun
 * değerin karakter sayısını verdiğimizde gerçek metin genişliğini elde ederiz. Üstüne
 * iç boşluk (px-3 → 12+12), kenarlık (1+1) ve 5 piksel nefes payı eklenir. Tarih ve
 * açılır listelerde tarayıcının kendi simgesi için 30 piksel daha gerekir.
 */
const EK_GENISLIK = { text: 29, date: 59, select: 59 } as const;

type AlanTuru = keyof typeof EK_GENISLIK;

interface FieldProps {
  label: string;
  hint?: string;
  /** Zorunlu alanlar yıldızla işaretlenir; kullanıcı neyi doldurmak zorunda olduğunu bir bakışta görür. */
  required?: boolean;
  /**
   * Alana girilebilecek en uzun değerin karakter sayısı. Verildiğinde alan tam o
   * genişlikte olur — 11 haneli kimlik numarası için sayfa genişliğinde kutu açılmaz.
   * Boş bırakılırsa alan kabındaki boşluğu doldurur (uzun metinler için).
   */
  ch?: number;
  /** Genişlik hesabında tarayıcı simgesi payını belirler. */
  tur?: AlanTuru;
  /**
   * Verildiğinde etiket alanı sarmak yerine `htmlFor` ile bağlanır.
   *
   * Sarmalayan `<label>`, içindeki tüm metni girdinin erişilebilir adına katar.
   * Açılır sonuç listesi gibi metin taşıyan bileşenlerde bu, sesli okuyucunun alanı
   * "Müşteri … Mehmet Mesut YILMAZ Saime BEDELOĞLU …" diye okumasına yol açar.
   */
  alanId?: string;
  /**
   * Satırda kalan boşluğu doldursun mu?
   *
   * `ch` ile birlikte kullanılmaz: sabit genişlikli komşuları yerleştikten sonra
   * artan yeri kapması istenen alan için (ör. "Sigorta Şirketi", yanındaki uzun
   * branş alanından arta kalanı alır). Bu olmadan alan yalnız içeriği kadar
   * genişliyor ve satırın sağında boşluk kalıyordu.
   */
  genisle?: boolean;
  children: React.ReactNode;
}

export function Field({
  label, hint, required, ch, tur = 'text', alanId, genisle, children,
}: FieldProps) {
  const stil = ch
    ? { width: `calc(${ch}ch + ${EK_GENISLIK[tur]}px)`, maxWidth: '100%' }
    : undefined;

  const Kap = alanId ? 'div' : 'label';
  // `min-w-0` şart: esneyen bir flex öğesi varsayılan olarak içeriğinden daha dar
  // olamaz, uzun bir öneri metni alanı satırdan taşırırdı.
  const kapSinifi = genisle ? 'block grow min-w-0' : 'block';

  return (
    <Kap className={kapSinifi} style={stil}>
      {alanId ? (
        <label htmlFor={alanId} className="block text-[11px] font-bold text-slate-700 mb-1">
          {label}
          {required && <span className="text-rose-600 ml-0.5">*</span>}
        </label>
      ) : (
        <span className="block text-[11px] font-bold text-slate-700 mb-1">
          {label}
          {required && <span className="text-rose-600 ml-0.5">*</span>}
        </span>
      )}
      {children}
      {/* İpuçları doğrulama geri bildirimi de taşıyor ("✗ Doğrulama başarısız" gibi),
          bu yüzden dekoratif sayılamaz. slate-400 beyaz üzerinde 2,56:1 ile WCAG AA
          eşiğinin (4,5:1) altındaydı; slate-600 ile 7,4:1'e çıkar. */}
      {hint && <span className="block text-[11px] text-slate-600 mt-1">{hint}</span>}
    </Kap>
  );
}

/** Eşit sütunlu düzende kullanılabilecek sütun sayıları. */
const IZGARA_SINIFI = {
  2: 'sm:grid-cols-2',
  3: 'sm:grid-cols-3',
  4: 'sm:grid-cols-4',
} as const;

interface FieldRowProps {
  /**
   * Verildiğinde alanlar eşit genişlikte sütunlara oturur.
   *
   * Varsayılan akış düzeni her alanı içeriği kadar genişletiyor; birbiriyle
   * ilişkili alanlar (prim üçlüsü, tahsilat üçlüsü) farklı genişlikte çıkıp
   * satır dağınık görünüyordu. Eşit sütun istenen yerlerde alanlara `ch`
   * VERİLMEZ — sabit genişlik ızgara hücresini doldurmayı engeller.
   */
  sutun?: keyof typeof IZGARA_SINIFI;
  children: React.ReactNode;
}

/**
 * Form alanlarını yan yana dizer.
 *
 * Varsayılan olarak akış (flex-wrap) kullanılır; böylece her alan kendi içeriği
 * kadar yer kaplar ve dar alanlar aynı satırda toplanır. `sutun` verildiğinde
 * eşit genişlikli ızgaraya geçer. Dar ekranda ızgara tek sütuna iner.
 */
export function FieldRow({ sutun, children }: FieldRowProps) {
  const sinif = sutun
    ? `grid grid-cols-1 ${IZGARA_SINIFI[sutun]} gap-x-4 gap-y-4 items-start`
    : 'flex flex-wrap gap-x-4 gap-y-4 items-start';

  return <div className={sinif}>{children}</div>;
}

interface SectionProps {
  title: string;
  /** Başlığın sağında gösterilen kısa özet — bölüm kapalıyken içeriği ele verir. */
  summary?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

/**
 * Katlanabilir form bölümü. Zorunlu olmayan alanlar varsayılan olarak kapalı gelir;
 * kullanıcı her kayıtta onlarca alanla karşılaşmaz, yalnız ihtiyaç duyduğunu açar.
 */
export function Section({ title, summary, defaultOpen = false, children }: SectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="rounded-xl border border-slate-200 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 hover:bg-slate-100 transition-colors"
      >
        <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-600">{title}</span>
        <span className="flex items-center gap-2">
          {summary && !open && <span className="text-[10px] text-slate-400 font-semibold">{summary}</span>}
          <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform ${open ? 'rotate-180' : ''}`} />
        </span>
      </button>
      {open && <div className="p-4 space-y-4">{children}</div>}
    </div>
  );
}
