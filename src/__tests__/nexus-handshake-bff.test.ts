import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';

// Nexus Handshake BFF — who acts is the SESSION, never the body (P6). The deal's own fields travel;
// an `owner`/`userId` smuggled into the body never does. Only the five known steps are forwarded.

const GW = 'https://gw.test';
let calls: { url: string; body: Record<string, unknown> | null }[] = [];

beforeEach(() => {
  vi.resetModules();
  process.env.API_GATEWAY_URL = GW;
  process.env.INTERNAL_SECRET = 'x'.repeat(32);
  process.env.E2E_MODE = 'false';
  process.env.CI = 'false';
  calls = [];
  vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => {
    calls.push({ url, body: init?.body ? JSON.parse(String(init.body)) : null });
    return new Response(JSON.stringify({ success: true, data: { handshake: { code: 'ABCDEFGH', status: 'OPEN' }, handshakes: [], found: false } }), { status: 200 });
  }));
});
afterEach(() => { vi.unstubAllGlobals(); });

const user = encodeURIComponent(JSON.stringify({ piUsername: 'sara_pi', id: 'u-1' }));
const req = (url: string, body?: unknown, signedIn = true) => {
  const r = new NextRequest(`https://nexus.tecosystem.app${url}`, {
    method: body === undefined ? 'GET' : 'POST',
    headers: { 'content-type': 'application/json' },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  if (signedIn) r.cookies.set('tec_user', user);
  return r;
};

describe('POST /api/bff/nexus/handshakes', () => {
  it('the seller is the session; a body owner/userId never reaches the service', async () => {
    const { POST } = await import('@/app/api/bff/nexus/handshakes/route');
    const res = await POST(req('/api/bff/nexus/handshakes', { title: 'Phone', amount: '25', wallet: 'G'.padEnd(56, 'A'), owner: 'mallory', userId: 'u-evil', seller: 'mallory' }));
    expect(res.status).toBe(200);
    expect(calls[0]!.url).toBe(`${GW}/api/identity/nexus/handshakes`);
    expect(calls[0]!.body).toMatchObject({ owner: 'sara_pi', userId: 'u-1', title: 'Phone', amount: '25' });
    expect(calls[0]!.body).not.toHaveProperty('seller');
  });
  it('no session → 401, and nothing is sent', async () => {
    const { POST } = await import('@/app/api/bff/nexus/handshakes/route');
    expect((await POST(req('/api/bff/nexus/handshakes', { title: 'x' }, false))).status).toBe(401);
    expect(calls).toHaveLength(0);
  });
});

describe('GET /api/bff/nexus/handshakes/[code]', () => {
  it('is public; a signed-in viewer is named from the session', async () => {
    const { GET } = await import('@/app/api/bff/nexus/handshakes/[code]/route');
    await GET(req('/api/bff/nexus/handshakes/ABCDEFGH', undefined, false), { params: Promise.resolve({ code: 'ABCDEFGH' }) });
    expect(calls[0]!.url).toBe(`${GW}/api/identity/nexus/handshakes/ABCDEFGH`);
    await GET(req('/api/bff/nexus/handshakes/ABCDEFGH?viewer=mallory'), { params: Promise.resolve({ code: 'ABCDEFGH' }) });
    expect(calls[1]!.url).toBe(`${GW}/api/identity/nexus/handshakes/ABCDEFGH?viewer=sara_pi`);
  });
});

describe('POST /api/bff/nexus/handshakes/[code]/[action]', () => {
  const ctx = (action: string) => ({ params: Promise.resolve({ code: 'ABCDEFGH', action }) });
  it('agree sends the session as the buyer, with only the wallet from the body', async () => {
    const { POST } = await import('@/app/api/bff/nexus/handshakes/[code]/[action]/route');
    await POST(req('/x', { wallet: 'GBUYER', owner: 'mallory', status: 'PAID' }), ctx('agree'));
    expect(calls[0]!.url).toBe(`${GW}/api/identity/nexus/handshakes/ABCDEFGH/agree`);
    expect(calls[0]!.body).toEqual({ owner: 'sara_pi', wallet: 'GBUYER', userId: 'u-1' });
  });
  it('check-payment carries nothing but who is asking — nobody can claim it is paid', async () => {
    const { POST } = await import('@/app/api/bff/nexus/handshakes/[code]/[action]/route');
    const res = await POST(req('/x', { paidTxHash: 'tx-fake', found: true }), ctx('check-payment'));
    expect(calls[0]!.body).toEqual({ owner: 'sara_pi' });
    expect((await res.json()).found).toBe(false);
  });
  it('an unknown step is 404 and never forwarded', async () => {
    const { POST } = await import('@/app/api/bff/nexus/handshakes/[code]/[action]/route');
    expect((await POST(req('/x', {}), ctx('mark-paid'))).status).toBe(404);
    expect(calls).toHaveLength(0);
  });
  it('no session → 401', async () => {
    const { POST } = await import('@/app/api/bff/nexus/handshakes/[code]/[action]/route');
    expect((await POST(req('/x', {}, false), ctx('received'))).status).toBe(401);
  });
});
