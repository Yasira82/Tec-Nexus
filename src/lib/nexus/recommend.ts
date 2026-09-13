// TEC Nexus — workflow recommender (C-109 · the "what should happen next?" match).
//
// Given a plain-language goal, rank the governed template catalog by relevance so a
// user (or TEC AI) lands on the RIGHT coordination workflow instead of scrolling the
// whole catalog. Deterministic + local (no keys, no network) — it scores the public
// template definitions only. For open-ended reasoning beyond the catalog, the UI hands
// off to TEC AI (the Hub assistant); Nexus stays the owner of the workflow catalog.

import { TEMPLATE_COPY, type WorkflowKind } from './templates';

/**
 * What the ranker needs to score a template. It is SUPPLIED, not imported: the
 * catalog belongs to the engine, and this file used to import a bundled copy of it
 * that had drifted out of date. A recommender scoring stale definitions would point
 * people at workflows whose steps no longer exist.
 */
export interface RankableTemplate {
  id:    string;
  name:  string;
  kind:  string;
  steps: { action: string }[];
}

// Curated intent keywords per template — the vocabulary a user actually types, mapped
// to the workflow that satisfies it. Kept next to the catalog so it stays in sync.
const KEYWORDS: Record<string, string[]> = {
  'checkout-saga': [
    'buy', 'purchase', 'checkout', 'cart', 'order', 'pay', 'payment', 'shop', 'sell',
    'store', 'inventory', 'stock', 'fulfil', 'fulfill', 'commerce',
    'شراء', 'اشتري', 'اشترى', 'دفع', 'طلب', 'اوردر', 'شحن', 'منتج', 'كارت', 'متجر', 'بيع',
  ],
  'asset-transfer-saga': [
    'asset', 'nft', 'domain', 'transfer', 'ownership', 'own', 'digital', 'collectible', 'mint',
    'أصل', 'أصول', 'نقل', 'ملكية', 'رقمي', 'تحويل',
  ],
  'subscription-renewal': [
    'subscription', 'subscribe', 'renew', 'renewal', 'upgrade', 'plan', 'pro', 'enterprise',
    'recurring', 'membership', 'billing',
    'اشتراك', 'تجديد', 'ترقية', 'باقة', 'خطة', 'عضوية', 'فاتورة',
  ],
};

const STOP = new Set([
  'the', 'a', 'an', 'to', 'of', 'and', 'or', 'for', 'my', 'i', 'want', 'need', 'how', 'do',
  'can', 'with', 'on', 'in', 'is', 'it', 'me', 'please', 'help',
  'في', 'من', 'على', 'عايز', 'عاوز', 'ازاي', 'إزاي', 'يعني', 'انا', 'أنا', 'لو',
]);

const tokenize = (s: string): string[] =>
  s.toLowerCase().split(/[^\p{L}\p{N}]+/u).filter((t) => t.length >= 2 && !STOP.has(t));

export interface Recommendation {
  id:      string;
  name:    string;
  kind:    WorkflowKind | string;
  purpose: string;
  score:   number;
}

/**
 * Rank `catalog` for `goal`. A keyword hit weighs most; a token also appearing in the
 * template's own text (name/purpose/trigger/steps) adds a smaller amount. Returns only
 * positive-score matches, best first. Empty goal, empty catalog, or no match → [].
 *
 * Still deterministic and local — it scores what it is handed and calls nothing.
 */
export function recommendWorkflows(
  goal: string,
  catalog: RankableTemplate[],
  limit = 3,
): Recommendation[] {
  const tokens = tokenize(goal ?? '');
  if (tokens.length === 0 || catalog.length === 0) return [];

  return catalog
    .map((t) => {
      const copy = TEMPLATE_COPY[t.id];
      const kw   = new Set(KEYWORDS[t.id] ?? []);
      const text = `${t.name} ${copy?.purpose ?? ''} ${copy?.trigger ?? ''} ${t.steps.map((s) => s.action).join(' ')}`.toLowerCase();
      let score = 0;
      for (const tok of tokens) {
        if (kw.has(tok))        score += 3;
        else if (text.includes(tok)) score += 1;
      }
      return { id: t.id, name: t.name, kind: t.kind, purpose: copy?.purpose ?? '', score };
    })
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}
