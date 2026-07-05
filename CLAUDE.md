# TEC Nexus — Claude Code Instructions

> ⚡ **SESSION START:** اقرأ `knowledge-base/C-02___CURRENT_STATE_.md` + **app charter
> `knowledge-base/C-109___NEXUS_INSTITUTIONAL_CHARTER.md`** من `yasira82/tec-knowledge-base` (branch: `main`).

## What This App Is

**System of Coordination** for the TEC Federated Platform — the **Economic
Coordination Infrastructure** (C-109). Nexus is the orchestration fabric: when
multiple actors (users, merchants, services, AI agents) must cooperate on an
economic outcome, Nexus runs the governed workflow. It answers one question:

```
"What should happen next?"
```

Nexus sits in the pipeline **after Zone** (verified data) and feeds **TEC AI**
(reasoning): Connection → Zone → Analytics → **Nexus** → TEC AI.

Built from `tec-template-base` (Next.js 15 frontend).

**Current Phase: Nexus V0 — App Scaffold & Portal Readiness.** Identity / domain /
slug / legal + themed home shell + **Nexus Pro payment surface** (the Pi Portal
"Process a Transaction" gate) done. The workflow engine is **V1+, post-Portal**.
Not yet deployed.

---

## Pi App Identity

| Field | Value |
|-------|-------|
| **App** | TEC Nexus |
| **Domain** | `https://nexus.tecosystem.app` |
| **Pi App ID** | ⏳ TBD — register at Pi Developer Portal · then Vercel `NEXT_PUBLIC_PI_APP_ID` |
| **APP_SOURCE slug** | `nexus` (payment-service resolves `PI_API_KEY_NEXUS`) |
| **PI_SANDBOX** | `false` (Mainnet) |

---

## Nexus-Specific Rules (C-109)

### The coordination boundary — orchestration vs execution
Nexus **OWNS**: workflow definition + execution, execution routing (which service
handles which step), actor coordination (sync + async), workflow state + history,
conditional logic + branching. Nexus does **NOT OWN**:
- **Business rules inside workflows** → the domain services own them.
- **Governance authority** → SYSTEM (C-110) approves which workflow types are allowed.
- **Payment processing** → tec-payment-service. **Never** a workflow that transfers Pi outside payment-service (C-109 §6).
- **Any entity's truth** → each service owns its own entity truth; Nexus coordinates by **ID only**.
- **AI reasoning** → TEC AI (C-104).

### Saga = the financial-workflow pattern (C-109 §5)
Distributed transactions use the **saga pattern** with compensating actions
(e.g. payment fails → cancel payment, release inventory). Workflows are
**idempotent** (at-least-once execution). Workflow state = strong consistency.

### ActorContext propagation (C-109 P1-1)
Every workflow step carries the **original actor's** ActorContext (C-47 §4) — not
replaced with a ServiceActor — so the audit trail traces back to the human actor.
Cross-service calls: ServiceActor + `x-internal-key` + `INTERNAL_SECRET`.

### Isolation / Fail Closed (P6, C-109 §6)
Missing actor context on a workflow trigger → **REJECT**. Unknown workflow type →
**REJECT**. SYSTEM policy violation → **REJECT** with audit log. Derive identity
from the `tec_user` session cookie server-side, never from a query param or body.

**Reference of record:** `yasira82/tec-knowledge-base` —
`C-109___NEXUS_INSTITUTIONAL_CHARTER.md` (charter) + `C-12_Dual_Mode_Payment.md`
(payment anti-regression) + `C-123` (session/cookies) + `C-121` (knowledge pipeline).

---

## Stack

- Next.js 15 App Router + TypeScript strict · React 18
- `@yasser172/tec-ui` (design system) · `@yasser172/tec-auth` · `@yasser172/tec-sdk`
- Vitest (unit) + Playwright (e2e) · Deployment: Vercel

---

## Architecture Rules (non-negotiable)

### CSRF — middleware ONLY (P2 single source of truth)
CSRF is enforced in **`middleware.ts`** and **nowhere else**: a request is trusted
if the double-submit token matches **OR** it is first-party (Origin host === Host /
`*.tecosystem.app`).
- ❌ **NEVER** add a CSRF check inside a route handler (`csrfCookie !== csrfHeader`
  → 403). It 403's legit Mode-2 payments in Pi Browser (drops `sameSite=None`
  cookies). The CI `payment-policy` job fails the build if you do. (KB C-12 §11)
- ✅ A route may *forward* `x-csrf-token` to a downstream call; it must never *validate* it.

### ADR-007 — Dual-mode payment (Pi foreign session)
Every buy handler MUST guard before touching `window.Pi`:
```typescript
const isHubNavigation = () =>
  document.referrer.toLowerCase().includes('hub.tecosystem.app');
if (isHubNavigation() || !(window as any).Pi || !piReady) {
  redirectToHubPayment(...);   // Mode 1: Hub modal → /hub?pay=1&...
  return;
}
// Mode 2: standalone — createPaymentRecord() then createU2APayment() (src/lib/pi-payment.ts)
```
> The hub-entry signal is `__tec_hub_entry` (sessionStorage) **OR** referrer — the
> landing page (C-123 LAW 2) made referrer-alone unreliable (C-12 §3). Do not remove it.

