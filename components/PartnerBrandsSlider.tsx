'use client';

import React from 'react';
import { PartnerCompany } from '@/lib/types';
import { ShieldCheck, Award } from 'lucide-react';
import { ContentImage } from '@/components/ContentImage';

interface PartnerBrandsSliderProps {
  partners?: PartnerCompany[];
}

export function PartnerBrandsSlider({ partners = [] }: PartnerBrandsSliderProps) {
  const activePartners = partners.filter((p) => p.isActive).sort((a, b) => a.order - b.order);

  if (activePartners.length === 0) return null;

  return (
    <section className="py-12 bg-white border-b border-[#E5E1DB] overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-8 space-y-6">
        {/* Sağdaki açıklama satırı kaldırıldı: ziyaretçiye değil yöneticiye
            seslenen bir cümleydi ("yönetim panelinde doğrulanan…"), sitenin
            önyüzünde iç işleyişi anlatmasının bir karşılığı yok. */}
        <div className="border-b border-[#E5E1DB] pb-3">
          <span className="text-[10px] font-extrabold uppercase tracking-[0.25em] text-[#8A7E72] block">
            Acentelik Portföyümüz
          </span>
          <h2 className="text-xl sm:text-2xl font-serif font-bold text-[#1A1A1A]">
            Anlaşmalı Sigorta Şirketleri
          </h2>
        </div>

        {/* Partners Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 sm:gap-4">
          {activePartners.map((partner) => (
            <div
              key={partner.id}
              className="p-3.5 bg-[#FDFCFB] border border-[#E5E1DB] hover:border-[#003366] transition-all flex flex-col items-center text-center justify-between group"
            >
              <div className="w-full h-12 flex items-center justify-center p-1">
                <ContentImage
                  src={partner.logoUrl}
                  alt={partner.name}
                  className="max-h-full max-w-full object-contain filter grayscale group-hover:grayscale-0 transition-all duration-300"
                  placeholderClassName="w-full h-full bg-[#F5F2EC] flex items-center justify-center text-[#B9B0A4]"
                />
              </div>

              <div className="mt-2 text-center w-full">
                <div className="font-bold text-[11px] text-[#1A1A1A] group-hover:text-[#003366] truncate uppercase tracking-wider">
                  {partner.name}
                </div>
                {partner.discountNote && (
                  <div className="text-[9px] font-bold text-[#F27D26] bg-[#FFF8F2] px-1.5 py-0.5 mt-1 rounded border border-[#F27D26]/20 truncate">
                    {partner.discountNote}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
