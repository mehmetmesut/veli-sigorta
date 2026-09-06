'use client';

import React, { useMemo, useState } from 'react';
import { Building2, Plus, Trash2, User, UserPlus } from 'lucide-react';
import type { Customer, CorporateContact, CustomerType } from '@/lib/types';
import { bicimlendirAd, bicimlendirSoyad, musteriAdi } from '@/lib/police';
import { KAYDEDILMEMIS_UYARISI, adSoyadBicimlendir, degisiklikVarMi } from '@/lib/form-helpers';
import { Field, FieldRow, inputCls } from './form-ui';

/**
 * Hızlı müşteri ekleme formu.
 *
 * Poliçe girerken müşterinin kayıtlı olmadığı anlaşılınca akış kesiliyordu:
 * personel formu kapatıp Müşteriler sayfasına gidiyor, tam müşteri formunu
 * dolduruyor, geri dönüp poliçeyi baştan açıyordu. Bu form yalnız poliçe
 * kesmek için gereken en az bilgiyi alır; kalan alanlar müşteri kartından
 * sonradan tamamlanır.
 *
 * FORM ETİKETİ KULLANILMAZ, `<div>` olarak çizilir. Bileşen poliçe formunun
 * İÇİNDE de gösteriliyor ve HTML iç içe `<form>` yasaklar — tarayıcı içteki
 * formu sessizce atar, "Ekle" düğmesi dıştaki poliçe formunu gönderirdi.
 * Aynı sebeple Enter tuşu da elle yakalanır.
 */

interface HizliMusteriFormuProps {
  /** Açılışta seçili müşteri tipi. */
  baslangicTipi?: CustomerType;
  /**
   * Seçicide aranıp bulunamayan metin. Bireyselde ad/soyada bölünür, kurumsalda
   * unvana yazılır — personel aynı ismi ikinci kez yazmasın.
   */
  baslangicAdi?: string;
  onIptal: () => void;
  /** Kayıt başarılı olduğunda oluşan müşteri ve güncel liste ile çağrılır. */
  onEklendi: (musteri: Customer, tumMusteriler: Customer[]) => void;
  /** Kaydetme düğmesinin metni (ör. "Ekle ve Poliçeye Devam Et"). */
  kaydetEtiketi?: string;
}

/** Poliçe kesmek için yeterli en az bilgi; kalanı müşteri kartından tamamlanır. */
function bosKayit(tip: CustomerType, baslangicAdi: string): Customer {
  const now = new Date().toISOString();
  const bireysel = tip === 'bireysel';

  // Bireyselde SON kelime soyad sayılır: "mehmet mesut yılmaz" → ad "Mehmet Mesut",
  // soyad "YILMAZ". Tek kelime yazılmışsa ad kabul edilir, soyad uydurulmaz.
  //
  // Ön dolgu, kaydetmede uygulanan yazım kuralından GEÇİRİLEREK yerleştirilir:
  // ham metin bırakıldığında alanlarda görünen ile kaydedilecek olan farklı oluyor,
  // personel doğru yazılmış kaydı yanlış sanıp elle düzeltmeye kalkıyordu.
  const { ad, soyad } = adSoyadBicimlendir(baslangicAdi);

  return {
    id: '',
    musteriNo: '',
    tip,
    ad: bireysel && ad ? ad : undefined,
    soyad: bireysel && soyad ? soyad : undefined,
    firmaUnvani: !bireysel ? baslangicAdi.trim() || undefined : undefined,
    il: 'Antalya',
    ilce: 'Kepez',
    yetkililer: [],
    isActive: true,
    createdAt: now,
    updatedAt: now,
  };
}

function bosYetkili(): CorporateContact {
  return { id: `y-${Math.random().toString(36).slice(2, 10)}`, ad: '', soyad: '', anaYetkili: false };
}

