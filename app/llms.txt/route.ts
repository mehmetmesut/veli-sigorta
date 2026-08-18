import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getBaseUrl } from '@/lib/page-metadata';

export const dynamic = 'force-dynamic';

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

  const servicesList = db.services
    .filter((service) => service.isPublished)
    .map(
      (service) =>
        `- [${service.title}](${base}/hizmetlerimiz/${service.slug}): ${service.shortDescription}`,
    )
    .join('\n');

  const faqsList = db.faqs
    .slice(0, 5)
    .map((faq) => `- **${faq.question}** ${faq.answer}`)
    .join('\n');

  // Yalnızca gerçekten yayında olan, indekslenebilir public sayfalar listelenir.
  const llmsTxtContent = `# ${company.name}

> ${company.establishedYear} yılından bu yana ${company.city} ${company.district}'de faaliyet gösteren sigorta acentesi. Trafik, kasko, DASK, sağlık, konut ve işyeri sigortalarında teklif ve danışmanlık sunar.

## Ana Sayfalar
- [Ana Sayfa](${base}/): Acentenin tanıtımı, öne çıkan sigorta ürünleri ve hızlı teklif formu.
- [Kurumsal](${base}/kurumsal): Kuruluş geçmişi, çalışma yaklaşımı ve resmî firma künyesi.
- [Sigorta Hizmetlerimiz](${base}/hizmetlerimiz): Tüm sigorta ürünlerinin listesi ve detay sayfaları.
- [Teklif Al](${base}/teklif-al): Ürün seçerek WhatsApp üzerinden teklif talebi oluşturma.
- [İletişim](${base}/iletisim): Adres, telefon, çalışma saatleri ve harita konumu.
- [Sıkça Sorulan Sorular](${base}/sss): Poliçe, teminat ve hasar süreçlerine dair yanıtlar.
- [Hasar Anında](${base}/hasar-aninda): Kaza, deprem, yangın ve su baskını durumunda izlenecek adımlar.
- [Bilgi Merkezi](${base}/bilgi-merkezi): Sigorta konularında ayrıntılı rehberler.
- [Haberler ve Blog](${base}/haberler): Sigorta mevzuatı ve bilgilendirme yazıları.

## İletişim ve Konum
- Şehir / İlçe: ${company.city} / ${company.district}
- Adres: ${company.address}
- Telefon: ${company.phones.join(' | ')}
- E-posta: ${company.emails.join(' | ')}
- Çalışma saatleri: ${company.workingHours}

## Resmî Bilgiler
- Ticaret unvanı: ${company.name}
- Vergi dairesi / numarası: ${company.taxOffice} - ${company.taxNumber}
- Ticaret sicil no: ${company.tradeRegistryNo}
- MERSİS no: ${company.mersisNo}

## Sigorta Ürünleri
${servicesList}

## Sıkça Sorulan Sorular
${faqsList}

## Notlar
- Teminat, muafiyet ve istisnalar sigorta şirketine ve ürüne göre değişir; kesin bilgi için acente ile görüşülmelidir.
- Daha ayrıntılı makine-okunabilir sürüm: [llms-full.txt](${base}/llms-full.txt)
`;

  return new NextResponse(llmsTxtContent, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
