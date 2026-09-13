import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { TEMPLATE_COPY, KNOWN_TEMPLATE_IDS, copyFor, kindMeta, KIND_META } from '@/lib/nexus/templates';
import { recommendWorkflows, type RankableTemplate } from '@/lib/nexus/recommend';

// TEC Nexus — what this app owns about workflows, and what it must NOT own.
//
// This file used to assert the invariants of a local step catalog: every saga has
// compensations, money steps route to payment-service, and so on. Those are real
// rules — they just are not this app's to check, because the definitions are not
// this app's to hold. They live in the engine
// (tec-identity-service/src/modules/nexus/templates.ts) and are tested there.
//
// What is left here is the app's genuine half: the human copy, and a guard that the
// definitions do not come back.

describe('Nexus template copy (what this app owns)', () => {
  it('every id we have written copy for has a purpose AND a trigger', () => {
    expect(KNOWN_TEMPLATE_IDS.length).toBeGreaterThan(0);
    for (const id of KNOWN_TEMPLATE_IDS) {
      expect(copyFor(id)?.purpose).toBeTruthy();
      expect(copyFor(id)?.trigger).toBeTruthy();
    }
  });

  it('an id we have no copy for resolves to null rather than throwing', () => {
    // The engine may know a template this app has not written a blurb for. It still
    // lists — a missing sentence is a gap in the writing, not a reason to hide a
    // workflow or crash the page.
    expect(copyFor('a-template-we-have-not-described')).toBeNull();
  });

  it('an unknown kind still renders, with the kind as its own label', () => {
    expect(kindMeta('saga')).toEqual(KIND_META.saga);
    expect(kindMeta('quantum')).toEqual({ icon: '•', label: 'quantum' });
  });
});

/**
 * THE GUARD. A third copy of the workflow definitions is exactly what this change
 * removed, and the arrangement that produced it — "mirrors the backend catalog, keep
 * them in sync" — is one commit away from returning.
 *
 * It had already drifted: this app was showing users a 4th step the engine had
 * removed, and a "Cancel the payment" rollback the constitution forbids (`completed`
 * is terminal, Invariant #7 / Forbidden Behavior #9). Someone reading the app was
 * promised a reversal the platform will not perform.
 */
describe('the app must not hold workflow definitions', () => {
  const source = readFileSync(join(process.cwd(), 'src/lib/nexus/templates.ts'), 'utf8');

  it('ships no step list and no compensation list', () => {
    // Prose ABOUT them is fine and wanted — the file explains why they are gone.
    // A structural definition is not: these are the shapes that used to hold them.
    expect(source).not.toMatch(/steps:\s*\[\s*\{/);
    expect(source).not.toMatch(/compensations:\s*\[\s*\{/);
  });

  it('exports only copy and presentation — no TEMPLATES constant', () => {
    expect(source).not.toMatch(/export const TEMPLATES\b/);
    expect(Object.keys(TEMPLATE_COPY).every((id) => {
      const c = TEMPLATE_COPY[id] as unknown as Record<string, unknown>;
      return c.steps === undefined && c.compensations === undefined;
    })).toBe(true);
  });
});

// Matching behaviour lives in nexus-recommend.test.ts. These two cover only what
// changed when the catalog stopped being bundled.
describe('recommendWorkflows — it ranks what it is HANDED', () => {
  const catalog: RankableTemplate[] = [
    { id: 'checkout-saga', name: 'Checkout Saga', kind: 'saga', steps: [{ action: 'Reserve inventory for the order' }] },
  ];

  it('returns nothing for an EMPTY catalog, however good the goal is', () => {
    // The case that matters: when the engine is unreachable the ranker must return
    // no matches rather than fall back to ranking a stale bundled list.
    expect(recommendWorkflows('I want to buy something', [])).toEqual([]);
    expect(recommendWorkflows('I want to buy something', catalog)[0]?.id).toBe('checkout-saga');
  });

  it("carries this app's purpose copy onto the match", () => {
    // The copy is the app's half of the split — the engine has no blurb to give.
    const m = recommendWorkflows('checkout', catalog)[0];
    expect(m?.purpose).toBe(TEMPLATE_COPY['checkout-saga']!.purpose);
  });
});
