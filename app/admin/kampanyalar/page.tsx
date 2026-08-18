'use client';

import React, { useEffect, useState } from 'react';
import { CampaignItem } from '@/lib/types';
import { Plus, Edit2, Trash2, Save, X, Megaphone, CheckCircle, XCircle, Upload } from 'lucide-react';
import { icerikSil } from '@/lib/admin-client';

export default function CampaignsCmsPage() {
  const [campaigns, setCampaigns] = useState<CampaignItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingCampaign, setEditingCampaign] = useState<Partial<CampaignItem> | null>(null);
  const [msg, setMsg] = useState('');
  const [formError, setFormError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');

  /** Görseli sunucuya yükler; sunucu WebP'ye çevirip 1800x850 alanına sığdırır. */
  const handleImageUpload = async (file: File) => {
    setUploading(true);
    setUploadError('');
    try {
      const body = new FormData();
      body.append('file', file);

      const res = await fetch('/api/admin/upload', { method: 'POST', body });
      const data = await res.json();

      if (!res.ok || !data.url) {
        setUploadError(data.error || 'Görsel yüklenemedi.');
        return;
      }

      setEditingCampaign((prev) => (prev ? { ...prev, imageUrl: data.url } : prev));
      setMsg(`Görsel yüklendi (${data.boyutKb} KB, WebP).`);
      setTimeout(() => setMsg(''), 4000);
    } catch {
      setUploadError('Bağlantı hatası; görsel yüklenemedi.');
    } finally {
      setUploading(false);
    }
  };

  const loadData = async () => {
    setLoading(true);
    const res = await fetch('/api/admin/content?fields=campaigns');
    const data = await res.json();
    setCampaigns(data.campaigns || []);
    setLoading(false);
  };

  useEffect(() => {
    let mounted = true;
    fetch('/api/admin/content?fields=campaigns')
      .then((res) => res.json())
      .then((data) => {
        if (mounted) {
          setCampaigns(data.campaigns || []);
          setLoading(false);
        }
      });
    return () => {
      mounted = false;
    };
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!editingCampaign?.title?.trim() && !editingCampaign?.imageUrl?.trim()) {
      setFormError('Kampanya başlığı veya görselden en az biri girilmelidir.');
      return;
    }
    setFormError('');
    setMsg('Kaydediliyor...');

    const res = await fetch('/api/admin/content?fields=campaigns', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        entity: 'campaigns',
        action: 'save',
        data: editingCampaign,
      }),
    });

    if (res.ok) {
      setMsg('Kampanya / Duyuru başarıyla kaydedildi!');
      setEditingCampaign(null);
      loadData();
      setTimeout(() => setMsg(''), 3000);
      return;
    }

    setMsg('');
    const data = await res.json().catch(() => ({}));
    setFormError(data.error || 'Kampanya kaydedilemedi.');
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Bu kampanyayı silmek istediğinizden emin misiniz?')) return;

    // Yanıt eskiden hiç okunmuyordu: sunucu 403/404 döndürdüğünde kampanya silinmediği
    // hâlde ekran silinmiş gibi davranıyordu.
    const sonuc = await icerikSil('campaigns', id);
    if (!sonuc.basarili) {
      setFormError(sonuc.hata);
      return;
    }

    setFormError('');
    loadData();
  };

  const createNewCampaign = () => {
    setFormError('');
    setEditingCampaign({
      id: `camp-${Date.now()}`,
      title: 'Yeni Özel Fırsat Kampanyası',
      badge: '%20 İndirim Fırsatı',
      description: 'Kampanya açıklama metni buraya gelecek.',
      ctaText: 'Hemen Teklif Al',
      ctaLink: '/teklif-al',
      isActive: true,
      // Sıra numarası SUNUCUDA atanır (listenin sonu). Burada `campaigns.length + 1`
      // hesaplanıyordu; araya bir kayıt silindiğinde uzunluk mevcut en büyük
      // numaradan küçük kalıp çakışma üretiyordu. 0 "henüz atanmadı" demektir.
      order: 0,
      showOverlayWithImage: true,
    });
  };

  /** Kayıt panelde yeni mi oluşturuldu? Sıralama alanı buna göre gösterilir. */
  const yeniKayitMi = (c: Partial<CampaignItem>) => !campaigns.some((k) => k.id === c.id);

  if (loading) return <div className="text-xs font-bold text-slate-500">Yükleniyor...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Slider &amp; Duyurular CMS</h1>
          <p className="text-xs text-slate-500 mt-0.5">Ana sayfada ve teklif modüllerinde gösterilen özel indirim kampanyalarının yönetimi.</p>
        </div>

        <button
          onClick={createNewCampaign}
          className="px-4 py-2.5 rounded-xl bg-blue-900 hover:bg-blue-950 text-white font-bold text-xs inline-flex items-center gap-2 shadow-xs"
        >
          <Plus className="w-4 h-4" />
          <span>Yeni Kampanya Ekle</span>
        </button>
      </div>

      {msg && <div className="p-3 bg-emerald-50 text-emerald-800 text-xs font-bold rounded-xl border border-emerald-200">{msg}</div>}

      {/* Editing Form */}
      {editingCampaign && (
        <div className="bg-white rounded-2xl p-6 border border-slate-300 shadow-xl space-y-4 text-xs">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <h2 className="font-bold text-slate-900 text-base">Kampanya Düzenle: {editingCampaign.title}</h2>
            <button onClick={() => setEditingCampaign(null)} className="text-slate-400 hover:text-slate-700">
              <X className="w-5 h-5" />
            </button>
          </div>

          {formError && (
            <div className="p-3 bg-rose-50 text-rose-800 text-xs font-bold rounded-xl border border-rose-200">
              {formError}
            </div>
          )}

          <form onSubmit={handleSave} className="space-y-3">
            <p className="text-[11px] text-slate-500 -mt-1">
              Başlık, rozet ve açıklama isteğe bağlıdır. Bir slayt yalnızca görsel eklenerek
              de oluşturulabilir — bu durumda aşağıdaki metin alanlarını boş bırakabilirsiniz.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="block font-bold text-slate-700 mb-1">Kampanya Başlığı</label>
                <input
                  type="text"
                  value={editingCampaign.title || ''}
                  onChange={(e) => setEditingCampaign({ ...editingCampaign, title: e.target.value })}
                  className="w-full p-2.5 rounded-lg border border-slate-300 font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Rozet / İndirim Etiketi</label>
                <input
                  type="text"
                  placeholder="Örn: %20 İndirim"
                  value={editingCampaign.badge || ''}
                  onChange={(e) => setEditingCampaign({ ...editingCampaign, badge: e.target.value })}
                  className="w-full p-2.5 rounded-lg border border-slate-300 font-bold text-amber-800"
                />
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Kampanya Açıklaması</label>
              <textarea
                rows={3}
                value={editingCampaign.description || ''}
                onChange={(e) => setEditingCampaign({ ...editingCampaign, description: e.target.value })}
                className="w-full p-2.5 rounded-lg border border-slate-300"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Buton Metni (CTA)</label>
                <input
                  type="text"
                  value={editingCampaign.ctaText || 'Hemen Teklif Al'}
                  onChange={(e) => setEditingCampaign({ ...editingCampaign, ctaText: e.target.value })}
                  className="w-full p-2.5 rounded-lg border border-slate-300 font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Buton Bağlantısı (URL)</label>
                <input
                  type="text"
                  value={editingCampaign.ctaLink || '/teklif-al'}
                  onChange={(e) => setEditingCampaign({ ...editingCampaign, ctaLink: e.target.value })}
                  className="w-full p-2.5 rounded-lg border border-slate-300 font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Slayt Görseli (isteğe bağlı)</label>

              <div className="flex flex-wrap items-center gap-2">
                <label
                  className={`px-4 py-2.5 rounded-lg font-bold text-xs inline-flex items-center gap-2 cursor-pointer transition-colors ${
                    uploading ? 'bg-slate-200 text-slate-500' : 'bg-blue-900 hover:bg-blue-950 text-white'
                  }`}
                >
                  <Upload className="w-4 h-4" />
                  <span>{uploading ? 'Yükleniyor...' : 'Görsel Yükle'}</span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/avif"
                    disabled={uploading}
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleImageUpload(file);
                      e.target.value = '';
                    }}
                  />
                </label>

                {editingCampaign.imageUrl ? (
                  <button
                    type="button"
                    onClick={() => setEditingCampaign({ ...editingCampaign, imageUrl: '' })}
                    className="px-3 py-2.5 rounded-lg bg-rose-50 text-rose-700 border border-rose-200 font-bold text-xs inline-flex items-center gap-1.5"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>Görseli Kaldır</span>
                  </button>
                ) : null}
              </div>

              <input
                type="text"
                value={editingCampaign.imageUrl || ''}
                onChange={(e) => setEditingCampaign({ ...editingCampaign, imageUrl: e.target.value })}
                placeholder="Yükleyin ya da adres yazın: /yuklenen/slider-....webp"
                className="w-full mt-2 p-2.5 rounded-lg border border-slate-300 font-mono"
              />

              {uploadError ? (
                <p className="text-[11px] text-rose-700 font-bold mt-1">{uploadError}</p>
              ) : (
                <p className="text-[11px] text-slate-500 mt-1">
                  <strong>Önerilen ölçü: 1800 × 850 px</strong> (veya aynı orandaki 900 × 425).
                  Yüklenen görsel WebP’ye çevrilir; en-boy oranı korunur, kırpılmaz, yalnızca
                  gerekiyorsa küçültülür. Boş bırakılırsa slayt yalnızca metinle gösterilir.
                  <br />
                  Bu oran, geniş ekranlardaki slayt alanıyla (yaklaşık 903 × 423 px) neredeyse
                  birebir örtüşür; görsel tam olarak kullanılır. Tarayıcı penceresi daraldıkça
                  alan orantısal olarak kısalmadığı için <strong>kenarlardan bir miktar
                  kırpılabilir</strong> — bu yüzden yazı ve yüz gibi önemli öğeleri görselin
                  ortasına yakın tutun, kenarlara yaslamayın.
                </p>
              )}

              {editingCampaign.imageUrl ? (
                <div
                  className="mt-2 relative overflow-hidden rounded-lg border border-slate-200 bg-slate-50"
                  style={{ width: 400, aspectRatio: '800 / 280.88' }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={editingCampaign.imageUrl}
                    alt="Slayt görseli önizleme"
                    className="h-full w-full object-contain object-left"
                  />
                  {(editingCampaign.showOverlayWithImage ?? true) && (
                    <div
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-0"
                      style={{
                        background:
                          'linear-gradient(to right, rgba(255,255,255,0) 42%, rgba(255,255,255,0.45) 68%, rgba(255,255,255,0.82) 88%, rgba(255,255,255,0.96) 100%)',
                      }}
                    />
                  )}
                </div>
              ) : null}
            </div>

            {/* Görsel eklendiğinde metin/buton katmanının davranışı */}
            {editingCampaign.imageUrl && (
              <div className="p-3.5 rounded-lg bg-amber-50 border border-amber-200">
                <label className="block font-bold text-slate-700 mb-2">
                  Görsel eklendiğinde başlık, rozet, açıklama ve butonlar gösterilsin mi?
                </label>
                <div className="flex flex-col sm:flex-row gap-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="showOverlayWithImage"
                      checked={(editingCampaign.showOverlayWithImage ?? true) === true}
                      onChange={() => setEditingCampaign({ ...editingCampaign, showOverlayWithImage: true })}
                      className="w-4 h-4"
                    />
                    <span>Evet, görselin üstünde/yanında göster</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="showOverlayWithImage"
                      checked={(editingCampaign.showOverlayWithImage ?? true) === false}
                      onChange={() => setEditingCampaign({ ...editingCampaign, showOverlayWithImage: false })}
                      className="w-4 h-4"
                    />
                    <span>Hayır, yalnızca görseli tam genişlikte göster</span>
                  </label>
                </div>
              </div>
            )}

            <div className="flex items-center gap-6 pt-2">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Sıralama</label>
                {yeniKayitMi(editingCampaign) ? (
                  /* Yeni kayıtta numara girilmez: sunucu listenin sonuna ekler.
                     Elle numara vermek, silinmiş kayıtlar yüzünden çakışmaya yol
                     açan asıl davranıştı. */
                  <p className="w-40 p-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-500 font-bold">
                    Otomatik (sona eklenir)
                  </p>
                ) : (
                  <>
                    <input
                      type="number"
                      min={1}
                      value={editingCampaign.order || 1}
                      onChange={(e) =>
                        setEditingCampaign({ ...editingCampaign, order: parseInt(e.target.value) || 1 })
                      }
                      className="w-24 p-2 rounded-lg border border-slate-300 font-bold"
                    />
                    <p className="text-[10px] text-slate-400 mt-1 max-w-[16rem]">
                      Kaydettiğinizde liste 1’den başlayarak yeniden numaralanır; aynı
                      numarayı verdiğiniz kayıt bu slaytın arkasına geçer.
                    </p>
                  </>
                )}
              </div>

              <div className="flex items-center gap-2 pt-5">
                <input
                  type="checkbox"
                  id="campIsActive"
                  checked={editingCampaign.isActive ?? true}
                  onChange={(e) => setEditingCampaign({ ...editingCampaign, isActive: e.target.checked })}
                  className="w-4 h-4 text-blue-900 rounded focus:ring-blue-900"
                />
                <label htmlFor="campIsActive" className="font-bold text-slate-800 cursor-pointer">
                  Aktif Kampanya (Sitede Göster)
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setEditingCampaign(null)}
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

      {/* Campaigns List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {campaigns.map((c) => (
          <div key={c.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-3 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-[10px]">
                <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-900 font-bold">
                  {c.badge || `Sıra ${c.order}`}
                </span>
                {c.isActive ? (
                  <span className="text-emerald-700 font-bold flex items-center gap-0.5">
                    <CheckCircle className="w-3 h-3" /> Yayında
                  </span>
                ) : (
                  <span className="text-slate-400 font-bold flex items-center gap-0.5">
                    <XCircle className="w-3 h-3" /> Pasif
                  </span>
                )}
              </div>

              {c.imageUrl ? (
                <div className="mt-2 overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={c.imageUrl} alt="" className="w-full object-contain" />
                </div>
              ) : null}

              <h3 className="font-extrabold text-slate-900 text-base mt-2">
                {c.title || <span className="text-slate-400">(Yalnızca görsel)</span>}
              </h3>
              {c.description ? (
                <p className="text-xs text-slate-600 mt-1 line-clamp-3 leading-relaxed">{c.description}</p>
              ) : null}
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="font-bold text-blue-900 text-[11px]">
                {c.imageUrl && c.showOverlayWithImage === false
                  ? 'Butonlar gizli'
                  : c.ctaText
                    ? `${c.ctaText} →`
                    : ''}
              </span>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => setEditingCampaign(c)}
                  className="p-1.5 rounded bg-blue-50 text-blue-900 font-bold hover:bg-blue-100"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleDelete(c.id)}
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
