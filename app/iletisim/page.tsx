import React from 'react';
import Link from 'next/link';
import { getDb } from '@/lib/db';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { QuickQuoteForm } from '@/components/QuickQuoteForm';
import { GoogleReviewBadge } from '@/components/GoogleReviewBadge';
import { MapPin, Phone, Mail, Clock, MessageCircle, Building2, ShieldCheck } from 'lucide-react';
import { getGeneralWhatsAppUrl } from '@/lib/whatsapp';
import type { Metadata } from 'next';
import { buildPageMetadata } from '@/lib/page-metadata';
import { YapisalVeri } from '@/components/YapisalVeri';
import { getBreadcrumbSchema, getContactPointSchema, getWebPageSchema } from '@/lib/schema';
import { getBaseUrl } from '@/lib/page-metadata';

export const revalidate = 15; // Panelden yapılan değişiklikler hızlı yansısın diye 60 saniyeden düşürüldü

export async function generateMetadata(): Promise<Metadata> {
  return buildPageMetadata({
    title: "İletişim ve Adres | Veli Sigorta Antalya Kepez Acentesi",
    description: "Antalya Kepez Özgürlük Mahallesi’ndeki acentemizin adresi, telefon numaraları, çalışma saatleri, harita konumu ve yol tarifi.",
    path: "/iletisim",
  });
}

export default async function ContactPage() {
  const db = await getDb();
  const company = db.companyInfo;

  const baseUrl = getBaseUrl();
  const semalar = [
    getWebPageSchema({
      tur: 'ContactPage',
      ad: 'İletişim ve Adres',
      aciklama: `${company.district}/${company.city} acentemizin adresi, telefonları ve çalışma saatleri.`,
      yol: '/iletisim',
      baseUrl,
    }),
    getContactPointSchema(company, baseUrl),
    getBreadcrumbSchema([{ name: 'Ana Sayfa', url: '/' }, { name: 'İletişim', url: '/iletisim' }], baseUrl),
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
              <span className="text-white font-bold">İletişim & Lokasyon</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight font-serif">
              Bize Ulaşın & Kepez Acentemizi Ziyaret Edin
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
              {company.district} {company.city} adresindeki acentemizi çalışma saatleri içinde ziyaret edebilir; telefon ve WhatsApp kanallarımızdan bilgi isteyebilirsiniz.
            </p>
          </div>
        </section>

        <section className="py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-12">
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
            
            {/* Left Contact Info */}
            <div className="lg:col-span-6 space-y-6">
              
              <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-2xs space-y-6">
                <h2 className="text-xl font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-blue-900" />
                  <span>Acente İletişim Detayları</span>
                </h2>

                <div className="space-y-4 text-xs sm:text-sm">
                  <div className="flex items-start gap-3.5">
                    <div className="p-2.5 rounded-xl bg-blue-50 text-blue-900 shrink-0 mt-0.5">
                      <MapPin className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="font-bold text-slate-900 block">Adresimiz:</span>
                      {/* Adres tek kaynaktan (panel) gelir; koda gömülü tekrar bırakılmaz. */}
                      <span className="text-slate-600 leading-relaxed block">{company.address}</span>
                    </div>
                  </div>

                  <div className="flex items-start gap-3.5">
                    <div className="p-2.5 rounded-xl bg-blue-50 text-blue-900 shrink-0 mt-0.5">
                      <Phone className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="font-bold text-slate-900 block">Telefon Hatlarımız:</span>
                      <div className="space-y-1 text-slate-700 mt-0.5">
                        <div>Santral: <a href={`tel:${company.phones[0].replace(/\s/g, '')}`} className="font-bold text-blue-900 hover:underline">{company.phones[0]}</a></div>
                        <div>Ofis PBX: <a href={`tel:${company.phones[1].replace(/\s/g, '')}`} className="font-bold text-blue-900 hover:underline">{company.phones[1]}</a></div>
                        <div>GSM / WhatsApp: <a href={`tel:${company.phones[2].replace(/\s/g, '')}`} className="font-bold text-emerald-600 hover:underline">{company.phones[2]}</a></div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start gap-3.5">
                    <div className="p-2.5 rounded-xl bg-blue-50 text-blue-900 shrink-0 mt-0.5">
                      <Mail className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="font-bold text-slate-900 block">E-Posta Adreslerimiz:</span>
                      <div className="text-slate-600 space-y-0.5 mt-0.5">
                        <div>{company.emails[0]}</div>
                        <div>{company.emails[1]}</div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start gap-3.5">
                    <div className="p-2.5 rounded-xl bg-blue-50 text-blue-900 shrink-0 mt-0.5">
                      <Clock className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="font-bold text-slate-900 block">Çalışma Saatlerimiz:</span>
                      <span className="text-slate-600">{company.workingHours}</span>
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100">
                  <a
                    href={getGeneralWhatsAppUrl(company.whatsappNumber)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-3.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs inline-flex items-center justify-center gap-2 shadow-xs transition-colors"
                  >
                    <MessageCircle className="w-4 h-4 fill-white text-emerald-600" />
                    <span>WhatsApp İle Direkt Mesaj Gönder</span>
                  </a>
                </div>
              </div>

              {/* Map Embed Box */}
              <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs space-y-2">
                <div className="font-bold text-slate-900 text-xs px-2">Harita Konumumuz (Google Maps)</div>
                <div className="rounded-xl overflow-hidden h-64 border border-slate-200">
                  <iframe
                    src={company.googleMapsEmbedUrl}
                    width="100%"
                    height="100%"
                    style={{ border: 0 }}
                    allowFullScreen={false}
                    loading="lazy"
                    title="Veli Sigorta Kepez Konumu"
                  ></iframe>
                </div>
              </div>

            </div>

            {/* Right: Teklif formu + Google değerlendirme daveti */}
            <div className="lg:col-span-6 space-y-6">
              <QuickQuoteForm whatsappNumber={company.whatsappNumber} />

              {/*
                Google Değerlendirme Daveti

                Sol sütunda haritanın altındaydı; teklif formunun altında kalan
                boşluğu değerlendirmek için sağ sütuna alındı (kullanıcı isteği).

                Çağrı düğmesi yerine footer'la ortak `GoogleReviewBadge` rozeti
                kullanılır. Rozet görseli yıldızları, "Google'da Değerlendirin"
                başlığını ve "Değerlendir" düğmesini kendi içinde barındırdığı
                için karttaki ayrı yıldız satırı kaldırıldı — aksi hâlde aynı
                öğe iki kez görünüyordu.
              */}
              {company.googleReviewUrl && (
                <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs">
                  <div className="font-bold text-slate-900 text-sm">
                    Hizmetimizden memnun kaldınız mı?
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed pt-1.5">
                    Google değerlendirmeniz, bizi arayan diğer Antalyalı komşularımızın doğru acenteyi
                    bulmasına yardımcı oluyor. Yorumunuz bir dakikadan kısa sürer.
                  </p>
                  <div className="mt-3.5">
                    <GoogleReviewBadge
                      reviewUrl={company.googleReviewUrl}
                      className="h-auto w-full max-w-[340px]"
                      sizes="340px"
                    />
                  </div>
                </div>
              )}
            </div>

          </div>

        </section>
      </main>

      <Footer company={company} />
    </div>
  );
}
