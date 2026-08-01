import { NextRequest, NextResponse } from 'next/server';
import { ownerFromSession, advanceRun } from '@/lib/nexus/server';
import { isE2eMode, e2eStub } from '@/lib/server/e2e-mode';

// POST /api/bff/nexus/run/[id]/advance — execute the next step (engine, C-109).
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  if (isE2eMode()) return e2eStub(200, { run: null });
  const { id } = await ctx.params;
  const owner = ownerFromSession(req);
  if (!owner) return NextResponse.json({ ok: false, error: 'sign in required' }, { status: 401 });
  const r = await advanceRun(owner, id);
  return NextResponse.json({ ok: r.ok, run: r.run, error: r.error }, { status: r.ok ? 200 : r.status });
}
