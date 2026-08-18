'use client';

import React, { useEffect, useState } from 'react';
import { BarChart2, Bot, Search, ExternalLink, Globe } from 'lucide-react';

export default function AnalyticsReportPage() {
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/analytics')
      .then((res) => res.json())
      .then((data) => setAnalytics(data))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-xs font-bold text-slate-500">Yükleniyor...</div>;

  const report = analytics?.aiSearchLandingReport || [];
  const referrerCategories = analytics?.referrerCategories || {};

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
          AEO & AI Arama Motoru Yönlendirme Raporu
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          ChatGPT, Perplexity, Gemini, Google ve Bing kaynaklı trafik ve en çok iniş yapılan sayfalar.
        </p>
      </div>

      {/* Referrer Categories Badges */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        {['ChatGPT', 'Perplexity', 'Gemini', 'Google', 'Bing', 'Yandex', 'Direct'].map((source) => (
          <div key={source} className="p-4 rounded-xl bg-white border border-slate-200 text-center">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{source}</div>
            <div className="text-xl font-extrabold text-blue-900 mt-1">
              {referrerCategories[source] || 0}
            </div>
            <div className="text-[10px] text-slate-500">Ziyaretçi</div>
          </div>
        ))}
      </div>

      {/* LANDING PAGES REPORT TABLE */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-2xs space-y-4">
        <h2 className="font-bold text-slate-900 text-base flex items-center gap-2">
          <Bot className="w-5 h-5 text-blue-900" />
          <span>Arama Motoru ve AI Tarafından En Çok Yönlendirilen İniş Sayfaları</span>
        </h2>

        {report.length === 0 ? (
          <div className="text-xs text-slate-500 py-6 text-center">
            Henüz AI arama motorlarından kaydedilmiş bir giriş trafiği bulunmamaktadır.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-500 uppercase font-bold text-[10px] tracking-wider border-b border-slate-200">
                  <th className="p-3">Giriş Yapılan URL Sayfası</th>
                  <th className="p-3">Toplam AI & Arama Trafiği</th>
                  <th className="p-3">Kaynak Dağılımı</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {report.map((item: any) => (
                  <tr key={item.path} className="hover:bg-slate-50">
                    <td className="p-3 font-bold text-blue-900 font-mono">{item.path}</td>
                    <td className="p-3 font-extrabold text-slate-900">{item.totalVisits} Ziyaret</td>
                    <td className="p-3">
                      <div className="flex flex-wrap gap-1.5">
                        {Object.entries(item.sourcesBreakdown || {}).map(([src, count]: any) => (
                          <span key={src} className="px-2 py-0.5 rounded bg-slate-100 font-semibold text-[10px] text-slate-700">
                            {src}: {count}
                          </span>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
