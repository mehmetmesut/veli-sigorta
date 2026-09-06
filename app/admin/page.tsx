'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  BarChart2,
  Users,
  ShieldCheck,
  MessageSquare,
  Clock,
  TrendingUp,
  CheckCircle2,
  Plus,
  Bot,
  ExternalLink,
  MessageCircle,
  Building2,
  FileText,
  HelpCircle,
  Shield,
  Megaphone,
} from 'lucide-react';
import { Ga4Grafikleri } from '@/components/admin/Ga4Grafikleri';
import { AramaKonsoluGrafikleri } from '@/components/admin/AramaKonsoluGrafikleri';
import { BilgiKutulari } from '@/components/admin/BilgiKutulari';
import { YaklasanYenilemeler } from '@/components/admin/YaklasanYenilemeler';
import { WhatsAppReminderModal } from '@/components/admin/WhatsAppReminderModal';
import type { YaklasanBitis } from '@/lib/types';
import {
  VARSAYILAN_HATIRLATMA_METNI, formatTarih, hatirlatmaMetniOlustur, kalanGun,
  musteriAdi, whatsappBaglantisi,
} from '@/lib/police';
import { useAdminRole } from '@/hooks/useAdminRole';
import { sayfayaErisebilirMi } from '@/lib/permissions';

/**
 * Özet paneldeki hızlı kısayollar.
 *
 * Sıra günlük kullanım sıklığına göre: personel önce müşteriye bakar, sonra
 * teklife. İçerik ekranları (hizmet, şirket, blog, kampanya) arkada kalır.
 */
const KISAYOLLAR = [
  { href: '/admin/musteriler', etiket: 'Müşteriler', ikon: Users, renk: 'bg-blue-50 text-blue-900' },
  { href: '/admin/teklifler', etiket: 'Teklifler', ikon: MessageSquare, renk: 'bg-sky-50 text-sky-900' },
  { href: '/admin/hizmetler', etiket: 'Hizmet CMS', ikon: ShieldCheck, renk: 'bg-emerald-50 text-emerald-800' },
  { href: '/admin/sirketler', etiket: 'Şirketler', ikon: Building2, renk: 'bg-purple-50 text-purple-800' },
  { href: '/admin/blog', etiket: 'Blog Ekle', ikon: FileText, renk: 'bg-amber-50 text-amber-900' },
  { href: '/admin/kampanyalar', etiket: 'Kampanyalar', ikon: Megaphone, renk: 'bg-rose-50 text-rose-800' },
] as const;

