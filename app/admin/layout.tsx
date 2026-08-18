'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import type { AdminRole } from '@/lib/auth';
import { sayfayaErisebilirMi } from '@/lib/permissions';
import {
  Shield,
  LayoutDashboard,
  ShieldCheck,
  FileText,
  HelpCircle,
  Settings,
  BarChart2,
  KeyRound,
  List,
  LogOut,
  ExternalLink,
  MessageSquare,
  Users,
  Building2,
  Globe,
  Network,
  UserCog,
  CalendarClock,
} from 'lucide-react';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  /** Menüyü ve sayfa erişimini rol belirler; kimlik doğrulama yanıtından gelir. */
  const [role, setRole] = useState<AdminRole | null>(null);

  const isLoginPage = pathname === '/admin/login';

  useEffect(() => {
    if (isLoginPage) return;

    let mounted = true;
    fetch('/api/admin/auth')
      .then(async (res) => {
        if (!res.ok) {
          router.push('/admin/login');
          return;
        }
        const govde = await res.json().catch(() => null);
        if (mounted) {
          setAuthenticated(true);
          setRole(govde?.user?.role ?? null);
        }
      })
      .catch(() => {
        router.push('/admin/login');
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [isLoginPage, router]);

  /**
   * Yetkisiz sayfaya doğrudan gidilmesini engeller.
   *
   * Menüden başlığı kaldırmak tek başına koruma DEĞİLDİR: kullanıcı yolu adres
   * çubuğuna yazabilir ya da eski bir yer imini açabilir. Sunucu tarafındaki
   * yazma yetkileri ayrıca korunuyor (bkz. app/api/admin/content/route.ts);
   * bu kontrol ekranın hiç açılmamasını sağlar.
   */
  useEffect(() => {
    if (isLoginPage || !role) return;
    if (!sayfayaErisebilirMi(role, pathname)) router.replace('/admin');
  }, [isLoginPage, role, pathname, router]);

  const handleLogout = async () => {
    await fetch('/api/admin/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'logout' }),
    });
    router.push('/admin/login');
    router.refresh();
  };

  if (pathname === '/admin/login') {
    return <>{children}</>;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white text-xs font-bold">
        Yönetim Paneli Yükleniyor...
      </div>
    );
  }

  if (!authenticated) {
    return null;
  }

  const TUM_MENU = [
    { label: 'Özet Panel (Dashboard)', href: '/admin', icon: LayoutDashboard },
    { label: 'Google & SEO Suite', href: '/admin/google-seo', icon: Globe },
    { label: 'SEO İçerik & Entity Haritası', href: '/admin/icerik-haritasi', icon: Network },
    { label: 'Müşteriler', href: '/admin/musteriler', icon: Users },
    { label: 'Poliçe Takibi', href: '/admin/police-takibi', icon: CalendarClock },
    { label: 'Teklif Talepleri', href: '/admin/teklifler', icon: MessageSquare },
    { label: 'Sigorta Hizmetleri CMS', href: '/admin/hizmetler', icon: ShieldCheck },
    { label: 'Sigorta Kategorileri', href: '/admin/kategoriler', icon: Shield },
    { label: 'Anlaşmalı Şirketler', href: '/admin/sirketler', icon: Building2 },
    { label: 'Slider & Duyurular', href: '/admin/kampanyalar', icon: MessageSquare },
    { label: 'Blog & Haber CMS', href: '/admin/blog', icon: FileText },
    { label: 'S.S.S. Soruları CMS', href: '/admin/sss', icon: HelpCircle },
    { label: 'AEO & AI Trafik Raporu', href: '/admin/analiz', icon: BarChart2 },
    { label: 'Site & Firma Ayarları', href: '/admin/ayarlar', icon: Settings },
    { label: 'Sistem Kullanıcıları', href: '/admin/kullanicilar', icon: UserCog },
    { label: 'Sistem Logları', href: '/admin/loglar', icon: List },
    // Kişisel ekran; içerik yönetimi başlıklarının altında, listenin sonunda durur.
    { label: 'Şifremi Değiştir', href: '/admin/sifre', icon: KeyRound },
  ];

  // Menüde yalnızca rolün erişebildiği başlıklar görünür.
  const navItems = role
    ? TUM_MENU.filter((item) => sayfayaErisebilirMi(role, item.href))
    : TUM_MENU;

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans text-slate-800">
      {/* Top Bar */}
      <header className="bg-slate-900 text-white border-b border-slate-800 px-4 sm:px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-800 text-white flex items-center justify-center font-bold">
            <Shield className="w-4 h-4 text-blue-300" />
          </div>
          <div>
            <div className="font-extrabold text-sm text-white">Veli Sigorta CMS</div>
            <div className="text-[10px] text-slate-400">Yönetim & İçerik Paneli v2.0</div>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs">
          <Link
            href="/"
            target="_blank"
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold inline-flex items-center gap-1.5 transition-colors"
          >
            <span>Siteyi Görüntüle</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>

          <button
            onClick={handleLogout}
            className="px-3 py-1.5 rounded-lg bg-rose-900/60 hover:bg-rose-800 text-rose-200 font-bold inline-flex items-center gap-1.5 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Çıkış Yap</span>
          </button>
        </div>
      </header>

      {/* Main Admin Grid Layout */}
      <div className="flex-1 flex flex-col md:flex-row">
        {/* Sidebar Nav */}
        <aside className="w-full md:w-64 bg-slate-900 text-slate-300 border-r border-slate-800 p-4 shrink-0">
          <nav className="space-y-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-bold text-xs transition-all ${
                    isActive
                      ? 'bg-blue-800 text-white shadow-xs'
                      : 'hover:bg-slate-800 hover:text-white text-slate-400'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </aside>

        {/* Content View */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
