/**
 * Yönetim panelinden girilen dış bağlantıları güvenli ve doğru kodlanmış
 * biçimde döndürür.
 *
 * - WHATWG `URL` çözümleyicisi kullanılır: eksik kodlanmış karakterler
 *   yüzdelik kodlamaya çevrilir, zaten kodlanmış olanlar tekrar kodlanmaz
 *   (`encodeURI`/`encodeURIComponent` ile yapılan çift kodlama hatası olmaz).
 * - Yalnızca `http` ve `https` kabul edilir; `javascript:` veya `data:` gibi
 *   şemalar `null` döner. Bağlantı panelden düzenlenebildiği için bu denetim
 *   depolanmış XSS'e karşı gereklidir.
 *
 * @returns Kullanıma hazır mutlak URL, geçersizse `null`.
 */
export function getSafeExternalUrl(raw?: string | null): string | null {
  const trimmed = raw?.trim();
  if (!trimmed) return null;

  try {
    const url = new URL(trimmed);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
    return url.toString();
  } catch {
    return null;
  }
}
