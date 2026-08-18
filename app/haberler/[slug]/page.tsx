import React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getDb } from '@/lib/db';
import { serializeJsonLd } from '@/lib/json-ld';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { getArticleSchema } from '@/lib/schema';
import { Calendar, User, Clock, ArrowLeft, ExternalLink, Share2, ShieldCheck, ArrowRight, MessageCircle } from 'lucide-react';

export const revalidate = 15; // Panelden yapılan değişiklikler hızlı yansısın diye 60 saniyeden düşürüldü
import { getWhatsAppUrl } from '@/lib/whatsapp';
import type { Metadata } from 'next';
import { buildPageMetadata } from '@/lib/page-metadata';
import { ContentImage } from '@/components/ContentImage';

export async function generateStaticParams() {
  const db = await getDb();
  return db.blogs.map((b) => ({ slug: b.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const db = await getDb();
  const post = db.blogs.find((b) => b.slug === slug && b.isPublished);

  if (!post) {
    return buildPageMetadata({
      title: 'Yazı Bulunamadı | Veli Sigorta',
      description: 'Aradığınız yazı yayından kaldırılmış olabilir.',
      path: `/haberler/${slug}`,
    });
  }

  return buildPageMetadata({
    title: `${post.title} | Veli Sigorta Antalya`,
    description: post.excerpt || post.title,
    path: `/haberler/${post.slug}`,
    ogImage: post.featuredImage,
    type: 'article',
  });
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const resolvedParams = await params;
  const db = await getDb();
  const company = db.companyInfo;
  const post = db.blogs.find((b) => b.slug === resolvedParams.slug && b.isPublished);

  if (!post) {
    notFound();
  }

  const relatedServices = db.services.filter(
    (s) =>
      s.isPublished &&
      ((post.relatedServiceIds || []).includes(s.id) ||
        (post.relatedServiceSlugs || []).includes(s.slug) ||
        (s.relatedBlogIds || []).includes(post.id) ||
        (s.relatedBlogSlugs || []).includes(post.slug))
  );

  const baseUrl = process.env.APP_URL || 'https://velisigorta.com.tr';
  const articleSchema = getArticleSchema(post, company, baseUrl);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-800">
      {db.settings.enableStructuredData && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: serializeJsonLd(articleSchema) }}
        />
      )}

      <Header phones={company.phones} whatsappNumber={company.whatsappNumber} />

      <main className="flex-1">
        <section className="bg-slate-900 text-white py-12 px-4 sm:px-6 lg:px-8 border-b border-slate-800">
          <div className="max-w-4xl mx-auto space-y-4">
            <Link
              href="/haberler"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-300 hover:text-white"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Tüm Haberlere Dön</span>
            </Link>

            <div className="flex items-center gap-3 text-xs text-slate-300 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full bg-blue-900 text-blue-200 font-bold">
                {post.category}
              </span>
              <span>•</span>
              <span className="inline-flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                <span>{post.publishedAt}</span>
              </span>
              <span>•</span>
              <span className="inline-flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                <span>{post.readTimeMinutes} dk okuma</span>
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight font-serif">
              {post.title}
            </h1>
          </div>
        </section>

        <section className="py-12 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto space-y-8">
          <div className="rounded-2xl overflow-hidden border border-slate-200 shadow-md max-h-96">
            <ContentImage
              src={post.featuredImage}
              alt={post.title}
              className="w-full h-full object-cover"
              placeholderClassName="w-full h-64 bg-[#F5F2EC] flex items-center justify-center text-[#B9B0A4]"
              loading="eager"
            />
          </div>

          <div className="bg-white rounded-2xl p-6 sm:p-10 border border-slate-200 shadow-2xs space-y-6">
            <div
              className="prose prose-slate max-w-none text-xs sm:text-sm leading-relaxed space-y-4"
              dangerouslySetInnerHTML={{ __html: post.content }}
            />

            {post.sources && post.sources.length > 0 && (
              <div className="pt-6 border-t border-slate-100 text-xs space-y-2">
                <span className="font-bold text-slate-900 block">Kaynaklar ve Referanslar:</span>
                <div className="flex flex-wrap gap-3">
                  {post.sources.map((s, i) => (
                    <a
                      key={i}
                      href={s.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-blue-800 hover:underline"
                    >
                      <span>{s.title}</span>
                      <ExternalLink className="w-3 h-3 text-slate-400" />
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* LINKED INSURANCE PRODUCTS CARD SECTION */}
          {relatedServices.length > 0 && (
            <div className="bg-slate-900 text-white rounded-2xl p-6 sm:p-8 border border-slate-800 shadow-md space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-full bg-blue-900 text-blue-200 text-[10px] font-extrabold uppercase">
                      İlişkili Sigorta Poliçeleri
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-white font-serif flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-blue-400" />
                    <span>Bu Konuyla İlgili Sigorta Ürünleri & Fiyat Teklifi</span>
                  </h3>
                </div>
                <a
                  href={getWhatsAppUrl(company.whatsappNumber, post.title, 'bilgi')}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs inline-flex items-center gap-2 shadow-xs transition-colors shrink-0"
                >
                  <MessageCircle className="w-4 h-4 fill-white text-emerald-600" />
                  <span>Müşteri Temsilcisine Sor</span>
                </a>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {relatedServices.map((srv) => (
                  <div
                    key={srv.slug}
                    className="p-4 rounded-xl bg-slate-800/80 border border-slate-700 hover:border-blue-500 transition-all space-y-3 flex flex-col justify-between"
                  >
                    <div className="space-y-1">
                      <div className="font-bold text-sm text-white">{srv.title}</div>
                      <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed">
                        {srv.shortDescription}
                      </p>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-700/60">
                      <Link
                        href={`/hizmetlerimiz/${srv.slug}`}
                        className="text-xs font-bold text-blue-300 hover:text-white inline-flex items-center gap-1"
                      >
                        <span>Poliçe Detayları</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>

                      <Link
                        href={`/teklif-al?hizmet=${encodeURIComponent(srv.title)}`}
                        className="px-3 py-1.5 rounded-lg bg-blue-800 hover:bg-blue-700 text-white font-extrabold text-[11px] transition-colors"
                      >
                        Teklif Al
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      </main>

      <Footer company={company} />
    </div>
  );
}
