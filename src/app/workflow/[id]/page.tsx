// TEC Nexus — Coordination Template detail (C-109 §5). Shows a governed
// workflow's ordered steps (each routed to its owning service) and, for a saga,
// the compensating actions that run in reverse on failure. Public, read-only —
// this documents the coordination contract; execution is the V1 backend engine.
import Link from 'next/link';
import type { Metadata } from 'next';
import { TEC_COLORS } from '@yasser172/tec-ui';
import { getTemplate, TEMPLATES, KIND_META } from '@/lib/nexus/templates';
import { WorkflowRunner } from './WorkflowRunner';

export function generateStaticParams() {
  return TEMPLATES.map((t) => ({ id: t.id }));
}

export async function generateMetadata(
  { params }: { params: Promise<{ id: string }> },
): Promise<Metadata> {
  const { id } = await params;
  const t = getTemplate(id);
  return { title: t ? `${t.name} — TEC Nexus` : 'TEC Nexus — Workflow', description: t?.purpose ?? 'TEC Nexus coordination template.' };
}

export default async function WorkflowPage(
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const t = getTemplate(id);

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

  const isSaga = t.kind === 'saga';

  return (
    <main style={wrap}>
      <div style={inner}>
        <Link href="/app" style={{ fontSize: 13, color: TEC_COLORS.gold, textDecoration: 'none' }}>← Coordination Templates</Link>

        <div style={{ marginTop: 16 }}>
          <div style={{ fontSize: 12, letterSpacing: 1, color: TEC_COLORS.subtext, textTransform: 'uppercase' }}>
            {KIND_META[t.kind].icon} {KIND_META[t.kind].label}
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 900, color: TEC_COLORS.text, margin: '4px 0 0' }}>{t.name}</h1>
        </div>
        <p style={{ fontSize: 14, color: TEC_COLORS.subtext, margin: '12px 0 0', lineHeight: 1.6 }}>{t.purpose}</p>
        <p style={{ fontSize: 12, color: TEC_COLORS.subtext, margin: '8px 0 0' }}><strong style={{ color: TEC_COLORS.text }}>Trigger:</strong> {t.trigger}</p>

        <WorkflowRunner templateId={t.id} />

        <h2 style={{ fontSize: 15, fontWeight: 800, color: TEC_COLORS.text, margin: '26px 0 10px' }}>Steps</h2>
        <div style={{ display: 'grid', gap: 10 }}>
          {t.steps.map((s, i) => (
            <div key={i} style={{ background: TEC_COLORS.surface, border: `1px solid ${TEC_COLORS.gold}22`, borderRadius: 12, padding: 14, display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <div style={{ fontSize: 13, fontWeight: 900, color: TEC_COLORS.gold, minWidth: 22 }}>{i + 1}</div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: TEC_COLORS.text }}>{s.action}</div>
                <div style={{ fontSize: 11, color: TEC_COLORS.subtext, marginTop: 4 }}>executed by <code>{s.service}</code></div>
              </div>
            </div>
          ))}
        </div>

        {isSaga && t.compensations.length > 0 && (
          <>
            <h2 style={{ fontSize: 15, fontWeight: 800, color: TEC_COLORS.text, margin: '26px 0 4px' }}>Compensating actions</h2>
            <p style={{ fontSize: 12, color: TEC_COLORS.subtext, margin: '0 0 10px', lineHeight: 1.5 }}>
              Run in reverse if a step fails — the saga leaves no partial state (C-109 §5).
            </p>
            <div style={{ display: 'grid', gap: 8 }}>
              {t.compensations.map((c, i) => (
                <div key={i} style={{ background: TEC_COLORS.surface, border: `1px solid ${TEC_COLORS.error}44`, borderRadius: 12, padding: 12 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: TEC_COLORS.text }}>↩︎ {c.action}</div>
                  <div style={{ fontSize: 11, color: TEC_COLORS.subtext, marginTop: 4 }}>if this fails: {c.onFailOf}</div>
                </div>
              ))}
            </div>
          </>
        )}

        <p style={{ fontSize: 11, color: TEC_COLORS.subtext, margin: '22px 0 0', lineHeight: 1.5 }}>
          Nexus routes each step to its owning service and carries the original actor’s
          context through every step (C-109 P1-1). It never runs the business rule inside
          a step, and never moves Pi outside tec-payment-service (§6). Execution is the V1
          workflow engine; this page is the governed definition.
        </p>
      </div>
    </main>
  );
}
