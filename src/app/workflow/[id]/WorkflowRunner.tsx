'use client';

// TEC Nexus — live Workflow Run driver (C-109 §5). Starts a REAL run against the
// engine (identity-service) and drives it: Advance executes the next step; a U2A
// payment step HALTS at "awaiting your payment" (the engine never moves Pi itself,
// Invariant #8); Fail triggers the real saga rollback (compensations in reverse).
// The status shown is the backend's real run state — not a mock.

import { useState, useEffect } from 'react';
import { TEC_COLORS } from '@yasser172/tec-ui';
import {
  isHubNavigation, redirectToHubPayment, createPaymentRecord, createU2APayment,
} from '@/lib/pi-payment';

type StepStatus = 'PENDING' | 'DONE' | 'BLOCKED_ON_PAYMENT' | 'FAILED' | 'COMPENSATED';
type RunStatus  = 'PENDING' | 'RUNNING' | 'AWAITING_PAYMENT' | 'COMPLETED' | 'COMPENSATING' | 'COMPENSATED' | 'FAILED';
interface Step { idx: number; action: string; service: string; is_payment: boolean; status: StepStatus; error: string | null }
interface Run  { id: string; status: RunStatus; cursor: number; steps: Step[] }

const STEP_STYLE: Record<StepStatus, { label: string; color: string }> = {
  PENDING:            { label: '•  pending',            color: '#8a8a9a' },
  DONE:               { label: '✓  done',               color: '#22C55E' },
  BLOCKED_ON_PAYMENT: { label: '⏸  awaiting payment',   color: '#FBBF24' },
  FAILED:             { label: '✕  failed',             color: '#EF4444' },
  COMPENSATED:        { label: '↩  rolled back',        color: '#F59E0B' },
};
const RUN_LABEL: Record<RunStatus, string> = {
  PENDING: 'ready', RUNNING: 'running', AWAITING_PAYMENT: 'awaiting your payment',
  COMPLETED: 'completed', COMPENSATING: 'rolling back…', COMPENSATED: 'rolled back (no partial state)',
  FAILED: 'failed',
};
const isTerminal = (s: RunStatus) => s === 'COMPLETED' || s === 'COMPENSATED' || s === 'FAILED';

