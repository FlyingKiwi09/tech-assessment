# QA Homework — Evaluation Criteria

Companion rubric for [`../homework/assignment.md`](../homework/assignment.md). Ground truth
for every injected defect is in [`bug-catalog.md`](./bug-catalog.md) — **read it before
grading** and grade against the candidate's **seed**.

The homework has an objective core (did they find the 8 functional defects we planted?) and
a judgment core (are their reports, priorities and tests any good?). This rubric keeps the
two separate so a candidate who finds fewer bugs but reports and automates them
excellently is not automatically outranked by a bug-count maximiser — and vice versa.

**The candidate chose either Cypress or Playwright** for Part 2 (their `README.md` and
`TEST_PLAN.md` say which). **The framework choice itself is not graded** — the bars below are
identical for both. Read their code through the [framework equivalence
table](#framework-equivalence-table) in Area 7, which says which construct means what on
each side. Areas 1–4 never touch the framework at all.

---

## How to use this rubric

**Scoring scale (per area):**

| Score | Meaning |
|------:|---------|
| **4 — Strong** | Senior signal. Would trust them to own quality for a squad. |
| **3 — Acceptable** | Solid mid-level. Reasonable, mostly complete, minor gaps. |
| **2 — Weak** | Works but shallow. Missed obvious considerations. |
| **1 — Poor** | Doesn't work, unreproducible, or contradicts the brief. |
| **0 — Absent** | Not attempted. |

**Weighting:**

| # | Area | Weight |
|--:|------|-------:|
| 1 | Defect recall & accuracy | 20% |
| 2 | Bug report quality | 15% |
| 3 | Severity / priority judgment & risk reasoning | 10% |
| 4 | UX & accessibility findings | 15% |
| 5 | Automation suite design | 15% |
| 6 | Assertion quality | 10% |
| 7 | Determinism & flake control | 10% |
| 8 | Communication (`TEST_PLAN.md`) | 5% |

**Golden rule:** a finding only counts if **we can reproduce it from their steps** on their
seed. Vague "booking is buggy sometimes" entries score nothing, no matter how correct the
underlying instinct was.

---

## Grading procedure (do this in order — ~45 min)

1. Look up their seed in `bug-catalog.md` → write down their **expected 8** (5 Tier A + 3
   Tier B).
2. Clear `localStorage`, open the app on their seed, and **reproduce each reported bug from
   their steps only**. Mark each: reproduced / not reproduced / not a bug / distractor.
3. Map their findings onto the catalogue → compute **recall = found / 8**.
4. Note their **framework**, then run their suite **three consecutive times** — Docker,
   exactly as the brief tells them:
   ```bash
   make start SEED=<their seed>
   make test  SEED=<their seed> FRAMEWORK=<theirs>   # ×3
   ```
   If they restructured the setup, follow the commands in their `README.md`. A submission that
   only runs after undocumented manual setup is a finding in Area 8, not a reason to stop.
   Record: pass/fail per run, which failures are their intentional known-defect tests, and
   any run-to-run variation (= flake).
5. Grep for hard sleeps and for constructs that hide failures — **pick the block that
   matches their framework**:
   ```bash
   # Cypress
   grep -rn "cy\.wait(\s*[0-9]" cypress/
   grep -rn "\.skip\|\.only" cypress/
   grep -rn "retries" cypress.config.js cypress/

   # Playwright
   grep -rn "waitForTimeout\|setTimeout" tests/
   grep -rn "test\.fail\|test\.fixme\|test\.skip\|\.only(" tests/
   grep -rn "retries\|forbidOnly" playwright.config.js tests/
   ```
6. Check the known-defect tests actually **fail** in the run from step 4. A green run with
   "known defects" in it means the failure was neutralised — see Area 5.
7. Read `TEST_PLAN.md` last, so their narrative doesn't colour the objective checks.

---

## Area 1 — Defect recall & accuracy (20%)

Objective, computed from step 3.

| Score | Bar |
|---|---|
| **4** | **7–8 of 8**, including **A1** (the timezone mismatch) and at least one of the "verify the outcome, not the toast" defects (**B3**) or the fan-out cases (**B1**/**B6**). Zero false positives. |
| **3** | **5–6 of 8**, A1 found, ≤1 false positive. |
| **2** | **3–4 of 8**, or found volume but missed A1, or ≥2 distractors reported as bugs. |
| **1** | **≤2 of 8**, or mostly unreproducible entries. |

Weighting notes:

- **A1 is the load-bearing defect.** It requires testing a non-UTC coach and comparing three
  screens. Missing it caps this area at 3 even with everything else found.
- **B3 is the seniority tell** — it can only be found by verifying that a session actually
  exists after a success message.
- Candidates who only test coaches with offset 0 (`c4`, `c7`, `c9`) will miss A1 entirely.
  Say so in feedback; it is a useful coaching point either way.
- Finding a defect **not** in the catalogue (real, reproducible) = bonus, see below.
- Reporting a documented build constraint (see distractors) as a functional bug = −0.5 per
  item, floor of one band.

---

## Area 2 — Bug report quality (15%)

Judge `BUG_REPORT.md` as if handing it to a developer with no context.

Checklist per entry: unique ID + title that names the symptom · severity **and** priority ·
environment **including their seed** · preconditions/state · numbered steps that work from
a clean state · **expected vs actual stated separately** · evidence · console output where
relevant.

- **4** — Every entry reproducible first try; expected result is *justified*, not asserted;
  evidence attached; suspected root cause where they had a view; no duplicates; groups
  symptoms of one cause under one bug (e.g. A1 + the confirmation-screen mismatch) instead
  of inflating the count.
- **3** — Reproducible, complete fields, thin on expected-result reasoning or evidence.
- **2** — Steps require guessing, or expected/actual blurred into one narrative, or no seed
  recorded.
- **1** — Unreproducible, no steps, or a screenshot dump with captions.

Red flag: **splitting one root cause into 5 bugs** to look thorough. Note it explicitly.

---

## Area 3 — Severity / priority judgment & risk reasoning (10%)

- Is **A1 Critical** (a member shows up at the wrong hour) and **A5/B5 Medium-ish**? Is
  **B3** treated as severe because it *hides* failure?
- Do severity and priority differ anywhere, **with a reason**? (e.g. "B6 is Medium severity
  but low priority — cosmetic counter, no data loss".)
- Is the risk assessment tied to **user impact × likelihood**, and does it name booking
  integrity as the top regression area?

**4** = calibrated, defended, distinguishes severity from priority, risk picks are the ones
we would pick. **3** = mostly calibrated, light reasoning. **2** = flat scale or
everything-is-Critical / everything-is-Medium. **1** = no severity, or inverted (a11y
contrast Critical while wrong-time booking is Low).

---

## Area 4 — UX & accessibility findings (15%)

Score against the 16-item list in `bug-catalog.md`. Do **not** require all of them.

- **4** — **≥8 substantive items** with user impact and a suggested fix, including the
  destructive-cancel-without-confirmation issue **and** at least two real a11y findings
  (keyboard-inaccessible slot tiles, missing focus trap/Escape, unlabelled chat input,
  contrast). Clearly separated from functional bugs. Bonus if they actually did a
  keyboard-only pass and a 320 px pass, or ran an a11y tool and interpreted (not dumped)
  the output.
- **3** — 5–7 items, mostly visual/copy, at least one a11y item, impact usually stated.
- **2** — ≤4 items, or generic opinions ("UI feels dated") with no user impact, or a11y
  ignored entirely.
- **1** — Absent, or merged indistinguishably into the bug report.

Reward correctly identifying the **date-format inconsistency + missing timezone** as a
systemic risk rather than cosmetic nitpicks.

---

## Area 5 — Automation suite design (15%)

- **Respected the 6–10 test-case cap** and can explain what they left out and why. Writing 30
  shallow tests is a **negative** here — it is the prioritization signal.
- **≥2 known-defect regressions asserting the correct behaviour** (so they fail), clearly
  labelled and mapped to `BUG-xx`. **Auto-cap at 2** if they instead codified the buggy
  behaviour as expected — that would lock the defect in, the worst possible QA habit.
  **Also auto-cap at 2** if the known-defect tests are green because the failure was
  neutralised with `test.fail` / `test.fixme` / `.skip` — same harm, different mechanism.
- Structure: reusable steps/commands/page objects/fixtures proportionate to the size;
  helpers instead of copy-paste; readable test names describing behaviour.
- Selectors: uses `data-testid` where available (`cy.get('[data-testid=…]')` /
  `page.getByTestId(…)`); where absent, chooses stable anchors over brittle CSS chains — and
  **flags the gap** as feedback to engineering (the app deliberately has partial coverage).
- **Used their framework's idioms rather than transliterating the other one.** A 4-level
  signal on both sides: Playwright — web-first `await expect(locator).toHaveText(…)`,
  `getByTestId`/`getByRole`, fixtures for setup, not `waitForSelector` plus hand-rolled
  polling; Cypress — retrying `.should(…)` chains and custom commands, not `.then()`
  spaghetti wrapping every step. Someone who clearly learned the tool for this homework and
  used it well is fine; someone fighting it is the signal.
- Not required: CI. Present and working = bonus.

**4** = all of the above, would merge into our repo. **3** = solid, some duplication or one
brittle area. **2** = works but copy-pasted, or spec count/labelling ignored. **1** = tests
don't run, or they asserted the buggy behaviour as correct.

---

## Area 6 — Assertion quality (10%)

- Asserts **outcomes and state**: session count, session time text, status badge, duration,
  result count, slot availability after cancel — not merely `should('exist')` /
  `should('be.visible')` on a container.
- Negative/boundary test is real (280 vs 281 chars, invalid email, whitespace-only message,
  the error path) rather than a second happy path in disguise.
- Guards against false passes: does a "booking succeeded" test verify the session appears in
  My sessions, or does it trust the toast? (**The B3 trap applies to their tests too** — a
  test that asserts only the toast would pass on a broken build.)
- Asserted against real state where it matters. Both scaffolds expose the app's own store
  (`cy.window().then(w => w.AceUpStore.sessions())` / `app.sessions()`); using it for
  count/duration assertions is good, though DOM-level assertions on the rendered values are
  equally valid and arguably closer to the user.

**4** = state-based, meaningful, false-pass-resistant. **3** = mostly behavioural, one or two
weak assertions. **2** = existence checks dominate. **1** = tests that cannot fail.

---

## Area 7 — Determinism & flake control (10%)

Objective, from steps 4–6.

- **Zero hard sleeps**; waits on state, aliases, intercepts/routes.
- **Same results across all three runs** (their known-defect tests failing consistently is
  correct and expected).
- Tests **independent and order-independent**; nothing pinned with `.only`; no failure
  neutralised with `.skip` / `test.skip` / `test.fixme` / `test.fail`.
- Retries left at 0.
- **Understands the state model** — see the note below.

**4** = 3/3 identical runs, no sleeps, state strategy deliberate **and explained**. **3** = 3/3
identical but state handling implicit/lucky, or one sleep. **2** = one run differs, or
several sleeps, or order-dependent. **1** = flaky/won't run, or failures neutralised.

### On the `localStorage` state model — read this before scoring

Both frameworks **isolate state between tests by default**, and we have verified it on this
build: Cypress e2e `testIsolation` (default `true`, not overridden in the scaffold) clears
`localStorage` before each test, and Playwright gives each test a fresh browser context,
which does the same. A two-test probe — book in test 1, assert zero sessions in test 2 —
passes untouched in **both** scaffolds.

So "wrote a `beforeEach` that clears `aceup.*`" is **not** the discriminator this criterion
used to imply, and a suite without one does **not** fail on run 2. Do not mark a candidate
down for its absence, and do not credit it as insight on its own. What still discriminates:

- Did they **state** the isolation model, rather than assume or ignore it?
- Did they notice where it does *not* save them: state accumulating **within** a single test
  (several bookings in one case), a `cy.visit` / `page.reload()` mid-test, the `aceup.seed`
  key surviving a partial clear, or — Playwright — a reused `storageState` or a
  `test.describe.configure({ mode: 'serial' })` block that shares a context?
- Did they keep the three runs identical, which is what the criterion is actually for?

A candidate who says "the framework isolates this for me, here is where it doesn't" is
showing more than one who writes a reset hook without knowing why.

### Framework equivalence table

| Concern | Cypress | Playwright |
|---|---|---|
| Hard sleep (banned) | `cy.wait(<number>)` | `page.waitForTimeout(<number>)`, `await new Promise(r => setTimeout(r, n))` |
| Wait on state (wanted) | retrying `.should(…)` | web-first `await expect(locator).toHaveText/toHaveCount/…` |
| Retries must stay 0 | `retries` in config, `--retries` | `retries` in config, `--retries`, `test.describe.configure({ retries })` |
| Neutralising a failure | `.skip`, `.only` | `test.skip`, `test.fixme`, **`test.fail`**, `test.only`, `test.describe.only`, `--grep-invert` |
| Between-test state | `testIsolation` (default **true**) clears `localStorage` | fresh browser context per test does the same |
| Reintroducing shared state | `testIsolation: false` | shared `storageState`, `mode: 'serial'`, a manually reused context |
| Order independence | spec/test order | `workers` > 1, `fullyParallel: true` |
| Network stubbing | `cy.intercept` | `page.route` |
| Reaching app globals | `cy.window().then(w => w.AceUpStore…)` | `page.evaluate(() => window.AceUpStore…)`, or the `app.sessions()` / `app.flag()` fixture |
| Seed plumbing | `Cypress.env('seed')`, `cy.visitApp` | the `seed` fixture / `process.env.SEED`, `app.goto` |

**`test.fail()` deserves special attention.** It is the one construct that turns a
correctly-failing known-defect test into a **green** run without asserting anything wrong —
the exact outcome Area 5's "asserted the correct behaviour" check exists to catch. The brief
forbids it explicitly. If you find it on a known-defect test, treat it as the Playwright
equivalent of `.skip`ping a failure: Area 5 auto-caps at 2 and it is a red flag here.

---

## Area 8 — Communication (`TEST_PLAN.md`) (5%)

- Scope and **explicit non-coverage** with the residual risk named.
- Automated vs manual split, with reasoning (what is *worth* automating).
- How determinism was achieved (seed, state, waits).
- Testability feedback to engineering (missing `data-testid`, no timezone in the DOM,
  1.2 s toasts being unassertable, no loading states).
- Honest "with more time I would…".

**4** = reproducible + reasoned + candid about gaps. **3** = complete, light on trade-offs.
**2** = shallow or hard to follow. **1** = missing.

---

## Bonus signals (+, cap +1 band on the closest area)

- Found a **real defect not in the catalogue** (verify it first).
- Identified the **deterministic failure pattern** (booking attempt #4 / chat message #3)
  instead of calling it "random".
- Worked out that behaviour is seed-scoped and used that to make tests deterministic.
- Automated a11y checks (axe) with **interpreted** results.
- CI workflow running the suite.
- Ran the suite on a **second browser engine** (Playwright: `--project=webkit`/`firefox`; or
  Cypress `--browser`) and **interpreted** the differences. Claiming cross-browser coverage
  without evidence stays a red flag; actually doing it and reporting what changed is a real
  signal, and cheap on the Playwright path.
- Used `cy.intercept` / `page.route` to force the injected 4th-booking 500 directly instead
  of booking three times to reach it.
- Testability PR-style suggestions (concrete `data-testid` proposals, a timezone attribute).
- Asked us a **good clarifying question** before starting (e.g. what the intended timezone
  contract is). We should treat this as positive, not as a lack of autonomy.

## Red flags (drag the score regardless of volume)

- Regression tests that assert the **buggy** behaviour as expected.
- `cy.wait(3000)` / `page.waitForTimeout(3000)` as the waiting strategy.
- `.skip` / `test.skip` / `test.fixme` / **`test.fail`** / `.only` left in, retries switched
  on, or tests deleted to make the suite green.
- Submitted **both** scaffolds filled in, or left the unused one ambiguous so it is unclear
  which suite we should run.
- Bug count padded with duplicates or with documented build constraints.
- No seed recorded anywhere → nothing is reproducible.
- Reports symptoms with **no** expected result stated.
- A suite that only passes on a fresh browser profile.
- Severity inflation across the board (everything Critical).
- Claims of "tested cross-browser / mobile" with no evidence.
- Copy-pasted AI output that contradicts the actual build (e.g. bugs that don't exist,
  references to screens we don't have) — check a couple of claims against reality.

---

## Seniority calibration

- **Junior / not yet:** finds 2–4 defects, mostly cosmetic; missed A1; reports lack expected
  results; tests are existence checks with hard sleeps.
- **Target (hire):** 5–6 of 8 including A1; reproducible reports with calibrated severity;
  5+ UX/a11y findings including the missing cancel confirmation; 6–10 clean Cypress specs
  with state-based waits, 2 labelled regressions that genuinely fail, deterministic across 3
  runs; a test plan that states what it did not cover and which framework they picked and why.
- **Strong (senior signal):** 7–8 of 8 including **B3** found by verifying outcomes rather
  than trusting the UI; root-cause grouping (timezone/date-format as one systemic issue);
  keyboard + 320 px passes done; testability feedback to engineering; explains the
  state-isolation and latency determinism model before we point it out — including that
  their framework already handles between-test isolation and where that stops helping.
