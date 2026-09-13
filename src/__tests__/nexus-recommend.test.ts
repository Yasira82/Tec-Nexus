import { describe, it, expect } from 'vitest';
import { recommendWorkflows, type RankableTemplate } from '@/lib/nexus/recommend';

// The catalog is now SUPPLIED (it belongs to the engine, not to this app), so these
// score against a fixture shaped like what `GET /identity/nexus/templates` returns.
// The step text is the engine's current wording — a 3-step saga, no second payment
// step, because that is what the engine actually defines.
const CATALOG: RankableTemplate[] = [
  {
    id: 'checkout-saga', name: 'Checkout Saga', kind: 'saga',
    steps: [
      { action: 'Reserve inventory for the order' },
      { action: 'Pay with Pi (U2A)' },
      { action: 'Confirm the order against the completed payment' },
    ],
  },
  {
    id: 'asset-transfer-saga', name: 'Asset Transfer Saga', kind: 'saga',
    steps: [
      { action: 'Reserve the listed asset while the buyer pays' },
      { action: 'Pay with Pi (U2A)' },
      { action: 'Transfer ownership to the buyer' },
    ],
  },
  {
    id: 'subscription-renewal', name: 'Subscription Renewal', kind: 'sequential',
    steps: [
      { action: 'Check the subscription is renewable' },
      { action: 'Pay with Pi (U2A)' },
      { action: 'Extend the subscription period' },
    ],
  },
];

const recommend = (goal: string) => recommendWorkflows(goal, CATALOG);
const top = (goal: string): string | undefined => recommend(goal)[0]?.id;

describe('TEC Nexus — workflow recommender (C-109 · C-121)', () => {
  it('matches a checkout/selling goal to the checkout saga (EN + AR)', () => {
    expect(top('I want to sell a product and get paid')).toBe('checkout-saga');
    expect(top('عايز أبيع منتج وآخد الدفع')).toBe('checkout-saga');
  });

  it('matches an asset/NFT transfer goal to the asset transfer saga', () => {
    expect(top('transfer an NFT safely against payment')).toBe('asset-transfer-saga');
    expect(top('نقل ملكية أصل رقمي')).toBe('asset-transfer-saga');
  });

  it('matches a subscription/renew/upgrade goal to subscription renewal', () => {
    expect(top('renew my subscription')).toBe('subscription-renewal');
    expect(top('upgrade to pro plan')).toBe('subscription-renewal');
  });

  it('ranks by relevance, best first', () => {
    const r = recommend('checkout order payment inventory');
    expect(r[0]?.id).toBe('checkout-saga');
    expect(r[0]?.score ?? 0).toBeGreaterThan(0);
    // scores are monotonically non-increasing
    for (let i = 1; i < r.length; i++) {
      expect(r[i - 1]!.score).toBeGreaterThanOrEqual(r[i]!.score);
    }
  });

  it('returns [] for an empty or unrelated goal (never fabricates a match)', () => {
    expect(recommend('')).toEqual([]);
    expect(recommend('   ')).toEqual([]);
    expect(recommend('the weather today')).toEqual([]);
  });
});
