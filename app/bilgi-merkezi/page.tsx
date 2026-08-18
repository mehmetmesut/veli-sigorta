import React from 'react';
import Link from 'next/link';
import { getDb } from '@/lib/db';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { BookOpen, ShieldCheck, FileText, Calculator, HelpCircle, ArrowRight } from 'lucide-react';
import type { Metadata } from 'next';
import { buildPageMetadata } from '@/lib/page-metadata';

export const revalidate = 15; // Panelden yapılan değişiklikler hızlı yansısın diye 60 saniyeden düşürüldü

export async function generateMetadata(): Promise<Metadata> {
  return buildPageMetadata({
    title: "Sigorta Bilgi Merkezi | Poliçe ve Teminat Rehberleri",
    description: "Trafik sigortası kademe sistemi, TSS seçim kriterleri ve işyeri risklerine dair ayrıntılı rehberler; sigorta terimlerinin sade açıklamaları.",
    path: "/bilgi-merkezi",
  });
}

export default async function InfoCenterPage() {
  const db = await getDb();
  const company = db.companyInfo;

  const guides = [
    {
      title: 'Trafik Sigortası Tavan Fiyat ve Kademe Sistemi Rehberi',
      desc: 'Hasarsızlık kademesi (1. kademe ile 8. kademe arası) priminizi nasıl etkiler? İndirim ve sürprim oranları.',
      href: '/hizmetlerimiz/zorunlu-trafik-sigortasi',
    },
    {
      title: 'DASK Adres Kodu (UAVT) Nedir, Nasıl Bulunur?',
      desc: 'Elektrik, su ve doğalgaz abonelik açılışlarında istenen 10 haneli Ulusal Adres Veri Tabanı kodu rehberi.',
      href: '/hizmetlerimiz/dask-zorunlu-deprem-sigortasi',
    },
    {
      title: 'Tamamlayıcı Sağlık Sigortasında Vergi İndirimi Hesaplama',
      desc: 'Sağlık sigortası primlerinin vergisel etkisini kişisel durumunuz ve güncel mevzuat çerçevesinde nasıl değerlendirebilirsiniz?',
      href: '/hizmetlerimiz/tamamlayici-saglik-sigortasi',
    },
    {
      title: 'Kaskoda Hasarsızlık Koruma Klozu Nedir?',
      desc: 'Ufak kaza durumlarında Kasko hasarsızlık indiriminizin bozulmaması için dikkat edilmesi gereken klozlar.',
      href: '/hizmetlerimiz/kasko-sigortasi',
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-800">
      <Header phones={company.phones} whatsappNumber={company.whatsappNumber} />

      <main className="flex-1">
        <section className="bg-slate-900 text-white py-12 px-4 sm:px-6 lg:px-8 border-b border-slate-800">
          <div className="max-w-7xl mx-auto space-y-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-blue-300">
              <Link href="/" className="hover:text-white">
                Ana Sayfa
              </Link>
              <span>/</span>
              <span className="text-white font-bold">Sigorta Bilgi Merkezi</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight font-serif">
              Sigorta Bilgi ve Rehber Merkezi
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
              Trafik sigortası tarifelerinden DASK adres koduna, sağlık sigortası koşullarından kasko klozlarına kadar sigortacılığa dair sade bilgilendirme rehberleri.
            </p>
          </div>
        </section>

        <section className="py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {guides.map((item, idx) => (
              <div
                key={idx}
                className="bg-white rounded-2xl p-6 border border-slate-200 shadow-2xs hover:shadow-md transition-all space-y-3"
              >
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-900 flex items-center justify-center font-bold">
                  <BookOpen className="w-5 h-5" />
                </div>
                <h2 className="font-bold text-slate-900 text-base">{item.title}</h2>
                <p className="text-xs text-slate-600 leading-relaxed">{item.desc}</p>
                <Link
                  href={item.href}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-900 hover:underline pt-2"
                >
                  <span>Detaylı Bilgi & Poliçe Sayfası</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            ))}
          </div>
        </section>
      </main>

      <Footer company={company} />
    </div>
  );
}
