import { NextRequest, NextResponse } from 'next/server';
import { ownerFromSession, userIdFromSession } from '@/lib/nexus/server';
import { ACTIONS, actOnHandshake, type HandshakeAction } from '@/lib/nexus/handshake';
import { isE2eMode, e2eStub } from '@/lib/server/e2e-mode';

// POST /api/bff/nexus/handshakes/[code]/[action] — agree · check-payment · received · dispute · cancel.
// The actor is the session (P6); the service decides whether that person may take that step.
// check-payment only ASKS the Pi chain — nobody's word can mark a handshake paid.
export async function POST(req: NextRequest, ctx: { params: Promise<{ code: string; action: string }> }) {
  if (isE2eMode()) return e2eStub(200, { handshake: null });
  const { code, action } = await ctx.params;
  if (!(ACTIONS as readonly string[]).includes(action)) return NextResponse.json({ ok: false, error: 'unknown action' }, { status: 404 });
  const owner = ownerFromSession(req);
  if (!owner) return NextResponse.json({ ok: false, error: 'sign in required' }, { status: 401 });
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const r = await actOnHandshake(owner, userIdFromSession(req), code, action as HandshakeAction, body ?? {});
  return NextResponse.json({ ok: r.ok, ...(r.data ?? { handshake: null }), error: r.error }, { status: r.ok ? 200 : r.status });
}
