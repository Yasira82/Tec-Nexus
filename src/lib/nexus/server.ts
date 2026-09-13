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

/** The `tec_user` session cookie, parsed. Server-side only. */
function sessionUser(req: NextRequest): Record<string, unknown> | null {
  try {
    const raw = req.cookies.get('tec_user')?.value ?? '';
    if (!raw) return null;
    try { return JSON.parse(raw); } catch { return JSON.parse(decodeURIComponent(raw)); }
  } catch { return null; }
}

/** Owner from the `tec_user` session cookie (P6 — never from the body). */
export function ownerFromSession(req: NextRequest): string | null {
  const u = sessionUser(req);
  const owner = (u?.piUsername ?? u?.username) as string | undefined;
  return owner && owner.trim() ? owner : null;
}

/**
 * The AUTH user id from the same session cookie — NOT from the body (P6).
 *
 * The engine records it on the run at start, because steps that call a service
 * keyed on the auth user (commerce Subscription, for one) cannot be run from a Pi
 * username alone. Reading it here, from the same cookie as `owner`, is what keeps
 * the two halves of one identity from ever disagreeing: a run's `user_id` is the
 * id of the session that authorised it, resolved once, at the moment of consent.
 *
 * Absent → the run still starts; its user-keyed steps fail closed with a reason.
 */
export function userIdFromSession(req: NextRequest): string | null {
  const u = sessionUser(req);
  const id = (u?.id ?? u?.userId) as string | undefined;
  return id && id.trim() ? id : null;
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

/** The caller's OWN runs (newest first) — used to RESTORE an active run on return. */
export async function listRuns(owner: string): Promise<WorkflowRun[]> {
  if (!GW) return [];
  try {
    const res = await fetch(`${GW}/api/identity/nexus/runs/${encodeURIComponent(owner)}`, {
      headers: gwHeaders(), cache: 'no-store',
    });
    if (!res.ok) return [];
    const body = await res.json().catch(() => ({}));
    const runs = body?.data?.runs;
    return Array.isArray(runs) ? (runs as WorkflowRun[]) : [];
  } catch {
    return [];
  }
}

/**
 * Start a run.
 *
 * `owner` and `userId` are the SAME session resolved server-side (P6). `input` is
 * the workflow's parameters — which products, which listing — and it IS supplied by
 * the caller, because it says what to buy, not who is buying. The owning service
 * validates it: commerce checks the products exist, are ACTIVE and in stock; asset
 * checks the listing is live. Identity is never taken from it.
 */
export const startRun = (
  owner: string,
  templateId: string,
  userId?: string | null,
  input?: Record<string, unknown> | null,
) =>
  call('/api/identity/nexus/runs', {
    method: 'POST',
    body: JSON.stringify({ owner, templateId, ...(userId ? { userId } : {}), ...(input ? { input } : {}) }),
  });

/**
 * The governed template catalog, FROM THE ENGINE (C-109 §5).
 *
 * Not a local copy. The engine owns the steps, which one moves Pi, what compensates
 * what, and — since the dispatcher landed — whether each step can actually run. This
 * app owns only the human blurb (`TEMPLATE_COPY`).
 *
 * Returns null when the engine cannot be reached, and the caller SAYS SO. It must
 * never fall back to a bundled catalog: a stale list of workflows is worse than no
 * list, because the reader cannot tell which one they are looking at — the same rule
 * Explorer applies to its directory.
 */
export async function fetchTemplates(): Promise<EngineTemplateDto[] | null> {
  if (!GW) return null;
  try {
    const res = await fetch(`${GW}/api/identity/nexus/templates`, {
      headers: gwHeaders(), cache: 'no-store',
    });
    if (!res.ok) return null;
    const body = await res.json().catch(() => ({}));
    const templates = body?.data?.templates;
    return Array.isArray(templates) ? (templates as EngineTemplateDto[]) : null;
  } catch {
    return null;
  }
}

/** The engine's template shape, as served by GET /identity/nexus/templates. */
export interface EngineTemplateDto {
  id: string; name: string; kind: string; runnable: boolean;
  steps: { idx: number; service: string; action: string; isPayment: boolean; executable: boolean; needs: string | null }[];
}

export const getRun = (owner: string, runId: string) =>
  call(`/api/identity/nexus/run/${encodeURIComponent(owner)}/${encodeURIComponent(runId)}`, { method: 'GET' });

export const advanceRun = (owner: string, runId: string) =>
  call(`/api/identity/nexus/run/${encodeURIComponent(runId)}/advance`, { method: 'POST', body: JSON.stringify({ owner }) });

export const failRun = (owner: string, runId: string, reason?: string) =>
  call(`/api/identity/nexus/run/${encodeURIComponent(runId)}/fail`, { method: 'POST', body: JSON.stringify({ owner, reason }) });
