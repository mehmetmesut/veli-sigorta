import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { getDb } from '@/lib/db';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Logo } from '@/components/Logo';
import { MapPin, FileText, CheckCircle2, UserCheck } from 'lucide-react';
import type { Metadata } from 'next';
import { buildPageMetadata } from '@/lib/page-metadata';
import { YapisalVeri } from '@/components/YapisalVeri';
import { getBreadcrumbSchema, getInsuranceAgencySchema, getWebPageSchema } from '@/lib/schema';
import { getBaseUrl } from '@/lib/page-metadata';

export const revalidate = 15; // Panelden yapılan değişiklikler hızlı yansısın diye 60 saniyeden düşürüldü

export async function generateMetadata(): Promise<Metadata> {
  return buildPageMetadata({
    title: "Kurumsal | 2004’ten Beri Antalya Kepez’de Veli Sigorta",
    description: "Veli Sigorta Aracılık Hizmetleri Ltd. Şti. hakkında: kuruluş hikâyemiz, Antalya Kepez’deki acentemiz, resmi künye ve çalışma ilkelerimiz.",
    path: "/kurumsal",
  });
}

export default async function AboutPage() {
  const db = await getDb();
  const company = db.companyInfo;
  const experienceYears = Math.max(0, new Date().getFullYear() - company.establishedYear);

  const baseUrl = getBaseUrl();
  // Kurumsal sayfa kurumun kendisini anlatıyor; ajans şeması burada da verilir ki
  // "hakkında" sayfası ana sayfadaki kurum kaydıyla aynı '@id' üzerinden eşleşsin.
  const semalar = [
    getWebPageSchema({
      tur: 'AboutPage',
      ad: 'Kurumsal',
      aciklama: `${company.name} hakkında: kuruluş hikâyesi, resmi künye ve çalışma ilkeleri.`,
      yol: '/kurumsal',
      baseUrl,
    }),
    getInsuranceAgencySchema(company, baseUrl),
    getBreadcrumbSchema([{ name: 'Ana Sayfa', url: '/' }, { name: 'Kurumsal', url: '/kurumsal' }], baseUrl),
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-800">
      <YapisalVeri etkin={db.settings.enableStructuredData} semalar={semalar} />
      <Header phones={company.phones} whatsappNumber={company.whatsappNumber} />

      <main className="flex-1">
        {/* HERO */}
        <section className="bg-slate-900 text-white py-12 px-4 sm:px-6 lg:px-8 border-b border-slate-800">
          <div className="max-w-7xl mx-auto grid gap-8 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-blue-300">
                <Link href="/" className="hover:text-white">
                  Ana Sayfa
                </Link>
                <span>/</span>
                <span className="text-white font-bold">Kurumsal & Hakkımızda</span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight font-serif">
                Veli Sigorta Aracılık Hizmetleri Ltd. Şti.
              </h1>
              <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
                2004 yılında Antalya Kepez’de faaliyete başlayan aile işletmesi niteliğindeki sigorta acentesiyiz. Bireysel ve kurumsal sigorta ihtiyaçları için hizmet veriyoruz.
              </p>
            </div>

            <div className="w-fit border border-white/10 bg-white/[0.04] p-2.5 shadow-2xl">
              <Logo variant="light" height={72} />
              <div className="mt-2 flex items-center justify-between gap-4 px-1 text-[9px] font-bold uppercase tracking-[0.18em] text-slate-400">
                <span>Antalya</span>
                <span>2004’ten beri</span>
              </div>
            </div>
          </div>
        </section>

        {/* CONTENT */}
        <section className="py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-16">
          
          {/* FOUNDER & EXECUTIVE LEADERSHIP SECTION */}
          <div className="bg-white rounded-3xl p-6 sm:p-10 border border-slate-200 shadow-sm space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-6">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 rounded-full bg-blue-100 text-blue-900 text-[11px] font-extrabold uppercase tracking-wider inline-flex items-center gap-1.5">
                    <UserCheck className="w-3.5 h-3.5" />
                    <span>Kurucumuz</span>
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-900 text-[10px] font-bold">
                    {experienceYears} Yıllık Faaliyet Geçmişi
                  </span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-serif">
                  Kurucumuz ve Hizmet Yaklaşımımız
                </h2>
              </div>
              <p className="text-xs text-slate-500 max-w-md">
                Veli Sigorta’nın 2004 yılında başlayan faaliyetleri Kepez’deki merkez ofisinden sürdürülmektedir.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              {/* Founder Office Image */}
              <div className="lg:col-span-6 space-y-3">
                <div className="relative rounded-2xl overflow-hidden border border-slate-200 shadow-md group bg-slate-900">
                  <Image
                    src="/KurucuGorseli.png"
                    alt="Veli Sigorta kurucusu Antalya ofisinde"
                    width={1672}
                    height={941}
                    sizes="(min-width: 1024px) 50vw, 100vw"
                    style={{ aspectRatio: '1672 / 941' }}
                    className="w-full h-auto object-cover transition-transform duration-500 group-hover:scale-[1.01]"
                    priority
                  />
                  
                  {/* Photo Overlay Badge */}
                  <div className="bg-slate-900 p-3.5 text-white flex items-center justify-between gap-3 sm:absolute sm:bottom-3 sm:left-3 sm:right-3 sm:rounded-xl sm:border sm:border-white/10 sm:bg-slate-900/85 sm:backdrop-blur-md">
                    <div className="space-y-0.5">
                      <div className="font-bold text-xs sm:text-sm text-white">Veli Sigorta Kurucusu</div>
                      <div className="text-[10px] text-slate-300 flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-blue-400 shrink-0" />
                        <span>Veli UĞURCU | Antalya</span>
                      </div>
                    </div>
                    <span className="text-[10px] bg-blue-600/80 text-white px-2.5 py-1 rounded-lg shrink-0 font-bold uppercase tracking-wider">
                      2004’ten beri
                    </span>
                  </div>
                </div>
                <p className="text-[11px] text-slate-500 text-center italic">
                  Veli Sigorta kurucusunun Antalya Kepez’deki merkez ofisinden bir görünüm.
                </p>
              </div>

              {/* Founder and service approach */}
              <div className="lg:col-span-6 space-y-6">
                <div className="p-5 rounded-2xl bg-slate-900 text-white space-y-3 border border-slate-800 shadow-sm">
                  <h3 className="font-serif text-xl font-bold">2004’ten beri Kepez’de</h3>
                  <p className="text-xs sm:text-sm leading-relaxed text-slate-200">
                    Şirketimizin kurucusu, Veli Sigorta’nın Antalya Kepez’de başlayan acentelik faaliyetlerini aile işletmesi anlayışıyla sürdürmektedir.
                  </p>
                </div>

                <div className="space-y-3 text-xs sm:text-sm text-slate-600 leading-relaxed">
                  <p>
                    Acentemiz, sigorta ürünleri ve teklif süreçleri hakkında anlaşılır bilgi sunmayı; müşterilerin teminat, muafiyet ve istisnaları değerlendirmesine yardımcı olmayı amaçlar.
                  </p>
                  <p>
                    Teklif ve poliçe koşulları sigorta şirketine ve ürüne göre değişebilir. Güncel seçenekler için ofis, telefon veya WhatsApp kanallarımızdan bilgi alabilirsiniz.
                  </p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs pt-2">
                  <div className="p-3 rounded-xl bg-blue-50/70 border border-blue-200 text-blue-950 font-bold text-center">
                    <div className="text-lg font-black text-blue-900">2004</div>
                    <div className="text-[10px] text-blue-700 font-medium">Kuruluş Yılı</div>
                  </div>
                  <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200 text-emerald-950 font-bold text-center">
                    <div className="text-lg font-black text-emerald-900">Kepez</div>
                    <div className="text-[10px] text-emerald-700 font-medium">Merkez Ofis</div>
                  </div>
                  <div className="p-3 rounded-xl bg-purple-50/70 border border-purple-200 text-purple-950 font-bold text-center col-span-2 sm:col-span-1">
                    <div className="text-lg font-black text-purple-900">Aile</div>
                    <div className="text-[10px] text-purple-700 font-medium">İşletme Yapısı</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            <div className="lg:col-span-7 space-y-4">
              <span className="text-xs font-extrabold text-blue-900 uppercase tracking-widest">
                2004’ten Günümüze
              </span>
              <h2 className="text-2xl font-bold text-slate-900">
                Acente Tarihçemiz ve Hizmet Anlayışımız
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Veli Sigorta, 2004 yılında Antalya’nın Kepez ilçesinde faaliyete başlamıştır. Acentemiz bireysel ve kurumsal sigorta ihtiyaçları için bilgilendirme, teklif ve poliçe süreçlerinde hizmet verir.
              </p>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Araç, konut, işyeri, sağlık ve sorumluluk sigortaları dâhil farklı ürün grupları hakkında güncel seçenekleri acente ekibimize sorabilirsiniz.
              </p>

              <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3.5 rounded-xl bg-white border border-slate-200 flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Bireysel ve Kurumsal Sigorta Seçenekleri</span>
                </div>
                <div className="p-3.5 rounded-xl bg-white border border-slate-200 flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Hasar Süreci Hakkında Bilgilendirme</span>
                </div>
                <div className="p-3.5 rounded-xl bg-white border border-slate-200 flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Şeffaf ve Açıklayıcı Poliçe Dili</span>
                </div>
                <div className="p-3.5 rounded-xl bg-white border border-slate-200 flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{experienceYears} Yıllık Faaliyet Geçmişi</span>
                </div>
              </div>
            </div>

            {/* Official Tax and Trade Box */}
            <div className="lg:col-span-5 bg-white rounded-2xl p-6 border border-slate-200 shadow-2xs space-y-4">
              <h3 className="font-bold text-slate-900 text-base border-b border-slate-100 pb-2 flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-800" />
                <span>Resmi Şirket ve Sicil Bilgileri</span>
              </h3>

              <div className="space-y-2.5 text-xs text-slate-700">
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Unvan:</span>
                  <span className="font-bold text-slate-900 text-right">{company.name}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Kuruluş Yılı:</span>
                  <span className="font-bold text-slate-900">{company.establishedYear}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Vergi Dairesi:</span>
                  <span className="font-bold text-slate-900">{company.taxOffice}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Vergi Numarası:</span>
                  <span className="font-bold text-slate-900">{company.taxNumber}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Ticaret Sicil No:</span>
                  <span className="font-bold text-slate-900">{company.tradeRegistryNo}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">MERSİS No:</span>
                  <span className="font-bold text-slate-900">{company.mersisNo}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-500">Şehir / İlçe:</span>
                  <span className="font-bold text-slate-900">{company.city} / {company.district}</span>
                </div>
              </div>
            </div>
          </div>

        </section>
      </main>

      <Footer company={company} />
    </div>
  );
}
