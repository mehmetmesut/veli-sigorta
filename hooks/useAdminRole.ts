'use client';

import { useEffect, useState } from 'react';

export type PanelRole = 'superadmin' | 'admin' | 'user';

interface AdminRoleState {
  role: PanelRole | null;
  /** Kısıtlı ekranlarda (Google & SEO, Site & Firma Ayarları) düzenleme yetkisi. */
  canEdit: boolean;
  loading: boolean;
}

/**
 * Oturumdaki kullanıcının rolünü okur.
 *
 * Not: Bu yalnızca arayüz içindir. Asıl yetki denetimi sunucu tarafında
 * (`/api/admin/content`) yapılır; burada butonu gizlemek tek başına koruma değildir.
 */
export function useAdminRole(): AdminRoleState {
  const [role, setRole] = useState<PanelRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    fetch('/api/admin/auth')
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled && data?.user?.role) {
          setRole(data.user.role as PanelRole);
        }
      })
      .catch(() => {
        /* Rol okunamazsa salt görüntüleme varsayılır. */
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return {
    role,
    canEdit: role === 'superadmin' || role === 'admin',
    loading,
  };
}
