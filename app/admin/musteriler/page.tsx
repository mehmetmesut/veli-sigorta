'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  Search, Plus, X, Save, User, Building2, Phone, Mail,
  ShieldCheck, ShieldPlus, AlertCircle, CheckCircle2, UserPlus, Eye, MessageCircle,
} from 'lucide-react';
import type { CorporateContact, Customer, CustomerType, Policy } from '@/lib/types';
import {
  bicimlendirAd, bicimlendirSoyad, musteriAdi, tcKimlikGecerliMi, formatTarih,
  whatsappBaglantisi,
} from '@/lib/police';
import {
  KAYDEDILMEMIS_UYARISI, benzerMusteriBul, degisiklikVarMi, telefonMaskele,
} from '@/lib/form-helpers';
import { Field, FieldRow, Section, inputCls } from '@/components/admin/form-ui';
import { useRouter } from 'next/navigation';
import { useModalErisilebilirlik } from '@/components/admin/useModalErisilebilirlik';
import { KopyaDugmesi, KopyalanabilirDeger } from '@/components/admin/KopyaDugmesi';
import { CinsiyetSecici } from '@/components/admin/CinsiyetSecici';
import { bransKisaAd, bransRengi } from '@/lib/brans-renk';
import { musteriEslesiyorMu } from '@/lib/musteri-arama';
import { HizliMusteriFormu } from '@/components/admin/HizliMusteriFormu';

/** Acente Antalya Kepez'de; yeni kayıtlarda il/ilçe hazır gelir, gerekirse değiştirilir. */
const VARSAYILAN_IL = 'Antalya';
const VARSAYILAN_ILCE = 'Kepez';

/** Form içindeki müşteri tipi seçenekleri. */
const MUSTERI_TIPLERI: ReadonlyArray<{ tip: CustomerType; etiket: string; Icon: typeof User }> = [
  { tip: 'bireysel', etiket: 'Bireysel', Icon: User },
  { tip: 'kurumsal', etiket: 'Kurumsal', Icon: Building2 },
];

/** Yeni müşteri için boş form. Müşteri numarası kaydederken üretilir. */
function bosMusteri(tip: CustomerType): Customer {
  const now = new Date().toISOString();
  return {
    id: '', musteriNo: '', tip,
    il: VARSAYILAN_IL, ilce: VARSAYILAN_ILCE,
    yetkililer: [], isActive: true, createdAt: now, updatedAt: now,
  };
}

/**
 * Listede ad altında gösterilecek kimlik numarası ve ne olduğu.
 *
 * Bireyselde T.C. kimlik, yoksa yabancı kimlik; kurumsalda vergi numarası.
 * Hiçbiri girilmemişse null döner ve satır hiç çizilmez — adın altına yapışan
 * boş bir "—" bilgi vermeden yer kaplıyordu.
 */
function kimlikNumarasi(c: Customer): { deger: string; etiket: string } | null {
  if (c.tip === 'kurumsal') {
    return c.vergiNo ? { deger: c.vergiNo, etiket: 'Vergi No' } : null;
  }
  if (c.tcKimlikNo) return { deger: c.tcKimlikNo, etiket: 'T.C. Kimlik No' };
  if (c.yabanciKimlikNo) return { deger: c.yabanciKimlikNo, etiket: 'Yabancı Kimlik No' };
  return null;
}

