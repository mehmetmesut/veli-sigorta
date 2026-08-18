'use client';

import React, { useEffect, useState } from 'react';
import { InsuranceCategory } from '@/lib/types';
import { Plus, Edit2, Trash2, Save, X, Shield, FolderPlus, AlertCircle } from 'lucide-react';
import { icerikKaydet, icerikSil } from '@/lib/admin-client';

export default function CategoriesCmsPage() {
  const [categories, setCategories] = useState<InsuranceCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingCategory, setEditingCategory] = useState<Partial<InsuranceCategory> | null>(null);
  const [msg, setMsg] = useState('');
  const [hata, setHata] = useState('');

  const loadData = async () => {
    setLoading(true);
    const res = await fetch('/api/admin/content?fields=categories');
    const data = await res.json();
    setCategories(data.categories || []);
    setLoading(false);
  };

  useEffect(() => {
    let mounted = true;
    fetch('/api/admin/content?fields=categories')
      .then((res) => res.json())
      .then((data) => {
        if (mounted) {
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
    setHata('');
    setMsg('Kaydediliyor...');

    const sonuc = await icerikKaydet('categories', editingCategory);

    if (!sonuc.basarili) {
      // Örn. aynı slug ile ikinci kayıt → 409. Eskiden bu durumda ekran
      // "Kaydediliyor..." yazısında donuyor, kullanıcı kaydın olduğunu sanıyordu.
      setMsg('');
      setHata(sonuc.hata);
      return;
    }

    setMsg('Kategori başarıyla kaydedildi!');
    setEditingCategory(null);
    loadData();
    setTimeout(() => setMsg(''), 3000);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Bu kategoriyi silmek istediğinizden emin misiniz?')) return;

    const sonuc = await icerikSil('categories', id);
    if (!sonuc.basarili) {
      setHata(sonuc.hata);
      return;
    }

    setHata('');
    loadData();
  };

  const createNewCategory = () => {
    setEditingCategory({
      id: `cat-${Date.now()}`,
      name: 'Yeni Sigorta Kategorisi',
      slug: 'yeni-kategori',
      description: 'Kategori açıklaması.',
      iconName: 'Shield',
      order: categories.length + 1,
    });
  };

  if (loading) return <div className="text-xs font-bold text-slate-500">Yükleniyor...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Sigorta Kategorileri CMS</h1>
          <p className="text-xs text-slate-500 mt-0.5">Ürünlerin gruplandığı ana sigorta kategorilerinin yönetimi.</p>
        </div>

        <button
          onClick={createNewCategory}
          className="px-4 py-2.5 rounded-xl bg-blue-900 hover:bg-blue-950 text-white font-bold text-xs inline-flex items-center gap-2 shadow-xs"
        >
          <Plus className="w-4 h-4" />
          <span>Yeni Kategori Ekle</span>
        </button>
      </div>

      {msg && <div role="status" aria-live="polite" className="p-3 bg-emerald-50 text-emerald-800 text-xs font-bold rounded-xl border border-emerald-200">{msg}</div>}
      {hata && (
        <div role="alert" className="p-3 bg-rose-50 text-rose-800 text-xs font-bold rounded-xl border border-rose-200 inline-flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" /> {hata}
        </div>
      )}

      {/* Editing Modal / Card */}
      {editingCategory && (
        <div className="bg-white rounded-2xl p-6 border border-slate-300 shadow-xl space-y-4 text-xs">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <h2 className="font-bold text-slate-900 text-base">Kategori Düzenle: {editingCategory.name}</h2>
            <button onClick={() => setEditingCategory(null)} className="text-slate-400 hover:text-slate-700">
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSave} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Kategori Adı</label>
                <input
                  type="text"
                  required
                  value={editingCategory.name || ''}
                  onChange={(e) => setEditingCategory({ ...editingCategory, name: e.target.value })}
                  className="w-full p-2.5 rounded-lg border border-slate-300 font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">URL Slug</label>
                <input
                  type="text"
                  required
                  value={editingCategory.slug || ''}
                  onChange={(e) => setEditingCategory({ ...editingCategory, slug: e.target.value })}
                  className="w-full p-2.5 rounded-lg border border-slate-300 font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">İkon Adı (Lucide)</label>
                <input
                  type="text"
                  value={editingCategory.iconName || 'Shield'}
                  onChange={(e) => setEditingCategory({ ...editingCategory, iconName: e.target.value })}
                  className="w-full p-2.5 rounded-lg border border-slate-300 font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Kategori Açıklaması</label>
              <textarea
                rows={2}
                value={editingCategory.description || ''}
                onChange={(e) => setEditingCategory({ ...editingCategory, description: e.target.value })}
                className="w-full p-2.5 rounded-lg border border-slate-300"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Görüntülenme Sırası</label>
              <input
                type="number"
                value={editingCategory.order || 1}
                onChange={(e) => setEditingCategory({ ...editingCategory, order: parseInt(e.target.value) || 1 })}
                className="w-28 p-2.5 rounded-lg border border-slate-300 font-bold"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setEditingCategory(null)}
                className="px-4 py-2 rounded-lg bg-slate-100 text-slate-700 font-bold"
              >
                İptal
              </button>
              <button type="submit" className="px-5 py-2 rounded-lg bg-blue-900 text-white font-bold inline-flex items-center gap-2">
                <Save className="w-4 h-4" />
                <span>Kaydet</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Categories Grid / List */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {categories.map((cat) => (
          <div key={cat.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-2 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-900 font-bold text-[10px]">
                  Sıra: {cat.order}
                </span>
                <span className="font-mono text-[10px] text-slate-400">{cat.id}</span>
              </div>

              <h3 className="font-extrabold text-slate-900 text-base mt-2">{cat.name}</h3>
              <p className="text-xs text-slate-500 mt-1 line-clamp-2">{cat.description}</p>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="font-mono text-[11px] text-slate-600 bg-slate-100 px-2 py-0.5 rounded">/{cat.slug}</span>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => setEditingCategory(cat)}
                  className="p-1.5 rounded bg-blue-50 text-blue-900 font-bold hover:bg-blue-100"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleDelete(cat.id)}
                  className="p-1.5 rounded bg-rose-50 text-rose-700 font-bold hover:bg-rose-100"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
