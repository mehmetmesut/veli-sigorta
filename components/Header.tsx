'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Logo } from './Logo';
import {
  Phone,
  MessageCircle,
  Clock,
  MapPin,
  ChevronDown,
  Menu,
  X,
  Shield,
  Car,
  HeartPulse,
  Home,
  Building2,
  Briefcase,
  FileText,
  AlertCircle,
  HelpCircle,
  Newspaper,
  PhoneCall,
} from 'lucide-react';
import { getGeneralWhatsAppUrl } from '@/lib/whatsapp';

interface HeaderProps {
  phones: string[];
  whatsappNumber: string;
}

export function Header({
  phones = ['0242 334 12 12', '0242 345 08 08', '0542 369 07 07'],
  whatsappNumber = '905423690707',
}: HeaderProps) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [servicesDropdownOpen, setServicesDropdownOpen] = useState(false);

  const mainPhone = phones[0] || '0242 334 12 12';
  const mobilePhone = phones[2] || '0542 369 07 07';
  const whatsappUrl = getGeneralWhatsAppUrl(whatsappNumber);

  const navLinks = [
    { href: '/', label: 'Ana Sayfa' },
    { href: '/hizmetlerimiz', label: 'Hizmetlerimiz', hasDropdown: true },
    { href: '/kurumsal', label: 'Kurumsal' },
    { href: '/hasar-aninda', label: 'Hasar Anında' },
    { href: '/sss', label: 'S.S.S.' },
    { href: '/haberler', label: 'Haberler' },
    { href: '/iletisim', label: 'İletişim' },
  ];

  const popularServices = [
    { title: 'Zorunlu Trafik Sigortası', slug: 'zorunlu-trafik-sigortasi', icon: Car, desc: 'Karşı taraf zararları güvencesi' },
    { title: 'Kasko Sigortası', slug: 'kasko-sigortasi', icon: Car, desc: 'Kendi aracınız için poliçeye bağlı koruma' },
    { title: 'Tamamlayıcı Sağlık (TSS)', slug: 'tamamlayici-saglik-sigortasi', icon: HeartPulse, desc: 'Poliçeye bağlı özel sağlık kurumu teminatları' },
    { title: 'DASK Deprem Sigortası', slug: 'dask-zorunlu-deprem-sigortasi', icon: Home, desc: 'Zorunlu binalar ve konutlar' },
    { title: 'Konut & Eşya Sigortası', slug: 'konut-sigortasi', icon: Home, desc: 'Poliçeye bağlı bina, eşya ve sorumluluk teminatları' },
    { title: 'Seyahat Sağlık Sigortası', slug: 'seyahat-saglik-sigortasi', icon: Shield, desc: 'Hedef ülke ve poliçe koşullarına göre seyahat güvencesi' },
  ];

  return (
    <header className="sticky top-0 z-50 bg-[#FDFCFB] border-b border-[#E5E1DB] transition-all">
      {/* Top Utility Bar */}
      <div className="bg-[#1A1A1A] text-[#FDFCFB] px-4 sm:px-8 py-2.5 text-[11px] tracking-widest uppercase">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-6 flex-wrap">
            <span className="font-medium tracking-wider">
              Antalya / Kepez &bull; {mainPhone}
            </span>
            <span className="hidden sm:inline opacity-60">•</span>
            <span className="hidden sm:inline opacity-80">{mobilePhone}</span>
          </div>

          {/*
            "Kurumsal" bağlantısı buradan kaldırıldı: ana menüde zaten var ve
            aynı sayfaya iki ayrı bağlantı olması gereksiz tekrardı (kullanıcı isteği).
          */}
          <div className="flex items-center gap-6 ml-auto font-medium">
            <Link href="/bilgi-merkezi" className="opacity-60 hover:opacity-100 transition-opacity hidden md:inline">Bilgi Merkezi</Link>
            {/*
              Hasar anında bağlantısı acil durum vurgusu taşır: kırmızı zemin,
              tam opaklık ve nabız gibi atan uyarı ikonu. Amaç, hasar anında
              yardım arayan kullanıcının bunu ilk bakışta fark etmesi.
            */}
            <Link
              href="/hasar-aninda"
              className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 bg-[#D92D20] hover:bg-[#B42318] text-white font-bold rounded-sm transition-colors"
            >
              <AlertCircle className="w-3.5 h-3.5 animate-pulse" />
              <span>Acil · Hasar Anında</span>
            </Link>
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#F27D26] font-bold flex items-center gap-1.5 hover:underline"
            >
              <MessageCircle className="w-3.5 h-3.5 fill-[#F27D26]" />
              <span>WhatsApp</span>
            </a>
          </div>
        </div>
      </div>

      {/*
        Main Navigation Bar
        Üst çubuk (utility bar) ve site genelindeki bölümler iç boşluğu (px-4 sm:px-8)
        tam genişlikteki dış sarmalayıcıya koyup `max-w-7xl mx-auto`'yu içeride ek
        boşluksuz ortalıyor. Bu satır eskiden ikisini tek `div`'de birleştiriyordu,
        bu da içeriği (logo) o ortak hizadan 32px sağa kaydırıyordu — logo ile alttaki
        slider/başlık içeriği görsel olarak hizasız duruyordu.
      */}
      <div className="px-4 sm:px-8">
        <div className="max-w-7xl mx-auto h-20 flex items-center justify-between gap-4">
        <Link href="/" className="group py-2 shrink-0" aria-label="Veli Sigorta ana sayfa">
          <Logo variant="full" height={52} priority />
        </Link>

        {/* Desktop Menu */}
        <nav className="hidden lg:flex items-center gap-4 xl:gap-7 text-xs xl:text-[13px] font-semibold uppercase tracking-wider">
          {navLinks.map((link) => {
            const isActive = pathname === link.href || (link.href !== '/' && pathname.startsWith(link.href));

            if (link.hasDropdown) {
              return (
                <div
                  key={link.href}
                  className="relative group py-2 shrink-0"
                  onMouseEnter={() => setServicesDropdownOpen(true)}
                  onMouseLeave={() => setServicesDropdownOpen(false)}
                >
                  <Link
                    href={link.href}
                    className={`inline-flex items-center gap-1 whitespace-nowrap transition-all ${
                      isActive
                        ? 'border-b-2 border-[#1A1A1A] text-[#1A1A1A] font-bold pb-0.5'
                        : 'text-[#1A1A1A] hover:opacity-60'
                    }`}
                  >
                    <span>{link.label}</span>
                    <ChevronDown className="w-3.5 h-3.5 text-[#8A7E72] group-hover:rotate-180 transition-transform duration-200" />
                  </Link>

                  {/* Dropdown Menu */}
                  {servicesDropdownOpen && (
                    <div className="absolute top-full left-0 w-88 bg-[#FDFCFB] border border-[#E5E1DB] p-3 shadow-xl grid grid-cols-1 gap-1 z-50">
                      <div className="px-3 py-1.5 border-b border-[#E5E1DB] flex items-center justify-between mb-1">
                        <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#8A7E72]">Öne Çıkan Sigortalar</span>
                        <Link href="/hizmetlerimiz" className="text-[11px] font-bold text-[#003366] hover:underline">
                          Tümünü Gör →
                        </Link>
                      </div>
                      {popularServices.map((srv) => (
                        <Link
                          key={srv.slug}
                          href={`/hizmetlerimiz/${srv.slug}`}
                          className="flex items-start gap-3 p-2 hover:bg-[#F8F6F3] transition-colors group/item"
                        >
                          <div className="p-1.5 bg-[#003366] text-white shrink-0">
                            <srv.icon className="w-3.5 h-3.5" />
                          </div>
                          <div>
                            <div className="text-xs font-bold text-[#1A1A1A] group-hover/item:text-[#003366] uppercase tracking-wider">
                              {srv.title}
                            </div>
                            <div className="text-[10px] text-[#8A7E72] leading-tight">{srv.desc}</div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              );
            }

            return (
              <Link
                key={link.href}
                href={link.href}
                className={`whitespace-nowrap shrink-0 transition-all ${
                  isActive
                    ? 'border-b-2 border-[#1A1A1A] text-[#1A1A1A] font-bold pb-0.5'
                    : 'text-[#1A1A1A] hover:opacity-60'
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* CTA Button */}
        <div className="hidden sm:flex items-center gap-3 shrink-0">
          <Link
            href="/teklif-al"
            className="bg-[#1A1A1A] text-white px-5 py-2.5 xl:px-6 xl:py-3 text-xs uppercase tracking-widest font-bold hover:bg-[#003366] transition-colors inline-flex items-center gap-2 whitespace-nowrap"
          >
            <Shield className="w-3.5 h-3.5 text-[#F27D26]" />
            <span>Teklif Al</span>
          </Link>
        </div>

        {/* Mobile Menu Toggle */}
        <button
          type="button"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="lg:hidden p-2 text-[#1A1A1A]"
          aria-label="Menüyü Aç/Kapat"
        >
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-[#FDFCFB] border-b border-[#E5E1DB] px-6 pt-3 pb-8 space-y-4">
          <div className="space-y-2">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`block py-2 text-sm font-bold uppercase tracking-wider ${
                  pathname === link.href ? 'text-[#003366] border-l-2 border-[#003366] pl-3' : 'text-[#1A1A1A]'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>

          <div className="pt-4 border-t border-[#E5E1DB] flex flex-col gap-3">
            <Link
              href="/teklif-al"
              onClick={() => setMobileMenuOpen(false)}
              className="w-full text-center py-3 bg-[#1A1A1A] text-white font-bold text-xs uppercase tracking-widest"
            >
              Hemen Sigorta Teklifi Al
            </Link>
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full text-center py-3 bg-[#003366] text-white font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2"
            >
              <MessageCircle className="w-4 h-4" />
              <span>WhatsApp Danışma</span>
            </a>
          </div>
        </div>
      )}
    </header>
  );
}
