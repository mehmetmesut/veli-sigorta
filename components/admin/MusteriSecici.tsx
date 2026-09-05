'use client';

import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { ChevronDown, Search, UserPlus, X } from 'lucide-react';
import type { Customer } from '@/lib/types';
import { musteriAdi } from '@/lib/police';
import { musterileriAra } from '@/lib/musteri-arama';

/**
 * Yazdıkça süzen müşteri seçici (ARIA combobox).
 *
 * Yerine geçtiği `<select>`, portföy büyüdükçe kullanılamaz hâle geliyordu: yüzlerce
 * seçenek arasında kaydırarak doğru kişiyi bulmak hem yavaş hem hataya açıktı ve
 * tarayıcının kendi "harfe atlama" davranışı yalnız adın ilk harfine bakıyor.
 *
 * Arama; ad/unvan, müşteri numarası, kimlik ve vergi numarası ile telefon üzerinden
 * yapılır (bkz. `lib/musteri-arama.ts`) — personel elindeki hangi bilgi varsa onunla
 * arayabilsin.
 *
 * Erişilebilirlik notları:
 * - WAI-ARIA combobox kalıbı: `role="combobox"` + `aria-expanded` + `aria-controls`
 *   + `aria-activedescendant`. Odak hep girdide kalır, seçenekler arasında gezinme
 *   `aria-activedescendant` ile bildirilir.
 * - Sonuç sayısı `role="status"` ile sesli okuyucuya duyurulur; görmeyen kullanıcı
 *   yazdıkça listenin daraldığını fark edemiyordu.
 * - Escape yayılımı durdurulur: sayfa `window` üzerinde Escape'i dinleyip formu
 *   kapatıyor, aksi hâlde açılır listeyi kapatmak isteyen kullanıcı formu kaybediyordu.
 */

/** Aynı anda çizilen en fazla sonuç. Fazlası kullanıcıya sayıyla bildirilir. */
const GOSTERILEN_EN_FAZLA = 50;

interface MusteriSeciciProps {
  musteriler: readonly Customer[];
  /** Seçili müşterinin kimliği; boş metin "seçim yok" demektir. */
  deger: string;
  onDegisim: (musteriId: string) => void;
  /** Dışarıdaki `<label htmlFor>` ile eşleşen kimlik. */
  alanId: string;
  /**
   * Görünür etiketi olmayan yerlerde (araç çubuğundaki filtre gibi) sesli okuyucuya
   * okunacak ad. Etiketsiz bir arama kutusu ekran okuyucuda "düzenleme alanı" diye
   * geçiyor ve neyi filtrelediği anlaşılmıyor.
   */
  erisimEtiketi?: string;
  placeholder?: string;
  /** Seçimi temizleme düğmesi gösterilsin mi? Filtrelerde gerekli, zorunlu alanda değil. */
  temizlenebilir?: boolean;
  autoFocus?: boolean;
  className?: string;
  /**
   * Verildiğinde, arama sonuç vermediğinde listede "yeni müşteri ekle" düğmesi
   * çıkar ve yazılan metinle çağrılır.
   *
   * Aranan kişinin kayıtlı olmadığı en net burada anlaşılıyor; personeli bu
   * noktada boş bir sonuçla baş başa bırakmak, poliçe girişini kesip başka
   * sayfaya göndermek demekti.
   */
  onYeniMusteri?: (sorgu: string) => void;
}

