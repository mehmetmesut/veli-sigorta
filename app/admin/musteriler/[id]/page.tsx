'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  ArrowLeft, CheckCircle2, Edit, FileText, Plus, ShieldCheck, History, X, Save,
} from 'lucide-react';
import type { Customer, InsuranceService, Policy, QuoteRequest } from '@/lib/types';
import { formatTarih, formatTutar, kalanGun, musteriAdi, plakayiBul, riskTanimiPlakasiz } from '@/lib/police';
import { bransKisaAd, bransRengi } from '@/lib/brans-renk';
import { Bolum, MusteriBasligi, MusteriBilgiBloklari } from '@/components/admin/musteri-bilgi';
import { KopyaDugmesi } from '@/components/admin/KopyaDugmesi';
import { Field, FieldRow, inputCls } from '@/components/admin/form-ui';
import { useModalErisilebilirlik } from '@/components/admin/useModalErisilebilirlik';
import { TeklifPolicelestir, type PolicelestirVerisi } from '@/components/admin/TeklifPolicelestir';
import { birYilSonrasi } from '@/lib/form-helpers';

/**
 * Müşteri detay sayfası.
 *
 * Bilgiler eskiden pencerede (modal) açılıyordu; pencere hem dar hem de "yanına
 * başka bir şey açamazsın" demek. Poliçe geçmişi büyüdükçe ve müşteri üzerinden
 * iş yapılmaya (yeni poliçe, teklif) başlandıkça ayrı sayfa gerekli oldu:
 * adres çubuğunda paylaşılabilir, geri tuşu çalışır, ekranın tamamını kullanır.
 *
 * Poliçeler İKİ GRUPTA gösterilir. Personelin günlük sorusu "bu müşterinin şu an
 * neyi var?" — geçmiş poliçeler o cevabı gürültüye boğuyordu.
 */

/** Aktif sayılan poliçe durumları. Diğer her şey tarihçeye düşer. */
function aktifMi(p: Policy, simdi: Date): boolean {
  if (p.durum !== 'Aktif') return false;
  const kalan = kalanGun(p.bitisTarihi, simdi);
  return kalan === null || kalan >= 0;
}

function PoliceSatiri({ p }: { p: Policy }) {
  const plaka = plakayiBul(p.bransAlanlari);
  const kalanTanim = riskTanimiPlakasiz(p.riskTanimi, plaka);

  return (
    <div className="p-3 rounded-xl bg-white border border-slate-200 text-xs">
      <div className="flex items-center gap-2 flex-wrap">
        <span
          className={`px-2 py-0.5 rounded border text-[10px] font-bold ${bransRengi(p.sigortaTuru)}`}
          title={p.sigortaTuru}
        >
          {bransKisaAd(p.sigortaTuru)}
        </span>
        {p.policeNo ? (
          <span className="inline-flex items-center gap-1">
            <span className="font-mono text-slate-700">{p.policeNo}</span>
            <KopyaDugmesi deger={p.policeNo} etiket="Poliçe No" />
          </span>
        ) : (
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 font-bold">
            Poliçe no girilmedi
          </span>
        )}
        <span className="ml-auto text-[10px] px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-bold">
          {p.durum}
        </span>
      </div>
      <div className="text-slate-500 mt-1.5">
        {p.sigortaSirketi} · {formatTarih(p.baslangicTarihi)} → {formatTarih(p.bitisTarihi)}
        {typeof p.brutPrim === 'number' && ` · ${formatTutar(p.brutPrim)} ${p.paraBirimi || 'TL'}`}
      </div>
      {(plaka || kalanTanim) && (
        <div className="text-slate-400 mt-0.5 flex items-center gap-1 flex-wrap">
          {plaka && (
            <span className="inline-flex items-center gap-0.5">
              {/* Plaka sigorta şirketi ekranlarına ve TRAMER sorgusuna elle
                  yazılıyor; tek harf hatası sorguyu boş döndürüyor. */}
              <span className="font-mono text-slate-600">{plaka}</span>
              <KopyaDugmesi deger={plaka} etiket="Plaka" />
            </span>
          )}
          {kalanTanim && <span>{plaka ? `· ${kalanTanim}` : kalanTanim}</span>}
        </div>
      )}
    </div>
  );
}

