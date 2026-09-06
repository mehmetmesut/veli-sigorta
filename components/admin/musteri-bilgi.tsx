'use client';

import React from 'react';
import { Building2, Mail, MapPin, MessageCircle, Phone, User } from 'lucide-react';
import type { Customer } from '@/lib/types';
import { formatTarih, musteriAdi, whatsappBaglantisi } from '@/lib/police';
import { telefonRakamlariniAl, telefonSadelestir } from '@/lib/telefon';
import { KopyaDugmesi } from './KopyaDugmesi';

/**
 * Müşteri bilgilerinin salt-okunur gösterimi.
 *
 * Müşteri detay sayfası bu blokları kullanır. Satırlar tek yerde tanımlı: kimlik
 * numarasının yanında kopyalama, cep telefonunun yanında WhatsApp, e-postanın
 * yanında kopyalama düğmesi her yerde aynı davranır.
 */

/** Boş alanları hiç göstermeyen satır. */
export function Satir({ etiket, deger }: { etiket: string; deger?: string | number | null }) {
  const metin = deger === undefined || deger === null || deger === '' ? null : String(deger);
  if (!metin) return null;

  return (
    <div className="flex gap-2 text-xs">
      <span className="text-slate-500 shrink-0 w-40">{etiket}</span>
      <span className="text-slate-900 font-semibold break-words">{metin}</span>
    </div>
  );
}

/**
 * Kimlik/vergi numarası satırı — yanında kopyalama düğmesi.
 *
 * Bu numaralar sigorta şirketlerinin kendi ekranlarına elle yazılıyor; tek haneli
 * bir hata poliçenin yanlış kişiye düzenlenmesine ya da sorgunun boş dönmesine
 * yol açıyor.
 */
export function KimlikSatiri({ etiket, deger }: { etiket: string; deger?: string | null }) {
  if (!deger) return null;

  return (
    <div className="flex gap-2 text-xs items-center">
      <span className="text-slate-500 shrink-0 w-40">{etiket}</span>
      <span className="text-slate-900 font-semibold font-mono">{deger}</span>
      <KopyaDugmesi deger={deger} etiket={etiket} />
    </div>
  );
}

/**
 * Numara cep telefonu mu? WhatsApp düğmesi yalnızca cepte anlamlı — sabit hatta
 * yazılan mesaj hiçbir yere ulaşmıyor ve personel gönderdiğini sanıyordu.
 */
function mobilMi(telefon?: string | null): boolean {
  const rakam = telefonSadelestir(telefonRakamlariniAl(telefon));
  return rakam.length === 10 && rakam.startsWith('5');
}

/** Telefon satırı: arama bağlantısı + (cepse) WhatsApp + kopyalama. */
export function TelefonSatiri({
  etiket, telefon, selamlama,
}: {
  etiket: string;
  telefon?: string | null;
  selamlama?: string;
}) {
  if (!telefon) return null;

  // Selamlama verilmezse boş sohbet açılır; `whatsappBaglantisi` metni URL kodlar.
  const waBaglantisi = mobilMi(telefon) ? whatsappBaglantisi(telefon, selamlama ?? '') : null;

  return (
    <div className="flex gap-2 text-xs items-center">
      <span className="text-slate-500 shrink-0 w-40">{etiket}</span>
      <a
        href={`tel:${telefon.replace(/\D/g, '')}`}
        className="text-blue-800 font-semibold inline-flex items-center gap-1 hover:underline"
      >
        <Phone className="w-3 h-3" /> {telefon}
      </a>
      {waBaglantisi && (
        <a
          href={waBaglantisi}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`${etiket} numarasına WhatsApp mesajı gönder`}
          title="WhatsApp'tan yaz"
          className="p-1.5 rounded hover:bg-emerald-100 text-emerald-700"
        >
          <MessageCircle className="w-3.5 h-3.5" />
        </a>
      )}
      <KopyaDugmesi deger={telefon} etiket={etiket} />
    </div>
  );
}

/** E-posta satırı: mailto bağlantısı + kopyalama. */
export function EpostaSatiri({ eposta }: { eposta?: string | null }) {
  if (!eposta) return null;

  return (
    <div className="flex gap-2 text-xs items-center">
      <span className="text-slate-500 shrink-0 w-40">E-Posta</span>
      <a
        href={`mailto:${eposta}`}
        className="text-blue-800 font-semibold inline-flex items-center gap-1 hover:underline break-all"
      >
        <Mail className="w-3 h-3 shrink-0" /> {eposta}
      </a>
      <KopyaDugmesi deger={eposta} etiket="E-posta" />
    </div>
  );
}

export function Bolum({ baslik, children }: { baslik: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 border-b border-slate-200 pb-1">
        {baslik}
      </div>
      {children}
    </div>
  );
}

