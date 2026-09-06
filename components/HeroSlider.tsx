'use client';

import React, { useState, useEffect, useRef, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'motion/react';
import {
  ChevronLeft,
  ChevronRight,
  Pause,
  Play,
  ShieldCheck,
  MessageCircle,
  Phone,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  Clock,
  Award,
} from 'lucide-react';
import { CampaignItem } from '@/lib/types';
import { getGeneralWhatsAppUrl } from '@/lib/whatsapp';
import { srcSetUret } from '@/lib/gorsel-varyant';

interface HeroSliderProps {
  campaigns?: CampaignItem[];
  whatsappNumber: string;
  phone: string;
}

const DEFAULT_SLIDES = [
  {
    id: 'slide-1',
    badge: '2004’ten Beri Antalya Kepez’de',
    title: 'Sigorta İhtiyacınızı Birlikte Değerlendirelim',
    description: 'Trafik, kasko, sağlık, DASK ve diğer sigorta türleri hakkında bilgi ve teklif isteyin.',
    ctaText: 'Hemen Teklif Al',
    ctaLink: '/teklif-al',
    tag: 'Trafik & Kasko',
    iconBg: 'bg-[#003366]',
  },
  {
    id: 'slide-2',
    badge: 'DASK Bilgilendirmesi',
    title: 'DASK Poliçenizi Zamanında Kontrol Edin',
    description: 'Poliçenizin geçerlilik tarihini ve ihtiyaç duyduğunuz ek teminat seçeneklerini acentemizle görüşün.',
    ctaText: 'DASK Hakkında Bilgi Al',
    ctaLink: '/teklif-al?hizmet=dask-zorunlu-deprem-sigortasi',
    tag: 'DASK',
    iconBg: 'bg-[#F27D26]',
  },
  {
    id: 'slide-3',
    badge: 'Genişletilmiş Koruma',
    title: 'Kasko Teminatlarını İhtiyacınıza Göre İnceleyin',
    description: 'İkame araç, yol yardım ve servis seçenekleri poliçeye göre değişir; kapsamı teklif aşamasında birlikte değerlendirelim.',
    ctaText: 'Kasko Teklifi Al',
    ctaLink: '/teklif-al?hizmet=kasko-sigortasi',
    tag: 'Kasko',
    iconBg: 'bg-[#1A1A1A]',
  },
  {
    id: 'slide-4',
    badge: 'Sağlık Sigortası',
    title: 'Tamamlayıcı Sağlık Sigortası Seçenekleri',
    description: 'Anlaşmalı kurum ağı, bekleme süreleri ve kapsam koşulları ürüne göre değişir; size uygun seçenekleri sorun.',
    ctaText: 'TSS Hakkında Bilgi Al',
    ctaLink: '/teklif-al?hizmet=tamamlayici-saglik-sigortasi',
    tag: 'Sağlık Sigortası',
    iconBg: 'bg-[#003366]',
  },
];

const HAREKET_SORGUSU = '(prefers-reduced-motion: reduce)';

/** `useSyncExternalStore` aboneliği: tercih değişirse bileşen yeniden çizilir. */
function hareketTercihiniDinle(degisti: () => void): () => void {
  const sorgu = window.matchMedia(HAREKET_SORGUSU);
  sorgu.addEventListener('change', degisti);
  return () => sorgu.removeEventListener('change', degisti);
}

function hareketTercihiniOku(): boolean {
  return window.matchMedia(HAREKET_SORGUSU).matches;
}

export function HeroSlider({ campaigns = [], whatsappNumber, phone }: HeroSliderProps) {
  // Slaytlar panelden yönetilir. Sıra numarası önceden hiç uygulanmıyordu;
  // artık panelde girilen `order` değerine göre diziliyorlar.
  const activeCampaigns = campaigns
    .filter((c) => c.isActive)
    .slice()
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  // DEFAULT_SLIDES yalnızca acil durum yedeğidir; normalde veritabanı doludur.
  const slides = activeCampaigns.length > 0 ? activeCampaigns : DEFAULT_SLIDES;

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  /** Kullanıcının duraklat düğmesiyle verdiği karar; fare hareketinden bağımsızdır. */
  const [elleDuraklatildi, setElleDuraklatildi] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const nextSlide = () => {
    setCurrentIndex((prev) => (prev + 1) % slides.length);
  };

  const prevSlide = () => {
    setCurrentIndex((prev) => (prev - 1 + slides.length) % slides.length);
  };

  /**
   * "Hareketi azalt" tercihi açıkken otomatik ilerleme hiç başlamaz.
   *
   * Vestibüler rahatsızlığı olan kullanıcılar için işletim sistemi düzeyinde açılan
   * bu tercih, WCAG'in hareket kısıtlama önerisinin karşılığıdır.
   *
   * `useSyncExternalStore` kullanılır: medya sorgusu React dışında yaşayan bir
   * kaynaktır. Efekt içinde setState çağırmak fazladan bir render turu doğurur ve
   * lint kuralı bunu haklı olarak engeller; bu API tam olarak bu iş için vardır.
   * Sunucuda `false` döner — statik HTML her zaman hareketli sürümle üretilir,
   * tercih istemcide uygulanır.
   */
  const hareketAzaltilsin = useSyncExternalStore(
    hareketTercihiniDinle,
    hareketTercihiniOku,
    () => false,
  );

  useEffect(() => {
    if (isPaused || elleDuraklatildi || hareketAzaltilsin || slides.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % slides.length);
    }, 5500);

    return () => clearInterval(interval);
  }, [isPaused, elleDuraklatildi, hareketAzaltilsin, slides.length]);

  const currentSlide = slides[currentIndex];
  const whatsappUrl = getGeneralWhatsAppUrl(whatsappNumber);

  // DEFAULT_SLIDES hiç görsel içermez, bu yüzden onlarda metin her zaman gösterilir.
  // Gerçek kampanyalarda görsel varsa, metin/buton katmanı `showOverlayWithImage`
  // false olduğunda tamamen gizlenir ve görsel tam genişlikte tek başına kalır.
  // `imageUrl`'i yerel değişkene çıkarmak, DEFAULT_SLIDES ile CampaignItem birleşim
  // tipinde JSX içinde tekrar tekrar `in` daraltması yapma ihtiyacını ortadan kaldırır.
  const slideImageUrl = 'imageUrl' in currentSlide ? currentSlide.imageUrl : undefined;
  const hasImage = Boolean(slideImageUrl);
  const overlayRequested =
    'showOverlayWithImage' in currentSlide ? currentSlide.showOverlayWithImage !== false : true;
  const showTextOverlay = !hasImage || overlayRequested;

  return (
    <div
      id="hero-slider-wrapper"
      className="relative w-full bg-gradient-to-b from-[#FFFDF9] via-[#FDFCFB] to-[#F7F4EE] text-[#1A1A1A] overflow-hidden border-b border-[#E5E1DB] transition-all duration-500 ease-in-out"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      /* Klavyeyle gezinen kullanıcı mouseenter tetiklemez; odak da duraklatır. */
      onFocusCapture={() => setIsPaused(true)}
      onBlurCapture={() => setIsPaused(false)}
    >
      {/* Decorative Subtle Background Pattern */}
      <div className="absolute inset-0 bg-[radial-gradient(#E5E1DB_1px,transparent_1px)] [background-size:20px_20px] opacity-40 pointer-events-none" />

      {/*
        Alt boşluk üstten ayrı tutulur: slayt kontrollerinin (noktalar/oklar)
        altında gereğinden geniş bir şerit kalmasın diye alt dolgu belirgin
        biçimde daha dardır.

        İç boşluk (px-4 sm:px-8) `max-w-7xl mx-auto`'dan AYRI, dıştaki tam
        genişlik `div`'e konur — bu, sitenin geri kalanının (üst çubuk, "2004'ten
        Beri" bölümü) kullandığı kalıptır. İkisini aynı `div`'de birleştirmek
        içeriği (logo, slayt görseli) o ortak hizadan 32px sağa kaydırıyordu.
      */}
      <div className="px-4 sm:px-8">
      <div className="max-w-7xl mx-auto pt-10 lg:pt-12 pb-4 lg:pb-5 relative z-10">
        <div className="relative grid grid-cols-1 lg:grid-cols-12 gap-8 items-center min-h-[340px]">
          
          {/*
            Main Slide Content
            `lg:self-stretch lg:min-h-[340px]` koşulsuz uygulanır — görsel kutusu
            (aşağıda) her zaman aynı mutlak konum kurallarını kullanıyor ve o
            kuralların referans aldığı kapsayıcı yüksekliğinin, görsel eklendiğinde
            metin/buton gösterilsin mi seçeneğinden (Evet/Hayır) BAĞIMSIZ olarak
            hep aynı olması gerekiyor (kullanıcı isteği: görsel gösterim boyutu
            iki seçenekte de aynı olmalı).
          */}
          <div className="relative lg:col-span-8 space-y-5 lg:self-stretch lg:min-h-[340px]">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentIndex}
                initial={{ opacity: 0, filter: 'blur(4px)', y: 4 }}
                animate={{ opacity: 1, filter: 'blur(0px)', y: 0 }}
                exit={{ opacity: 0, filter: 'blur(4px)', y: -4 }}
                transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
                className="space-y-4 h-full"
              >
                {/*
                  Slayt görseli — panelden eklenirse gösterilir, boşsa hiç yer kaplamaz.

                  Görsel gösterim kutusunun boyutu/konumu, "Görsel eklendiğinde
                  başlık/rozet/açıklama/butonlar gösterilsin mi?" sorusuna verilen
                  Evet/Hayır yanıtından BAĞIMSIZ, HER ZAMAN AYNIDIR (kullanıcı isteği).
                  Masaüstünde sütun satır yüksekliğine yayılır (`lg:absolute` +
                  `lg:w-auto lg:h-auto` ile dört kenar `inset-*` üzerinden konumlanır,
                  genişlik/yükseklik bu dört değerden otomatik hesaplanır), mobilde
                  satır yüksekliği olmadığı için en-boy oranı yüksekliği belirler.
                  `object-cover` her iki modda da kutuyu tamamen doldurur — önceden
                  metin katmanı açıkken `object-contain` kullanılıyordu, ama kutu
                  "Hayır" modundakiyle aynı boyuta büyüyünce görselin kendi oranı
                  kutudan dar kaldığı için üstte/altta boş alan bırakıyordu.

                  Kenar sabitleme talimatları değiştikçe bunlardan yalnızca ilgili
                  kenarın değerini güncelleyin, diğerlerine dokunmayın:
                  - `top-[-33px]`: sütunun üst kenarına göre — sarmalayıcının
                    `lg:pt-12` (48px) dolgusuyla birlikte navbar'ın altıyla arasında
                    tam 15px boşluk bırakır (48 + top değeri = hedef boşluk; boşluk
                    değişirse yalnızca bu değeri güncelleyin).
                  - `left-0`: sütunun sol kenarıyla aynı hizada, sabit.
                  - `right-[-60px]`: sütunun sağ kenarının 60px sağına taşar (kart
                    `z-10` ile önde kaldığından bu görsel sorun yaratmaz).
                  - `bottom-[-50px]`: sütunun alt kenarının 50px altına taşar.
                  Konumlama sütun (`lg:col-span-8`) kapsayıcısına görecelidir; o
                  yüzden o kapsayıcı her zaman `position: relative` tutulmalıdır.

                  Metin gösteriliyorsa sağda beyaza karışan gradyan ile başlık/açıklama
                  görselin üzerinde okunaklı kalır (aşağıdaki text-shadow'lu blok).
                */}
                {hasImage && (
                  <div className="relative w-full overflow-hidden aspect-[900/425] lg:absolute lg:aspect-auto lg:w-auto lg:h-auto lg:top-[-33px] lg:left-0 lg:right-[-60px] lg:bottom-[-50px]">
                    {/*
                      Ham <img> kullanılır: next/image `/yuklenen/` yolunu işleyemiyor
                      (o yolu nginx servis ediyor, Next sunucusu 404 veriyor).
                      Boyutlandırma yükleme anında yapılıp burada `srcset` ile
                      sunuluyor; mobil cihaz 1800 piksellik dosyayı indirmiyor.
                      Varyantı olmayan eski görsellerde `srcset` undefined kalır ve
                      tarayıcı eskisi gibi tek dosyayı indirir.
                    */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={slideImageUrl}
                      srcSet={srcSetUret(slideImageUrl)}
                      sizes="(min-width: 1024px) 60vw, 100vw"
                      alt={currentSlide.title || 'Veli Sigorta kampanya görseli'}
                      className="h-full w-full object-cover object-center"
                      loading="eager"
                      fetchPriority="high"
                    />
                    {/*
                      Sağ soldurma (beyaza karışan gradyan) — "Evet" seçeneğinde metnin
                      okunaklı kalması için görselin sağını beyaza yaklaştırır. Bu,
                      eklenen HER görsele otomatik uygulanır, slayta özel değildir.

                      Soldurma bilinçli olarak KENARDA tutulur: kullanıcı isteğiyle
                      yalnızca sağdaki %15'lik şeritte kalır (gradyan %85'te başlar,
                      blur katmanı da w-[15%]). Ortaya doğru uzayan soldurma görseli
                      yıkıyordu. Bu değerleri büyütürken %15 sınırını aşmayın.
                    */}
                    {showTextOverlay && (
                      <>
                        <div
                          aria-hidden="true"
                          className="pointer-events-none absolute inset-0"
                          style={{
                            background:
                              'linear-gradient(to right, rgba(255,255,255,0) 85%, rgba(255,255,255,0.25) 93%, rgba(255,255,255,0.45) 100%)',
                          }}
                        />
                        <div
                          aria-hidden="true"
                          className="pointer-events-none absolute inset-y-0 right-0 w-[15%] backdrop-blur-[1px]"
                          style={{
                            maskImage: 'linear-gradient(to right, transparent, black 80%)',
                            WebkitMaskImage: 'linear-gradient(to right, transparent, black 80%)',
                          }}
                        />
                      </>
                    )}

                    {/*
                      Başlık + açıklamanın arkasına, sitenin lacivert tonundan
                      (#003366) alttan yukarı solan bir gradyan "perde" konur —
                      fotoğrafın içeriği ne olursa olsun (açık/koyu, karmaşık
                      desen) okunabilirliği garantiler. Üstte tamamen şeffaf
                      olduğu için görselin geri kalanını etkilemez.
                    */}
                    {showTextOverlay && (currentSlide.title || currentSlide.description) && (
                      <div
                        aria-hidden="true"
                        className="pointer-events-none absolute inset-x-0 bottom-0 h-[20%]"
                        style={{
                          background:
                            'linear-gradient(to top, rgba(0,51,102,0.72) 0%, rgba(0,51,102,0.32) 50%, rgba(0,51,102,0) 100%)',
                        }}
                      />
                    )}

                    {/*
                      Başlık ve açıklama artık ayrı bloklar olarak görselin ALTINDA
                      değil, görselin ÜZERİNDE (sol-alt köşede), TEK bir alt-hizalı
                      sarmalayıcı içinde, aynı sol kenardan gösterilir. Açıklama
                      başlığın hemen altına, normal akışla (`space-y-1`) yerleşir —
                      bu sayede ikisi de her zaman aynı hizada kalır.

                      Not: Önceden açıklama için sabit bir `padding-top` (px cinsinden)
                      kullanılmıştı; satır yüksekliği (`min-h-[340px]`) yalnızca bir ALT
                      SINIRDIR — kart metni dar ekranlarda satır atlayınca satır bundan
                      daha uzayabilir, bu da sabit pikselli boşluğu yanlış hale
                      getiriyordu. Bu yapı (ikisini görsel içinde absolute konumlamak)
                      sütun yüksekliğinden tamamen bağımsız olduğu için o sorunu ortadan
                      kaldırır.

                      Fotoğraf üzerinde her zaman okunaklı kalması için başlığın dolgusu
                      beyaz, dış hattı (stroke) koyu lacivert — text-shadow ile 4 yönde
                      çizilir (yalnızca -webkit-text-stroke yerine bu teknik Firefox
                      dahil tüm tarayıcılarda çalışır).
                    */}
                    {showTextOverlay && (currentSlide.title || currentSlide.description) && (
                      <div className="absolute left-4 bottom-4 right-4 sm:left-6 sm:bottom-6 sm:right-6 space-y-1">
                        {currentSlide.title && (
                          <h2
                            className="text-lg sm:text-2xl lg:text-3xl font-serif text-white leading-[1.15] font-bold tracking-tight"
                            style={{
                              textShadow:
                                '-1px -1px 0 #003366, 1px -1px 0 #003366, -1px 1px 0 #003366, 1px 1px 0 #003366, 0 2px 8px rgba(0,0,0,0.25)',
                            }}
                          >
                            {currentSlide.title}
                          </h2>
                        )}
                        {currentSlide.description && (
                          <p
                            className="text-xs sm:text-sm text-white leading-relaxed max-w-2xl font-normal"
                            style={{
                              textShadow:
                                '-1px -1px 0 #003366, 1px -1px 0 #003366, -1px 1px 0 #003366, 1px 1px 0 #003366, 0 2px 6px rgba(0,0,0,0.25)',
                            }}
                          >
                            {currentSlide.description}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}

              </motion.div>
            </AnimatePresence>
          </div>

          {/*
            Right Feature Panel: Quick Trust Stats + Action Buttons
            `relative z-10`: kart her koşulda slayt görselinin önünde kalır.
            `lg:self-end`: grid'in varsayılanı `items-center` olduğu için, bu
            sütun içeriğinin (rozet + kart + varsa butonlar) toplam yüksekliği
            değiştiğinde (butonlar yalnızca `showTextOverlay` açık slaytlarda
            gösterildiği için görsel-yalnız slaytlarda bu sütun daha kısadır)
            dikey ortalama nedeniyle blok yukarı/aşağı kayıyordu. `self-end`
            sütunu satırın ALTINA sabitler — kullanıcı isteği: butonlu görünüm
            aşağıya, görselin alt kenarına yakın hizaya çekilsin. Rozet+kart artık
            her slaytta bu alt hizadan yukarı doğru büyür, konumu tutarlıdır.
          */}
          {/*
            `lg:top-[40px]`: görsel kutusu satırın alt kenarından 50px aşağı taşıyor
            (`lg:bottom-[-50px]`). Panel `self-end` ile satırın altına hizalandığı
            için varsayılan olarak görselin 50px yukarısında kalıyordu. `relative`
            + `top` görsel olarak aşağı kaydırır (yerleşimi etkilemez).
            50px tam hizalama demekti; kullanıcı isteğiyle 10px yukarı alındı,
            yani panelin altı görselin altından 10px yukarıda duruyor.
          */}
          <div className="relative z-10 lg:col-span-4 lg:self-end lg:top-[40px] space-y-4">
          <div className="relative bg-white p-6 border border-[#E5E1DB] shadow-lg space-y-4">
            {/*
              Rozet artık sol sütunda ayrı bir blok değil, bilgi kartının ÜZERİNE
              (üst kenarının biraz dışına taşacak biçimde) bindirilir — kullanıcı
              isteği: "kartın üzerine taşı". `showTextOverlay` koşulu KASITLI
              OLARAK kaldırıldı: kullanıcı rozetin her slaytta (görsel-yalnız
              modda bile) kartın üzerinde görünmesini istedi.
            */}
            {currentSlide.badge && (
              <div className="absolute -top-3 left-5 flex items-center gap-2 flex-wrap">
                <span className="px-3 py-1 bg-[#F27D26] text-white font-extrabold text-[10px] uppercase tracking-[0.2em] inline-flex items-center gap-1.5 shadow-md">
                  <Sparkles className="w-3 h-3" />
                  <span>{currentSlide.badge}</span>
                </span>
              </div>
            )}

            <div className="flex items-center justify-between border-b border-[#E5E1DB] pb-3">
              <span className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-[#003366]">
                Veli Sigorta Avantajları
              </span>
              <span className="text-[10px] text-[#8A7E72] font-mono font-bold">2004’ten beri</span>
            </div>

            <div className="space-y-3.5 text-xs text-[#333]">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-[#F7F4EE] border border-[#E5E1DB] text-[#003366] shrink-0 mt-0.5">
                  <ShieldCheck className="w-4 h-4 text-[#F27D26]" />
                </div>
                <div>
                  <div className="font-bold text-[#1A1A1A] uppercase tracking-wider text-[11px]">İhtiyaca Göre Seçenekler</div>
                  <div className="text-[11px] text-[#666] leading-snug">
                    Teminat ve poliçe koşullarını talebinize göre birlikte inceleyin.
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="p-2 bg-[#F7F4EE] border border-[#E5E1DB] text-[#003366] shrink-0 mt-0.5">
                  <Award className="w-4 h-4 text-[#F27D26]" />
                </div>
                <div>
                  <div className="font-bold text-[#1A1A1A] uppercase tracking-wider text-[11px]">Açık Bilgilendirme</div>
                  <div className="text-[11px] text-[#666] leading-snug">
                    Teminat, muafiyet ve istisnaları teklif aşamasında sorun.
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="p-2 bg-[#F7F4EE] border border-[#E5E1DB] text-[#003366] shrink-0 mt-0.5">
                  <Clock className="w-4 h-4 text-[#F27D26]" />
                </div>
                <div>
                  <div className="font-bold text-[#1A1A1A] uppercase tracking-wider text-[11px]">Telefon ve WhatsApp</div>
                  <div className="text-[11px] text-[#666] leading-snug">
                    Acente ekibine tercih ettiğiniz iletişim kanalından ulaşın.
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/*
            Action Buttons — "Veli Sigorta Avantajları" bilgi kutusunun altında,
            aynı sütunda (kullanıcı isteği). Görünüm değişmedi, yalnızca konumu
            değişti: eskiden sol sütunda başlık/açıklamanın altındaydı.

            Dış sarmalayıcı `min-h-[52px]` ile HER ZAMAN render edilir — butonlar
            yalnızca `showTextOverlay` açıkken içeride görünür, ama alan her
            slaytta ayrılmış kalır. Bu olmadan, butonların görünüp kaybolması
            sütunun toplam yüksekliğini değiştiriyor, bu da (self-start/self-end
            fark etmeksizin) rozet+kartın slaytlar arası kaymasına yol açıyordu.
            Sabit yükseklikli bu boşluk, sütunun toplam boyutunu her slaytta
            birebir aynı tutarak kaymayı kökten önler.
          */}
          <div className="min-h-[52px]">
            {showTextOverlay && (
              <div className="flex flex-wrap items-center gap-3">
                {currentSlide.ctaText && (
                  <Link
                    href={currentSlide.ctaLink || '/teklif-al'}
                    className="px-6 py-3.5 bg-[#003366] hover:bg-[#002244] text-white font-bold text-xs uppercase tracking-widest inline-flex items-center gap-2 transition-all shadow-md hover:translate-x-0.5"
                  >
                    <span>{currentSlide.ctaText}</span>
                    <ArrowRight className="w-4 h-4 text-[#F27D26]" />
                  </Link>
                )}

                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-5 py-3.5 bg-white hover:bg-[#F5F2EC] border border-[#D5D0C7] text-[#1A1A1A] font-bold text-xs uppercase tracking-widest inline-flex items-center gap-2 transition-all shadow-2xs"
                >
                  <MessageCircle className="w-4 h-4 text-[#25D366]" />
                  <span>WhatsApp İle Sor</span>
                </a>
              </div>
            )}
          </div>
          </div>

        </div>

        {/* Controls & Indicator Dots */}
        <div className="mt-8 pt-4 border-t border-[#E5E1DB] flex flex-wrap items-center justify-between gap-y-3">
          {/* Indicator Dots
              Noktalar görsel olarak 8 piksel kalır ama dokunma hedefi büyütülür:
              dış düğmeye şeffaf dolgu verilip nokta içeride <span> olarak çizilir.
              Dolgu dar ekranda 32, geniş ekranda 40 pikseldir; 320 pikselde altı
              nokta ile üç okun tek satıra sığmaması yüzünden ileri oku ekran dışında
              kalıyordu. Negatif YATAY boşluk kaldırıldı: komşu düğmelerin tıklama
              alanlarını 8 piksel üst üste bindirip yanlış slayta götürüyordu.
              Negatif dikey boşluk, büyüyen hedefin satır yüksekliğini değiştirmesini
              engeller — yerleşim birebir aynı görünür. */}
          <div className="flex items-center gap-0 -my-3 sm:-my-4">
            {slides.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentIndex(idx)}
                className="p-3 sm:p-4 flex items-center justify-center group/nokta"
                aria-label={`${idx + 1}. slayta git`}
                aria-current={idx === currentIndex ? 'true' : undefined}
              >
                <span
                  aria-hidden="true"
                  className={`block h-2 rounded-full transition-all ${
                    idx === currentIndex
                      ? 'w-8 bg-[#003366]'
                      : 'w-2 bg-[#D5D0C7] group-hover/nokta:bg-[#8A7E72]'
                  }`}
                />
              </button>
            ))}
          </div>

          {/* Duraklat / Oynat + Prev / Next
              WCAG 2.2.2: 5 saniyeden uzun süren otomatik hareket, kullanıcı tarafından
              durdurulabilmelidir. Eskiden duraklatma yalnızca `onMouseEnter` ile
              yapılıyordu; dokunmatik cihazda ve klavyeyle gezinen kullanıcıda bu olay
              hiç tetiklenmiyordu. */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setElleDuraklatildi((v) => !v)}
              className="p-2.5 bg-white hover:bg-[#F5F2EC] text-[#1A1A1A] border border-[#E5E1DB] transition-colors shadow-2xs"
              aria-label={elleDuraklatildi ? 'Slaytları oynat' : 'Slaytları duraklat'}
              title={elleDuraklatildi ? 'Oynat' : 'Duraklat'}
            >
              {elleDuraklatildi ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
            </button>
            <button
              onClick={prevSlide}
              className="p-2.5 bg-white hover:bg-[#F5F2EC] text-[#1A1A1A] border border-[#E5E1DB] transition-colors shadow-2xs"
              aria-label="Önceki slayt"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={nextSlide}
              className="p-2.5 bg-white hover:bg-[#F5F2EC] text-[#1A1A1A] border border-[#E5E1DB] transition-colors shadow-2xs"
              aria-label="Sonraki slayt"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

      </div>
      </div>
    </div>
  );
}
