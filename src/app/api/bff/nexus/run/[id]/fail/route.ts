import { NextRequest, NextResponse } from 'next/server';
import { ownerFromSession, failRun } from '@/lib/nexus/server';
import { isE2eMode, e2eStub } from '@/lib/server/e2e-mode';

// POST /api/bff/nexus/run/[id]/fail — fail here → saga rollback in reverse (C-109 §5).
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  if (isE2eMode()) return e2eStub(200, { run: null });
  const { id } = await ctx.params;
  const body = (await req.json().catch(() => ({}))) as { reason?: unknown };
  const reason = typeof body.reason === 'string' ? body.reason.slice(0, 200) : undefined;
  const owner = ownerFromSession(req);
  if (!owner) return NextResponse.json({ ok: false, error: 'sign in required' }, { status: 401 });
  const r = await failRun(owner, id, reason);
  return NextResponse.json({ ok: r.ok, run: r.run, error: r.error }, { status: r.ok ? 200 : r.status });
}
