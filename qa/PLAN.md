# QA Take-Home Assessment — Plan

**Role:** QA Engineer (manual + automation)
**Timebox for candidate:** 1 day (~6–8h)
**System under test (SUT):** a purpose-built static web app that simulates AceUp flows (AI coach chat + session scheduling)
**Candidate output:** a bug/UX report **plus** a Cypress suite
**Scoping decisions (locked):** automated suite required, **Cypress or Playwright** (§8; originally Cypress-only) · static site only (no backend) · seeded/deterministic bug injection · 1-day timebox

---

## 1. Why this shape

We need to measure two distinct skills that a "write some tests" homework can't separate:

1. **Exploratory testing judgment** — can they find real defects in an unfamiliar UI, tell a functional bug from a UX smell, and write a report a dev can act on without a follow-up call?
2. **Automation engineering** — can they turn findings into a maintainable, deterministic Cypress suite (selectors, waits, fixtures, no sleeps, no flake)?

A **static app with intentionally injected defects** gives us a known ground truth (we know exactly what's broken), so grading is objective — unlike "test our real app," where recall is unmeasurable.

**Determinism decision:** bugs are gated by a **seed** in the URL (`?seed=7391`), not by `Math.random()`. Same seed ⇒ same behaviour, always. Each candidate gets a **personal seed**, so a shared "answer key" between candidates doesn't transfer, while every run of *their* seed is reproducible (and so is our re-run when grading). A purely random app is untestable and unfair to grade.

---

## 2. Deliverable structure (what we build)

```
tech-assessment/qa/
├── PLAN.md                      # this file (internal)
├── jd.md                        # role JD (internal, for rubric alignment)
├── app/                         # THE SUT — static site, no build, no backend
│   ├── index.html               # Dashboard
│   ├── coaches.html             # Coach directory + filters + pagination
│   ├── booking.html             # Slot picker + booking modal
│   ├── sessions.html            # My sessions: reschedule / cancel
│   ├── chat.html                # AI coach chat (scripted, fake streaming)
│   ├── assets/
│   │   ├── css/app.css
│   │   └── js/
│   │       ├── seed.js          # seed parsing + deterministic PRNG
│   │       ├── flags.js         # opaque defect flags (fx_a1, fx_b2 …)
│   │       ├── api.js           # fake API: latency, 500s, in-memory + localStorage
│   │       ├── store.js         # bookings/sessions state
│   │       └── ui.js            # rendering
│   ├── data/{coaches.json,slots.json,chat-scripts.json}
│   └── README.md                # candidate-facing: how to serve it
├── docker/
│   └── playwright.Dockerfile    # Playwright runner image (see §8)
├── homework/
│   ├── assignment.md            # candidate-facing brief
│   ├── starter-cypress/         # Cypress scaffold (see §8)
│   │   ├── package.json         # cypress pinned, `npm run serve`, `npm run e2e`
│   │   ├── cypress.config.js    # baseUrl, retries:0, video off
│   │   ├── cypress/e2e/smoke.cy.js
│   │   ├── cypress/support/{e2e.js,commands.js}
│   │   └── README.md
│   └── starter-playwright/      # Playwright scaffold (see §8)
│       ├── package.json         # @playwright/test pinned
│       ├── playwright.config.js # baseURL, retries:0, workers:1, seed
│       ├── tests/e2e/smoke.spec.js
│       ├── tests/support/fixtures.js
│       └── README.md
└── homework-evaluation/
    ├── bug-catalog.md           # GROUND TRUTH — internal only, never shipped
    ├── criteria.md              # rubric (weights, 0–4 bands, red flags)
    ├── scorecard.md             # fill-in template
    ├── MANUAL-VERIFICATION.md   # pre-send checklist (browser, no runner needed)
    └── reference/               # internal harnesses proving each defect reproduces
```

Plus `README.md` (internal index + how to bundle/send) and `seeds.example.md` (candidate →
seed register template; the real `seeds.md` stays out of git).

**Distribution:** candidate receives `app/` + `homework/` only (zip or a separate throwaway repo). `homework-evaluation/` never leaves us.

**Anti-lookup measure:** defect flags are named opaquely (`fx_a1`) and the injection logic lives inline with normal code — reading the source is *allowed* (real QA reads code) but it doesn't hand them a labelled bug list, and the report is still graded on **repro steps + expected/actual**, which requires actually driving the app.

---

## 3. The SUT — product simulation

Domain-faithful to AceUp, ~5 screens, zero framework, servable with `npx serve` or `python3 -m http.server`.

| Screen | Interactions | Why it's here |
|---|---|---|
| **Dashboard** | next session card, upcoming count, "Book a session" CTA, toast area | cross-screen data consistency (counts vs reality) |
| **Coach directory** | search, filter by specialty/language, sort, pagination | classic filter+pagination state bugs |
| **Booking** | pick coach → date → slot grid → duration (30/60) → notes → confirm modal | the richest bug surface: timezones, double-book, optimistic UI |
| **My sessions** | list, reschedule, cancel, status badges | state transitions + destructive actions |
| **AI coach chat** | text input, send, fake streaming reply, typing indicator, "regenerate", error path | async UI, race conditions, empty input, long text |

Fake API characteristics (all seed-driven, all documented in `bug-catalog.md`):
- latency 200–900ms so **waits actually matter** (candidates who use `cy.wait(3000)` get caught)
- deterministic failure injection on a specific request N of an endpoint, not random (booking attempt #4, chat message #3)
- state persisted to `localStorage` so **test isolation matters** (a suite that doesn't reset state will fail on second run — a deliberate flakiness trap)

---

## 4. Defect catalogue (design)

Two tiers. **Tier A is always on** for every seed (baseline recall — everyone must find these). **Tier B is seed-selected**, 3 of 6 per candidate (differentiates thoroughness, kills answer sharing).

### Tier A — always on (functional, must-find)

| ID | Defect | Severity | Detectable by |
|---|---|---|---|
| A1 | **Timezone drift** — slot rendered in the coach's TZ, persisted as UTC ⇒ "My sessions" and the dashboard show a different hour than the slot clicked and confirmed | Critical | booking with a non-UTC coach, comparing 3 screens |
| A2 | **Double booking** — Confirm button not disabled during the in-flight request; two fast clicks create two sessions on one slot | High | rapid clicks / no loading state |
| A3 | **Cancel doesn't free the slot** — cancelled session's slot stays `unavailable` in the grid | High | cancel → return to booking |
| A4 | **Empty message accepted** — whitespace-only chat message renders a bubble and triggers a reply | Medium | chat with `"   "` |
| A5 | **Silent truncation** — session notes > 280 chars saved truncated with no warning or counter | Medium | long-text boundary testing |

### Tier B — seed-selected (3 of 6)

| ID | Defect | Severity |
|---|---|---|
| B1 | **Filter lost on pagination** — page count is computed from the unfiltered list, so "3 coaches found" still offers "Page 1 of 3" and page 2 lists non-matching coaches | High |
| B2 | **Reschedule resets duration** — a 60-min session becomes 30 min after reschedule, silently | High |
| B3 | **False success toast** — the injected 500 on the 4th booking attempt still shows "Session booked!" and no session is created | Critical |
| B4 | **Typing indicator never clears** on a failed chat reply; input stays disabled ⇒ dead-end state | High |
| B5 | **Invalid email accepted** in "invite a guest" (`a@b`, trailing dot, spaces) | Medium |
| B6 | **Stale dashboard count** — "Upcoming sessions" doesn't decrement after cancel until a hard reload | Medium |

### UX / accessibility issues — report-only, not automated

Deliberately *not* functional bugs, to test whether they can tell the difference and prioritize:

- Destructive **Cancel session** has **no confirmation** and no undo
- Toast auto-dismisses in **1.2s** — unreadable, and the only place errors surface
- Slot tiles are `<div onclick>` — **not keyboard reachable**, no focus ring, no `aria-pressed`
- Modal has **no focus trap**, doesn't close on `Escape`, background scrolls
- Chat input has **no label**, send button is an unlabelled icon (no accessible name)
- **Contrast failures** on disabled slots and helper text (below 4.5:1)
- **Inconsistent date formats** (`MM/DD/YYYY` on dashboard vs `DD/MM/YYYY` on sessions) — ambiguity, ties to A1
- No **empty state** for "no coaches match your filters" (just a blank area)
- No **loading state** anywhere (ties to A2)
- At 320px width: **horizontal overflow**, tap targets < 44px
- Timezone never displayed next to a time anywhere (root-cause hint for A1)

Grading intent: a strong candidate reports **A1 as Critical with the timezone/date-format inconsistency as suspected root cause**, and files the a11y items separately as UX debt rather than padding the bug count.

---

## 5. Candidate assignment (outline of `homework/assignment.md`)

**Part 1 — Exploratory testing & reporting (~3h)**
1. Charter-based exploration of the 5 flows with their personal seed.
2. `BUG_REPORT.md`: one entry per defect — ID, title, severity + **priority with justification**, environment, preconditions, numbered repro steps, expected vs actual, evidence (screenshot/gif/console), suspected area. Duplicates and "works as designed" noise cost points.
3. `UX_FINDINGS.md`: UX/a11y observations, separated from functional bugs, each with user impact and a suggested fix.
4. A short **risk assessment**: which 3 areas they'd regression-test first and why.

**Part 2 — Automation (~3–4h)**
5. Extend one of the two scaffolds into a suite (**Cypress or Playwright** — their pick, see §8): **6–10 test cases max** (we explicitly cap it — we want prioritization, not volume).
   - at least 2 specs that **fail** because they assert the *correct* expected behaviour (regression tests for found bugs — must be clearly marked, not skipped)
   - at least 3 **happy-path** specs that pass reliably
   - one **negative/edge** case (validation or error path)
6. Requirements: no fixed sleeps as a sync mechanism (`cy.wait(<ms>)` / `page.waitForTimeout(<ms>)`); retries left at 0; no interdependent test order; readable selectors (and a note on where the app forced them into brittle selectors — a real signal we want).
7. `TEST_PLAN.md` (1 page): scope, what they automated vs left manual **and why**, how they made the suite deterministic, what they'd add with more time.

**Explicit non-goals:** no fixing the app, no performance/load testing, no CI required (bonus only), no framework rewrite, no 100% coverage.

**Submission:** repo/zip with `BUG_REPORT.md`, `UX_FINDINGS.md`, `TEST_PLAN.md`, the Cypress suite, and a README with the exact run commands + their seed. Optional 5-min Loom.

---

## 6. Rubric (outline of `homework-evaluation/criteria.md`)

| # | Area | Weight |
|--:|---|--:|
| 1 | Defect recall & accuracy (vs `bug-catalog.md`, Tier A + their Tier B) | 20% |
| 2 | Bug report quality (reproducibility, expected/actual, evidence, no noise) | 15% |
| 3 | Severity/priority judgment & risk reasoning | 10% |
| 4 | UX & a11y findings (depth, user impact, correctly separated from bugs) | 15% |
| 5 | Cypress suite design (structure, selectors, commands, fixtures, isolation) | 15% |
| 6 | Assertion quality (asserts behaviour/state, not just "element exists") | 10% |
| 7 | Determinism & flake control (no fixed sleeps, clean state, passes 3× in a row) | 10% |
| 8 | Communication (`TEST_PLAN.md`, trade-offs, honest gaps) | 5% |

Scoring: 0–4 bands per area (4 = senior signal, 3 = hire, 2 = shallow, 1 = poor, 0 = absent).

**Objective checks we run:** suite executed **3 consecutive times** (flake detection), recall computed as `found / (5 Tier A + 3 seeded Tier B)`, and `grep` for hard sleeps and for failure-hiding constructs, per framework (see the equivalence table in `criteria.md` Area 7).

**Bonus:** caught a defect we didn't inject · proposed `data-testid`/a11y fixes to make the app testable · CI workflow · a11y automation (axe) · boundary/negative cases beyond the brief · noticed the localStorage isolation trap and handled it explicitly.

**Red flags:** report with no repro steps · severity everything-is-critical · regression tests written to assert the *buggy* behaviour (locks in the bug) · `cy.wait(5000)` everywhere · order-dependent specs · suite that passes only on a fresh browser profile · bug count padded with duplicates · UX opinions with no user impact.

---

## 7. Build order (our work)

1. ✅ `app/` — 5 pages, styling, fake API + seed/PRNG
2. ✅ Tier A + Tier B injected behind opaque flags; seed→Tier B mapping computed and verified
3. ✅ `homework-evaluation/bug-catalog.md` — exact repro, code pointers, distractor list
4. ✅ `homework/starter-cypress/` Cypress scaffold + passing smoke spec (`cy.visitApp`, `retries: 0`)
5. ✅ `homework/assignment.md`, `criteria.md`, `scorecard.md`, internal `README.md`
6. ✅ **Automated verification of the API layer** — `homework-evaluation/reference/logic-harness.mjs`
   (plain `node`, 24/24 checks on seeds 1000 + 1234): A1, A3, A5, B2, B5, B6, the failure
   injection, slot seeding, and correct behaviour when a flag is *off*
7. ✅ **Zero-install delivery** — `Makefile` + `docker-compose.yml` (nginx on :4173 +
   `cypress/included:15.8.1`) and `START-HERE.md`. Docker is the only prerequisite:
   `make start`, `make test`, `make stop`
8. ✅ **Browser verification of the UI layer** — `reference/verify.internal.cy.js` run through
   Docker: **11/11 on seed 1000 and on seed 1234**, so all 5 Tier A + all 6 Tier B defects are
   confirmed end-to-end. Only the UX/a11y list still needs a human pass
9. ✅ **Dual runner** — `homework/starter-playwright/` scaffold, `docker/playwright.Dockerfile`,
   `make test FRAMEWORK=…` dispatch, `reference/verify.internal.spec.js`, and a
   framework-neutral rubric. Verified on seeds 1000 + 1234 through both runners. See §8
10. ⏳ Dogfood: a timed solo pass to confirm 1 day is realistic and every defect is discoverable
   through the UI alone

---

## 8. Dual runner: Cypress **or** Playwright (added 2026-09-07)

Part 2 originally required Cypress. It now ships **two** working scaffolds —
`homework/starter-cypress/` and `homework/starter-playwright/` — and the candidate extends
exactly one. Full design, decisions and verification record:
[`PLAN-dual-runner.md`](./PLAN-dual-runner.md).

Why: the framework was never what we were measuring. Areas 1–4 of the rubric never mentioned
one, and Areas 5–7 measure suite design, assertion quality and determinism, all of which
express equally well in either tool. Forcing Cypress cost us signal from strong candidates who
live in Playwright, and told us nothing extra about anyone. Letting them pick — and say why in
`TEST_PLAN.md` — is itself a small signal.

What did **not** change: `app/` (verified framework-agnostic — no driver references anywhere),
the 8 planted defects, the seed→Tier B map, `logic-harness.mjs`, and every bar in the rubric.

Three things that did:

1. **`test.fail()` is a new red flag.** It is the Playwright construct that turns a
   correctly-failing known-defect test into a *green* run without asserting anything wrong —
   defeating Area 5's "asserted the correct behaviour" check by a route `.skip` never offered.
   The brief forbids it; `criteria.md` greps for it.
2. **Area 7's `localStorage` trap was already inert, and we only found out by adding the second
   framework.** Cypress e2e `testIsolation` has defaulted to `true` since v12 and the scaffold
   never overrode it, so `localStorage` was already cleared before each test; Playwright's
   per-test context does the same. A two-test probe confirmed it in both. "Wrote a `beforeEach`
   clear" was never the discriminator the rubric implied, so Area 7 is now re-based on whether
   the candidate *understands and states* the isolation model and where it stops helping.
3. **Chromium cannot reach a sibling container** across the compose bridge under Docker Desktop
   (every request `ERR_CONNECTION_REFUSED`, while `curl` from the same container and WebKit in
   the same image both work). The `playwright` service therefore uses
   `network_mode: "service:app"` and talks to the same nginx over loopback. Cypress runs
   Electron and is unaffected. This is documented in `reference/README.md` so nobody re-derives
   it.

Verification: `logic-harness.mjs` 24/24; both internal verifiers green on seeds 1000 and 1234;
both scaffolds' smoke suites identical across three consecutive runs; and bundles built for
`FRAMEWORK=both`, `cypress` and `playwright` unzip, leak nothing from
`homework-evaluation/`, and run green from the unzipped directory.

---

## 9. Open questions

- Do we hand this out as a **zip** or a private GitHub repo per candidate (repo makes seed assignment + PR-style submission easier)?
- Should the a11y items be **hinted at** in the assignment ("include accessibility observations") or left unprompted (harder, better signal)? Current draft: prompted, since 1 day is tight.
- Personal seeds: keep an internal `seeds.md` mapping candidate → seed → Tier B set
  (template committed as `seeds.example.md`).
- Do we want a JD (`jd.md`) alongside this, as the devops assessment has, to anchor the
  rubric weights to a published role description?
