import React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getDb } from '@/lib/db';
import { serializeJsonLd } from '@/lib/json-ld';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { QuickQuoteForm } from '@/components/QuickQuoteForm';
import { getServiceSchema, getFAQSchema, getBreadcrumbSchema } from '@/lib/schema';
import {
  Shield,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  FileText,
  HelpCircle,
  AlertCircle,
  BookOpen,
  MessageCircle,
  Phone,
  ArrowRight,
  Sparkles,
  ExternalLink,
  Tag,
  Clock,
  Info,
} from 'lucide-react';

export const revalidate = 15; // Panelden yapılan değişiklikler hızlı yansısın diye 60 saniyeden düşürüldü
import { getWhatsAppUrl } from '@/lib/whatsapp';
import type { Metadata } from 'next';
import { buildPageMetadata } from '@/lib/page-metadata';
import { ContentImage } from '@/components/ContentImage';

export async function generateStaticParams() {
  const db = await getDb();
  return db.services.map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const db = await getDb();
  const service = db.services.find((s) => s.slug === slug);

  if (!service) {
    return buildPageMetadata({
      title: 'Hizmet Bulunamadı | Veli Sigorta',
      description: 'Aradığınız sigorta ürünü sayfası bulunamadı.',
      path: `/hizmetlerimiz/${slug}`,
    });
  }

  return buildPageMetadata({
    title: `${service.title} | Antalya Kepez — Veli Sigorta`,
    description: service.metaDescription || `${service.title} teminatları, kapsamı ve teklif süreci hakkında bilgi alın.`,
    path: `/hizmetlerimiz/${service.slug}`,
    ogImage: service.featuredImage,
  });
}

