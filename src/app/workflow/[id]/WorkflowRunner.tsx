'use client';

// TEC Nexus — live Workflow Run driver (C-109 §5). Starts a REAL run against the
// engine (identity-service) and drives it: Advance executes the next step; a U2A
// payment step HALTS at "awaiting your payment" (the engine never moves Pi itself,
// Invariant #8); Fail triggers the real saga rollback (compensations in reverse).
// The status shown is the backend's real run state — not a mock.

import { useState } from 'react';
import { TEC_COLORS } from '@yasser172/tec-ui';

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
        <button onClick={start} disabled={busy} style={btn(TEC_COLORS.gold)}>▶ Start run</button>
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
            {canAdvance && <button onClick={advance} disabled={busy} style={btn(TEC_COLORS.gold)}>Advance ▸</button>}
            {canFail    && <button onClick={fail}    disabled={busy} style={ghost}>Simulate failure ↩</button>}
            {isTerminal(run.status) && <button onClick={() => { setRun(null); setErr(null); }} style={ghost}>Reset</button>}
          </div>
        </>
      )}

      {err && <p style={{ fontSize: 12, color: '#EF4444', marginTop: 10 }}>{err}</p>}
    </section>
  );
}
