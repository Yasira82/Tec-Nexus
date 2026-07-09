import { NextResponse } from 'next/server';
import { TEMPLATES } from '@/lib/nexus/templates';

// GET /api/bff/nexus/templates — public read of the coordination-template
// catalog (C-109 §5). The templates are Nexus-owned governed definitions, not
// entity truth, so no auth/gateway: it's a static, read-only contract surface.
export async function GET() {
  return NextResponse.json(
    { templates: TEMPLATES, count: TEMPLATES.length },
    { headers: { 'Cache-Control': 'public, max-age=300' } },
  );
}
