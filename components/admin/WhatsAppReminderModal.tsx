'use client';

import React, { useEffect, useId, useRef } from 'react';
import { MessageCircle, X, ExternalLink } from 'lucide-react';
import type { Customer } from '@/lib/types';
import { musteriAdi } from '@/lib/police';

interface WhatsAppReminderModalProps {
  musteri: Customer | undefined;
  sablon: string;
  onSablonChange: (deger: string) => void;
  /** Yer tutucuları doldurulmuş, gönderilecek son metin. */
  mesaj: string;
  /** Hazır mesajlı wa.me bağlantısı; numara geçersizse null. */
  link: string | null;
  onClose: () => void;
}

/**
 * Poliçe bitiş hatırlatması için WhatsApp penceresi.
 *
 * Mesajı sistem göndermez; yalnız hazır metinle WhatsApp'ı açar. Gönderme kararı
 * kullanıcıda kalır — böylece yanlış kişiye otomatik mesaj gitmesi engellenir.
 */
export function WhatsAppReminderModal({
  musteri, sablon, onSablonChange, mesaj, link, onClose,
}: WhatsAppReminderModalProps) {
  const baslikId = useId();
  const kapatRef = useRef<HTMLButtonElement>(null);

  /** Esc ile kapanır ve açılışta odak pencereye taşınır; odak arka plandaki tabloda kalmaz. */
  useEffect(() => {
    kapatRef.current?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-start sm:items-center justify-center p-4 overflow-y-auto">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={baslikId}
        className="bg-white rounded-2xl w-full max-w-lg shadow-2xl my-8 sm:my-0"
      >
        <div className="flex items-center justify-between p-5 border-b border-slate-200">
          <h2 id={baslikId} className="font-extrabold text-slate-900 inline-flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-emerald-600" /> WhatsApp Hatırlatması
          </h2>
          <button ref={kapatRef} onClick={onClose} aria-label="Pencereyi kapat" className="p-1.5 rounded-lg hover:bg-slate-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="text-xs text-slate-600">
            <strong>{musteri ? musteriAdi(musteri) : '—'}</strong> · {musteri?.mobilTelefon}
          </div>

          <label className="block">
            <span className="block text-[11px] font-bold text-slate-700 mb-1">Mesaj şablonu</span>
            <textarea
              value={sablon}
              onChange={(e) => onSablonChange(e.target.value)}
              rows={4}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs font-mono"
            />
            <span className="block text-[10px] text-slate-400 mt-1">
              Yer tutucular: {'{musteri} {sirket} {brans} {policeNo} {bitis} {kalanGun}'}
            </span>
          </label>

          <div>
            <div className="text-[11px] font-bold text-slate-700 mb-1">Gönderilecek mesaj</div>
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-slate-800 whitespace-pre-wrap">
              {mesaj}
            </div>
          </div>

          <p className="text-[10px] text-slate-500">
            Bağlantı WhatsApp’ı hazır mesajla açar; gönder tuşuna siz basarsınız. Sistem kendi başına
            mesaj göndermez — bu, yanlış kişiye otomatik mesaj gitmesini önler.
          </p>
        </div>

        <div className="p-5 border-t border-slate-200 flex items-center justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs">
            Kapat
          </button>
          {link && (
            <a
              href={link} target="_blank" rel="noopener noreferrer"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs inline-flex items-center gap-2"
            >
              <ExternalLink className="w-4 h-4" /> WhatsApp’ta Aç
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
