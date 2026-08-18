import React from 'react';
import Link from 'next/link';
import { getDb } from '@/lib/db';
import { serializeJsonLd } from '@/lib/json-ld';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { IntentSelector } from '@/components/IntentSelector';
import { QuickQuoteForm } from '@/components/QuickQuoteForm';
import { HeroSlider } from '@/components/HeroSlider';
import { PartnerBrandsSlider } from '@/components/PartnerBrandsSlider';
import { getInsuranceAgencySchema } from '@/lib/schema';
import {
  Shield,
  ShieldCheck,
  Award,
  Users,
  Clock,
  Phone,
  MessageCircle,
  Car,
  HeartPulse,
  Home,
  Building2,
  ArrowRight,
  HelpCircle,
  AlertTriangle,
  FileText,
  MapPin,
  CheckCircle2,
  Sparkles,
  ExternalLink,
} from 'lucide-react';
import { getWhatsAppUrl, getGeneralWhatsAppUrl } from '@/lib/whatsapp';
import type { Metadata } from 'next';
import { buildPageMetadata } from '@/lib/page-metadata';
import { ContentImage } from '@/components/ContentImage';

export const revalidate = 15; // Panelden yapılan değişiklikler daha hızlı yansısın diye 60'tan 15 saniyeye indirildi

export async function generateMetadata(): Promise<Metadata> {
  return buildPageMetadata({
    title: "Veli Sigorta | Antalya Kepez Sigorta Acentesi — Trafik, Kasko, DASK",
    description: "2004’ten beri Antalya Kepez’de hizmet veren aile sigorta acentesi. Trafik, kasko, DASK, tamamlayıcı sağlık ve işyeri sigortalarında teklif alın.",
    path: "/",
  });
}

