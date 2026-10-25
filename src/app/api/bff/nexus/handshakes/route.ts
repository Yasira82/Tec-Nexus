import { NextRequest, NextResponse } from 'next/server';
import { ownerFromSession, userIdFromSession } from '@/lib/nexus/server';
import { createHandshake, myHandshakes } from '@/lib/nexus/handshake';
import { isE2eMode, e2eStub } from '@/lib/server/e2e-mode';

// GET /api/bff/nexus/handshakes — the caller's OWN handshakes, both sides (P6).
export async function GET(req: NextRequest) {
  if (isE2eMode()) return e2eStub(200, { handshakes: [] });
  const owner = ownerFromSession(req);
  if (!owner) return NextResponse.json({ ok: false, handshakes: [], error: 'sign in required' }, { status: 401 });
  const r = await myHandshakes(owner);
  return NextResponse.json({ ok: r.ok, handshakes: r.data ?? [], error: r.error }, { status: r.ok ? 200 : r.status });
}

// POST /api/bff/nexus/handshakes — open a handshake as the seller. The seller is the session, never
// the body; the body carries only the deal (title, terms, due, amount, the wallet to be paid into).
export async function POST(req: NextRequest) {
  if (isE2eMode()) return e2eStub(200, { handshake: null });
  const owner = ownerFromSession(req);
  if (!owner) return NextResponse.json({ ok: false, error: 'sign in required' }, { status: 401 });
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const r = await createHandshake(owner, userIdFromSession(req), body ?? {});
  return NextResponse.json({ ok: r.ok, handshake: r.data, error: r.error }, { status: r.ok ? 200 : r.status });
}