export default async function ServiceDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const resolvedParams = await params;
  const db = await getDb();
  const company = db.companyInfo;
  const service = db.services.find((s) => s.slug === resolvedParams.slug && s.isPublished);

  if (!service) {
    notFound();
  }

  const category = db.categories.find((c) => c.id === service.categoryId);
  const relatedServices = db.services.filter(
    (s) => service.relatedServiceIds.includes(s.id) && s.id !== service.id && s.isPublished
  );
  const relatedBlogs = db.blogs.filter(
    (b) =>
      b.isPublished &&
      ((service.relatedBlogIds || []).includes(b.id) ||
        (service.relatedBlogSlugs || []).includes(b.slug))
  );

  const baseUrl = process.env.APP_URL || 'https://velisigorta.com.tr';
  const serviceSchema = getServiceSchema(service, company, baseUrl);
  const faqSchema = service.faq.length > 0 ? getFAQSchema(service.faq) : null;
  const breadcrumbSchema = getBreadcrumbSchema(
    [
      { name: 'Ana Sayfa', url: '/' },
      { name: 'Sigorta Hizmetleri', url: '/hizmetlerimiz' },
      { name: service.title, url: `/hizmetlerimiz/${service.slug}` },
    ],
    baseUrl
  );

  const whatsappTeklifUrl = getWhatsAppUrl(company.whatsappNumber, service.title, 'teklif');
  const whatsappBilgiUrl = getWhatsAppUrl(company.whatsappNumber, service.title, 'bilgi');

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-800">
      {/* Inject Structured Schemas */}
      {db.settings.enableStructuredData && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: serializeJsonLd(serviceSchema) }}
        />
      )}
      {db.settings.enableStructuredData && faqSchema && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: serializeJsonLd(faqSchema) }}
        />
      )}
      {db.settings.enableStructuredData && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: serializeJsonLd(breadcrumbSchema) }}
        />
      )}

      <Header phones={company.phones} whatsappNumber={company.whatsappNumber} />

      <main className="flex-1">
        {/* HERO SECTION */}
        <section className="bg-slate-900 text-white py-12 px-4 sm:px-6 lg:px-8 border-b border-slate-800">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center gap-2 text-xs font-semibold text-blue-300 mb-4 flex-wrap">
              <Link href="/" className="hover:text-white">
                Ana Sayfa
              </Link>
              <span>/</span>
              <Link href="/hizmetlerimiz" className="hover:text-white">
                Sigorta Hizmetleri
              </Link>
              <span>/</span>
              <span className="text-white font-bold">{service.title}</span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              <div className="lg:col-span-8 space-y-4">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-3 py-1 rounded-full bg-blue-900/80 border border-blue-700/60 text-blue-200 text-xs font-bold">
                    {category?.name || 'Sigorta Branşı'}
                  </span>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-bold ${
                      service.isMandatory
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                        : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    }`}
                  >
                    {service.isMandatory ? 'Yasal Zorunlu Sigorta' : 'İsteğe Bağlı Sigorta'}
                  </span>
                </div>

                <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight font-serif text-white">
                  {service.title}
                </h1>

                <p className="text-sm sm:text-base text-slate-300 leading-relaxed max-w-2xl">
                  {service.shortDescription}
                </p>

                {/* AI Summary Short Direct Answer Box */}
                {service.shortDirectAnswer && (
                  <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700 text-xs text-blue-100 flex items-start gap-3">
                    <Info className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-white block mb-0.5">Özet Tanım:</span>
                      <span>{service.shortDirectAnswer}</span>
                    </div>
                  </div>
                )}

                {/* DYNAMIC WHATSAPP BUTTONS */}
                <div className="pt-2 flex flex-wrap items-center gap-3">
                  <a
                    href={whatsappTeklifUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs inline-flex items-center gap-2 shadow-md transition-all"
                  >
                    <MessageCircle className="w-4 h-4 fill-white text-emerald-600" />
                    <span>Hizmet Teklifi Al (WhatsApp)</span>
                  </a>

                  <a
                    href={whatsappBilgiUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-5 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-bold text-xs inline-flex items-center gap-2 transition-colors"
                  >
                    <MessageCircle className="w-4 h-4 text-blue-300" />
                    <span>Bilgi Al (WhatsApp)</span>
                  </a>
                </div>
              </div>

              {/* Featured Image */}
              <div className="lg:col-span-4">
                <div className="rounded-2xl overflow-hidden border border-slate-700 shadow-xl max-h-64">
                  <ContentImage
                    src={service.featuredImage}
                    alt={service.title}
                    className="w-full h-full object-cover"
                    placeholderClassName="w-full h-64 bg-[#F5F2EC] flex items-center justify-center text-[#B9B0A4]"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="px-4 sm:px-6 lg:px-8 pt-6 max-w-7xl mx-auto w-full">
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs leading-relaxed text-amber-950 flex items-start gap-3">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-700" />
            <p>
              <strong>Genel bilgilendirme:</strong> Teminat, limit, istisna, bekleme süresi,
              fiyat ve asistans hizmetleri sigorta şirketine, ürüne ve poliçe özel
              şartlarına göre değişir. Bağlayıcı bilgiler, size sunulan güncel teklif ile
              poliçe genel ve özel şartlarında yer alır.
            </p>
          </div>
        </section>

        {/* MAIN BODY CONTENT & SIDEBAR */}
        <section className="py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
            
            {/* Left Content Area */}
            <div className="lg:col-span-8 space-y-10">
              
              {/* 1. WHAT IS IT & DETAILED CONTENT */}
              <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200/90 shadow-2xs space-y-4">
                <h2 className="text-xl font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-blue-800" />
                  <span>{service.title} Nedir?</span>
                </h2>

                <div
                  className="prose prose-slate max-w-none text-xs sm:text-sm text-slate-700 leading-relaxed space-y-3"
                  dangerouslySetInnerHTML={{ __html: service.richContent }}
                />
              </div>

              {/* 2. WHO NEEDS IT & IS IT MANDATORY */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-2xs space-y-2">
                  <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
                    <ShieldCheck className="w-4 h-4 text-blue-800" />
                    <span>Kimler İçin Gerekli?</span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">{service.whoNeedsIt}</p>
                </div>

                <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-2xs space-y-2">
                  <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
                    <AlertCircle className="w-4 h-4 text-amber-600" />
                    <span>Zorunlu mu?</span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    {service.isMandatory
                      ? 'Evet, bu sigortanın yaptırılması ilgili kanun ve yönetmelikler çerçevesinde yasal zorunluluktur.'
                      : 'Hayır, zorunlu değildir. Bireysel ve ticari finansal risklerinizi isteğe bağlı koruma altına alan teminattır.'}
                  </p>
                </div>
              </div>

              {/* 3. WHAT DOES IT COVER (COVERAGE) */}
              <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-2xs space-y-4">
                <h2 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  <span>Neleri Kapsar? (Teminatlar)</span>
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {service.coverage.map((cov, idx) => (
                    <div key={idx} className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex items-start gap-2.5 text-xs text-slate-800">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      <span>{cov}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* 4. WHAT DOES IT NOT COVER (EXCLUSIONS) */}
              {service.exclusions.length > 0 && (
                <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-2xs space-y-4">
                  <h2 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
                    <XCircle className="w-5 h-5 text-rose-600" />
                    <span>Kapsam Dışı Durumlar (İstisnalar)</span>
                  </h2>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {service.exclusions.map((ex, idx) => (
                      <div key={idx} className="p-3 rounded-xl bg-rose-50/50 border border-rose-100 flex items-start gap-2.5 text-xs text-slate-800">
                        <XCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                        <span>{ex}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 5. REQUIRED DOCUMENTS & PRICE FACTORS */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Documents */}
                <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-2xs space-y-3">
                  <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                    <FileText className="w-4 h-4 text-blue-800" />
                    <span>Gerekli Belgeler</span>
                  </h3>
                  <ul className="space-y-2 text-xs text-slate-700">
                    {service.documents.map((doc, i) => (
                      <li key={i} className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-800"></span>
                        <span>{doc}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Price Factors */}
                <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-2xs space-y-3">
                  <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-600" />
                    <span>Fiyatı Neler Etkiler?</span>
                  </h3>
                  <ul className="space-y-2 text-xs text-slate-700">
                    {service.priceFactors.map((factor, i) => (
                      <li key={i} className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-600"></span>
                        <span>{factor}</span>
                      </li>
                    ))}
                  </ul>
                </div>

              </div>

              {/* 6. LEGAL BASIS */}
              {service.legalBasis && (
                <div className="bg-slate-100/80 rounded-xl p-4 border border-slate-200 text-xs text-slate-700 flex items-start gap-3">
                  <Shield className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-slate-900 block">Yasal Dayanak & Mevzuat:</span>
                    <span>{service.legalBasis}</span>
                  </div>
                </div>
              )}

              {/* 7. FAQ FOR THIS SERVICE */}
              {service.faq.length > 0 && (
                <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-2xs space-y-4">
                  <h2 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
                    <HelpCircle className="w-5 h-5 text-blue-800" />
                    <span>Sıkça Sorulan Sorular</span>
                  </h2>

                  <div className="space-y-3">
                    {service.faq.map((f, i) => (
                      <div key={i} className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
                        <div className="font-bold text-xs text-slate-900">{f.question}</div>
                        <div className="text-xs text-slate-600 leading-relaxed">{f.answer}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 8. OFFICIAL SOURCES */}
              {service.sourceReferences && service.sourceReferences.length > 0 && (
                <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-2xs space-y-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Başvuru Kaynakları</h3>
                  <div className="flex flex-wrap items-center gap-3 text-xs">
                    {service.sourceReferences.map((ref, i) => (
                      <a
                        key={i}
                        href={ref.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-blue-800 hover:underline font-medium"
                      >
                        <span>{ref.title}</span>
                        <ExternalLink className="w-3 h-3 text-slate-400" />
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* RELATED BLOG POSTS / GUIDES */}
              {relatedBlogs.length > 0 && (
                <div className="space-y-4 pt-4">
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-purple-700" />
                    <span>İlgili Eğitici Rehberler & Blog Makaleleri</span>
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {relatedBlogs.map((blog) => (
                      <Link
                        key={blog.slug}
                        href={`/haberler/${blog.slug}`}
                        className="p-4 rounded-xl bg-purple-50/50 border border-purple-200/80 hover:border-purple-600 transition-all shadow-2xs hover:shadow-xs group space-y-1.5"
                      >
                        <div className="font-bold text-xs text-slate-900 group-hover:text-purple-950 line-clamp-2">
                          {blog.title}
                        </div>
                        <div className="text-[11px] text-slate-600 line-clamp-2 leading-snug">
                          {blog.excerpt}
                        </div>
                        <div className="text-[10px] font-extrabold text-purple-800 pt-1 flex items-center gap-1">
                          <span>Rehberi Oku</span>
                          <ArrowRight className="w-3 h-3" />
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* RELATED SERVICES */}
              {relatedServices.length > 0 && (
                <div className="space-y-4 pt-4">
                  <h3 className="text-base font-bold text-slate-900">İlişkili Sigorta Ürünleri</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {relatedServices.map((rel) => (
                      <Link
                        key={rel.slug}
                        href={`/hizmetlerimiz/${rel.slug}`}
                        className="p-4 rounded-xl bg-white border border-slate-200 hover:border-blue-800 transition-all shadow-2xs hover:shadow-xs group"
                      >
                        <div className="font-bold text-xs text-slate-900 group-hover:text-blue-900">
                          {rel.title}
                        </div>
                        <div className="text-[11px] text-slate-500 mt-1 line-clamp-2">
                          {rel.shortDescription}
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

            </div>

            {/* Right Sidebar */}
            <div className="lg:col-span-4 space-y-6">
              
              {/* Online Form */}
              <QuickQuoteForm
                defaultServiceTitle={service.title}
                whatsappNumber={company.whatsappNumber}
              />

              {/* Direct WhatsApp Callout Card */}
              <div className="bg-emerald-900 text-white rounded-2xl p-6 space-y-4 shadow-lg">
                <div className="w-10 h-10 rounded-xl bg-emerald-800 flex items-center justify-center font-bold">
                  <MessageCircle className="w-5 h-5 fill-white text-emerald-800" />
                </div>
                <div>
                  <h4 className="font-bold text-base">Hızlı Teklif Hattı</h4>
                  <p className="text-xs text-emerald-100 mt-1 leading-relaxed">
                    Gerekli belge ve bilgileri güvenli iletişim kanallarımız üzerinden öğrenin; güncel teklif süresi ürüne göre değişebilir.
                  </p>
                </div>
                <a
                  href={whatsappTeklifUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-3 px-4 rounded-xl bg-white hover:bg-emerald-50 text-emerald-950 font-bold text-xs inline-flex items-center justify-center gap-2 shadow-xs transition-colors"
                >
                  <MessageCircle className="w-4 h-4 fill-emerald-600 text-white" />
                  <span>WhatsApp ile Teklif İste</span>
                </a>
              </div>

              {/* Agency Contacts */}
              <div className="bg-white rounded-2xl p-6 border border-slate-200 space-y-3 text-xs">
                <div className="font-bold text-slate-900 border-b border-slate-100 pb-2">
                  Veli Sigorta Müşteri Temsilcisi
                </div>
                <div className="text-slate-600">
                  <span className="font-medium text-slate-900">Telefon:</span> {company.phones[0]}
                </div>
                <div className="text-slate-600">
                  <span className="font-medium text-slate-900">GSM / WhatsApp:</span> {company.phones[2]}
                </div>
                <div className="text-slate-600">
                  <span className="font-medium text-slate-900">E-posta:</span> {company.emails[0]}
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
