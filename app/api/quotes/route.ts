import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json(
    {
      error: 'Teklif talepleri sitede saklanmaz. Lütfen WhatsApp veya telefon kanalını kullanın.',
    },
    { status: 410 },
  );
}
