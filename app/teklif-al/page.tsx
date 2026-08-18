import React, { Suspense } from 'react';
import Link from 'next/link';
import { getDb } from '@/lib/db';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { QuickQuoteForm } from '@/components/QuickQuoteForm';
import { ShieldCheck, MessageCircle, Phone } from 'lucide-react';
import { getGeneralWhatsAppUrl } from '@/lib/whatsapp';
import type { Metadata } from 'next';
import { buildPageMetadata } from '@/lib/page-metadata';
import { QuoteFormWithIntent } from '@/components/QuoteFormWithIntent';

export const revalidate = 15; // Panelden yapılan değişiklikler hızlı yansısın diye 60 saniyeden düşürüldü

export async function generateMetadata(): Promise<Metadata> {
  return buildPageMetadata({
    title: "Ücretsiz Sigorta Teklifi Al | Veli Sigorta Antalya Kepez",
    description: "İhtiyacınıza uygun sigorta için hızlı teklif formu. Trafik, kasko, DASK, sağlık ve işyeri sigortalarında Antalya Kepez acentemizden fiyat alın.",
    path: "/teklif-al",
  });
}

export default async function RequestQuotePage() {
  const db = await getDb();
  const company = db.companyInfo;

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
              <span className="text-white font-bold">Sigorta Teklifi Al</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight font-serif">
              Sigorta Teklifi İçin WhatsApp’tan Bize Ulaşın
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
              İlgilendiğiniz sigorta türünü seçin; kişisel bilgi sitede saklanmadan hazır mesajla WhatsApp görüşmesini başlatın.
            </p>
          </div>
        </section>

        <section className="py-12 px-4 sm:px-6 lg:px-8 max-w-3xl mx-auto">
          {/* Suspense, useSearchParams kullanan istemci parçası için zorunlu; sayfanın
              geri kalanı statik ön-render edilmeye devam eder. */}
          <Suspense fallback={<QuickQuoteForm whatsappNumber={company.whatsappNumber} />}>
            <QuoteFormWithIntent whatsappNumber={company.whatsappNumber} />
          </Suspense>
        </section>
      </main>

      <Footer company={company} />
    </div>
  );
}