export function HizliMusteriFormu({
  baslangicTipi = 'bireysel',
  baslangicAdi = '',
  onIptal,
  onEklendi,
  kaydetEtiketi = 'Ekle ve Seç',
}: HizliMusteriFormuProps) {
  const [kayit, setKayit] = useState<Customer>(() => bosKayit(baslangicTipi, baslangicAdi));
  const [hata, setHata] = useState('');
  const [kaydediliyor, setKaydediliyor] = useState(false);

  // Panel açıldığındaki hâl. Esc'te "bir şey yazılmış mı?" bunun üzerinden anlaşılır;
  // aranıp bulunamayan addan gelen ön dolgu kirli sayılmaz, yalnız kullanıcının
  // kendi yazdığı sayılır.
  //
  // `bosKayit` İKİNCİ KEZ ÇAĞRILMAZ: her çağrıda yeni `createdAt`/`updatedAt` üretir,
  // o yüzden ikinci bir kayıtla kıyas paneli hiç dokunulmamışken bile kirli gösterirdi.
  // Yukarıdaki durumun ilk değeri okunur.
  const [ilkHal] = useState(() => JSON.stringify(kayit));

  const guncelle = (yama: Partial<Customer>) => setKayit((o) => ({ ...o, ...yama }));

  const tipDegistir = (tip: CustomerType) => {
    // Yazılan ad/unvan yeni tipe taşınır: yanlış tiple başlayıp düzelten personel
    // yazdıklarını kaybetmesin.
    const yazilan = kayit.tip === 'kurumsal'
      ? kayit.firmaUnvani || ''
      : [kayit.ad, kayit.soyad].filter(Boolean).join(' ');
    setKayit({ ...bosKayit(tip, yazilan), mobilTelefon: kayit.mobilTelefon });
  };

  const yetkiliGuncelle = (id: string, yama: Partial<CorporateContact>) =>
    setKayit((o) => ({
      ...o,
      yetkililer: o.yetkililer.map((y) => (y.id === id ? { ...y, ...yama } : y)),
    }));

  /** Kaydetmeyi engelleyen eksik; düğme başlığında da gösterilir. */
  const eksik = useMemo(() => {
    if (kayit.tip === 'bireysel') {
      if (!kayit.ad?.trim()) return 'Adı zorunludur.';
      if (!kayit.soyad?.trim()) return 'Soyadı zorunludur.';
      return '';
    }
    if (!kayit.firmaUnvani?.trim()) return 'Firma unvanı zorunludur.';
    // Açılan yetkili satırı yarım bırakılamaz; sunucu şeması da ad/soyad ister.
    if (kayit.yetkililer.some((y) => !y.ad.trim() || !y.soyad.trim())) {
      return 'Yetkili satırında adı ve soyadı zorunludur.';
    }
    return '';
  }, [kayit]);

  async function kaydet() {
    if (eksik) { setHata(eksik); return; }

    setHata('');
    setKaydediliyor(true);

    // Yazım kuralı kayıt anında uygulanır: ad ilk harfler büyük, soyad tamamı
    // büyük. Aynı kural tam müşteri formunda da geçerli — iki ekrandan girilen
    // aynı kişi listede farklı yazımlarla iki kez görünmemeli.
    const govde: Customer = {
      ...kayit,
      id: 'yeni',
      ad: kayit.ad ? bicimlendirAd(kayit.ad) : undefined,
      soyad: kayit.soyad ? bicimlendirSoyad(kayit.soyad) : undefined,
      firmaUnvani: kayit.firmaUnvani?.trim() || undefined,
      yetkililer: kayit.tip === 'kurumsal'
        ? kayit.yetkililer
            .filter((y) => y.ad.trim() || y.soyad.trim())
            .map((y) => ({ ...y, ad: bicimlendirAd(y.ad), soyad: bicimlendirSoyad(y.soyad) }))
        : [],
      updatedAt: new Date().toISOString(),
    };

    try {
      const res = await fetch('/api/admin/content?fields=customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entity: 'customers', action: 'save', data: govde }),
      });
      const cevap = await res.json().catch(() => ({}));

      if (!res.ok) {
        setHata(cevap.error || 'Müşteri kaydedilemedi.');
        return;
      }

      const liste: Customer[] = cevap.customers || [];
      // Müşteri numarasını ve kimliği SUNUCU üretiyor; yeni kayıt en son
      // oluşturulan olacağı için oluşturma zamanına göre bulunur.
      const eklenen = [...liste].sort(
        (a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt),
      )[0];

      if (!eklenen) {
        setHata('Kayıt oluştu ama listede bulunamadı. Sayfayı yenileyin.');
        return;
      }
      onEklendi(eklenen, liste);
    } catch {
      setHata('Sunucuya ulaşılamadı. Bağlantınızı kontrol edip tekrar deneyin.');
    } finally {
      setKaydediliyor(false);
    }
  }

  /**
   * Enter kaydeder. Varsayılan davranış engellenir: iç içe form kurulamadığı
   * için Enter dıştaki POLİÇE formunu gönderirdi.
   */
  function tusaBasildi(e: React.KeyboardEvent) {
    // Esc YALNIZ bu paneli kapatır. Yayılım durdurulmazsa poliçe sayfası aynı Esc'i
    // `window` üzerinden de yakalayıp poliçe formunu da kapatıyor; tek tuşta hem
    // panele yazılan müşteri hem yarım kalan poliçe uçuyordu.
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      if (degisiklikVarMi(ilkHal, kayit) && !confirm(KAYDEDILMEMIS_UYARISI)) return;
      onIptal();
      return;
    }

    if (e.key !== 'Enter') return;
    if ((e.target as HTMLElement).tagName === 'TEXTAREA') return;
    e.preventDefault();
    e.stopPropagation();
    void kaydet();
  }

  const bireysel = kayit.tip === 'bireysel';

  return (
    <div
      onKeyDown={tusaBasildi}
      className="rounded-xl border border-blue-200 bg-blue-50/40 p-4 space-y-4"
    >
      <div className="flex items-center gap-2">
        <UserPlus className="w-4 h-4 text-blue-800" />
        <span className="text-[11px] font-extrabold uppercase tracking-wider text-blue-900">
          Hızlı Müşteri Ekle
        </span>
      </div>

      {/* Tip seçimi açılır liste değil düğme çifti: hangi alanların görüneceğini
          belirleyen karar bu, bir tıklamada görünmeli. */}
      <div className="flex gap-2">
        {([
          ['bireysel', 'Bireysel', User],
          ['kurumsal', 'Kurumsal', Building2],
        ] as const).map(([deger, etiket, Ikon]) => (
          <button
            key={deger}
            type="button"
            onClick={() => tipDegistir(deger)}
            aria-pressed={kayit.tip === deger}
            className={`px-3 py-1.5 rounded-lg text-[11px] font-bold inline-flex items-center gap-1.5 border transition-colors ${
              kayit.tip === deger
                ? 'bg-blue-800 text-white border-blue-800'
                : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
            }`}
          >
            <Ikon className="w-3.5 h-3.5" /> {etiket}
          </button>
        ))}
      </div>

      {bireysel ? (
        <FieldRow>
          <Field label="Adı" required ch={18}>
            <input
              autoFocus
              value={kayit.ad || ''}
              onChange={(e) => guncelle({ ad: e.target.value })}
              className={inputCls}
            />
          </Field>
          <Field label="Soyadı" required ch={18}>
            <input
              value={kayit.soyad || ''}
              onChange={(e) => guncelle({ soyad: e.target.value })}
              className={inputCls}
            />
          </Field>
          <Field label="Mobil Telefon" ch={16}>
            <input
              type="tel"
              inputMode="tel"
              placeholder="0(5__) ___ __ __"
              value={kayit.mobilTelefon || ''}
              onChange={(e) => guncelle({ mobilTelefon: e.target.value })}
              className={inputCls}
            />
          </Field>
          <Field label="T.C. Kimlik No" ch={11}>
            <input
              inputMode="numeric"
              maxLength={11}
              value={kayit.tcKimlikNo || ''}
              onChange={(e) => guncelle({ tcKimlikNo: e.target.value.replace(/\D/g, '') })}
              className={inputCls}
            />
          </Field>
        </FieldRow>
      ) : (
        <>
          <FieldRow>
            <Field label="Firma Unvanı" required genisle>
              <input
                autoFocus
                value={kayit.firmaUnvani || ''}
                onChange={(e) => guncelle({ firmaUnvani: e.target.value })}
                className={inputCls}
              />
            </Field>
            <Field label="Mobil Telefon" ch={16}>
              <input
                type="tel"
                inputMode="tel"
                placeholder="0(5__) ___ __ __"
                value={kayit.mobilTelefon || ''}
                onChange={(e) => guncelle({ mobilTelefon: e.target.value })}
                className={inputCls}
              />
            </Field>
            <Field label="Vergi Numarası" ch={10}>
              <input
                inputMode="numeric"
                maxLength={10}
                value={kayit.vergiNo || ''}
                onChange={(e) => guncelle({ vergiNo: e.target.value.replace(/\D/g, '') })}
                className={inputCls}
              />
            </Field>
          </FieldRow>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <span className="text-[11px] font-bold text-slate-700">Yetkililer / Temsilciler</span>
              <button
                type="button"
                onClick={() => setKayit((o) => ({ ...o, yetkililer: [...o.yetkililer, bosYetkili()] }))}
                className="px-2 py-1 rounded-lg bg-white border border-slate-300 text-[11px] font-bold text-slate-700 hover:bg-slate-50 inline-flex items-center gap-1 shrink-0"
              >
                <Plus className="w-3 h-3" /> Yetkili Ekle
              </button>
            </div>

            {kayit.yetkililer.length === 0 && (
              <p className="text-[11px] text-slate-600">
                İsterseniz sonradan müşteri kartından da ekleyebilirsiniz.
              </p>
            )}

            {kayit.yetkililer.map((y) => (
              <div key={y.id} className="rounded-lg border border-slate-200 bg-white p-3">
                <FieldRow>
                  <Field label="Adı" required ch={16}>
                    <input value={y.ad} onChange={(e) => yetkiliGuncelle(y.id, { ad: e.target.value })} className={inputCls} />
                  </Field>
                  <Field label="Soyadı" required ch={16}>
                    <input value={y.soyad} onChange={(e) => yetkiliGuncelle(y.id, { soyad: e.target.value })} className={inputCls} />
                  </Field>
                  <Field label="Görev Unvanı" ch={18}>
                    <input value={y.gorevUnvani || ''} onChange={(e) => yetkiliGuncelle(y.id, { gorevUnvani: e.target.value })} className={inputCls} />
                  </Field>
                  <Field label="Mobil Telefon" ch={16}>
                    <input
                      type="tel"
                      inputMode="tel"
                      value={y.mobilTelefon || ''}
                      onChange={(e) => yetkiliGuncelle(y.id, { mobilTelefon: e.target.value })}
                      className={inputCls}
                    />
                  </Field>
                </FieldRow>
                <div className="flex justify-end mt-2">
                  <button
                    type="button"
                    onClick={() => setKayit((o) => ({ ...o, yetkililer: o.yetkililer.filter((x) => x.id !== y.id) }))}
                    aria-label="Yetkiliyi kaldır"
                    className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-100"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {hata && (
        <p role="alert" className="text-[11px] font-bold text-rose-800 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
          {hata}
        </p>
      )}

      {/* Birincil işlem sağda, vazgeçme solda. */}
      <div className="flex items-center justify-between gap-3 pt-1 flex-wrap">
        <p className="text-[11px] text-slate-600 min-w-0">
          Yalnız zorunlu bilgiler; kalanını müşteri kartından tamamlayabilirsiniz.
        </p>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onIptal}
            className="px-3 py-2 rounded-lg border border-slate-300 bg-white text-[11px] font-bold text-slate-700 hover:bg-slate-50"
          >
            Vazgeç
          </button>
          <button
            type="button"
            onClick={() => void kaydet()}
            disabled={kaydediliyor || Boolean(eksik)}
            title={eksik || undefined}
            className="px-4 py-2 rounded-lg bg-blue-800 hover:bg-blue-900 disabled:bg-slate-300 text-white text-[11px] font-bold inline-flex items-center gap-1.5"
          >
            <UserPlus className="w-3.5 h-3.5" />
            {kaydediliyor ? 'Kaydediliyor…' : kaydetEtiketi}
          </button>
        </div>
      </div>
    </div>
  );
}

/** Kayıt sonrası bildirim metni; iki ekranda da aynı cümle kullanılsın. */
export function eklendiMesaji(m: Customer): string {
  return `${musteriAdi(m)} (${m.musteriNo}) eklendi.`;
}
