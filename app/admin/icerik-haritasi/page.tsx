'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { InsuranceCategory, InsuranceService, BlogPost } from '@/lib/types';
import { aramaNormalize, metinAramasiEslesiyorMu } from '@/lib/turkce';
import {
  Network,
  ShieldCheck,
  FileText,
  Shield,
  Search,
  Filter,
  Sparkles,
  Save,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  RefreshCw,
  Zap,
  Grid,
  Link2,
  Layers,
  Info,
  Check,
  X,
  Plus,
  ExternalLink,
  ChevronRight,
  TrendingUp,
  SlidersHorizontal,
} from 'lucide-react';

export default function EntityRelationshipMapPage() {
  const [categories, setCategories] = useState<InsuranceCategory[]>([]);
  const [services, setServices] = useState<InsuranceService[]>([]);
  const [blogs, setBlogs] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // View state: 'map' | 'matrix' | 'editor' | 'autoMatch'
  const [activeTab, setActiveTab] = useState<'map' | 'matrix' | 'editor' | 'autoMatch'>('map');

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('ALL');
  const [orphanOnly, setOrphanOnly] = useState(false);

  // Editor selection
  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(null);
  const [selectedEntityType, setSelectedEntityType] = useState<'service' | 'blog'>('service');

  // Sync settings
  const [bidirectional, setBidirectional] = useState(true);

  useEffect(() => {
    let active = true;
    fetch('/api/admin/content?fields=categories,services,blogs')
      .then((res) => res.json())
      .then((data) => {
        if (!active) return;
        setCategories(data.categories || []);

        const loadedServices: InsuranceService[] = (data.services || []).map((s: InsuranceService) => ({
          ...s,
          relatedServiceIds: s.relatedServiceIds || [],
          relatedBlogIds: s.relatedBlogIds || [],
          relatedBlogSlugs: s.relatedBlogSlugs || [],
        }));

        const loadedBlogs: BlogPost[] = (data.blogs || []).map((b: BlogPost) => ({
          ...b,
          relatedServiceIds: b.relatedServiceIds || [],
          relatedServiceSlugs: b.relatedServiceSlugs || [],
          relatedBlogIds: b.relatedBlogIds || [],
        }));

        setServices(loadedServices);
        setBlogs(loadedBlogs);

        if (loadedServices.length > 0) {
          setSelectedEntityId(loadedServices[0].id);
          setSelectedEntityType('service');
        }
      })
      .catch((err) => {
        console.error(err);
        if (active) setMessage({ type: 'error', text: 'İçerik verileri yüklenirken bir hata oluştu.' });
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  // Save changes to server
  const handleSaveAll = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch('/api/admin/content?fields=categories,services,blogs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entity: 'entityLinks',
          data: {
            services: services.map((service) => ({
              id: service.id,
              relatedServiceIds: service.relatedServiceIds || [],
              relatedBlogIds: service.relatedBlogIds || [],
            })),
            blogs: blogs.map((blog) => ({
              id: blog.id,
              relatedServiceIds: blog.relatedServiceIds || [],
              relatedBlogIds: blog.relatedBlogIds || [],
            })),
          },
        }),
      });

      if (res.ok) {
        const result = await res.json();
        setMessage({ type: 'success', text: 'SEO İçerik & Entity Haritası başarıyla kaydedildi!' });
        setTimeout(() => setMessage(null), 4000);
      } else {
        setMessage({ type: 'error', text: 'Kaydederken bir hata oluştu.' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Bağlantı hatası yaşandı.' });
    } finally {
      setSaving(false);
    }
  };

  // Toggle link between a service and a blog
  const toggleServiceBlogLink = (serviceId: string, blogId: string) => {
    const targetService = services.find((s) => s.id === serviceId);
    const targetBlog = blogs.find((b) => b.id === blogId);
    if (!targetService || !targetBlog) return;

    const isLinked = (targetService.relatedBlogIds || []).includes(blogId);

    setServices((prevServices) =>
      prevServices.map((s) => {
        if (s.id !== serviceId) return s;
        const currentBlogIds = s.relatedBlogIds || [];
        const currentBlogSlugs = s.relatedBlogSlugs || [];

        const updatedBlogIds = isLinked
          ? currentBlogIds.filter((id) => id !== blogId)
          : [...currentBlogIds, blogId];

        const updatedBlogSlugs = isLinked
          ? currentBlogSlugs.filter((slug) => slug !== targetBlog.slug)
          : [...currentBlogSlugs, targetBlog.slug];

        return {
          ...s,
          relatedBlogIds: updatedBlogIds,
          relatedBlogSlugs: updatedBlogSlugs,
        };
      })
    );

    if (bidirectional) {
      setBlogs((prevBlogs) =>
        prevBlogs.map((b) => {
          if (b.id !== blogId) return b;
          const currentSrvIds = b.relatedServiceIds || [];
          const currentSrvSlugs = b.relatedServiceSlugs || [];

          const updatedSrvIds = isLinked
            ? currentSrvIds.filter((id) => id !== serviceId)
            : [...currentSrvIds, serviceId];

          const updatedSrvSlugs = isLinked
            ? currentSrvSlugs.filter((slug) => slug !== targetService.slug)
            : [...currentSrvSlugs, targetService.slug];

          return {
            ...b,
            relatedServiceIds: updatedSrvIds,
            relatedServiceSlugs: updatedSrvSlugs,
          };
        })
      );
    }
  };

  // Toggle related service link
  const toggleServiceServiceLink = (serviceIdA: string, serviceIdB: string) => {
    if (serviceIdA === serviceIdB) return;
    const targetA = services.find((s) => s.id === serviceIdA);
    const targetB = services.find((s) => s.id === serviceIdB);
    if (!targetA || !targetB) return;

    const isLinked = (targetA.relatedServiceIds || []).includes(serviceIdB);

    setServices((prevServices) =>
      prevServices.map((s) => {
        if (s.id === serviceIdA) {
          const currentRel = s.relatedServiceIds || [];
          const updatedRel = isLinked
            ? currentRel.filter((id) => id !== serviceIdB)
            : [...currentRel, serviceIdB];
          return { ...s, relatedServiceIds: updatedRel };
        }
        if (bidirectional && s.id === serviceIdB) {
          const currentRel = s.relatedServiceIds || [];
          const updatedRel = isLinked
            ? currentRel.filter((id) => id !== serviceIdA)
            : [...currentRel, serviceIdA];
          return { ...s, relatedServiceIds: updatedRel };
        }
        return s;
      })
    );
  };

  // Automated Semantic Link Matches Calculation
  const autoMatchSuggestions = useMemo(() => {
    const matches: {
      service: InsuranceService;
      blog: BlogPost;
      score: number;
      reasons: string[];
    }[] = [];

    services.forEach((s) => {
      blogs.forEach((b) => {
        // Skip if already linked
        if ((s.relatedBlogIds || []).includes(b.id)) return;

        let score = 0;
        const reasons: string[] = [];

        // Karşılaştırma Türkçe harf katlamalı (bkz. lib/turkce.ts). Ham
        // `toLowerCase()` ile "Sağlık" → "sağlık" kalıyor, blog metnindeki
        // "saglik" ile eşleşmiyor ve geçerli bağlantı önerisi hiç üretilmiyordu.
        const sTitleLower = aramaNormalize(s.title);
        const bTitleLower = aramaNormalize(b.title);
        const bContentLower = aramaNormalize(b.content + ' ' + b.excerpt);

        // 1. Title keyword overlap
        // NOT: Ek "sigortası" katlandıktan sonra "sigortasi" olur; desen buna göre.
        const serviceKeywords = sTitleLower.replace('sigortasi', '').replace('sigorta', '').trim().split(/\s+/);
        serviceKeywords.forEach((kw) => {
          if (kw.length > 2 && (bTitleLower.includes(kw) || bContentLower.includes(kw))) {
            score += 40;
            reasons.push(`Anahtar kelime eşleşmesi: "${kw}"`);
          }
        });

        // 2. Semantic topics or tags overlap
        if (s.semanticTopics && b.tags) {
          const commonTags = s.semanticTopics.filter((topic) =>
            b.tags.some((tag) => aramaNormalize(tag).includes(aramaNormalize(topic)))
          );
          if (commonTags.length > 0) {
            score += commonTags.length * 25;
            reasons.push(`Semantik etiket ortaklığı: ${commonTags.join(', ')}`);
          }
        }

        // 3. Entity tags match
        if (s.entityTags && b.tags) {
          const commonEntities = s.entityTags.filter((entity) =>
            b.tags.some((tag) => aramaNormalize(tag).includes(aramaNormalize(entity)))
          );
          if (commonEntities.length > 0) {
            score += commonEntities.length * 20;
            reasons.push(`Varlık etiketi eşleşmesi: ${commonEntities.join(', ')}`);
          }
        }

        if (score >= 40) {
          matches.push({
            service: s,
            blog: b,
            score: Math.min(score, 99),
            reasons: Array.from(new Set(reasons)),
          });
        }
      });
    });

    return matches.sort((a, b) => b.score - a.score);
  }, [services, blogs]);

  // Apply all high confidence auto-matches
  const handleApplyAllAutoMatches = () => {
    autoMatchSuggestions.forEach((m) => {
      if (m.score >= 50) {
        toggleServiceBlogLink(m.service.id, m.blog.id);
      }
    });
    setMessage({
      type: 'success',
      text: `${autoMatchSuggestions.filter((m) => m.score >= 50).length} adet yüksek uyumlu otomatik bağlantı haritaya eklendi!`,
    });
    setTimeout(() => setMessage(null), 4000);
  };

  // SEO Health metrics computation
  const stats = useMemo(() => {
    const totalServices = services.length;
    const totalBlogs = blogs.length;

    const servicesWithBlogs = services.filter((s) => (s.relatedBlogIds || []).length > 0).length;
    const blogsWithServices = blogs.filter((b) => (b.relatedServiceIds || []).length > 0).length;

    const orphanServices = services.filter((s) => (s.relatedBlogIds || []).length === 0);
    const orphanBlogs = blogs.filter((b) => (b.relatedServiceIds || []).length === 0);

    let totalConnections = 0;
    services.forEach((s) => {
      totalConnections += (s.relatedBlogIds || []).length + (s.relatedServiceIds || []).length;
    });

    const serviceCoveragePct = totalServices > 0 ? Math.round((servicesWithBlogs / totalServices) * 100) : 0;
    const blogCoveragePct = totalBlogs > 0 ? Math.round((blogsWithServices / totalBlogs) * 100) : 0;
    const overallSeoScore = Math.round((serviceCoveragePct * 0.6) + (blogCoveragePct * 0.4));

    return {
      totalServices,
      totalBlogs,
      servicesWithBlogs,
      blogsWithServices,
      orphanServicesCount: orphanServices.length,
      orphanBlogsCount: orphanBlogs.length,
      totalConnections,
      overallSeoScore,
    };
  }, [services, blogs]);

  // Filtered Services List
  const filteredServices = useMemo(() => {
    return services.filter((s) => {
      // Türkçe harf katlamalı ortak arama kuralı (bkz. lib/turkce.ts): "saglik"
      // yazan kullanıcı "Sağlık Sigortası" başlığını bulabilsin. Slug zaten ASCII;
      // katlama ona zarar vermez ve arama tek yoldan geçer.
      const matchesSearch = metinAramasiEslesiyorMu([s.title, s.slug], searchQuery);
      const matchesCat = selectedCategoryId === 'ALL' || s.categoryId === selectedCategoryId;
      const matchesOrphan = !orphanOnly || (s.relatedBlogIds || []).length === 0;
      return matchesSearch && matchesCat && matchesOrphan;
    });
  }, [services, searchQuery, selectedCategoryId, orphanOnly]);

  // Filtered Blogs List
  const filteredBlogs = useMemo(() => {
    return blogs.filter((b) => {
      const matchesSearch = metinAramasiEslesiyorMu([b.title, b.slug], searchQuery);
      const matchesOrphan = !orphanOnly || (b.relatedServiceIds || []).length === 0;
      return matchesSearch && matchesOrphan;
    });
  }, [blogs, searchQuery, orphanOnly]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-3">
        <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
        <span className="text-xs font-bold text-slate-500">SEO İçerik ve Entity Haritası Yükleniyor...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Header & Page Title */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-900 text-[10px] font-extrabold uppercase tracking-wide inline-flex items-center gap-1">
              <Network className="w-3 h-3" />
              <span>SEO Knowledge Graph & Entity Engine</span>
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-900 text-[10px] font-extrabold">
              v2.5 Otomatik Bağlantı
            </span>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight font-serif">
            İçerik & Entity İlişki Haritası
          </h1>
          <p className="text-xs text-slate-500 max-w-3xl leading-relaxed">
            Sigorta poliçeleri ile eğitici blog makaleleri arasında çift yönlü internal link (iç bağlantı) ağı kurarak
            Google PageRank dağılımını, arama görünürlüğünü ve dönüşüm oranlarını artırın.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => setBidirectional(!bidirectional)}
            className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all inline-flex items-center gap-1.5 ${
              bidirectional
                ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                : 'bg-slate-100 border-slate-300 text-slate-600'
            }`}
            title="Açık olduğunda: Ürün A -> Blog B bağlantısı yapıldığında, Blog B -> Ürün A bağlantısı da otomatik kurulur."
          >
            <RefreshCw className={`w-3.5 h-3.5 ${bidirectional ? 'text-emerald-600' : 'text-slate-400'}`} />
            <span>Çift Yönlü Sync: {bidirectional ? 'Açık' : 'Kapalı'}</span>
          </button>

          <button
            onClick={handleSaveAll}
            disabled={saving}
            className="px-5 py-2.5 rounded-xl bg-blue-900 hover:bg-blue-950 text-white font-extrabold text-xs inline-flex items-center gap-2 shadow-sm transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
          >
            {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4 text-blue-300" />}
            <span>Harita ve Bağlantıları Kaydet</span>
          </button>
        </div>
      </div>

      {/* Message Feedback */}
      {message && (
        <div
          className={`p-4 rounded-xl border text-xs font-bold flex items-center justify-between ${
            message.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-rose-50 border-rose-200 text-rose-900'
          }`}
        >
          <div className="flex items-center gap-2">
            {message.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600" />
            )}
            <span>{message.text}</span>
          </div>
          <button onClick={() => setMessage(null)} className="text-slate-400 hover:text-slate-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* SEO Internal Link Health Scorecard */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Score Meter Card */}
        <div className="bg-slate-900 text-white rounded-2xl p-5 border border-slate-800 shadow-md flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-bold uppercase tracking-wider text-[10px]">Internal Link Sağlığı</span>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-white font-serif">%{stats.overallSeoScore}</span>
            <span className="text-[11px] text-emerald-400 font-bold">SEO Gücü</span>
          </div>
          <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${
                stats.overallSeoScore > 75
                  ? 'bg-emerald-500'
                  : stats.overallSeoScore > 40
                  ? 'bg-amber-500'
                  : 'bg-rose-500'
              }`}
              style={{ width: `${stats.overallSeoScore}%` }}
            />
          </div>
        </div>

        {/* Services Linked */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Bağlantılı Sigorta Ürünleri</span>
            <ShieldCheck className="w-4 h-4 text-blue-800" />
          </div>
          <div className="text-2xl font-black text-slate-900">
            {stats.servicesWithBlogs} <span className="text-xs font-normal text-slate-400">/ {stats.totalServices} Ürün</span>
          </div>
          <div className="text-[11px] text-slate-500">
            %{Math.round((stats.servicesWithBlogs / (stats.totalServices || 1)) * 100)} kapsama oranı
          </div>
        </div>

        {/* Blogs Linked */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Ürün Bağlantılı Makaleler</span>
            <FileText className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">
            {stats.blogsWithServices} <span className="text-xs font-normal text-slate-400">/ {stats.totalBlogs} Makale</span>
          </div>
          <div className="text-[11px] text-slate-500">
            %{Math.round((stats.blogsWithServices / (stats.totalBlogs || 1)) * 100)} kapsama oranı
          </div>
        </div>

        {/* Orphan Entities Warning */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-amber-700 text-xs font-semibold">
            <span>Bağlantısız (Yetim) İçerik</span>
            <AlertCircle className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-black text-amber-900">
            {stats.orphanServicesCount + stats.orphanBlogsCount}{' '}
            <span className="text-xs font-normal text-amber-600">Sayfa</span>
          </div>
          <div className="text-[11px] text-amber-700">
            {stats.orphanServicesCount} ürün, {stats.orphanBlogsCount} blog bağlantısız
          </div>
        </div>

        {/* Auto Match Opportunities */}
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5 shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-blue-900 text-xs font-bold">
            <span>Otomatik Bağlantı Fırsatları</span>
            <Sparkles className="w-4 h-4 text-blue-700" />
          </div>
          <div className="text-2xl font-black text-blue-950">
            {autoMatchSuggestions.length} <span className="text-xs font-normal text-blue-700">Eşleşme</span>
          </div>
          <button
            onClick={() => setActiveTab('autoMatch')}
            className="text-[11px] font-extrabold text-blue-900 hover:underline inline-flex items-center gap-1"
          >
            <span>Önerileri İncele & Uygula</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Navigation Tabs & Search Toolbar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          {/* Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
            <button
              onClick={() => setActiveTab('map')}
              className={`px-4 py-2 rounded-xl font-bold text-xs inline-flex items-center gap-2 transition-all shrink-0 ${
                activeTab === 'map'
                  ? 'bg-blue-900 text-white shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              <Network className="w-4 h-4" />
              <span>Görsel Entity Haritası</span>
            </button>

            <button
              onClick={() => setActiveTab('matrix')}
              className={`px-4 py-2 rounded-xl font-bold text-xs inline-flex items-center gap-2 transition-all shrink-0 ${
                activeTab === 'matrix'
                  ? 'bg-blue-900 text-white shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              <Grid className="w-4 h-4" />
              <span>İlişki Matrisi (Grid)</span>
            </button>

            <button
              onClick={() => setActiveTab('editor')}
              className={`px-4 py-2 rounded-xl font-bold text-xs inline-flex items-center gap-2 transition-all shrink-0 ${
                activeTab === 'editor'
                  ? 'bg-blue-900 text-white shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              <Link2 className="w-4 h-4" />
              <span>Entity Bağlantı Düzenleyici</span>
            </button>

            <button
              onClick={() => setActiveTab('autoMatch')}
              className={`px-4 py-2 rounded-xl font-bold text-xs inline-flex items-center gap-2 transition-all shrink-0 ${
                activeTab === 'autoMatch'
                  ? 'bg-gradient-to-r from-blue-900 to-indigo-900 text-white shadow-xs'
                  : 'bg-blue-50 text-blue-900 hover:bg-blue-100 border border-blue-200'
              }`}
            >
              <Sparkles className="w-4 h-4 text-blue-300" />
              <span>Akıllı Otomatik Eşleştirme ({autoMatchSuggestions.length})</span>
            </button>
          </div>

          {/* Search & Filters */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Arayın (ör: Kasko, DASK)..."
                className="pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs w-48 sm:w-60 focus:outline-hidden focus:border-blue-800"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <select
              value={selectedCategoryId}
              onChange={(e) => setSelectedCategoryId(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs bg-white text-slate-700 focus:outline-hidden focus:border-blue-800"
            >
              <option value="ALL">Tüm Kategoriler ({categories.length})</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>

            <label className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={orphanOnly}
                onChange={(e) => setOrphanOnly(e.target.checked)}
                className="rounded-xs text-blue-900 focus:ring-blue-800"
              />
              <span>Sadece Bağlantısızlar</span>
            </label>
          </div>
        </div>

        {/* TAB 1: VISUAL ENTITY MAP */}
        {activeTab === 'map' && (
          <div className="space-y-6">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs text-slate-600">
              <div className="flex items-center gap-4 flex-wrap">
                <span className="font-bold text-slate-900">Entity Renk Kodları:</span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block" />
                  <span className="font-medium">Sigorta Kategorisi</span>
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-blue-600 inline-block" />
                  <span className="font-medium">Sigorta Ürünü (Hizmet)</span>
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-purple-600 inline-block" />
                  <span className="font-medium">Eğitici Blog / Rehber</span>
                </span>
              </div>
              <span className="text-[11px] text-slate-400">
                Kartlara tıklayarak doğrudan düzenleyici moduna geçebilirsiniz.
              </span>
            </div>

            {/* Tree Network List grouped by Category */}
            <div className="space-y-8">
              {categories
                .filter((cat) => selectedCategoryId === 'ALL' || cat.id === selectedCategoryId)
                .map((cat) => {
                  const categoryServices = filteredServices.filter((s) => s.categoryId === cat.id);
                  if (categoryServices.length === 0 && searchQuery) return null;

                  return (
                    <div
                      key={cat.id}
                      className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-4"
                    >
                      {/* Category Header */}
                      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                        <div className="flex items-center gap-2">
                          <span className="w-3 h-3 rounded-full bg-emerald-500" />
                          <h2 className="font-extrabold text-base text-slate-900 font-serif">{cat.name}</h2>
                          <span className="text-xs text-slate-400 font-normal">
                            ({categoryServices.length} Sigorta Ürünü)
                          </span>
                        </div>
                      </div>

                      {/* Services Cards Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {categoryServices.map((srv) => {
                          const linkedBlogPosts = blogs.filter((b) =>
                            (srv.relatedBlogIds || []).includes(b.id)
                          );

                          return (
                            <div
                              key={srv.id}
                              className={`rounded-2xl border p-4 transition-all space-y-3 relative group ${
                                linkedBlogPosts.length > 0
                                  ? 'bg-blue-50/40 border-blue-200 hover:border-blue-400'
                                  : 'bg-amber-50/30 border-amber-200/80 hover:border-amber-400'
                              }`}
                            >
                              {/* Service Header */}
                              <div className="flex items-start justify-between gap-2">
                                <div className="space-y-0.5">
                                  <div className="flex items-center gap-1.5">
                                    <ShieldCheck className="w-4 h-4 text-blue-800 shrink-0" />
                                    <h3 className="font-bold text-xs text-slate-900 group-hover:text-blue-900">
                                      {srv.title}
                                    </h3>
                                  </div>
                                  <div className="text-[10px] text-slate-500 font-mono">
                                    /hizmetlerimiz/{srv.slug}
                                  </div>
                                </div>

                                <button
                                  onClick={() => {
                                    setSelectedEntityId(srv.id);
                                    setSelectedEntityType('service');
                                    setActiveTab('editor');
                                  }}
                                  className="px-2 py-1 rounded-lg bg-white border border-slate-200 text-[10px] font-bold text-blue-900 hover:bg-blue-50 transition-colors shrink-0"
                                >
                                  Düzenle
                                </button>
                              </div>

                              {/* Connections Summary */}
                              <div className="space-y-2 pt-2 border-t border-slate-200/60">
                                <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                                  <span>Bağlı Eğitici Bloglar ({linkedBlogPosts.length})</span>
                                  {linkedBlogPosts.length === 0 && (
                                    <span className="text-amber-600 font-bold">Yetim Sayfa</span>
                                  )}
                                </div>

                                {linkedBlogPosts.length > 0 ? (
                                  <div className="space-y-1.5">
                                    {linkedBlogPosts.map((blog) => (
                                      <div
                                        key={blog.id}
                                        className="p-2 rounded-lg bg-white border border-slate-200 text-[11px] flex items-center justify-between gap-2 shadow-2xs hover:border-purple-300"
                                      >
                                        <div className="flex items-center gap-1.5 min-w-0">
                                          <FileText className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                                          <span className="font-bold text-slate-800 truncate">{blog.title}</span>
                                        </div>
                                        <button
                                          onClick={() => toggleServiceBlogLink(srv.id, blog.id)}
                                          /* Dolgu 2 pikselken tıklama alanı 16×16 kalıyordu:
                                             bağlantıyı KALDIRAN bir düğme için fazla küçük,
                                             dokunmatikte yanlışlıkla basılmaya açıktı. */
                                          className="text-slate-400 hover:text-rose-600 p-1.5 rounded"
                                          aria-label={`${blog.title} bağlantısını kaldır`}
                                          title="Bağlantıyı Kaldır"
                                        >
                                          <X className="w-3 h-3" />
                                        </button>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <div className="p-2.5 rounded-lg bg-white/80 border border-dashed border-amber-300 text-[11px] text-amber-800 space-y-1">
                                    <div className="font-semibold">Henüz bağlı blog yazısı yok.</div>
                                    <button
                                      onClick={() => {
                                        setSelectedEntityId(srv.id);
                                        setSelectedEntityType('service');
                                        setActiveTab('editor');
                                      }}
                                      className="text-[10px] font-bold text-blue-800 hover:underline inline-flex items-center gap-1"
                                    >
                                      <Plus className="w-3 h-3" />
                                      <span>Blog Ekle</span>
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        {/* TAB 2: MATRIX GRID VIEW */}
        {activeTab === 'matrix' && (
          <div className="space-y-4 overflow-x-auto">
            <div className="text-xs text-slate-500 flex items-center justify-between">
              <span>
                Satırlar sigorta ürünlerini, sütunlar eğitici blog makalelerini temsil eder. Kesişim hücrelerine
                tıklayarak iç bağlantıları anında aktif/pasif edin.
              </span>
              <span className="font-bold text-slate-700">
                {filteredServices.length} Ürün × {blogs.length} Blog
              </span>
            </div>

            {/* `overflow-hidden` tek başınayken geniş matris dar ekranda kırpılıyor ve
                kaydırılamıyordu; iç sarmalayıcı yatay kaydırmayı geri getirir. */}
            <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-2xs">
              <div className="overflow-x-auto">
              <table className="w-full border-collapse text-xs min-w-[720px]">
                <thead>
                  <tr className="bg-slate-900 text-white">
                    <th className="p-3 text-left font-extrabold sticky left-0 bg-slate-900 border-r border-slate-800 z-10 w-64">
                      Sigorta Ürünü / Hizmet
                    </th>
                    {blogs.map((b) => (
                      <th
                        key={b.id}
                        className="p-3 font-bold text-center border-r border-slate-800 min-w-[140px] max-w-[180px] truncate text-[11px]"
                        title={b.title}
                      >
                        <div className="truncate">{b.title}</div>
                        <div className="text-[9px] font-normal text-slate-400 truncate">/{b.slug}</div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredServices.map((srv) => (
                    <tr key={srv.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-3 font-bold text-slate-900 sticky left-0 bg-white border-r border-slate-200 shadow-xs z-10">
                        <div className="flex items-center gap-2">
                          <ShieldCheck className="w-4 h-4 text-blue-800 shrink-0" />
                          <div>
                            <div className="text-xs">{srv.title}</div>
                            <div className="text-[10px] text-slate-400 font-mono">/{srv.slug}</div>
                          </div>
                        </div>
                      </td>
                      {blogs.map((b) => {
                        const isLinked = (srv.relatedBlogIds || []).includes(b.id);
                        return (
                          <td
                            key={b.id}
                            onClick={() => toggleServiceBlogLink(srv.id, b.id)}
                            className={`p-3 text-center border-r border-slate-200 cursor-pointer transition-colors ${
                              isLinked
                                ? 'bg-emerald-100/70 hover:bg-emerald-200 text-emerald-950 font-black'
                                : 'hover:bg-slate-100 text-slate-300'
                            }`}
                          >
                            <div className="flex items-center justify-center">
                              {isLinked ? (
                                <span className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shadow-xs">
                                  ✓
                                </span>
                              ) : (
                                <span className="w-5 h-5 rounded-full border border-slate-300 text-transparent hover:text-slate-400 flex items-center justify-center">
                                  +
                                </span>
                              )}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: INDIVIDUAL ENTITY LINK EDITOR */}
        {activeTab === 'editor' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Entity Picker Sidebar */}
            <div className="lg:col-span-4 bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <span className="font-extrabold text-xs text-slate-900">Düzenlenecek Varlığı Seçin</span>
                <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg text-[10px] font-bold">
                  <button
                    onClick={() => {
                      setSelectedEntityType('service');
                      if (services.length > 0) setSelectedEntityId(services[0].id);
                    }}
                    className={`px-2.5 py-1 rounded-md transition-all ${
                      selectedEntityType === 'service'
                        ? 'bg-white text-blue-900 shadow-2xs font-extrabold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Ürünler ({services.length})
                  </button>
                  <button
                    onClick={() => {
                      setSelectedEntityType('blog');
                      if (blogs.length > 0) setSelectedEntityId(blogs[0].id);
                    }}
                    className={`px-2.5 py-1 rounded-md transition-all ${
                      selectedEntityType === 'blog'
                        ? 'bg-white text-purple-900 shadow-2xs font-extrabold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Bloglar ({blogs.length})
                  </button>
                </div>
              </div>

              {/* Entity List */}
              <div className="space-y-1.5 max-h-[550px] overflow-y-auto pr-1">
                {selectedEntityType === 'service' ? (
                  filteredServices.map((srv) => {
                    const isSelected = selectedEntityId === srv.id;
                    const linkedCount = (srv.relatedBlogIds || []).length;

                    return (
                      <button
                        key={srv.id}
                        onClick={() => setSelectedEntityId(srv.id)}
                        className={`w-full text-left p-3 rounded-xl border text-xs transition-all flex items-center justify-between gap-2 ${
                          isSelected
                            ? 'bg-blue-900 text-white border-blue-950 font-bold shadow-xs'
                            : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-800'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <ShieldCheck
                            className={`w-4 h-4 shrink-0 ${isSelected ? 'text-blue-300' : 'text-blue-800'}`}
                          />
                          <span className="truncate">{srv.title}</span>
                        </div>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full shrink-0 font-extrabold ${
                            isSelected
                              ? 'bg-blue-800 text-blue-100'
                              : linkedCount > 0
                              ? 'bg-blue-100 text-blue-900'
                              : 'bg-amber-100 text-amber-900'
                          }`}
                        >
                          {linkedCount} Blog
                        </span>
                      </button>
                    );
                  })
                ) : (
                  filteredBlogs.map((blog) => {
                    const isSelected = selectedEntityId === blog.id;
                    const linkedCount = (blog.relatedServiceIds || []).length;

                    return (
                      <button
                        key={blog.id}
                        onClick={() => setSelectedEntityId(blog.id)}
                        className={`w-full text-left p-3 rounded-xl border text-xs transition-all flex items-center justify-between gap-2 ${
                          isSelected
                            ? 'bg-purple-900 text-white border-purple-950 font-bold shadow-xs'
                            : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-800'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <FileText
                            className={`w-4 h-4 shrink-0 ${isSelected ? 'text-purple-300' : 'text-purple-700'}`}
                          />
                          <span className="truncate">{blog.title}</span>
                        </div>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full shrink-0 font-extrabold ${
                            isSelected
                              ? 'bg-purple-800 text-purple-100'
                              : linkedCount > 0
                              ? 'bg-purple-100 text-purple-900'
                              : 'bg-amber-100 text-amber-900'
                          }`}
                        >
                          {linkedCount} Ürün
                        </span>
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            {/* Right Active Relationship Config Panel */}
            <div className="lg:col-span-8 bg-white rounded-2xl p-6 border border-slate-200 shadow-2xs space-y-6">
              {selectedEntityType === 'service' && selectedEntityId && (
                (() => {
                  const srv = services.find((s) => s.id === selectedEntityId);
                  if (!srv) return <div>Ürün bulunamadı.</div>;

                  return (
                    <div className="space-y-6">
                      {/* Active Service Title */}
                      <div className="border-b border-slate-100 pb-4 space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-900 font-extrabold text-[10px] uppercase">
                            Sigorta Ürünü İç Bağlantı Ayarları
                          </span>
                        </div>
                        <h2 className="text-xl font-extrabold text-slate-900 font-serif flex items-center gap-2">
                          <ShieldCheck className="w-5 h-5 text-blue-800" />
                          <span>{srv.title}</span>
                        </h2>
                        <div className="text-xs text-slate-500 font-mono">
                          Canlı URL: /hizmetlerimiz/{srv.slug}
                        </div>
                      </div>

                      {/* Section 1: Attached Educational Blog Articles */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <h3 className="font-extrabold text-xs text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                            <FileText className="w-4 h-4 text-purple-600" />
                            <span>İlişkili Eğitici Blog & Rehber Makaleleri</span>
                          </h3>
                          <span className="text-xs text-slate-400 font-semibold">
                            {(srv.relatedBlogIds || []).length} / {blogs.length} Seçili
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-72 overflow-y-auto p-1 border border-slate-200 rounded-xl bg-slate-50">
                          {blogs.map((b) => {
                            const isChecked = (srv.relatedBlogIds || []).includes(b.id);

                            return (
                              <label
                                key={b.id}
                                className={`p-3 rounded-xl border text-xs cursor-pointer transition-all flex items-start gap-3 ${
                                  isChecked
                                    ? 'bg-purple-50 border-purple-300 text-purple-950 font-bold shadow-2xs'
                                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => toggleServiceBlogLink(srv.id, b.id)}
                                  className="mt-0.5 rounded-xs text-purple-900 focus:ring-purple-800"
                                />
                                <div className="space-y-0.5 min-w-0">
                                  <div className="line-clamp-2 leading-snug">{b.title}</div>
                                  <div className="text-[10px] text-slate-400 font-normal truncate">
                                    /haberler/{b.slug}
                                  </div>
                                </div>
                              </label>
                            );
                          })}
                        </div>
                      </div>

                      {/* Section 2: Related Products / Cross-Selling */}
                      <div className="space-y-3 pt-4 border-t border-slate-100">
                        <div className="flex items-center justify-between">
                          <h3 className="font-extrabold text-xs text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                            <Shield className="w-4 h-4 text-blue-800" />
                            <span>İlişkili Diğer Sigorta Ürünleri (Çapraz Satış)</span>
                          </h3>
                          <span className="text-xs text-slate-400 font-semibold">
                            {(srv.relatedServiceIds || []).length} Seçili
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-60 overflow-y-auto p-1 border border-slate-200 rounded-xl bg-slate-50">
                          {services
                            .filter((other) => other.id !== srv.id)
                            .map((other) => {
                              const isChecked = (srv.relatedServiceIds || []).includes(other.id);

                              return (
                                <label
                                  key={other.id}
                                  className={`p-2.5 rounded-xl border text-xs cursor-pointer transition-all flex items-center gap-2.5 ${
                                    isChecked
                                      ? 'bg-blue-50 border-blue-300 text-blue-950 font-bold'
                                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                                  }`}
                                >
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={() => toggleServiceServiceLink(srv.id, other.id)}
                                    className="rounded-xs text-blue-900 focus:ring-blue-800"
                                  />
                                  <span className="truncate">{other.title}</span>
                                </label>
                              );
                            })}
                        </div>
                      </div>
                    </div>
                  );
                })()
              )}

              {selectedEntityType === 'blog' && selectedEntityId && (
                (() => {
                  const blog = blogs.find((b) => b.id === selectedEntityId);
                  if (!blog) return <div>Blog bulunamadı.</div>;

                  return (
                    <div className="space-y-6">
                      {/* Active Blog Title */}
                      <div className="border-b border-slate-100 pb-4 space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-900 font-extrabold text-[10px] uppercase">
                            Eğitici Makale Bağlantı Ayarları
                          </span>
                        </div>
                        <h2 className="text-xl font-extrabold text-slate-900 font-serif flex items-center gap-2">
                          <FileText className="w-5 h-5 text-purple-700" />
                          <span>{blog.title}</span>
                        </h2>
                        <div className="text-xs text-slate-500 font-mono">
                          Canlı URL: /haberler/{blog.slug}
                        </div>
                      </div>

                      {/* Connected Insurance Products */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <h3 className="font-extrabold text-xs text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                            <ShieldCheck className="w-4 h-4 text-blue-800" />
                            <span>Bu Makaleden Yönlendirilecek Sigorta Ürünleri</span>
                          </h3>
                          <span className="text-xs text-slate-400 font-semibold">
                            {(blog.relatedServiceIds || []).length} / {services.length} Seçili
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-96 overflow-y-auto p-1 border border-slate-200 rounded-xl bg-slate-50">
                          {services.map((srv) => {
                            const isChecked = (blog.relatedServiceIds || []).includes(srv.id);

                            return (
                              <label
                                key={srv.id}
                                className={`p-3 rounded-xl border text-xs cursor-pointer transition-all flex items-start gap-3 ${
                                  isChecked
                                    ? 'bg-blue-50 border-blue-300 text-blue-950 font-bold shadow-2xs'
                                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => toggleServiceBlogLink(srv.id, blog.id)}
                                  className="mt-0.5 rounded-xs text-blue-900 focus:ring-blue-800"
                                />
                                <div className="space-y-0.5 min-w-0">
                                  <div className="font-bold">{srv.title}</div>
                                  <div className="text-[10px] text-slate-400 font-normal truncate">
                                    /hizmetlerimiz/{srv.slug}
                                  </div>
                                </div>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  );
                })()
              )}
            </div>
          </div>
        )}

        {/* TAB 4: AUTOMATED AI SEMANTIC MATCHING ENGINE */}
        {activeTab === 'autoMatch' && (
          <div className="space-y-6">
            <div className="p-5 rounded-2xl bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-blue-300 animate-pulse" />
                  <span className="font-extrabold text-xs uppercase tracking-wider text-blue-200">
                    Akıllı Semantik Eşleştirme Motoru
                  </span>
                </div>
                <h3 className="text-lg font-bold font-serif text-white">
                  Tepkisel Otomatik İç Bağlantı Önerileri
                </h3>
                <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
                  Başlık, anahtar kelime, içerik metni ve semantik etiket analizleri sonucunda sigorta ürünleriniz ile
                  eğitici makaleleriniz arasında yüksek SEO uyumu olan bağlantılar tespit edilmiştir.
                </p>
              </div>

              <button
                onClick={handleApplyAllAutoMatches}
                disabled={autoMatchSuggestions.length === 0}
                className="px-5 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-emerald-950 font-black text-xs inline-flex items-center gap-2 shadow-md transition-transform hover:scale-105 shrink-0 disabled:opacity-50"
              >
                <Zap className="w-4 h-4 fill-emerald-950" />
                <span>Tüm Yüksek Uyumlu Önerileri Bağla ({autoMatchSuggestions.length})</span>
              </button>
            </div>

            {/* Suggestions List */}
            {autoMatchSuggestions.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {autoMatchSuggestions.map((m, idx) => (
                  <div
                    key={idx}
                    className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs hover:shadow-xs transition-all space-y-4 flex flex-col justify-between"
                  >
                    <div className="space-y-3">
                      {/* Confidence Score Bar */}
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                          Eşleşme Skoru
                        </span>
                        <span
                          className={`text-xs font-black px-2.5 py-0.5 rounded-full ${
                            m.score >= 70
                              ? 'bg-emerald-100 text-emerald-900'
                              : 'bg-blue-100 text-blue-900'
                          }`}
                        >
                          %{m.score} Uyumlu
                        </span>
                      </div>

                      {/* Connection Diagram */}
                      <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
                        <div className="flex items-center gap-2 text-xs font-bold text-blue-900">
                          <ShieldCheck className="w-4 h-4 text-blue-800 shrink-0" />
                          <span>{m.service.title}</span>
                        </div>
                        <div className="text-[10px] text-center font-bold text-slate-400 uppercase tracking-widest">
                          ↕ Çift Yönlü İç Bağlantı
                        </div>
                        <div className="flex items-center gap-2 text-xs font-bold text-purple-900">
                          <FileText className="w-4 h-4 text-purple-700 shrink-0" />
                          <span>{m.blog.title}</span>
                        </div>
                      </div>

                      {/* Reasons */}
                      <div className="space-y-1 text-[11px] text-slate-600">
                        <div className="font-bold text-slate-800">Eşleşme Nedenleri:</div>
                        <ul className="list-disc list-inside space-y-0.5 text-slate-500">
                          {m.reasons.map((r, i) => (
                            <li key={i}>{r}</li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    <button
                      onClick={() => toggleServiceBlogLink(m.service.id, m.blog.id)}
                      className="w-full py-2 px-3 rounded-xl bg-blue-900 hover:bg-blue-950 text-white font-bold text-xs inline-flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Bu Bağlantıyı Haritaya Ekle</span>
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 space-y-2">
                <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
                <h4 className="font-bold text-slate-900 text-base">Tüm Önerilen Bağlantılar Bağlandı!</h4>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  Sistemdeki tüm semantik eşleşmeler ve uyumlu blog makaleleri sigorta ürünlerinizle başarıyla
                  bağlantılandırıldı.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
