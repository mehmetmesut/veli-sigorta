/**
 * Telefon numarası karşılaştırma — biçim ve ülke kodu farkını yok sayar.
 *
 * Aynı numara sistemde üç farklı biçimde dolaşıyor: kullanıcı panele
 * "0(530) 730 20 02" olarak giriyor, WhatsApp "+90 530 730 20 02" veriyor,
 * SBM ekranları bitişik yazıyor. Karşılaştırma ham metin üzerinden yapılınca
 * WhatsApp'tan kopyalanan numara hiçbir kaydı bulamıyor ve personel kayıtlı
 * müşteriye ikinci bir kart açıyordu.
 *
 * Çözüm: her iki taraf da rakamlara indirgenip ülke kodu ile baştaki sıfır
 * atılarak 10 haneye çekilir. Aynı indirgemeyi `lib/police.ts::toWhatsAppNumber`
 * ve `lib/repo-crm.ts` zaten yapıyordu; arama katmanı yapmadığı için tutarsızdı.
 */

/** Metindeki rakamları çıkarır. */
export function telefonRakamlariniAl(deger: string | undefined | null): string {
  return (deger || '').replace(/\D/g, '');
}

/**
 * Rakam dizisini karşılaştırılabilir 10 haneye indirger.
 * `905307302002` ve `05307302002` → `5307302002`.
 */
export function telefonSadelestir(rakam: string): string {
  if (rakam.length === 12 && rakam.startsWith('90')) return rakam.slice(2);
  if (rakam.length === 11 && rakam.startsWith('0')) return rakam.slice(1);
  return rakam;
}

/** Sorgunun tamamı rakam ve telefon noktalamasından mı oluşuyor? */
export const TELEFON_BICIMI = /^[+\d()\-\s./]+$/;

/**
 * Sorgu, verilen numaralardan birine uyuyor mu?
 *
 * Hem ham hem indirgenmiş biçim denenir: kullanıcı numaranın yalnız son
 * hanelerini ("7302002") yazarak da arayabilsin.
 */
export function telefonAramasiEslesiyorMu(
  numaralar: ReadonlyArray<string | undefined | null>,
  sorgu: string,
): boolean {
  const aranan = telefonRakamlariniAl(sorgu);
  if (!aranan) return false;

  const aranansade = telefonSadelestir(aranan);

  return numaralar.some((numara) => {
    const rakam = telefonRakamlariniAl(numara);
    if (!rakam) return false;

    const sade = telefonSadelestir(rakam);
    return (
      rakam.includes(aranan) || rakam.includes(aranansade) ||
      sade.includes(aranan) || sade.includes(aranansade)
    );
  });
}
