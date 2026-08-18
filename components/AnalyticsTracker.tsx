'use client';

import {useEffect} from 'react';
import {usePathname} from 'next/navigation';

const SESSION_STORAGE_KEY = 'veli_analytics_session';
const SESSION_TIMEOUT_MS = 30 * 60 * 1000;

function createSessionId(): string {
  if (typeof window !== 'undefined' && typeof window.crypto?.randomUUID === 'function') {
    return window.crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
}

function getActiveSession(): {id: string; includeReferrer: boolean} {
  const now = Date.now();
  try {
    const stored = window.sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as {
        id?: unknown;
        lastActivity?: unknown;
        landingRecorded?: unknown;
      };
      if (
        typeof parsed.id === 'string' &&
        /^[a-zA-Z0-9_-]{16,80}$/.test(parsed.id) &&
        typeof parsed.lastActivity === 'number' &&
        now - parsed.lastActivity >= 0 &&
        now - parsed.lastActivity < SESSION_TIMEOUT_MS
      ) {
        window.sessionStorage.setItem(
          SESSION_STORAGE_KEY,
          JSON.stringify({id: parsed.id, lastActivity: now, landingRecorded: true}),
        );
        return {id: parsed.id, includeReferrer: parsed.landingRecorded !== true};
      }
    }

    const id = createSessionId();
    window.sessionStorage.setItem(
      SESSION_STORAGE_KEY,
      JSON.stringify({id, lastActivity: now, landingRecorded: true}),
    );
    return {id, includeReferrer: true};
  } catch {
    return {id: createSessionId(), includeReferrer: true};
  }
}

export function AnalyticsTracker() {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname || pathname.startsWith('/admin') || pathname.startsWith('/api')) return;

    const session = getActiveSession();

    void fetch('/api/analytics', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      credentials: 'same-origin',
      keepalive: true,
      body: JSON.stringify({
        path: pathname,
        referrer: session.includeReferrer ? document.referrer : '',
        sessionId: session.id,
      }),
    }).catch(() => undefined);
  }, [pathname]);

  return null;
}