export default function CustomerDetailPage() {
  const params = useParams<{ id: string }>();
  const musteriId = params?.id ?? '';

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [quotes, setQuotes] = useState<QuoteRequest[]>([]);
  const [services, setServices] = useState<InsuranceService[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');
  const [hata, setHata] = useState('');

  /** Açık olan pencere: teklif verme ya da teklifi poliçeye çevirme. */
  const [teklifFormu, setTeklifFormu] = useState<{ serviceName: string; notes: string } | null>(null);
  const [policelestirilen, setPolicelestirilen] = useState<QuoteRequest | null>(null);
  const [saving, setSaving] = useState(false);

  /** "Şu an" bir kez hesaplanır; render sırasında değişirse sıralama oynardı. */
  const [simdi] = useState(() => new Date());

  const verileriYukle = async () => {
    const res = await fetch('/api/admin/content?fields=customers,policies,quotes,services');
    if (!res.ok) return;
    const data = await res.json();
    setCustomers(data.customers || []);
    setPolicies(data.policies || []);
    setQuotes(data.quotes || []);
    setServices(data.services || []);
  };

  useEffect(() => {
    let mounted = true;
    fetch('/api/admin/content?fields=customers,policies,quotes,services')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (mounted && data) {
          setCustomers(data.customers || []);
          setPolicies(data.policies || []);
          setQuotes(data.quotes || []);
          setServices(data.services || []);
        }
        if (mounted) setLoading(false);
      });
    return () => { mounted = false; };
  }, []);

  const musteri = useMemo(
    () => customers.find((c) => c.id === musteriId) ?? null,
    [customers, musteriId],
  );

  const { aktifPoliceler, gecmisPoliceler } = useMemo(() => {
    const hepsi = policies
      .filter((p) => p.musteriId === musteriId)
      .sort((a, b) => Date.parse(b.bitisTarihi) - Date.parse(a.bitisTarihi));

    return {
      aktifPoliceler: hepsi.filter((p) => aktifMi(p, simdi)),
      gecmisPoliceler: hepsi.filter((p) => !aktifMi(p, simdi)),
    };
  }, [policies, musteriId, simdi]);

  /**
   * Bu müşterinin teklifleri. Eski kayıtlarda `musteriId` yok (site formundan
   * gelmişler); onlar telefon üzerinden de eşleştirilir ki geçmiş kaybolmasın.
   */
  const musteriTeklifleri = useMemo(() => {
    if (!musteri) return [];
    const telefon = (musteri.mobilTelefon || '').replace(/\D/g, '').slice(-10);
    return quotes.filter((q) => {
      if (q.musteriId) return q.musteriId === musteriId;
      return telefon.length === 10 && q.phone.replace(/\D/g, '').endsWith(telefon);
    });
  }, [quotes, musteri, musteriId]);

  const bransOnerileri = useMemo(() => {
    const gecmis = policies.map((p) => p.sigortaTuru).filter(Boolean);
    return [...new Set([...services.map((s) => s.title), ...gecmis])];
  }, [services, policies]);

  const sirketOnerileri = useMemo(
    () => [...new Set(policies.map((p) => p.sigortaSirketi).filter(Boolean))],
    [policies],
  );

  async function teklifKaydet(e: React.FormEvent) {
    e.preventDefault();
    if (!musteri || !teklifFormu) return;

    setSaving(true);
    setHata('');
    const res = await fetch('/api/admin/content?fields=quotes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        entity: 'quotes',
        action: 'save',
        data: {
          fullName: musteriAdi(musteri),
          phone: musteri.mobilTelefon || musteri.sabitTelefon || '',
          email: musteri.email || '',
          serviceName: teklifFormu.serviceName,
          cityDistrict: [musteri.il, musteri.ilce].filter(Boolean).join(' / '),
          notes: teklifFormu.notes,
          adminNotes: 'Müşteri kartından verildi',
          status: 'Yeni',
          timestamp: new Date().toISOString(),
          // Teklif doğrudan bu müşteriye bağlanır; poliçeye çevrilirken
          // sahibini telefondan tahmin etmek gerekmesin.
          musteriId: musteri.id,
          musteriOlustur: false,
        },
      }),
    });
    const govde = await res.json().catch(() => ({}));
    setSaving(false);

    if (!res.ok) {
      setHata(govde.error || 'Teklif kaydedilemedi.');
      return;
    }

    setQuotes(govde.quotes || []);
    setTeklifFormu(null);
    setMsg(`${teklifFormu.serviceName} teklifi kaydedildi.`);
    setTimeout(() => setMsg(''), 4000);
  }

  async function policelestir(veri: PolicelestirVerisi) {
    if (!policelestirilen) return;

    setSaving(true);
    setHata('');

    const res = await fetch('/api/admin/content?fields=quotes,policies', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        entity: 'quotes',
        action: 'policelestir',
        data: {
          quoteId: policelestirilen.id,
          ...veri,
        },
      }),
    });
    const govde = await res.json().catch(() => ({}));
    setSaving(false);

    if (!res.ok) {
      setHata(govde.error || 'Teklif poliçeye çevrilemedi.');
      return;
    }

    setQuotes(govde.quotes || []);
    setPolicies(govde.policies || []);
    setPolicelestirilen(null);
    setMsg('Teklif poliçeye çevrildi ve poliçe takibine eklendi.');
    setTimeout(() => setMsg(''), 5000);
  }

  if (loading) return <div className="text-xs font-bold text-slate-500">Yükleniyor…</div>;

  if (!musteri) {
    return (
      <div className="space-y-4">
        <Link href="/admin/musteriler" className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-800 hover:underline">
          <ArrowLeft className="w-4 h-4" /> Müşteri listesine dön
        </Link>
        <div className="p-6 rounded-2xl bg-white border border-slate-200 text-sm text-slate-600">
          Bu müşteri kaydı bulunamadı. Silinmiş ya da bağlantı yanlış olabilir.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <Link href="/admin/musteriler" className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-800 hover:underline">
        <ArrowLeft className="w-4 h-4" /> Müşteri listesine dön
      </Link>

      {msg && (
        <div role="status" aria-live="polite" className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold">
          {msg}
        </div>
      )}
      {hata && (
        <div role="alert" className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold">
          {hata}
        </div>
      )}

      {/* Üst bölüm: kim + bu müşteriyle yapılabilecek işler */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs">
        <div className="flex items-start justify-between gap-4 flex-wrap p-5 border-b border-slate-200">
          <MusteriBasligi musteri={musteri} />

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => setTeklifFormu({ serviceName: bransOnerileri[0] || '', notes: '' })}
              className="px-4 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs inline-flex items-center gap-2"
            >
              <FileText className="w-4 h-4" /> Teklif Ver
            </button>
            <Link
              href={`/admin/police-takibi?musteri=${musteri.id}&yeni=1`}
              className="px-4 py-2.5 rounded-xl bg-blue-900 hover:bg-blue-800 text-white font-bold text-xs inline-flex items-center gap-2"
            >
              <Plus className="w-4 h-4" /> Yeni Poliçe
            </Link>
            <Link
              href={`/admin/musteriler?duzenle=${musteri.id}`}
              className="px-3.5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs inline-flex items-center gap-2"
            >
              <Edit className="w-4 h-4" /> Düzenle
            </Link>
          </div>
        </div>

        <div className="p-5 space-y-5">
          <MusteriBilgiBloklari musteri={musteri} />
          <p className="text-[11px] text-slate-400">
            Oluşturma: {formatTarih(musteri.createdAt)} · Son güncelleme: {formatTarih(musteri.updatedAt)}
          </p>
        </div>
      </div>

      {/* Aktif poliçeler — personelin günlük olarak baktığı liste */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-5 space-y-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-600 inline-flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-700" />
            Aktif Poliçeler ({aktifPoliceler.length})
          </h3>
          <Link
            href={`/admin/police-takibi?musteri=${musteri.id}`}
            className="text-[11px] font-bold text-blue-800 hover:underline"
          >
            Poliçe takibinde aç
          </Link>
        </div>

        {aktifPoliceler.length === 0 ? (
          <p className="text-xs text-slate-500">Yürürlükte poliçe yok.</p>
        ) : (
          <div className="space-y-2">
            {aktifPoliceler.map((p) => <PoliceSatiri key={p.id} p={p} />)}
          </div>
        )}
      </div>

      {/* Geçmiş: biten, iptal edilen ve yenilenen poliçeler */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-5 space-y-3">
        <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-600 inline-flex items-center gap-2">
          <History className="w-4 h-4 text-slate-500" />
          Poliçe Tarihçesi ({gecmisPoliceler.length})
        </h3>

        {gecmisPoliceler.length === 0 ? (
          <p className="text-xs text-slate-500">Geçmiş poliçe kaydı yok.</p>
        ) : (
          <div className="space-y-2">
            {gecmisPoliceler.map((p) => <PoliceSatiri key={p.id} p={p} />)}
          </div>
        )}
      </div>

      {/* Teklifler: onaylanan teklif buradan poliçeye çevrilir */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-5 space-y-3">
        <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-600 inline-flex items-center gap-2">
          <FileText className="w-4 h-4 text-slate-500" />
          Teklifler ({musteriTeklifleri.length})
        </h3>

        {musteriTeklifleri.length === 0 ? (
          <p className="text-xs text-slate-500">Bu müşteriye verilmiş teklif yok.</p>
        ) : (
          <div className="space-y-2">
            {musteriTeklifleri.map((q) => (
              <div key={q.id} className="p-3 rounded-xl bg-white border border-slate-200 text-xs flex items-center gap-3 flex-wrap">
                <span
                  className={`px-2 py-0.5 rounded border text-[10px] font-bold ${bransRengi(q.serviceName)}`}
                  title={q.serviceName}
                >
                  {bransKisaAd(q.serviceName)}
                </span>
                <span className="text-slate-500">{formatTarih(q.timestamp)}</span>
                <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-bold text-[10px]">
                  {q.status}
                </span>
                {q.notes && <span className="text-slate-400 basis-full">{q.notes}</span>}

                {q.status !== 'Poliçeleştirildi' && q.status !== 'İptal Edildi' && (
                  <button
                    type="button"
                    onClick={() => setPolicelestirilen(q)}
                    className="ml-auto px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-[11px] inline-flex items-center gap-1.5"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" /> Onayla ve poliçeleştir
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {teklifFormu && musteri && (
        <TeklifVerPenceresi
          musteriAdiMetni={musteriAdi(musteri)}
          deger={teklifFormu}
          onDegisim={setTeklifFormu}
          bransOnerileri={bransOnerileri}
          onKapat={() => setTeklifFormu(null)}
          onGonder={teklifKaydet}
          kaydediliyor={saving}
        />
      )}

      {policelestirilen && (
        <TeklifPolicelestir
          teklif={policelestirilen}
          sirketOnerileri={sirketOnerileri}
          onKapat={() => setPolicelestirilen(null)}
          onOnay={policelestir}
          kaydediliyor={saving}
        />
      )}
    </div>
  );
}

/** Müşteriye teklif verme penceresi. Kimlik bilgileri müşteri kartından gelir. */
function TeklifVerPenceresi({
  musteriAdiMetni, deger, onDegisim, bransOnerileri, onKapat, onGonder, kaydediliyor,
}: {
  musteriAdiMetni: string;
  deger: { serviceName: string; notes: string };
  onDegisim: (v: { serviceName: string; notes: string }) => void;
  bransOnerileri: string[];
  onKapat: () => void;
  onGonder: (e: React.FormEvent) => void;
  kaydediliyor: boolean;
}) {
  const { ref, dialogOzellikleri, baslikId } = useModalErisilebilirlik<HTMLFormElement>(true);

  return (
    <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-start justify-center p-4 overflow-y-auto">
      <form ref={ref} {...dialogOzellikleri} onSubmit={onGonder} className="bg-white rounded-2xl w-full max-w-lg my-8 shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-slate-200">
          <h2 id={baslikId} className="font-extrabold text-slate-900">Teklif Ver — {musteriAdiMetni}</h2>
          <button type="button" onClick={onKapat} aria-label="Pencereyi kapat" className="p-1.5 rounded-lg hover:bg-slate-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <Field label="Sigorta Türü (Branş)" required>
            <input
              required
              list="teklif-brans-listesi"
              value={deger.serviceName}
              onChange={(e) => onDegisim({ ...deger, serviceName: e.target.value })}
              className={inputCls}
            />
            <datalist id="teklif-brans-listesi">
              {bransOnerileri.map((b) => <option key={b} value={b} />)}
            </datalist>
          </Field>

          <Field label="Not" hint="Teklifin kapsamı, konuşulanlar…">
            <textarea
              value={deger.notes}
              onChange={(e) => onDegisim({ ...deger, notes: e.target.value })}
              rows={3}
              className={inputCls}
            />
          </Field>
        </div>

        <div className="p-5 border-t border-slate-200 flex items-center justify-end gap-2">
          <button type="button" onClick={onKapat} className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs">
            Vazgeç
          </button>
          <button type="submit" disabled={kaydediliyor} className="px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 disabled:opacity-60 text-white font-bold text-xs inline-flex items-center gap-2">
            <Save className="w-4 h-4" /> {kaydediliyor ? 'Kaydediliyor…' : 'Teklifi Kaydet'}
          </button>
        </div>
      </form>
    </div>
  );
}

