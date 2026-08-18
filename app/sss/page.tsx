import React from 'react';
import Link from 'next/link';
import { getDb } from '@/lib/db';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { HelpCircle, MessageCircle } from 'lucide-react';
import { getGeneralWhatsAppUrl } from '@/lib/whatsapp';
import type { Metadata } from 'next';
import { buildPageMetadata } from '@/lib/page-metadata';
import { YapisalVeri } from '@/components/YapisalVeri';
import { getBreadcrumbSchema, getFAQSchema, getWebPageSchema } from '@/lib/schema';
import { getBaseUrl } from '@/lib/page-metadata';

export const revalidate = 15; // Panelden yapılan değişiklikler hızlı yansısın diye 60 saniyeden düşürüldü

export async function generateMetadata(): Promise<Metadata> {
  return buildPageMetadata({
    title: "Sıkça Sorulan Sorular | Sigorta Rehberi — Veli Sigorta",
    description: "Trafik sigortası, kasko, DASK ve sağlık sigortası hakkında en çok sorulan soruların yanıtları; poliçe, teminat ve hasar süreçleri.",
    path: "/sss",
  });
}

export default async function FAQPage() {
  const db = await getDb();
  const company = db.companyInfo;
  // Kopya üzerinde sıralanır. `getDb()` MySQL geçişinden sonra paylaşılan önbellek
  // nesnesini klonlamadan döndürüyor; doğrudan `.sort()` çağırmak o diziyi YERİNDE
  // yeniden dizer ve önbellek ömrü boyunca gelen diğer istekleri de etkilerdi.
  const faqs = [...db.faqs].sort((a, b) => a.order - b.order);

  const baseUrl = getBaseUrl();
  const sayfaKimligi = {
    ad: 'Sıkça Sorulan Sorular',
    aciklama: 'Trafik, kasko, DASK ve sağlık sigortası hakkında sık sorulan soruların yanıtları.',
    yol: '/sss',
    baseUrl,
  };
  // Sayfa kimliği ve sorular TEK kayıtta birleşir; aynı adreste iki ayrı FAQPage
  // çakışır. Soru yoksa FAQPage hiç basılmaz — boş `mainEntity` geçersiz sayılır,
  // onun yerine sade bir WebPage verilir.
  const semalar = [
    faqs.length > 0
      ? getFAQSchema(faqs, sayfaKimligi)
      : getWebPageSchema({ tur: 'WebPage', ...sayfaKimligi }),
    getBreadcrumbSchema([{ name: 'Ana Sayfa', url: '/' }, { name: 'S.S.S.', url: '/sss' }], baseUrl),
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-800">
      <YapisalVeri etkin={db.settings.enableStructuredData} semalar={semalar} />
      <Header phones={company.phones} whatsappNumber={company.whatsappNumber} />

      <main className="flex-1">
        <section className="bg-slate-900 text-white py-12 px-4 sm:px-6 lg:px-8 border-b border-slate-800">
          <div className="max-w-7xl mx-auto space-y-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-blue-300">
              <Link href="/" className="hover:text-white">
                Ana Sayfa
              </Link>
              <span>/</span>
              <span className="text-white font-bold">Sıkça Sorulan Sorular (S.S.S.)</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight font-serif">
              Merak Edilen Tüm Sorular ve Yanıtları
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
              Poliçe süreçleri, fiyatlandırma, taksit imkanları ve hasar işlemlerine dair müşterilerimizden en sık gelen sorular.
            </p>
          </div>
        </section>

        <section className="py-12 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto space-y-6">
          <div className="space-y-4">
            {faqs.map((faq) => (
              <div key={faq.id} className="p-6 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-2">
                <h2 className="font-bold text-slate-900 text-base flex items-start gap-2.5">
                  <HelpCircle className="w-5 h-5 text-blue-800 shrink-0 mt-0.5" />
                  <span>{faq.question}</span>
                </h2>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed pl-7.5">{faq.answer}</p>
              </div>
            ))}
          </div>

          <div className="bg-blue-900 text-white rounded-2xl p-6 text-center space-y-3">
            <h3 className="font-bold text-base">Aradığınız Sorunun Cevabını Bulamadınız mı?</h3>
            <p className="text-xs text-blue-100 max-w-lg mx-auto">
              Acente danışmanlarımız WhatsApp hattımız üzerinden tüm sorularınızı yanıtlamaktan memnuniyet duyar.
            </p>
            <a
              href={getGeneralWhatsAppUrl(company.whatsappNumber)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs"
            >
              <MessageCircle className="w-4 h-4" />
              <span>WhatsApp ile Bize Sorun</span>
            </a>
          </div>
        </section>
      </main>

      <Footer company={company} />
    </div>
  );
}
