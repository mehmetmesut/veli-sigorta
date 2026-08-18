import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getBaseUrl } from '@/lib/page-metadata';

export const dynamic = 'force-dynamic';

/**
 * llms.txt'in ayrıntılı sürümü: her hizmetin kapsamı, kategoriler ve tüm SSS.
 * Zorunlu bir SEO standardı değil; LLM/ajan keşfedilebilirliği için yardımcı katman.
 */
export async function GET() {
  const db = await getDb();
  if (!db.settings.aiSearchVisible) {
    return new NextResponse('AI arama görünürlüğü devre dışı.', {
      status: 404,
      headers: { 'Cache-Control': 'no-store' },
    });
  }

  const company = db.companyInfo;
  const base = getBaseUrl();

  const categoriesList = db.categories
    .map((category) => `- ${category.name}: ${category.description}`)
    .join('\n');

  const servicesDetail = db.services
    .filter((service) => service.isPublished)
    .map((service) => {
      const kapsam = service.coverage?.length
        ? `\n  - Kapsam: ${service.coverage.join('; ')}`
        : '';
      const disinda = service.exclusions?.length
        ? `\n  - Kapsam dışı: ${service.exclusions.join('; ')}`
        : '';
      return [
        `### ${service.title}`,
        `- Sayfa: ${base}/hizmetlerimiz/${service.slug}`,
        `- Özet: ${service.shortDescription}`,
        `- Zorunlu ürün mü: ${service.isMandatory ? 'Evet' : 'Hayır'}${kapsam}${disinda}`,
      ].join('\n');
    })
    .join('\n\n');

  const faqsList = db.faqs
    .map((faq) => `### ${faq.question}\n${faq.answer}`)
    .join('\n\n');

  const blogList = db.blogs
    .filter((post) => post.isPublished)
    .map((post) => `- [${post.title}](${base}/haberler/${post.slug}): ${post.excerpt}`)
    .join('\n');

  const content = `# ${company.name} — Ayrıntılı Bilgi Dosyası

> Bu dosya, ${company.name} web sitesinin içeriğini yapay zekâ ajanları ve dil modelleri için
> makine-okunabilir biçimde özetler. Kaynak: ${base}

## Kurum Künyesi
- Ticaret unvanı: ${company.name}
- Kuruluş yılı: ${company.establishedYear}
- Faaliyet alanı: Sigorta aracılık (acentelik) hizmetleri
- Şehir / İlçe / Mahalle: ${company.city} / ${company.district} / ${company.neighborhood}
- Adres: ${company.address}
- Telefon: ${company.phones.join(' | ')}
- E-posta: ${company.emails.join(' | ')}
- Çalışma saatleri: ${company.workingHours}
- Vergi dairesi / numarası: ${company.taxOffice} - ${company.taxNumber}
- Ticaret sicil no: ${company.tradeRegistryNo}
- MERSİS no: ${company.mersisNo}

## Sigorta Kategorileri
${categoriesList}

## Sigorta Ürünleri (ayrıntılı)
${servicesDetail}

## Sıkça Sorulan Sorular (tamamı)
${faqsList}

## Yayımlanan Yazılar
${blogList || '- Henüz yayımlanmış yazı yok.'}

## Kullanım Notları
- Teminat, muafiyet, istisna ve fiyatlar sigorta şirketine, ürüne ve kişiye göre değişir.
- Bu dosyadaki bilgiler tanıtım amaçlıdır; poliçe hükümleri esastır.
- Teklif ve kesin bilgi için acente ile iletişime geçilmelidir: ${base}/iletisim
`;

  return new NextResponse(content, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