/** Ad, tip rozeti, pasiflik rozeti ve müşteri numarası. */
export function MusteriBasligi({ musteri, baslikId }: { musteri: Customer; baslikId?: string }) {
  const kurumsal = musteri.tip === 'kurumsal';

  return (
    <div className="min-w-0">
      <h2 id={baslikId} className="font-extrabold text-slate-900 inline-flex items-center gap-2 flex-wrap">
        {kurumsal ? <Building2 className="w-5 h-5 shrink-0" /> : <User className="w-5 h-5 shrink-0" />}
        <span className="break-words">{musteriAdi(musteri)}</span>
        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-600">
          {kurumsal ? 'Kurumsal' : 'Bireysel'}
        </span>
        {!musteri.isActive && (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-100 text-rose-800">
            Pasif
          </span>
        )}
      </h2>
      <div className="text-[11px] text-slate-500 mt-1 font-mono">{musteri.musteriNo}</div>
    </div>
  );
}

/** Kimlik/firma, iletişim ve yetkili bilgileri. Boş alanlar çizilmez. */
export function MusteriBilgiBloklari({ musteri }: { musteri: Customer }) {
  const kurumsal = musteri.tip === 'kurumsal';

  return (
    <>
      {kurumsal ? (
        <Bolum baslik="Firma Bilgileri">
          <Satir etiket="Firma Unvanı" deger={musteri.firmaUnvani} />
          <Satir etiket="Marka / Tabela Adı" deger={musteri.markaAdi} />
          <KimlikSatiri etiket="Vergi Numarası" deger={musteri.vergiNo} />
          <Satir etiket="Vergi Dairesi" deger={musteri.vergiDairesi} />
          <KimlikSatiri etiket="MERSİS No" deger={musteri.mersisNo} />
          <Satir etiket="NACE Kodu" deger={musteri.naceKodu} />
          <Satir etiket="Faaliyet Konusu" deger={musteri.faaliyetKonusu} />
          <Satir etiket="Çalışan Sayısı" deger={musteri.calisanSayisi} />
        </Bolum>
      ) : (
        <Bolum baslik="Kimlik Bilgileri">
          <Satir etiket="Adı" deger={musteri.ad} />
          <Satir etiket="Soyadı" deger={musteri.soyad} />
          <KimlikSatiri etiket="T.C. Kimlik No" deger={musteri.tcKimlikNo} />
          <KimlikSatiri etiket="Yabancı Kimlik No" deger={musteri.yabanciKimlikNo} />
          <Satir etiket="Doğum Tarihi" deger={musteri.dogumTarihi ? formatTarih(musteri.dogumTarihi) : ''} />
          <Satir etiket="Cinsiyeti" deger={musteri.cinsiyet} />
          <Satir etiket="Uyruğu" deger={musteri.uyruk} />
          <Satir etiket="Mesleği" deger={musteri.meslek} />
        </Bolum>
      )}

      <Bolum baslik="İletişim & Adres">
        <TelefonSatiri
          etiket="Mobil Telefon"
          telefon={musteri.mobilTelefon}
          selamlama={`Merhaba ${musteriAdi(musteri)}, Veli Sigorta'dan yazıyorum.`}
        />
        <TelefonSatiri etiket="Sabit Telefon" telefon={musteri.sabitTelefon} />
        <EpostaSatiri eposta={musteri.email} />
        {(musteri.il || musteri.ilce) && (
          <div className="flex gap-2 text-xs">
            <span className="text-slate-500 shrink-0 w-40">İl / İlçe</span>
            <span className="text-slate-900 font-semibold inline-flex items-center gap-1">
              <MapPin className="w-3 h-3" /> {[musteri.ilce, musteri.il].filter(Boolean).join(' / ')}
            </span>
          </div>
        )}
        <Satir etiket="Açık Adres" deger={musteri.acikAdres} />
        <Satir etiket="UAVT Adres Kodu" deger={musteri.uavtKodu} />
        <Satir etiket="Müşteri Temsilcisi" deger={musteri.musteriTemsilcisi} />
      </Bolum>

      {kurumsal && musteri.yetkililer.length > 0 && (
        <Bolum baslik={`Yetkililer (${musteri.yetkililer.length})`}>
          <div className="space-y-2">
            {musteri.yetkililer.map((y) => (
              <div key={y.id} className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs">
                <div className="font-bold text-slate-900">
                  {y.ad} {y.soyad}
                  {y.gorevUnvani && <span className="font-normal text-slate-500"> · {y.gorevUnvani}</span>}
                </div>
                {y.mobilTelefon && <div className="text-slate-600 mt-0.5">{y.mobilTelefon}</div>}
                <div className="flex flex-wrap gap-1 mt-1">
                  {y.anaYetkili && <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 font-bold">Ana yetkili</span>}
                  {y.policeYetkilisi && <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-200 text-slate-700 font-bold">Poliçe</span>}
                  {y.hasarYetkilisi && <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-200 text-slate-700 font-bold">Hasar</span>}
                  {y.tahsilatYetkilisi && <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-200 text-slate-700 font-bold">Tahsilat</span>}
                </div>
              </div>
            ))}
          </div>
        </Bolum>
      )}

      {musteri.notlar && (
        <Bolum baslik="Notlar">
          <p className="text-xs text-slate-700 whitespace-pre-wrap">{musteri.notlar}</p>
        </Bolum>
      )}
    </>
  );
}
