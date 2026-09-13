import { NextRequest, NextResponse } from 'next/server';
import { recommendWorkflows } from '@/lib/nexus/recommend';
import { fetchTemplates } from '@/lib/nexus/server';

// POST /api/bff/nexus/recommend — match a plain-language goal to the governed
// coordination-template catalog (C-109 §5). Body: { goal: string }.
//
// The catalog is FETCHED from the engine and handed to the ranker, which used to
// import a bundled copy. A recommender scoring stale definitions is worse than one
// that returns nothing: it points a person confidently at a workflow whose steps no
// longer exist.
//
// Still public (it ranks DEFINITIONS — no user data, no entity truth) and still
// deterministic. Engine unreachable → no matches, and the caller is told the catalog
// was not available rather than shown an empty result that looks like "no match".
export async function POST(req: NextRequest) {
  let goal = '';
  try {
    const body = await req.json();
    if (typeof body?.goal === 'string') goal = body.goal.slice(0, 500);
  } catch { /* empty/invalid body → empty goal → no matches */ }

  const catalog = await fetchTemplates();
  if (!catalog) {
    return NextResponse.json(
      { goal, matches: [], count: 0, available: false },
      { status: 503 },
    );
  }

  const matches = recommendWorkflows(goal, catalog);
  return NextResponse.json({ goal, matches, count: matches.length, available: true });
}
