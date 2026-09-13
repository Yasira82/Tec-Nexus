'use client';

// TEC Nexus × TEC AI — the "what should happen next?" entry (C-109 · C-121).
// The user types a goal; Nexus ranks its own governed workflow catalog and links
// straight to the match. For anything the catalog can't answer, it hands off to
// TEC AI (the Hub assistant) — Nexus owns the workflows, TEC AI does open reasoning.

import { useState } from 'react';
import Link from 'next/link';
import { TEC_COLORS } from '@yasser172/tec-ui';
import { kindMeta } from '@/lib/nexus/templates';

interface Match { id: string; name: string; kind: string; purpose: string; score: number }

const HUB = (process.env.NEXT_PUBLIC_HUB_URL || 'https://hub.tecosystem.app').replace(/\/$/, '');
const askTecAiHref = (goal: string) =>
  `${HUB}/ai${goal.trim() ? `?q=${encodeURIComponent(goal.trim())}` : ''}`;

export function WorkflowRecommender() {
  const [goal,    setGoal]    = useState('');
  const [matches, setMatches] = useState<Match[] | null>(null);
  const [loading, setLoading] = useState(false);

  const run = async () => {
    if (!goal.trim() || loading) return;
    setLoading(true);
    try {
      const res  = await fetch('/api/bff/nexus/recommend', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ goal: goal.trim() }),
      });
      const data = await res.json().catch(() => ({ matches: [] }));
      setMatches(Array.isArray(data.matches) ? data.matches : []);
    } catch {
      setMatches([]);   // fail-soft — the TEC AI hand-off below still works
    } finally {
      setLoading(false);
    }
  };

  const card: React.CSSProperties = {
    display: 'block', textDecoration: 'none',
    background: TEC_COLORS.surface, border: `1px solid ${TEC_COLORS.gold}22`,
    borderRadius: 12, padding: 12, marginTop: 8,
  };

  return (
    <section style={{ marginTop: 28 }}>
      <h2 style={{ fontSize: 16, fontWeight: 800, color: TEC_COLORS.text, margin: 0 }}>What should happen next?</h2>
      <p style={{ fontSize: 12, color: TEC_COLORS.subtext, margin: '6px 0 12px', lineHeight: 1.5 }}>
        Describe your goal and Nexus points you to the right coordination workflow.
      </p>

      <div style={{ display: 'flex', gap: 8 }}>
        <input
          value={goal}
          onChange={(e) => setGoal(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && run()}
          placeholder="e.g. sell a product and get paid safely…"
          aria-label="Describe your goal"
          style={{
            flex: 1, background: TEC_COLORS.bg, border: `1px solid ${TEC_COLORS.gold}22`,
            borderRadius: 12, padding: '11px 14px', color: TEC_COLORS.text, fontSize: 13, outline: 'none',
          }}
        />
        <button
          onClick={run}
          disabled={loading || !goal.trim()}
          style={{
            border: 'none', borderRadius: 12, padding: '0 16px',
            background: goal.trim() ? TEC_COLORS.gold : `${TEC_COLORS.gold}44`,
            color: '#0a0800', fontWeight: 800, fontSize: 13,
            cursor: goal.trim() ? 'pointer' : 'default', whiteSpace: 'nowrap',
          }}
        >
          {loading ? '…' : 'Recommend'}
        </button>
      </div>

      {matches !== null && (
        <div style={{ marginTop: 10 }}>
          {matches.length > 0 ? (
            matches.map((m) => (
              <Link key={m.id} href={`/workflow/${m.id}`} style={card}>
                <div style={{ fontSize: 14, fontWeight: 800, color: TEC_COLORS.text }}>
                  {kindMeta(m.kind).icon} {m.name}
                </div>
                <div style={{ fontSize: 12, color: TEC_COLORS.subtext, marginTop: 4, lineHeight: 1.5 }}>{m.purpose}</div>
              </Link>
            ))
          ) : (
            <div style={{ fontSize: 12, color: TEC_COLORS.subtext, lineHeight: 1.6 }}>
              No workflow matches that yet — TEC AI can help you figure out the next step.
            </div>
          )}

          {/* Hand off open-ended reasoning to TEC AI (the Hub assistant). */}
          <a
            href={askTecAiHref(goal)}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-block', marginTop: 12, fontSize: 12, fontWeight: 700,
              color: TEC_COLORS.gold, textDecoration: 'none',
              border: `1px solid ${TEC_COLORS.gold}55`, borderRadius: 999, padding: '7px 14px',
            }}
          >
            🤖 Ask TEC AI
          </a>
        </div>
      )}
    </section>
  );
}
