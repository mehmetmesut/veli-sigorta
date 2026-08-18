#!/usr/bin/env bash
#
# Sunucuda çalışır: yeni sürümü kurar, derler, canlıya alır ve eski sürümleri temizler.
#
# Sürüm dizini symlink ile değiştirilir; derleme başarısız olursa canlı sürüme hiç
# dokunulmaz. Böylece "yarım deploy" diye bir durum oluşmaz.
#
# Kullanım (sunucuda): bash yayinla.sh <surum-etiketi>
set -euo pipefail

KOK="/var/www/vhosts/velisigorta.com.tr"
SURUM="${1:?Sürüm etiketi verilmedi (örn: 20260817-03)}"
HEDEF="$KOK/app/releases/$SURUM"
# Aktif sürüm + bu kadar eski sürüm saklanır; gerisi silinir. Bir öncekini tutmak
# geri dönüş için yeterli, daha fazlası diskte birikip yer bitiriyordu.
SAKLANAN_ESKI=1

[ -d "$HEDEF" ] || { echo "Sürüm dizini yok: $HEDEF"; exit 1; }

echo "==> Bağımlılıklar"
cd "$HEDEF"
# devDependencies dahil kurulur: Tailwind PostCSS eklentisi ve TypeScript derleme
# sırasında gerekiyor. Standalone çıktısı zaten yalnız çalışma zamanı bağımlılıklarını
# paketlediği için buradaki fazlalık canlıya taşınmaz.
#
# NODE_ENV ve npm_config_production AÇIKÇA temizlenir: private/velisigorta.env içinde
# NODE_ENV='production' var ve betik başka bir komutun ardından (env yüklenmiş bir
# kabukta) çağrılırsa npm devDependencies'i sessizce atlıyor. Derleme o zaman
# "Cannot find module '@tailwindcss/postcss'" ile düşüyor — sebebi görünmediği için
# tanısı pahalı bir hata.
env -u NODE_ENV -u npm_config_production npm ci --include=dev --no-audit --no-fund

echo "==> Derleme"
# Önceki (özellikle yarım kalmış) derlemenin önbelleği temizlenir: Turbopack, eksik
# bağımlılıkla üretilmiş chunk'ları yeniden kullanıp "modül bulunamadı" hatasını
# bağımlılık kurulduktan sonra da tekrarlıyordu.
rm -rf .next
set -a; . "$KOK/private/velisigorta.env"; set +a
npm run build

echo "==> Statik dosyalar standalone'a kopyalanıyor"
# Next standalone çıktısı public/ ve static/ klasörlerini kendiliğinden taşımaz.
cp -r public "$HEDEF/.next/standalone/public"
mkdir -p "$HEDEF/.next/standalone/.next"
cp -r .next/static "$HEDEF/.next/standalone/.next/static"

echo "==> Canlıya alınıyor"
ln -sfn "$HEDEF/.next/standalone" "$KOK/app/current"
systemctl restart velisigorta

echo "==> Sağlık kontrolü"
sleep 4
systemctl is-active --quiet velisigorta || { echo "Servis ayağa kalkmadı!"; exit 1; }

echo "==> Eski sürümler temizleniyor"
# Aktif sürüm asla silinmez: symlink'in gösterdiği dizin listeden çıkarılır.
AKTIF="$(basename "$(dirname "$(dirname "$(readlink -f "$KOK/app/current")")")")"
cd "$KOK/app/releases"
ls -1 | sort -r | grep -v "^$AKTIF$" | tail -n +$((SAKLANAN_ESKI + 1)) | while read -r eski; do
  echo "    siliniyor: $eski"
  rm -rf "$eski"
done

echo "==> Sahiplik düzeltiliyor"
# Dosyalar root'a kalırsa nginx/Plesk yüklenen görselleri okuyamıyor.
chown -R velisigorta.com.tr:psacln "$KOK/app/releases" "$KOK/uploads" 2>/dev/null || true

echo "Yayın tamam: $SURUM"
