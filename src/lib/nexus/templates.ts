// TEC Nexus — Coordination Templates (C-109 §5). The governed workflow types
// Nexus orchestrates. This module is the curated DEFINITION set (V1): each
// template names its trigger, its ordered steps (which service owns each step —
// Nexus routes, the domain service executes), and for a saga its compensating
// actions (run in reverse on failure). Nexus owns the workflow; it never owns
// the business rules inside a step, nor moves Pi outside tec-payment-service
// (C-109 §4/§6). EXECUTION is V1+ (backend workflow engine) — this surface
// documents the contracts and is the honest V0→V1 slice.

export type WorkflowKind = 'saga' | 'sequential' | 'parallel' | 'conditional';

export interface WorkflowStep {
  service: string;   // owning service that executes the step (Nexus only routes)
  action:  string;
}

export interface Compensation {
  onFailOf: string;  // the step whose failure triggers this rollback
  action:   string;
}

export interface WorkflowTemplate {
  id:            string;
  name:          string;
  kind:          WorkflowKind;
  purpose:       string;
  trigger:       string;
  steps:         WorkflowStep[];
  compensations: Compensation[];   // empty for non-saga templates
}

export const TEMPLATES: WorkflowTemplate[] = [
  {
    id: 'checkout-saga',
    name: 'Checkout Saga',
    kind: 'saga',
    purpose: 'Turn a cart into a paid, fulfilled order without leaving inventory or payment inconsistent.',
    trigger: 'Buyer confirms checkout (commerce)',
    steps: [
      { service: 'tec-commerce-service', action: 'Reserve inventory for the order' },
      { service: 'tec-payment-service',  action: 'Create the Pi payment (U2A)' },
      { service: 'tec-commerce-service', action: 'Confirm inventory once payment is approved' },
      { service: 'tec-payment-service',  action: 'Complete the payment' },
    ],
    compensations: [
      { onFailOf: 'Confirm inventory once payment is approved', action: 'Cancel the payment' },
      { onFailOf: 'Create the Pi payment (U2A)',                action: 'Release the reserved inventory' },
    ],
  },
  {
    id: 'asset-transfer-saga',
    name: 'Asset Transfer Saga',
    kind: 'saga',
    purpose: 'Transfer a digital asset only against a verified payment — never leave ownership and payment out of sync.',
    trigger: 'Buyer purchases an asset (assets)',
    steps: [
      { service: 'tec-asset-service',   action: 'Verify current ownership + lock the asset' },
      { service: 'tec-payment-service', action: 'Create the Pi payment (U2A)' },
      { service: 'tec-asset-service',   action: 'Transfer ownership to the buyer' },
      { service: 'tec-payment-service', action: 'Complete the payment' },
    ],
    compensations: [
      { onFailOf: 'Transfer ownership to the buyer', action: 'Cancel the payment' },
      { onFailOf: 'Create the Pi payment (U2A)',     action: 'Unlock the asset (revert to seller)' },
    ],
  },
  {
    id: 'subscription-renewal',
    name: 'Subscription Renewal',
    kind: 'sequential',
    purpose: 'Charge and extend a subscription in order, so access is only granted after a successful payment.',
    trigger: 'Renewal due (commerce) or user upgrades',
    steps: [
      { service: 'tec-commerce-service', action: 'Check the subscription is renewable' },
      { service: 'tec-payment-service',  action: 'Create + complete the Pi payment' },
      { service: 'tec-commerce-service', action: 'Extend the subscription period' },
    ],
    compensations: [
      { onFailOf: 'Extend the subscription period', action: 'Cancel the payment (no partial access granted)' },
    ],
  },
];

export const KIND_META: Record<WorkflowKind, { icon: string; label: string }> = {
  saga:        { icon: '↩️', label: 'Saga (compensating rollback)' },
  sequential:  { icon: '➡️', label: 'Sequential' },
  parallel:    { icon: '🔀', label: 'Parallel' },
  conditional: { icon: '❓', label: 'Conditional' },
};

export const getTemplate = (id: string): WorkflowTemplate | null =>
  TEMPLATES.find((t) => t.id === id) ?? null;