export function MusteriSecici({
  musteriler,
  deger,
  onDegisim,
  alanId,
  erisimEtiketi,
  placeholder = 'Ad, no veya telefon ile arayın…',
  temizlenebilir = false,
  autoFocus = false,
  className = '',
  onYeniMusteri,
}: MusteriSeciciProps) {
  const [acik, setAcik] = useState(false);
  const [sorgu, setSorgu] = useState('');
  const [vurgulu, setVurgulu] = useState(0);

  const kapsayiciRef = useRef<HTMLDivElement>(null);
  const girdiRef = useRef<HTMLInputElement>(null);
  const listeRef = useRef<HTMLUListElement>(null);
  const listeId = useId();

  const secili = useMemo(
    () => musteriler.find((m) => m.id === deger) ?? null,
    [musteriler, deger],
  );

  // Liste kapalıyken hiç hesaplanmaz. Kapalı hâlde de süzüp sıralamak, binlerce
  // müşterili bir portföyde sayfa her render olduğunda boşa tam sıralama demekti.
  const { sonuclar, toplam } = useMemo(
    () => (acik ? musterileriAra(musteriler, sorgu, GOSTERILEN_EN_FAZLA) : { sonuclar: [], toplam: 0 }),
    [musteriler, sorgu, acik],
  );

  /**
   * Vurgunun kaynağı. Kaydırma YALNIZ klavyeyle gezinirken yapılır.
   *
   * Fareyle gelen vurguda da kaydırsaydık kısır döngü oluşuyordu: liste kayınca
   * imlecin altındaki satır değişiyor, tarayıcı fare hareketi olmadan mouseenter
   * üretiyor, o da vurguyu geri alıp yeniden kaydırıyordu. Kullanıcı ekranda bir
   * isim görürken Enter'a basıp başka müşteriyi bağlayabiliyordu.
   */
  const vurguKlavyeden = useRef(false);

  // Vurgulanan seçenek görünür alanın dışına çıkarsa klavyeyle gezinen kullanıcı
  // nerede olduğunu göremiyor.
  useEffect(() => {
    if (!acik || !vurguKlavyeden.current) return;
    const liste = listeRef.current;
    const secenek = liste?.children[vurgulu] as HTMLElement | undefined;
    secenek?.scrollIntoView({ block: 'nearest' });
  }, [vurgulu, acik]);

  // Dışarı tıklama listeyi kapatır. `mousedown` kullanılır: `click` beklenirse
  // seçeneğe tıklama ile dışarı tıklama aynı karede yarışıyor.
  useEffect(() => {
    if (!acik) return;

    function disaridaMi(e: MouseEvent) {
      if (!kapsayiciRef.current?.contains(e.target as Node)) kapat();
    }

    document.addEventListener('mousedown', disaridaMi);
    return () => document.removeEventListener('mousedown', disaridaMi);
  }, [acik]);

  function ac() {
    // Liste her açılışta sıfırlanır: seçili müşterinin adı sorgu olarak kalsaydı
    // kullanıcı başka birini aramak için önce alanı temizlemek zorunda kalırdı.
    setSorgu('');
    setVurgulu(0);
    setAcik(true);
  }

  function kapat() {
    setAcik(false);
    setSorgu('');
  }

  function sec(musteri: Customer) {
    onDegisim(musteri.id);
    kapat();
    girdiRef.current?.focus();
  }

  function temizle() {
    onDegisim('');
    kapat();
    girdiRef.current?.focus();
  }

  function tusaBasildi(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      vurguKlavyeden.current = true;
      if (!acik) { ac(); return; }
      setVurgulu((v) => Math.min(v + 1, sonuclar.length - 1));
      return;
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      vurguKlavyeden.current = true;
      if (!acik) { ac(); return; }
      setVurgulu((v) => Math.max(v - 1, 0));
      return;
    }

    // Sonuç yokken sınır hesabı -1 veriyor; vurgu hiçbir seçeneği göstermeyen bir
    // konuma kayıyor ve aria-activedescendant boşa düşüyordu.
    if (e.key === 'Home' && acik && sonuclar.length > 0) {
      e.preventDefault();
      vurguKlavyeden.current = true;
      setVurgulu(0);
      return;
    }
    if (e.key === 'End' && acik && sonuclar.length > 0) {
      e.preventDefault();
      vurguKlavyeden.current = true;
      setVurgulu(sonuclar.length - 1);
      return;
    }

    if (e.key === 'Enter') {
      // Form içindeyiz: Enter'ın varsayılan davranışı formu göndermek. Liste
      // açıkken seçim yapılmalı, kayıt değil.
      if (!acik) return;
      e.preventDefault();
      const aday = sonuclar[vurgulu];
      if (aday) sec(aday);
      return;
    }

    if (e.key === 'Escape') {
      if (!acik) return;
      // Sayfa Escape'i window üzerinde dinleyip formu kapatıyor; önce liste kapanmalı.
      e.preventDefault();
      e.stopPropagation();
      kapat();
      return;
    }

    if (e.key === 'Tab' && acik) kapat();
  }

  const bosSonuc = acik && sonuclar.length === 0;
  const kirpildi = toplam > sonuclar.length;
  const kirpmaId = `${listeId}-kirpma`;

  /**
   * Seçili kimlik elimizdeki listede yok (kayıt silinmiş ya da liste henüz inmemiş).
   *
   * Sessizce boş göstermek tuzaktı: filtre etkin olduğu hâlde kutuda "Tüm müşteriler"
   * yazıyor, tablo boş listeleniyor ve temizleme düğmesi de gizlendiği için kullanıcı
   * poliçelerin silindiğini sanıyordu.
   */
  const bilinmeyenSecim = Boolean(deger) && !secili;

  // Duyuru kırpmayı da söyler; yoksa ekran okuyucu "120 müşteri bulundu" derken
  // listede 50 seçenek olduğu için kullanıcı 50'den sonrasını yok sanıyordu.
  const durumMetni = !acik
    ? ''
    : kirpildi
      ? `${toplam} müşteriden ilk ${sonuclar.length} tanesi listelendi, aramayı daraltın`
      : `${toplam} müşteri bulundu`;

  return (
    <div ref={kapsayiciRef} className={`relative ${className}`}>
      <div className="relative">
        <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        <input
          ref={girdiRef}
          id={alanId}
          type="text"
          role="combobox"
          aria-expanded={acik}
          aria-controls={listeId}
          aria-label={erisimEtiketi}
          aria-autocomplete="list"
          aria-activedescendant={acik && sonuclar[vurgulu] ? `${listeId}-${vurgulu}` : undefined}
          aria-describedby={acik && kirpildi ? kirpmaId : undefined}
          autoComplete="off"
          autoFocus={autoFocus}
          // Liste kapalıyken seçilen müşteri görünür, açıkken yazdığınız sorgu.
          // Kayıt bulunamıyorsa boş bırakmak yerine durum açıkça yazılır.
          value={
            acik
              ? sorgu
              : secili
                ? musteriAdi(secili)
                : bilinmeyenSecim
                  ? 'Seçili müşteri bulunamadı'
                  : ''
          }
          onChange={(e) => {
            const yeni = e.target.value;
            // Sorgu daraldığında eski vurgu listenin dışında kalabiliyor; her
            // yazımda başa alınır. (Efekt yerine burada: değişimi tetikleyen olay bu.)
            setVurgulu(0);

            if (acik) { setSorgu(yeni); return; }

            // Liste kapalıyken alanda seçili müşterinin ADI yazılı. Kullanıcı
            // yazmaya başlayınca arama sıfırdan başlamalı; harf adın sonuna
            // eklenince "Mehmet Mesut YILMAZa" gibi hiçbir şeyle eşleşmeyen bir
            // sorgu oluşuyordu.
            const gosterilen = secili ? musteriAdi(secili) : '';
            setSorgu(yeni.startsWith(gosterilen) ? yeni.slice(gosterilen.length) : yeni);
            setAcik(true);
          }}
          // Odakta metin seçilir: klavyeyle gelen kullanıcı yazmaya başladığında
          // seçili ad kendiliğinden değişir, önce silmesi gerekmez.
          onFocus={(e) => e.target.select()}
          // Tıklayınca açılır — `onFocus` DEĞİL. Pencerenin odak tuzağı açılışta ilk
          // alana odaklanıyor; odakta açsaydık "Poliçeyi Düzenle" her açıldığında
          // müşteri listesi patlayıp formun üstünü kapatırdı. Klavye kullanıcısı
          // aşağı ok ya da yazarak açar (ARIA combobox kalıbının önerdiği davranış).
          onMouseDown={() => { if (!acik) ac(); }}
          onKeyDown={tusaBasildi}
          placeholder={secili && !acik ? '' : placeholder}
          className={`w-full pl-8 ${temizlenebilir ? 'pr-14' : 'pr-8'} py-2 rounded-lg border border-slate-300 text-xs focus:border-blue-700 focus:ring-1 focus:ring-blue-700 outline-hidden`}
        />

        <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
          {/* Koşul `secili` değil `deger`: kaydı bulunamayan bir seçimde de temizleme
              yolu açık kalmalı, yoksa kullanıcı etkin filtreyi kaldıramıyordu.
              24×24 en az dokunma hedefi (WCAG 2.2 SC 2.5.8) — düğme arama
              girdisinin üzerine bindiği için aralık istisnası geçerli değil. */}
          {temizlenebilir && Boolean(deger) && (
            <button
              type="button"
              onClick={temizle}
              aria-label="Müşteri seçimini temizle"
              title="Seçimi temizle"
              className="w-6 h-6 flex items-center justify-center rounded text-slate-400 hover:bg-slate-200 hover:text-slate-700"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <ChevronDown
            className={`w-3.5 h-3.5 text-slate-400 pointer-events-none transition-transform ${acik ? 'rotate-180' : ''}`}
          />
        </div>
      </div>

      {/* Sesli okuyucu için sonuç bildirimi. Görsel olarak gizli. */}
      <span role="status" aria-live="polite" className="sr-only">
        {durumMetni}
      </span>

      {acik && (
        <div className="absolute z-30 mt-1 w-full min-w-[280px] bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden">
          <ul
            ref={listeRef}
            id={listeId}
            role="listbox"
            aria-label="Müşteri sonuçları"
            className="max-h-64 overflow-y-auto py-1"
          >
            {sonuclar.map((c, i) => (
              <li
                key={c.id}
                id={`${listeId}-${i}`}
                role="option"
                aria-selected={c.id === deger}
                // `onMouseDown` kullanılır: `onClick` girdinin blur'undan sonra
                // gelir ve o sırada liste kapanmış olur, seçim hiç gerçekleşmez.
                onMouseDown={(e) => { e.preventDefault(); sec(c); }}
                onMouseEnter={() => { vurguKlavyeden.current = false; setVurgulu(i); }}
                className={`px-3 py-2 cursor-pointer ${
                  i === vurgulu ? 'bg-blue-50' : ''
                } ${c.id === deger ? 'font-bold' : ''}`}
              >
                <div className="flex items-center gap-1.5 flex-wrap text-xs text-slate-900">
                  {musteriAdi(c)}
                  {!c.isActive && (
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-100 text-rose-800">
                      Pasif
                    </span>
                  )}
                </div>
                {/* Aynı adlı iki kaydı ayırt edebilmek için numara ve telefon. */}
                <div className="text-[10px] text-slate-500 mt-0.5 flex items-center gap-2 flex-wrap">
                  <span className="font-mono">{c.musteriNo}</span>
                  {c.mobilTelefon && <span>{c.mobilTelefon}</span>}
                  {c.tip === 'kurumsal' && <span>Kurumsal</span>}
                </div>
              </li>
            ))}
          </ul>

          {bosSonuc && (
            <div className="px-3 py-3 space-y-2">
              <p className="text-[11px] text-slate-500">
                &ldquo;{sorgu}&rdquo; ile eşleşen müşteri yok.
              </p>
              {onYeniMusteri && (
                /* `onMouseDown` kullanılır: girdinin blur'u `click`ten önce gelip
                   listeyi kapatıyor ve tıklama düğmeye hiç ulaşmıyordu (seçenek
                   satırlarıyla aynı sebep). Sorgu kapatmadan ÖNCE kopyalanır,
                   `kapat()` onu sıfırlıyor. */
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    const aranan = sorgu;
                    kapat();
                    onYeniMusteri(aranan);
                  }}
                  className="w-full px-3 py-2 rounded-lg bg-blue-800 hover:bg-blue-900 text-white text-[11px] font-bold inline-flex items-center justify-center gap-1.5"
                >
                  <UserPlus className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">
                    {sorgu.trim() ? `“${sorgu.trim()}” adıyla yeni müşteri ekle` : 'Yeni müşteri ekle'}
                  </span>
                </button>
              )}
            </div>
          )}

          {kirpildi && (
            <p id={kirpmaId} className="px-3 py-2 border-t border-slate-100 text-[10px] text-slate-500 bg-slate-50">
              {toplam} kayıttan ilk {sonuclar.length} tanesi gösteriliyor — aramayı daraltın.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
