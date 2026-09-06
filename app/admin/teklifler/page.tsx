'use client';

import React, { useEffect, useState } from 'react';
import {
  Search,
  Filter,
  Plus,
  Phone,
  MessageCircle,
  CheckCircle2,
  Clock,
  XCircle,
  FileSpreadsheet,
  Edit,
  Trash2,
  X,
  Save,
  UserCheck,
  Building2,
  Calendar,
} from 'lucide-react';
import { QuoteRequest } from '@/lib/types';
import { toSafeCsvCell } from '@/lib/csv';
import { icerikKaydet, icerikSil } from '@/lib/admin-client';
import { tamAdBicimlendir, telefonMaskele } from '@/lib/form-helpers';
import { metinAramasiEslesiyorMu } from '@/lib/turkce';
import { telefonAramasiEslesiyorMu } from '@/lib/telefon';
import { TeklifPolicelestir, type PolicelestirVerisi } from '@/components/admin/TeklifPolicelestir';
import { useModalErisilebilirlik } from '@/components/admin/useModalErisilebilirlik';

export default function QuotesCrmPage() {
  const [quotes, setQuotes] = useState<QuoteRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('Tümü');
  const [selectedQuote, setSelectedQuote] = useState<QuoteRequest | null>(null);
  const [newQuoteModal, setNewQuoteModal] = useState(false);

  // İki ayrı pencere, iki ayrı kanca örneği. Kanca `acikMi` false iken hiçbir
  // dinleyici bağlamadığı için aynı anda ikisinin bulunması çakışma yaratmaz.
  //
  // Kancaya `selectedQuote` DEĞİL, `Boolean(selectedQuote)` verilir: not alanına
  // yazılırken `setSelectedQuote` her tuşta yeni nesne üretiyor; nesnenin kendisi
  // bağımlılık olsaydı odak her harfte kapatma düğmesine sıçrardı.
  //
  // Kancanın sonucu NESNE olarak tutulmaz, alanlarına ayrılır: `detayModal.ref`
  // biçimindeki erişimi react-hooks/refs kuralı "çizim sırasında ref okuma" sayıp
  // hata veriyor.
  const {
    ref: detayRef, dialogOzellikleri: detayDialog, baslikId: detayBaslikId,
  } = useModalErisilebilirlik<HTMLDivElement>(Boolean(selectedQuote));
  const {
    ref: yeniKayitRef, dialogOzellikleri: yeniKayitDialog, baslikId: yeniKayitBaslikId,
  } = useModalErisilebilirlik<HTMLDivElement>(newQuoteModal);
  const [companyInfo, setCompanyInfo] = useState<any>(null);
  const [msg, setMsg] = useState('');
  const [hata, setHata] = useState('');
  /** Poliçeleştirme penceresi açık olan teklif. */
  const [policelestirilen, setPolicelestirilen] = useState<QuoteRequest | null>(null);
  const [saving, setSaving] = useState(false);

  // Form states for manual quote entry
  const [manualForm, setManualForm] = useState({
    fullName: '',
    phone: '',
    email: '',
    serviceName: 'Zorunlu Trafik Sigortası',
    cityDistrict: 'Antalya / Kepez',
    notes: '',
    adminNotes: 'Manuel ofis girişi',
    /** Teklifle birlikte müşteri kartı da açılsın mı? Ofis girişinde varsayılan davranış. */
    musteriOlustur: true,
  });

  const loadData = async () => {
    setLoading(true);
    const res = await fetch('/api/admin/content?fields=companyInfo,quotes');
    const data = await res.json();
    setQuotes(data.quotes || []);
    setCompanyInfo(data.companyInfo);
    setLoading(false);
  };

  useEffect(() => {
    let mounted = true;
    fetch('/api/admin/content?fields=companyInfo,quotes')
      .then((res) => res.json())
      .then((data) => {
        if (mounted) {
          setQuotes(data.quotes || []);
          if (data.companyInfo) setCompanyInfo(data.companyInfo);
          setLoading(false);
        }
      });
    return () => {
      mounted = false;
    };
  }, []);

  const updateQuoteStatus = async (quoteId: string, status: QuoteRequest['status'], adminNotes?: string) => {
    const res = await fetch('/api/admin/content?fields=companyInfo,quotes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        entity: 'quote_status',
        data: { quoteId, status, adminNotes },
      }),
    });

    if (!res.ok) {
      const govde = await res.json().catch(() => ({}));
      setMsg('');
      setHata(govde.error || 'Talep durumu güncellenemedi.');
      return;
    }

    setHata('');
    setMsg('Talep durumu güncellendi.');
    setTimeout(() => setMsg(''), 3000);
    loadData();
    if (selectedQuote && selectedQuote.id === quoteId) {
      setSelectedQuote((prev) => (prev ? { ...prev, status, adminNotes: adminNotes ?? prev.adminNotes } : null));
    }
  };

  /**
   * Durum listesinden seçim. 'Poliçeleştirildi' seçmek yalnız etiketi değiştirmez —
   * gerçekten poliçe kaydı oluşturur. Eskiden teklif 'poliçeleştirildi' görünürken
   * poliçe takibinde hiçbir kayıt olmuyor, poliçe elle ikinci kez giriliyordu.
   */
  const durumSecildi = (q: QuoteRequest, yeniDurum: QuoteRequest['status']) => {
    if (yeniDurum === 'Poliçeleştirildi') {
      setPolicelestirilen(q);
      return;
    }
    void updateQuoteStatus(q.id, yeniDurum);
  };

  const policelestir = async (veri: PolicelestirVerisi) => {
    if (!policelestirilen) return;

    setSaving(true);
    const res = await fetch('/api/admin/content?fields=companyInfo,quotes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        entity: 'quotes',
        action: 'policelestir',
        data: { quoteId: policelestirilen.id, ...veri },
      }),
    });
    const govde = await res.json().catch(() => ({}));
    setSaving(false);

    if (!res.ok) {
      setHata(govde.error || 'Teklif poliçeye çevrilemedi.');
      return;
    }

    setHata('');
    setQuotes(govde.quotes || []);
    setPolicelestirilen(null);
    setMsg('Teklif poliçeye çevrildi ve Poliçe Takibi ekranına eklendi.');
    setTimeout(() => setMsg(''), 5000);
  };

  const handleDeleteQuote = async (id: string) => {
    if (!confirm('Bu teklif kaydını silmek istediğinizden emin misiniz?')) return;

    const sonuc = await icerikSil('quotes', id);
    if (!sonuc.basarili) {
      // Salt-görüntüleme yetkisindeki personel 403 alır; eskiden kayıt silinmemesine
      // rağmen ekran silinmiş gibi davranıyordu.
      setHata(sonuc.hata);
      return;
    }

    setHata('');
    if (selectedQuote?.id === id) setSelectedQuote(null);
    loadData();
  };

  const handleCreateManualQuote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualForm.fullName || !manualForm.phone) {
      alert('Lütfen ad soyad ve telefon bilgilerini girin.');
      return;
    }

    // Yazım kuralı burada da uygulanır: alan blur'suz gönderilebiliyor (Enter ile
    // kaydetmede odak hiç ayrılmaz), o yüzden kaydetme anı tek güvenilir nokta.
    const tamAd = tamAdBicimlendir(manualForm.fullName);

    const sonuc = await icerikKaydet<{
      musteri: { durum: 'olusturuldu' | 'mevcut'; musteriNo: string; ad: string } | null;
    }>('quotes', {
      fullName: tamAd,
      phone: manualForm.phone,
      email: manualForm.email,
      serviceName: manualForm.serviceName,
      cityDistrict: manualForm.cityDistrict,
      notes: manualForm.notes,
      adminNotes: manualForm.adminNotes,
      status: 'Yeni',
      timestamp: new Date().toISOString(),
      musteriOlustur: manualForm.musteriOlustur,
    });

    if (!sonuc.basarili) {
      // Sunucu telefon için en az 7 karakter istiyor; eskiden bu hata sessizce
      // yutuluyor, pencere açık kalıyor ve kayıt hiç oluşmuyordu.
      setHata(sonuc.hata);
      return;
    }

    setHata('');
    setNewQuoteModal(false);

    // Müşteri kartı da açıldıysa sonucu bildir: aynı telefonla kayıtlı biri varsa
    // yeni kayıt açılmaz, mevcut karta bağlanır.
    const m = sonuc.veri?.musteri;
    setMsg(
      m
        ? m.durum === 'olusturuldu'
          ? `Teklif kaydedildi ve ${m.musteriNo} numaralı müşteri kartı oluşturuldu.`
          : `Teklif kaydedildi. ${m.ad} zaten ${m.musteriNo} numarasıyla kayıtlı, yeni kart açılmadı.`
        : 'Teklif kaydedildi.',
    );
    setTimeout(() => setMsg(''), 5000);

    setManualForm({
      fullName: '',
      phone: '',
      email: '',
      serviceName: 'Zorunlu Trafik Sigortası',
      cityDistrict: 'Antalya / Kepez',
      notes: '',
      adminNotes: 'Manuel ofis girişi',
      musteriOlustur: true,
    });
    loadData();
  };

  const exportToCsv = () => {
    if (quotes.length === 0) return;
    const headers = [[
      'ID', 'Tarih', 'Müşteri Adı', 'Telefon', 'E-posta', 'Sigorta Türü',
      'İl / İlçe', 'Müşteri Notu', 'Durum', 'Yönetici Notu',
    ].map(toSafeCsvCell).join(',')];
    const rows = quotes.map((q) =>
      [
        q.id,
        new Date(q.timestamp).toLocaleString('tr-TR'),
        q.fullName,
        q.phone,
        q.email,
        q.serviceName,
        q.cityDistrict,
        q.notes,
        q.status,
        q.adminNotes,
      ].map(toSafeCsvCell).join(',')
    );

    const blob = new Blob([`\uFEFF${[...headers, ...rows].join('\n')}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `veli_sigorta_teklif_talepleri_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredQuotes = quotes.filter((q) => {
    // Ad, branş ve not alanları Türkçe; ortak katlamalı kural kullanılır
    // (bkz. lib/turkce.ts). Eski hâl yerel ayarsız `toLowerCase()` idi — tr-TR'den
    // de kötüsü: "IŞIK" → "işik" olup "ışık" sorgusuyla hiç eşleşmiyordu.
    // Telefon ayrıca ülke kodundan bağımsız aranır (bkz. lib/telefon.ts):
    // WhatsApp'tan kopyalanan "+90 542 365 56 40" ham karşılaştırmayla hiçbir
    // kaydı bulamıyordu.
    const aranan = search.trim();
    const matchesSearch =
      metinAramasiEslesiyorMu([q.fullName, q.serviceName, q.notes, q.cityDistrict], aranan) ||
      telefonAramasiEslesiyorMu([q.phone], aranan);

    const matchesStatus = statusFilter === 'Tümü' ? true : q.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const getWhatsAppLink = (q: QuoteRequest) => {
    const cleanPhone = q.phone.replace(/\D/g, '');
    const phoneWithCountry = cleanPhone.startsWith('90') ? cleanPhone : `90${cleanPhone.replace(/^0/, '')}`;
    const message = encodeURIComponent(
      `Merhaba Sayın ${q.fullName},\n\nVeli Sigorta (Kepez/Antalya) acentemizden talep etmiş olduğunuz *${q.serviceName}* teklifi hakkında sizinle iletişime geçmek istiyoruz. Müsait olduğunuzda görüşebiliriz.`
    );
    return `https://wa.me/${phoneWithCountry}?text=${message}`;
  };

  if (loading) return <div className="text-xs font-bold text-slate-500">Yükleniyor...</div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Teklif & Müşteri CRM</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Gelen sigorta teklif taleplerini yönetin, durumlarını takip edin ve müşterilerle iletişim kurun.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={exportToCsv}
            className="px-3.5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs inline-flex items-center gap-2 shadow-xs transition-colors"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Excel / CSV İndir</span>
          </button>

          <button
            onClick={() => setNewQuoteModal(true)}
            className="px-4 py-2.5 rounded-xl bg-blue-900 hover:bg-blue-950 text-white font-bold text-xs inline-flex items-center gap-2 shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Manuel Kayıt Ekle</span>
          </button>
        </div>
      </div>

      {msg && <div role="status" aria-live="polite" className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-xl">{msg}</div>}
      {hata && (
        <div role="alert" className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold rounded-xl inline-flex items-center gap-2">
          <XCircle className="w-4 h-4 shrink-0" /> {hata}
        </div>
      )}

      {/* Filter & Search Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Status Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto w-full sm:w-auto">
          {['Tümü', 'Yeni', 'Görüşüldü', 'Revize İstendi', 'Poliçeleştirildi', 'İptal Edildi'].map((st) => {
            const count = st === 'Tümü' ? quotes.length : quotes.filter((q) => q.status === st).length;
            const isActive = statusFilter === st;

            return (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-xl font-bold text-xs shrink-0 transition-all ${
                  isActive
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <span>{st}</span>
                <span className={`ml-1.5 px-1.5 py-0.2 rounded-full text-[10px] ${isActive ? 'bg-slate-700 text-white' : 'bg-slate-200 text-slate-700'}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="İsim, Tel veya Sigorta Ara..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-900 font-medium"
          />
        </div>
      </div>

      {/* Quotes Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        {filteredQuotes.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <UserCheck className="w-8 h-8 text-slate-300 mx-auto" />
            <div className="text-sm font-bold text-slate-700">Kayıt Bulunamadı</div>
            <div className="text-xs text-slate-500">Arama kriterlerinize uyan bir teklif talebi mevcut değil.</div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-500 uppercase font-bold text-[10px] tracking-wider border-b border-slate-200">
                  <th className="p-3.5">Tarih</th>
                  <th className="p-3.5">Müşteri Adı</th>
                  <th className="p-3.5">İletişim</th>
                  <th className="p-3.5">İstenen Sigorta</th>
                  <th className="p-3.5">Şehir / İlçe</th>
                  <th className="p-3.5">Durum</th>
                  <th className="p-3.5 text-right">İşlemler</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredQuotes.map((q) => (
                  <tr key={q.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-3.5 text-slate-500 font-mono text-[11px] whitespace-nowrap">
                      {new Date(q.timestamp).toLocaleString('tr-TR')}
                    </td>

                    <td className="p-3.5">
                      <div className="font-bold text-slate-900">{q.fullName}</div>
                      {q.email && <div className="text-[10px] text-slate-400">{q.email}</div>}
                    </td>

                    <td className="p-3.5">
                      <div className="flex items-center gap-2">
                        <a
                          href={`tel:${q.phone}`}
                          className="font-bold text-blue-900 hover:underline flex items-center gap-1"
                          title="Telefonla Ara"
                        >
                          <Phone className="w-3 h-3 text-slate-400" />
                          <span>{q.phone}</span>
                        </a>

                        <a
                          href={getWhatsAppLink(q)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1 rounded bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-bold text-[10px] inline-flex items-center gap-1"
                          title="WhatsApp İle Yaz"
                        >
                          <MessageCircle className="w-3 h-3" />
                          <span>WP</span>
                        </a>
                      </div>
                    </td>

                    <td className="p-3.5 font-bold text-slate-800">{q.serviceName}</td>

                    <td className="p-3.5 text-slate-600">{q.cityDistrict || 'Antalya'}</td>

                    <td className="p-3.5">
                      <select
                        value={q.status}
                        onChange={(e) => durumSecildi(q, e.target.value as QuoteRequest['status'])}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border-0 cursor-pointer ${
                          q.status === 'Yeni'
                            ? 'bg-amber-100 text-amber-900'
                            : q.status === 'Görüşüldü'
                            ? 'bg-blue-100 text-blue-900'
                            : q.status === 'Poliçeleştirildi'
                            ? 'bg-emerald-100 text-emerald-900'
                            : 'bg-rose-100 text-rose-900'
                        }`}
                      >
                        <option value="Yeni">Yeni</option>
                        <option value="Görüşüldü">Görüşüldü</option>
                        <option value="Revize İstendi">Revize İstendi</option>
                        <option value="Poliçeleştirildi">Poliçeleştirildi</option>
                        <option value="İptal Edildi">İptal Edildi</option>
                      </select>
                    </td>

                    <td className="p-3.5 text-right space-x-1 whitespace-nowrap">
                      <button
                        onClick={() => setSelectedQuote(q)}
                        className="px-2.5 py-1.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-[10px]"
                      >
                        Detay
                      </button>

                      <button
                        onClick={() => handleDeleteQuote(q.id)}
                        className="p-1.5 rounded bg-rose-50 text-rose-700 hover:bg-rose-100 font-bold"
                        title="Sil"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* QUOTE DETAIL MODAL */}
      {selectedQuote && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-start sm:items-center justify-center p-4 z-50 overflow-y-auto">
          <div
            ref={detayRef}
            {...detayDialog}
            className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-5 text-xs"
          >
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Teklif Detay Kartı</div>
                <h3 id={detayBaslikId} className="font-extrabold text-slate-900 text-lg">{selectedQuote.fullName}</h3>
              </div>
              <button
                onClick={() => setSelectedQuote(null)}
                aria-label="Teklif detayını kapat"
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase">Tarih</span>
                <div className="font-bold text-slate-800">{new Date(selectedQuote.timestamp).toLocaleString('tr-TR')}</div>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase">Telefon</span>
                <div className="font-bold text-blue-900">{selectedQuote.phone}</div>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase">İstenen Ürün</span>
                <div className="font-bold text-slate-800">{selectedQuote.serviceName}</div>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase">Konum</span>
                <div className="font-bold text-slate-800">{selectedQuote.cityDistrict || 'Belirtilmedi'}</div>
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Müşteri Notu / Talebi</label>
              <div className="p-3 bg-slate-100 rounded-lg text-slate-800 leading-relaxed font-medium">
                {selectedQuote.notes || 'Müşteri ek bir not girtmedi.'}
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Acente İç Notu (Yönetici Notu)</label>
              <textarea
                rows={3}
                value={selectedQuote.adminNotes || ''}
                onChange={(e) => setSelectedQuote({ ...selectedQuote, adminNotes: e.target.value })}
                placeholder="Örn: Ruhsat fotoğrafı alındı, Sompo ve Anadolu'dan teklif gönderildi..."
                className="w-full p-2.5 rounded-lg border border-slate-300 font-medium"
              />
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-200">
              <a
                href={getWhatsAppLink(selectedQuote)}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold inline-flex items-center gap-2"
              >
                <MessageCircle className="w-4 h-4" />
                <span>WhatsApp İle Yanıtla</span>
              </a>

              <button
                onClick={() => {
                  updateQuoteStatus(selectedQuote.id, selectedQuote.status, selectedQuote.adminNotes);
                  setSelectedQuote(null);
                }}
                className="px-5 py-2 rounded-xl bg-blue-900 hover:bg-blue-950 text-white font-bold inline-flex items-center gap-1.5"
              >
                <Save className="w-4 h-4" />
                <span>Kaydet</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MANUAL QUOTE ENTRY MODAL */}
      {/* Durum listesinden "Poliçeleştirildi" seçilince açılır: teklif gerçek bir
          poliçe kaydına çevrilir. */}
      {policelestirilen && (
        <TeklifPolicelestir
          teklif={policelestirilen}
          sirketOnerileri={[]}
          onKapat={() => setPolicelestirilen(null)}
          onOnay={policelestir}
          kaydediliyor={saving}
        />
      )}

      {newQuoteModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-start sm:items-center justify-center p-4 z-50 overflow-y-auto">
          <div
            ref={yeniKayitRef}
            {...yeniKayitDialog}
            className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 text-xs"
          >
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 id={yeniKayitBaslikId} className="font-extrabold text-slate-900 text-base">
                Manuel Müşteri Kaydı Ekle
              </h3>
              <button
                onClick={() => setNewQuoteModal(false)}
                aria-label="Pencereyi kapat"
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateManualQuote} className="space-y-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Müşteri Adı Soyadı *</label>
                <input
                  type="text"
                  required
                  placeholder="Mehmet Mesut YILMAZ"
                  value={manualForm.fullName}
                  onChange={(e) => setManualForm({ ...manualForm, fullName: e.target.value })}
                  // Biçimlendirme yazarken değil alandan çıkınca uygulanır; aksi hâlde
                  // kullanıcı soyadını yazarken son kelime her tuşta büyüyüp imleç kayıyor.
                  onBlur={(e) => setManualForm((f) => ({ ...f, fullName: tamAdBicimlendir(e.target.value) }))}
                  className="w-full p-2.5 rounded-lg border border-slate-300 font-bold"
                  aria-describedby="ad-yazim-kurali"
                />
                {/* Düzeltme sessizce yapılırsa kullanıcı yazdığının neden değiştiğini
                    anlamıyor; kural alanın altında açıkça yazılı. */}
                <p id="ad-yazim-kurali" className="text-[10px] text-slate-500 mt-1">
                  Ad ve soyadı müşteri kartındaki kurala göre otomatik düzeltilir:
                  ad baş harfleri büyük, soyadı tamamı büyük.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Telefon *</label>
                  <input
                    type="text"
                    required
                    placeholder="0532 000 00 00"
                    value={manualForm.phone}
                    // Yazarken maskelenir; müşteri formundaki davranışın aynısı.
                    // Ham bırakıldığında aynı numara teklifte "5423655640",
                    // müşteri kartında "0(542) 365 56 40" olarak duruyordu.
                    onChange={(e) => setManualForm({ ...manualForm, phone: telefonMaskele(e.target.value) })}
                    className="w-full p-2.5 rounded-lg border border-slate-300 font-bold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">E-Posta</label>
                  <input
                    type="email"
                    placeholder="ahmet@gmail.com"
                    value={manualForm.email}
                    onChange={(e) => setManualForm({ ...manualForm, email: e.target.value })}
                    className="w-full p-2.5 rounded-lg border border-slate-300"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">İstenen Sigorta Türü</label>
                <select
                  value={manualForm.serviceName}
                  onChange={(e) => setManualForm({ ...manualForm, serviceName: e.target.value })}
                  className="w-full p-2.5 rounded-lg border border-slate-300 font-semibold"
                >
                  <option value="Zorunlu Trafik Sigortası">Zorunlu Trafik Sigortası</option>
                  <option value="Kasko Sigortası">Kasko Sigortası</option>
                  <option value="Tamamlayıcı Sağlık Sigortası (TSS)">Tamamlayıcı Sağlık Sigortası (TSS)</option>
                  <option value="Özel Sağlık Sigortası (ÖSS)">Özel Sağlık Sigortası (ÖSS)</option>
                  <option value="DASK Zorunlu Deprem Sigortası">DASK Zorunlu Deprem Sigortası</option>
                  <option value="Konut & Eşya Sigortası">Konut & Eşya Sigortası</option>
                  <option value="İşyeri Sigortası">İşyeri Sigortası</option>
                  <option value="Seyahat Sağlık Sigortası">Seyahat Sağlık Sigortası</option>
                  <option value="İhtiyari Mali Mesuliyet (İMM)">İhtiyari Mali Mesuliyet (İMM)</option>
                  <option value="Ferdi Kaza Sigortası">Ferdi Kaza Sigortası</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Müşteri Açıklaması / Detaylar</label>
                <textarea
                  rows={2}
                  value={manualForm.notes}
                  onChange={(e) => setManualForm({ ...manualForm, notes: e.target.value })}
                  placeholder="Plaka: 07 ABC 123, Model: 2021 Renault Megane..."
                  className="w-full p-2.5 rounded-lg border border-slate-300"
                />
              </div>

              {/* Ofiste teklif alınırken müşteri kartını ayrıca açmak fazladan iş
                  yaratıyordu; aynı bilgiler zaten burada toplanıyor. */}
              <label className="flex items-start gap-2.5 p-3 rounded-xl bg-blue-50 border border-blue-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={manualForm.musteriOlustur}
                  onChange={(e) => setManualForm({ ...manualForm, musteriOlustur: e.target.checked })}
                  className="mt-0.5 w-4 h-4"
                />
                <span className="text-[11px] leading-relaxed text-blue-900">
                  <strong>Müşteri kartı da oluştur.</strong> Ad, telefon, e-posta ve il/ilçe
                  bilgileriyle bireysel müşteri kaydı açılır; poliçe eklerken hazır olur.
                  Aynı telefonla kayıtlı biri varsa yeni kart açılmaz, mevcut karta bağlanır.
                </span>
              </label>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setNewQuoteModal(false)}
                  className="px-4 py-2 rounded-lg bg-slate-100 text-slate-700 font-bold"
                >
                  İptal
                </button>
                <button type="submit" className="px-5 py-2 rounded-lg bg-blue-900 text-white font-bold">
                  Kaydı Oluştur
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
