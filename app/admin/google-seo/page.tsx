'use client';

import React, { useState, useEffect } from 'react';
import {
  Globe,
  Search,
  BarChart3,
  Code,
  Zap,
  TrendingUp,
  CheckCircle2,
  MapPin,
  Layout,
  Key,
  Database,
  RefreshCw,
  Save,
  ExternalLink,
  ShieldAlert,
  Sliders,
  Check,
  Smartphone,
  Monitor,
  Activity,
  Layers,
  Sparkles,
  Copy,
  Terminal,
  Eye,
  Settings,
  ShieldCheck,
} from 'lucide-react';
import { useAdminRole } from '@/hooks/useAdminRole';
import { AramaKonsoluGrafikleri } from '@/components/admin/AramaKonsoluGrafikleri';
import { Ga4Grafikleri } from '@/components/admin/Ga4Grafikleri';
import { KompaktCubuklar } from '@/components/admin/grafik-parcalari';
import { ga4KanalAdi } from '@/lib/olcum-etiketleri';
import { ReadOnlyNotice } from '@/components/ReadOnlyNotice';

export default function GoogleSeoSuitePage() {
  const [activeTab, setActiveTab] = useState<
    | 'settings'
    | 'gsc'
    | 'ga4'
    | 'gtm'
    | 'pagespeed'
    | 'lighthouse'
    | 'trends'
    | 'rich'
    | 'gbp'
    | 'looker'
    | 'apis'
  >('settings');

  const { canEdit, loading: roleLoading } = useAdminRole();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [settings, setSettings] = useState<any>({});
  const [copiedText, setCopiedText] = useState<string | null>(null);

  // PageSpeed Audit State
  const [psLoading, setPsLoading] = useState(false);
  const [psStrategy, setPsStrategy] = useState<'mobile' | 'desktop'>('mobile');
  const [psResult, setPsResult] = useState<any>(null);

  // API Ping States
  /**
   * Search Console ve GA4 ölçümleri. Bu sayfa eskiden bu uçları YALNIZCA
   * "bağlantıyı test et" için çağırıp dönen veriyi atıyor, ekranda ise sabit
   * sayılar gösteriyordu. Artık gerçek yanıt gösteriliyor.
   */
  const [gsc, setGsc] = useState<any>(null);
  const [ga4, setGa4] = useState<any>(null);

  const [apiPingStatus, setApiPingStatus] = useState<Record<string, 'idle' | 'testing' | 'success' | 'error'>>({
    gsc: 'idle',
    ga4: 'idle',
    psi: 'idle',
    gbp: 'idle',
  });

  useEffect(() => {
    let cancelled = false;

    // Ölçüm uçları sayfa açılırken çekilir; bağlantı yoksa hata mesajı gösterilir,
    // sahte sayı ÜRETİLMEZ.
    fetch('/api/admin/search-console').then((r) => r.json()).then(setGsc).catch(() => setGsc(null));
    fetch('/api/admin/ga4').then((r) => r.json()).then(setGa4).catch(() => setGa4(null));

    fetch('/api/admin/content?fields=settings,services,blogs,companyInfo')
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled && data.settings) {
          setSettings(data.settings);
        }
      })
      .catch((error) => console.error(error))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const handleSaveSettings = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSaving(true);
    setSavedSuccess(false);

    try {
      const res = await fetch('/api/admin/content?fields=settings,services,blogs,companyInfo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entity: 'settings',
          data: settings,
        }),
      });

      if (res.ok) {
        setSavedSuccess(true);
        setTimeout(() => setSavedSuccess(false), 3000);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const runPageSpeedAudit = async (strategy: 'mobile' | 'desktop' = psStrategy) => {
    setPsLoading(true);
    setPsStrategy(strategy);
    try {
      const res = await fetch('/api/pagespeed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          strategy,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setPsResult(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setPsLoading(false);
    }
  };

  /**
   * Bağlantıyı gerçekten sınar. Önceki sürüm koşulsuz "başarılı" gösteriyordu;
   * artık uç noktanın yanıtına göre sonuç verilir.
   */
  const testApiConnection = async (apiName: string) => {
    setApiPingStatus((prev) => ({ ...prev, [apiName]: 'testing' }));

    const endpoints: Record<string, string> = {
      gsc: '/api/admin/search-console',
      ga4: '/api/admin/ga4',
    };

    try {
      if (apiName === 'gbp') {
        // Business Profile için sunucu tarafı çağrı yok; Place ID tanımlı mı diye bakılır.
        const configured = Boolean(settings.googleBusinessPlaceId?.trim());
        setApiPingStatus((prev) => ({ ...prev, [apiName]: configured ? 'success' : 'error' }));
        return;
      }

      if (apiName === 'psi') {
        const res = await fetch('/api/pagespeed', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ strategy: 'mobile' }),
        });
        const data = await res.json();
        setApiPingStatus((prev) => ({ ...prev, [apiName]: res.ok && data.success ? 'success' : 'error' }));
        return;
      }

      const endpoint = endpoints[apiName];
      if (!endpoint) {
        setApiPingStatus((prev) => ({ ...prev, [apiName]: 'error' }));
        return;
      }

      const res = await fetch(endpoint);
      const data = await res.json();
      const ok = res.ok && data.configured === true && !data.error;
      setApiPingStatus((prev) => ({ ...prev, [apiName]: ok ? 'success' : 'error' }));
    } catch {
      setApiPingStatus((prev) => ({ ...prev, [apiName]: 'error' }));
    }
  };

  /** Ölçüm gösterilemiyorsa sebebini söyleyen metin; yoksa undefined. */
  const olcumHatasi = (veri: any, ad: string) =>
    veri && veri.configured !== false && !veri.error
      ? undefined
      : veri?.error || `${ad} bağlantısı tanımlı değil; veriler bağlantı kurulunca dolar.`;

  const gscHatasi = olcumHatasi(gsc, 'Google Search Console');
  const ga4Hatasi = olcumHatasi(ga4, 'Google Analytics');

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(label);
    setTimeout(() => setCopiedText(null), 2000);
  };

  if (loading) {
    return <div className="text-xs font-bold text-slate-500 py-12 text-center">Google & SEO Suite yükleniyor...</div>;
  }

  return (
    <div className="space-y-6">
      {!roleLoading && !canEdit && <ReadOnlyNotice />}

      {/* Header Banner */}
      <div className="bg-slate-900 text-white rounded-2xl p-6 sm:p-8 border border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-md bg-blue-600/30 text-blue-300 font-mono text-[11px] font-bold uppercase tracking-wider border border-blue-500/30">
              SEO & GEO & Performance Suite v3.0
            </span>
            <span className="px-2.5 py-0.5 rounded-md bg-emerald-600/30 text-emerald-300 font-mono text-[11px] font-bold uppercase tracking-wider border border-emerald-500/30">
              12 Google Ürünü Entegre
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
            <Globe className="w-8 h-8 text-blue-400" />
            <span>Google Trafik, SEO ve Performans Yönetimi</span>
          </h1>
          <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
            Google Search Console, GA4, Tag Manager, PageSpeed, Lighthouse, Google Trends, Business Profile, Rich Results ve API doğrulama anahtarlarını tek merkezden yönetin, istatistikleri anlık takip edin.
          </p>
        </div>

        <button
          onClick={() => handleSaveSettings()}
          disabled={saving || !canEdit}
          className={`px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-wider inline-flex items-center gap-2 shadow-md transition-all shrink-0 self-start md:self-center ${canEdit ? 'bg-blue-600 hover:bg-blue-500 text-white' : 'bg-slate-600 text-slate-300 cursor-not-allowed'}`}
        >
          {saving ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : savedSuccess ? (
            <Check className="w-4 h-4 text-emerald-300" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          <span>{saving ? 'Kaydediliyor...' : savedSuccess ? 'Kaydedildi!' : 'Tüm Değişiklikleri Kaydet'}</span>
        </button>
      </div>

      {/* Tabs Navigation */}
      <div className="bg-white rounded-2xl p-2 border border-slate-200 shadow-2xs overflow-x-auto">
        <div className="flex items-center gap-1 min-w-max">
          {[
            { id: 'settings', label: 'Tüm Entegrasyonlar', icon: Settings },
            { id: 'gsc', label: 'Search Console', icon: Search },
            { id: 'ga4', label: 'Google Analytics 4', icon: BarChart3 },
            { id: 'gtm', label: 'Tag Manager', icon: Code },
            { id: 'pagespeed', label: 'PageSpeed Insights', icon: Zap },
            { id: 'lighthouse', label: 'Lighthouse Raporu', icon: Activity },
            { id: 'trends', label: 'Google Trends', icon: TrendingUp },
            { id: 'rich', label: 'Rich Results (Schema)', icon: Layers },
            { id: 'gbp', label: 'Business Profile', icon: MapPin },
            { id: 'looker', label: 'Looker Studio', icon: Layout },
            { id: 'apis', label: 'Google APIs Hub', icon: Database },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl font-bold text-xs transition-all ${
                  isActive
                    ? 'bg-blue-900 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* TAB 1: ALL INTEGRATIONS & CODES FORM */}
      {activeTab === 'settings' && (
        <form onSubmit={handleSaveSettings} className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Google Search Console & GA4 & GTM */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-2xs space-y-5">
              <h2 className="font-bold text-slate-900 text-base flex items-center gap-2 border-b border-slate-100 pb-3">
                <Search className="w-5 h-5 text-blue-900" />
                <span>Arama & İzleme Entegrasyon Bilgileri</span>
              </h2>

              <div className="space-y-4 text-xs">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Google Search Console Doğrulama Kodu (Meta Tag)
                  </label>
                  <input
                    type="text"
                    value={settings.googleSearchConsoleVerificationCode || ''}
                    onChange={(e) => setSettings({ ...settings, googleSearchConsoleVerificationCode: e.target.value })}
                    placeholder="google-site-verification=XXXXXXXXXXXXXXXXXXXXXX"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-hidden focus:border-blue-800 font-mono text-slate-800 bg-slate-50"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    Google Search Console mülkiyet doğrulaması için html meta etiketi veya doğrulama dizesi.
                  </p>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Google Analytics 4 (GA4) Ölçüm Kimliği (Measurement ID)
                  </label>
                  <input
                    type="text"
                    value={settings.googleAnalyticsId || ''}
                    onChange={(e) => setSettings({ ...settings, googleAnalyticsId: e.target.value })}
                    placeholder="G-XXXXXXXXXX"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-hidden focus:border-blue-800 font-mono text-slate-800 bg-slate-50"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    Google Analytics 4 mülküne ait G- ile başlayan ölçüm kimliği.
                  </p>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Google Tag Manager (GTM) Konteyner Kimliği
                  </label>
                  <input
                    type="text"
                    value={settings.googleTagManagerId || ''}
                    onChange={(e) => setSettings({ ...settings, googleTagManagerId: e.target.value })}
                    placeholder="GTM-XXXXXXX"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-hidden focus:border-blue-800 font-mono text-slate-800 bg-slate-50"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    Tüm etiketlerin ve olayların yönetildiği GTM konteyner kodu.
                  </p>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Google Business Profile Place ID (Harita & İşletme Kimliği)
                  </label>
                  <input
                    type="text"
                    value={settings.googleBusinessPlaceId || ''}
                    onChange={(e) => setSettings({ ...settings, googleBusinessPlaceId: e.target.value })}
                    placeholder="ChIJkxhqJiO4wxQRj5Zs4xM0p2s"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-hidden focus:border-blue-800 font-mono text-slate-800 bg-slate-50"
                  />
                </div>
              </div>
            </div>

            {/* APIs & Looker Studio & GEO */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-2xs space-y-5">
              <h2 className="font-bold text-slate-900 text-base flex items-center gap-2 border-b border-slate-100 pb-3">
                <Key className="w-5 h-5 text-blue-900" />
                <span>API Anahtarları & GEO / Yerel SEO Ayarları</span>
              </h2>

              <div className="space-y-4 text-xs">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Google PageSpeed Insights API Key
                  </label>
                  <input
                    type="text"
                    value={settings.pagespeedApiKey || ''}
                    onChange={(e) => setSettings({ ...settings, pagespeedApiKey: e.target.value })}
                    placeholder="AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-hidden focus:border-blue-800 font-mono text-slate-800 bg-slate-50"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    Google Cloud Console’dan alınan PageSpeed Insights v5 API anahtarı.
                  </p>
                </div>

                {/*
                  Search Console ve GA4 Data API düz API anahtarı kabul etmez; servis
                  hesabı gerektirir. Kimlik bilgisi sunucuda dosya olarak tutulduğu için
                  buraya girilecek bir değer yoktur — yalnızca durum gösterilir.
                */}
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Search Console &amp; GA4 Data API Kimlik Bilgisi
                  </label>
                  <div className="px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 flex items-start gap-2.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <div className="font-bold text-slate-800">Sunucuda tanımlı — buraya bir şey yazılmaz</div>
                      <p className="text-[11px] text-slate-500 leading-relaxed">
                        Bu iki API düz API anahtarı kabul etmez, servis hesabı gerektirir. Kimlik
                        bilgisi güvenlik gereği veritabanında değil, sunucuda yalnızca root
                        tarafından okunabilen bir dosyada tutulur.
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Looker Studio Gömme (Embed) URL
                  </label>
                  <input
                    type="text"
                    value={settings.lookerStudioEmbedUrl || ''}
                    onChange={(e) => setSettings({ ...settings, lookerStudioEmbedUrl: e.target.value })}
                    placeholder="https://lookerstudio.google.com/embed/reporting/..."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-hidden focus:border-blue-800 font-mono text-slate-800 bg-slate-50"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">
                      GEO Bölge Kodu (geo.region)
                    </label>
                    <input
                      type="text"
                      value={settings.geoRegion || 'TR-07'}
                      onChange={(e) => setSettings({ ...settings, geoRegion: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-800 bg-slate-50"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">
                      GEO Yer Adı (geo.placename)
                    </label>
                    <input
                      type="text"
                      value={settings.geoPlacename || 'Antalya Kepez Dokuma'}
                      onChange={(e) => setSettings({ ...settings, geoPlacename: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-800 bg-slate-50"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Arbitrary script execution is intentionally disabled. */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-2xs space-y-4">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <Code className="w-4 h-4 text-blue-900" />
              <span>Özel Kod Güvenliği</span>
            </h3>
            <p className="text-xs leading-relaxed text-slate-600">
              Güvenlik nedeniyle serbest HTML veya JavaScript çalıştırılmaz. Google Analytics ve Google
              Tag Manager yalnızca yukarıdaki doğrulanmış kimlik alanları üzerinden etkinleştirilir.
            </p>
          </div>
        </form>
      )}

      {/* TAB 2: GOOGLE SEARCH CONSOLE */}
      {activeTab === 'gsc' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
                  <Search className="w-5 h-5 text-blue-900" />
                  <span>Google Search Console Performansı &amp; İndeksleme</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  mülk:{' '}
                  <span className="font-mono font-bold text-blue-900">
                    {gsc?.siteUrl || 'velisigorta.com.tr'}
                  </span>{' '}
                  &bull; Son 28 gün
                </p>
              </div>

              <a
                href="https://search.google.com/search-console"
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl inline-flex items-center gap-1 transition-colors"
              >
                <span>Search Console&rsquo;da Aç</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>

            {/* Tüm değerler /api/admin/search-console yanıtından gelir. Eskiden bu
                sekmede sabit sayılar (4.820 tıklama, 92.400 gösterim) ve uydurma bir
                anahtar kelime tablosu vardı; gerçek ölçüm 0 tıklama / 109 gösterim
                iken ekran 4.820 gösteriyordu. */}
            {gscHatasi ? (
              <p className="text-xs text-slate-500">{gscHatasi}</p>
            ) : (
              <div className="space-y-4">
                <AramaKonsoluGrafikleri gunluk={gsc?.daily ?? []} ozet={gsc?.summary ?? null} />

                <div>
                  <h3 className="text-[11px] font-extrabold uppercase tracking-wider text-slate-600 mb-2">
                    Aramada Çıkan Kelimeler
                  </h3>
                  <KompaktCubuklar
                    satirlar={(gsc?.topQueries ?? [])
                      .slice()
                      .sort((a: any, b: any) => b.impressions - a.impressions)
                      .map((q: any) => ({
                        etiket: q.key,
                        deger: q.impressions,
                        ikincil: `${q.clicks} tıklama · ${q.position} . sıra`,
                      }))}
                    renk="bg-cyan-600"
                    enFazla={10}
                  />
                </div>
              </div>
            )}
          </div>

          {!gscHatasi && (gsc?.topPages ?? []).length > 0 && (
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-2xs">
              <h3 className="text-[11px] font-extrabold uppercase tracking-wider text-slate-600 mb-3">
                Aramada En Çok Görünen Sayfalar
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="text-left text-[10px] uppercase tracking-wider text-slate-500 border-b border-slate-200">
                    <tr>
                      <th className="py-2">Sayfa</th>
                      <th className="py-2">Tıklama</th>
                      <th className="py-2">Gösterim</th>
                      <th className="py-2">CTR</th>
                      <th className="py-2">Ort. Sıra</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {gsc.topPages.map((satir: { key: string; clicks: number; impressions: number; ctr: number; position: number }) => (
                      <tr key={satir.key} className="hover:bg-slate-50">
                        <td className="py-2 font-mono text-[11px] text-slate-700 break-all">{satir.key}</td>
                        <td className="py-2 font-bold text-slate-900">{satir.clicks}</td>
                        <td className="py-2 text-slate-600">{satir.impressions}</td>
                        <td className="py-2 text-slate-600">%{satir.ctr}</td>
                        <td className="py-2 text-slate-600">{satir.position}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}


      {activeTab === 'ga4' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-2xs space-y-4">
            <div className="border-b border-slate-100 pb-4">
              <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-blue-900" />
                <span>Google Analytics 4 (GA4) Ziyaretçi Analizi</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Ölçüm Kimliği:{' '}
                <span className="font-mono font-bold text-blue-900">
                  {settings.googleAnalyticsId || 'Tanımlı değil'}
                </span>
              </p>
            </div>

            {/* Değerlerin tamamı /api/admin/ga4 yanıtından gelir. Eskiden bu kutularda
                sabit sayılar (12.450 kullanıcı, %28,4 çıkma oranı, "24 anlık ziyaretçi")
                yazıyordu; gerçek ölçüm sanılıp SEO kararı verilebiliyordu. */}
            {ga4Hatasi ? (
              <p className="text-xs text-slate-500">{ga4Hatasi}</p>
            ) : (
              <div className="space-y-4">
                <Ga4Grafikleri gunluk={ga4?.daily ?? []} />

                <div>
                  <h3 className="text-[11px] font-extrabold uppercase tracking-wider text-slate-600 mb-2">
                    Trafik Kaynakları
                  </h3>
                  <KompaktCubuklar
                    satirlar={(ga4?.channels ?? []).map((k: any) => ({
                      etiket: ga4KanalAdi(k.name),
                      deger: k.sessions,
                    }))}
                    enFazla={8}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      )}


      {activeTab === 'gtm' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-2xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
                  <Code className="w-5 h-5 text-blue-900" />
                  <span>Google Tag Manager (GTM) Etiket & Olay Yönetimi</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Konteyner Kodu: <span className="font-mono font-bold text-blue-900">{settings.googleTagManagerId || 'GTM-VSG07KP'}</span>
                </p>
              </div>

              <span className="px-3 py-1 bg-emerald-100 text-emerald-800 font-bold text-xs rounded-full flex items-center gap-1.5 self-start sm:self-center">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Konteyner Yayınlandı & Canlıda</span>
              </span>
            </div>

            {/* Configured Event Tags List */}
            <div className="space-y-3">
              <h3 className="font-bold text-slate-900 text-sm">Siteye Uygulanmış Aktif Dönüşüm ve Etiket Listesi</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  { title: 'Teklif Al Formu Gönderimi', trigger: 'Form Submit (#quote-form)', tag: 'GA4 Event: generate_lead', status: 'Aktif' },
                  { title: 'WhatsApp Destek Tıklaması', trigger: 'Click (href*=wa.me)', tag: 'GA4 Event: contact_whatsapp', status: 'Aktif' },
                  { title: 'Telefon Arama Tıklaması', trigger: 'Click (href*=tel:)', tag: 'GA4 Event: click_phone', status: 'Aktif' },
                  { title: 'Poliçe Teklif Karşılaştırma', trigger: 'Custom Event: compare_quote', tag: 'GA4 Event: view_quote_options', status: 'Aktif' },
                  { title: 'Blog ve Hizmet Okunma', trigger: 'Scroll Depth > %75', tag: 'GA4 Event: deep_engagement', status: 'Aktif' },
                  { title: 'Schema Structured Data', trigger: 'All Pages Head', tag: 'JSON-LD Injection', status: 'Aktif' },
                ].map((item, i) => (
                  <div key={i} className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900">{item.title}</span>
                      <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                        {item.status}
                      </span>
                    </div>
                    <div className="text-slate-500 text-[11px]">Tetikleyici: <span className="font-mono font-semibold text-slate-700">{item.trigger}</span></div>
                    <div className="text-blue-900 font-mono text-[11px] font-bold">{item.tag}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Code Snippet Box */}
            <div className="p-5 rounded-xl bg-slate-900 text-slate-200 space-y-3 font-mono text-xs">
              <div className="flex items-center justify-between text-[11px] text-slate-400 border-b border-slate-800 pb-2">
                <span>GTM Otomatik Yerleştirilen Head Kodu Snippet</span>
                <button
                  onClick={() =>
                    copyToClipboard(
                      `<!-- Google Tag Manager -->\n<script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${
                        settings.googleTagManagerId || 'GTM-VSG07KP'
                      }');</script>`,
                      'gtm-code'
                    )
                  }
                  className="px-2 py-1 bg-slate-800 hover:bg-slate-700 rounded text-slate-200 flex items-center gap-1 font-sans text-[10px]"
                >
                  <Copy className="w-3 h-3" />
                  <span>{copiedText === 'gtm-code' ? 'Kopyalandı!' : 'Kopyala'}</span>
                </button>
              </div>
              <pre className="overflow-x-auto text-blue-300 text-[11px] leading-relaxed">
                {`<!-- Google Tag Manager Snippet (Veli Sigorta) -->
<script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','${settings.googleTagManagerId || 'GTM-VSG07KP'}');</script>`}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: PAGESPEED INSIGHTS */}
      {activeTab === 'pagespeed' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-2xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
                  <Zap className="w-5 h-5 text-amber-500" />
                  <span>Google PageSpeed Insights Performans Testi</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Google PageSpeed Insights API ile anlık Core Web Vitals ve hız skorları ölçümü.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => runPageSpeedAudit('mobile')}
                  disabled={psLoading}
                  className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all ${
                    psStrategy === 'mobile' ? 'bg-blue-900 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  <Smartphone className="w-4 h-4" />
                  <span>Mobil Test</span>
                </button>

                <button
                  onClick={() => runPageSpeedAudit('desktop')}
                  disabled={psLoading}
                  className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all ${
                    psStrategy === 'desktop' ? 'bg-blue-900 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  <Monitor className="w-4 h-4" />
                  <span>Masaüstü Test</span>
                </button>

                <button
                  onClick={() => runPageSpeedAudit(psStrategy)}
                  disabled={psLoading}
                  className="px-4 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold text-xs rounded-xl inline-flex items-center gap-1.5 transition-all shadow-xs"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${psLoading ? 'animate-spin' : ''}`} />
                  <span>{psLoading ? 'Ölçülüyor...' : 'Anlık Testi Çalıştır'}</span>
                </button>
              </div>
            </div>

            {/* Scores Gauges */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Skorlar yalnizca gercek olcumden gelir; olcum yapilmadan deger uydurulmaz. */}
              {[
                { label: 'Performans', score: psResult?.scores?.performance },
                { label: 'Erişilebilirlik (Accessibility)', score: psResult?.scores?.accessibility },
                { label: 'En İyi Uygulamalar (Best Practices)', score: psResult?.scores?.bestPractices },
                { label: 'SEO Skoru', score: psResult?.scores?.seo },
              ].map((item, i) => {
                const olculdu = typeof item.score === 'number';
                const renk = !olculdu
                  ? 'border-slate-300 text-slate-400'
                  : item.score >= 90
                    ? 'border-emerald-500 text-emerald-600'
                    : item.score >= 50
                      ? 'border-amber-500 text-amber-600'
                      : 'border-rose-500 text-rose-600';

                return (
                  <div key={i} className="p-5 rounded-2xl border border-slate-200 bg-slate-50 text-center space-y-2">
                    <div className="text-[11px] font-extrabold text-slate-600 uppercase tracking-wider">{item.label}</div>
                    <div className={`inline-flex items-center justify-center w-20 h-20 rounded-full border-4 bg-white text-3xl font-black shadow-sm ${renk}`}>
                      {olculdu ? item.score : '—'}
                    </div>
                    <div className="text-[10px] text-slate-500 font-semibold">
                      {olculdu ? `${psStrategy === 'mobile' ? 'Mobil' : 'Masaüstü'} ölçümü` : 'Henüz ölçülmedi'}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Core Web Vitals Metrics */}
            <div className="space-y-3 pt-2">
              <h3 className="font-bold text-slate-900 text-sm">Core Web Vitals Önemli Deneyim Metrikleri</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                {/* Metrikler de yalnizca gercek olcumden gelir. */}
                {[
                  { label: 'FCP (İlk İçerik)', val: psResult?.metrics?.fcp },
                  { label: 'LCP (En Büyük Boyut)', val: psResult?.metrics?.lcp },
                  { label: 'CLS (Düzen Kayması)', val: psResult?.metrics?.cls },
                  { label: 'INP (Etkileşim Gecikmesi)', val: psResult?.metrics?.inp },
                  { label: 'Speed Index', val: psResult?.metrics?.speedIndex },
                  { label: 'TTFB (Sunucu Yanıtı)', val: psResult?.metrics?.ttfb },
                ].map((m, idx) => (
                  <div key={idx} className="p-3 bg-white rounded-xl border border-slate-200 text-center">
                    <div className="text-[10px] font-bold text-slate-400">{m.label}</div>
                    <div className="text-base font-extrabold text-slate-900 mt-1 font-mono">{m.val ?? '—'}</div>
                    <span className="text-[9px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded mt-1 inline-block">
                      {m.val ? 'Ölçüldü' : 'Ölçüm bekliyor'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 6: LIGHTHOUSE DIAGNOSTICS */}
      {activeTab === 'lighthouse' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-2xs space-y-4">
            <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
              <Zap className="w-5 h-5 text-blue-900" />
              <span>Lighthouse Raporu</span>
            </h2>

            {/* Bu sekmede eskiden hiç çalıştırılmamış beş denetim "PASS" olarak
                listeleniyordu; üstelik açıklamaları bu kuruluma UYMUYORDU (site Cloud
                Run'da değil Plesk/nginx'te çalışıyor, yazı tipleri Google Fonts'tan
                değil kendi sunucumuzdan geliyor). Gerçek Lighthouse ölçümü PageSpeed
                Insights sekmesinde zaten var — PSI motoru Lighthouse'un kendisidir. */}
            <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 text-xs text-blue-900">
              <span className="font-bold">Lighthouse ölçümü PageSpeed Insights sekmesinde.</span>{' '}
              PageSpeed Insights, Google&rsquo;ın Lighthouse motorunu kullanır; oradaki
              performans, erişilebilirlik, en iyi uygulamalar ve SEO skorları canlı
              ölçümdür. Bu sekmede ayrıca bir liste tutmuyoruz ki iki yerde çelişen sonuç
              görünmesin.
            </div>

            <button
              type="button"
              onClick={() => setActiveTab('pagespeed')}
              className="px-4 py-2.5 rounded-xl bg-blue-900 hover:bg-blue-800 text-white font-bold text-xs inline-flex items-center gap-2"
            >
              <Zap className="w-4 h-4" /> PageSpeed Insights sekmesine git
            </button>
          </div>
        </div>
      )}


      {activeTab === 'trends' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-blue-900" />
                <span>Google Trends</span>
              </h2>
              <a
                href="https://trends.google.com/trends/explore?geo=TR-07&q=sigorta"
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl inline-flex items-center gap-1 transition-colors"
              >
                <span>Antalya Trendlerini Aç</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>

            {/* Google Trends'in resmî bir API'si yok. Bu sekmede eskiden uydurma arama
                terimleri ve artış yüzdeleri (+320%, +240%…) gösteriliyor, gerçek ölçüm
                sanılıyordu. Ölçemediğimiz şeyi uydurmak yerine kullanıcıyı Trends'in
                kendisine yönlendiriyoruz. */}
            <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900">
              <span className="font-bold">Bu ekranda trend verisi gösterilmiyor.</span>{' '}
              Google Trends resmî bir API sunmuyor; panele otomatik veri çekilemiyor.
              Yukarıdaki bağlantı Antalya (TR-07) bölgesi için Trends ekranını açar.
            </div>

            <p className="text-xs text-slate-600">
              Aramada hangi kelimelerin size gerçekten tıklama getirdiğini görmek için{' '}
              <span className="font-bold">Search Console</span> sekmesini kullanın — orada
              gösterilen sorgular sitenizin gerçek ölçümüdür.
            </p>
          </div>
        </div>
      )}


      {activeTab === 'rich' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
                <Code className="w-5 h-5 text-blue-900" />
                <span>Rich Results (Yapısal Veri)</span>
              </h2>
              <a
                href="https://search.google.com/test/rich-results?url=https%3A%2F%2Fvelisigorta.com.tr"
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl inline-flex items-center gap-1 transition-colors"
              >
                <span>Google Rich Results Testi</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>

            {/* Eskiden bu liste her şema için "Geçerli" rozeti gösteriyordu ama hiçbir
                doğrulama çalıştırılmıyordu — üstelik bazıları yanlıştı (S.S.S. sayfasında
                FAQPage şeması yok). Artık yalnızca KODUN ÜRETTİĞİ şemalar ve hangi
                sayfada üretildiği listeleniyor; "geçerli mi?" sorusunu Google'ın kendi
                test aracı yanıtlar. */}
            <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 text-xs text-blue-900">
              Aşağıdaki liste sitenin ürettiği yapısal veriyi gösterir. Geçerlilik denetimi
              burada YAPILMAZ — bunun için yukarıdaki Google Rich Results testini kullanın.
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { type: 'InsuranceAgency', file: 'Ana sayfa (app/page.tsx)', items: 'İsim, adres, telefon, çalışma saatleri, konum, hizmet kataloğu' },
                { type: 'Service', file: 'Hizmet detay sayfaları (/hizmetlerimiz/[slug])', items: 'Hizmet adı, sağlayıcı, hizmet bölgesi' },
                { type: 'BlogPosting', file: 'Haber detay sayfaları (/haberler/[slug])', items: 'Başlık, yazar, yayın tarihi, görsel' },
              ].map((s) => (
                <div key={s.type} className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-1 text-xs">
                  <div className="font-bold text-slate-900 text-sm">{s.type}</div>
                  <div className="text-[11px] text-slate-500">Konum: {s.file}</div>
                  <div className="text-[11px] text-slate-700">İçerik: {s.items}</div>
                </div>
              ))}
            </div>

            <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900">
              <span className="font-bold">Eksik:</span> Kurumsal, S.S.S. ve İletişim
              sayfalarında yapısal veri yok. S.S.S. için FAQPage, iletişim için ContactPoint
              şeması eklenebilir.
            </div>
          </div>
        </div>
      )}


      {activeTab === 'gbp' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-2xs space-y-4">
            <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-rose-600" />
              <span>Google Business Profile (İşletme Profili &amp; Harita)</span>
            </h2>

            {/* Harita görüntülenmesi, yol tarifi ve yorum puanı Business Profile
                Performance API gerektiriyor; sunucuda böyle bir bağlantı yok. Eskiden
                bu kutularda sabit sayılar (★4.9, 185 yorum, 14.200 görüntülenme)
                yazıyor ve gerçek ölçüm sanılıyordu. Ölçemediğimizi uydurmak yerine
                söylüyoruz. */}
            <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900">
              <span className="font-bold">Bu ekranda ölçüm gösterilmiyor.</span> Harita
              görüntülenmesi, yol tarifi isteği ve yorum puanı için Google Business Profile
              Performance API bağlantısı gerekiyor; şu an kurulu değil. Bu veriler işletme
              profilinizden doğrudan izlenebilir.
            </div>

            <div className="text-xs text-slate-600 space-y-1">
              <div>
                <span className="text-slate-500">Place ID: </span>
                <span className="font-mono font-bold text-slate-800">
                  {settings.googleBusinessPlaceId || 'Tanımlı değil'}
                </span>
              </div>
              <p className="text-slate-500">
                Place ID “Tüm Entegrasyonlar” sekmesinden tanımlanır; sitedeki harita ve
                değerlendirme bağlantıları bunu kullanır.
              </p>
            </div>

            <a
              href="https://business.google.com/dashboard"
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl inline-flex items-center gap-1 transition-colors"
            >
              <span>İşletme Profilinde Aç</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      )}


      {activeTab === 'looker' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-2xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
                  <Layout className="w-5 h-5 text-blue-900" />
                  <span>Looker Studio Görsel İş Zekası ve Trafik Raporu</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Özel yapılandırılmış Looker Studio (Google Data Studio) canlı veri panosu.
                </p>
              </div>

              <a
                href={settings.lookerStudioEmbedUrl || 'https://lookerstudio.google.com'}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl inline-flex items-center gap-2 transition-colors self-start sm:self-center"
              >
                <span>Looker Studio’da Tam Ekran Aç</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>

            {settings.lookerStudioEmbedUrl && settings.lookerStudioEmbedUrl.includes('http') ? (
              <div className="w-full h-[600px] rounded-xl overflow-hidden border border-slate-200">
                <iframe
                  src={settings.lookerStudioEmbedUrl}
                  className="w-full h-full border-0"
                  allowFullScreen
                />
              </div>
            ) : (
              <div className="p-12 rounded-xl bg-slate-900 text-white text-center space-y-4">
                <Layout className="w-12 h-12 text-blue-400 mx-auto" />
                <div className="space-y-1">
                  <h3 className="text-base font-bold">Looker Studio Rapor Bağlantısı Ekleyin</h3>
                  <p className="text-xs text-slate-400 max-w-md mx-auto">
                    “Tüm Entegrasyonlar” sekmesinden Looker Studio paylaşım embed URL adresini kaydederek rapor panosunu buraya gömebilirsiniz.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 11: GOOGLE APIS HUB */}
      {activeTab === 'apis' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-2xs space-y-6">
            <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
              <Database className="w-5 h-5 text-blue-900" />
              <span>Google APIs Hub & Canlı Entegrasyon Bağlantı Testi</span>
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { name: 'Search Console API', key: 'gsc', desc: 'Arama sorguları ve dizin verileri çekme API’si' },
                { name: 'Google Analytics 4 Data API', key: 'ga4', desc: 'Gerçek zamanlı trafik ve dönüşüm istatistikleri API’si' },
                { name: 'PageSpeed Insights v5 API', key: 'psi', desc: 'Otomatik sayfa hızı ve performans denetimi API’si' },
                { name: 'Google Business Profile API', key: 'gbp', desc: 'İşletme profili ve harita yorumları senkronizasyon API’si' },
              ].map((api, i) => (
                <div key={i} className="p-5 rounded-xl border border-slate-200 bg-slate-50 space-y-3 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-slate-900 text-sm">{api.name}</span>
                    {/* 'error' durumu eskiden bu koşullarda hiç ele alınmıyordu ve
                        başarısız test "Hazır" olarak görünüyordu; yönetici entegrasyonun
                        çalıştığını sanıyordu. 'Hazır' artık yalnız hiç test edilmemiş
                        (idle) durumu ifade eder. */}
                    <span
                      role={apiPingStatus[api.key] === 'error' ? 'alert' : undefined}
                      className={`px-2.5 py-0.5 rounded text-[10px] font-bold ${
                        apiPingStatus[api.key] === 'success'
                          ? 'bg-emerald-100 text-emerald-800'
                          : apiPingStatus[api.key] === 'error'
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-blue-100 text-blue-900'
                      }`}
                    >
                      {apiPingStatus[api.key] === 'testing'
                        ? 'Sorgulanıyor...'
                        : apiPingStatus[api.key] === 'success'
                        ? 'Bağlantı Başarılı (200 OK)'
                        : apiPingStatus[api.key] === 'error'
                        ? 'Bağlantı Kurulamadı'
                        : 'Hazır'}
                    </span>
                  </div>

                  <p className="text-slate-500 text-[11px]">{api.desc}</p>

                  <button
                    onClick={() => testApiConnection(api.key)}
                    disabled={apiPingStatus[api.key] === 'testing'}
                    className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-[11px] rounded-lg inline-flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${apiPingStatus[api.key] === 'testing' ? 'animate-spin' : ''}`} />
                    <span>API Bağlantısını Test Et</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
