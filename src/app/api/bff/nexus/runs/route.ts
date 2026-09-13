import { NextRequest, NextResponse } from 'next/server';
import { ownerFromSession, userIdFromSession, startRun, listRuns } from '@/lib/nexus/server';
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

// POST /api/bff/nexus/runs — start a Workflow Run for a governed template.
//
// TWO KINDS OF INPUT, and the difference is the whole security story:
//   · IDENTITY (`owner`, `userId`) is resolved SERVER-SIDE from the session cookie
//     and never read from the body (P6). Both halves come from the same cookie, so
//     a run's username and auth id can never belong to two different people.
//   · PARAMETERS (`input`: which products, which listing) DO come from the caller —
//     they say what to buy, not who is buying. The owning service validates them:
//     commerce checks the products exist, are ACTIVE and in stock; asset checks the
//     listing is live. Nexus never interprets them (C-109 §4).
//
// Without `userId` the engine's user-keyed steps fail closed with a reason; without
// `input` the sagas that need parameters cannot start. Both were missing, which is
// why no run from this app could do anything.
export async function POST(req: NextRequest) {
  if (isE2eMode()) return e2eStub(200, { run: null });
  const body = (await req.json().catch(() => ({}))) as { templateId?: unknown; input?: unknown };
  const templateId = typeof body.templateId === 'string' ? body.templateId.trim() : '';
  if (!templateId) return NextResponse.json({ ok: false, error: 'templateId required' }, { status: 400 });

  const owner = ownerFromSession(req);
  if (!owner) return NextResponse.json({ ok: false, error: 'sign in required' }, { status: 401 });

  const input =
    body.input && typeof body.input === 'object' && !Array.isArray(body.input)
      ? (body.input as Record<string, unknown>)
      : null;

  const r = await startRun(owner, templateId, userIdFromSession(req), input);
  return NextResponse.json({ ok: r.ok, run: r.run, error: r.error }, { status: r.ok ? 200 : r.status });
}
