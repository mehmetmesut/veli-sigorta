/**
 * Helper to dynamically generate a URL-encoded WhatsApp link for any insurance service or query
 */
export function getWhatsAppUrl(
  whatsappNumber: string,
  serviceTitle: string,
  type: 'teklif' | 'bilgi' = 'teklif'
): string {
  // Clean non-numeric chars except leading +
  const cleanedPhone = whatsappNumber.replace(/[^0-9]/g, '');

  let rawMessage = '';
  if (type === 'teklif') {
    rawMessage = `Merhaba, Veli Sigorta web siteniz üzerinden ‘${serviceTitle}’ için sigorta teklifi almak istiyorum.`;
  } else {
    rawMessage = `Merhaba, Veli Sigorta web siteniz üzerinden ‘${serviceTitle}’ hakkında detaylı bilgi almak istiyorum.`;
  }

  const encodedMessage = encodeURIComponent(rawMessage);
  return `https://wa.me/${cleanedPhone}?text=${encodedMessage}`;
}

export function getGeneralWhatsAppUrl(whatsappNumber: string): string {
  const cleanedPhone = whatsappNumber.replace(/[^0-9]/g, '');
  const rawMessage = `Merhaba, Veli Sigorta web siteniz üzerinden bilgi almak istiyorum.`;
  return `https://wa.me/${cleanedPhone}?text=${encodeURIComponent(rawMessage)}`;
}
