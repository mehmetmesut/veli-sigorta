'use client';

import React, { useEffect, useState } from 'react';
import { PartnerCompany } from '@/lib/types';
import { Plus, Edit2, Trash2, Save, X, ExternalLink, Building2, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { ContentImage } from '@/components/ContentImage';
import { icerikKaydet, icerikSil } from '@/lib/admin-client';

export default function PartnersCmsPage() {
  const [partners, setPartners] = useState<PartnerCompany[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingPartner, setEditingPartner] = useState<Partial<PartnerCompany> | null>(null);
  const [msg, setMsg] = useState('');
  const [hata, setHata] = useState('');

  const loadData = async () => {
    setLoading(true);
    const res = await fetch('/api/admin/content?fields=partners');
    const data = await res.json();
    setPartners(data.partners || []);
    setLoading(false);
  };

  useEffect(() => {
    let mounted = true;
    fetch('/api/admin/content?fields=partners')
      .then((res) => res.json())
      .then((data) => {
        if (mounted) {
          setPartners(data.partners || []);
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

    const sonuc = await icerikKaydet('partners', editingPartner);
    if (!sonuc.basarili) {
      setMsg('');
      setHata(sonuc.hata);
      return;
    }

    setMsg('Anlaşmalı şirket başarıyla kaydedildi!');
    setEditingPartner(null);
    loadData();
    setTimeout(() => setMsg(''), 3000);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Bu şirketi listeden çıkarmak istediğinizden emin misiniz?')) return;

    const sonuc = await icerikSil('partners', id);
    if (!sonuc.basarili) {
      setHata(sonuc.hata);
      return;
    }

    setHata('');
    loadData();
  };

  const createNewPartner = () => {
    setEditingPartner({
      id: `part-${Date.now()}`,
      name: 'Yeni Sigorta Şirketi',
      logoUrl: '', // Logo panelden yüklenir; boşken ContentImage nötr yer tutucu gösterir
      websiteUrl: 'https://www.anadolusigorta.com.tr',
      discountNote: 'Özel Yetkili Acente Avantajı',
      order: partners.length + 1,
      isActive: true,
    });
  };

  if (loading) return <div className="text-xs font-bold text-slate-500">Yükleniyor...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Anlaşmalı Sigorta Şirketleri CMS</h1>
          <p className="text-xs text-slate-500 mt-0.5">Doğrulanmış acentelik ve iş ortaklığı bilgilerinin yönetimi.</p>
        </div>

        <button
          onClick={createNewPartner}
          className="px-4 py-2.5 rounded-xl bg-blue-900 hover:bg-blue-950 text-white font-bold text-xs inline-flex items-center gap-2 shadow-xs"
        >
          <Plus className="w-4 h-4" />
          <span>Şirket Ekle</span>
        </button>
      </div>

      {msg && <div role="status" aria-live="polite" className="p-3 bg-emerald-50 text-emerald-800 text-xs font-bold rounded-xl border border-emerald-200">{msg}</div>}
      {hata && (
        <div role="alert" className="p-3 bg-rose-50 text-rose-800 text-xs font-bold rounded-xl border border-rose-200 inline-flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" /> {hata}
        </div>
      )}

      {/* Editing Form */}
      {editingPartner && (
        <div className="bg-white rounded-2xl p-6 border border-slate-300 shadow-xl space-y-4 text-xs">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <h2 className="font-bold text-slate-900 text-base">Anlaşmalı Şirket Düzenle: {editingPartner.name}</h2>
            <button onClick={() => setEditingPartner(null)} className="text-slate-400 hover:text-slate-700">
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSave} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Şirket Adı *</label>
                <input
                  type="text"
                  required
                  value={editingPartner.name || ''}
                  onChange={(e) => setEditingPartner({ ...editingPartner, name: e.target.value })}
                  className="w-full p-2.5 rounded-lg border border-slate-300 font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Özel İndirim / Not Rozeti</label>
                <input
                  type="text"
                  placeholder="Örn: %15 Hasarsızlık İndirimi"
                  value={editingPartner.discountNote || ''}
                  onChange={(e) => setEditingPartner({ ...editingPartner, discountNote: e.target.value })}
                  className="w-full p-2.5 rounded-lg border border-slate-300"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Logo URL Görsel Bağlantısı</label>
                <input
                  type="text"
                  value={editingPartner.logoUrl || ''}
                  onChange={(e) => setEditingPartner({ ...editingPartner, logoUrl: e.target.value })}
                  className="w-full p-2.5 rounded-lg border border-slate-300 font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Resmi Web Sitesi URL</label>
                <input
                  type="text"
                  value={editingPartner.websiteUrl || ''}
                  onChange={(e) => setEditingPartner({ ...editingPartner, websiteUrl: e.target.value })}
                  className="w-full p-2.5 rounded-lg border border-slate-300 font-mono"
                />
              </div>
            </div>

            <div className="flex items-center gap-6 pt-2">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Sıralama</label>
                <input
                  type="number"
                  value={editingPartner.order || 1}
                  onChange={(e) => setEditingPartner({ ...editingPartner, order: parseInt(e.target.value) || 1 })}
                  className="w-24 p-2 rounded-lg border border-slate-300 font-bold"
                />
              </div>

              <div className="flex items-center gap-2 pt-5">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={editingPartner.isActive ?? true}
                  onChange={(e) => setEditingPartner({ ...editingPartner, isActive: e.target.checked })}
                  className="w-4 h-4 text-blue-900 rounded focus:ring-blue-900"
                />
                <label htmlFor="isActive" className="font-bold text-slate-800 cursor-pointer">
                  Sitede Yayınla (Aktif)
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setEditingPartner(null)}
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

      {/* Partners List */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {partners.map((p) => (
          <div key={p.id} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-3 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-[10px]">
                <span className="font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">Sıra: {p.order}</span>
                {p.isActive ? (
                  <span className="text-emerald-700 font-bold flex items-center gap-0.5">
                    <CheckCircle className="w-3 h-3" /> Yayında
                  </span>
                ) : (
                  <span className="text-slate-400 font-bold flex items-center gap-0.5">
                    <XCircle className="w-3 h-3" /> Pasif
                  </span>
                )}
              </div>

              <div className="mt-3 flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-100 overflow-hidden shrink-0 flex items-center justify-center p-1">
                  <ContentImage
                    src={p.logoUrl}
                    alt={p.name}
                    className="max-w-full max-h-full object-contain"
                    placeholderClassName="w-full h-full bg-slate-50 flex items-center justify-center text-slate-300"
                  />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-sm leading-tight">{p.name}</h3>
                  {p.discountNote && <div className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded mt-1 inline-block">{p.discountNote}</div>}
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
              {p.websiteUrl ? (
                <a href={p.websiteUrl} target="_blank" rel="noreferrer" className="text-slate-400 hover:text-blue-900 flex items-center gap-1 text-[10px]">
                  <span>Siteye Git</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              ) : (
                <span className="text-[10px] text-slate-300">Site yok</span>
              )}

              <div className="flex items-center gap-1">
                <button
                  onClick={() => setEditingPartner(p)}
                  className="p-1.5 rounded bg-blue-50 text-blue-900 font-bold hover:bg-blue-100"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleDelete(p.id)}
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
