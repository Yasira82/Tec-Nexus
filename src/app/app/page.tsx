'use client';

// TEC Nexus — the Coordination Runtime of the TEC ecosystem (C-109). Nexus
// answers one question: "What should happen next?" It orchestrates economic
// coordination between actors (users, merchants, services, AI agents) through
// governed workflows, execution routing, and saga-backed distributed
// transactions. Nexus owns the workflow — never the business rules inside it,
// payment truth, or any entity's truth (those stay with their owning services).
// App shell: Home / Templates / Pro / Settings bottom nav.
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { usePiAuth } from '@yasser172/tec-auth';
import { useMe } from '@/lib-client/hooks/useMe';
import { TEC_COLORS } from '@yasser172/tec-ui';
import { useTranslation } from '@/lib/i18n';
import { NexusPro } from './components/NexusPro';
import { WorkflowRecommender } from './components/WorkflowRecommender';
import { BottomNav, type NexusTab } from './components/BottomNav';
import { SettingsView } from './components/SettingsView';
import { kindMeta } from '@/lib/nexus/templates';

/** A template as the BFF returns it: the ENGINE's definition + this app's blurb. */
interface CatalogTemplate {
  id: string; name: string; kind: string; runnable: boolean;
  steps: { idx: number; executable: boolean }[];
  purpose: string | null; trigger: string | null;
}

