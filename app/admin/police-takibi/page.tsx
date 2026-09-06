'use client';

import React, { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Search, Plus, X, Save, Trash2, Edit, MessageCircle, AlertTriangle,
  CheckCircle2, Filter, ArrowUpDown, FileSpreadsheet, CalendarClock, RefreshCw, Eye, UserPlus,
} from 'lucide-react';
import type { Customer, InsuranceService, Policy, PolicyStatus } from '@/lib/types';
import { EXPIRY_FILTERS, VARSAYILAN_HATIRLATMA_METNI, aciliyet, filtreyeUyuyorMu, formatTarih, formatTutar, hatirlatmaMetniOlustur, kalanGun, musteriAdi, plakayiBul, riskTanimiPlakasiz, toWhatsAppNumber, whatsappBaglantisi } from '@/lib/police';
import {
  birYilSonrasi, gecmisDegerler, komisyonHesapla, sureyiCikar, tarihEkle,
  type SureBirimi,
} from '@/lib/form-helpers';
import { bransKisaAd, bransRengi } from '@/lib/brans-renk';
import { metinAramasiEslesiyorMu } from '@/lib/turkce';
import { telefonAramasiEslesiyorMu } from '@/lib/telefon';
import { Field, FieldRow, Section, inputCls } from '@/components/admin/form-ui';
import { useModalErisilebilirlik } from '@/components/admin/useModalErisilebilirlik';
import { MusteriSecici } from '@/components/admin/MusteriSecici';
import { HizliMusteriFormu, eklendiMesaji } from '@/components/admin/HizliMusteriFormu';
import { KopyaDugmesi } from '@/components/admin/KopyaDugmesi';
import { WhatsAppReminderModal } from '@/components/admin/WhatsAppReminderModal';
import { toSafeCsvCell } from '@/lib/csv';

type SortKey = 'bitis' | 'baslangic' | 'musteri' | 'prim';

/** Yeni poliçe formu. Aktif müşteri filtresi varsa o müşteri hazır seçili gelir. */
function bosPolice(musteriId = ''): Policy {
  const now = new Date().toISOString();
  const bugun = now.slice(0, 10);
  return {
    id: '', musteriId, sigortaSirketi: '', sigortaTuru: '', policeNo: '',
    baslangicTarihi: bugun, bitisTarihi: birYilSonrasi(bugun),
    durum: 'Aktif', yenilemeMi: false, paraBirimi: 'TL',
    createdAt: now, updatedAt: now,
  };
}

/**
 * Biten bir poliçeden yenileme taslağı üretir. Müşteri, şirket, branş, risk ve prim
 * bilgileri taşınır; tarihler bir yıl ileri alınır ve önceki poliçe numarası bağlanır.
 * Kullanıcı yalnız yeni poliçe numarasını yazar — yenileme girişi tek alana iner.
 */
