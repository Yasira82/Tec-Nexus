'use client';

// TEC Nexus — the Coordination Runtime of the TEC ecosystem (C-109). Nexus
// answers one question: "What should happen next?" It orchestrates economic
// coordination between actors (users, merchants, services, AI agents) through
// governed workflows, execution routing, and saga-backed distributed
// transactions. Nexus owns the workflow — never the business rules inside it,
// payment truth, or any entity's truth (those stay with their owning services).
import { usePiAuth } from '@yasser172/tec-auth';
import { TEC_COLORS } from '@yasser172/tec-ui';
import { NexusPro } from './components/NexusPro';

const PATTERNS = [
  { icon: '➡️', title: 'Sequential', body: 'Step A → Step B → Step C — ordered execution.' },
  { icon: '🔀', title: 'Parallel',   body: 'Run steps at once, wait for all, then continue.' },
  { icon: '❓', title: 'Conditional', body: 'Branch on a condition — if/else routing.' },
  { icon: '↩️', title: 'Saga',        body: 'Distributed transaction with compensating rollback.' },
];

export default function NexusHome() {
  const { user, isLoading } = usePiAuth();
  const name = user?.piUsername ? `@${user.piUsername}` : 'there';

  const cardBase: React.CSSProperties = {
    background:   TEC_COLORS.surface,
    border:       `1px solid ${TEC_COLORS.gold}22`,
    borderRadius: 14,
    padding:      16,
  };

  return (
    <main style={{ minHeight: '100vh', background: TEC_COLORS.bg, color: TEC_COLORS.text, padding: '32px 22px', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <div style={{ maxWidth: 760, margin: '0 auto' }}>
        <header>
          <div style={{ fontSize: 12, letterSpacing: 1, color: TEC_COLORS.subtext, textTransform: 'uppercase' }}>TEC Nexus · Coordination Runtime</div>
          <h1 style={{ fontSize: 26, fontWeight: 900, color: TEC_COLORS.gold, margin: '6px 0 0' }}>
            {isLoading ? 'Welcome' : `Welcome, ${name}`}
          </h1>
          <p style={{ fontSize: 14, color: TEC_COLORS.subtext, margin: '6px 0 0', lineHeight: 1.6 }}>
            The coordination fabric of the TEC ecosystem. Nexus answers one question —
            <strong style={{ color: TEC_COLORS.text }}> “What should happen next?”</strong> — by
            orchestrating multi-party workflows so complex deals execute automatically (C-109).
          </p>
        </header>

        {/* Nexus Pro — real Pi U2A payment (also the Pi Portal "Process a Transaction" step) */}
        <NexusPro />

        {/* Workflow engine — ships in V1 (Phase 1 MVP, C-109 §10). Honest placeholder. */}
        <section style={{ marginTop: 28 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
            <h2 style={{ fontSize: 16, fontWeight: 800, color: TEC_COLORS.text, margin: 0 }}>Workflows</h2>
            <span style={{ fontSize: 11, color: TEC_COLORS.subtext, border: `1px solid ${TEC_COLORS.gold}33`, borderRadius: 999, padding: '2px 10px' }}>V1 · coming soon</span>
          </div>
          <p style={{ fontSize: 12, color: TEC_COLORS.subtext, margin: '6px 0 14px', lineHeight: 1.5 }}>
            V1 brings sequential workflows + saga rollback for payment/asset flows (C-109 §10).
            Every step carries the original actor’s context and a full audit trail.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
            {PATTERNS.map((p) => (
              <div key={p.title} style={cardBase}>
                <div style={{ fontSize: 20 }}>{p.icon}</div>
                <div style={{ fontSize: 14, fontWeight: 800, color: TEC_COLORS.text, marginTop: 6 }}>{p.title}</div>
                <div style={{ fontSize: 12, color: TEC_COLORS.subtext, marginTop: 4, lineHeight: 1.5 }}>{p.body}</div>
              </div>
            ))}
          </div>
        </section>

        <p style={{ fontSize: 11, color: TEC_COLORS.subtext, margin: '24px 0 0', lineHeight: 1.5 }}>
          Nexus orchestrates workflows; it never owns the business rules inside them,
          payment processing, or any entity’s truth — those stay with their owning
          services and are coordinated by ID only (C-109 §4). Every Pi transfer goes
          through tec-payment-service; Nexus never bypasses it (P6, §6).
        </p>
      </div>
    </main>
  );
}
