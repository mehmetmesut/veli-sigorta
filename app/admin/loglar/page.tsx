'use client';

import React, { useEffect, useState } from 'react';
import { List, Shield, Search, Trash2, RefreshCw } from 'lucide-react';
import { metinAramasiEslesiyorMu } from '@/lib/turkce';

export default function LogsPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const loadData = () => {
    setLoading(true);
    fetch('/api/admin/content?fields=auditLogs')
      .then((res) => res.json())
      .then((data) => setLogs(data.auditLogs || []))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    let mounted = true;
    fetch('/api/admin/content?fields=auditLogs')
      .then((res) => res.json())
      .then((data) => {
        if (mounted) setLogs(data.auditLogs || []);
      })
      .catch((err) => console.error(err))
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const handleClearLogs = async () => {
    if (!confirm('Tüm sistem log geçmişini temizlemek istediğinizden emin misiniz?')) return;

    const res = await fetch('/api/admin/content?fields=auditLogs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        entity: 'auditLogs',
        action: 'clear',
      }),
    });

    if (res.ok) {
      loadData();
    }
  };

  // Kayıt ayrıntıları Türkçe metin içeriyor ("Müşteri güncellendi: Işık Turizm"),
  // bu yüzden arama harf katlamalı ortak kuralı kullanır (bkz. lib/turkce.ts).
  // E-posta ASCII ama aynı kuraldan geçmesi zarar vermez; ayrı yol tutmak
  // kuralın atlanmasına açık kapı bırakırdı.
  const filteredLogs = logs.filter((l) =>
    metinAramasiEslesiyorMu([l.action, l.details, l.userEmail], search),
  );

  if (loading) return <div className="text-xs font-bold text-slate-500">Yükleniyor...</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Sistem Audit Logları</h1>
          <p className="text-xs text-slate-500 mt-0.5">Yönetici paneli güvenlik kayıtları ve işlem geçmişi.</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs inline-flex items-center gap-1.5"
            title="Yenile"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          <button
            onClick={handleClearLogs}
            className="px-3.5 py-2.5 rounded-xl bg-rose-50 text-rose-800 hover:bg-rose-100 font-bold text-xs inline-flex items-center gap-2 border border-rose-200"
          >
            <Trash2 className="w-4 h-4" />
            <span>Log Geçmişini Temizle</span>
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs flex items-center justify-between gap-4">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="İşlem veya açıklama ara..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-900 font-medium"
          />
        </div>

        <span className="text-xs font-bold text-slate-500">{filteredLogs.length} Kayıt Gösteriliyor</span>
      </div>

      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 uppercase font-bold text-[10px] tracking-wider border-b border-slate-200">
                <th className="p-3">Zaman</th>
                <th className="p-3">Kullanıcı</th>
                <th className="p-3">İşlem Eylemi</th>
                <th className="p-3">Açıklama</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLogs.map((log: any) => (
                <tr key={log.id} className="hover:bg-slate-50">
                  <td className="p-3 font-mono text-slate-500 whitespace-nowrap text-[11px]">
                    {new Date(log.timestamp).toLocaleString('tr-TR')}
                  </td>
                  <td className="p-3 font-bold text-slate-800">{log.userEmail}</td>
                  <td className="p-3">
                    <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-900 font-bold text-[10px] font-mono">
                      {log.action}
                    </span>
                  </td>
                  <td className="p-3 text-slate-600 font-medium">{log.details}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

