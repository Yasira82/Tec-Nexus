import { NextRequest, NextResponse } from 'next/server';
import { ownerFromSession, startRun } from '@/lib/nexus/server';
import { isE2eMode, e2eStub } from '@/lib/server/e2e-mode';

// POST /api/bff/nexus/runs — start a Workflow Run for a governed template. Identity is
// the session owner (P6, never the body); the body carries only { templateId }. The
// engine (identity-service) re-enforces owner-scope + terminal-state (C-109).
export async function POST(req: NextRequest) {
  if (isE2eMode()) return e2eStub(200, { run: null });
  const body = (await req.json().catch(() => ({}))) as { templateId?: unknown };
  const templateId = typeof body.templateId === 'string' ? body.templateId.trim() : '';
  if (!templateId) return NextResponse.json({ ok: false, error: 'templateId required' }, { status: 400 });

  const owner = ownerFromSession(req);
  if (!owner) return NextResponse.json({ ok: false, error: 'sign in required' }, { status: 401 });

  const r = await startRun(owner, templateId);
  return NextResponse.json({ ok: r.ok, run: r.run, error: r.error }, { status: r.ok ? 200 : r.status });
}
