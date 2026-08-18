import React from 'react';
import Link from 'next/link';
import { getDb } from '@/lib/db';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { ArrowRight, Newspaper, Calendar, User } from 'lucide-react';
import type { Metadata } from 'next';
import { buildPageMetadata } from '@/lib/page-metadata';
import { ContentImage } from '@/components/ContentImage';
import { YapisalVeri } from '@/components/YapisalVeri';
import { getBreadcrumbSchema, getItemListSchema, getWebPageSchema } from '@/lib/schema';
import { getBaseUrl } from '@/lib/page-metadata';

export const revalidate = 15; // Panelden yapılan değişiklikler hızlı yansısın diye 60 saniyeden düşürüldü

export async function generateMetadata(): Promise<Metadata> {
  return buildPageMetadata({
    title: "Sigorta Haberleri ve Rehber Yazıları | Veli Sigorta Antalya",
    description: "Sigorta mevzuatı, poliçe karşılaştırmaları ve Antalya’ya özel bilgilendirme yazıları; acentemizin güncel haber ve rehber içerikleri.",
    path: "/haberler",
  });
}

export default async function NewsBlogPage() {
  const db = await getDb();
  const company = db.companyInfo;
  const blogs = db.blogs.filter((b) => b.isPublished);

  const baseUrl = getBaseUrl();
  const semalar = [
    getWebPageSchema({
      tur: 'CollectionPage',
      ad: 'Haberler ve Rehber Yazıları',
      aciklama: 'Sigorta mevzuatı, poliçe ve hasar süreçleri üzerine güncel yazılar.',
      yol: '/haberler',
      baseUrl,
    }),
    blogs.length > 0
      ? getItemListSchema({
          ad: 'Haberler ve Rehber Yazıları',
          ogeler: blogs.map((b) => ({ name: b.title, url: `/haberler/${b.slug}` })),
          baseUrl,
        })
      : null,
    getBreadcrumbSchema([{ name: 'Ana Sayfa', url: '/' }, { name: 'Haberler', url: '/haberler' }], baseUrl),
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
              <span className="text-white font-bold">Sigorta Haberleri & Blog</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight font-serif">
              Sigorta Haberleri, Rehberler & Yasal Güncellemeler
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
              Trafik sigortası tarifeleri, DASK değişiklikleri, sağlık sigortası koşulları ve sektördeki gelişmeler.
            </p>
          </div>
        </section>

        <section className="py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {blogs.map((post) => (
              <article
                key={post.slug}
                className="bg-white rounded-2xl overflow-hidden border border-slate-200/90 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between group"
              >
                <div>
                  <div className="h-48 overflow-hidden relative bg-slate-100">
                    <ContentImage
                      src={post.featuredImage}
                      alt={post.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      placeholderClassName="w-full h-full bg-[#F5F2EC] flex items-center justify-center text-[#B9B0A4]"
                    />
                    <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-slate-900/80 backdrop-blur-xs text-white text-[10px] font-bold">
                      {post.category}
                    </span>
                  </div>

                  <div className="p-5 space-y-2">
                    <div className="flex items-center gap-3 text-[11px] text-slate-400 font-medium">
                      <span className="inline-flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        <span>{post.publishedAt}</span>
                      </span>
                      <span>•</span>
                      <span className="inline-flex items-center gap-1">
                        <User className="w-3 h-3" />
                        <span>{post.author}</span>
                      </span>
                    </div>

                    <h2 className="font-bold text-slate-900 text-base group-hover:text-blue-900 transition-colors line-clamp-2">
                      {post.title}
                    </h2>
                    <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed">{post.excerpt}</p>
                  </div>
                </div>

                {/* Ana sayfadaki blog kartıyla aynı hizalama: eylem sağ altta. */}
                <div className="p-5 pt-0 flex justify-end">
                  <Link
                    href={`/haberler/${post.slug}`}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-900 hover:text-blue-950"
                  >
                    <span>Yazının Tamamını Oku</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </section>
      </main>

      <Footer company={company} />
    </div>
  );
}
