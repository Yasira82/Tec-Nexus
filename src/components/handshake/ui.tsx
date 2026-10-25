'use client';

// Shared pieces of the Handshake screens: the language, a POST that carries the CSRF echo, and the
// small cards both screens draw. Fleet tokens only (TEC_COLORS), inline styles (Pi Browser).
import { useState } from 'react';
import { TEC_COLORS } from '@yasser172/tec-ui';
import { useTranslation } from '@/lib/i18n';
import { HS_COPY, type HsCopy } from '@/lib/nexus/handshake-copy';
import type { Handshake, PersonRecord } from '@/lib/nexus/handshake';

export function useHsCopy(): { c: HsCopy; lang: 'en' | 'ar' } {
  const { locale } = useTranslation();
  return { c: HS_COPY[locale], lang: locale };
}

function csrf(): string {
  try { return document.cookie.split('; ').find((p) => p.startsWith('tec_csrf='))?.slice(9) ?? ''; } catch { return ''; }
}

export async function hsPost<T = Record<string, unknown>>(url: string, body?: unknown): Promise<{ ok: boolean; status: number; data: T & { error?: string } }> {
  try {
    const t = csrf();
    const res = await fetch(url, {
      method: 'POST', credentials: 'include',
      headers: { 'Content-Type': 'application/json', ...(t ? { 'x-csrf-token': decodeURIComponent(t) } : {}) },
      body: JSON.stringify(body ?? {}),
    });
    const data = (await res.json().catch(() => ({}))) as T & { ok?: boolean; error?: string };
    return { ok: res.ok && data.ok !== false, status: res.status, data };
  } catch {
    return { ok: false, status: 0, data: { error: 'network' } as T & { error?: string } };
  }
}

export const page: React.CSSProperties = {
  minHeight: '100vh', background: TEC_COLORS.bg, color: TEC_COLORS.text,
  fontFamily: 'system-ui, -apple-system, sans-serif',
};
export const inner: React.CSSProperties = { maxWidth: 620, margin: '0 auto', padding: '28px 20px 64px' };
export const card: React.CSSProperties = {
  background: TEC_COLORS.surface, border: `1px solid ${TEC_COLORS.gold}22`, borderRadius: 14, padding: 16, marginTop: 14,
};
export const label: React.CSSProperties = { fontSize: 12, color: TEC_COLORS.subtext, display: 'block', marginBottom: 6 };
export const input: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box', padding: '11px 12px', fontSize: 15, borderRadius: 10,
  border: `1px solid ${TEC_COLORS.gold}33`, background: TEC_COLORS.bg, color: TEC_COLORS.text, outline: 'none', fontFamily: 'inherit',
};
export const primary: React.CSSProperties = {
  width: '100%', padding: '13px 16px', fontSize: 15, fontWeight: 800, borderRadius: 12, border: 'none',
  background: TEC_COLORS.gold, color: TEC_COLORS.bg, cursor: 'pointer', marginTop: 12,
};
export const secondary: React.CSSProperties = {
  ...primary, background: 'transparent', color: TEC_COLORS.text, border: `1px solid ${TEC_COLORS.subtext}55`, fontWeight: 700,
};
export const mono: React.CSSProperties = {
  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: 12, wordBreak: 'break-all', direction: 'ltr', textAlign: 'left',
};

const STATUS_COLOR: Record<Handshake['status'], string> = {
  OPEN: TEC_COLORS.subtext, AGREED: TEC_COLORS.blue, PAID: TEC_COLORS.cyan,
  COMPLETED: TEC_COLORS.green, DISPUTED: TEC_COLORS.red, CANCELLED: TEC_COLORS.subtext,
};

export function StatusPill({ status }: { status: Handshake['status'] }) {
  const { c } = useHsCopy();
  const col = STATUS_COLOR[status];
  return (
    <span style={{ fontSize: 11, fontWeight: 800, color: col, border: `1px solid ${col}66`, borderRadius: 999, padding: '3px 10px', whiteSpace: 'nowrap' }}>
      {c.status[status]}
    </span>
  );
}

export function CopyButton({ text }: { text: string }) {
  const { c } = useHsCopy();
  const [done, setDone] = useState(false);
  return (
    <button
      onClick={() => { void navigator.clipboard?.writeText(text).then(() => { setDone(true); setTimeout(() => setDone(false), 1500); }).catch(() => {}); }}
      style={{ fontSize: 12, fontWeight: 700, color: TEC_COLORS.gold, background: 'transparent', border: `1px solid ${TEC_COLORS.gold}55`, borderRadius: 8, padding: '5px 10px', cursor: 'pointer', flexShrink: 0 }}>
      {done ? c.copied : c.copy}
    </button>
  );
}

export function CopyRow({ value }: { value: string }) {
  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center', background: TEC_COLORS.bg, borderRadius: 10, padding: '10px 12px', marginTop: 8 }}>
      <div style={{ ...mono, flex: 1, color: TEC_COLORS.text }}>{value}</div>
      <CopyButton text={value} />
    </div>
  );
}

/** A person's record on Nexus — what they did, never a score. Empty is said plainly, not as a warning. */
export function RecordLine({ who, rec }: { who: string; rec: PersonRecord | null | undefined }) {
  const { c, lang } = useHsCopy();
  return (
    <div style={{ marginTop: 10 }}>
      <div style={{ fontSize: 14, fontWeight: 800 }}>@{who}</div>
      <div style={{ fontSize: 12, color: TEC_COLORS.subtext, marginTop: 3, lineHeight: 1.5 }}>
        {!rec || rec.completed + rec.openDisputes === 0
          ? c.recordNone
          : <>
              <span style={{ color: rec.openDisputes ? TEC_COLORS.red : TEC_COLORS.subtext }}>{c.record(rec.completed, rec.openDisputes)}</span>
              {rec.since && <> · {c.since} {new Date(rec.since).toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-GB', { month: 'short', year: 'numeric' })}</>}
            </>}
      </div>
    </div>
  );
}

/** "25.0000000" → "25", "0.5000000" → "0.5"; whole numbers keep their zeros ("100" stays "100"). */
export const fmtPi = (amount: string) => (amount.includes('.') ? amount.replace(/0+$/, '').replace(/\.$/, '') : amount);
