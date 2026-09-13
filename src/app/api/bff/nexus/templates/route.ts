import { NextResponse } from 'next/server';
import { fetchTemplates } from '@/lib/nexus/server';
import { TEMPLATE_COPY } from '@/lib/nexus/templates';

// GET /api/bff/nexus/templates — the governed catalog, FROM THE ENGINE (C-109 §5),
// joined with this app's human copy.
//
// It used to serve a local `TEMPLATES` constant: a third copy of definitions the
// engine owns, which had drifted into promising a step the engine removed and a
// rollback the constitution forbids. The engine is the authority; this route is a
// door to it, plus the blurb that is genuinely ours.
//
// Public read, no auth: these are DEFINITIONS, not anyone's data (a run is
// owner-scoped; a template is not).
//
// FAILS CLOSED, and visibly. If the engine is unreachable the response says
// `available: false` and carries NO templates — never a bundled fallback. A stale
// catalog is worse than an empty one: the reader cannot tell which they are seeing.
export async function GET() {
  const engine = await fetchTemplates();

  if (!engine) {
    return NextResponse.json(
      { ok: false, available: false, templates: [], count: 0, error: 'catalog unavailable' },
      { status: 503, headers: { 'Cache-Control': 'no-store' } },
    );
  }

  const templates = engine.map((t) => ({
    ...t,
    // A template the engine knows and we have not written copy for still lists —
    // a missing sentence is a gap in the writing, not a reason to hide a workflow.
    purpose: TEMPLATE_COPY[t.id]?.purpose ?? null,
    trigger: TEMPLATE_COPY[t.id]?.trigger ?? null,
  }));

  return NextResponse.json(
    { ok: true, available: true, templates, count: templates.length },
    // Short and private: `runnable` flips the moment an owning service grows the
    // endpoint a step waits on, and a cached "cannot run" outlives the fix.
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
