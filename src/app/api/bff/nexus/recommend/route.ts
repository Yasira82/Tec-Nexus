import { NextRequest, NextResponse } from 'next/server';
import { recommendWorkflows } from '@/lib/nexus/recommend';

// POST /api/bff/nexus/recommend — match a plain-language goal to the governed
// coordination-template catalog (C-109 §5). Public read: it ranks the static template
// DEFINITIONS only — no user data, no entity truth, no gateway. Body: { goal: string }.
export async function POST(req: NextRequest) {
  let goal = '';
  try {
    const body = await req.json();
    if (typeof body?.goal === 'string') goal = body.goal.slice(0, 500);
  } catch { /* empty/invalid body → empty goal → no matches */ }

  const matches = recommendWorkflows(goal);
  return NextResponse.json({ goal, matches, count: matches.length });
}
