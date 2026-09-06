/**
 * Müşteri aktif/pasif geçişinin kullanıcıya gösterilen metinleri.
 *
 * NEDEN AYRI DOSYA: Bu metin personelin "kayıt silinecek mi?" korkusunu gidermek
 * zorunda — pasife alma yalnızca bir işarettir, poliçe ve teklif kayıtlarına hiç
 * dokunmaz. Yanlış kurulmuş bir cümle personelin işlemi hiç yapmamasına ya da
 * yapıp panikleyip geri almasına yol açar. Saf işlev olduğu için birim testiyle
 * güvenceye alınabiliyor; proje testleri React bileşeni çalıştırmıyor.
 */

/**
 * Onay kutusunda sorulacak soru.
 *
 * @param ad Müşterinin ekranda görünen adı
 * @param aktifYapiliyor true ise pasif kayıt yeniden aktifleştiriliyor
 * @param aktifPoliceSayisi Yürürlükteki poliçe adedi; yalnız pasife alırken kullanılır
 */
export function durumOnayMetni(ad: string, aktifYapiliyor: boolean, aktifPoliceSayisi: number): string {
  if (aktifYapiliyor) {
    return `"${ad}" yeniden aktif hâle getirilsin mi?`;
  }

  // Yürürlükteki poliçe sayısı AYRICA söylenir: pasife alınan müşterinin
  // poliçelerinin de duracağı sanılıyordu. Poliçe takibi aynen devam eder.
  const uyari =
    aktifPoliceSayisi > 0
      ? ` Yürürlükte ${aktifPoliceSayisi} poliçesi var; poliçeler aynen devam eder, poliçe takibinden düşmez.`
      : '';

  return (
    `"${ad}" pasife alınsın mı?${uyari} Kaydı, poliçeleri ve teklifleri silinmez;` +
    ' yalnızca listelerde "Pasif" olarak işaretlenir.'
  );
}

/** İşlem sonrası gösterilen kısa bildirim. */
export function durumBildirimi(ad: string, aktifYapildi: boolean): string {
  return aktifYapildi
    ? `${ad} yeniden aktifleştirildi.`
    : `${ad} pasife alındı. Kayıt listede "Pasif" rozetiyle görünmeye devam eder.`;
}
