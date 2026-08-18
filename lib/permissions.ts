/**
 * Yönetim paneli yetki kuralları.
 *
 * Kural: "Google & SEO Suite" ve "Site & Firma Ayarları" ekranlarında değişiklik
 * yalnızca süper yönetici ve admin rolündeki kullanıcılar tarafından yapılabilir.
 * Diğer sistem kullanıcıları bu iki ekranı yalnızca görüntüler.
 *
 * Bu kontrol hem arayüzde hem de API tarafında uygulanır; arayüzde butonu
 * gizlemek tek başına yeterli değildir çünkü istek doğrudan atılabilir.
 */
import type { AdminRole } from './auth';

/** Yalnızca yönetici rollerinin düzenleyebildiği içerik türleri. */
export const RESTRICTED_ENTITIES = ['settings', 'companyInfo'] as const;

export type RestrictedEntity = (typeof RESTRICTED_ENTITIES)[number];

const MANAGER_ROLES: readonly AdminRole[] = ['superadmin', 'admin'];

/** Kısıtlı ekranlarda düzenleme yetkisi var mı? */
export function canManageRestrictedSettings(role: AdminRole): boolean {
  return MANAGER_ROLES.includes(role);
}

/** Sistem kullanıcılarını yönetme yetkisi var mı? */
export function canManageUsers(role: AdminRole): boolean {
  return MANAGER_ROLES.includes(role);
}

/**
 * Ortak yönetici parolasını değiştirme yetkisi var mı?
 *
 * Bu uç doğru parolayı bilmeyi gerektirse de yanlış denemelerde farklı durum
 * kodları döndürdüğü için parola doğrulama aracı gibi kullanılabilir. Bu
 * nedenle yalnızca yönetici rolleri çağırabilir; "user" rolündeki panel
 * kullanıcıları çağıramaz.
 */
export function canChangeAdminPassword(role: AdminRole): boolean {
  return MANAGER_ROLES.includes(role);
}

export function isRestrictedEntity(entity: string): entity is RestrictedEntity {
  return (RESTRICTED_ENTITIES as readonly string[]).includes(entity);
}

// --- Sayfa erişimi ----------------------------------------------------------

/**
 * Acentenin günlük işini yürüten ekranlar.
 *
 * Site altyapısına ait ekranlar (Google & SEO Suite, AEO & AI Trafik Raporu,
 * Site & Firma Ayarları, Sistem Logları) bu listede YOKTUR: bunlar sitenin
 * teknik sahibinin ekranları ve yanlışlıkla yapılan bir değişiklik canlı siteyi
 * bozabiliyor. Süper yönetici hepsini görür.
 */
const OPERASYON_SAYFALARI = [
  '/admin',
  '/admin/icerik-haritasi',
  '/admin/musteriler',
  '/admin/police-takibi',
  '/admin/teklifler',
  '/admin/hizmetler',
  '/admin/kategoriler',
  '/admin/sirketler',
  '/admin/kampanyalar',
  '/admin/blog',
  '/admin/sss',
  '/admin/kullanicilar',
  // Kendi parolasını değiştirme ekranı her role açık olmalı; kısıtlı roldeki
  // personelin parolasını yalnız bir yönetici üzerinden değiştirebilmesi
  // parolanın üçüncü bir kişiye söylenmesini zorunlu kılıyordu.
  '/admin/sifre',
] as const;

/**
 * Rol başına erişilebilir sayfalar. `null` = kısıtlama yok (her sayfa).
 *
 * Kısıtlama KİŞİYE değil ROLE bağlıdır: e-posta adresine gömülü bir kural, hesap
 * değiştiğinde ya da ikinci bir personel eklendiğinde sessizce yanlış çalışırdı.
 *
 * Yalnızca süper yönetici (sitenin teknik sahibi) tüm ekranları görür. Hem
 * "Yönetici" (admin) hem "Sistem Kullanıcısı" (user) rolü operasyon ekranlarıyla
 * sınırlıdır; ikisi arasındaki fark ekranların İÇİNDEKİ yetkilerdir (bkz.
 * `canManageUsers`, `canManageRestrictedSettings`) — örneğin sistem kullanıcıları
 * ekranını "user" görür ama düzenleyemez.
 */
const ROL_SAYFALARI: Record<AdminRole, readonly string[] | null> = {
  superadmin: null,
  admin: OPERASYON_SAYFALARI,
  user: OPERASYON_SAYFALARI,
};

/**
 * Rolün görebileceği sayfa yolları; `null` ise kısıtlama yoktur.
 *
 * `??` KULLANILMAZ: burada `null` "kısıtlama yok" anlamına gelir, "değer yok"
 * değil. `??` ile süper yönetici sessizce operasyon listesine düşüyor ve kendi
 * ayar ekranlarını kaybediyordu. Bilinmeyen bir rol gelirse en dar listeye
 * düşülür — tanımadığımız role tam yetki vermek yanlış yönde hata olurdu.
 */
export function izinliSayfalar(role: AdminRole): readonly string[] | null {
  return role in ROL_SAYFALARI ? ROL_SAYFALARI[role] : OPERASYON_SAYFALARI;
}

/**
 * Verilen yol bu rol için açık mı?
 *
 * Alt yollar da kapsanır: `/admin/musteriler/<id>` müşteri detay sayfasıdır ve
 * `/admin/musteriler` izinliyse o da izinlidir. `/admin` bunun istisnasıdır —
 * ön ek eşleşmesi uygulansaydı paneldeki her sayfayı açardı.
 */
export function sayfayaErisebilirMi(role: AdminRole, yol: string): boolean {
  const izinliler = izinliSayfalar(role);
  if (izinliler === null) return true;

  // Sondaki eğik çizgi karşılaştırmayı bozmasın: "/admin/blog/" → "/admin/blog".
  const temiz = yol.length > 1 && yol.endsWith('/') ? yol.slice(0, -1) : yol;

  return izinliler.some((izinli) =>
    izinli === '/admin' ? temiz === '/admin' : temiz === izinli || temiz.startsWith(`${izinli}/`),
  );
}
