import React from 'react';
import Link from 'next/link';
import { getDb } from '@/lib/db';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { AlertTriangle, Phone, FileText, CheckCircle2, ShieldAlert, MessageCircle, HelpCircle } from 'lucide-react';
import type { Metadata } from 'next';
import { buildPageMetadata } from '@/lib/page-metadata';

export const revalidate = 15; // Panelden yapılan değişiklikler hızlı yansısın diye 60 saniyeden düşürüldü

export async function generateMetadata(): Promise<Metadata> {
  return buildPageMetadata({
    title: "Hasar Anında Ne Yapmalı? Adım Adım Rehber | Veli Sigorta",
    description: "Trafik kazası, deprem, yangın ve su baskını gibi durumlarda izlenmesi gereken adımlar, gerekli belgeler ve acentemizin destek hattı.",
    path: "/hasar-aninda",
  });
}

export default async function DamageGuidePage() {
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
              <span className="text-white font-bold">Hasar Anında Ne Yapılmalı?</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight font-serif">
              Hasar ve Kaza Anında Adım Adım Rehber
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
              Kaza veya zarar durumunda önce can güvenliğinizi sağlayın, ardından ilgili kurumlara ve sigorta şirketinizin hasar kanalına bildirim yapın. Acentemizden süreç hakkında bilgi alabilirsiniz.
            </p>
          </div>
        </section>

        <section className="py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-10">
          
          {/* Emergency Direct Phone Banner */}
          <div className="bg-amber-50 border border-amber-300 rounded-2xl p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-2xs">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-amber-500 text-slate-950 font-bold rounded-xl shrink-0 mt-1">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900">Hasar Süreci İletişim Bilgileri</h2>
                <p className="text-xs text-slate-700 mt-1">
                  Önce can güvenliğinizi sağlayın ve acil durumda 112’yi arayın. Poliçenizdeki sigorta şirketi hasar kanalını kullanabilir, çalışma saatlerimiz içinde acentemizden süreç hakkında bilgi alabilirsiniz.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <a
                href={`tel:${company.phones[2].replace(/\s/g, '')}`}
                className="px-6 py-3.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs inline-flex items-center gap-2 shadow-md transition-all"
              >
                <Phone className="w-4 h-4" />
                <span>0542 369 07 07</span>
              </a>
            </div>
          </div>

          {/* Steps */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            
            {/* Step 1: Traffic Accident */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-2xs space-y-4">
              <div className="flex items-center gap-3">
                <span className="w-8 h-8 rounded-lg bg-blue-900 text-white font-bold text-sm flex items-center justify-center">
                  1
                </span>
                <h3 className="font-bold text-slate-900 text-base">Trafik Kazası Durumunda</h3>
              </div>
              <ul className="space-y-2 text-xs text-slate-700">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>Önce kendi güvenliğinizi sağlayın; yaralanma veya tehlike varsa 112’nin ve görevlilerin talimatlarını izleyin.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>Yaralanma, yangın veya devam eden bir tehlike varsa <strong>112 Acil Çağrı Merkezi</strong> ile iletişime geçin.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>Güvenliyse olay yerini, araçları, plakaları ve görünen hasarı fotoğraflayın.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>Kaza tespit tutanağının uygun olup olmadığını olayın koşullarına göre kontrol edin; tereddütte resmi görevlilerin ve sigorta şirketinizin yönlendirmesini alın.</span>
                </li>
              </ul>
            </div>

            {/* Step 2: Home / Workplace Water or Fire */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-2xs space-y-4">
              <div className="flex items-center gap-3">
                <span className="w-8 h-8 rounded-lg bg-blue-900 text-white font-bold text-sm flex items-center justify-center">
                  2
                </span>
                <h3 className="font-bold text-slate-900 text-base">Ev veya İşyeri Su Baskını & Yangın</h3>
              </div>
              <ul className="space-y-2 text-xs text-slate-700">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>Yalnız güvenliyse elektrik, su veya doğalgaz kaynağını kapatın; tehlikeli alana girmeyin.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>Yangın, gaz kaçağı veya acil tehlike durumunda binayı terk edin ve 112’yi arayın.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>Güvenliyse ve acil zararı artırmayacaksa, müdahale öncesinde hasarı fotoğraf veya video ile belgeleyin.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>Poliçenizde belirtilen sigorta şirketi hasar kanalına bildirim yapın; eksper ve belge süreci için şirket yönlendirmesini izleyin.</span>
                </li>
              </ul>
            </div>

          </div>

        </section>
      </main>

      <Footer company={company} />
    </div>
  );
}