### ADR-009 — Unified payment contract
`amount` is a **number**; gateway path is **`/api/payment/*`** (singular); the only
inter-service header is **`x-internal-key`** + `INTERNAL_SECRET`. Don't re-declare
payment Zod locally — shapes live in `@yasser172/tec-sdk`. Approve under
`PI_API_KEY_NEXUS` (never the default Hub key — the Analytics approve→502 lesson, C-12 §11).

### Two-SDK boundary
```
Client components → src/lib-client/*  (browser state, Pi hooks)
API routes (BFF)  → @yasser172/tec-sdk via /api/bff/*  (server-only)
```

### Auth / cookies (LOCKED)
SSO via Hub cookies `tec_access_token`, `tec_csrf`, `tec_user`. Never localStorage.
Identity is derived from the `tec_user` cookie server-side — **never from the request body**.

---

## Setup status + Roadmap (C-109 §10)

```
Nexus V0 — App Scaffold & Portal Readiness (customized from template):
  ✅ package.json name = tec-nexus · APP_SOURCE = 'nexus'
  ✅ sso-callback ALLOWED_AUDIENCES → nexus.tecosystem.app + tec-nexus.vercel.app
  ✅ privacy + terms → TEC Nexus / nexus.tecosystem.app
  ✅ NEW-A: no NEXT_PUBLIC_API_GATEWAY_URL / Railway host in the client bundle
  ✅ layout Pi init is hub-entry-aware (C-12 §3 / ADR-007 foreign-session skip)
  ✅ /app themed as the Coordination home shell + Nexus Pro (real Pi U2A payment)

Next (before live):
  □ Register Pi App ID (Pi Developer Portal) → set Vercel NEXT_PUBLIC_PI_APP_ID +
    API_GATEWAY_URL · INTERNAL_SECRET · SSO_SECRET · PI_SANDBOX=false.
  □ payment-service: set PI_API_KEY_NEXUS on Railway (approve→502 otherwise, C-12 §11).
  □ Hub SSO: add nexus.tecosystem.app + tec-nexus.vercel.app to Hub /api/auth/sso
    ALLOWED_TARGETS + Hub domain registry (both in this change).
  □ Deploy (Vercel) + runtime-verify login (C-123) + a real Nexus Pro payment
    Mode 1 (Hub) AND Mode 2 (standalone) — completes the Portal "Process a Transaction" gate.

Nexus V1+ (post-Portal — C-109 §10): Phase 1 sequential workflows + payment/asset
  saga rollback + workflow history API → Phase 2 parallel workflows + TEC AI
  routing + merchant templates → Phase 3 AI-agent workflows.
```

> Nexus monetization (C-109 §7) is Enterprise Workflows / custom templates. The
> payment scaffold + `isHubNavigation()` guard are kept for the Portal gate and
> optionality; any direct buy MUST keep the ADR-007 guard and needs `PI_API_KEY_NEXUS`.

---

## What NOT To Do

- Do NOT run a workflow that transfers Pi outside tec-payment-service (C-109 §6)
- Do NOT put business rules in Nexus — they belong to the domain services (C-109 §4)
- Do NOT replace the original actor's context with a ServiceActor mid-workflow (C-109 P1-1)
- Do NOT validate CSRF in a route handler — middleware only (CI blocks it)
- Do NOT send `amount` as a string, or use `/payments` / `x-service-secret`
- Do NOT skip the ADR-007 `isHubNavigation()` guard before `window.Pi`
- Do NOT store tokens in localStorage; do NOT derive identity from the body
- Do NOT add `NEXT_PUBLIC_*` for internal service URLs or `INTERNAL_SECRET`

---

## Commit Convention

```
feat(nexus):  new coordination feature   fix(payment): payment flow fix (test carefully)
fix(nexus):   bug fix                     chore(scope):  build/config
```

---

## Skills

Available via plugin — invoke automatically when the situation matches:

| Situation | Skill |
|-----------|-------|
| Writing new feature or fixing a bug → use TDD | `/tdd` |
| Bug, regression, or unexpected behavior | `/diagnose` |
| Writing or modifying tests | `/test-guard` |
| Writing or modifying BFF routes, payment handlers, or API contracts | `/clean-code-guard` |
| Updating docs, CLAUDE.md, or knowledge-base entries | `/docs-guard` |
| Planning a new feature or architectural decision | `/grill-with-docs` |
| Breaking down a roadmap item into GitHub Issues | `/to-issues` |
| Session is getting long or context is filling up | `/handoff` |
| Adding pre-commit hooks to this repo | `/setup-pre-commit` |
