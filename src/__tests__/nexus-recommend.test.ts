import { describe, it, expect } from 'vitest';
import { recommendWorkflows } from '@/lib/nexus/recommend';

const top = (goal: string): string | undefined => recommendWorkflows(goal)[0]?.id;

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
    const r = recommendWorkflows('checkout order payment inventory');
    expect(r[0]?.id).toBe('checkout-saga');
    expect(r[0]?.score ?? 0).toBeGreaterThan(0);
    // scores are monotonically non-increasing
    for (let i = 1; i < r.length; i++) {
      expect(r[i - 1]!.score).toBeGreaterThanOrEqual(r[i]!.score);
    }
  });

  it('returns [] for an empty or unrelated goal (never fabricates a match)', () => {
    expect(recommendWorkflows('')).toEqual([]);
    expect(recommendWorkflows('   ')).toEqual([]);
    expect(recommendWorkflows('the weather today')).toEqual([]);
  });
});
