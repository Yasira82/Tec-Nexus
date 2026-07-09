import { describe, it, expect } from 'vitest';
import { TEMPLATES, getTemplate, KIND_META } from '@/lib/nexus/templates';

describe('TEC Nexus — Coordination Templates (C-109 §5)', () => {
  it('every template has a trigger + at least one step + a known kind', () => {
    for (const t of TEMPLATES) {
      expect(t.trigger).toBeTruthy();
      expect(t.steps.length).toBeGreaterThan(0);
      expect(KIND_META[t.kind]).toBeTruthy();
    }
  });

  it('every saga defines compensating actions (no partial state, C-109 §5)', () => {
    for (const t of TEMPLATES.filter((x) => x.kind === 'saga')) {
      expect(t.compensations.length).toBeGreaterThan(0);
    }
  });

  it('every Pi money-movement step goes through tec-payment-service (C-109 §6)', () => {
    // Only steps that CREATE or COMPLETE a payment move Pi; a commerce step may
    // mention "payment" descriptively (e.g. "confirm inventory once payment is
    // approved") without moving money — that must NOT be forced onto payment-service.
    for (const t of TEMPLATES) {
      for (const s of t.steps) {
        if (/(create|complete).*payment/i.test(s.action)) {
          expect(s.service).toBe('tec-payment-service');
        }
      }
    }
  });

  it('getTemplate returns null for an unknown id (fail closed)', () => {
    expect(getTemplate('nope')).toBeNull();
    expect(getTemplate('checkout-saga')?.name).toBe('Checkout Saga');
  });
});
