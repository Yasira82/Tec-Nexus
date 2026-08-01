import type { NextRequest } from 'next/server';

// Server-only access to the Nexus Workflow Run Engine (identity-service) via the
// gateway with the inter-service key. Runs are owner-scoped: `owner` is derived from
// the `tec_user` session cookie server-side — NEVER the request body (P6). NEW-A: the
// gateway URL is server-only (API_GATEWAY_URL) — never shipped to the client.
const GW = process.env.API_GATEWAY_URL ?? '';

const gwHeaders = () => ({
  'Content-Type': 'application/json',
  'x-request-id': crypto.randomUUID(),
  ...(process.env.INTERNAL_SECRET && { 'x-internal-key': process.env.INTERNAL_SECRET }),
});

export type RunStatus =
  | 'PENDING' | 'RUNNING' | 'AWAITING_PAYMENT' | 'COMPLETED' | 'COMPENSATING' | 'COMPENSATED' | 'FAILED';
export type StepStatus =
  | 'PENDING' | 'DONE' | 'BLOCKED_ON_PAYMENT' | 'FAILED' | 'COMPENSATED';

export interface RunStep {
  idx: number; service: string; action: string; is_payment: boolean;
  compensation: string | null; status: StepStatus; error: string | null;
}
export interface WorkflowRun {
  id: string; template_id: string; status: RunStatus; cursor: number;
  error: string | null; steps: RunStep[];
}

export interface RunResult { ok: boolean; run: WorkflowRun | null; status: number; error?: string }

/** Owner from the `tec_user` session cookie (P6 — never from the body). */
export function ownerFromSession(req: NextRequest): string | null {
  try {
    const raw = req.cookies.get('tec_user')?.value ?? '';
    if (!raw) return null;
    let u: Record<string, unknown>;
    try { u = JSON.parse(raw); } catch { u = JSON.parse(decodeURIComponent(raw)); }
    const owner = (u.piUsername ?? u.username) as string | undefined;
    return owner && owner.trim() ? owner : null;
  } catch { return null; }
}

async function call(path: string, init: RequestInit): Promise<RunResult> {
  if (!GW) return { ok: false, run: null, status: 503, error: 'unavailable' };
  try {
    const res  = await fetch(`${GW}${path}`, { ...init, headers: gwHeaders(), cache: 'no-store' });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, run: null, status: res.status, error: body?.message ?? 'error' };
    return { ok: true, run: (body?.data?.run ?? null) as WorkflowRun | null, status: 200 };
  } catch {
    return { ok: false, run: null, status: 503, error: 'unavailable' };
  }
}

export const startRun = (owner: string, templateId: string) =>
  call('/api/identity/nexus/runs', { method: 'POST', body: JSON.stringify({ owner, templateId }) });

export const getRun = (owner: string, runId: string) =>
  call(`/api/identity/nexus/run/${encodeURIComponent(owner)}/${encodeURIComponent(runId)}`, { method: 'GET' });

export const advanceRun = (owner: string, runId: string) =>
  call(`/api/identity/nexus/run/${encodeURIComponent(runId)}/advance`, { method: 'POST', body: JSON.stringify({ owner }) });

export const failRun = (owner: string, runId: string, reason?: string) =>
  call(`/api/identity/nexus/run/${encodeURIComponent(runId)}/fail`, { method: 'POST', body: JSON.stringify({ owner, reason }) });
