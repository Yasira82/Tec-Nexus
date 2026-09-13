// TEC Nexus — Coordination Template detail (C-109 §5). Shows a governed
// workflow's ordered steps (each routed to its owning service) and, for a saga,
// the compensating actions that run in reverse on failure. Public, read-only —
// this documents the coordination contract; execution is the V1 backend engine.
import Link from 'next/link';
import type { Metadata } from 'next';
import { TEC_COLORS } from '@yasser172/tec-ui';
import { copyFor, kindMeta } from '@/lib/nexus/templates';
import { fetchTemplates } from '@/lib/nexus/server';
import { WorkflowRunner } from './WorkflowRunner';

// The STEPS come from the engine at REQUEST time — this page used to render a local
// copy that had drifted into promising a step the engine removed and a rollback the
// constitution forbids (see lib/nexus/templates.ts).
//
// `generateStaticParams` was removed with it, and that is not a detail: keeping it
// made the build output say `● (SSG) prerendered as static HTML` even with
// force-dynamic — so the catalog fetch would have run ONCE, at build, on a machine
// where API_GATEWAY_URL is typically unset. The page would have shipped frozen, most
// likely frozen on "unavailable". A definition baked at build time is a definition
// that can go quietly wrong, which is the whole bug this change removes.
//
// The build output is the evidence that this is right: `ƒ (Dynamic)`.
export const dynamic = 'force-dynamic';

export async function generateMetadata(
  { params }: { params: Promise<{ id: string }> },
): Promise<Metadata> {
  const { id } = await params;
  const c = copyFor(id);
  return { title: `TEC Nexus — Workflow`, description: c?.purpose ?? 'TEC Nexus coordination template.' };
}

export default async function WorkflowPage(
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const catalog = await fetchTemplates();
  const t = catalog?.find((x) => x.id === id) ?? null;
  const c = copyFor(id);
  const meta = kindMeta(t?.kind ?? '');

  // The engine is unreachable — say so. Rendering a bundled copy of the steps here
  // would be presenting a definition nobody can confirm is still the real one.
  if (!catalog) {
    return (
      <main style={{ minHeight: '100vh', background: TEC_COLORS.bg, color: TEC_COLORS.text, padding: '32px 22px', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
        <div style={{ maxWidth: 680, margin: '0 auto' }}>
          <Link href="/app" style={{ fontSize: 13, color: TEC_COLORS.gold, textDecoration: 'none' }}>← Coordination Templates</Link>
          <h1 style={{ fontSize: 22, fontWeight: 900, color: TEC_COLORS.text, marginTop: 16 }}>Workflow definitions unavailable</h1>
          <p style={{ fontSize: 13, color: TEC_COLORS.subtext, lineHeight: 1.6 }}>
            The coordination engine could not be reached, so the steps for this workflow
            cannot be shown. They are not displayed from a stored copy — a definition you
            cannot confirm is worse than none.
          </p>
        </div>
      </main>
    );
  }

  const wrap: React.CSSProperties = {
    minHeight: '100vh', background: TEC_COLORS.bg, color: TEC_COLORS.text,
    padding: '32px 22px', fontFamily: 'system-ui, -apple-system, sans-serif',
  };
  const inner: React.CSSProperties = { maxWidth: 680, margin: '0 auto' };

  if (!t) {
    return (
      <main style={wrap}>
        <div style={inner}>
          <Link href="/app" style={{ fontSize: 13, color: TEC_COLORS.gold, textDecoration: 'none' }}>← Coordination Templates</Link>
          <h1 style={{ fontSize: 22, fontWeight: 900, color: TEC_COLORS.text, marginTop: 16 }}>Unknown template</h1>
          <p style={{ fontSize: 13, color: TEC_COLORS.subtext, lineHeight: 1.6 }}>
            No coordination template with id <code>{id}</code>.
          </p>
        </div>
      </main>
    );
  }

  const blocked = t.steps.filter((s) => !s.executable);

  return (
    <main style={wrap}>
      <div style={inner}>
        <Link href="/app" style={{ fontSize: 13, color: TEC_COLORS.gold, textDecoration: 'none' }}>← Coordination Templates</Link>

        <div style={{ marginTop: 16 }}>
          <div style={{ fontSize: 12, letterSpacing: 1, color: TEC_COLORS.subtext, textTransform: 'uppercase' }}>
            {meta.icon} {meta.label}
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 900, color: TEC_COLORS.text, margin: '4px 0 0' }}>{t.name}</h1>
        </div>
        {c?.purpose && <p style={{ fontSize: 14, color: TEC_COLORS.subtext, margin: '12px 0 0', lineHeight: 1.6 }}>{c.purpose}</p>}
        {c?.trigger && <p style={{ fontSize: 12, color: TEC_COLORS.subtext, margin: '8px 0 0' }}><strong style={{ color: TEC_COLORS.text }}>Trigger:</strong> {c.trigger}</p>}

        {/* A workflow that cannot run says so HERE, where it is offered — not at
            step 0 after someone starts it and the engine refuses. */}
        {!t.runnable && (
          <div style={{ marginTop: 14, background: TEC_COLORS.surface, border: `1px solid ${TEC_COLORS.gold}55`, borderRadius: 12, padding: 12 }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: TEC_COLORS.gold }}>Not runnable yet</div>
            <div style={{ fontSize: 12, color: TEC_COLORS.subtext, marginTop: 5, lineHeight: 1.5 }}>
              {blocked.length} of {t.steps.length} steps are waiting on the service that
              would carry them out. Nexus will refuse rather than record work it did not do.
            </div>
          </div>
        )}

        {t.runnable && <WorkflowRunner templateId={t.id} />}

        <h2 style={{ fontSize: 15, fontWeight: 800, color: TEC_COLORS.text, margin: '26px 0 10px' }}>Steps</h2>
        <div style={{ display: 'grid', gap: 10 }}>
          {t.steps.map((s) => (
            <div key={s.idx} style={{ background: TEC_COLORS.surface, border: `1px solid ${s.executable ? `${TEC_COLORS.gold}22` : `${TEC_COLORS.gold}55`}`, borderRadius: 12, padding: 14, display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <div style={{ fontSize: 13, fontWeight: 900, color: TEC_COLORS.gold, minWidth: 22 }}>{s.idx + 1}</div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: TEC_COLORS.text }}>
                  {s.action}{s.isPayment && <span style={{ fontSize: 11, color: TEC_COLORS.gold, marginLeft: 8 }}>π you pay</span>}
                </div>
                <div style={{ fontSize: 11, color: TEC_COLORS.subtext, marginTop: 4 }}>executed by <code>{s.service}</code></div>
                {!s.executable && s.needs && (
                  <div style={{ fontSize: 11, color: TEC_COLORS.subtext, marginTop: 6, lineHeight: 1.5, fontStyle: 'italic' }}>
                    waiting on: {s.needs}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        <p style={{ fontSize: 11, color: TEC_COLORS.subtext, margin: '22px 0 0', lineHeight: 1.5 }}>
          Nexus routes each step to the right place and keeps track of who started it.
          It never handles the payment itself or moves your Pi — and if a step fails part
          way, the earlier ones are reversed. A payment that already completed is the one
          thing that cannot be reversed automatically; a person is told instead.
        </p>
      </div>
    </main>
  );
}
