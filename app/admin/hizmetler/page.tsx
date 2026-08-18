'use client';

import React, { useEffect, useState } from 'react';
import { InsuranceService } from '@/lib/types';
import { Plus, Edit2, Trash2, Eye, Check, X, Shield, Save } from 'lucide-react';
import { icerikSil } from '@/lib/admin-client';

export default function ServicesCmsPage() {
  const [services, setServices] = useState<InsuranceService[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingService, setEditingService] = useState<Partial<InsuranceService> | null>(null);
  const [msg, setMsg] = useState('');
  const [hata, setHata] = useState('');

  const loadData = async () => {
    setLoading(true);
    const res = await fetch('/api/admin/content?fields=categories,services');
    const data = await res.json();
    setServices(data.services || []);
    setCategories(data.categories || []);
    setLoading(false);
  };

  useEffect(() => {
    let mounted = true;
    fetch('/api/admin/content?fields=categories,services')
      .then((res) => res.json())
      .then((data) => {
        if (mounted) {
          setServices(data.services || []);
          setCategories(data.categories || []);
          setLoading(false);
        }
      });
    return () => {
      mounted = false;
    };
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg('Kaydediliyor...');

    const res = await fetch('/api/admin/content?fields=categories,services', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        entity: 'services',
        action: 'save',
        data: editingService,
      }),
    });

    if (res.ok) {
      setMsg('Başarıyla kaydedildi!');
      setEditingService(null);
      loadData();
      setTimeout(() => setMsg(''), 3000);
    } else {
      setMsg('Hata oluştu.');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Bu sigorta hizmetini silmek istediğinizden emin misiniz?')) return;

    // Yanıt eskiden hiç okunmuyordu: sunucu 403 (yetki), 404 veya 409 (bağlı kayıt)
    // döndürdüğünde kayıt silinmediği hâlde ekran silinmiş gibi davranıyordu.
    const sonuc = await icerikSil('services', id);
    if (!sonuc.basarili) {
      setHata(sonuc.hata);
      return;
    }

    setHata('');
    loadData();
  };

  const createNewService = () => {
    setEditingService({
      id: `srv-${Date.now()}`,
      slug: 'yeni-sigorta-urunu',
      title: 'Yeni Sigorta Ürünü',
      categoryId: categories[0]?.id || 'oto',
      isMandatory: false,
      isPublished: true,
      order: services.length + 1,
      shortDescription: 'Sigorta ürünü hakkında kısa özet açıklama.',
      shortDirectAnswer: 'Kısa tanım ve kapsam özeti.',
      richContent: '<p>Detaylı sigorta açıklaması buraya yazılır.</p>',
      whoNeedsIt: 'Aracı veya gayrimenkulü olan tüm vatandaşlarımız için.',
      coverage: ['Teminat 1', 'Teminat 2'],
      exclusions: ['Kapsam Dışı 1'],
      documents: ['T.C. Kimlik Kartı', 'Ruhsat'],
      priceFactors: ['Hasarsızlık kademesi', 'Kullanım amacı'],
      legalBasis: 'İlgili Kanun Maddesi',
      featuredImage: '', // Görsel panelden yüklenir; boşken ContentImage nötr yer tutucu gösterir
      iconName: 'Shield',
      relatedServiceIds: [],
      relatedBlogIds: [],
      relatedBlogSlugs: [],
      faq: [
        { question: 'Poliçe ne kadar sürede hazırlanır?', answer: 'Hazırlama süresi ürüne ve gerekli bilgilere göre değişir; güncel süre teklif aşamasında paylaşılır.' }
      ],
      seoTitle: 'Yeni Sigorta Ürünü | Veli Sigorta',
      metaDescription: 'Yeni sigorta ürünü hakkında bilgi ve teklif alın.',
      canonicalUrl: '/hizmetlerimiz/yeni-sigorta-urunu',
      ogTitle: 'Yeni Sigorta Ürünü',
      ogDescription: 'Yeni sigorta ürünü hakkında bilgi ve teklif alın.',
      ogImage: '/Logo.png',
      semanticTopics: [],
      entityTags: [],
      searchIntentTags: [],
      userQuestionTags: [],
      alternateNames: [],
      serviceAreaTags: ['Antalya', 'Kepez'],
      keyFacts: [],
      aiSummary: 'Yeni sigorta ürünü için kısa yapay zekâ özeti.',
      lastReviewedDate: new Date().toISOString().substring(0, 10),
      sourceReferences: [{ title: 'Resmi Mevzuat', url: 'https://www.mevzuat.gov.tr' }],
    });
  };

  if (loading) {
    return <div className="text-xs font-bold text-slate-500">Yükleniyor...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Sigorta Hizmetleri CMS</h1>
          <p className="text-xs text-slate-500 mt-0.5">Tüm sigorta branşlarının içerik ve yayın yönetimi.</p>
        </div>

        <button
          onClick={createNewService}
          className="px-4 py-2.5 rounded-xl bg-blue-900 hover:bg-blue-950 text-white font-bold text-xs inline-flex items-center gap-2 shadow-xs"
        >
          <Plus className="w-4 h-4" />
          <span>Yeni Sigorta Hizmeti Ekle</span>
        </button>
      </div>

      {msg && <div role="status" aria-live="polite" className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-xl">{msg}</div>}
      {hata && (
        <div role="alert" className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold rounded-xl">{hata}</div>
      )}

      {/* Editing Form Modal / Inline Box */}
      {editingService && (
        <div className="bg-white rounded-2xl p-6 border border-slate-300 shadow-xl space-y-6">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <h2 className="font-bold text-slate-900 text-base">
              Sigorta Hizmeti Düzenle: {editingService.title}
            </h2>
            <button onClick={() => setEditingService(null)} className="text-slate-400 hover:text-slate-700">
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSave} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Başlık</label>
                <input
                  type="text"
                  required
                  value={editingService.title || ''}
                  onChange={(e) => setEditingService({ ...editingService, title: e.target.value })}
                  className="w-full p-2.5 rounded-lg border border-slate-300 font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">URL Slug</label>
                <input
                  type="text"
                  required
                  value={editingService.slug || ''}
                  onChange={(e) => setEditingService({ ...editingService, slug: e.target.value })}
                  className="w-full p-2.5 rounded-lg border border-slate-300 font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Kategori</label>
                <select
                  value={editingService.categoryId || ''}
                  onChange={(e) => setEditingService({ ...editingService, categoryId: e.target.value })}
                  className="w-full p-2.5 rounded-lg border border-slate-300 font-semibold"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Kısa Açıklama (Kart Metni)</label>
                <textarea
                  rows={2}
                  value={editingService.shortDescription || ''}
                  onChange={(e) => setEditingService({ ...editingService, shortDescription: e.target.value })}
                  className="w-full p-2.5 rounded-lg border border-slate-300"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Özet Doğrudan Yanıt (AEO / AI Search için)</label>
                <textarea
                  rows={2}
                  value={editingService.shortDirectAnswer || ''}
                  onChange={(e) => setEditingService({ ...editingService, shortDirectAnswer: e.target.value })}
                  className="w-full p-2.5 rounded-lg border border-slate-300"
                />
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Detaylı Açıklama (HTML İçerik)</label>
              <textarea
                rows={6}
                value={editingService.richContent || ''}
                onChange={(e) => setEditingService({ ...editingService, richContent: e.target.value })}
                className="w-full p-2.5 rounded-lg border border-slate-300 font-mono text-[11px]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Teminatlar (Her satıra 1 tane)</label>
                <textarea
                  rows={3}
                  value={editingService.coverage?.join('\n') || ''}
                  onChange={(e) =>
                    setEditingService({
                      ...editingService,
                      coverage: e.target.value.split('\n').filter((x) => x.trim()),
                    })
                  }
                  className="w-full p-2.5 rounded-lg border border-slate-300"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Kapsam Dışı Durumlar (Her satıra 1 tane)</label>
                <textarea
                  rows={3}
                  value={editingService.exclusions?.join('\n') || ''}
                  onChange={(e) =>
                    setEditingService({
                      ...editingService,
                      exclusions: e.target.value.split('\n').filter((x) => x.trim()),
                    })
                  }
                  className="w-full p-2.5 rounded-lg border border-slate-300"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Gerekli Belgeler (Her satıra 1 tane)</label>
                <textarea
                  rows={2}
                  value={editingService.documents?.join('\n') || ''}
                  onChange={(e) =>
                    setEditingService({
                      ...editingService,
                      documents: e.target.value.split('\n').filter((x) => x.trim()),
                    })
                  }
                  className="w-full p-2.5 rounded-lg border border-slate-300"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Fiyatı Etkileyen Faktörler (Her satıra 1 tane)</label>
                <textarea
                  rows={2}
                  value={editingService.priceFactors?.join('\n') || ''}
                  onChange={(e) =>
                    setEditingService({
                      ...editingService,
                      priceFactors: e.target.value.split('\n').filter((x) => x.trim()),
                    })
                  }
                  className="w-full p-2.5 rounded-lg border border-slate-300"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-800">
                <input
                  type="checkbox"
                  checked={editingService.isMandatory || false}
                  onChange={(e) => setEditingService({ ...editingService, isMandatory: e.target.checked })}
                  className="w-4 h-4 text-blue-900 rounded"
                />
                <span>Yasal Zorunlu Sigorta Mı?</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-800">
                <input
                  type="checkbox"
                  checked={editingService.isPublished || false}
                  onChange={(e) => setEditingService({ ...editingService, isPublished: e.target.checked })}
                  className="w-4 h-4 text-emerald-600 rounded"
                />
                <span>Sitede Yayında Mı?</span>
              </label>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Görsel URL</label>
                <input
                  type="text"
                  value={editingService.featuredImage || ''}
                  onChange={(e) => setEditingService({ ...editingService, featuredImage: e.target.value })}
                  className="w-full p-2 rounded-lg border border-slate-300"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setEditingService(null)}
                className="px-4 py-2 rounded-lg bg-slate-100 text-slate-700 font-bold"
              >
                İptal
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-lg bg-blue-900 text-white font-bold inline-flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                <span>Kaydet ve Yayınla</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Services Table */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 uppercase font-bold text-[10px] tracking-wider border-b border-slate-200">
                <th className="p-3">Sıra</th>
                <th className="p-3">Hizmet Adı</th>
                <th className="p-3">URL Slug</th>
                <th className="p-3">Tür</th>
                <th className="p-3">Yayın Durumu</th>
                <th className="p-3 text-right">İşlemler</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {services.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50">
                  <td className="p-3 font-bold text-slate-400">{s.order}</td>
                  <td className="p-3 font-bold text-slate-900">{s.title}</td>
                  <td className="p-3 font-mono text-slate-500">{s.slug}</td>
                  <td className="p-3">
                    <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold">
                      {s.isMandatory ? 'Zorunlu' : 'İsteğe Bağlı'}
                    </span>
                  </td>
                  <td className="p-3">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        s.isPublished ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      {s.isPublished ? 'Yayında' : 'Taslak'}
                    </span>
                  </td>
                  <td className="p-3 text-right space-x-2">
                    <button
                      onClick={() => setEditingService(s)}
                      className="p-1.5 rounded bg-blue-50 text-blue-900 hover:bg-blue-100 font-bold"
                      title="Düzenle"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(s.id)}
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
      </div>
    </div>
  );
}
