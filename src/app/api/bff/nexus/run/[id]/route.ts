import { NextRequest, NextResponse } from 'next/server';
import { ownerFromSession, getRun } from '@/lib/nexus/server';
import { isE2eMode, e2eStub } from '@/lib/server/e2e-mode';

// GET /api/bff/nexus/run/[id] — one of the caller's OWN runs (P6).
export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  if (isE2eMode()) return e2eStub(200, { run: null });
  const { id } = await ctx.params;
  const owner = ownerFromSession(req);
  if (!owner) return NextResponse.json({ ok: false, error: 'sign in required' }, { status: 401 });
  const r = await getRun(owner, id);
  return NextResponse.json({ ok: r.ok, run: r.run, error: r.error }, { status: r.ok ? 200 : r.status });
}