export default function AdminDashboardPage() {
  const [data, setData] = useState<any>(null);
  const [analytics, setAnalytics] = useState<any>(null);
  const [ga4, setGa4] = useState<any>(null);
  const [gsc, setGsc] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  /** Yaklaşan poliçe bitişleri. Ayrı istekte çekilir; bkz. loadAll. */
  const [yaklasanlar, setYaklasanlar] = useState<YaklasanBitis[]>([]);
  /** WhatsApp hatırlatma penceresi açık olan satır. */
  const [waSatir, setWaSatir] = useState<YaklasanBitis | null>(null);
  const [waSablon, setWaSablon] = useState(VARSAYILAN_HATIRLATMA_METNI);
  /** "Şu an" bir kez hesaplanır; her render'da yenilenmesi listeyi oynatırdı. */
  const [simdi] = useState(() => new Date());
  const { role } = useAdminRole();

  const loadAll = () => {
    Promise.all([
      // `quotes` ve `partners` HASSAS/BÜYÜK koleksiyon sayıldığı için yalnız açıkça
      // istenirse döner (bkz. app/api/admin/content/route.ts). Alan listesi verilmediğinde
      // özet paneldeki teklif sayaçları ve tablosu sessizce boş kalıyordu.
      fetch('/api/admin/content?fields=quotes,partners').then((r) => r.json()),
      fetch('/api/analytics').then((r) => r.json()),
      // GA4 yapılandırılmamış olabilir; hata özet paneli çökertmemeli, yalnız
      // grafik kutusu 'bağlı değil' der.
      fetch('/api/admin/ga4').then((r) => r.json()).catch(() => null),
      fetch('/api/admin/search-console').then((r) => r.json()).catch(() => null),
    ])
      .then(([contentData, analyticsData, ga4Data, gscData]) => {
        setData(contentData);
        setAnalytics(analyticsData);
        setGa4(ga4Data);
        setGsc(gscData);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));

    // Yaklaşan bitişler AYRI istekte çekilir. Üstteki isteğe eklenseydi, CRM
    // yetkisi olmayan bir rolde uç 403 döner ve özet panelin TAMAMI boş kalırdı;
    // ayrı istekte yalnız bu bölüm çizilmez, panelin geri kalanı çalışır.
    fetch('/api/admin/content?fields=yaklasanBitisler')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setYaklasanlar(d?.yaklasanBitisler ?? []))
      .catch(() => setYaklasanlar([]));
  };

  useEffect(() => {
    loadAll();
  }, []);

  const updateQuoteStatus = async (quoteId: string, status: string) => {
    await fetch('/api/admin/content', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        entity: 'quote_status',
        data: { quoteId, status },
      }),
    });
    loadAll();
  };

  // Kancalar erken dönüşün ÜSTÜNDE kalmalı: React kancaları her render'da aynı
  // sırayla çağrılmak zorunda, `if (loading) return` sonrasına konursa yükleme
  // bitince sıra değişir ve React durumu karıştırır.
  const quotes = useMemo(() => data?.quotes ?? [], [data]);

  /** WhatsApp penceresinin gövdesi: şablondaki yer tutucular doldurulmuş metin. */
  const waMesaj = useMemo(() => {
    if (!waSatir) return '';
    return hatirlatmaMetniOlustur(waSablon, {
      musteri: musteriAdi(waSatir.musteri),
      sirket: waSatir.sigortaSirketi,
      brans: waSatir.sigortaTuru,
      policeNo: waSatir.policeNo,
      bitis: formatTarih(waSatir.bitisTarihi),
      kalanGun: String(kalanGun(waSatir.bitisTarihi, simdi) ?? 0),
    });
  }, [waSatir, waSablon, simdi]);

  const waLink = useMemo(
    () => (waSatir ? whatsappBaglantisi(waSatir.musteri.mobilTelefon, waMesaj) : null),
    [waSatir, waMesaj],
  );


  if (loading) {
    return <div className="text-xs font-bold text-slate-500">Veriler yükleniyor...</div>;
  }

  const partners = data?.partners || [];
  const newQuotesCount = quotes.filter((q: any) => q.status === 'Yeni').length;

  /**
   * Kısayol bu rol için açık mı?
   *
   * Erişilemeyen bir sayfaya götüren kısayol tıklanınca özet panele geri sekiyor;
   * kullanıcı için sebepsiz bir çıkmaz. Rol henüz okunmadıysa gösterilir —
   * yol koruması zaten yanlış girişi engelliyor.
   */
  /** Ölçüm gösterilemiyorsa sebebini söyleyen metin; yoksa undefined. */
  const olcumHatasi = (veri: any, ad: string) =>
    veri && veri.configured !== false && !veri.error
      ? undefined
      : veri?.error || `${ad} bağlantısı tanımlı değil; grafikler bağlantı kurulunca dolar.`;

  const ga4Hatasi = olcumHatasi(ga4, 'Google Analytics');
  const gscHatasi = olcumHatasi(gsc, 'Google Search Console');

  const kisayolAcik = (yol: string) => !role || sayfayaErisebilirMi(role, yol);

  const getWhatsAppLink = (q: any) => {
    const cleanPhone = (q.phone || '').replace(/\D/g, '');
    const phoneWithCountry = cleanPhone.startsWith('90') ? cleanPhone : `90${cleanPhone.replace(/^0/, '')}`;
    const message = encodeURIComponent(
      `Merhaba Sayın ${q.fullName},\n\nVeli Sigorta (Kepez/Antalya) acentemizden talep etmiş olduğunuz *${q.serviceName}* teklifi hakkında sizinle iletişime geçmek istiyoruz.`
    );
    return `https://wa.me/${phoneWithCountry}?text=${message}`;
  };

  return (
    <div className="space-y-5">
      {/* Header Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">Yönetim Özet Paneli</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Veli Sigorta dijital platformu yönetim komuta merkezi. Tüm içerik ve talepleri buradan izleyin.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/admin/teklifler"
            className="px-4 py-2 rounded-xl bg-blue-900 hover:bg-blue-950 text-white font-bold text-xs inline-flex items-center gap-2 shadow-xs transition-colors"
          >
            <Users className="w-4 h-4" />
            <span>Müşteri CRM ({quotes.length})</span>
          </Link>
        </div>
      </div>

      {/* İki ölçüm grafiği tek satırda, eşit genişlikte: ziyaret ile aramanın
          aynı günlerde nasıl seyrettiği yan yana okunabilsin. */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Ga4Grafikleri
          gunluk={ga4?.daily ?? []}
          yapilandirilmamisMesaj={ga4Hatasi}
        />

        <AramaKonsoluGrafikleri
          gunluk={gsc?.daily ?? []}
          ozet={gsc?.summary ?? null}
          yapilandirilmamisMesaj={gscHatasi}
        />
      </div>

      {/* Hızlı kısayollar. Liste veriden üretilir: altı kutu için altı kez
          kopyalanmış işaretleme, birinde yapılan stil düzeltmesinin diğerlerine
          taşınmamasına yol açıyordu. */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {KISAYOLLAR.filter((k) => kisayolAcik(k.href)).map(({ href, etiket, ikon: Ikon, renk }) => (
          <Link
            key={href}
            href={href}
            className="p-3 bg-white rounded-2xl border border-slate-200 shadow-2xs hover:border-blue-900 hover:shadow-xs transition-all flex flex-col items-center text-center gap-2"
          >
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold ${renk}`}>
              <Ikon className="w-4 h-4" />
            </div>
            <span className="text-[11px] font-bold text-slate-800">{etiket}</span>
          </Link>
        ))}
      </div>
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-1">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Bugünkü Sayfa Gösterimi</div>
          <div className="text-2xl font-extrabold text-slate-900">{analytics?.summary?.todayViews || 0}</div>
          <div className="text-[11px] text-emerald-600 font-semibold">Canlı ziyaretçi trafiği</div>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-1">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Son 30 Günlük Ziyaretçi</div>
          <div className="text-2xl font-extrabold text-blue-900">{analytics?.summary?.uniqueVisitors30d || 0}</div>
          <div className="text-[11px] text-slate-500">Tekil IP / Oturum sayısı</div>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-1">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Gelen Teklif Talepleri</div>
          <div className="text-2xl font-extrabold text-slate-900">{quotes.length}</div>
          <div className="text-[11px] text-amber-600 font-semibold">
            {newQuotesCount} Adet Yeni İşlem Bekliyor
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-1">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Anlaşmalı Şirket Sayısı</div>
          <div className="text-2xl font-extrabold text-slate-900">{partners.length} Şirket</div>
          <div className="text-[11px] text-slate-500">Aktif yetkili acentelikler</div>
        </div>
      </div>

      {/* Yaklaşan yenilemeler, teklif tablosunun ÜSTÜNDE: acentenin geliri
          yenilemeden geliyor ve süresi dolan poliçenin geri kazanılabileceği
          pencere dar. Yeni teklif ise beklerken kaybolmaz. */}
      <YaklasanYenilemeler satirlar={yaklasanlar} simdi={simdi} onHatirlat={setWaSatir} />

      {waSatir && (
        <WhatsAppReminderModal
          musteri={waSatir.musteri}
          sablon={waSablon}
          onSablonChange={setWaSablon}
          mesaj={waMesaj}
          link={waLink}
          onClose={() => setWaSatir(null)}
        />
      )}

      {/* QUOTES TABLE */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-2xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-bold text-slate-900 text-base">Son Gelen Teklif Talepleri</h2>
            <p className="text-xs text-slate-500">En güncel müşteri başvuruları</p>
          </div>
          <Link href="/admin/teklifler" className="text-xs font-bold text-blue-900 hover:underline">
            Tümünü Yönet (CRM) →
          </Link>
        </div>

        {quotes.length === 0 ? (
          <div className="text-xs text-slate-500 py-6 text-center">Henüz gelen bir teklif talebi bulunmamaktadır.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-500 uppercase font-bold text-[10px] tracking-wider border-b border-slate-200">
                  <th className="p-3">Tarih</th>
                  <th className="p-3">Müşteri Adı</th>
                  <th className="p-3">İletişim</th>
                  <th className="p-3">İstenen Sigorta</th>
                  <th className="p-3">Durum</th>
                  <th className="p-3 text-right">Hızlı İletişim</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {quotes.slice(0, 5).map((q: any) => (
                  <tr key={q.id} className="hover:bg-slate-50/80">
                    <td className="p-3 font-medium text-slate-500 whitespace-nowrap">
                      {new Date(q.timestamp).toLocaleString('tr-TR')}
                    </td>
                    <td className="p-3 font-bold text-slate-900">{q.fullName}</td>
                    <td className="p-3 font-semibold text-blue-900">
                      <a href={`tel:${q.phone}`} className="hover:underline">
                        {q.phone}
                      </a>
                    </td>
                    <td className="p-3 font-medium text-slate-800">{q.serviceName}</td>
                    <td className="p-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          q.status === 'Yeni'
                            ? 'bg-amber-100 text-amber-800'
                            : q.status === 'Görüşüldü'
                            ? 'bg-blue-100 text-blue-800'
                            : q.status === 'Poliçeleştirildi'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {q.status}
                      </span>
                    </td>
                    <td className="p-3 text-right whitespace-nowrap">
                      <a
                        href={getWhatsAppLink(q)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] inline-flex items-center gap-1"
                      >
                        <MessageCircle className="w-3 h-3" />
                        <span>WhatsApp</span>
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Kaynak ve içerik listeleri: hepsi "hangi kaynak / hangi sayfa / hangi
          kelime" sorusunu yanıtlıyor, bu yüzden bir arada duruyorlar. */}
      <BilgiKutulari
        kanallar={ga4Hatasi ? [] : ga4?.channels ?? []}
        sorgular={gscHatasi ? [] : gsc?.topQueries ?? []}
        ziyaretSayfalari={analytics?.topPages ?? []}
        yonlendirenler={analytics?.referrerCategories ?? {}}
      />

    </div>
  );
}

