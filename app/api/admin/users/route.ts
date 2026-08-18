import { randomUUID } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentAdmin } from '@/lib/auth';
import { addAuditLog } from '@/lib/db';
import { kullaniciKaydet, kullaniciSil, kullanicilariGetir } from '@/lib/repo-ops';
import { canManageUsers } from '@/lib/permissions';
import { assertSameOrigin, ContentValidationError } from '@/lib/admin-content-validation';
import { readLimitedJson, RequestBodyError } from '@/lib/rate-limit';
import { isSuperAdminIdentifier } from '@/lib/superadmin';
import type { SystemUser } from '@/lib/types';

export const dynamic = 'force-dynamic';

const MAX_BODY_BYTES = 16 * 1024;
const BCRYPT_ROUNDS = 12;
const MIN_PAROLA = 8;

const kullaniciSemasi = z
  .object({
    id: z.string().trim().max(120).optional(),
    name: z.string().trim().min(2).max(120),
    email: z.string().trim().toLowerCase().email().max(160),
    role: z.enum(['admin', 'user']),
    isActive: z.boolean(),
    // Yeni kullanıcıda zorunlu, düzenlemede boş bırakılırsa parola değişmez.
    password: z.string().min(MIN_PAROLA).max(200).optional().or(z.literal('')),
  })
  .strict();

/** Parola hash'i istemciye hiçbir koşulda gönderilmez. */
function guvenliGorunum(user: SystemUser) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    isActive: user.isActive,
    createdAt: user.createdAt,
  };
}

async function yetkiKontrol() {
  const current = await getCurrentAdmin();
  if (!current) {
    return { hata: NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 }) };
  }
  if (!canManageUsers(current.role)) {
    return {
      hata: NextResponse.json(
        { error: 'Kullanıcı yönetimi yetkiniz yok.' },
        { status: 403 },
      ),
    };
  }
  return { current };
}

/**
 * Listeleme tüm panel kullanıcılarına açıktır; ekleme/düzenleme/silme değildir.
 * Korumalı süper yönetici hiçbir rolde listede görünmez.
 */
export async function GET() {
  const current = await getCurrentAdmin();
  if (!current) {
    return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
  }

  // Korumalı süper yönetici listede hiçbir zaman görünmez.
  const kullanicilar = (await kullanicilariGetir())
    .filter((user) => !isSuperAdminIdentifier(user.email))
    .map(guvenliGorunum);

  return NextResponse.json({ users: kullanicilar, currentRole: current.role });
}

export async function POST(req: NextRequest) {
  try {
    assertSameOrigin(req);
    const { hata, current } = await yetkiKontrol();
    if (hata || !current) return hata!;

    const gövde = await readLimitedJson(req, MAX_BODY_BYTES);
    const sonuc = kullaniciSemasi.safeParse(gövde);
    if (!sonuc.success) {
      return NextResponse.json(
        { error: 'Girilen bilgiler geçersiz. Parola en az 8 karakter olmalıdır.' },
        { status: 400 },
      );
    }
    const girdi = sonuc.data;

    if (isSuperAdminIdentifier(girdi.email)) {
      return NextResponse.json(
        { error: 'Bu kullanıcı adı ayrılmıştır.' },
        { status: 409 },
      );
    }

    const mevcutlar = await kullanicilariGetir();
    const duzenlenen = girdi.id ? mevcutlar.find((u) => u.id === girdi.id) : undefined;

    if (girdi.id && !duzenlenen) {
      return NextResponse.json({ error: 'Kullanıcı bulunamadı.' }, { status: 404 });
    }

    const epostaCakismasi = mevcutlar.some(
      (u) => u.email === girdi.email && u.id !== duzenlenen?.id,
    );
    if (epostaCakismasi) {
      return NextResponse.json(
        { error: 'Bu e-posta adresi başka bir kullanıcıda kayıtlı.' },
        { status: 409 },
      );
    }

    if (!duzenlenen && !girdi.password) {
      return NextResponse.json(
        { error: 'Yeni kullanıcı için parola zorunludur.' },
        { status: 400 },
      );
    }

    const passwordHash = girdi.password
      ? await bcrypt.hash(girdi.password, BCRYPT_ROUNDS)
      : duzenlenen!.passwordHash;

    const kayit: SystemUser = {
      id: duzenlenen?.id ?? `user-${randomUUID()}`,
      name: girdi.name,
      email: girdi.email,
      role: girdi.role,
      isActive: girdi.isActive,
      passwordHash,
      createdAt: duzenlenen?.createdAt ?? new Date().toISOString(),
    };

    await kullaniciKaydet(kayit);

    await addAuditLog(
      current.email,
      duzenlenen ? 'USER_UPDATE' : 'USER_CREATE',
      `${kayit.email} (${kayit.role})`,
    ).catch((error) => console.error('Kullanıcı denetim kaydı başarısız:', error));

    return NextResponse.json({ success: true, user: guvenliGorunum(kayit) });
  } catch (error) {
    if (error instanceof ContentValidationError || error instanceof RequestBodyError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error('Kullanıcı kaydı başarısız:', error);
    return NextResponse.json({ error: 'Kullanıcı kaydedilemedi.' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    assertSameOrigin(req);
    const { hata, current } = await yetkiKontrol();
    if (hata || !current) return hata!;

    const id = new URL(req.url).searchParams.get('id')?.trim();
    if (!id) {
      return NextResponse.json({ error: 'Kullanıcı kimliği gerekli.' }, { status: 400 });
    }

    const hedef = (await kullanicilariGetir()).find((u) => u.id === id);
    if (!hedef) {
      return NextResponse.json({ error: 'Kullanıcı bulunamadı.' }, { status: 404 });
    }

    // Kullanıcının kendi hesabını silmesi engellenir; panelde kilitlenmeyi önler.
    if (hedef.email === current.email) {
      return NextResponse.json(
        { error: 'Kendi hesabınızı silemezsiniz.' },
        { status: 409 },
      );
    }

    await kullaniciSil(id);

    await addAuditLog(current.email, 'USER_DELETE', hedef.email).catch((error) =>
      console.error('Kullanıcı silme denetim kaydı başarısız:', error),
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof ContentValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error('Kullanıcı silinemedi:', error);
    return NextResponse.json({ error: 'Kullanıcı silinemedi.' }, { status: 500 });
  }
}
