import { NextRequest, NextResponse } from 'next/server';
import { ownerFromSession, startRun, listRuns } from '@/lib/nexus/server';
import { isE2eMode, e2eStub } from '@/lib/server/e2e-mode';

// GET /api/bff/nexus/runs?template=<id> — the caller's OWN runs (P6), optionally
// filtered to a template. Used to RESTORE an active run when the page is re-opened
// (e.g. after a payment round-trip) so a run is never lost / restarted from scratch.
export async function GET(req: NextRequest) {
  if (isE2eMode()) return e2eStub(200, { runs: [] });
  const owner = ownerFromSession(req);
  if (!owner) return NextResponse.json({ ok: false, runs: [], error: 'sign in required' }, { status: 401 });
  const template = req.nextUrl.searchParams.get('template');
  const all = await listRuns(owner);
  const runs = template ? all.filter((r) => r.template_id === template) : all;
  return NextResponse.json({ ok: true, runs });
}

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
