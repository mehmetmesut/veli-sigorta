'use client';

import React, { useId, useState } from 'react';
import { MessageCircle, Phone, Shield } from 'lucide-react';
import { getWhatsAppUrl } from '@/lib/whatsapp';
import { SERVICE_OPTIONS, VARSAYILAN_SERVICE_OPTION } from '@/lib/service-options';

interface QuickQuoteFormProps {
  /** Bağlantıdan gelen ön seçim. Listede yoksa ilk ürüne düşülür. */
  defaultServiceTitle?: string;
  whatsappNumber: string;
}

export function QuickQuoteForm({
  defaultServiceTitle = VARSAYILAN_SERVICE_OPTION,
  whatsappNumber = '905423690707',
}: QuickQuoteFormProps) {
  const [service, setService] = useState(defaultServiceTitle);
  const whatsappUrl = getWhatsAppUrl(whatsappNumber, service, 'teklif');

  // Bu form aynı sayfada birden çok kez render edilebiliyor (ana sayfa, iletişim,
  // teklif-al, hizmet detayı). Sabit id yinelenme yaratacağı için useId kullanılır.
  const baseId = useId();
  const selectId = `${baseId}-sigorta-urunu`;
  const helpTextId = `${baseId}-aciklama`;

  return (
    <div className="bg-[#FDFCFB] p-6 sm:p-8 border border-[#E5E1DB] shadow-md">
      <div className="flex items-center gap-3 mb-5 border-b border-[#E5E1DB] pb-4">
        <div className="w-10 h-10 bg-[#003366] text-white flex items-center justify-center shrink-0">
          <Shield className="w-5 h-5 text-[#F27D26]" />
        </div>
        <div>
          <h3 className="text-lg font-serif font-bold text-[#1A1A1A]">WhatsApp’tan Teklif İste</h3>
          <p className="text-[11px] text-[#8A7E72] uppercase tracking-wider">
            İlgilendiğiniz sigorta türünü seçerek görüşmeyi başlatın
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <label
            htmlFor={selectId}
            className="block text-[10px] font-bold text-[#8A7E72] uppercase tracking-[0.2em] mb-1"
          >
            Sigorta Ürünü
          </label>
          <select
            id={selectId}
            aria-describedby={helpTextId}
            value={service}
            onChange={(event) => setService(event.target.value)}
            className="w-full px-3.5 py-2.5 border border-[#E5E1DB] text-xs font-bold text-[#1A1A1A] bg-white focus:outline-hidden focus:border-[#1A1A1A]"
          >
            {SERVICE_OPTIONS.map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        </div>

        <p id={helpTextId} className="text-xs leading-relaxed text-[#555]">
          Bu form kişisel bilgi toplamaz ve site veritabanına teklif kaydı oluşturmaz. WhatsApp
          açıldığında mesajı kontrol edip göndermeye siz karar verirsiniz.
        </p>

        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full py-3.5 px-4 bg-[#003366] hover:bg-blue-900 text-white font-bold text-xs uppercase tracking-widest inline-flex items-center justify-center gap-2 transition-colors"
        >
          <MessageCircle className="w-4 h-4 text-[#F27D26]" />
          <span>WhatsApp’ta Teklif Mesajı Oluştur</span>
        </a>

        <div className="text-[10px] uppercase tracking-widest text-[#8A7E72] text-center pt-3 border-t border-[#E5E1DB] flex items-center justify-center gap-1">
          <Phone className="w-3 h-3 text-[#003366]" />
          <span>Müşteri Hizmetleri: 0242 334 12 12 & 0542 369 07 07</span>
        </div>
      </div>
    </div>
  );
}
