import React from 'react';
import Link from 'next/link';
import { getDb } from '@/lib/db';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Shield, ShieldCheck, Car, HeartPulse, Home, Building2, ShieldAlert, CheckCircle2, MessageCircle, Search } from 'lucide-react';
import { getWhatsAppUrl } from '@/lib/whatsapp';
import type { Metadata } from 'next';
import { buildPageMetadata } from '@/lib/page-metadata';
import { YapisalVeri } from '@/components/YapisalVeri';
import { getBreadcrumbSchema, getItemListSchema, getWebPageSchema } from '@/lib/schema';
import { getBaseUrl } from '@/lib/page-metadata';

export const revalidate = 15; // Panelden yapılan değişiklikler hızlı yansısın diye 60 saniyeden düşürüldü

export async function generateMetadata(): Promise<Metadata> {
  return buildPageMetadata({
    title: "Sigorta Hizmetlerimiz | Trafik, Kasko, DASK, Sağlık — Antalya",
    description: "Zorunlu trafik, kasko, DASK, tamamlayıcı sağlık, konut ve işyeri sigortası dahil tüm ürünlerimizi inceleyin; Antalya Kepez acentemizden teklif alın.",
    path: "/hizmetlerimiz",
  });
}

export default async function ServicesPage() {
  const db = await getDb();
  const company = db.companyInfo;
  const categories = db.categories;
  const services = db.services.filter((s) => s.isPublished).sort((a, b) => a.order - b.order);

  const baseUrl = getBaseUrl();
  const semalar = [
    getWebPageSchema({
      tur: 'CollectionPage',
      ad: 'Sigorta Hizmetlerimiz',
      aciklama: 'Zorunlu trafik, kasko, DASK, tamamlayıcı sağlık, konut ve işyeri sigortası ürünlerimiz.',
      yol: '/hizmetlerimiz',
      baseUrl,
    }),
    getItemListSchema({
      ad: 'Sigorta Hizmetleri',
      ogeler: services.map((s) => ({ name: s.title, url: `/hizmetlerimiz/${s.slug}` })),
      baseUrl,
    }),
    getBreadcrumbSchema([{ name: 'Ana Sayfa', url: '/' }, { name: 'Hizmetlerimiz', url: '/hizmetlerimiz' }], baseUrl),
  ];

  return (
    <div className="min-h-screen bg-[#FDFCFB] flex flex-col font-sans text-[#1A1A1A]">
      <YapisalVeri etkin={db.settings.enableStructuredData} semalar={semalar} />
      <Header phones={company.phones} whatsappNumber={company.whatsappNumber} />

      <main className="flex-1">
        {/* PAGE HEADER */}
        {/* Başlık bloğu Kurumsal sayfasıyla aynı kalıbı kullanır (renk, kenarlık, boşluklar). */}
        <section className="bg-slate-900 text-white py-12 px-4 sm:px-6 lg:px-8 border-b border-slate-800">
          <div className="max-w-7xl mx-auto space-y-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-blue-300">
              <Link href="/" className="hover:text-white">
                Ana Sayfa
              </Link>
              <span>/</span>
              <span className="text-white font-bold">Sigorta Hizmetlerimiz</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight font-serif">
              Tüm Sigorta Ürünlerimiz &amp; Poliçe Kataloğumuz
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
              Zorunlu Trafik Sigortasından kaskoya, tamamlayıcı sağlıktan DASK ve işyeri paketlerine kadar farklı sigorta türlerini inceleyin ve ilgili ürün için bilgi isteyin.
            </p>
          </div>
        </section>

        {/* SERVICES CATALOG LIST BY CATEGORY */}
        <section className="py-14 px-4 sm:px-8 max-w-7xl mx-auto space-y-14">
          {categories.map((cat) => {
            const catServices = services.filter((s) => s.categoryId === cat.id);
            if (catServices.length === 0) return null;

            return (
              <div key={cat.id} className="space-y-6">
                <div className="border-b border-[#E5E1DB] pb-4 flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-serif text-[#1A1A1A]">{cat.name}</h2>
                    <p className="text-xs text-[#8A7E72] mt-1">{cat.description}</p>
                  </div>
                  <span className="text-xs font-bold text-[#003366] bg-[#F8F6F3] border border-[#E5E1DB] px-3.5 py-1.5 uppercase tracking-wider">
                    {catServices.length} Poliçe Türü
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {catServices.map((service) => {
                    const whatsappUrl = getWhatsAppUrl(company.whatsappNumber, service.title, 'teklif');

                    return (
                      <div
                        key={service.slug}
                        className="bg-white p-6 border border-[#E5E1DB] hover:border-[#1A1A1A] transition-all flex flex-col justify-between group"
                      >
                        <div>
                          <div className="flex items-center justify-between mb-3">
                            <span className="px-2.5 py-1 bg-[#1A1A1A] text-white text-[9px] font-bold uppercase tracking-[0.2em]">
                              {service.isMandatory ? 'Yasal Zorunlu' : 'İsteğe Bağlı'}
                            </span>
                            <Shield className="w-4 h-4 text-[#003366]" />
                          </div>

                          <h3 className="text-base font-bold text-[#1A1A1A] group-hover:text-[#003366] transition-colors uppercase tracking-wider">
                            {service.title}
                          </h3>

                          <p className="text-xs text-[#555] mt-2 line-clamp-3 leading-relaxed">
                            {service.shortDescription}
                          </p>

                          <div className="mt-4 space-y-2 border-t border-[#E5E1DB] pt-3">
                            {service.coverage.slice(0, 3).map((cov, i) => (
                              <div key={i} className="flex items-start gap-2 text-[11px] text-[#1A1A1A]">
                                <CheckCircle2 className="w-3.5 h-3.5 text-[#003366] shrink-0 mt-0.5" />
                                <span className="line-clamp-1">{cov}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="pt-5 mt-5 border-t border-[#E5E1DB] flex items-center gap-3">
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
                            className="py-2.5 px-3.5 bg-[#003366] hover:bg-blue-900 text-white font-bold text-[11px] uppercase tracking-wider inline-flex items-center gap-1.5 transition-colors"
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
            );
          })}
        </section>
      </main>

      <Footer company={company} />
    </div>
  );
}
