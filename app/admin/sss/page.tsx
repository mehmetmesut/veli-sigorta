'use client';

import React, { useEffect, useState } from 'react';
import { FAQItem } from '@/lib/types';
import { Plus, Edit2, Trash2, Save, X, HelpCircle, AlertCircle } from 'lucide-react';
import { icerikKaydet, icerikSil } from '@/lib/admin-client';

export default function FaqCmsPage() {
  const [faqs, setFaqs] = useState<FAQItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingFaq, setEditingFaq] = useState<Partial<FAQItem> | null>(null);
  const [msg, setMsg] = useState('');
  const [hata, setHata] = useState('');

  const loadData = async () => {
    setLoading(true);
    const res = await fetch('/api/admin/content?fields=faqs');
    const data = await res.json();
    setFaqs(data.faqs || []);
    setLoading(false);
  };

  useEffect(() => {
    let mounted = true;
    fetch('/api/admin/content?fields=faqs')
      .then((res) => res.json())
      .then((data) => {
        if (mounted) {
          setFaqs(data.faqs || []);
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

    const sonuc = await icerikKaydet('faqs', editingFaq);
    if (!sonuc.basarili) {
      setMsg('');
      setHata(sonuc.hata);
      return;
    }

    setMsg('Başarıyla kaydedildi!');
    setEditingFaq(null);
    loadData();
    setTimeout(() => setMsg(''), 3000);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Bu soruyu silmek istediğinizden emin misiniz?')) return;

    const sonuc = await icerikSil('faqs', id);
    if (!sonuc.basarili) {
      setHata(sonuc.hata);
      return;
    }

    setHata('');
    loadData();
  };

  const createNewFaq = () => {
    setEditingFaq({
      id: `faq-${Date.now()}`,
      question: 'Yeni Soru?',
      answer: 'Sorunun yanıtı buraya yazılır.',
      category: 'Genel',
      order: faqs.length + 1,
    });
  };

  if (loading) return <div className="text-xs font-bold text-slate-500">Yükleniyor...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">S.S.S. Soruları CMS</h1>
          <p className="text-xs text-slate-500 mt-0.5">Sıkça sorulan soruların düzenlenmesi.</p>
        </div>

        <button
          onClick={createNewFaq}
          className="px-4 py-2.5 rounded-xl bg-blue-900 hover:bg-blue-950 text-white font-bold text-xs inline-flex items-center gap-2 shadow-xs"
        >
          <Plus className="w-4 h-4" />
          <span>Yeni Soru Ekle</span>
        </button>
      </div>

      {msg && <div role="status" aria-live="polite" className="p-3 bg-emerald-50 text-emerald-800 text-xs font-bold rounded-xl">{msg}</div>}
      {hata && (
        <div role="alert" className="p-3 bg-rose-50 text-rose-800 text-xs font-bold rounded-xl border border-rose-200 inline-flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" /> {hata}
        </div>
      )}

      {editingFaq && (
        <div className="bg-white rounded-2xl p-6 border border-slate-300 shadow-xl space-y-4 text-xs">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <h2 className="font-bold text-slate-900 text-base">Soru Düzenle</h2>
            <button onClick={() => setEditingFaq(null)} className="text-slate-400 hover:text-slate-700">
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSave} className="space-y-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Soru Metni</label>
              <input
                type="text"
                required
                value={editingFaq.question || ''}
                onChange={(e) => setEditingFaq({ ...editingFaq, question: e.target.value })}
                className="w-full p-2.5 rounded-lg border border-slate-300 font-bold"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Cevap Metni</label>
              <textarea
                rows={4}
                required
                value={editingFaq.answer || ''}
                onChange={(e) => setEditingFaq({ ...editingFaq, answer: e.target.value })}
                className="w-full p-2.5 rounded-lg border border-slate-300"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Kategori</label>
                <input
                  type="text"
                  value={editingFaq.category || 'Genel'}
                  onChange={(e) => setEditingFaq({ ...editingFaq, category: e.target.value })}
                  className="w-full p-2.5 rounded-lg border border-slate-300"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Sıra No</label>
                <input
                  type="number"
                  value={editingFaq.order || 1}
                  onChange={(e) => setEditingFaq({ ...editingFaq, order: parseInt(e.target.value) || 1 })}
                  className="w-full p-2.5 rounded-lg border border-slate-300 font-bold"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setEditingFaq(null)}
                className="px-4 py-2 rounded-lg bg-slate-100 text-slate-700 font-bold"
              >
                İptal
              </button>
              <button type="submit" className="px-5 py-2 rounded-lg bg-blue-900 text-white font-bold">
                Kaydet
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Faqs Table */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-2xs">
        <div className="space-y-3">
          {faqs.map((f) => (
            <div key={f.id} className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-start justify-between gap-4">
              <div className="space-y-1">
                <div className="font-bold text-slate-900 text-xs">{f.question}</div>
                <div className="text-xs text-slate-600">{f.answer}</div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => setEditingFaq(f)}
                  className="p-1.5 rounded bg-blue-50 text-blue-900 font-bold text-xs"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleDelete(f.id)}
                  className="p-1.5 rounded bg-rose-50 text-rose-700 font-bold text-xs"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
