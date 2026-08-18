import React from 'react';
import Link from 'next/link';
import { Logo } from './Logo';
import { CompanyInfo } from '@/lib/types';
import {
  Phone,
  Mail,
  MapPin,
  Clock,
  Shield,
  ExternalLink,
  Lock,
  MessageCircle,
  FileText,
} from 'lucide-react';
import { getGeneralWhatsAppUrl } from '@/lib/whatsapp';
import { GoogleReviewBadge } from './GoogleReviewBadge';

interface FooterProps {
  company: CompanyInfo;
}

export function Footer({ company }: FooterProps) {
  const whatsappUrl = getGeneralWhatsAppUrl(company.whatsappNumber || '905423690707');

  const popularLinks = [
    { name: 'Zorunlu Trafik Sigortası', href: '/hizmetlerimiz/zorunlu-trafik-sigortasi' },
    { name: 'Kasko Sigortası', href: '/hizmetlerimiz/kasko-sigortasi' },
    { name: 'Tamamlayıcı Sağlık Sigortası (TSS)', href: '/hizmetlerimiz/tamamlayici-saglik-sigortasi' },
    { name: 'DASK Deprem Sigortası', href: '/hizmetlerimiz/dask-zorunlu-deprem-sigortasi' },
    { name: 'Konut & Eşya Sigortası', href: '/hizmetlerimiz/konut-sigortasi' },
    { name: 'İşyeri Sigortası', href: '/hizmetlerimiz/isyeri-sigortasi' },
    { name: 'İhtiyari Mali Mesuliyet (İMM)', href: '/hizmetlerimiz/ihtiyari-mali-mesuliyet-imm' },
  ];

  const quickCorporateLinks = [
    { name: 'Hakkımızda & Kurumsal', href: '/kurumsal' },
    { name: 'Sigorta Bilgi Merkezi', href: '/bilgi-merkezi' },
    { name: 'Hasar Anında Ne Yapılmalı?', href: '/hasar-aninda' },
    { name: 'Sıkça Sorulan Sorular (S.S.S.)', href: '/sss' },
    { name: 'Sigorta Haberleri & Blog', href: '/haberler' },
    { name: 'İletişim & Konum', href: '/iletisim' },
    { name: 'Teklif Al', href: '/teklif-al' },
  ];

  return (
    <footer className="bg-[#1A1A1A] text-[#FDFCFB] pt-16 pb-8 border-t border-[#333]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 pb-12 border-b border-[#333]">
          
          {/* Column 1: Brand & Overview */}
          <div className="space-y-4">
            <Link href="/" className="inline-block" aria-label="Veli Sigorta ana sayfa">
              <Logo variant="light" height={58} />
            </Link>

            <p className="text-xs text-slate-400 leading-relaxed font-normal">
              Veli Sigorta Aracılık Hizmetleri Limited Şirketi, 2004 yılından bu yana Antalya Kepez’de bireysel ve kurumsal sigorta ihtiyaçları için hizmet veren aile işletmesidir.
            </p>

            <div className="p-4 bg-[#242424] border border-[#333] space-y-1 text-[11px]">
              <div className="font-bold text-[#FDFCFB] uppercase tracking-wider">Resmi Kurumsal Bilgiler</div>
              <div className="text-slate-400">Vergi Dairesi: <span className="text-slate-200 font-medium">{company.taxOffice} - {company.taxNumber}</span></div>
              <div className="text-slate-400">Ticaret Sicil No: <span className="text-slate-200 font-medium">{company.tradeRegistryNo}</span></div>
              <div className="text-slate-400">MERSİS No: <span className="text-slate-200 font-medium">{company.mersisNo}</span></div>
            </div>
          </div>

          {/* Column 2: Popular Insurance Products */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-white uppercase tracking-[0.2em] border-b border-[#333] pb-2 text-[#8A7E72]">
              Popüler Sigortalar
            </h3>
            <ul className="space-y-2 text-xs">
              {popularLinks.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="hover:text-white transition-colors inline-flex items-center gap-2 text-slate-300"
                  >
                    <span className="text-[#8A7E72]">&bull;</span>
                    <span>{item.name}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 3: Quick Navigation */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-white uppercase tracking-[0.2em] border-b border-[#333] pb-2 text-[#8A7E72]">
              Hızlı Bağlantılar
            </h3>
            <ul className="space-y-2 text-xs">
              {quickCorporateLinks.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="hover:text-white transition-colors inline-flex items-center gap-2 text-slate-300"
                  >
                    <span className="text-[#8A7E72]">&bull;</span>
                    <span>{item.name}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 4: Contact & Location */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-white uppercase tracking-[0.2em] border-b border-[#333] pb-2 text-[#8A7E72]">
              İletişim & Kepez Acentesi
            </h3>
            
            <div className="space-y-3 text-xs">
              <div className="flex items-start gap-2.5 text-slate-300">
                <MapPin className="w-4 h-4 text-[#F27D26] shrink-0 mt-0.5" />
                <span>{company.address}</span>
              </div>

              <div className="flex items-center gap-2.5 text-slate-200 font-semibold">
                <Phone className="w-4 h-4 text-[#F27D26] shrink-0" />
                <div className="flex flex-col">
                  <a href={`tel:${company.phones[0].replace(/\s/g, '')}`} className="hover:text-white font-serif italic text-base">
                    {company.phones[0]}
                  </a>
                  <a href={`tel:${company.phones[2].replace(/\s/g, '')}`} className="hover:text-white text-slate-400 font-normal text-[11px]">
                    GSM: {company.phones[2]}
                  </a>
                </div>
              </div>

              <div className="flex items-center gap-2.5 text-slate-300">
                <Mail className="w-4 h-4 text-[#F27D26] shrink-0" />
                <span>{company.emails[0]}</span>
              </div>

              <div className="flex items-center gap-2.5 text-slate-300">
                <Clock className="w-4 h-4 text-[#F27D26] shrink-0" />
                <span>{company.workingHours}</span>
              </div>

              <div className="pt-2 flex flex-col gap-2.5 items-start">
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#003366] hover:bg-blue-900 text-white font-bold text-xs uppercase tracking-wider transition-colors shadow-sm"
                >
                  <MessageCircle className="w-4 h-4 text-[#F27D26]" />
                  <span>WhatsApp Danışma</span>
                </a>

                <GoogleReviewBadge reviewUrl={company.googleReviewUrl} />
              </div>
            </div>
          </div>

        </div>

        {/* Bottom copyright & legal */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-[10px] uppercase tracking-widest text-[#8A7E72] font-medium">
          <div>
            &copy; {new Date().getFullYear()} {company.name}. Tüm hakları saklıdır.
          </div>

          <div className="flex items-center gap-6 flex-wrap">
            <Link
              href="/admin/login"
              className="inline-flex items-center gap-1 hover:text-white transition-colors"
              title="Yönetim Paneli Girişi"
            >
              <Lock className="w-3 h-3" />
              <span>Yönetim</span>
            </Link>
          </div>
        </div>

      </div>
    </footer>
  );
}