export function WorkflowRunner({ templateId }: { templateId: string }) {
  const [run, setRun]   = useState<Run | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr]   = useState<string | null>(null);
  const [restoring, setRestoring] = useState(true);

  // RESTORE an active run on mount so a run is never lost / restarted from scratch —
  // e.g. after a payment round-trip through the Hub, coming back resumes the SAME run
  // (its steps are already advanced server-side) instead of starting over.
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res  = await fetch(`/api/bff/nexus/runs?template=${encodeURIComponent(templateId)}`, { cache: 'no-store' });
        const data = await res.json().catch(() => ({}));
        const runs = (data?.runs ?? []) as Run[];
        const active = runs.find((r) => !isTerminal(r.status));   // newest-first from the backend
        if (alive && active) setRun(active);
      } catch { /* no restore — user can Start a fresh run */ }
      finally { if (alive) setRestoring(false); }
    })();
    return () => { alive = false; };
  }, [templateId]);

  const post = async (url: string, body?: unknown): Promise<Run | null> => {
    setBusy(true); setErr(null);
    try {
      const res  = await fetch(url, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        setErr(res.status === 401 ? 'Sign in to run a workflow.' : (data.error || 'Something went wrong.'));
        return null;
      }
      return data.run as Run;
    } catch {
      setErr('Network error — try again.');
      return null;
    } finally { setBusy(false); }
  };

  const start   = async () => { const r = await post('/api/bff/nexus/runs', { templateId }); if (r) setRun(r); };
  const advance = async () => { if (!run) return; const r = await post(`/api/bff/nexus/run/${run.id}/advance`); if (r) setRun(r); };
  const fail    = async () => { if (!run) return; const r = await post(`/api/bff/nexus/run/${run.id}/fail`, { reason: 'Simulated step failure' }); if (r) setRun(r); };

  // After a real payment completes, payment-service emits payment.completed.v1 carrying
  // the run link → the Nexus consumer resumes the run server-side (async). Poll for it.
  const pollUntilResumed = async (runId: string, stepIdx: number) => {
    for (let i = 0; i < 8; i++) {
      await new Promise((r) => setTimeout(r, 1500));
      try {
        const res  = await fetch(`/api/bff/nexus/run/${runId}`, { cache: 'no-store' });
        const data = await res.json().catch(() => ({}));
        if (data?.run) {
          setRun(data.run as Run);
          if (data.run.status !== 'AWAITING_PAYMENT' || data.run.cursor !== stepIdx) return;
        }
      } catch { /* keep polling */ }
    }
  };

  // Pay a run's U2A step with REAL Pi. ADR-007: guard before window.Pi — hub entry →
  // Mode 1 (Hub modal; the run does NOT auto-resume in Mode 1 yet). Standalone Pi
  // Browser → Mode 2, tagging the payment with { nexusRunId, nexusStepIdx } so the
  // consumer resumes the run once payment-service confirms completion.
  const pay = async () => {
    if (!run || busy) return;
    const stepIdx = run.cursor;
    const step    = run.steps.find((s) => s.idx === stepIdx);
    const amount  = 1; // nominal workflow payment (real Pi, via payment-service)
    const memo    = `Nexus workflow: ${step?.action ?? 'payment'}`.slice(0, 90);
    const itemId  = `nexus-run-${run.id}`;
    const link    = { nexusRunId: run.id, nexusStepIdx: stepIdx };

    setBusy(true); setErr(null);
    try {
      if (isHubNavigation() || typeof (window as unknown as { Pi?: unknown }).Pi === 'undefined') {
        // Mode 1: carry the run link so the Hub tags the payment → the run resumes on
        // return (the Hub reads nexus_run / nexus_step into the payment metadata).
        redirectToHubPayment({ amount, itemId, memo, extra: { nexus_run: run.id, nexus_step: String(stepIdx) } });
        return;
      }
      const internalId = await createPaymentRecord(amount, itemId, memo, link);
      if (!internalId) { setErr('Could not start the payment — sign in and try again.'); return; }
      const result = await createU2APayment(amount, memo, link, internalId);
      if (result.success) {
        await pollUntilResumed(run.id, stepIdx);
      } else if (result.status !== 'cancelled') {
        setErr(result.message || 'Payment failed.');
      }
    } catch {
      setErr('Payment error — try again.');
    } finally {
      setBusy(false);
    }
  };

  const btn = (bg: string): React.CSSProperties => ({
    border: 'none', borderRadius: 10, padding: '9px 14px', fontSize: 13, fontWeight: 800,
    color: '#0a0800', background: bg, cursor: busy ? 'wait' : 'pointer', opacity: busy ? 0.6 : 1,
  });
  const ghost: React.CSSProperties = {
    border: `1px solid ${TEC_COLORS.gold}55`, borderRadius: 10, padding: '9px 14px', fontSize: 13,
    fontWeight: 700, color: TEC_COLORS.gold, background: 'transparent', cursor: busy ? 'wait' : 'pointer',
  };

  const canAdvance = run !== null && (run.status === 'PENDING' || run.status === 'RUNNING');
  const canFail    = run !== null && !isTerminal(run.status);
  const awaitingPay = run !== null && run.status === 'AWAITING_PAYMENT';

  return (
    <section style={{
      marginTop: 22, padding: 14, borderRadius: 12,
      background: TEC_COLORS.surface, border: `1px solid ${TEC_COLORS.gold}22`,
    }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
        <h2 style={{ fontSize: 15, fontWeight: 800, color: TEC_COLORS.text, margin: 0 }}>Run this workflow</h2>
        {run && (
          <span style={{ fontSize: 11, fontWeight: 800, color: TEC_COLORS.gold }}>
            {RUN_LABEL[run.status]}
          </span>
        )}
      </div>
      <p style={{ fontSize: 11, color: TEC_COLORS.subtext, margin: '5px 0 12px', lineHeight: 1.5 }}>
        Drives the real engine. Payment steps halt at “awaiting your payment” — Nexus never moves Pi
        itself (C-109 §6). “Fail” triggers the saga rollback so no partial state is left.
      </p>

      {!run ? (
        restoring
          ? <span style={{ fontSize: 12, color: TEC_COLORS.subtext }}>Checking for an active run…</span>
          : <button onClick={start} disabled={busy} style={btn(TEC_COLORS.gold)}>▶ Start run</button>
      ) : (
        <>
          <div style={{ display: 'grid', gap: 6, marginBottom: 12 }}>
            {run.steps.map((s) => {
              const active = s.idx === run.cursor && !isTerminal(run.status);
              const st = STEP_STYLE[s.status];
              return (
                <div key={s.idx} style={{
                  display: 'flex', justifyContent: 'space-between', gap: 8,
                  fontSize: 12, padding: '7px 10px', borderRadius: 8,
                  background: active ? `${TEC_COLORS.gold}12` : TEC_COLORS.bg,
                  border: `1px solid ${active ? TEC_COLORS.gold + '55' : '#ffffff10'}`,
                }}>
                  <span style={{ color: TEC_COLORS.text }}>
                    {s.idx + 1}. {s.action}{s.is_payment ? '  💳' : ''}
                  </span>
                  <span style={{ color: st.color, whiteSpace: 'nowrap', fontWeight: 700 }}>{st.label}</span>
                </div>
              );
            })}
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {canAdvance  && <button onClick={advance} disabled={busy} style={btn(TEC_COLORS.gold)}>Advance ▸</button>}
            {awaitingPay && <button onClick={pay}     disabled={busy} style={btn(TEC_COLORS.gold)}>💳 Pay with Pi (1π)</button>}
            {canFail     && <button onClick={fail}    disabled={busy} style={ghost}>Simulate failure ↩</button>}
            {isTerminal(run.status) && <button onClick={() => { setRun(null); setErr(null); }} style={ghost}>Reset</button>}
          </div>
          {awaitingPay && (
            <p style={{ fontSize: 11, color: TEC_COLORS.subtext, margin: '8px 0 0', lineHeight: 1.5 }}>
              Real Pi via payment-service. On completion the run resumes automatically
              (Nexus never holds Pi — C-109 §6).
            </p>
          )}
        </>
      )}

      {err && <p style={{ fontSize: 12, color: '#EF4444', marginTop: 10 }}>{err}</p>}
    </section>
  );
}
