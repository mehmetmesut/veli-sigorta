'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { KeyRound, ShieldAlert, ShieldCheck } from 'lucide-react';
import { useAdminRole } from '@/hooks/useAdminRole';

/**
 * Kullanıcının kendi parolasını değiştirdiği ekran.
 *
 * Neden ayrı sayfa: paneldeki tek parola kutusu `Sistem Kullanıcıları` ekranında
 * duruyordu ve env'de tanımlı ORTAK yönetici parolasını değiştiriyordu; üstelik
 * o ekran yalnız yönetici rollerine açık. "user" rolündeki personelin kendi
 * parolasını değiştirmesinin hiçbir yolu yoktu — parolayı bir yöneticiye
 * söyletip onun değiştirmesi gerekiyordu.
 *
 * Parola alanları form yöneticisine bağlanmaz ve hiçbir yere kaydedilmez;
 * yalnız gönderim anında kullanılır.
 */

const EN_AZ_UZUNLUK = 8;

export default function SifreDegistirPage() {
  const router = useRouter();
  const { role } = useAdminRole();

  const [mevcut, setMevcut] = useState('');
  const [yeni, setYeni] = useState('');
  const [yeniTekrar, setYeniTekrar] = useState('');
  const [hata, setHata] = useState('');
  const [bilgi, setBilgi] = useState('');
  const [gonderiliyor, setGonderiliyor] = useState(false);

  const superadminMi = role === 'superadmin';

  async function gonder(e: React.FormEvent) {
    e.preventDefault();
    setHata('');
    setBilgi('');

    // İstemci tarafı denetimler yalnız hızlı geri bildirim için; asıl doğrulama
    // sunucuda Zod şemasıyla yapılıyor.
    if (yeni.length < EN_AZ_UZUNLUK) {
      setHata(`Yeni şifre en az ${EN_AZ_UZUNLUK} karakter olmalıdır.`);
      return;
    }
    if (yeni !== yeniTekrar) {
      setHata('Yeni şifre ve tekrarı birbirini tutmuyor.');
      return;
    }
    if (yeni === mevcut) {
      setHata('Yeni şifre mevcut şifreden farklı olmalıdır.');
      return;
    }

    setGonderiliyor(true);
    try {
      const cevap = await fetch('/api/admin/content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entity: 'own_password',
          data: { currentPassword: mevcut, newPassword: yeni },
        }),
      });
      const sonuc = await cevap.json().catch(() => ({}));

      if (!cevap.ok) {
        setHata(sonuc.error || 'Şifre değiştirilemedi.');
        return;
      }

      setMevcut('');
      setYeni('');
      setYeniTekrar('');
      setBilgi(
        sonuc.paylasilanParola
          ? 'Şifre değiştirildi. Bu hesap ortak yönetici hesabı olduğu için yeni şifre aynı hesabı kullanan herkes için geçerlidir. Giriş ekranına yönlendiriliyorsunuz…'
          : 'Şifreniz değiştirildi. Yeni şifrenizle tekrar giriş yapmanız için giriş ekranına yönlendiriliyorsunuz…',
      );
      // Sunucu oturumu kapattı; kullanıcı yeni parolasıyla tekrar girmeli.
      setTimeout(() => router.push('/admin/login'), 2500);
    } catch {
      setHata('Sunucuya ulaşılamadı. Bağlantınızı kontrol edip tekrar deneyin.');
    } finally {
      setGonderiliyor(false);
    }
  }

  return (
    <div className="max-w-xl space-y-5">
      <div>
        <h1 className="text-xl font-extrabold text-slate-900 tracking-tight inline-flex items-center gap-2">
          <KeyRound className="w-5 h-5 text-blue-800" /> Şifremi Değiştir
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Kendi giriş şifrenizi buradan güncelleyebilirsiniz.
        </p>
      </div>

      {superadminMi ? (
        <div className="bg-white rounded-2xl border border-amber-200 shadow-2xs p-4 flex gap-3">
          <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0" />
          <p className="text-xs text-slate-600 leading-relaxed">
            Süper yönetici parolası uygulama yapılandırmasında tanımlıdır ve panelden
            değiştirilemez. Değiştirilmesi gerekiyorsa sunucu yapılandırması güncellenmelidir.
          </p>
        </div>
      ) : (
        <form onSubmit={gonder} className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-4 space-y-4">
          <Alan
            etiket="Mevcut Şifre"
            deger={mevcut}
            degistir={setMevcut}
            otomatik="current-password"
          />
          <Alan
            etiket="Yeni Şifre"
            deger={yeni}
            degistir={setYeni}
            otomatik="new-password"
            ipucu={`En az ${EN_AZ_UZUNLUK} karakter.`}
          />
          <Alan
            etiket="Yeni Şifre (Tekrar)"
            deger={yeniTekrar}
            degistir={setYeniTekrar}
            otomatik="new-password"
          />

          {hata && (
            <p role="alert" className="text-xs font-bold text-red-700 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
              {hata}
            </p>
          )}
          {bilgi && (
            <p role="status" className="text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2 inline-flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 shrink-0 mt-px" /> {bilgi}
            </p>
          )}

          <button
            type="submit"
            disabled={gonderiliyor || !mevcut || !yeni || !yeniTekrar}
            className="px-4 py-2 rounded-xl bg-blue-900 hover:bg-blue-950 disabled:bg-slate-300 text-white font-bold text-xs transition-colors"
          >
            {gonderiliyor ? 'Değiştiriliyor…' : 'Şifreyi Değiştir'}
          </button>

          <p className="text-[11px] text-slate-400 leading-snug">
            Şifre değiştirildiğinde oturumunuz güvenlik gereği kapatılır ve yeni şifrenizle
            tekrar giriş yapmanız istenir.
          </p>
        </form>
      )}
    </div>
  );
}

function Alan({
  etiket,
  deger,
  degistir,
  otomatik,
  ipucu,
}: {
  etiket: string;
  deger: string;
  degistir: (v: string) => void;
  /** Parola yöneticilerinin alanı doğru tanıması için. */
  otomatik: 'current-password' | 'new-password';
  ipucu?: string;
}) {
  const id = React.useId();
  return (
    <div>
      <label htmlFor={id} className="block text-[11px] font-bold text-slate-600 mb-1">
        {etiket}
      </label>
      <input
        id={id}
        type="password"
        value={deger}
        onChange={(e) => degistir(e.target.value)}
        autoComplete={otomatik}
        required
        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-hidden focus:border-blue-800"
      />
      {ipucu && <p className="text-[10px] text-slate-400 mt-1">{ipucu}</p>}
    </div>
  );
}
