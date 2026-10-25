// Server-only access to Nexus Handshake (identity/nexus/handshakes in tec-nexus-service), through the
// gateway with the inter-service key. Who acts — `owner` (Pi username) and `userId` — is resolved
// from the session cookie by the BFF route, never from the body (P6). The deal's own fields (title,
// amount, the wallets) DO come from the person: they say what the deal is, not who is making it.
// NEW-A: the gateway URL is server-only.
const GW = process.env.API_GATEWAY_URL ?? '';

const gwHeaders = () => ({
  'Content-Type': 'application/json',
  'x-request-id': crypto.randomUUID(),
  ...(process.env.INTERNAL_SECRET && { 'x-internal-key': process.env.INTERNAL_SECRET }),
});

export type HandshakeStatus = 'OPEN' | 'AGREED' | 'PAID' | 'COMPLETED' | 'DISPUTED' | 'CANCELLED';

export interface PersonRecord { username: string; completed: number; openDisputes: number; since: string | null }

export interface Handshake {
  code: string; status: HandshakeStatus; title: string; terms: string | null; due: string | null; amount: string;
  seller: string; sellerWallet: string; buyer: string | null; buyerWallet: string | null;
  paidTxHash: string | null; proofHash: string | null; disputeNote: string | null;
  createdAt: string; agreedAt: string | null; paidAt: string | null; completedAt: string | null; disputedAt: string | null;
  viewer: 'seller' | 'buyer' | null;
  records?: { seller: PersonRecord; buyer: PersonRecord | null };
}

export interface HsResult<T> { ok: boolean; status: number; data: T | null; error?: string }

async function call<T>(path: string, init: RequestInit, pick: (data: Record<string, unknown>) => T): Promise<HsResult<T>> {
  if (!GW) return { ok: false, status: 503, data: null, error: 'unavailable' };
  try {
    const res = await fetch(`${GW}/api/identity/nexus/handshakes${path}`, { ...init, headers: gwHeaders(), cache: 'no-store' });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      const m = body?.message;
      return { ok: false, status: res.status, data: null, error: typeof m === 'string' ? m : Array.isArray(m) ? String(m[0]) : 'error' };
    }
    return { ok: true, status: 200, data: pick((body?.data ?? {}) as Record<string, unknown>) };
  } catch {
    return { ok: false, status: 503, data: null, error: 'unavailable' };
  }
}

const one = (d: Record<string, unknown>) => (d.handshake ?? null) as Handshake | null;
const post = (body: Record<string, unknown>): RequestInit => ({ method: 'POST', body: JSON.stringify(body) });
const enc = encodeURIComponent;

/** The deal fields a person may set. Anything else in the body is dropped here, before it travels. */
export function dealFields(b: Record<string, unknown>) {
  return { title: b.title, terms: b.terms, due: b.due, amount: b.amount, wallet: b.wallet };
}

export const createHandshake = (owner: string, userId: string | null, b: Record<string, unknown>) =>
  call('', post({ ...dealFields(b), owner, ...(userId ? { userId } : {}) }), one);

export const myHandshakes = (owner: string) =>
  call(`/mine/${enc(owner)}`, { method: 'GET' }, (d) => (Array.isArray(d.handshakes) ? d.handshakes : []) as Handshake[]);

export const viewHandshake = (code: string, viewer: string | null) =>
  call(`/${enc(code)}${viewer ? `?viewer=${enc(viewer)}` : ''}`, { method: 'GET' }, one);

export const ACTIONS = ['agree', 'check-payment', 'received', 'dispute', 'cancel'] as const;
export type HandshakeAction = (typeof ACTIONS)[number];

export interface ActionOut { handshake: Handshake | null; found?: boolean; reused?: boolean }

export function actOnHandshake(owner: string, userId: string | null, code: string, action: HandshakeAction, b: Record<string, unknown>) {
  const body: Record<string, unknown> = { owner };
  if (action === 'agree') { body.wallet = b.wallet; if (userId) body.userId = userId; }
  if (action === 'dispute') body.note = b.note;
  return call<ActionOut>(`/${enc(code)}/${action}`, post(body), (d) => ({
    handshake: (d.handshake ?? null) as Handshake | null,
    ...(typeof d.found === 'boolean' ? { found: d.found } : {}),
    ...(d.reused === true ? { reused: true } : {}),
  }));
}
