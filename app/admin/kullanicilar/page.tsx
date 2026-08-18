'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Edit2, Trash2, Save, X, Users, ShieldCheck, Eye, Lock } from 'lucide-react';
import { useAdminRole } from '@/hooks/useAdminRole';

interface GorunurKullanici {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'user';
  isActive: boolean;
  createdAt: string;
}

interface DuzenlenenKullanici {
  id?: string;
  name: string;
  email: string;
  role: 'admin' | 'user';
  isActive: boolean;
  password: string;
}

const BOS_KULLANICI: DuzenlenenKullanici = {
  name: '',
  email: '',
  role: 'user',
  isActive: true,
  password: '',
};

export default function SystemUsersPage() {
  const router = useRouter();
  const { canEdit, loading: roleLoading } = useAdminRole();
  const [users, setUsers] = useState<GorunurKullanici[]>([]);
  const [loading, setLoading] = useState(true);
  const [yetkisiz, setYetkisiz] = useState(false);
  const [editing, setEditing] = useState<DuzenlenenKullanici | null>(null);
  const [msg, setMsg] = useState('');
  const [hata, setHata] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');

  /**
   * Ortak yönetici parolasını (env'de tanımlı hesap) değiştirir.
   * Sistem kullanıcılarının parolası bu ekrandaki kullanıcı formundan güncellenir.
   */
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setHata('');

    if (!currentPassword || newPassword.length < 12) {
      setHata('Mevcut şifrenizi ve en az 12 karakterli yeni şifrenizi girin.');
      return;
    }

    const res = await fetch('/api/admin/content', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        entity: 'password',
        data: { currentPassword, newPassword },
      }),
    });

    if (res.ok) {
      setCurrentPassword('');
      setNewPassword('');
      alert('Şifreniz değiştirildi. Lütfen yeni şifrenizle tekrar giriş yapın.');
      router.push('/admin/login');
      router.refresh();
      return;
    }

    const data = await res.json().catch(() => ({}));
    setHata(data.error || 'Şifre değiştirilirken hata oluştu.');
  };

  const loadUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/users');
      if (res.status === 403) {
        setYetkisiz(true);
        return;
      }
      const data = await res.json();
      setUsers(data.users || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;

    fetch('/api/admin/users')
      .then(async (res) => {
        if (cancelled) return;
        if (res.status === 403) {
          setYetkisiz(true);
          return;
        }
        const data = await res.json();
        if (!cancelled) setUsers(data.users || []);
      })
      .catch(() => {
        /* Liste okunamazsa boş gösterilir. */
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    setHata('');
    setMsg('Kaydediliyor...');

    const govde: Record<string, unknown> = {
      name: editing.name,
      email: editing.email,
      role: editing.role,
      isActive: editing.isActive,
    };
    if (editing.id) govde.id = editing.id;
    if (editing.password) govde.password = editing.password;

    const res = await fetch('/api/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(govde),
    });
    const data = await res.json();

    if (!res.ok) {
      setMsg('');
      setHata(data.error || 'Kullanıcı kaydedilemedi.');
      return;
    }

    setMsg('Kullanıcı kaydedildi.');
    setEditing(null);
    await loadUsers();
    setTimeout(() => setMsg(''), 3000);
  };

  const handleDelete = async (user: GorunurKullanici) => {
    if (!confirm(`${user.email} kullanıcısı silinsin mi?`)) return;
    setHata('');

    const res = await fetch(`/api/admin/users?id=${encodeURIComponent(user.id)}`, {
      method: 'DELETE',
    });
    const data = await res.json();

    if (!res.ok) {
      setHata(data.error || 'Kullanıcı silinemedi.');
      return;
    }
    await loadUsers();
  };

  if (yetkisiz) {
    return (
      <div className="p-6 bg-amber-50 border border-amber-200 rounded-2xl text-sm text-amber-900">
        Bu sayfayı görüntüleme yetkiniz yok. Kullanıcı yönetimi yalnızca süper yönetici ve
        admin rolündeki hesaplara açıktır.
      </div>
    );
  }

  return (
    <div className="space-y-6 text-xs">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Sistem Kullanıcıları</h1>
          <p className="text-slate-500 mt-1">
            Panele giriş yapabilecek hesapları buradan yönetin.
          </p>
        </div>
        {!editing && canEdit && (
          <button
            onClick={() => setEditing({ ...BOS_KULLANICI })}
            className="px-4 py-2.5 rounded-xl bg-blue-900 hover:bg-blue-950 text-white font-bold inline-flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>Yeni Kullanıcı</span>
          </button>
        )}
      </div>

      <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
        <div className="font-bold text-slate-800 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-blue-900" />
          <span>Yetki kuralı</span>
          {!roleLoading && !canEdit && (
            <span className="ml-1 px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 text-[10px] font-bold uppercase tracking-wider">
              Salt görüntüleme
            </span>
          )}
        </div>
        <ul className="text-slate-600 space-y-1 leading-relaxed">
          <li>
            <b>Admin</b> — <b>Google &amp; SEO Suite</b> ve <b>Site &amp; Firma Ayarları</b> dahil
            her yerde değişiklik yapabilir.
          </li>
          <li>
            <b>Sistem kullanıcısı</b> — bu iki ekranı yalnızca görüntüler; kampanya, blog, hizmet
            gibi diğer bölümlerde düzenleme yapabilir.
          </li>
        </ul>
      </div>

      {msg && (
        <div className="p-3 bg-emerald-50 text-emerald-800 font-bold rounded-xl border border-emerald-200">
          {msg}
        </div>
      )}
      {hata && (
        <div className="p-3 bg-rose-50 text-rose-800 font-bold rounded-xl border border-rose-200">
          {hata}
        </div>
      )}

      {editing && (
        <form
          onSubmit={handleSave}
          className="bg-white rounded-2xl p-6 border border-slate-300 shadow-xl space-y-4"
        >
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <h2 className="font-bold text-slate-900 text-base">
              {editing.id ? `Kullanıcıyı Düzenle: ${editing.email}` : 'Yeni Kullanıcı'}
            </h2>
            <button
              type="button"
              onClick={() => {
                setEditing(null);
                setHata('');
              }}
              className="p-1.5 rounded-lg hover:bg-slate-100"
            >
              <X className="w-4 h-4 text-slate-500" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Ad Soyad</label>
              <input
                type="text"
                required
                value={editing.name}
                onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                className="w-full p-2.5 rounded-lg border border-slate-300 font-bold"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">E-Posta</label>
              <input
                type="email"
                required
                autoComplete="off"
                value={editing.email}
                onChange={(e) => setEditing({ ...editing, email: e.target.value })}
                className="w-full p-2.5 rounded-lg border border-slate-300 font-mono"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Rol</label>
              <select
                value={editing.role}
                onChange={(e) =>
                  setEditing({ ...editing, role: e.target.value as 'admin' | 'user' })
                }
                className="w-full p-2.5 rounded-lg border border-slate-300 font-bold bg-white"
              >
                <option value="user">Sistem Kullanıcısı (kısıtlı ekranlar salt görüntüleme)</option>
                <option value="admin">Admin (tüm ekranlarda düzenleme)</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Parola {editing.id && <span className="font-normal text-slate-400">(boş bırakılırsa değişmez)</span>}
              </label>
              <input
                type="password"
                autoComplete="new-password"
                minLength={8}
                required={!editing.id}
                value={editing.password}
                onChange={(e) => setEditing({ ...editing, password: e.target.value })}
                placeholder="En az 8 karakter"
                className="w-full p-2.5 rounded-lg border border-slate-300 font-mono"
              />
            </div>
          </div>

          <label className="flex items-center gap-2 font-bold text-slate-700">
            <input
              type="checkbox"
              checked={editing.isActive}
              onChange={(e) => setEditing({ ...editing, isActive: e.target.checked })}
              className="w-4 h-4"
            />
            <span>Hesap aktif (pasif kullanıcılar giriş yapamaz)</span>
          </label>

          <div className="pt-2 border-t border-slate-100">
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold inline-flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              <span>Kaydet</span>
            </button>
          </div>
        </form>
      )}

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="p-6 text-slate-500">Yükleniyor...</div>
        ) : users.length === 0 ? (
          <div className="p-6 text-slate-500 flex items-center gap-2">
            <Users className="w-4 h-4" />
            <span>Henüz sistem kullanıcısı yok.</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
          <table className="w-full min-w-[640px]">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
              <tr>
                <th className="text-left p-3 font-bold">Ad Soyad</th>
                <th className="text-left p-3 font-bold">E-Posta</th>
                <th className="text-left p-3 font-bold">Rol</th>
                <th className="text-left p-3 font-bold">Durum</th>
                <th className="text-right p-3 font-bold">İşlem</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-b border-slate-100 last:border-0">
                  <td className="p-3 font-bold text-slate-900">{user.name}</td>
                  <td className="p-3 font-mono text-slate-600">{user.email}</td>
                  <td className="p-3">
                    {user.role === 'admin' ? (
                      <span className="px-2 py-1 rounded-lg bg-blue-100 text-blue-900 font-bold inline-flex items-center gap-1">
                        <ShieldCheck className="w-3 h-3" />
                        Admin
                      </span>
                    ) : (
                      <span className="px-2 py-1 rounded-lg bg-slate-100 text-slate-700 font-bold inline-flex items-center gap-1">
                        <Eye className="w-3 h-3" />
                        Sistem Kullanıcısı
                      </span>
                    )}
                  </td>
                  <td className="p-3">
                    <span
                      className={`px-2 py-1 rounded-lg font-bold ${
                        user.isActive
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      {user.isActive ? 'Aktif' : 'Pasif'}
                    </span>
                  </td>
                  <td className="p-3">
                    {canEdit ? (
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() =>
                            setEditing({
                              id: user.id,
                              name: user.name,
                              email: user.email,
                              role: user.role,
                              isActive: user.isActive,
                              password: '',
                            })
                          }
                          className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700"
                          title="Düzenle"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(user)}
                          className="p-2 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700"
                          title="Sil"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <div className="text-right text-slate-400">—</div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </div>

      {/*
        Yönetici parolası kutusu. Bu kutu env'de tanımlı ortak yönetici hesabının
        parolasını değiştirir; sistem kullanıcılarının parolası yukarıdaki kullanıcı
        formundan güncellenir. Bu nedenle yalnızca yönetici rollerine gösterilir.
      */}
      {canEdit && (
        <div className="max-w-md bg-white rounded-2xl p-6 border border-slate-200 shadow-2xs space-y-4">
          <h3 className="font-bold text-slate-900 text-base border-b border-slate-100 pb-2 flex items-center gap-2">
            <Lock className="w-4 h-4 text-rose-700" />
            <span>Yönetici Şifresini Değiştir</span>
          </h3>

          <p className="text-[11px] text-slate-500 leading-relaxed">
            Bu işlem, ortak yönetici hesabının şifresini değiştirir ve sizi yeniden giriş
            yapmaya yönlendirir. Sistem kullanıcılarının şifresini değiştirmek için
            yukarıdaki listeden ilgili kullanıcıyı düzenleyin.
          </p>

          <form onSubmit={handleChangePassword} className="space-y-3">
            <div>
              <label htmlFor="mevcut-sifre" className="block font-bold text-slate-700 mb-1">
                Mevcut Şifre
              </label>
              <input
                id="mevcut-sifre"
                type="password"
                required
                autoComplete="current-password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full p-2.5 rounded-lg border border-slate-300"
              />
            </div>
            <div>
              <label htmlFor="yeni-sifre" className="block font-bold text-slate-700 mb-1">
                Yeni Güvenli Şifre
              </label>
              <input
                id="yeni-sifre"
                type="password"
                required
                minLength={12}
                autoComplete="new-password"
                placeholder="En az 12 karakter"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full p-2.5 rounded-lg border border-slate-300"
              />
            </div>

            <button type="submit" className="w-full py-2.5 rounded-xl bg-rose-900 hover:bg-rose-950 text-white font-bold">
              Şifreyi Güncelle
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
