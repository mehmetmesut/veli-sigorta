'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Car,
  Home,
  HeartPulse,
  Building2,
  Plane,
  Award,
  ArrowRight,
  ShieldCheck,
  MessageCircle,
  Zap,
} from 'lucide-react';
import { getWhatsAppUrl } from '@/lib/whatsapp';

interface IntentOption {
  id: string;
  label: string;
  subLabel: string;
  icon: React.ElementType;
  color: string;
  badge: string;
  popularServices: {
    title: string;
    slug: string;
    desc: string;
    tag: string;
  }[];
}

const INTENT_OPTIONS: IntentOption[] = [
  {
    id: 'arac',
    label: 'Aracımı',
    subLabel: 'Oto, Trafik, Kasko & İMM',
    icon: Car,
    color: 'from-blue-600 to-indigo-700',
    badge: 'Trafik & Kasko',
    popularServices: [
      { title: 'Zorunlu Trafik Sigortası', slug: 'zorunlu-trafik-sigortasi', desc: 'Yasal zorunlu karşı taraf koruması', tag: 'Zorunlu' },
      { title: 'Genişletilmiş Kasko Sigortası', slug: 'kasko-sigortasi', desc: 'Aracınız için kaza, çalınma, dolu ve sel koruması', tag: 'Özel Koruma' },
      { title: 'İMM Sigortası', slug: 'ihtiyari-mali-mesuliyet-imm', desc: 'Trafik sigortası limitini aşan kapsam içi sorumluluklar için ek teminat', tag: 'Ekstra Güvence' },
    ],
  },
  {
    id: 'saglik',
    label: 'Sağlığımı',
    subLabel: 'TSS, ÖSS & Ferdi Kaza',
    icon: HeartPulse,
    color: 'from-rose-600 to-pink-700',
    badge: 'Sağlık Seçenekleri',
    popularServices: [
      { title: 'Tamamlayıcı Sağlık (TSS)', slug: 'tamamlayici-saglik-sigortasi', desc: 'Aktif SGK ve poliçe şartlarına bağlı sağlık teminatları', tag: 'Bilgi Al' },
      { title: 'Özel Sağlık Sigortası (ÖSS)', slug: 'ozel-saglik-sigortasi', desc: 'Seçilen kurum ağı ve poliçe şartlarına göre sağlık teminatları', tag: 'Sağlık Güvencesi' },
      { title: 'Ferdi Kaza Sigortası', slug: 'ferdi-kaza-sigortasi', desc: 'Beklenmedik kazalara karşı toplu nakit desteği', tag: 'Ekonomik' },
    ],
  },
  {
    id: 'ev',
    label: 'Evimi & DASK',
    subLabel: 'DASK & Eşya Sigortası',
    icon: Home,
    color: 'from-amber-600 to-orange-700',
    badge: 'DASK & Konut',
    popularServices: [
      { title: 'DASK Zorunlu Deprem Sigortası', slug: 'dask-zorunlu-deprem-sigortasi', desc: 'Yasal binalar ve konutlar için zorunlu devlet güvencesi', tag: 'Zorunlu' },
      { title: 'Konut & Eşya Sigortası', slug: 'konut-sigortasi', desc: 'Yangın, dahili su, hırsızlık ve sorumluluk için seçilebilir teminatlar', tag: 'Konut Güvencesi' },
    ],
  },
  {
    id: 'isyeri',
    label: 'İşyerimi',
    subLabel: 'Dükkan, Stok & İşveren',
    icon: Building2,
    color: 'from-slate-700 to-slate-900',
    badge: 'Esnaf & Kurumsal',
    popularServices: [
      { title: 'İşyeri Paket Sigortası', slug: 'isyeri-sigortasi', desc: 'Dükkan, demirbaş, stok ürünler ve iş durması koruması', tag: 'Tüm İşyerleri' },
      { title: 'İşveren Sorumluluk Sigortası', slug: 'isveren-sorumluluk-sigortasi', desc: 'İş kazaları, SGK rücu davaları ve tazminat güvencesi', tag: 'Kritik Risk' },
    ],
  },
  {
    id: 'seyahat',
    label: 'Seyahatimi',
    subLabel: 'Vize & Schengen Sigortası',
    icon: Plane,
    color: 'from-sky-600 to-blue-700',
    badge: 'Schengen Vize Uyumlu',
    popularServices: [
      { title: 'Seyahat Sağlık Sigortası', slug: 'seyahat-saglik-sigortasi', desc: 'Seyahat ve vize başvurularında istenebilen sağlık sigortası seçenekleri', tag: 'Bilgi Al' },
    ],
  },
  {
    id: 'meslek',
    label: 'Mesleğimi',
    subLabel: 'Mesleki Hata & Siber Risk',
    icon: Award,
    color: 'from-emerald-600 to-teal-800',
    badge: 'SMMM, Doktor, Siber',
    popularServices: [
      { title: 'Mesleki Sorumluluk Sigortası', slug: 'mesleki-sorumluluk-sigortasi', desc: 'SMMM mali müşavir, hekim, avukat ve mimar güvencesi', tag: 'Uzmanlık' },
      { title: 'Siber Risk Sigortası', slug: 'siber-risk-sigortasi', desc: 'Siber olay müdahalesi ve poliçeye bağlı dijital risk teminatları', tag: 'Dijital Risk' },
    ],
  },
];

