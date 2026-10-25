import { NextRequest, NextResponse } from 'next/server';
import { ownerFromSession } from '@/lib/nexus/server';
import { viewHandshake } from '@/lib/nexus/handshake';
import { isE2eMode, e2eStub } from '@/lib/server/e2e-mode';

// GET /api/bff/nexus/handshakes/[code] — public: the link IS the invitation. A signed-in viewer is
// named from the session (never a param) so the page knows whether they are the seller or the buyer.
export async function GET(req: NextRequest, ctx: { params: Promise<{ code: string }> }) {
  if (isE2eMode()) return e2eStub(200, { handshake: null });
  const { code } = await ctx.params;
  const r = await viewHandshake(code, ownerFromSession(req));
  return NextResponse.json({ ok: r.ok, handshake: r.data, error: r.error }, { status: r.ok ? 200 : r.status });
}
