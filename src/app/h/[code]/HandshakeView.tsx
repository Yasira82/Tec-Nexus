'use client';

// Nexus Handshake — the page behind the link. Public: anyone with the link reads the deal, both
// people's records and, once done, the proof. What each person may do is decided by the service
// from their session; this page only offers the step that fits who is looking and where the deal is.
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { TEC_COLORS } from '@yasser172/tec-ui';
import { useMe } from '@/lib-client/hooks/useMe';
import { selfSignIn } from '@/lib/pi/self-sign-in';
import { isWallet, explorerTx } from '@/lib/nexus/handshake-copy';
import type { Handshake } from '@/lib/nexus/handshake';
import { useHsCopy, hsPost, page, inner, card, label, input, primary, secondary, mono, StatusPill, CopyRow, RecordLine, fmtPi } from '@/components/handshake/ui';

type Load = { state: 'loading' } | { state: 'missing' } | { state: 'unavailable' } | { state: 'ready'; h: Handshake };

export function HandshakeView({ code }: { code: string }) {
  const { c } = useHsCopy();
  const me = useMe();
  const [load, setLoad] = useState<Load>({ state: 'loading' });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [wallet, setWallet] = useState('');
  const [disputing, setDisputing] = useState(false);
  const [note, setNote] = useState('');
  const [link, setLink] = useState('');

  const refresh = useCallback(async () => {
    try {
      const r = await fetch(`/api/bff/nexus/handshakes/${encodeURIComponent(code)}`, { credentials: 'include', cache: 'no-store' });
      const d = await r.json().catch(() => null);
      if (r.ok && d?.handshake) setLoad({ state: 'ready', h: d.handshake as Handshake });
      else setLoad({ state: r.status === 404 ? 'missing' : 'unavailable' });
    } catch { setLoad({ state: 'unavailable' }); }
  }, [code]);

  useEffect(() => { void refresh(); setLink(`${window.location.origin}${window.location.pathname}`); }, [refresh]);

  const act = async (action: string, body?: Record<string, unknown>) => {
    setBusy(true); setMsg(null);
    const r = await hsPost<{ handshake: Handshake | null; found?: boolean; reused?: boolean }>(
      `/api/bff/nexus/handshakes/${encodeURIComponent(code)}/${action}`, body);
    if (r.ok && r.data.handshake) {
      setLoad({ state: 'ready', h: r.data.handshake });
      if (action === 'check-payment' && r.data.found === false) setMsg(r.data.reused ? c.reused : c.notFound);
      if (action === 'dispute') setDisputing(false);
    } else {
      setMsg(r.status === 503 || r.status === 0 ? c.unavailable : r.data.error ?? c.unavailable);
    }
    setBusy(false);
  };

  const signIn = async () => {
    setBusy(true);
    const r = await selfSignIn(Date.now(), { force: true });
    if (r === 'has-session') { window.location.reload(); return; }
    if (r !== 'navigating') setBusy(false);
  };

  if (load.state !== 'ready') {
    return (
      <main style={page}><div style={inner}>
        <Link href="/app" style={{ fontSize: 13, color: TEC_COLORS.gold, textDecoration: 'none' }}>{c.back}</Link>
        <p style={{ fontSize: 14, color: TEC_COLORS.subtext, marginTop: 24 }}>
          {load.state === 'loading' ? c.loading : load.state === 'missing' ? c.missing : c.unavailable}
        </p>
      </div></main>
    );
  }

  const h = load.h;
  const isSeller = h.viewer === 'seller';
  const isBuyer = h.viewer === 'buyer';
  const stranger = !h.viewer;
  const amount = fmtPi(h.amount);

  return (
    <main style={page}>
      <div style={inner}>
        <Link href={me.authenticated ? '/deal' : '/app'} style={{ fontSize: 13, color: TEC_COLORS.gold, textDecoration: 'none' }}>{c.back}</Link>
        <div style={{ fontSize: 12, letterSpacing: 1, color: TEC_COLORS.subtext, textTransform: 'uppercase', marginTop: 18 }}>{c.kicker} · {h.code}</div>

        {/* ── The deal ─────────────────────────────────────────── */}
        <section style={card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'flex-start' }}>
            <h1 style={{ fontSize: 20, fontWeight: 900, margin: 0, lineHeight: 1.3 }}>{h.title}</h1>
            <StatusPill status={h.status} />
          </div>
          <div style={{ fontSize: 30, fontWeight: 900, color: TEC_COLORS.gold, marginTop: 10, direction: 'ltr', textAlign: 'start' }}>{amount} π</div>
          {h.terms && <><div style={{ ...label, marginTop: 12 }}>{c.terms}</div><div style={{ fontSize: 14, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{h.terms}</div></>}
          {h.due && <><div style={{ ...label, marginTop: 12 }}>{c.due}</div><div style={{ fontSize: 14 }}>{h.due}</div></>}
        </section>

        {/* ── Who — their records, never a score ──────────────── */}
        <section style={card}>
          <div style={label}>{c.seller}</div>
          <RecordLine who={h.seller} rec={h.records?.seller} />
          {h.buyer && <><div style={{ ...label, marginTop: 16 }}>{c.buyer}</div><RecordLine who={h.buyer} rec={h.records?.buyer} /></>}
        </section>

        {/* ── The step for this person, at this point ──────────── */}
        {h.status === 'OPEN' && isSeller && (
          <section style={card}>
            <div style={{ fontSize: 14, fontWeight: 800 }}>{c.share}</div>
            <CopyRow value={link} />
            <button style={secondary} disabled={busy} onClick={() => { void act('cancel'); }}>{c.cancel}</button>
          </section>
        )}

        {h.status === 'OPEN' && stranger && (<>
          <Guard />
          <section style={card}>
            <div style={{ fontSize: 15, fontWeight: 800 }}>{c.agreeTitle}</div>
            {me.loading ? null : me.authenticated ? (<>
              <label style={{ ...label, marginTop: 12 }}>{c.agreeWallet}</label>
              <input style={{ ...input, direction: 'ltr', fontFamily: 'ui-monospace, Menlo, monospace', fontSize: 13 }} value={wallet}
                onChange={(e) => setWallet(e.target.value)} maxLength={56} autoCapitalize="characters" autoCorrect="off" spellCheck={false} placeholder="G…" />
              <div style={{ fontSize: 11, color: TEC_COLORS.subtext, marginTop: 6 }}>{c.agreeHint}</div>
              <button style={{ ...primary, opacity: isWallet(wallet) && !busy ? 1 : 0.5 }} disabled={!isWallet(wallet) || busy}
                onClick={() => { void act('agree', { wallet: wallet.trim() }); }}>{c.agree}</button>
            </>) : (
              <button style={primary} disabled={busy} onClick={() => { void signIn(); }}>{c.signInToAgree}</button>
            )}
          </section>
        </>)}

        {h.status === 'AGREED' && isBuyer && (<>
          <Guard />
          <section style={card}>
            <div style={{ fontSize: 15, fontWeight: 800 }}>{c.payTitle}</div>
            <div style={{ fontSize: 13, color: TEC_COLORS.subtext, marginTop: 8, lineHeight: 1.6 }}>{c.payBody(amount)}</div>
            <CopyRow value={h.sellerWallet} />
            {h.buyerWallet && <><div style={{ ...label, marginTop: 12 }}>{c.payFrom}</div><div style={{ ...mono, color: TEC_COLORS.subtext }}>{h.buyerWallet}</div></>}
            <button style={primary} disabled={busy} onClick={() => { void act('check-payment'); }}>{busy ? c.checking : c.check}</button>
            <button style={secondary} disabled={busy} onClick={() => { void act('cancel'); }}>{c.cancel}</button>
          </section>
        </>)}

        {h.status === 'AGREED' && isSeller && (
          <section style={card}>
            <div style={{ fontSize: 13, color: TEC_COLORS.subtext, lineHeight: 1.6 }}>{c.sellerWaits}</div>
            <button style={primary} disabled={busy} onClick={() => { void act('check-payment'); }}>{busy ? c.checking : c.check}</button>
            <button style={secondary} disabled={busy} onClick={() => { void act('cancel'); }}>{c.cancel}</button>
          </section>
        )}

        {(h.status === 'PAID' || h.status === 'DISPUTED') && (
          <section style={card}>
            {h.paidTxHash && <TxLine hash={h.paidTxHash} />}
            {h.status === 'DISPUTED' && (
              <div style={{ marginTop: 14 }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: TEC_COLORS.red }}>{c.disputed}</div>
                {h.disputeNote && <div style={{ fontSize: 13, marginTop: 4, whiteSpace: 'pre-wrap' }}>{h.disputeNote}</div>}
                <div style={{ fontSize: 12, color: TEC_COLORS.subtext, marginTop: 6 }}>{c.disputeLift}</div>
              </div>
            )}
            {isBuyer && !disputing && (<>
              <button style={primary} disabled={busy} onClick={() => { void act('received'); }}>{c.received}</button>
              {h.status === 'PAID' && <button style={secondary} disabled={busy} onClick={() => setDisputing(true)}>{c.notReceived}</button>}
            </>)}
            {isBuyer && disputing && (<>
              <label style={{ ...label, marginTop: 14 }}>{c.disputeNote}</label>
              <textarea style={{ ...input, minHeight: 70 }} value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} />
              <div style={{ fontSize: 11, color: TEC_COLORS.subtext, marginTop: 6, lineHeight: 1.5 }}>{c.disputeBody}</div>
              <button style={{ ...primary, background: TEC_COLORS.red, color: '#fff' }} disabled={busy} onClick={() => { void act('dispute', { note }); }}>{c.disputeSend}</button>
            </>)}
          </section>
        )}

        {h.status === 'COMPLETED' && (
          <section style={{ ...card, border: `1px solid ${TEC_COLORS.green}55` }}>
            <div style={{ fontSize: 16, fontWeight: 900, color: TEC_COLORS.green }}>✓ {c.proofTitle}</div>
            <div style={{ fontSize: 13, color: TEC_COLORS.subtext, marginTop: 6, lineHeight: 1.6 }}>{c.proofBody}</div>
            {h.paidTxHash && <TxLine hash={h.paidTxHash} />}
            {h.proofHash && <><div style={{ ...label, marginTop: 14 }}>{c.proofHash}</div><div style={{ ...mono, color: TEC_COLORS.text }}>{h.proofHash}</div></>}
            <CopyRow value={link} />
          </section>
        )}

        {h.status === 'CANCELLED' && <section style={card}><div style={{ fontSize: 13, color: TEC_COLORS.subtext }}>{c.cancelled}</div></section>}

        {msg && <div style={{ fontSize: 13, color: TEC_COLORS.gold, marginTop: 14, lineHeight: 1.5 }}>{msg}</div>}
        <p style={{ fontSize: 11, color: TEC_COLORS.subtext, margin: '22px 0 0', lineHeight: 1.5 }}>{c.recorded}</p>
      </div>
    </main>
  );
}

function Guard() {
  const { c } = useHsCopy();
  return (
    <section style={{ ...card, border: `1px solid ${TEC_COLORS.gold}66` }}>
      <div style={{ fontSize: 14, fontWeight: 900, color: TEC_COLORS.gold }}>{c.guardTitle}</div>
      <ul style={{ margin: '8px 0 0', paddingInlineStart: 18, fontSize: 13, lineHeight: 1.6 }}>
        {c.guard.map((g) => <li key={g} style={{ marginTop: 4 }}>{g}</li>)}
      </ul>
    </section>
  );
}

function TxLine({ hash }: { hash: string }) {
  const { c } = useHsCopy();
  return (
    <div style={{ marginTop: 12 }}>
      <div style={label}>{c.tx}</div>
      <div style={{ ...mono, color: TEC_COLORS.text }}>{hash}</div>
      <a href={explorerTx(hash)} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: TEC_COLORS.gold, display: 'inline-block', marginTop: 6 }}>{c.viewTx} ↗</a>
    </div>
  );
}
