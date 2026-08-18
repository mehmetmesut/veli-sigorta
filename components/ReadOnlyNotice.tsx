'use client';

import React from 'react';
import { Eye } from 'lucide-react';

/**
 * Kısıtlı ekranlarda (Google & SEO Suite, Site & Firma Ayarları) yetkisi olmayan
 * kullanıcılara gösterilen bilgilendirme. Asıl engelleme sunucu tarafındadır.
 */
export function ReadOnlyNotice() {
  return (
    <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 flex items-start gap-3">
      <Eye className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
      <div className="text-xs text-amber-900 leading-relaxed">
        <div className="font-bold">Salt görüntüleme modu</div>
        <p className="mt-0.5">
          Bu bölümü görüntüleyebilir ancak değişiklik yapamazsınız. Düzenleme yetkisi
          süper yönetici ve admin rolündeki hesaplara aittir.
        </p>
      </div>
    </div>
  );
}