interface IntentSelectorProps {
  whatsappNumber: string;
}

export function IntentSelector({ whatsappNumber }: IntentSelectorProps) {
  const [activeTab, setActiveTab] = useState('arac');

  const activeOption = INTENT_OPTIONS.find((o) => o.id === activeTab) || INTENT_OPTIONS[0];

  return (
    <section className="bg-[#FDFCFB] py-14 px-4 sm:px-6 lg:px-8 border-y border-[#E5E1DB]">
      <div className="max-w-7xl mx-auto">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <span className="text-[11px] font-semibold text-[#8A7E72] uppercase tracking-[0.3em] block mb-2">
            Hızlı Sigorta Yönlendiricisi
          </span>
          <h2 className="text-3xl sm:text-4xl font-serif text-[#1A1A1A] tracking-tight">
            Neyi Sigortalamak İstiyorsunuz?
          </h2>
          <p className="text-base text-[#555] mt-3 leading-relaxed">
            Aşağıdan korumak istediğiniz alanı seçin ve ilgili sigorta seçeneklerini inceleyin.
          </p>
        </div>

        {/* Tab Buttons */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-px bg-[#E5E1DB] border border-[#E5E1DB] mb-10">
          {INTENT_OPTIONS.map((option) => {
            const isSelected = option.id === activeTab;
            const Icon = option.icon;

            return (
              <button
                key={option.id}
                onClick={() => setActiveTab(option.id)}
                className={`p-5 text-left transition-all duration-150 flex flex-col justify-between cursor-pointer ${
                  isSelected
                    ? 'bg-[#1A1A1A] text-white'
                    : 'bg-white hover:bg-[#F8F6F3] text-[#1A1A1A]'
                }`}
              >
                <div className="flex items-center justify-between w-full mb-4">
                  <div
                    className={`w-9 h-9 flex items-center justify-center ${
                      isSelected ? 'bg-white/10 text-[#F27D26]' : 'text-[#003366]'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  {isSelected && <span className="w-1.5 h-1.5 bg-[#F27D26]"></span>}
                </div>
                <div>
                  <div className={`font-bold text-sm uppercase tracking-wider ${isSelected ? 'text-white' : 'text-[#1A1A1A]'}`}>
                    {option.label}
                  </div>
                  <div className={`text-[10px] mt-1 leading-tight truncate ${isSelected ? 'text-slate-300' : 'text-[#8A7E72]'}`}>
                    {option.subLabel}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Active Tab Panel Content */}
        <div className="bg-white border border-[#E5E1DB] p-6 sm:p-10">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-[#E5E1DB] mb-8">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-[#003366] text-white flex items-center justify-center shrink-0">
                <activeOption.icon className="w-6 h-6 text-[#F27D26]" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#8A7E72]">
                  {activeOption.badge}
                </span>
                <h3 className="text-xl font-serif font-bold text-[#1A1A1A] mt-0.5">
                  {activeOption.label} İçin Önerilen Poliçe Paketlerimiz
                </h3>
              </div>
            </div>

            <Link
              href="/hizmetlerimiz"
              className="text-xs uppercase tracking-widest font-bold text-[#003366] hover:underline underline-offset-4 flex items-center gap-1.5"
            >
              <span>Tüm Sigorta Ürünlerini Listele</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {activeOption.popularServices.map((service) => {
              const whatsappUrl = getWhatsAppUrl(whatsappNumber, service.title, 'teklif');

              return (
                <div
                  key={service.slug}
                  className="bg-[#FDFCFB] p-6 border border-[#E5E1DB] hover:border-[#1A1A1A] transition-all flex flex-col justify-between group"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <span className="text-[9px] font-bold uppercase tracking-[0.2em] px-2 py-0.5 bg-[#1A1A1A] text-white">
                        {service.tag}
                      </span>
                      <ShieldCheck className="w-4 h-4 text-[#003366]" />
                    </div>

                    <h4 className="font-bold text-[#1A1A1A] text-base group-hover:text-[#003366] transition-colors uppercase tracking-wider">
                      {service.title}
                    </h4>

                    <p className="text-xs text-[#555] mt-2 leading-relaxed">
                      {service.desc}
                    </p>
                  </div>

                  <div className="pt-6 mt-6 border-t border-[#E5E1DB] flex items-center gap-3">
                    <Link
                      href={`/hizmetlerimiz/${service.slug}`}
                      className="flex-1 text-center py-2.5 px-3 border border-[#1A1A1A] hover:bg-[#1A1A1A] hover:text-white text-[#1A1A1A] font-bold text-[11px] uppercase tracking-wider transition-all"
                    >
                      Detay İncele
                    </Link>

                    <a
                      href={whatsappUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="py-2.5 px-4 bg-[#003366] hover:bg-blue-900 text-white font-bold text-[11px] uppercase tracking-wider inline-flex items-center gap-1.5 transition-colors"
                      title="WhatsApp ile Teklif Al"
                    >
                      <MessageCircle className="w-3.5 h-3.5 text-[#F27D26]" />
                      <span>Teklif Al</span>
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </section>
  );
}
