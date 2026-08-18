'use client';

import React, { useEffect, useState } from 'react';
import { Settings, Save, Shield, Globe, Building2 } from 'lucide-react';
import { useAdminRole } from '@/hooks/useAdminRole';
import { ReadOnlyNotice } from '@/components/ReadOnlyNotice';

export default function SettingsCmsPage() {
  const { canEdit, loading: roleLoading } = useAdminRole();
  const [companyInfo, setCompanyInfo] = useState<any>(null);
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');

  const loadData = async () => {
    setLoading(true);
    const res = await fetch('/api/admin/content?fields=companyInfo,settings');
    const data = await res.json();
    setCompanyInfo(data.companyInfo);
    setSettings(data.settings);
    setLoading(false);
  };

  useEffect(() => {
    let mounted = true;
    fetch('/api/admin/content?fields=companyInfo,settings')
      .then((res) => res.json())
      .then((data) => {
        if (mounted) {
          if (data.companyInfo) setCompanyInfo(data.companyInfo);
          if (data.settings) setSettings(data.settings);
          setLoading(false);
        }
      });
    return () => {
      mounted = false;
    };
  }, []);

  const handleSaveCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg('Firma bilgileri güncelleniyor...');

    const res = await fetch('/api/admin/content?fields=companyInfo,settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        entity: 'companyInfo',
        data: companyInfo,
      }),
    });

    if (res.ok) {
      setMsg('Firma bilgileri kaydedildi!');
      setTimeout(() => setMsg(''), 3000);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg('Site ayarları güncelleniyor...');

    const res = await fetch('/api/admin/content?fields=companyInfo,settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        entity: 'settings',
        data: settings,
      }),
    });

    if (res.ok) {
      setMsg('Site ayarları kaydedildi!');
      setTimeout(() => setMsg(''), 3000);
    }
  };


  if (loading) return <div className="text-xs font-bold text-slate-500">Yükleniyor...</div>;

  return (
    <div className="space-y-8">
      {!roleLoading && !canEdit && <ReadOnlyNotice />}

      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Site & Firma Ayarları</h1>
        <p className="text-xs text-slate-500 mt-0.5">Firma bilgileri, SEO, AI Arama görünürlüğü ve güvenlik ayarları.</p>
      </div>

      {msg && <div className="p-3 bg-emerald-50 text-emerald-800 text-xs font-bold rounded-xl">{msg}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Company Info Form */}
        <form onSubmit={handleSaveCompany} className="bg-white rounded-2xl p-6 border border-slate-200 shadow-2xs space-y-4 text-xs">
          <h2 className="font-bold text-slate-900 text-base border-b border-slate-100 pb-3 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-blue-900" />
            <span>Firma & İletişim Bilgileri</span>
          </h2>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Şirket Resmi Unvanı</label>
            <input
              type="text"
              value={companyInfo.name || ''}
              onChange={(e) => setCompanyInfo({ ...companyInfo, name: e.target.value })}
              className="w-full p-2.5 rounded-lg border border-slate-300 font-bold"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Adres</label>
            <textarea
              rows={2}
              value={companyInfo.address || ''}
              onChange={(e) => setCompanyInfo({ ...companyInfo, address: e.target.value })}
              className="w-full p-2.5 rounded-lg border border-slate-300"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Telefon 1 (Santral)</label>
              <input
                type="text"
                value={companyInfo.phones[0] || ''}
                onChange={(e) => {
                  const copy = [...companyInfo.phones];
                  copy[0] = e.target.value;
                  setCompanyInfo({ ...companyInfo, phones: copy });
                }}
                className="w-full p-2.5 rounded-lg border border-slate-300"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">WhatsApp Numarası</label>
              <input
                type="text"
                value={companyInfo.whatsappNumber || ''}
                onChange={(e) => setCompanyInfo({ ...companyInfo, whatsappNumber: e.target.value })}
                className="w-full p-2.5 rounded-lg border border-slate-300 font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Vergi Dairesi & No</label>
              <input
                type="text"
                value={`${companyInfo.taxOffice} / ${companyInfo.taxNumber}`}
                onChange={(e) => {
                  const parts = e.target.value.split('/');
                  setCompanyInfo({
                    ...companyInfo,
                    taxOffice: parts[0]?.trim() || '',
                    taxNumber: parts[1]?.trim() || '',
                  });
                }}
                className="w-full p-2.5 rounded-lg border border-slate-300"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">MERSİS No</label>
              <input
                type="text"
                value={companyInfo.mersisNo || ''}
                onChange={(e) => setCompanyInfo({ ...companyInfo, mersisNo: e.target.value })}
                className="w-full p-2.5 rounded-lg border border-slate-300 font-mono"
              />
            </div>
          </div>

          <button type="submit" disabled={!canEdit} className={`w-full py-2.5 rounded-xl font-bold inline-flex items-center justify-center gap-2 ${canEdit ? 'bg-blue-900 text-white' : 'bg-slate-200 text-slate-500 cursor-not-allowed'}`}>
            <Save className="w-4 h-4" />
            <span>Firma Bilgilerini Kaydet</span>
          </button>
        </form>

        {/* Site & SEO / AI Settings Form */}
        <form onSubmit={handleSaveSettings} className="bg-white rounded-2xl p-6 border border-slate-200 shadow-2xs space-y-4 text-xs">
          <h2 className="font-bold text-slate-900 text-base border-b border-slate-100 pb-3 flex items-center gap-2">
            <Globe className="w-5 h-5 text-blue-900" />
            <span>SEO & AI Arama Motoru Ayarları</span>
          </h2>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Varsayılan Meta Başlık (Title)</label>
            <input
              type="text"
              value={settings.siteTitle || ''}
              onChange={(e) => setSettings({ ...settings, siteTitle: e.target.value })}
              className="w-full p-2.5 rounded-lg border border-slate-300 font-bold"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Varsayılan Meta Açıklama (Description)</label>
            <textarea
              rows={2}
              value={settings.metaDescription || ''}
              onChange={(e) => setSettings({ ...settings, metaDescription: e.target.value })}
              className="w-full p-2.5 rounded-lg border border-slate-300"
            />
          </div>

          <div className="space-y-2 pt-2 border-t border-slate-100">
            <label className="flex items-center gap-2 font-bold text-slate-800 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.aiSearchVisible || false}
                onChange={(e) => setSettings({ ...settings, aiSearchVisible: e.target.checked })}
                className="w-4 h-4 text-emerald-600 rounded"
              />
              <span>AI Arama Botlarına Açık (ChatGPT, Perplexity, Gemini)</span>
            </label>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Özel Robots.txt İçeriği</label>
            <textarea
              rows={4}
              value={settings.robotsTxtCustom || ''}
              onChange={(e) => setSettings({ ...settings, robotsTxtCustom: e.target.value })}
              className="w-full p-2.5 rounded-lg border border-slate-300 font-mono text-[11px]"
            />
          </div>

          <button type="submit" disabled={!canEdit} className={`w-full py-2.5 rounded-xl font-bold inline-flex items-center justify-center gap-2 ${canEdit ? 'bg-blue-900 text-white' : 'bg-slate-200 text-slate-500 cursor-not-allowed'}`}>
            <Save className="w-4 h-4" />
            <span>SEO & AI Ayarlarını Kaydet</span>
          </button>
        </form>

      </div>

    </div>
  );
}
