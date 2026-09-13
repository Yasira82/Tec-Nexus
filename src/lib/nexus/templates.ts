// TEC Nexus — Coordination Templates (C-109 §5): how they are DESCRIBED to a person.
//
// ── This file used to hold the workflow definitions, and that was the bug ──────
// It carried its own `steps` and `compensations` — a THIRD copy of definitions the
// engine owns (`tec-identity-service/src/modules/nexus/templates.ts`), kept in sync
// by a comment asking someone to remember. It drifted, exactly as that arrangement
// always does, and by the time anyone looked it was telling users two things the
// platform no longer believes:
//
//   · a 4th step, "Complete the payment" — removed from the engine because U2A
//     create→approve→complete is ONE user action. A run would have waited forever
//     for a payment nobody was ever going to be asked to make.
//   · a compensation, "Cancel the payment" — which is FORBIDDEN, not merely
//     unbuilt: `completed` is terminal (Invariant #7) and leaving it is Forbidden
//     Behavior #9. The real reversal is an A2U refund.
//
// So a person reading this app was promised a rollback the constitution does not
// permit. That is the same P2 violation the platform closed between DX and SYSTEM
// (C-02 Session 56d) — one rule, defined differently in two layers.
//
// ── The split that replaces it ────────────────────────────────────────────────
// The ENGINE owns the workflow: steps, kind, which step moves Pi, what compensates
// what, and whether a step can actually run. Nexus-the-app owns only how a workflow
// is EXPLAINED — its purpose in a sentence, what triggers it, its icon. Exactly the
// split DX keeps against SYSTEM (`builder_use` is DX's; `governance_status` is not).

/** Mirrors the engine's `kind`. Presentation lives here; the value comes from it. */
export type WorkflowKind = 'saga' | 'sequential' | 'parallel' | 'conditional';

/** One step, as the ENGINE reports it — never re-declared, only rendered. */
export interface EngineStep {
  idx:        number;
  service:    string;
  action:     string;
  isPayment:  boolean;
  executable: boolean;
  /** Present when the step is NOT executable: the endpoint it waits on. */
  needs:      string | null;
}

/** One template, as the ENGINE reports it. */
export interface EngineTemplate {
  id:       string;
  name:     string;
  kind:     WorkflowKind;
  runnable: boolean;
  steps:    EngineStep[];
}

/** What this app adds: the human description. Keyed by the engine's template id. */
export interface TemplateCopy {
  purpose: string;
  trigger: string;
}

/**
 * App-owned copy. If the engine grows a template this map does not know, the app
 * still lists it — with the engine's name and steps and no blurb. A missing
 * sentence is a gap in the writing; inventing one would be a gap in the truth.
 */
export const TEMPLATE_COPY: Record<string, TemplateCopy> = {
  'checkout-saga': {
    purpose: 'Turn a cart into a paid, fulfilled order without leaving inventory or payment inconsistent.',
    trigger: 'Buyer confirms checkout (commerce)',
  },
  'asset-transfer-saga': {
    purpose: 'Transfer a digital asset only against a verified payment — never leave ownership and payment out of sync.',
    trigger: 'Buyer purchases an asset (assets)',
  },
  'subscription-renewal': {
    purpose: 'Charge and extend a subscription in order, so access is only granted after a successful payment.',
    trigger: 'Renewal due (commerce) or user upgrades',
  },
};

/** The ids this app has written copy for — used for static params only. */
export const KNOWN_TEMPLATE_IDS = Object.keys(TEMPLATE_COPY);

export const copyFor = (id: string): TemplateCopy | null => TEMPLATE_COPY[id] ?? null;

export const KIND_META: Record<WorkflowKind, { icon: string; label: string }> = {
  saga:        { icon: '↩️', label: 'Saga (compensating rollback)' },
  sequential:  { icon: '➡️', label: 'Sequential' },
  parallel:    { icon: '🔀', label: 'Parallel' },
  conditional: { icon: '❓', label: 'Conditional' },
};

/** A kind the engine reports that this app has no icon for still renders. */
export const kindMeta = (kind: string) =>
  KIND_META[kind as WorkflowKind] ?? { icon: '•', label: kind };