function yenilemeTaslagi(eski: Policy): Policy {
  const now = new Date().toISOString();
  const yeniBaslangic = eski.bitisTarihi;

  return {
    ...eski,
    id: '',
    policeNo: '',
    yenilemeNo: '',
    baslangicTarihi: yeniBaslangic,
    bitisTarihi: birYilSonrasi(yeniBaslangic),
    durum: 'Aktif',
    yenilemeMi: true,
    oncekiPoliceNo: eski.policeNo,
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Poliçelerin ezici çoğunluğu yıllık; yeni kayıt bu değerle açılır ve kullanıcı
 * gerekirse değiştirir.
 */
const VARSAYILAN_SURE = 1;
const VARSAYILAN_SURE_BIRIMI: SureBirimi = 'yil';

/**
 * Branş alanının genişliği bu metne göre ölçülür — listedeki en uzun seçenek.
 * Alan dar kalırsa seçenek kırpılıyor ve kullanıcı hangi branşı seçtiğini
 * göremiyordu.
 */
const EN_UZUN_BRANS = 'İhtiyari Mali Mesuliyet (İMM) Sigortası';

const ACILIYET_STIL: Record<string, string> = {
  gecmis: 'bg-slate-200 text-slate-700',
  kritik: 'bg-rose-100 text-rose-800',
  uyari: 'bg-amber-100 text-amber-800',
  yaklasiyor: 'bg-blue-100 text-blue-800',
  normal: 'bg-emerald-50 text-emerald-700',
};

/**
 * Sayfanın gövdesi. Varsayılan dışa aktarım DEĞİL: `useSearchParams` kullanan
 * bileşen Suspense sınırı içinde olmak zorunda (Next.js ön-render kuralı),
 * aksi hâlde derleme hata veriyor. Aynı kalıp `app/teklif-al/page.tsx` içinde de var.
 */
function PoliceTakibiIcerik() {
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [services, setServices] = useState<InsuranceService[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [aktifFiltre, setAktifFiltre] = useState<string | null>(null);
  const [durumFiltre, setDurumFiltre] = useState<'tumu' | PolicyStatus>('tumu');
  /**
   * Müşteri filtresi. Kaynağı ikili: adres çubuğundaki `?musteri=` ya da
   * kullanıcının açılır listeden seçtiği değer.
   *
   * Adres `useSearchParams` ile okunur, `window.location.search` ile DEĞİL:
   * istemci tarafı geçişte (`router.push`) bu bileşen, adres çubuğu yeni URL'e
   * yazılmadan önce render olabiliyor ve ilk render'da okunan değer boş
   * kalıyordu. Belirti sinsiydi — `yeni=1` efekt içinde okunduğu için form
   * açılıyor ama müşteri seçili GELMİYORDU.
   *
   * Kullanıcı seçimi `null` olduğu sürece URL geçerli; bir kez seçim yapılınca
   * (temizleme dâhil) onun değeri kazanır.
   */
  const aramaParametreleri = useSearchParams();
  const urlMusterisi = aramaParametreleri.get('musteri') || '';
  const [secilenMusteri, setSecilenMusteri] = useState<string | null>(null);
  const musteriFiltre = secilenMusteri ?? urlMusterisi;
  const setMusteriFiltre = (deger: string) => setSecilenMusteri(deger);
  const [sortKey, setSortKey] = useState<SortKey>('bitis');
  const [sortAsc, setSortAsc] = useState(true);

  const [editing, setEditing] = useState<Policy | null>(null);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  /** Form açıldığındaki hâli; "değişiklik var mı?" karşılaştırması bunun üzerinden yapılır. */
  const [ilkHal, setIlkHal] = useState<string | null>(null);
  const [msg, setMsg] = useState('');

  /**
   * Poliçe formu içindeki hızlı müşteri ekleme paneli. `ad`, seçicide aranıp
   * bulunamayan metin — forma ön doldurulur ki personel aynı ismi iki kez yazmasın.
   */
  const [hizliMusteri, setHizliMusteri] = useState<{ ad: string } | null>(null);

  // WhatsApp gönderim penceresi
  const [waPolicy, setWaPolicy] = useState<Policy | null>(null);
  const [waSablon, setWaSablon] = useState(VARSAYILAN_HATIRLATMA_METNI);

  /**
   * Poliçe süresi. Kayıtta saklanmaz — başlangıç ve bitiş tarihinden her zaman geri
   * çıkarılabildiği için veri modeline yeni alan eklemek gereksiz olurdu. Yalnızca
   * bitiş tarihini hesaplamak ve kullanıcıya "ne kadarlık poliçe?" sorusunu tek
   * kutuda sormak için var.
   */
  const [sure, setSure] = useState(VARSAYILAN_SURE);
  const [sureBirimi, setSureBirimi] = useState<SureBirimi>(VARSAYILAN_SURE_BIRIMI);

  /**
   * "Şu an" bir kez hesaplanır. Her render'da `new Date()` çağırmak, sıralama ve
   * filtrelemenin render sırasında değişmesine yol açardı.
   */
  const [simdi] = useState(() => new Date());
  const router = useRouter();
  const aramaRef = useRef<HTMLInputElement>(null);
  const {
    ref: policeFormRef,
    dialogOzellikleri: policeDialogOzellikleri,
    baslikId: policeBaslikId,
  } = useModalErisilebilirlik<HTMLFormElement>(Boolean(editing));

  useEffect(() => {
    let mounted = true;
    // Müşteri kartındaki 'Yeni Poliçe' ve müşteri listesindeki 'Hızlıca poliçe
    // ekle' düğmeleri '?musteri=<id>&yeni=1' ile gelir; form o müşteri seçili
    // hâlde açılır ve personel seçimi tekrar yapmaz.
    const yeniIstendi = aramaParametreleri.get('yeni') === '1';
    const istenenMusteri = aramaParametreleri.get('musteri') || '';

    fetch('/api/admin/content?fields=customers,policies,services')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (mounted && data) {
          setPolicies(data.policies || []);
          setCustomers(data.customers || []);
          setServices(data.services || []);
        }
        if (mounted) setLoading(false);
        // `musteriFiltre` DEĞİL `istenenMusteri`: state güncellemesi bu kapanışa
        // yansımaz, filtre değişkeni burada hâlâ eski (boş) değeri taşır.
        if (mounted && yeniIstendi) formuAc(bosPolice(istenenMusteri));
      });
    return () => { mounted = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const musteriMap = useMemo(
    () => new Map(customers.map((c) => [c.id, c])),
    [customers],
  );

  const gorunen = useMemo(() => {
    const filtre = EXPIRY_FILTERS.find((f) => f.key === aktifFiltre);

    const liste = policies.filter((p) => {
      if (musteriFiltre && p.musteriId !== musteriFiltre) return false;
      if (durumFiltre !== 'tumu' && p.durum !== durumFiltre) return false;
      if (filtre && !filtreyeUyuyorMu(p, filtre, simdi)) return false;

      // Arama Türkçe harf katlamalı ortak kuralla yapılır (bkz. lib/turkce.ts):
      // ham `toLocaleLowerCase('tr-TR')` ile "yilmaz" yazan personel "YILMAZ"
      // kaydını bulamıyordu. Sayfanın müşteri filtresi zaten bu kuralı
      // kullandığı için aynı sayfa kendi içinde tutarsız kalmıştı.
      const musteri = musteriMap.get(p.musteriId);
      return (
        metinAramasiEslesiyorMu(
          [
            p.policeNo, p.sigortaSirketi, p.sigortaTuru, p.sigortaliAdi, p.riskTanimi,
            p.sorumluPersonel, musteri ? musteriAdi(musteri) : '', musteri?.mobilTelefon,
          ],
          search,
        ) ||
        // Müşteri telefonu ülke kodundan bağımsız da aranabilsin (bkz. lib/telefon.ts).
        telefonAramasiEslesiyorMu([musteri?.mobilTelefon, musteri?.sabitTelefon], search)
      );
    });

    const yon = sortAsc ? 1 : -1;
    return liste.sort((a, b) => {
      if (sortKey === 'musteri') {
        const an = musteriMap.get(a.musteriId);
        const bn = musteriMap.get(b.musteriId);
        return yon * (an ? musteriAdi(an) : '').localeCompare(bn ? musteriAdi(bn) : '', 'tr-TR');
      }
      if (sortKey === 'prim') return yon * ((a.brutPrim || 0) - (b.brutPrim || 0));
      const alan = sortKey === 'baslangic' ? 'baslangicTarihi' : 'bitisTarihi';
      return yon * (Date.parse(a[alan]) - Date.parse(b[alan]));
    });
  }, [policies, search, aktifFiltre, durumFiltre, musteriFiltre, sortKey, sortAsc, musteriMap, simdi]);

  /** Her hızlı filtrenin kaç poliçe içerdiği — butonlarda rozet olarak gösterilir. */
  const filtreSayilari = useMemo(() => {
    const m: Record<string, number> = {};
    EXPIRY_FILTERS.forEach((f) => {
      m[f.key] = policies.filter((p) => filtreyeUyuyorMu(p, f, simdi)).length;
    });
    return m;
  }, [policies, simdi]);

  /** Daha önce girilmiş şirket adları — yazarken öneri olarak sunulur. */
  const sirketOnerileri = useMemo(() => gecmisDegerler(policies, (p) => p.sigortaSirketi), [policies]);

  /** Branş önerileri: sitedeki hizmetler + daha önce elle girilmiş branşlar. */
  const bransOnerileri = useMemo(() => {
    const gecmis = gecmisDegerler(policies, (p) => p.sigortaTuru);
    const hizmetler = services.map((s) => s.title);
    return [...new Set([...gecmis, ...hizmetler])];
  }, [policies, services]);

  const kaydet = async (devamEt: boolean) => {
    if (!editing) return;
    setFormError('');

    if (!editing.musteriId) { setFormError('Müşteri seçilmelidir.'); return; }
    if (!editing.sigortaSirketi.trim()) { setFormError('Sigorta şirketi zorunludur.'); return; }
    if (!editing.sigortaTuru.trim()) { setFormError('Sigorta türü zorunludur.'); return; }
    if (!editing.policeNo.trim()) { setFormError('Poliçe numarası zorunludur.'); return; }
    if (Date.parse(editing.bitisTarihi) < Date.parse(editing.baslangicTarihi)) {
      setFormError('Bitiş tarihi başlangıç tarihinden önce olamaz.');
      return;
    }

    setSaving(true);
    const payload: Policy = {
      ...editing,
      id: editing.id || 'yeni',
      // Komisyon tutarı oran ve brüt primden türetilir; ayrıca elle girilmesi
      // tutarsızlığa yol açacağı için kaydederken hesaplanmış hâliyle saklanır.
      komisyonTutari: komisyonHesapla(editing.brutPrim, editing.komisyonOrani),
      createdAt: editing.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const res = await fetch('/api/admin/content?fields=customers,policies,services', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entity: 'policies', action: 'save', data: payload }),
    });
    const body = await res.json().catch(() => ({}));
    setSaving(false);

    if (!res.ok) { setFormError(body.error || 'Poliçe kaydedilemedi.'); return; }
    setPolicies(body.policies || []);
    // "Kaydet ve yeni"de aynı müşteri seçili kalır; bir müşterinin birden çok poliçesi
    // arka arkaya girilirken müşteri her seferinde yeniden aranmaz.
    if (devamEt) { formuAc(bosPolice(editing.musteriId)); } else { setEditing(null); setIlkHal(null); }
    setMsg(devamEt ? `${payload.policeNo} kaydedildi. Sıradakini girebilirsiniz.` : `${payload.policeNo} kaydedildi.`);
    setTimeout(() => setMsg(''), 4000);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    void kaydet(false);
  };

  /** Esc kapatır, Ctrl/Cmd+Enter kaydeder. */
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing]);

  /** Form kapalıyken "/" aramaya odaklanır. */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const hedef = e.target as HTMLElement | null;
      const yaziyor = hedef && ['INPUT', 'TEXTAREA', 'SELECT'].includes(hedef.tagName);
      // Açık her pencere kısayolu devre dışı bırakır; yoksa odak pencerenin
      // arkasındaki arama kutusuna kaçıyor ve kullanıcı göremediği bir alana yazıyor.
      if (e.key === '/' && !yaziyor && !editing && !waPolicy) {
        e.preventDefault();
        aramaRef.current?.focus();
      }
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [editing, waPolicy]);

  const handleDelete = async (p: Policy) => {
    if (!confirm(`${p.policeNo} numaralı poliçeyi silmek istediğinizden emin misiniz?`)) return;
    const res = await fetch('/api/admin/content?fields=customers,policies,services', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entity: 'policies', action: 'delete', data: { id: p.id } }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) { alert(body.error || 'Silinemedi.'); return; }
    setPolicies(body.policies || []);
  };

  const exportCsv = () => {
    const basliklar = ['Müşteri', 'Telefon', 'Poliçe No', 'Şirket', 'Branş', 'Başlangıç', 'Bitiş', 'Kalan Gün', 'Durum', 'Brüt Prim'];
    const satirlar = gorunen.map((p) => {
      const c = musteriMap.get(p.musteriId);
      const kalan = kalanGun(p.bitisTarihi, simdi);
      return [
        c ? musteriAdi(c) : '', c?.mobilTelefon || '', p.policeNo, p.sigortaSirketi,
        p.sigortaTuru, formatTarih(p.baslangicTarihi), formatTarih(p.bitisTarihi),
        kalan === null ? '' : String(kalan), p.durum, p.brutPrim ? String(p.brutPrim) : '',
      ].map(toSafeCsvCell).join(';');
    });
    const csv = [basliklar.join(';'), ...satirlar].join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `police-takibi-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  /** WhatsApp penceresi için doldurulmuş mesaj. */
  const waMesaj = useMemo(() => {
    if (!waPolicy) return '';
    const c = musteriMap.get(waPolicy.musteriId);
    const kalan = kalanGun(waPolicy.bitisTarihi, simdi);
    return hatirlatmaMetniOlustur(waSablon, {
      musteri: c ? musteriAdi(c) : '',
      sirket: waPolicy.sigortaSirketi,
      brans: waPolicy.sigortaTuru,
      policeNo: waPolicy.policeNo,
      bitis: formatTarih(waPolicy.bitisTarihi),
      kalanGun: kalan === null ? '' : String(kalan),
    });
  }, [waPolicy, waSablon, musteriMap, simdi]);

  const waLink = waPolicy
    ? whatsappBaglantisi(musteriMap.get(waPolicy.musteriId)?.mobilTelefon, waMesaj)
    : null;

  const updateField = (patch: Partial<Policy>) =>
    setEditing((prev) => (prev ? { ...prev, ...patch } : prev));

  /**
   * Formu kapatır. Poliçe formu prim, tahsilat ve yenileme detaylarıyla onlarca alan
   * içeriyor; yanlışlıkla Esc'e basmak dakikalarca süren girişi uyarısız siliyordu.
   * Müşteri formundaki kalıbın aynısı.
   */
  function formuKapat() {
    const kirli = ilkHal !== null && JSON.stringify(editing) !== ilkHal;
    if (kirli && !confirm('Kaydedilmemiş değişiklikler var. Formu kapatmak istediğinizden emin misiniz?')) {
      return;
    }
    setEditing(null);
    setIlkHal(null);
    // Panel formla birlikte kapanır; yeniden açıldığında yarım kalmış bir
    // müşteri girişiyle karşılaşılmasın.
    setHizliMusteri(null);
  }

  /** Formu açan tek giriş noktası — karşılaştırma için ilk hâli de saklar. */
  function formuAc(police: Policy) {
    setEditing(police);
    setIlkHal(JSON.stringify(police));
    setFormError('');
    setHizliMusteri(null);

    // Süre kayıtta tutulmuyor; mevcut bir poliçe açılırken iki tarihten geri
    // çıkarılır. Çıkarılamıyorsa (tarihler bozuk ya da bitiş başlangıçtan önce)
    // varsayılana dönülür — önceki poliçeden kalan süreyi taşımak yanıltıcı olurdu.
    const cikarilan = sureyiCikar(police.baslangicTarihi, police.bitisTarihi);
    setSure(cikarilan?.miktar ?? VARSAYILAN_SURE);
    setSureBirimi(cikarilan?.birim ?? VARSAYILAN_SURE_BIRIMI);
  }

  /**
   * Başlangıç tarihi değişince bitiş tarihini bir yıl sonrasına taşır. Poliçelerin
   * ezici çoğunluğu yıllıktır; kullanıcı iki tarihi de elle girmek zorunda kalmaz,
   * farklı süreli bir poliçede bitişi yine de değiştirebilir.
   */
  /**
   * Bitiş tarihi başlangıç + süreden hesaplanır.
   *
   * Süre poliçe kaydında saklanmaz; iki tarihten her zaman geri çıkarılabildiği için
   * veri modeline yeni bir alan eklemeye gerek yok (bkz. `sureyiCikar`).
   */
  const baslangicDegisti = (yeniBaslangic: string) =>
    setEditing((prev) => {
      if (!prev) return prev;
      const hesaplanan = tarihEkle(yeniBaslangic, sure, sureBirimi);
      return {
        ...prev,
        baslangicTarihi: yeniBaslangic,
        bitisTarihi: hesaplanan || prev.bitisTarihi,
      };
    });

  const sureDegisti = (yeniMiktar: number, yeniBirim: SureBirimi) => {
    // Alan boşaltılırken `Number('')` 0 verir; 0 gün bir poliçe olmadığı için
    // en az 1'e çekilir, aksi hâlde bitiş başlangıca eşitlenip "bugün bitti" derdi.
    const miktar = Number.isFinite(yeniMiktar) && yeniMiktar > 0 ? Math.floor(yeniMiktar) : 1;
    setSure(miktar);
    setSureBirimi(yeniBirim);

    setEditing((prev) => {
      if (!prev) return prev;
      const hesaplanan = tarihEkle(prev.baslangicTarihi, miktar, yeniBirim);
      return hesaplanan ? { ...prev, bitisTarihi: hesaplanan } : prev;
    });
  };

  /**
   * Bitiş elle değiştirildiğinde süre alanı geri hesaplanır.
   *
   * Yoksa ekran yalan söylerdi: tarihler altı ay gösterirken "Süre" kutusunda
   * 1 yıl yazılı kalırdı ve sonraki küçük bir değişiklik bitişi sessizce bir yıl
   * ileri fırlatırdı.
   */
  const bitisDegisti = (yeniBitis: string) => {
    setEditing((prev) => (prev ? { ...prev, bitisTarihi: yeniBitis } : prev));

    const cikarilan = editing ? sureyiCikar(editing.baslangicTarihi, yeniBitis) : null;
    if (cikarilan) {
      setSure(cikarilan.miktar);
      setSureBirimi(cikarilan.birim);
    }
  };

  /** Brüt prim ve orandan hesaplanan komisyon; alanın altında anında gösterilir. */
  const komisyonTutari = useMemo(
    () => (editing ? komisyonHesapla(editing.brutPrim, editing.komisyonOrani) : undefined),
    [editing],
  );

  /** Biten bir poliçeden yenileme taslağı açar. */
  const yenilemeBaslat = (p: Policy) => {
    formuAc(yenilemeTaslagi(p));
    setFormError('');
  };

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc((v) => !v);
    else { setSortKey(key); setSortAsc(true); }
  };

  const yaklasan30 = filtreSayilari['30'] || 0;
  const kritik7 = filtreSayilari['7'] || 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">Poliçe Takibi</h1>
          <p className="text-xs text-slate-500 mt-1">
            Tüm poliçeler tek tabloda. Bitiş tarihine göre filtreleyin, müşteriye WhatsApp’tan hatırlatma gönderin.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={exportCsv} className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs inline-flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4" /> CSV
          </button>
          <button
            onClick={() => formuAc(bosPolice(musteriFiltre))}
            disabled={customers.length === 0}
            className="px-4 py-2.5 rounded-xl bg-blue-900 hover:bg-blue-800 disabled:opacity-50 text-white font-bold text-xs inline-flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Yeni Poliçe
          </button>
        </div>
      </div>

      {customers.length === 0 && !loading && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-semibold inline-flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" />
          Poliçe ekleyebilmek için önce en az bir müşteri kaydı oluşturmalısınız.
        </div>
      )}

      {msg && (
        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold inline-flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" /> {msg}
        </div>
      )}

      {/* Özet */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { l: 'Toplam Poliçe', v: policies.length, c: 'text-slate-900' },
          { l: '30 Gün İçinde Bitecek', v: yaklasan30, c: 'text-amber-700' },
          { l: '7 Gün İçinde Bitecek', v: kritik7, c: 'text-rose-700' },
          { l: 'Son 30 Günde Bitmiş', v: filtreSayilari['gecmis30'] || 0, c: 'text-slate-600' },
        ].map((k) => (
          <div key={k.l} className="bg-white rounded-xl p-4 border border-slate-200">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{k.l}</div>
            <div className={`text-2xl font-extrabold mt-1 ${k.c}`}>{k.v}</div>
          </div>
        ))}
      </div>

      {/* Hızlı filtreler */}
      <div className="bg-white rounded-xl p-4 border border-slate-200 space-y-3">
        <div className="flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
          <CalendarClock className="w-3.5 h-3.5" /> Bitişe Kalan Süre
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setAktifFiltre(null)}
            className={`px-3 py-2 rounded-lg text-xs font-bold ${
              aktifFiltre === null ? 'bg-blue-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Tümü <span className="opacity-70">({policies.length})</span>
          </button>
          {EXPIRY_FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setAktifFiltre(aktifFiltre === f.key ? null : f.key)}
              className={`px-3 py-2 rounded-lg text-xs font-bold ${
                aktifFiltre === f.key ? 'bg-blue-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {f.label} <span className="opacity-70">({filtreSayilari[f.key] || 0})</span>
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-100">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              ref={aramaRef}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Poliçe no, müşteri, şirket, branş veya plaka…   ( / )"
              className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-slate-300 text-xs"
            />
          </div>

          <select value={durumFiltre} onChange={(e) => setDurumFiltre(e.target.value as typeof durumFiltre)} className="px-3 py-2.5 rounded-lg border border-slate-300 text-xs font-semibold">
            <option value="tumu">Tüm durumlar</option>
            <option value="Aktif">Aktif</option>
            <option value="Yenilendi">Yenilendi</option>
            <option value="İptal">İptal</option>
            <option value="Süresi Doldu">Süresi Doldu</option>
          </select>

          {/* Filtre de aynı sorundan muzdaripti: portföy büyüdükçe doğru müşteriyi
              kaydırarak bulmak imkânsızlaşıyor. Aynı bileşen kullanılır ki iki
              yerde farklı arama davranışı öğrenmek gerekmesin. */}
          <MusteriSecici
            musteriler={customers}
            deger={musteriFiltre}
            onDegisim={setMusteriFiltre}
            alanId="police-musteri-filtresi"
            erisimEtiketi="Müşteriye göre filtrele"
            placeholder="Tüm müşteriler"
            temizlenebilir
            className="w-full sm:w-[240px]"
          />

          {(aktifFiltre || search || durumFiltre !== 'tumu' || musteriFiltre) && (
            <button
              onClick={() => { setAktifFiltre(null); setSearch(''); setDurumFiltre('tumu'); setMusteriFiltre(''); }}
              className="px-3 py-2.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs inline-flex items-center gap-1.5"
            >
              <Filter className="w-3.5 h-3.5" /> Filtreleri temizle
            </button>
          )}
        </div>
      </div>

      {/* Tablo */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-xs text-slate-500">Yükleniyor…</div>
        ) : gorunen.length === 0 ? (
          <div className="p-10 text-center">
            <CalendarClock className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <div className="text-sm font-bold text-slate-700">
              {policies.length === 0 ? 'Henüz poliçe kaydı yok' : 'Seçilen filtrelere uyan poliçe yok'}
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              {/* Sıralama düğmelerindeki `py-3 -my-3`: düğme yalnızca 10 piksellik
                  başlık metnini sarmaladığı için tıklanabilir alan 13 piksel yüksekliğinde
                  kalıyordu; hücrenin geri kalanı ölü alandı ve başlığa basan kullanıcının
                  tıklaması çoğu zaman boşa gidiyordu. Dolgu hücre yüksekliğine yayar,
                  negatif kenar boşluğu da bu büyümeyi geri alarak yerleşimi aynı bırakır. */}
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr className="text-left text-[10px] uppercase tracking-wider text-slate-500">
                  <th className="px-4 py-3">
                    <button onClick={() => toggleSort('musteri')} className="inline-flex items-center gap-1 py-3 -my-3 hover:text-slate-800">
                      Müşteri <ArrowUpDown className="w-3 h-3" />
                    </button>
                  </th>
                  <th className="px-4 py-3">Poliçe</th>
                  <th className="px-4 py-3">
                    <button onClick={() => toggleSort('baslangic')} className="inline-flex items-center gap-1 py-3 -my-3 hover:text-slate-800">
                      Başlangıç <ArrowUpDown className="w-3 h-3" />
                    </button>
                  </th>
                  <th className="px-4 py-3">
                    <button onClick={() => toggleSort('bitis')} className="inline-flex items-center gap-1 py-3 -my-3 hover:text-slate-800">
                      Bitiş <ArrowUpDown className="w-3 h-3" />
                    </button>
                  </th>
                  <th className="px-4 py-3">Kalan</th>
                  <th className="px-4 py-3">
                    <button onClick={() => toggleSort('prim')} className="inline-flex items-center gap-1 py-3 -my-3 hover:text-slate-800">
                      Brüt Prim <ArrowUpDown className="w-3 h-3" />
                    </button>
                  </th>
                  <th className="px-4 py-3">Durum</th>
                  <th className="px-4 py-3 text-right">İşlem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {gorunen.map((p) => {
                  const c = musteriMap.get(p.musteriId);
                  const kalan = kalanGun(p.bitisTarihi, simdi);
                  const seviye = aciliyet(kalan);
                  const waHazir = Boolean(toWhatsAppNumber(c?.mobilTelefon));

                  return (
                    <tr key={p.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <div className="font-bold text-slate-900">{c ? musteriAdi(c) : '— (müşteri silinmiş)'}</div>
                        {p.sigortaliAdi && (
                          <div className="text-[10px] text-slate-500">Sigortalı: {p.sigortaliAdi}</div>
                        )}
                        {c?.mobilTelefon && <div className="text-[10px] text-slate-400">{c.mobilTelefon}</div>}
                      </td>
                      <td className="px-4 py-3">
                        {/* Branş renkli etiketle gösterilir: onlarca satır arasında
                            "Kasko" ile "Konut" düz metinken gözle ayırt edilemiyordu.
                            Renk tek başına bilgi taşımaz — branş adı etiketin içinde
                            yazılı (WCAG 1.4.1). Tam ad `title` ile korunur. */}
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span
                            className={`px-2 py-0.5 rounded border text-[10px] font-bold ${bransRengi(p.sigortaTuru)}`}
                            title={p.sigortaTuru}
                          >
                            {bransKisaAd(p.sigortaTuru)}
                          </span>
                          <span className="font-mono text-[11px] text-slate-700">{p.policeNo}</span>
                          {/* Poliçe numarası sigorta şirketinin kendi ekranına elle
                              yazılıyordu; tek hane hata sorgunun boş dönmesine yol
                              açıyor. Numara yoksa düğme hiç çizilmez. */}
                          {p.policeNo && <KopyaDugmesi deger={p.policeNo} etiket="Poliçe No" />}
                        </div>
                        <div className="text-[10px] text-slate-500 mt-0.5">{p.sigortaSirketi}</div>
                        {/* Plaka ayrı yazılıp kendi kopyalama düğmesini taşır;
                            müşteri kartındaki poliçe satırıyla aynı düzen. Şirket
                            ekranlarına ve TRAMER sorgusuna elle giriliyor. */}
                        {(() => {
                          const plaka = plakayiBul(p.bransAlanlari);
                          const kalan = riskTanimiPlakasiz(p.riskTanimi, plaka);
                          if (!plaka && !kalan) return null;
                          return (
                            <div className="text-[10px] text-slate-400 flex items-center gap-1 flex-wrap">
                              {plaka && (
                                <span className="inline-flex items-center gap-0.5">
                                  <span className="font-mono text-slate-600">{plaka}</span>
                                  <KopyaDugmesi deger={plaka} etiket="Plaka" />
                                </span>
                              )}
                              {kalan && <span>{plaka ? `· ${kalan}` : kalan}</span>}
                            </div>
                          );
                        })()}
                      </td>
                      <td className="px-4 py-3 text-slate-600">{formatTarih(p.baslangicTarihi)}</td>
                      <td className="px-4 py-3 font-semibold text-slate-800">{formatTarih(p.bitisTarihi)}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded font-bold ${ACILIYET_STIL[seviye]}`}>
                          {kalan === null ? '—' : kalan < 0 ? `${Math.abs(kalan)} gün önce bitti` : kalan === 0 ? 'Bugün' : `${kalan} gün`}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {p.brutPrim ? `${formatTutar(p.brutPrim)} ${p.paraBirimi || 'TL'}` : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-bold">{p.durum}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          {/* Müşteri bilgisine bakmak için müşteriler sayfasına gidip
                              aramak gerekiyordu; poliçeyi ararken telefon veya adres
                              lazım olduğunda akış kopuyordu. Kaydı silinmiş poliçede
                              (müşteri bulunamıyor) düğme devre dışı kalır. */}
                          <button
                            onClick={() => c && router.push(`/admin/musteriler/${c.id}`)}
                            disabled={!c}
                            aria-label={c ? `${musteriAdi(c)} müşteri bilgilerine göz at` : 'Müşteri kaydı bulunamadı'}
                            title={c ? 'Müşteri bilgilerine göz at' : 'Müşteri kaydı bulunamadı'}
                            className="p-1.5 rounded-lg hover:bg-blue-100 text-blue-700 disabled:opacity-30 disabled:hover:bg-transparent"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => yenilemeBaslat(p)}
                            aria-label={`${p.policeNo} numaralı poliçeyi yenile`}
                            title="Bu poliçeyi yenile — bilgiler taşınır, tarihler bir yıl ileri alınır"
                            className="p-1.5 rounded-lg hover:bg-blue-100 text-blue-700"
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => { setWaPolicy(p); setWaSablon(VARSAYILAN_HATIRLATMA_METNI); }}
                            disabled={!waHazir}
                            aria-label={waHazir ? `${p.policeNo} için WhatsApp hatırlatması gönder` : 'Müşterinin geçerli bir cep numarası yok'}
                            title={waHazir ? 'WhatsApp ile hatırlatma gönder' : 'Müşterinin geçerli bir cep numarası yok'}
                            className="p-1.5 rounded-lg hover:bg-emerald-100 text-emerald-700 disabled:opacity-30 disabled:hover:bg-transparent"
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => formuAc(p)} aria-label={`${p.policeNo} numaralı poliçeyi düzenle`} title="Düzenle" className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-600">
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => handleDelete(p)} aria-label={`${p.policeNo} numaralı poliçeyi sil`} title="Sil" className="p-1.5 rounded-lg hover:bg-rose-100 text-rose-600">
                            <Trash2 className="w-3.5 h-3.5" />
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

      {waPolicy && (
        <WhatsAppReminderModal
          musteri={musteriMap.get(waPolicy.musteriId)}
          sablon={waSablon}
          onSablonChange={setWaSablon}
          mesaj={waMesaj}
          link={waLink}
          onClose={() => setWaPolicy(null)}
        />
      )}

      {/* Poliçe formu */}
      {editing && (
        <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-start justify-center p-4 overflow-y-auto">
          <form
            ref={policeFormRef}
            {...policeDialogOzellikleri}
            onSubmit={handleSave}
            className="bg-white rounded-2xl w-full max-w-3xl my-8 shadow-2xl"
          >
            <div className="flex items-center justify-between p-5 border-b border-slate-200 sticky top-0 bg-white rounded-t-2xl">
              <h2 id={policeBaslikId} className="font-extrabold text-slate-900">
                {editing.id ? 'Poliçeyi Düzenle' : 'Yeni Poliçe'}
              </h2>
              <button type="button" onClick={formuKapat} aria-label="Formu kapat" className="p-1.5 rounded-lg hover:bg-slate-100">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-5">
              {formError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold">
                  {formError}
                </div>
              )}

              {editing.yenilemeMi && editing.oncekiPoliceNo && !editing.id && (
                <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 text-[11px] font-semibold inline-flex items-center gap-2">
                  <RefreshCw className="w-4 h-4" />
                  {editing.oncekiPoliceNo} numaralı poliçenin yenilemesi. Yalnız yeni poliçe numarasını yazmanız yeterli.
                </div>
              )}

              {/* Zorunlu alanlar: bir poliçeyi takip edebilmek için gereken en az bilgi. */}
              <FieldRow>
                <Field label="Müşteri (Sigorta Ettiren)" required ch={34} tur="select" alanId="police-musteri">
                  <MusteriSecici
                    musteriler={customers}
                    deger={editing.musteriId}
                    onDegisim={(musteriId) => updateField({ musteriId })}
                    alanId="police-musteri"
                    // Aranan kişi bulunamadığında akış burada kesiliyordu; artık
                    // aynı yerden eklenip poliçeye devam ediliyor.
                    onYeniMusteri={(sorgu) => setHizliMusteri({ ad: sorgu })}
                  />
                </Field>
                <Field label="Poliçe No" required ch={18}>
                  <input
                    autoFocus={Boolean(editing.yenilemeMi && !editing.id)}
                    value={editing.policeNo}
                    onChange={(e) => updateField({ policeNo: e.target.value })}
                    className={inputCls}
                  />
                </Field>
              </FieldRow>

              {/* Müşteri kayıtlı değilse: seçicinin boş sonucundan ya da bu
                  düğmeden açılır, kaydedince yeni müşteri seçili hâle gelir ve
                  poliçe girişi kaldığı yerden sürer. */}
              {hizliMusteri ? (
                <HizliMusteriFormu
                  baslangicAdi={hizliMusteri.ad}
                  kaydetEtiketi="Ekle ve Poliçeye Devam Et"
                  onIptal={() => setHizliMusteri(null)}
                  onEklendi={(musteri, liste) => {
                    setCustomers(liste);
                    updateField({ musteriId: musteri.id });
                    setHizliMusteri(null);
                    setMsg(eklendiMesaji(musteri));
                    setTimeout(() => setMsg(''), 4000);
                  }}
                />
              ) : (
                !editing.musteriId && (
                  <button
                    type="button"
                    onClick={() => setHizliMusteri({ ad: '' })}
                    className="text-[11px] font-bold text-blue-800 hover:text-blue-950 inline-flex items-center gap-1.5"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    Müşteri kayıtlı değil mi? Hızlıca ekleyin
                  </button>
                )
              )}

              {/* Şirket ve branş aynı satırda. Branş alanı en uzun seçeneğe
                  ("İhtiyari Mali Mesuliyet (İMM) Sigortası") göre ölçülür; şirket
                  alanı satırda kalanı alır. */}
              <FieldRow>
                <Field label="Sigorta Şirketi" required genisle hint="Daha önce girdikleriniz önerilir">
                  <input
                    list="sirket-listesi" value={editing.sigortaSirketi}
                    onChange={(e) => updateField({ sigortaSirketi: e.target.value })} className={inputCls}
                  />
                  <datalist id="sirket-listesi">
                    {sirketOnerileri.map((s) => <option key={s} value={s} />)}
                  </datalist>
                </Field>
                <Field label="Sigorta Türü (Branş)" required ch={EN_UZUN_BRANS.length}>
                  <input
                    list="brans-listesi" value={editing.sigortaTuru}
                    onChange={(e) => updateField({ sigortaTuru: e.target.value })} className={inputCls}
                  />
                  <datalist id="brans-listesi">
                    {bransOnerileri.map((b) => <option key={b} value={b} />)}
                  </datalist>
                </Field>
              </FieldRow>

              {/* Tarih satırı: başlangıç → süre → bitiş. Bitiş ilk ikisinden
                  hesaplanır ama elle de yazılabilir. */}
              <FieldRow sutun={3}>
                <Field label="Başlangıç Tarihi" required tur="date" hint="Bitiş süreye göre dolar">
                  <input
                    type="date" value={editing.baslangicTarihi}
                    onChange={(e) => baslangicDegisti(e.target.value)}
                    className={inputCls}
                  />
                </Field>

                {/* Süre ve birimi tek bir alan sayılır; ikisi birlikte sütunu doldurur.
                    Sayı kutusu esner, birim kutusu sabit kalır — "Gün"/"Yıl" kısa.

                    GENİŞLİK SARMALAYICI `div`LERDE: `inputCls` içinde `w-full` var
                    ve sınıf listesine `w-24` eklemek işe YARAMIYOR — Tailwind'de
                    hangi genişliğin kazandığını sınıf sırası değil üretilen CSS
                    sırası belirler. Bu yüzden birim kutusu 232 piksele çıkıp
                    Bitiş Tarihi alanının 16 piksel üstüne biniyor, sayı kutusu da
                    26 piksele eziliyordu. */}
                <Field label="Süre" alanId="police-sure" hint="Bitiş tarihini belirler">
                  <div className="flex items-center gap-1.5">
                    <div className="flex-1 min-w-0">
                      <input
                        id="police-sure"
                        type="number"
                        min={1}
                        value={sure}
                        onChange={(e) => sureDegisti(Number(e.target.value), sureBirimi)}
                        className={inputCls}
                      />
                    </div>
                    <div className="w-20 shrink-0">
                      <select
                        aria-label="Süre birimi"
                        value={sureBirimi}
                        onChange={(e) => sureDegisti(sure, e.target.value as SureBirimi)}
                        className={inputCls}
                      >
                        <option value="gun">Gün</option>
                        <option value="yil">Yıl</option>
                      </select>
                    </div>
                  </div>
                </Field>

                <Field label="Bitiş Tarihi" required tur="date" hint={bitisIpucu(editing, simdi)}>
                  <input
                    type="date" value={editing.bitisTarihi}
                    onChange={(e) => bitisDegisti(e.target.value)}
                    className={inputCls}
                  />
                </Field>
              </FieldRow>

              <Field
                label="Risk / Varlık Tanımı"
                hint="Örn. “34 ABC 123 · Renault Clio” veya “Kepez, 120 m² mesken”. Poliçe anındaki bilgi olarak saklanır; müşteri kartı sonradan değişse bile burası değişmez."
              >
                <input value={editing.riskTanimi || ''} onChange={(e) => updateField({ riskTanimi: e.target.value })} className={inputCls} />
              </Field>

              {/* Notlar risk tanımının hemen altında: ikisi de serbest metin ve
                  poliçenin "hikâyesini" yazan alanlar. Önceden katlanmış "Poliçe
                  Detayları" bölümünün en dibindeydi, bu yüzden pratikte hiç
                  kullanılmıyordu. */}
              <Field label="Notlar">
                <textarea value={editing.notlar || ''} onChange={(e) => updateField({ notlar: e.target.value })} rows={2} className={inputCls} />
              </Field>

              <Section title="Prim & Tahsilat" summary={ozetPrim(editing)}>
                {/* İki üçlü satır: önce tutarlar, sonra tahsilat. Alanlara `ch`
                    verilmez — sabit genişlik ızgara hücresini doldurmayı engeller. */}
                <FieldRow sutun={3}>
                  <Field label="Brüt Prim">
                    <input type="number" step="0.01" min={0} value={editing.brutPrim ?? ''} onChange={(e) => updateField({ brutPrim: e.target.value === '' ? undefined : Number(e.target.value) })} className={inputCls} />
                  </Field>
                  <Field label="Net Prim">
                    <input type="number" step="0.01" min={0} value={editing.netPrim ?? ''} onChange={(e) => updateField({ netPrim: e.target.value === '' ? undefined : Number(e.target.value) })} className={inputCls} />
                  </Field>
                  <Field
                    label="Komisyon Oranı (%)"
                    hint={
                      komisyonTutari === undefined
                        ? 'Prim ve oran girilince hesaplanır'
                        : `Komisyon: ${formatTutar(komisyonTutari)} ${editing.paraBirimi || 'TL'}`
                    }
                  >
                    <input type="number" step="0.01" min={0} max={100} value={editing.komisyonOrani ?? ''} onChange={(e) => updateField({ komisyonOrani: e.target.value === '' ? undefined : Number(e.target.value) })} className={inputCls} />
                  </Field>
                </FieldRow>

                <FieldRow sutun={3}>
                  <Field label="Ödeme Şekli" tur="select">
                    <select value={editing.odemeSekli || ''} onChange={(e) => updateField({ odemeSekli: e.target.value })} className={inputCls}>
                      <option value="">Seçiniz</option>
                      <option>Peşin</option><option>Kredi Kartı</option><option>Havale</option>
                    </select>
                  </Field>
                  <Field label="Taksit Sayısı">
                    <input type="number" min={0} max={60} value={editing.taksitSayisi ?? ''} onChange={(e) => updateField({ taksitSayisi: e.target.value === '' ? undefined : Number(e.target.value) })} className={inputCls} />
                  </Field>
                  <Field label="Tahsilat Durumu" tur="select">
                    <select value={editing.tahsilatDurumu || ''} onChange={(e) => updateField({ tahsilatDurumu: e.target.value })} className={inputCls}>
                      <option value="">Seçiniz</option>
                      <option>Tahsil Edildi</option>
                      <option>Kısmi Tahsilat</option>
                      <option>Bekliyor</option>
                    </select>
                  </Field>
                </FieldRow>
              </Section>

              <Section title="Poliçe Detayları & Yenileme" summary={ozetDetay(editing)}>
                {/* Alanlar KAYNAĞINA göre gruplandı; personel poliçeyi elindeki
                    belgeden girerken gözü satırlar arasında zıplamasın diye:
                    1. satır — kim: sigortalı, takip eden personel, poliçenin durumu
                    2. satır — belgeden okunanlar: düzenleme tarihi ve numaralar
                    Yenileme kutusu en sonda; ona bağlı alan yalnızca işaretlenince
                    çıkar ve boşuna yer kaplamaz. */}
                <FieldRow sutun={3}>
                  <Field label="Sigortalı" hint="Sigorta ettirenden farklıysa yazın">
                    <input value={editing.sigortaliAdi || ''} onChange={(e) => updateField({ sigortaliAdi: e.target.value })} className={inputCls} />
                  </Field>
                  <Field label="Sorumlu Personel">
                    <input value={editing.sorumluPersonel || ''} onChange={(e) => updateField({ sorumluPersonel: e.target.value })} className={inputCls} />
                  </Field>
                  <Field label="Durum" tur="select">
                    <select value={editing.durum} onChange={(e) => updateField({ durum: e.target.value as PolicyStatus })} className={inputCls}>
                      <option>Aktif</option><option>Yenilendi</option><option>İptal</option><option>Süresi Doldu</option>
                    </select>
                  </Field>
                </FieldRow>

                <FieldRow sutun={3}>
                  <Field label="Düzenleme Tarihi" tur="date">
                    <input type="date" value={editing.duzenlemeTarihi || ''} onChange={(e) => updateField({ duzenlemeTarihi: e.target.value })} className={inputCls} />
                  </Field>
                  <Field label="Yenileme (Tecdit) No">
                    <input value={editing.yenilemeNo || ''} onChange={(e) => updateField({ yenilemeNo: e.target.value })} className={inputCls} />
                  </Field>
                  <Field label="Zeyil No">
                    <input value={editing.zeyilNo || ''} onChange={(e) => updateField({ zeyilNo: e.target.value })} className={inputCls} />
                  </Field>
                </FieldRow>

                <div className="space-y-3 border-t border-slate-100 pt-3">
                  <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700">
                    <input type="checkbox" checked={editing.yenilemeMi} onChange={(e) => updateField({ yenilemeMi: e.target.checked })} />
                    Bu poliçe bir yenilemedir
                  </label>
                  {editing.yenilemeMi && (
                    <FieldRow sutun={3}>
                      <Field label="Önceki Poliçe No">
                        <input value={editing.oncekiPoliceNo || ''} onChange={(e) => updateField({ oncekiPoliceNo: e.target.value })} className={inputCls} />
                      </Field>
                    </FieldRow>
                  )}
                </div>

              </Section>
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
              <button type="submit" disabled={saving} className="px-5 py-2.5 rounded-xl bg-blue-900 hover:bg-blue-800 disabled:opacity-60 text-white font-bold text-xs inline-flex items-center gap-2">
                <Save className="w-4 h-4" /> {saving ? 'Kaydediliyor…' : 'Kaydet'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

/** Bitiş tarihi alanının altındaki canlı geri bildirim. */
function bitisIpucu(p: Policy, simdi: Date): string {
  const kalan = kalanGun(p.bitisTarihi, simdi);
  if (kalan === null) return 'Takip bu tarihe göre yapılır';
  if (kalan < 0) return `${Math.abs(kalan)} gün önce bitmiş`;
  if (kalan === 0) return 'Bugün bitiyor';
  return `${kalan} gün kaldı`;
}

/** Katlı bölüm başlıklarındaki özetler. */
function ozetPrim(p: Policy): string {
  if (typeof p.brutPrim === 'number') return `${formatTutar(p.brutPrim)} ${p.paraBirimi || 'TL'}`;
  return 'girilmedi';
}

function ozetDetay(p: Policy): string {
  if (p.yenilemeMi) return 'yenileme';
  return p.durum;
}

export default function PolicyTrackingPage() {
  return (
    <Suspense fallback={<div className="text-xs font-bold text-slate-500">Yükleniyor...</div>}>
      <PoliceTakibiIcerik />
    </Suspense>
  );
}
