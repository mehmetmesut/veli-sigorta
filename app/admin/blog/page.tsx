'use client';

import React, { useEffect, useState } from 'react';
import { BlogPost } from '@/lib/types';
import { Plus, Edit2, Trash2, Save, X, FileText } from 'lucide-react';
import { icerikSil } from '@/lib/admin-client';

export default function BlogCmsPage() {
  const [blogs, setBlogs] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingPost, setEditingPost] = useState<Partial<BlogPost> | null>(null);
  const [msg, setMsg] = useState('');
  const [hata, setHata] = useState('');

  const loadData = async () => {
    setLoading(true);
    const res = await fetch('/api/admin/content?fields=blogs');
    const data = await res.json();
    setBlogs(data.blogs || []);
    setLoading(false);
  };

  useEffect(() => {
    let mounted = true;
    fetch('/api/admin/content?fields=blogs')
      .then((res) => res.json())
      .then((data) => {
        if (mounted) {
          setBlogs(data.blogs || []);
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

    const res = await fetch('/api/admin/content?fields=blogs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        entity: 'blogs',
        action: 'save',
        data: editingPost,
      }),
    });

    if (res.ok) {
      setMsg('Başarıyla kaydedildi!');
      setEditingPost(null);
      loadData();
      setTimeout(() => setMsg(''), 3000);
    } else {
      setMsg('Hata oluştu.');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Bu yazıyı silmek istediğinizden emin misiniz?')) return;

    // Yanıt eskiden hiç okunmuyordu: sunucu 403/404 döndürdüğünde kayıt silinmediği
    // hâlde ekran silinmiş gibi davranıyordu.
    const sonuc = await icerikSil('blogs', id);
    if (!sonuc.basarili) {
      setHata(sonuc.hata);
      return;
    }

    setHata('');
    loadData();
  };

  const createNewPost = () => {
    setEditingPost({
      id: `blog-${Date.now()}`,
      slug: 'yeni-haber-yazisi',
      title: 'Yeni Sigorta Haberi / Makalesi',
      excerpt: 'Yazı özeti ve kısa bilgilendirme.',
      category: 'Sektörel Haberler',
      content: '<p>Makale içeriği buraya yazılır.</p>',
      author: 'Veli Sigorta Editör',
      publishedAt: new Date().toISOString().substring(0, 10),
      readTimeMinutes: 4,
      featuredImage: '', // Görsel panelden yüklenir; boşken ContentImage nötr yer tutucu gösterir
      isPublished: true,
      tags: [],
      relatedServiceIds: [],
      relatedServiceSlugs: [],
      relatedBlogIds: [],
      sources: [{ title: 'Resmi Gazete', url: 'https://www.resmigazete.gov.tr' }],
    });
  };

  if (loading) return <div className="text-xs font-bold text-slate-500">Yükleniyor...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Blog & Haber CMS</h1>
          <p className="text-xs text-slate-500 mt-0.5">Makaleler, sektörel güncellemeler ve rehber yönetimi.</p>
        </div>

        <button
          onClick={createNewPost}
          className="px-4 py-2.5 rounded-xl bg-blue-900 hover:bg-blue-950 text-white font-bold text-xs inline-flex items-center gap-2 shadow-xs"
        >
          <Plus className="w-4 h-4" />
          <span>Yeni Haber / Makale Ekle</span>
        </button>
      </div>

      {msg && <div role="status" aria-live="polite" className="p-3 bg-emerald-50 text-emerald-800 text-xs font-bold rounded-xl">{msg}</div>}
      {hata && (
        <div role="alert" className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold rounded-xl">{hata}</div>
      )}

      {editingPost && (
        <div className="bg-white rounded-2xl p-6 border border-slate-300 shadow-xl space-y-6">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <h2 className="font-bold text-slate-900 text-base">Makale Düzenle: {editingPost.title}</h2>
            <button onClick={() => setEditingPost(null)} className="text-slate-400 hover:text-slate-700">
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
                  value={editingPost.title || ''}
                  onChange={(e) => setEditingPost({ ...editingPost, title: e.target.value })}
                  className="w-full p-2.5 rounded-lg border border-slate-300 font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">URL Slug</label>
                <input
                  type="text"
                  required
                  value={editingPost.slug || ''}
                  onChange={(e) => setEditingPost({ ...editingPost, slug: e.target.value })}
                  className="w-full p-2.5 rounded-lg border border-slate-300 font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Kategori</label>
                <input
                  type="text"
                  value={editingPost.category || ''}
                  onChange={(e) => setEditingPost({ ...editingPost, category: e.target.value })}
                  className="w-full p-2.5 rounded-lg border border-slate-300"
                />
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Özet Metin (Excerpt)</label>
              <textarea
                rows={2}
                value={editingPost.excerpt || ''}
                onChange={(e) => setEditingPost({ ...editingPost, excerpt: e.target.value })}
                className="w-full p-2.5 rounded-lg border border-slate-300"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">İçerik (HTML)</label>
              <textarea
                rows={8}
                value={editingPost.content || ''}
                onChange={(e) => setEditingPost({ ...editingPost, content: e.target.value })}
                className="w-full p-2.5 rounded-lg border border-slate-300 font-mono text-[11px]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Yazar</label>
                <input
                  type="text"
                  value={editingPost.author || ''}
                  onChange={(e) => setEditingPost({ ...editingPost, author: e.target.value })}
                  className="w-full p-2.5 rounded-lg border border-slate-300"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Görsel URL</label>
                <input
                  type="text"
                  value={editingPost.featuredImage || ''}
                  onChange={(e) => setEditingPost({ ...editingPost, featuredImage: e.target.value })}
                  className="w-full p-2.5 rounded-lg border border-slate-300"
                />
              </div>

              <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-800 pt-6">
                <input
                  type="checkbox"
                  checked={editingPost.isPublished || false}
                  onChange={(e) => setEditingPost({ ...editingPost, isPublished: e.target.checked })}
                  className="w-4 h-4 text-emerald-600 rounded"
                />
                <span>Sitede Yayında Mı?</span>
              </label>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setEditingPost(null)}
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

      {/* Blogs Table */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 uppercase font-bold text-[10px] tracking-wider border-b border-slate-200">
                <th className="p-3">Başlık</th>
                <th className="p-3">Kategori</th>
                <th className="p-3">Tarih</th>
                <th className="p-3">Yazar</th>
                <th className="p-3">Durum</th>
                <th className="p-3 text-right">İşlemler</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {blogs.map((b) => (
                <tr key={b.id} className="hover:bg-slate-50">
                  <td className="p-3 font-bold text-slate-900">{b.title}</td>
                  <td className="p-3 font-medium text-slate-600">{b.category}</td>
                  <td className="p-3 text-slate-500">{b.publishedAt}</td>
                  <td className="p-3 text-slate-700">{b.author}</td>
                  <td className="p-3">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        b.isPublished ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      {b.isPublished ? 'Yayında' : 'Taslak'}
                    </span>
                  </td>
                  <td className="p-3 text-right space-x-2">
                    <button
                      onClick={() => setEditingPost(b)}
                      className="p-1.5 rounded bg-blue-50 text-blue-900 hover:bg-blue-100 font-bold"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(b.id)}
                      className="p-1.5 rounded bg-rose-50 text-rose-700 hover:bg-rose-100 font-bold"
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