function bosYetkili(): CorporateContact {
  return {
    id: `y-${Math.random().toString(36).slice(2, 10)}`,
    ad: '', soyad: '', anaYetkili: false,
  };
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [tipFilter, setTipFilter] = useState<'tumu' | CustomerType>('tumu');
  const [editing, setEditing] = useState<Customer | null>(null);
  /** Hızlı ekleme penceresi. Tam formdan ayrı: yalnız zorunlu alanları sorar. */
  const [hizliAcik, setHizliAcik] = useState(false);
  const [msg, setMsg] = useState('');
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  /** Form açıldığındaki hâli; "değişiklik var mı?" karşılaştırması bunun üzerinden yapılır. */
  const [ilkHal, setIlkHal] = useState<string | null>(null);
  const router = useRouter();
  const aramaRef = useRef<HTMLInputElement>(null);
  const {
    ref: musteriFormRef,
    dialogOzellikleri: musteriDialogOzellikleri,
    baslikId: musteriBaslikId,
  } = useModalErisilebilirlik<HTMLFormElement>(Boolean(editing));

  // Hızlı ekleme penceresi ayrı bir kanca örneği kullanır: tam müşteri formuyla
  // aynı anda hiç açılmıyor ama kanca kapalıyken dinleyici bağlamadığı için
  // ikisinin bir arada durması zaten çakışma yaratmaz.
  const {
    ref: hizliRef, dialogOzellikleri: hizliDialog, baslikId: hizliBaslikId,
  } = useModalErisilebilirlik<HTMLDivElement>(hizliAcik);

  const loadData = async () => {
    const res = await fetch('/api/admin/content?fields=customers,policies');
    if (!res.ok) return;
    const data = await res.json();
    setCustomers(data.customers || []);
    setPolicies(data.policies || []);
    setLoading(false);
  };

  useEffect(() => {
    let mounted = true;
    // Poliçe takibinden "Müşteri kartında aç" ile gelindiğinde doğrudan o kaydın
    // kartı açılır; kullanıcı listede yeniden aramak zorunda kalmasın. Kayıtlar
    // asenkron geldiği için eşleştirme veri indikten SONRA yapılır.
    const parametreler = new URLSearchParams(window.location.search);
    const istenenMusteriId = parametreler.get('musteri');
    // Detay sayfasındaki 'Düzenle' düğmesi buraya '?duzenle=<id>' ile döner.
    const duzenlenecekId = parametreler.get('duzenle');

    fetch('/api/admin/content?fields=customers,policies')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (mounted && data) {
          const gelenMusteriler: Customer[] = data.customers || [];
          setCustomers(gelenMusteriler);
          setPolicies(data.policies || []);

          // Eski '?musteri=<id>' bağlantıları (yer imleri, geçmiş bağlantılar)
          // artık müşteri detay sayfasına yönlendirilir; bilgi penceresi kaldırıldı.
          if (istenenMusteriId && gelenMusteriler.some((c) => c.id === istenenMusteriId)) {
            router.replace(`/admin/musteriler/${istenenMusteriId}`);
            return;
          }

          if (duzenlenecekId) {
            const bulunan = gelenMusteriler.find((c) => c.id === duzenlenecekId);
            if (bulunan) formuAc(bulunan);
          }
        }
        if (mounted) setLoading(false);
      });
    return () => { mounted = false; };
    // router kasıtlı olarak dışarıda: bu efekt yalnızca ilk açılışta çalışmalı,
    // yönlendirme nesnesi değiştiğinde veriyi baştan çekmemeli.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Müşteri başına poliçe sayısı — listede göstermek ve silmeyi uyarmak için. */
  const policeSayisi = useMemo(() => {
    const m = new Map<string, number>();
    policies.forEach((p) => m.set(p.musteriId, (m.get(p.musteriId) || 0) + 1));
    return m;
  }, [policies]);

  /**
   * Müşteri başına branş özeti: hangi türde kaç poliçesi var.
   * Poliçe sayfasına gitmeden "neyi var?" sorusunu yanıtlar.
   */
  const musteriBranslari = useMemo(() => {
    const harita = new Map<string, { turu: string; adet: number }[]>();

    policies.forEach((p) => {
      const liste = harita.get(p.musteriId) ?? [];
      const mevcut = liste.find((x) => x.turu === p.sigortaTuru);
      if (mevcut) mevcut.adet += 1;
      else liste.push({ turu: p.sigortaTuru, adet: 1 });
      harita.set(p.musteriId, liste);
    });

    harita.forEach((liste) => liste.sort((a, b) => a.turu.localeCompare(b.turu, 'tr-TR')));
    return harita;
  }, [policies]);

  const filtered = useMemo(() => {
    // Arama kuralı `lib/musteri-arama.ts` içinde tek yerde: poliçe formundaki
    // açılır seçici de aynısını kullanır. İki ekranda farklı davransaydı, burada
    // bulunan kayıt orada bulunamayıp silinmiş sanılırdı.
    return customers
      .filter((c) => (tipFilter === 'tumu' ? true : c.tip === tipFilter))
      .filter((c) => musteriEslesiyorMu(c, search))
      .sort((a, b) => musteriAdi(a).localeCompare(musteriAdi(b), 'tr-TR'));
  }, [customers, search, tipFilter]);

  /**
   * Müşteriyi kaydeder. `devamEt` seçildiğinde form kapanmaz, aynı tiple sıfırlanır;
   * arka arkaya kayıt girenler her seferinde listeye dönüp butona basmak zorunda kalmaz.
   */
  const kaydet = async (devamEt: boolean) => {
    if (!editing) return;
    setFormError('');

    if (editing.tip === 'bireysel' && !editing.ad?.trim() && !editing.soyad?.trim()) {
      setFormError('Bireysel müşteride ad veya soyad girilmelidir.');
      return;
    }
    if (editing.tip === 'kurumsal' && !editing.firmaUnvani?.trim()) {
      setFormError('Kurumsal müşteride firma unvanı zorunludur.');
      return;
    }
    if (editing.tcKimlikNo && !tcKimlikGecerliMi(editing.tcKimlikNo)) {
      setFormError('T.C. Kimlik No geçersiz. 11 haneli ve doğrulama algoritmasına uygun olmalı.');
      return;
    }

    setSaving(true);
    const now = new Date().toISOString();
    const payload: Customer = {
      ...editing,
      id: editing.id || 'yeni',
      // Müşteri numarasını SUNUCU belirler (bkz. app/api/admin/content/route.ts).
      // İstemcide üretmek, iki yönetici aynı anda kayıt açtığında çakışmaya yol açıyordu.
      musteriNo: editing.musteriNo?.trim() || '',
      ad: editing.ad ? bicimlendirAd(editing.ad) : undefined,
      soyad: editing.soyad ? bicimlendirSoyad(editing.soyad) : undefined,
      yetkililer: editing.tip === 'kurumsal'
        ? editing.yetkililer.filter((y) => y.ad.trim() || y.soyad.trim()).map((y) => ({
            ...y,
            ad: bicimlendirAd(y.ad),
            soyad: bicimlendirSoyad(y.soyad),
          }))
        : [],
      createdAt: editing.createdAt || now,
      updatedAt: now,
    };

    const res = await fetch('/api/admin/content?fields=customers,policies', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entity: 'customers', action: 'save', data: payload }),
    });
    const body = await res.json().catch(() => ({}));
    setSaving(false);

    if (!res.ok) {
      setFormError(body.error || 'Müşteri kaydedilemedi.');
      return;
    }
    setCustomers(body.customers || []);
    if (devamEt) {
      formuAc(bosMusteri(editing.tip));
    } else {
      setEditing(null);
      setIlkHal(null);
    }
    setMsg(
      devamEt
        ? `${musteriAdi(payload)} kaydedildi. Sıradakini girebilirsiniz.`
        : `${musteriAdi(payload)} kaydedildi.`,
    );
    setTimeout(() => setMsg(''), 4000);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    void kaydet(false);
  };

  // Pasife alma/aktifleştirme buradan KALDIRILDI: kullanıcı İşlem sütununda yalnız
  // iki ikon istediği (Göz At + Hızlıca Poliçe Ekle) için listeye düğme konmuyor.
  // İşlem müşteri DETAY sayfasında yaşıyor; aynı mantığın iki kopyası tutulmuyor.

  const updateField = (patch: Partial<Customer>) =>
    setEditing((prev) => (prev ? { ...prev, ...patch } : prev));

  /**
   * Formu kapatır. Kurumsal bir müşteri kaydı otuzdan fazla alan içerebiliyor; yanlışlıkla
   * Esc'e basmak ya da Vazgeç'e tıklamak dakikalarca süren girişi uyarısız siliyordu.
   * Değişiklik yapılmışsa onay istenir.
   */
  const formuKapat = () => {
    if (degisiklikVarMi(ilkHal, editing) && !confirm(KAYDEDILMEMIS_UYARISI)) return;
    setEditing(null);
    // Poliçe formuyla birebir aynı: ilk hâl de sıfırlanır, yoksa bir sonraki
    // açılışta eski kaydın kıyası kalıyordu.
    setIlkHal(null);
  };


  /** Formu açan tek giriş noktası — ilk hâli de kaydeder. */
  // Fonksiyon bildirimi (const ok yerine): açılışta "?duzenle=<id>" ile gelen istek
  // bunu bileşen gövdesinin üstünde, tanımından ÖNCE çağırıyor.
  function formuAc(musteri: Customer) {
    setEditing(musteri);
    setIlkHal(JSON.stringify(musteri));
    setFormError('');
  }

  /**
   * Yeni kayıtta müşteri tipini değiştirir. Tipe özel alanlar (TCKN, firma unvanı,
   * yetkililer vb.) sıfırlanır; kullanıcının zaten girdiği ortak iletişim ve adres
   * bilgileri korunur ki yeniden yazmak zorunda kalmasın.
   */
  const tipDegistir = (tip: CustomerType) =>
    setEditing((prev) => {
      if (!prev || prev.tip === tip) return prev;
      return {
        ...bosMusteri(tip),
        mobilTelefon: prev.mobilTelefon,
        sabitTelefon: prev.sabitTelefon,
        email: prev.email,
        il: prev.il,
        ilce: prev.ilce,
        acikAdres: prev.acikAdres,
        uavtKodu: prev.uavtKodu,
        musteriTemsilcisi: prev.musteriTemsilcisi,
        notlar: prev.notlar,
        isActive: prev.isActive,
      };
    });

  /**
   * Aynı kimlik/vergi no veya cep numarası başka bir kayıtta varsa uyarır. Engellemez —
   * aile bireyleri aynı telefonu paylaşabilir; karar kullanıcıya bırakılır.
   */
  const benzerKayit = useMemo(
    () => (editing ? benzerMusteriBul(customers, editing) : null),
    [customers, editing],
  );

  /** Form kapalıyken "/" tuşu doğrudan aramaya odaklanır. */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const hedef = e.target as HTMLElement | null;
      const yaziyor = hedef && ['INPUT', 'TEXTAREA', 'SELECT'].includes(hedef.tagName);
      if (e.key === '/' && !yaziyor && !editing) {
        e.preventDefault();
        aramaRef.current?.focus();
      }
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [editing]);

  /** Esc formu kapatır, Ctrl/Cmd+Enter kaydeder — fare kullanmadan hızlı giriş. */
  useEffect(() => {
    if (!editing) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { formuKapat(); return; }
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        void kaydet(false);
      }
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // kaydet her render'da yeniden oluşur; editing değişimi bağlamayı tazelemeye yeter.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing]);

  const updateYetkili = (index: number, patch: Partial<CorporateContact>) =>
    setEditing((prev) => {
      if (!prev) return prev;
      const yetkililer = prev.yetkililer.map((y, i) => (i === index ? { ...y, ...patch } : y));
      return { ...prev, yetkililer };
    });

  const bireysel = customers.filter((c) => c.tip === 'bireysel').length;
  const kurumsal = customers.filter((c) => c.tip === 'kurumsal').length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">Müşteriler</h1>
          <p className="text-xs text-slate-500 mt-1">
            Bireysel ve kurumsal müşteri portföyü. Poliçeler bu kayıtlara bağlanır.
          </p>
        </div>
        {/* İki giriş yolu: "Hızlı" en az bilgiyle kaydedip poliçe akışına
            geçirir, "Yeni Müşteri" tüm alanları olan tam formu açar. Birincil
            eylem (tam form) sağda durur. */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setHizliAcik(true)}
            className="px-4 py-2.5 rounded-xl bg-white border border-blue-800 text-blue-900 hover:bg-blue-50 font-bold text-xs inline-flex items-center gap-2"
          >
            <UserPlus className="w-4 h-4" /> Hızlı Müşteri Ekle
          </button>
          <button
            onClick={() => formuAc(bosMusteri('bireysel'))}
            className="px-4 py-2.5 rounded-xl bg-blue-900 hover:bg-blue-800 text-white font-bold text-xs inline-flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Yeni Müşteri
          </button>
        </div>
      </div>

      {msg && (
        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold inline-flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" /> {msg}
        </div>
      )}

      {/* Özet */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { l: 'Toplam Müşteri', v: customers.length },
          { l: 'Bireysel', v: bireysel },
          { l: 'Kurumsal', v: kurumsal },
          { l: 'Toplam Poliçe', v: policies.length },
        ].map((k) => (
          <div key={k.l} className="bg-white rounded-xl p-4 border border-slate-200">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{k.l}</div>
            <div className="text-2xl font-extrabold text-slate-900 mt-1">{k.v}</div>
          </div>
        ))}
      </div>

      {/* Arama + filtre */}
      <div className="bg-white rounded-xl p-4 border border-slate-200 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            ref={aramaRef}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Ad, unvan, kimlik no, telefon veya müşteri no ile ara…   ( / )"
            className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-slate-300 text-xs"
          />
        </div>
        <div className="flex items-center gap-1">
          {([['tumu', 'Tümü'], ['bireysel', 'Bireysel'], ['kurumsal', 'Kurumsal']] as const).map(([k, l]) => (
            <button
              key={k}
              onClick={() => setTipFilter(k)}
              className={`px-3 py-2 rounded-lg text-xs font-bold ${
                tipFilter === k ? 'bg-blue-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {l}
            </button>
          ))}
        </div>
      </div>

      {/* Liste */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-xs text-slate-500">Yükleniyor…</div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center">
            <UserPlus className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <div className="text-sm font-bold text-slate-700">
              {customers.length === 0 ? 'Henüz müşteri kaydı yok' : 'Aramaya uyan müşteri yok'}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {customers.length === 0
                ? 'Yukarıdaki butonlarla ilk müşterinizi ekleyin.'
                : 'Farklı bir arama deneyin.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr className="text-left text-[10px] uppercase tracking-wider text-slate-500">
                  <th className="px-4 py-3">Müşteri No</th>
                  <th className="px-4 py-3">Ad / Unvan</th>
                  <th className="px-4 py-3">İletişim</th>
                  <th className="px-4 py-3">Poliçe</th>
                  <th className="px-4 py-3">Branşlar</th>
                  <th className="px-4 py-3 text-right">İşlem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((c) => {
                  const adet = policeSayisi.get(c.id) || 0;
                  // Numara geçersizse (eksik/bozuk kayıt) bağlantı null döner; ikon o
                  // zaman hiç çizilmez — tıklayınca hata veren düğme göstermek yerine.
                  const waBaglantisi = c.mobilTelefon
                    ? whatsappBaglantisi(c.mobilTelefon, whatsappSelamla(c))
                    : null;
                  const kimlik = kimlikNumarasi(c);
                  const yetkiliSayisi = c.tip === 'kurumsal' ? c.yetkililer.length : 0;
                  return (
                                        // yerine basıp karta girebilsin. İşlem sütunundaki düğmeler kendi
                    // tıklamalarını durdurur (aşağıda stopPropagation).
                    <tr
                      key={c.id}
                      onClick={() => router.push(`/admin/musteriler/${c.id}`)}
                      className="hover:bg-slate-50 cursor-pointer"
                    >
                      <td className="px-4 py-3 font-mono text-[11px] text-slate-600">{c.musteriNo}</td>
                      {/* Kimlik numarası adın hemen altında: numara zaten "kimin?"
                          sorusuyla birlikte okunuyor, ayrı sütun hem araya mesafe
                          koyuyor hem tabloyu yatay kaydırmaya zorluyordu. Maskeleme
                          yok — panel yetkili personele açık ve numara poliçe
                          işlemlerinde okunmak zorunda; kopyalama düğmesi elle
                          yazmayı ortadan kaldırır. */}
                      <td className="px-4 py-3">
                        <div className="font-bold text-slate-900 inline-flex items-center gap-1.5 flex-wrap">
                          {musteriAdi(c)}
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                            c.tip === 'kurumsal' ? 'bg-slate-200 text-slate-700' : 'bg-blue-100 text-blue-800'
                          }`}>
                            {c.tip === 'kurumsal' ? 'Kurumsal' : 'Bireysel'}
                          </span>
                          {!c.isActive && (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-100 text-rose-800">
                              Pasif
                            </span>
                          )}
                        </div>
                        {(kimlik || yetkiliSayisi > 0) && (
                          <div className="mt-0.5 flex items-center gap-2 flex-wrap">
                            {kimlik && <KopyalanabilirDeger deger={kimlik.deger} etiket={kimlik.etiket} />}
                            {yetkiliSayisi > 0 && (
                              <span className="text-[10px] text-slate-500">{yetkiliSayisi} yetkili</span>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Telefon ve e-posta ayrı satırlarda; her birinin yanında o
                          veriyle yapılacak işin kısayolu var. */}
                      <td className="px-4 py-3 text-slate-600 space-y-1">
                        {c.mobilTelefon && (
                          <div className="flex items-center gap-1.5">
                            <Phone className="w-3 h-3 shrink-0 text-slate-400" />
                            <a href={`tel:${c.mobilTelefon.replace(/\D/g, '')}`} className="hover:underline">
                              {c.mobilTelefon}
                            </a>
                            {waBaglantisi && (
                              <a
                                href={waBaglantisi}
                                target="_blank"
                                rel="noopener noreferrer"
                                aria-label={`${musteriAdi(c)} kişisine WhatsApp mesajı gönder`}
                                title="WhatsApp'tan yaz"
                                className="p-1.5 rounded hover:bg-emerald-100 text-emerald-700"
                              >
                                <MessageCircle className="w-3.5 h-3.5" />
                              </a>
                            )}
                            <KopyaDugmesi deger={c.mobilTelefon} etiket="Telefon" />
                          </div>
                        )}
                        {c.email && (
                          <div className="flex items-center gap-1.5">
                            <Mail className="w-3 h-3 shrink-0 text-slate-400" />
                            <a href={`mailto:${c.email}`} className="hover:underline break-all">{c.email}</a>
                            <KopyaDugmesi deger={c.email} etiket="E-posta" />
                          </div>
                        )}
                        {!c.mobilTelefon && !c.email && <span className="text-slate-400">—</span>}
                      </td>

                      <td className="px-4 py-3">
                        {adet > 0 ? (
                          <Link
                            href={`/admin/police-takibi?musteri=${c.id}`}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded bg-emerald-50 text-emerald-800 font-bold hover:bg-emerald-100"
                            title="Poliçe takibinde aç"
                          >
                            <ShieldCheck className="w-3 h-3" /> {adet}
                          </Link>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>

                      {/* Hangi branşlarda poliçesi var — sayıya bakıp poliçe sayfasına
                          gitmeden görülebilsin. Aynı branştan birden çok poliçe varsa
                          etiket bir kez, adediyle gösterilir. */}
                      <td className="px-4 py-3">
                        {(() => {
                          const branslar = musteriBranslari.get(c.id);
                          if (!branslar || branslar.length === 0) {
                            return <span className="text-slate-400">—</span>;
                          }
                          return (
                            <div className="flex flex-wrap gap-1">
                              {branslar.map(({ turu, adet: bransAdedi }) => (
                                <span
                                  key={turu}
                                  className={`px-1.5 py-0.5 rounded border text-[10px] font-bold ${bransRengi(turu)}`}
                                  title={turu}
                                >
                                  {bransKisaAd(turu)}
                                  {bransAdedi > 1 && ` ×${bransAdedi}`}
                                </span>
                              ))}
                            </div>
                          );
                        })()}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={(e) => { e.stopPropagation(); router.push(`/admin/musteriler/${c.id}`); }}
                            className="p-1.5 rounded-lg hover:bg-blue-100 text-blue-700"
                            aria-label={`${musteriAdi(c)} kartını görüntüle`}
                            title="Kartı görüntüle"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          {/* Düzenle ikonu YOK: müşteri kartında zaten "Düzenle"
                              düğmesi var ve satıra tıklamak da karta götürüyor.
                              Listede üçüncü bir ikon, sütunu asıl işlerden
                              (gözat, poliçe kes) uzaklaştırıyordu.

                              Silme yerine poliçe kesme. Silme zaten poliçesi olan
                              müşterilerde engelliydi (yabancı anahtar); günlük
                              işte asıl gereken bu satırdan hızlıca poliçe
                              açabilmek. */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              router.push(`/admin/police-takibi?musteri=${c.id}&yeni=1`);
                            }}
                            className="p-1.5 rounded-lg hover:bg-emerald-100 text-emerald-700"
                            aria-label={`${musteriAdi(c)} için yeni poliçe oluştur`}
                            title="Hızlıca poliçe ekle"
                          >
                            <ShieldPlus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>


      {/* Hızlı ekleme penceresi.
          Kaydedince doğrudan poliçe akışına geçilir: bu düğmenin varlık sebebi
          "müşteriyi kaydet, sonra poliçe kes" işini tek adıma indirmek. Yalnız
          müşteri kaydı isteyen "Yeni Müşteri" tam formunu kullanır. */}
      {hizliAcik && (
        <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-start justify-center p-4 overflow-y-auto">
          <div
            ref={hizliRef}
            {...hizliDialog}
            className="bg-white rounded-2xl w-full max-w-3xl my-8 shadow-2xl"
          >
            <div className="flex items-center justify-between p-5 border-b border-slate-200">
              <h2 id={hizliBaslikId} className="font-extrabold text-slate-900">Hızlı Müşteri Ekle</h2>
              <button
                type="button"
                onClick={() => setHizliAcik(false)}
                aria-label="Pencereyi kapat"
                className="p-1.5 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5">
              <HizliMusteriFormu
                kaydetEtiketi="Ekle ve Poliçe Oluştur"
                onIptal={() => setHizliAcik(false)}
                onEklendi={(musteri) => {
                  setHizliAcik(false);
                  router.push(`/admin/police-takibi?musteri=${musteri.id}&yeni=1`);
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Form */}
      {editing && (
        <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-start justify-center p-4 overflow-y-auto">
          <form
            ref={musteriFormRef}
            {...musteriDialogOzellikleri}
            onSubmit={handleSave}
            className="bg-white rounded-2xl w-full max-w-3xl my-8 shadow-2xl"
          >
            <div className="flex items-center justify-between p-5 border-b border-slate-200 sticky top-0 bg-white rounded-t-2xl">
              <h2 id={musteriBaslikId} className="font-extrabold text-slate-900 inline-flex items-center gap-2">
                {editing.tip === 'kurumsal' ? <Building2 className="w-5 h-5" /> : <User className="w-5 h-5" />}
                {editing.id ? 'Müşteriyi Düzenle' : 'Yeni Müşteri'}
                {editing.id && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                    {editing.tip === 'kurumsal' ? 'Kurumsal' : 'Bireysel'}
                  </span>
                )}
              </h2>
              <button type="button" onClick={formuKapat} aria-label="Formu kapat" className="p-1.5 rounded-lg hover:bg-slate-100">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-5">
              {formError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold inline-flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" /> {formError}
                </div>
              )}

              {/* Müşteri tipi yalnız yeni kayıtta seçilir; sonrasında değiştirmek
                  bağlı poliçelerin sigortalı bilgisiyle çelişeceği için kilitlenir. */}
              {!editing.id && (
                <div>
                  <div className="text-[11px] font-bold text-slate-600 mb-1.5">Müşteri Tipi</div>
                  <div className="inline-flex p-1 rounded-xl bg-slate-100 gap-1">
                    {MUSTERI_TIPLERI.map(({ tip, etiket, Icon }) => (
                      <button
                        key={tip}
                        type="button"
                        onClick={() => tipDegistir(tip)}
                        aria-pressed={editing.tip === tip}
                        className={`px-4 py-2 rounded-lg text-xs font-bold inline-flex items-center gap-2 transition-colors ${
                          editing.tip === tip
                            ? 'bg-blue-900 text-white shadow-xs'
                            : 'text-slate-600 hover:bg-white hover:text-slate-900'
                        }`}
                      >
                        <Icon className="w-4 h-4" /> {etiket}
                      </button>
                    ))}
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1.5">
                    Seçime göre aşağıdaki alanlar değişir. Girdiğiniz iletişim ve adres bilgileri korunur.
                  </p>
                </div>
              )}

              {/* Mükerrer kayıt uyarısı: engellemez, sadece haber verir. */}
              {benzerKayit && (
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-[11px] font-semibold flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>
                    Bu bilgilerle eşleşen bir kayıt zaten var: <strong>{musteriAdi(benzerKayit)}</strong>{' '}
                    ({benzerKayit.musteriNo}). Aynı kişiyse mevcut kaydı düzenlemeniz daha doğru olur.
                  </span>
                </div>
              )}

              {/* Temel bilgiler: her kayıtta gereken az sayıda alan. Gerisi aşağıda katlı. */}
              {editing.tip === 'bireysel' ? (
                <FieldRow>
                  <Field label="Adı" required ch={22} hint="Kaydederken ilk harfler büyütülür">
                    <input
                      autoFocus
                      value={editing.ad || ''}
                      onChange={(e) => updateField({ ad: e.target.value })}
                      onBlur={(e) => updateField({ ad: bicimlendirAd(e.target.value) })}
                      className={inputCls}
                    />
                  </Field>
                  <Field label="Soyadı" required ch={18} hint="Kaydederken büyük harfe çevrilir">
                    <input
                      value={editing.soyad || ''}
                      onChange={(e) => updateField({ soyad: e.target.value })}
                      onBlur={(e) => updateField({ soyad: bicimlendirSoyad(e.target.value) })}
                      className={inputCls}
                    />
                  </Field>
                  {/* Cinsiyet ad/soyadın YANINDA duruyor, aşağıdaki katlı bölümde
                      değil: "Devrim Deniz" gibi adlarda ayrım isim yazılırken
                      yapılabilmeli. Katlı bölümde kaldığı sürece alan pratikte hiç
                      doldurulmuyordu. */}
                  <CinsiyetSecici
                    deger={editing.cinsiyet}
                    onDegisim={(cinsiyet) => updateField({ cinsiyet })}
                  />
                  <Field label="Mobil Telefon" ch={17} hint="WhatsApp hatırlatmaları buraya gider">
                    <input
                      value={editing.mobilTelefon || ''}
                      onChange={(e) => updateField({ mobilTelefon: telefonMaskele(e.target.value) })}
                      placeholder="0(5XX) XXX XX XX"
                      className={inputCls} inputMode="tel"
                    />
                  </Field>
                  <Field label="T.C. Kimlik No" ch={12} hint={tcDurumu(editing.tcKimlikNo)}>
                    <input
                      value={editing.tcKimlikNo || ''}
                      onChange={(e) => updateField({ tcKimlikNo: e.target.value.replace(/\D/g, '').slice(0, 11) })}
                      className={inputCls} inputMode="numeric" maxLength={11}
                    />
                  </Field>
                </FieldRow>
              ) : (
                <FieldRow>
                  <Field label="Firma Unvanı" required ch={42}>
                    <input
                      autoFocus
                      value={editing.firmaUnvani || ''}
                      onChange={(e) => updateField({ firmaUnvani: e.target.value })}
                      className={inputCls}
                    />
                  </Field>
                  <Field label="Mobil Telefon" ch={17} hint="WhatsApp hatırlatmaları buraya gider">
                    <input
                      value={editing.mobilTelefon || ''}
                      onChange={(e) => updateField({ mobilTelefon: telefonMaskele(e.target.value) })}
                      placeholder="0(5XX) XXX XX XX"
                      className={inputCls} inputMode="tel"
                    />
                  </Field>
                  <Field label="Vergi Numarası" ch={11} hint="10 hane">
                    <input
                      value={editing.vergiNo || ''}
                      onChange={(e) => updateField({ vergiNo: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                      className={inputCls} inputMode="numeric" maxLength={10}
                    />
                  </Field>
                </FieldRow>
              )}

              {editing.tip === 'bireysel' ? (
                <Section title="Kimlik & Kişisel Bilgiler" summary={ozetKisisel(editing)}>
                  <FieldRow>
                    <Field label="Doğum Tarihi" ch={10} tur="date">
                      <input type="date" value={editing.dogumTarihi || ''} onChange={(e) => updateField({ dogumTarihi: e.target.value })} className={inputCls} />
                    </Field>
                    {/* Cinsiyet buradan KALDIRILDI: artık ad/soyadın yanında, formun
                        üst satırında. Aynı alan için iki ayrı denetim bırakmak, biri
                        değiştirildiğinde diğerinin eski değeri gösterdiği izlenimini
                        verirdi. */}
                    <Field label="Uyruğu" ch={14}>
                      <input value={editing.uyruk || ''} onChange={(e) => updateField({ uyruk: e.target.value })} className={inputCls} />
                    </Field>
                    <Field label="Mesleği" ch={22}>
                      <input value={editing.meslek || ''} onChange={(e) => updateField({ meslek: e.target.value })} className={inputCls} />
                    </Field>
                    {/* Yabancı kimlik numarası ancak T.C. kimlik numarası yoksa anlamlıdır;
                        ikisi bir arada bulunmaz. TCKN girildiği anda alan kaldırılır. */}
                    {!editing.tcKimlikNo && (
                      <Field label="Yabancı Kimlik No" ch={12} hint="T.C. kimlik numarası olmayan yabancı uyruklu müşteriler için">
                        <input
                          value={editing.yabanciKimlikNo || ''}
                          onChange={(e) => updateField({ yabanciKimlikNo: e.target.value.replace(/\D/g, '').slice(0, 11) })}
                          className={inputCls} inputMode="numeric" maxLength={11}
                        />
                      </Field>
                    )}
                  </FieldRow>
                </Section>
              ) : (
                <Section title="Firma Detayları" summary={ozetFirma(editing)}>
                  <FieldRow>
                    <Field label="Marka / Tabela Adı" ch={22}>
                      <input value={editing.markaAdi || ''} onChange={(e) => updateField({ markaAdi: e.target.value })} className={inputCls} />
                    </Field>
                    <Field label="Vergi Dairesi" ch={20}>
                      <input value={editing.vergiDairesi || ''} onChange={(e) => updateField({ vergiDairesi: e.target.value })} className={inputCls} />
                    </Field>
                    <Field label="MERSİS No" ch={20} hint="16 hane">
                      <input value={editing.mersisNo || ''} onChange={(e) => updateField({ mersisNo: e.target.value })} className={inputCls} />
                    </Field>
                    <Field label="NACE Kodu" ch={10}>
                      <input value={editing.naceKodu || ''} onChange={(e) => updateField({ naceKodu: e.target.value })} className={inputCls} />
                    </Field>
                    <Field label="Faaliyet Konusu" ch={28}>
                      <input value={editing.faaliyetKonusu || ''} onChange={(e) => updateField({ faaliyetKonusu: e.target.value })} className={inputCls} />
                    </Field>
                    <Field label="Çalışan Sayısı" ch={6}>
                      <input
                        type="number" min={0}
                        value={editing.calisanSayisi ?? ''}
                        onChange={(e) => updateField({ calisanSayisi: e.target.value === '' ? undefined : Number(e.target.value) })}
                        className={inputCls}
                      />
                    </Field>
                  </FieldRow>
                </Section>
              )}

              <Section title="İletişim & Adres" summary={ozetAdres(editing)}>
                <FieldRow>
                  <Field label="Sabit Telefon" ch={17}>
                    <input value={editing.sabitTelefon || ''} onChange={(e) => updateField({ sabitTelefon: e.target.value })} className={inputCls} inputMode="tel" />
                  </Field>
                  <Field label="E-Posta" ch={28}>
                    <input type="email" value={editing.email || ''} onChange={(e) => updateField({ email: e.target.value })} className={inputCls} />
                  </Field>
                  <Field label="İl" ch={14}>
                    <input value={editing.il || ''} onChange={(e) => updateField({ il: e.target.value })} className={inputCls} />
                  </Field>
                  <Field label="İlçe" ch={14}>
                    <input value={editing.ilce || ''} onChange={(e) => updateField({ ilce: e.target.value })} className={inputCls} />
                  </Field>
                  <Field label="UAVT Adres Kodu" ch={12} hint="DASK ve konut poliçelerinde gerekir">
                    <input
                      value={editing.uavtKodu || ''}
                      onChange={(e) => updateField({ uavtKodu: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                      className={inputCls} inputMode="numeric" maxLength={10}
                    />
                  </Field>
                  <Field label="Müşteri Temsilcisi" ch={20}>
                    <input value={editing.musteriTemsilcisi || ''} onChange={(e) => updateField({ musteriTemsilcisi: e.target.value })} className={inputCls} />
                  </Field>
                </FieldRow>
                <Field label="Açık Adres">
                  <textarea value={editing.acikAdres || ''} onChange={(e) => updateField({ acikAdres: e.target.value })} rows={2} className={inputCls} />
                </Field>
              </Section>

              {editing.tip === 'kurumsal' && (
                <Section
                  title="Yetkililer / Temsilciler"
                  summary={editing.yetkililer.length > 0 ? `${editing.yetkililer.length} kişi` : 'eklenmedi'}
                  defaultOpen={editing.yetkililer.length > 0}
                >
                  {editing.yetkililer.length === 0 && (
                    <p className="text-[11px] text-slate-500">
                      Kuruma sınırsız yetkili eklenebilir. Poliçe işlemlerinde kiminle görüşüleceği buradan takip edilir.
                    </p>
                  )}

                  <div className="space-y-3">
                    {editing.yetkililer.map((y, i) => (
                      <div key={y.id} className="p-3 rounded-xl border border-slate-200 bg-slate-50 space-y-3">
                        <FieldRow>
                          <Field label="Adı" ch={22}>
                            <input value={y.ad} onChange={(e) => updateYetkili(i, { ad: e.target.value })} className={inputCls} />
                          </Field>
                          <Field label="Soyadı" ch={18}>
                            <input value={y.soyad} onChange={(e) => updateYetkili(i, { soyad: e.target.value })} className={inputCls} />
                          </Field>
                          <Field label="Görev Unvanı" ch={20}>
                            <input value={y.gorevUnvani || ''} onChange={(e) => updateYetkili(i, { gorevUnvani: e.target.value })} className={inputCls} />
                          </Field>
                          <Field label="Mobil Telefon" ch={17}>
                            <input
                              value={y.mobilTelefon || ''}
                              onChange={(e) => updateYetkili(i, { mobilTelefon: telefonMaskele(e.target.value) })}
                              className={inputCls} inputMode="tel"
                            />
                          </Field>
                        </FieldRow>
                        <div className="flex flex-wrap items-center gap-3 text-[11px]">
                          {([
                            ['anaYetkili', 'Ana yetkili'],
                            ['policeYetkilisi', 'Poliçe işlemleri'],
                            ['hasarYetkilisi', 'Hasar işlemleri'],
                            ['tahsilatYetkilisi', 'Tahsilat / finans'],
                          ] as const).map(([k, l]) => (
                            <label key={k} className="inline-flex items-center gap-1.5 font-semibold text-slate-600">
                              <input
                                type="checkbox"
                                checked={Boolean(y[k])}
                                onChange={(e) => updateYetkili(i, { [k]: e.target.checked })}
                              />
                              {l}
                            </label>
                          ))}
                          <button
                            type="button"
                            onClick={() => updateField({ yetkililer: editing.yetkililer.filter((_, j) => j !== i) })}
                            className="ml-auto text-rose-600 font-bold hover:underline"
                          >
                            Kaldır
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={() => updateField({ yetkililer: [...editing.yetkililer, bosYetkili()] })}
                    className="text-[11px] font-bold text-blue-800 hover:underline inline-flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" /> Yetkili Ekle
                  </button>
                </Section>
              )}

              <Section title="Notlar" summary={editing.notlar ? 'dolu' : 'boş'}>
                <textarea
                  value={editing.notlar || ''}
                  onChange={(e) => updateField({ notlar: e.target.value })}
                  rows={3} className={inputCls}
                  placeholder="Müşteriye özel hatırlatmalar, tercihler, geçmiş görüşmeler…"
                />
              </Section>

              {editing.id && (
                <p className="text-[11px] text-slate-400">
                  Oluşturma: {formatTarih(editing.createdAt)} · Son güncelleme: {formatTarih(editing.updatedAt)}
                </p>
              )}
            </div>

            <div className="p-5 border-t border-slate-200 flex flex-wrap items-center gap-2 sticky bottom-0 bg-white rounded-b-2xl">
              <span className="text-[10px] text-slate-400 mr-auto hidden sm:block">
                Ctrl+Enter kaydeder · Esc kapatır
              </span>
              <button type="button" onClick={formuKapat} className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs">
                Vazgeç
              </button>
              {!editing.id && (
                <button
                  type="button" disabled={saving}
                  onClick={() => void kaydet(true)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-60 text-white font-bold text-xs inline-flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" /> Kaydet ve Yeni
                </button>
              )}
              <button
                type="submit" disabled={saving}
                className="px-5 py-2.5 rounded-xl bg-blue-900 hover:bg-blue-800 disabled:opacity-60 text-white font-bold text-xs inline-flex items-center gap-2"
              >
                <Save className="w-4 h-4" /> {saving ? 'Kaydediliyor…' : 'Kaydet'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

/** T.C. kimlik alanının altında anlık geri bildirim: yazarken doğru mu, değil mi. */
function tcDurumu(deger: string | undefined): string {
  const tc = (deger || '').trim();
  if (!tc) return '11 hane, bitişik';
  if (tc.length < 11) return `${11 - tc.length} hane daha`;
  return tcKimlikGecerliMi(tc) ? '✓ Geçerli' : '✗ Doğrulama başarısız, kontrol edin';
}

/** Katlı bölümlerin başlığında görünen özetler — bölüm açılmadan içeriği belli olur. */
function ozetKisisel(c: Customer): string {
  // `cinsiyet` bu özete GİRMEZ: alan artık formun üst satırında, bu katlı bölümün
  // içinde değil. Sayılmaya devam etseydi bölüm kapalıyken "1 alan dolu" deyip
  // açıldığında boş görünecekti.
  const dolu = [c.dogumTarihi, c.uyruk, c.meslek, c.yabanciKimlikNo].filter(Boolean).length;
  return dolu > 0 ? `${dolu} alan dolu` : 'isteğe bağlı';
}

function ozetFirma(c: Customer): string {
  const dolu = [c.markaAdi, c.vergiDairesi, c.mersisNo, c.naceKodu, c.faaliyetKonusu].filter(Boolean).length;
  return dolu > 0 ? `${dolu} alan dolu` : 'isteğe bağlı';
}

function ozetAdres(c: Customer): string {
  const yer = [c.ilce, c.il].filter(Boolean).join(' / ');
  return yer || 'isteğe bağlı';
}


/**
 * WhatsApp mesajının açılış metni.
 *
 * Boş bir sohbet yerine kim olduğumuzu belirten hazır bir giriş açılır; personel
 * her seferinde aynı cümleyi yazmaz. Metin `whatsappBaglantisi` içinde URL kodlanır.
 */
function whatsappSelamla(c: Customer): string {
  return `Merhaba ${musteriAdi(c)}, Veli Sigorta'dan yazıyorum.`;
}
