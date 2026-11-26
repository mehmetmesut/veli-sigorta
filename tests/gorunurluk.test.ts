import assert from 'node:assert/strict';
import test from 'node:test';
import { acenteSemaEki, getInsuranceAgencySchema, googleHaritaUrl, yetkiliSirketMetni } from '../lib/schema';
import { yorumIstegiBaglantisi } from '../lib/police';
import type { CompanyInfo } from '../lib/types';

const ortaklar = [
  { name: 'AXA Sigorta', isActive: true },
  { name: 'Eski Sigorta', isActive: false },
  { name: 'Sompo Sigorta', isActive: true },
  { name: 'Türkiye Sigorta', isActive: true },
];

test('yetkili şirket metni yalnız etkin ortakları Türkçe bağlaçla sıralar', () => {
  assert.equal(yetkiliSirketMetni(ortaklar), 'AXA Sigorta, Sompo Sigorta ve Türkiye Sigorta');
  assert.equal(yetkiliSirketMetni([{ name: 'AXA Sigorta', isActive: true }]), 'AXA Sigorta');
  assert.equal(yetkiliSirketMetni([{ name: '  ', isActive: true }]), '');
  assert.equal(yetkiliSirketMetni([]), '');
});

test('şema eki ayarlardan koordinat, yer kimliği ve etkin şirketleri alır', () => {
  const ek = acenteSemaEki({
    partners: ortaklar,
    settings: { geoLat: 36.9, geoLng: 30.6, googleBusinessPlaceId: 'ChIJabc' },
  });
  assert.deepEqual(ek.yetkiliSirketler, ['AXA Sigorta', 'Sompo Sigorta', 'Türkiye Sigorta']);
  assert.equal(ek.enlem, 36.9);
  assert.equal(googleHaritaUrl(ek.googlePlaceId), 'https://www.google.com/maps/place/?q=place_id:ChIJabc');
  assert.equal(googleHaritaUrl(undefined), undefined);
});

test('acente şeması harita bağlantısını sameAs ve hasMap olarak, levha numarasını kimlik olarak verir', () => {
  const firma = {
    name: 'Veli Sigorta Aracılık Hizmetleri',
    establishedYear: 2004,
    phones: ['0242 000 00 00'],
    emails: ['bilgi@ornek.com'],
    address: 'Özgürlük Mah.',
    district: 'Kepez',
    city: 'Antalya',
    socialMedia: { instagram: 'https://instagram.com/ornek', facebook: '' },
    levhaNo: 'T123',
  } as unknown as CompanyInfo;
  const sema = getInsuranceAgencySchema(firma, 'https://ornek.com', { googlePlaceId: 'ChIJabc', yetkiliSirketler: ['AXA Sigorta'] });
  assert.deepEqual(sema.sameAs, ['https://www.google.com/maps/place/?q=place_id:ChIJabc', 'https://instagram.com/ornek']);
  assert.equal(sema.hasMap, 'https://www.google.com/maps/place/?q=place_id:ChIJabc');
  assert.equal(sema.identifier?.value, 'T123');
  assert.equal(sema.founder.name, 'Veli UĞURCU');
  assert.equal(sema.employee.length, 3);
  assert.equal(sema.areaServed.length, 20);
  assert.ok(sema.areaServed.some((a) => a.name === 'Alanya'));
  assert.match(sema.description, /AXA Sigorta yetkili acentesi/);

  const levhasiz = getInsuranceAgencySchema({ ...firma, levhaNo: undefined }, 'https://ornek.com');
  assert.equal('identifier' in levhasiz, false);
  assert.equal('hasMap' in levhasiz, false);
});

test('yorum isteği bireysel müşteriye adıyla hitap eder, telefonsuz müşteride bağlantı üretmez', () => {
  const bag = yorumIstegiBaglantisi(
    { tip: 'bireysel', ad: 'Ayşe', soyad: 'YILMAZ', mobilTelefon: '0532 111 22 33' } as never,
    'https://velisigorta.com.tr',
  );
  assert.ok(bag?.startsWith('https://wa.me/905321112233?text='));
  const mesaj = decodeURIComponent(bag!.split('text=')[1]);
  assert.match(mesaj, /^Merhaba Ayşe, /);
  assert.match(mesaj, /https:\/\/velisigorta\.com\.tr\/yorum$/);

  assert.equal(yorumIstegiBaglantisi({ tip: 'bireysel', ad: 'Ayşe', mobilTelefon: '' } as never, 'https://x'), null);
});