export default async function HomePage() {
  const db = await getDb();
  const company = db.companyInfo;
  const services = db.services.filter((s) => s.isPublished).sort((a, b) => a.order - b.order);
  const blogs = db.blogs.filter((b) => b.isPublished).slice(0, 3);
  const faqs = db.faqs.slice(0, 5);
  const campaigns = db.campaigns || [];
  const partners = db.partners || [];

  const baseUrl = process.env.APP_URL || 'https://velisigorta.com.tr';
  const agencySchema = getInsuranceAgencySchema(company, baseUrl);

  const popularServices = services.slice(0, 6);
  const experienceYears = Math.max(0, new Date().getFullYear() - company.establishedYear);

  const stats = [
    { label: 'Faaliyet Geçmişi', value: `${experienceYears} Yıl`, desc: `${company.establishedYear}’ten beri Kepez / Antalya’da hizmet veriyoruz` },
    { label: 'Hizmet Bölgesi', value: company.city, desc: `${company.district} merkezli acente hizmeti` },
    { label: 'Hizmet Alanı', value: 'Bireysel', desc: 'Bireysel sigorta ihtiyaçları için bilgilendirme' },
    { label: 'Hizmet Alanı', value: 'Kurumsal', desc: 'İşletmeler için sigorta seçenekleri' },
  ];

  return (
    <div className="min-h-screen bg-[#FDFCFB] flex flex-col font-sans text-[#1A1A1A]">
      {/* Inject Structured Data */}
      {db.settings.enableStructuredData && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: serializeJsonLd(agencySchema) }}
        />
      )}

      <Header phones={company.phones} whatsappNumber={company.whatsappNumber} />

      <main className="flex-1">
        {/* INTERACTIVE CAMPAIGN SLIDER */}
        <HeroSlider
          campaigns={campaigns}
          whatsappNumber={company.whatsappNumber}
          phone={company.phones[0]}
        />

        {/* HERO SECTION */}
        <section className="relative bg-[#FDFCFB] pt-12 pb-20 px-4 sm:px-8 border-b border-[#E5E1DB]">
          <div className="max-w-7xl mx-auto relative z-10">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
              
              {/* Left Column: Hero Text & Value Proposition */}
              <div className="lg:col-span-7 space-y-6">
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-[#1A1A1A] text-[#FDFCFB] text-[10px] font-bold uppercase tracking-[0.2em]">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#F27D26]" />
                  <span>Antalya Kepez &bull; 2004’ten Beri Beraberiz</span>
                </div>

                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-serif text-[#1A1A1A] tracking-tight leading-[1.1]">
                  2004’ten Beri <br />
                  <span className="italic font-bold text-[#003366]">Güvenle Yanınızdayız.</span>
                </h1>

                <p className="text-base sm:text-lg text-[#555] leading-relaxed font-normal max-w-2xl">
                  Veli Sigorta; sigorta seçeneklerini, teminatları, muafiyetleri ve istisnaları daha anlaşılır biçimde değerlendirmenize yardımcı olur.
                </p>

                {/* Key Benefits List */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs font-semibold text-[#1A1A1A]">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#003366] shrink-0" />
                    <span>İhtiyaca Göre Teklif Seçenekleri</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#003366] shrink-0" />
                    <span>Hasar Sürecinde Acente Bilgilendirmesi</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#003366] shrink-0" />
                    <span>Kepez Dokuma’da Fiziksel Ofis Desteği</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#003366] shrink-0" />
                    <span>Telefon ve WhatsApp ile İletişim</span>
                  </div>
                </div>

                {/* Direct Action Buttons */}
                <div className="pt-4 flex flex-wrap items-center gap-4">
                  <a
                    href={getGeneralWhatsAppUrl(company.whatsappNumber)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-6 py-4 bg-[#003366] hover:bg-blue-900 text-white font-bold text-xs uppercase tracking-widest inline-flex items-center gap-2.5 transition-colors"
                  >
                    <MessageCircle className="w-4 h-4 text-[#F27D26]" />
                    <span>WhatsApp ile Teklif İste</span>
                  </a>

                  <a
                    href={`tel:${company.phones[0].replace(/\s/g, '')}`}
                    className="px-6 py-4 bg-[#1A1A1A] hover:bg-[#333] text-white font-bold text-xs uppercase tracking-widest inline-flex items-center gap-2.5 transition-colors"
                  >
                    <Phone className="w-4 h-4 text-[#F27D26]" />
                    <span>{company.phones[0]}</span>
                  </a>
                </div>
              </div>

              {/* Right Column: Interactive Quick Quote Form */}
              <div className="lg:col-span-5">
                <QuickQuoteForm whatsappNumber={company.whatsappNumber} />
              </div>

            </div>
          </div>
        </section>

        {/* TRUST INDICATORS & STATS */}
        <section className="bg-white py-12 border-b border-[#E5E1DB]">
          <div className="max-w-7xl mx-auto px-4 sm:px-8">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-[#E5E1DB] border border-[#E5E1DB]">
              {stats.map((stat, idx) => (
                <div
                  key={idx}
                  className="p-4 sm:p-6 bg-[#FDFCFB] text-center flex flex-col justify-center"
                >
                  {/* Değer punto ve iç boşluğu dar ekranda küçültülür: 320 px'de "Kurumsal"
                      gibi uzun bir kelime text-3xl ile hücreye sığmayıp tüm sayfayı 16 px
                      yana kaydırıyordu (ölçüldü: scrollWidth 336 > viewport 320). */}
                  <div className="text-xl sm:text-3xl lg:text-4xl font-serif italic font-bold text-[#003366] tracking-tight break-words">
                    {stat.value}
                  </div>
                  <div className="text-xs font-bold text-[#1A1A1A] uppercase tracking-wider mt-2">{stat.label}</div>
                  <div className="text-[11px] text-[#8A7E72] mt-1 leading-snug">{stat.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* PARTNER BRANDS / ANLAŞMALI ŞİRKETLER SLIDER/GRID */}
        <PartnerBrandsSlider partners={partners} />

        {/* INTENT SELECTOR SECTION ("Neyi Sigortalamak İstiyorsunuz?") */}
        <IntentSelector whatsappNumber={company.whatsappNumber} />

        {/* POPULAR INSURANCE SERVICES GRID */}
        <section className="py-16 px-4 sm:px-8 bg-[#FDFCFB]">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-4 pb-4 border-b border-[#E5E1DB]">
              <div>
                <span className="text-[11px] font-semibold text-[#8A7E72] uppercase tracking-[0.3em] block mb-1">
                  Öne Çıkan Ürünlerimiz
                </span>
                <h2 className="text-3xl sm:text-4xl font-serif text-[#1A1A1A] tracking-tight">
                  Öne Çıkan Sigorta Hizmetlerimiz
                </h2>
              </div>
              <Link
                href="/hizmetlerimiz"
                className="text-xs uppercase tracking-widest font-bold text-[#003366] hover:underline underline-offset-4 flex items-center gap-1.5"
              >
                <span>Tüm {services.length} Sigorta Türünü İncele</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {popularServices.map((service) => {
                const whatsappUrl = getWhatsAppUrl(company.whatsappNumber, service.title, 'teklif');

                return (
                  <div
                    key={service.slug}
                    className="bg-white p-6 border border-[#E5E1DB] hover:border-[#1A1A1A] transition-all flex flex-col justify-between group"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <span className="px-2.5 py-1 bg-[#1A1A1A] text-white text-[9px] font-bold uppercase tracking-[0.2em]">
                          {service.isMandatory ? 'Yasal Zorunlu' : 'İsteğe Bağlı'}
                        </span>
                        <Shield className="w-5 h-5 text-[#003366]" />
                      </div>

                      <h3 className="text-lg font-bold text-[#1A1A1A] group-hover:text-[#003366] transition-colors uppercase tracking-wider">
                        {service.title}
                      </h3>

                      <p className="text-xs text-[#555] mt-2 line-clamp-3 leading-relaxed">
                        {service.shortDescription}
                      </p>

                      <div className="mt-4 space-y-2 border-t border-[#E5E1DB] pt-3">
                        {service.coverage.slice(0, 3).map((cov, i) => (
                          <div key={i} className="flex items-start gap-2 text-[11px] text-[#1A1A1A]">
                            <CheckCircle2 className="w-3.5 h-3.5 text-[#003366] shrink-0 mt-0.5" />
                            <span>{cov}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="pt-6 mt-6 border-t border-[#E5E1DB] flex items-center gap-3">
                      <Link
                        href={`/hizmetlerimiz/${service.slug}`}
                        className="flex-1 text-center py-2.5 px-3 border border-[#1A1A1A] hover:bg-[#1A1A1A] hover:text-white text-[#1A1A1A] font-bold text-[11px] uppercase tracking-wider transition-all"
                      >
                        Detaylı İncele
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
        </section>

        {/* WHY VELI SIGORTA / FAMILY BUSINESS STORY */}
        <section className="py-16 px-4 sm:px-8 bg-white border-y border-[#E5E1DB]">
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
              
              <div className="lg:col-span-6 space-y-6">
                <span className="text-[11px] font-semibold text-[#8A7E72] uppercase tracking-[0.3em] block">
                  Kepez / Antalya Acenteniz
                </span>
                <h2 className="text-3xl sm:text-4xl font-serif text-[#1A1A1A] tracking-tight">
                  Neden Veli Sigorta? <br />
                  <span className="italic text-[#003366]">2004’ten Beri Antalya’da.</span>
                </h2>
                
                <p className="text-xs sm:text-sm text-[#555] leading-relaxed">
                  İnternet üzerindeki karmaşık sistemler veya çağrı merkezlerinde dakikalarca müzik dinletilen hatlar yerine, {company.district} {company.city}&apos;daki acentemizde sizi çayımızı içmeye bekliyoruz.
                </p>

                <div className="space-y-4 pt-2">
                  <div className="p-5 bg-[#FDFCFB] border border-[#E5E1DB] flex items-start gap-4">
                    <div className="p-3 bg-[#003366] text-white shrink-0">
                      <Users className="w-5 h-5 text-[#F27D26]" />
                    </div>
                    <div>
                      <h4 className="font-bold text-[#1A1A1A] text-xs uppercase tracking-wider">Acente Aile Bağları</h4>
                      <p className="text-xs text-[#555] mt-1 leading-relaxed">Müşteri değil, uzun yıllar dostumuz olarak gördüğümüz aile anlayışıyla hizmet veriyoruz.</p>
                    </div>
                  </div>

                  <div className="p-5 bg-[#FDFCFB] border border-[#E5E1DB] flex items-start gap-4">
                    <div className="p-3 bg-[#003366] text-white shrink-0">
                      <ShieldCheck className="w-5 h-5 text-[#F27D26]" />
                    </div>
                    <div>
                      <h4 className="font-bold text-[#1A1A1A] text-xs uppercase tracking-wider">İhtiyaca Göre Teklif İncelemesi</h4>
                      <p className="text-xs text-[#555] mt-1 leading-relaxed">Teminat ve poliçe koşullarını ihtiyaçlarınıza göre değerlendirmek için acente ekibimizle görüşebilirsiniz.</p>
                    </div>
                  </div>

                  <div className="p-5 bg-[#FDFCFB] border border-[#E5E1DB] flex items-start gap-4">
                    <div className="p-3 bg-[#003366] text-white shrink-0">
                      <Clock className="w-5 h-5 text-[#F27D26]" />
                    </div>
                    <div>
                      <h4 className="font-bold text-[#1A1A1A] text-xs uppercase tracking-wider">Hasar Süreci Bilgilendirmesi</h4>
                      <p className="text-xs text-[#555] mt-1 leading-relaxed">Hasar durumunda izlenecek adımlar ve gerekli belgeler hakkında acentemizden bilgi alabilirsiniz.</p>
                    </div>
                  </div>
                </div>

                <div className="pt-2">
                  <Link
                    href="/kurumsal"
                    className="inline-flex items-center gap-2 px-6 py-3.5 bg-[#1A1A1A] hover:bg-[#333] text-white font-bold text-xs uppercase tracking-widest transition-colors"
                  >
                    <span>Hakkımızda & Kurumsal Tarihçemiz</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>

              {/* Right Box: Map & Address Highlight */}
              <div className="lg:col-span-6 bg-[#1A1A1A] text-[#FDFCFB] p-6 sm:p-8 space-y-6 border border-[#333]">
                <div className="flex items-center justify-between border-b border-[#333] pb-4">
                  <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#242424] text-[#F27D26] text-[10px] font-bold uppercase tracking-wider">
                    <MapPin className="w-3.5 h-3.5" />
                    <span>Kepez Dokuma Acentemiz</span>
                  </div>
                  <span className="text-[11px] text-[#8A7E72] uppercase tracking-wider">İletişim Bilgileri</span>
                </div>

                <div className="space-y-2">
                  <h3 className="text-2xl font-serif text-white">Veli Sigorta Kepez Merkez</h3>
                  <p className="text-xs text-slate-300 leading-relaxed">{company.address}</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs">
                  <div className="p-3.5 bg-[#242424] border border-[#333]">
                    <div className="text-[10px] uppercase tracking-wider text-[#8A7E72]">Santral Telefon</div>
                    <a href={`tel:${company.phones[0].replace(/\s/g, '')}`} className="font-serif italic font-bold text-lg text-white hover:text-[#F27D26]">
                      {company.phones[0]}
                    </a>
                  </div>

                  <div className="p-3.5 bg-[#242424] border border-[#333]">
                    <div className="text-[10px] uppercase tracking-wider text-[#8A7E72]">GSM / WhatsApp</div>
                    <a href={`tel:${company.phones[2].replace(/\s/g, '')}`} className="font-serif italic font-bold text-lg text-[#F27D26] hover:underline">
                      {company.phones[2]}
                    </a>
                  </div>
                </div>

                {/* Map Iframe */}
                <div className="h-52 border border-[#333]">
                  <iframe
                    src={company.googleMapsEmbedUrl}
                    width="100%"
                    height="100%"
                    style={{ border: 0 }}
                    allowFullScreen={false}
                    loading="lazy"
                    title="Veli Sigorta Harita Konumu"
                  ></iframe>
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* EMERGENCY / DAMAGE GUIDANCE BOX */}
        <section className="py-12 px-4 sm:px-8 bg-[#1A1A1A] text-white border-b border-[#333]">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-[#003366] text-white shrink-0 mt-1">
                <AlertTriangle className="w-6 h-6 text-[#F27D26]" />
              </div>
              <div>
                <h3 className="text-xl font-serif font-bold text-white">Hasar Anında Ne Yapmalısınız?</h3>
                <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
                  Kaza veya zarar durumunda önce can güvenliğinizi sağlayın, gerekli resmi bildirimleri yapın ve poliçenizde belirtilen hasar iletişim kanalını kullanın.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <Link
                href="/hasar-aninda"
                className="px-5 py-3 bg-[#242424] border border-[#333] hover:bg-[#333] text-white font-bold text-xs uppercase tracking-widest"
              >
                Hasar Rehberini Oku
              </Link>
              <a
                href={`tel:${company.phones[2].replace(/\s/g, '')}`}
                className="px-5 py-3 bg-[#003366] hover:bg-blue-900 text-white font-bold text-xs uppercase tracking-widest inline-flex items-center gap-2"
              >
                <Phone className="w-3.5 h-3.5 text-[#F27D26]" />
                    <span>Hasar İçin İletişim</span>
              </a>
            </div>
          </div>
        </section>

        {/* LATEST NEWS & BLOG HIGHLIGHTS */}
        {blogs.length > 0 && (
          <section className="py-16 px-4 sm:px-8 bg-[#FDFCFB]">
            <div className="max-w-7xl mx-auto">
              <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-4 pb-4 border-b border-[#E5E1DB]">
                <div>
                  <span className="text-[11px] font-semibold text-[#8A7E72] uppercase tracking-[0.3em] block mb-1">
                    Sigorta Bilgisi & Güncel Haberler
                  </span>
                  <h2 className="text-3xl sm:text-4xl font-serif text-[#1A1A1A] tracking-tight">
                    Sektörden Son Makaleler ve Rehberler
                  </h2>
                </div>
                <Link
                  href="/haberler"
                  className="text-xs uppercase tracking-widest font-bold text-[#003366] hover:underline underline-offset-4 flex items-center gap-1.5"
                >
                  <span>Tüm Yazıları Gör</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {blogs.map((post) => (
                  <article
                    key={post.slug}
                    className="bg-white border border-[#E5E1DB] hover:border-[#1A1A1A] transition-all flex flex-col justify-between group"
                  >
                    <div>
                      <div className="h-48 overflow-hidden relative bg-[#F8F6F3] border-b border-[#E5E1DB]">
                        <ContentImage
                          src={post.featuredImage}
                          alt={post.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          placeholderClassName="w-full h-full bg-[#F5F2EC] flex items-center justify-center text-[#B9B0A4]"
                        />
                        <span className="absolute top-3 left-3 px-2.5 py-1 bg-[#1A1A1A] text-white text-[9px] font-bold uppercase tracking-wider">
                          {post.category}
                        </span>
                      </div>

                      <div className="p-5 space-y-2">
                        <div className="text-[10px] text-[#8A7E72] uppercase tracking-widest font-medium">{post.publishedAt}</div>
                        <h3 className="font-bold text-[#1A1A1A] text-base group-hover:text-[#003366] transition-colors line-clamp-2 uppercase tracking-wider">
                          {post.title}
                        </h3>
                        <p className="text-xs text-[#555] line-clamp-3 leading-relaxed">
                          {post.excerpt}
                        </p>
                      </div>
                    </div>

                    {/* Bağlantı sağa yaslı: kart içeriği soldan akıyor, eylem
                        sağ altta durunca okuma yönünün sonunda karşılanıyor. */}
                    <div className="p-5 pt-0 flex justify-end">
                      <Link
                        href={`/haberler/${post.slug}`}
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-[#003366] hover:underline uppercase tracking-wider"
                      >
                        <span>Devamını Oku</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* FAQ ACCORDION SECTION */}
        <section className="py-16 px-4 sm:px-8 bg-white border-t border-[#E5E1DB]">
          <div className="max-w-4xl mx-auto space-y-8">
            <div className="text-center space-y-2">
              <span className="text-[11px] font-semibold text-[#8A7E72] uppercase tracking-[0.3em] block">
                Sıkça Sorulan Sorular
              </span>
              <h2 className="text-3xl sm:text-4xl font-serif text-[#1A1A1A] tracking-tight">
                Aklınıza Takılan Sorular mı Var?
              </h2>
            </div>

            <div className="space-y-3">
              {faqs.map((faq) => (
                <div key={faq.id} className="p-6 bg-[#FDFCFB] border border-[#E5E1DB] space-y-2">
                  <h3 className="font-bold text-[#1A1A1A] text-sm flex items-start gap-2.5 uppercase tracking-wider">
                    <HelpCircle className="w-4 h-4 text-[#003366] shrink-0 mt-0.5" />
                    <span>{faq.question}</span>
                  </h3>
                  <p className="text-xs text-[#555] leading-relaxed pl-6.5">{faq.answer}</p>
                </div>
              ))}
            </div>

            <div className="text-center pt-4">
              <Link
                href="/sss"
                className="text-xs font-bold text-[#003366] hover:underline uppercase tracking-widest inline-flex items-center gap-1.5"
              >
                <span>Tüm S.S.S. Sorularını İncele</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer company={company} />
    </div>
  );
}
