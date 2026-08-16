'use client';

// TEC Nexus — the Coordination Runtime of the TEC ecosystem (C-109). Nexus
// answers one question: "What should happen next?" It orchestrates economic
// coordination between actors (users, merchants, services, AI agents) through
// governed workflows, execution routing, and saga-backed distributed
// transactions. Nexus owns the workflow — never the business rules inside it,
// payment truth, or any entity's truth (those stay with their owning services).
import Link from 'next/link';
import { InviteCard } from '@/components/referral/InviteCard';
import { usePiAuth } from '@yasser172/tec-auth';
import { useMe } from '@/lib-client/hooks/useMe';
import { TEC_COLORS } from '@yasser172/tec-ui';
import { NexusPro } from './components/NexusPro';
import { WorkflowRecommender } from './components/WorkflowRecommender';
import { TEMPLATES, KIND_META } from '@/lib/nexus/templates';

export default function NexusHome() {
  const { user, isLoading } = usePiAuth();
  const me = useMe(); // server-resolved Pi username (Pi Browser hides tec_user from client JS — C-123 §3)
  const piName = me.username ?? user?.piUsername ?? null;
  const name = piName ? `@${piName}` : '';

  const templateCard: React.CSSProperties = {
    display: 'block', textDecoration: 'none',
    background: TEC_COLORS.surface, border: `1px solid ${TEC_COLORS.gold}22`,
    borderRadius: 12, padding: 14,
  };
  const kindBadge: React.CSSProperties = {
    fontSize: 10, fontWeight: 800, color: TEC_COLORS.gold,
    border: `1px solid ${TEC_COLORS.gold}55`, borderRadius: 999, padding: '2px 8px',
    whiteSpace: 'nowrap',
  };

  return (
    <main style={{ minHeight: '100vh', background: TEC_COLORS.bg, color: TEC_COLORS.text, padding: '32px 22px', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <div style={{ maxWidth: 760, margin: '0 auto' }}>
        <header>
          <div style={{ fontSize: 12, letterSpacing: 1, color: TEC_COLORS.subtext, textTransform: 'uppercase' }}>TEC Nexus · Coordination Runtime</div>
          <h1 style={{ fontSize: 26, fontWeight: 900, color: TEC_COLORS.gold, margin: '6px 0 0' }}>
            {isLoading || !name ? 'Welcome' : `Welcome, ${name}`}
          </h1>
          <p style={{ fontSize: 14, color: TEC_COLORS.subtext, margin: '6px 0 0', lineHeight: 1.6 }}>
            The coordination fabric of the TEC ecosystem. Nexus answers one question —
            <strong style={{ color: TEC_COLORS.text }}> “What should happen next?”</strong> — by
            coordinating multi-step deals so they run smoothly from start to finish.
          </p>
        </header>

        {/* Nexus Pro — real Pi U2A payment (also the Pi Portal "Process a Transaction" step) */}
        <NexusPro />

        {/* "What should happen next?" — goal → recommended workflow, with a TEC AI hand-off (C-121). */}
        <WorkflowRecommender />

        {/* Coordination Templates — the governed workflows Nexus runs (C-109 §5). */}
        <section style={{ marginTop: 28 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
            <h2 style={{ fontSize: 16, fontWeight: 800, color: TEC_COLORS.text, margin: 0 }}>Coordination Templates</h2>
            <span style={{ fontSize: 11, color: TEC_COLORS.subtext, border: `1px solid ${TEC_COLORS.gold}33`, borderRadius: 999, padding: '2px 10px' }}>definitions · execution V1</span>
          </div>
          <p style={{ fontSize: 12, color: TEC_COLORS.subtext, margin: '6px 0 14px', lineHeight: 1.5 }}>
            The workflow types Nexus coordinates. Each step runs through the right place, and
            if something fails partway, the steps safely reverse so nothing is left
            half-done. Tap a template to see its steps.
          </p>

          <div style={{ display: 'grid', gap: 10 }}>
            {TEMPLATES.map((t) => (
              <Link key={t.id} href={`/workflow/${t.id}`} style={templateCard}>
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
                  <span style={{ fontSize: 14, fontWeight: 800, color: TEC_COLORS.text }}>
                    {KIND_META[t.kind].icon} {t.name}
                  </span>
                  <span style={kindBadge}>{t.steps.length} steps</span>
                </div>
                <div style={{ fontSize: 12, color: TEC_COLORS.subtext, marginTop: 5, lineHeight: 1.5 }}>{t.purpose}</div>
                <div style={{ fontSize: 11, color: TEC_COLORS.gold, marginTop: 6 }}>{KIND_META[t.kind].label}</div>
              </Link>
            ))}
          </div>
        </section>

        <p style={{ fontSize: 11, color: TEC_COLORS.subtext, margin: '24px 0 0', lineHeight: 1.5 }}>
          Nexus coordinates multi-step workflows across TEC. It never handles payments
          itself — every Pi transfer goes through the secure payment system.
        </p>
        <InviteCard />
      </div>
    </main>
  );
}
