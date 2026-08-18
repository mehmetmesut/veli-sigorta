/**
 * Panel ekranlarının içerik API'siyle konuşurken kullandığı ortak istemci.
 *
 * Neden gerekli: Her CMS ekranı aynı `fetch('/api/admin/content', {...})` bloğunu kendi
 * içinde tekrarlıyordu ve çoğu yalnızca `if (res.ok)` dalını yazıp hata durumunu sessizce
 * yutuyordu. Sunucu 400/403/409 döndürdüğünde ekranda "Kaydediliyor..." yazısı asılı kalıyor,
 * kullanıcı kaydın oluştuğunu sanıyordu. Buradaki yardımcılar hatayı her zaman okunabilir
 * bir metne çevirir; çağıran ekran onu kullanıcıya göstermekle yükümlüdür.
 */

export type PanelIslemSonucu<T = unknown> =
  | { basarili: true; veri: T }
  | { basarili: false; hata: string };

type Islem = 'save' | 'delete';

async function istekGonder<T>(
  entity: string,
  action: Islem,
  data: unknown,
): Promise<PanelIslemSonucu<T>> {
  let res: Response;

  try {
    res = await fetch('/api/admin/content', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entity, action, data }),
    });
  } catch {
    // Ağ kopukluğu, sunucu erişilemez durumu vb. — kullanıcıya sessiz kalmamalıyız.
    return { basarili: false, hata: 'Sunucuya ulaşılamadı. Bağlantınızı kontrol edip tekrar deneyin.' };
  }

  const govde = await res.json().catch(() => ({} as Record<string, unknown>));

  if (!res.ok) {
    const mesaj = typeof govde?.error === 'string' && govde.error.trim()
      ? govde.error
      : `İşlem başarısız oldu (HTTP ${res.status}).`;
    return { basarili: false, hata: mesaj };
  }

  return { basarili: true, veri: govde as T };
}

/** Bir içerik kaydını oluşturur veya günceller. */
export function icerikKaydet<T = unknown>(entity: string, data: unknown) {
  return istekGonder<T>(entity, 'save', data);
}

/** Bir içerik kaydını siler. */
export function icerikSil<T = unknown>(entity: string, id: string) {
  return istekGonder<T>(entity, 'delete', { id });
}

/**
 * Panel verisini okur. Yetki hatası veya ağ sorununda `null` yerine anlamlı bir hata döner,
 * böylece ekranlar sonsuza dek "Yükleniyor" durumunda kalmaz.
 */
export async function icerikOku<T = Record<string, unknown>>(): Promise<PanelIslemSonucu<T>> {
  try {
    const res = await fetch('/api/admin/content');
    if (!res.ok) {
      return { basarili: false, hata: `Veriler yüklenemedi (HTTP ${res.status}).` };
    }
    return { basarili: true, veri: (await res.json()) as T };
  } catch {
    return { basarili: false, hata: 'Sunucuya ulaşılamadı. Sayfayı yenileyip tekrar deneyin.' };
  }
}