export default function NexusHome() {
  const { t } = useTranslation();
  const { user, isLoading } = usePiAuth();
  const me = useMe(); // server-resolved Pi username (Pi Browser hides tec_user from client JS — C-123 §3)
  const piName = me.username ?? user?.piUsername ?? null;
  const name = piName ? `@${piName}` : '';

  const [tab, setTab] = useState<NexusTab>('home');

  // The catalog is FETCHED, not imported. It used to be a bundled constant — a third
  // copy of definitions the engine owns, which drifted into showing a step the engine
  // removed and a rollback the constitution forbids.
  const [catalog, setCatalog] = useState<CatalogTemplate[] | null>(null);
  const [catalogState, setCatalogState] = useState<'loading' | 'ready' | 'unavailable'>('loading');

  useEffect(() => {
    if (tab !== 'templates' || catalog) return;
    let alive = true;
    fetch('/api/bff/nexus/templates', { cache: 'no-store' })
      .then((r) => r.json().catch(() => null))
      .then((d) => {
        if (!alive) return;
        if (d?.available && Array.isArray(d.templates)) {
          setCatalog(d.templates as CatalogTemplate[]);
          setCatalogState('ready');
        } else {
          setCatalogState('unavailable');   // never a bundled fallback
        }
      })
      .catch(() => { if (alive) setCatalogState('unavailable'); });
    return () => { alive = false; };
  }, [tab, catalog]);

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

  const headerTitle =
    tab === 'templates' ? t.nexus.nav.templates
    : tab === 'pro' ? t.nexus.nav.pro
    : tab === 'settings' ? t.nexus.nav.settings
    : (isLoading || !name ? 'Welcome' : `Welcome, ${name}`);

  return (
    <main style={{ minHeight: '100vh', background: TEC_COLORS.bg, color: TEC_COLORS.text, fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <div style={{ maxWidth: 760, margin: '0 auto', padding: '32px 22px calc(96px + env(safe-area-inset-bottom))' }}>
        <header>
          <div style={{ fontSize: 12, letterSpacing: 1, color: TEC_COLORS.subtext, textTransform: 'uppercase' }}>{t.nexus.kicker}</div>
          <h1 style={{ fontSize: 26, fontWeight: 900, color: TEC_COLORS.gold, margin: '6px 0 0' }}>{headerTitle}</h1>
          {tab === 'home' && (
            <p style={{ fontSize: 14, color: TEC_COLORS.subtext, margin: '6px 0 0', lineHeight: 1.6 }}>{t.nexus.tagline}</p>
          )}
        </header>

        {/* ── HOME ────────────────────────────────────────────────── */}
        {tab === 'home' && (<>
          {/* "What should happen next?" — goal → recommended workflow, with a TEC AI hand-off (C-121). */}
          <div style={{ marginTop: 20 }}>
            <WorkflowRecommender />
          </div>

          <p style={{ fontSize: 11, color: TEC_COLORS.subtext, margin: '24px 0 0', lineHeight: 1.5 }}>
            Nexus coordinates multi-step workflows across TEC. It never handles payments
            itself — every Pi transfer goes through the secure payment system.
          </p>
        </>)}

        {/* ── TEMPLATES ───────────────────────────────────────────── */}
        {tab === 'templates' && (
          <section style={{ marginTop: 20 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
              <h2 style={{ fontSize: 16, fontWeight: 800, color: TEC_COLORS.text, margin: 0 }}>{t.nexus.coordinationTemplates}</h2>
              <span style={{ fontSize: 11, color: TEC_COLORS.subtext, border: `1px solid ${TEC_COLORS.gold}33`, borderRadius: 999, padding: '2px 10px' }}>definitions · execution V1</span>
            </div>
            <p style={{ fontSize: 12, color: TEC_COLORS.subtext, margin: '6px 0 14px', lineHeight: 1.5 }}>
              The workflow types Nexus coordinates. Each step runs through the right place, and
              if something fails partway, the steps safely reverse so nothing is left
              half-done. Tap a template to see its steps.
            </p>

            {catalogState === 'loading' && (
              <div style={{ fontSize: 12, color: TEC_COLORS.subtext }}>Loading the governed catalog…</div>
            )}

            {catalogState === 'unavailable' && (
              <div style={{ background: TEC_COLORS.surface, border: `1px solid ${TEC_COLORS.gold}55`, borderRadius: 12, padding: 14 }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: TEC_COLORS.gold }}>Catalog unavailable</div>
                <div style={{ fontSize: 12, color: TEC_COLORS.subtext, marginTop: 5, lineHeight: 1.5 }}>
                  The coordination engine could not be reached. Nothing is shown from a
                  stored copy — a list of workflows you cannot confirm is worse than none.
                </div>
              </div>
            )}

            <div style={{ display: 'grid', gap: 10 }}>
              {(catalog ?? []).map((tpl) => {
                const meta = kindMeta(tpl.kind);
                return (
                  <Link key={tpl.id} href={`/workflow/${tpl.id}`} style={templateCard}>
                    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
                      <span style={{ fontSize: 14, fontWeight: 800, color: TEC_COLORS.text }}>
                        {meta.icon} {tpl.name}
                      </span>
                      <span style={kindBadge}>{tpl.steps.length} steps</span>
                    </div>
                    {tpl.purpose && (
                      <div style={{ fontSize: 12, color: TEC_COLORS.subtext, marginTop: 5, lineHeight: 1.5 }}>{tpl.purpose}</div>
                    )}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
                      <span style={{ fontSize: 11, color: TEC_COLORS.gold }}>{meta.label}</span>
                      {/* Said where the workflow is OFFERED, not after someone starts it. */}
                      {!tpl.runnable && (
                        <span style={{ fontSize: 10, fontWeight: 800, color: TEC_COLORS.subtext, border: `1px solid ${TEC_COLORS.subtext}55`, borderRadius: 999, padding: '2px 8px' }}>
                          not runnable yet
                        </span>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        {/* ── PRO ─────────────────────────────────────────────────── */}
        {tab === 'pro' && (
          <div style={{ marginTop: 20 }}>
            {/* Nexus Pro — real Pi U2A payment (also the Pi Portal "Process a Transaction" step) */}
            <NexusPro />
          </div>
        )}

        {/* ── SETTINGS ────────────────────────────────────────────── */}
        {tab === 'settings' && <SettingsView />}
      </div>

      <BottomNav active={tab} onSelect={setTab} />
    </main>
  );
}
