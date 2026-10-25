'use client';

// Nexus Handshake — open a deal as the seller, and see your handshakes on both sides.
// The seller is the session (the BFF resolves it, P6); this form only says what the deal is.
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { TEC_COLORS } from '@yasser172/tec-ui';
import { SignInGate } from '@/components/pi/SignInGate';
import { isWallet } from '@/lib/nexus/handshake-copy';
import type { Handshake } from '@/lib/nexus/handshake';
import { useHsCopy, hsPost, page, inner, card, label, input, primary, StatusPill, fmtPi } from '@/components/handshake/ui';

function NewDeal() {
  const { c } = useHsCopy();
  const router = useRouter();
  const [f, setF] = useState({ title: '', terms: '', due: '', amount: '', wallet: '' });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [mine, setMine] = useState<Handshake[] | null>(null);

  useEffect(() => {
    let alive = true;
    fetch('/api/bff/nexus/handshakes', { credentials: 'include', cache: 'no-store' })
      .then((r) => r.json().catch(() => null))
      .then((d) => { if (alive) setMine(Array.isArray(d?.handshakes) ? d.handshakes : []); })
      .catch(() => { if (alive) setMine([]); });
    return () => { alive = false; };
  }, []);

  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setF((p) => ({ ...p, [k]: e.target.value }));
  const amountOk = /^\d+(\.\d{1,7})?$/.test(f.amount.trim()) && Number(f.amount) > 0;
  const ready = f.title.trim() && amountOk && isWallet(f.wallet) && !busy;

  const submit = async () => {
    setBusy(true); setErr(null);
    const r = await hsPost<{ handshake: Handshake | null }>('/api/bff/nexus/handshakes', { ...f, amount: f.amount.trim(), wallet: f.wallet.trim() });
    if (r.ok && r.data.handshake) { router.push(`/h/${r.data.handshake.code}`); return; }
    setErr(r.status === 503 || r.status === 0 ? c.unavailable : r.data.error ?? c.unavailable);
    setBusy(false);
  };

  return (
    <main style={page}>
      <div style={inner}>
        <Link href="/app" style={{ fontSize: 13, color: TEC_COLORS.gold, textDecoration: 'none' }}>{c.back}</Link>
        <div style={{ fontSize: 12, letterSpacing: 1, color: TEC_COLORS.subtext, textTransform: 'uppercase', marginTop: 18 }}>{c.kicker}</div>
        <h1 style={{ fontSize: 24, fontWeight: 900, color: TEC_COLORS.gold, margin: '4px 0 0' }}>{c.newTitle}</h1>
        <p style={{ fontSize: 13, color: TEC_COLORS.subtext, lineHeight: 1.6, margin: '8px 0 0' }}>{c.homeTagline}</p>

        <section style={card}>
          <label style={label}>{c.fTitle}</label>
          <input style={input} value={f.title} onChange={set('title')} maxLength={120} placeholder={c.fTitlePh} />

          <label style={{ ...label, marginTop: 14 }}>{c.fAmount}</label>
          <input style={{ ...input, direction: 'ltr' }} value={f.amount} onChange={set('amount')} inputMode="decimal" placeholder="25" />

          <label style={{ ...label, marginTop: 14 }}>{c.fTerms}</label>
          <textarea style={{ ...input, minHeight: 70, resize: 'vertical' }} value={f.terms} onChange={set('terms')} maxLength={1000} placeholder={c.fTermsPh} />

          <label style={{ ...label, marginTop: 14 }}>{c.fDue}</label>
          <input style={input} value={f.due} onChange={set('due')} maxLength={120} placeholder={c.fDuePh} />

          <label style={{ ...label, marginTop: 14 }}>{c.fWallet}</label>
          <input style={{ ...input, direction: 'ltr', fontFamily: 'ui-monospace, Menlo, monospace', fontSize: 13 }} value={f.wallet} onChange={set('wallet')}
            maxLength={56} autoCapitalize="characters" autoCorrect="off" spellCheck={false} placeholder="G…" />
          <div style={{ fontSize: 11, color: f.wallet && !isWallet(f.wallet) ? TEC_COLORS.red : TEC_COLORS.subtext, marginTop: 6 }}>{c.fWalletHint}</div>

          {err && <div style={{ fontSize: 13, color: TEC_COLORS.red, marginTop: 12 }}>{err}</div>}
          <button style={{ ...primary, opacity: ready ? 1 : 0.5 }} disabled={!ready} onClick={() => { void submit(); }}>
            {busy ? c.creating : c.create}
          </button>
          <p style={{ fontSize: 11, color: TEC_COLORS.subtext, margin: '10px 0 0', lineHeight: 1.5 }}>{c.recorded}</p>
        </section>

        <h2 style={{ fontSize: 15, fontWeight: 800, margin: '26px 0 0' }}>{c.mine}</h2>
        {mine === null && <div style={{ fontSize: 12, color: TEC_COLORS.subtext, marginTop: 8 }}>{c.loading}</div>}
        {mine?.length === 0 && <div style={{ fontSize: 12, color: TEC_COLORS.subtext, marginTop: 8 }}>{c.mineEmpty}</div>}
        <div style={{ display: 'grid', gap: 10, marginTop: 10 }}>
          {(mine ?? []).map((h) => (
            <Link key={h.code} href={`/h/${h.code}`} style={{ ...card, marginTop: 0, display: 'block', textDecoration: 'none', color: TEC_COLORS.text }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'baseline' }}>
                <span style={{ fontSize: 14, fontWeight: 800 }}>{h.title}</span>
                <span style={{ fontSize: 14, fontWeight: 900, color: TEC_COLORS.gold, whiteSpace: 'nowrap' }}>{fmtPi(h.amount)} π</span>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 8, flexWrap: 'wrap' }}>
                <StatusPill status={h.status} />
                <span style={{ fontSize: 11, color: TEC_COLORS.subtext }}>{h.viewer === 'seller' ? c.asSeller : c.asBuyer}</span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}

export default function DealPage() {
  return <SignInGate><NewDeal /></SignInGate>;
}
