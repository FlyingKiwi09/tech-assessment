# QA Homework — AceUp Console

**Role:** QA Engineer
**Timebox:** **1 day** (~6–8 hours). We would rather see six excellent findings and five
solid tests than a rushed sweep of everything.
**Language:** English (report + code)
**Your build seed:** `______` (in your assignment email — the app behaves deterministically
for your seed; always browse and test with it)

---

## Context

You are the first QA hire on a squad that ships **AceUp Console** — the app our members
use to talk to their AI coach (*Ally*) and to book live sessions with human coaches.

Engineering has just handed you a build for the pre-release check. Nobody has tested it
yet. There is no test suite, no test plan, and the developer who built the booking flow
is on holiday.

The build in `app/` is what you test. It is a static site: no login, no backend, data is
kept in your browser. **Docker is the only prerequisite** — see `START-HERE.md`:

```bash
make start SEED=<your seed>                       # app on http://localhost:4173
make test  SEED=<your seed> FRAMEWORK=<yours>     # runs your suite in Docker
```

**It contains real defects.** Some are functional, some are usability/accessibility
problems, and some things that look wrong are simply constraints of this build (those are
listed in `app/README.md`). Telling those apart is part of the job.

Flows in scope:

1. **Dashboard** — upcoming session summary
2. **Coach directory** — search, filter, sort, pagination
3. **Booking** — pick a day, pick a time, confirm (duration, notes, guest invite)
4. **My sessions** — reschedule, cancel
5. **AI coach chat** — send a message, get a reply

---

## Part 1 — Exploratory testing & reporting (~3h)

### 1.1 `BUG_REPORT.md`

One entry per **functional** defect you find. For each:

| Field | Notes |
|---|---|
| ID & title | `BUG-01 — Booked time does not match the selected slot` |
| Severity | impact if it ships (Critical / High / Medium / Low) |
| Priority | how soon we should fix it — **and why**; if it differs from severity, say so |
| Environment | browser + version, OS, viewport, **your seed** |
| Preconditions | required state before step 1 |
| Steps to reproduce | numbered, unambiguous, reproducible by us from a clean state |
| Expected result | what should happen, and why you believe that |
| Actual result | what happens, including any console errors |
| Evidence | screenshot / gif / console output |
| Suspected area | your read on where the problem lives (optional, valued) |

Quality beats quantity. Duplicates, unreproducible entries, and "works as designed"
noise **cost** points.

### 1.2 `UX_FINDINGS.md`

Usability and accessibility observations, kept **separate** from functional bugs. For
each: what you observed, the **user impact**, and a suggested fix. Keyboard-only and
small-viewport (320–375 px wide) checks are worth your time.

### 1.3 Risk assessment (a section in `TEST_PLAN.md`)

Which **three** areas would you regression-test first on every release, and why? Tie it
to user impact and likelihood, not to how much code exists.

---

## Part 2 — Automation (~3–4h)

### 2.0 Pick your framework

Two working scaffolds are provided. Extend **exactly one**:

| Scaffold | Framework | Run it with |
|---|---|---|
| `homework/starter-cypress/` | Cypress 15 | `make test FRAMEWORK=cypress` |
| `homework/starter-playwright/` | Playwright 1.63 | `make test FRAMEWORK=playwright` |

Both are already configured and running — each has a passing smoke spec, a seed-aware
navigation helper, and its own README. Pick the one you would actually reach for at work.
We have **no preference** and there is no hidden bonus for either; the requirements and the
grading bar below are identical. Say which you picked and why in your `TEST_PLAN.md`.

**Submit one suite, not two.** Delete the scaffold you did not use, or say clearly in your
`README.md` which one to run.

### 2.1 The suite

Write **6–10 test cases in total, across at most 5 files. Do not exceed 10 cases** — we are
grading prioritization, not volume. It must include:

- **≥ 3 happy paths** that pass reliably (e.g. book a session, cancel a session, chat
  round-trip, filter the directory)
- **≥ 2 regression tests for defects you found**, asserting the **correct** expected
  behaviour. These will therefore **fail** on the current build — that is the point, and a
  failing run here is not a failed submission. Mark them clearly (e.g. a
  `describe('known defects')` / `test.describe('known defects')` block referencing your
  `BUG-xx` IDs). Do **not** assert the buggy behaviour, and do **not** neutralise the
  failure: no `.skip` / `test.skip`, no `test.fixme`, and no `test.fail` — a green run that
  hides a real defect is worse than a red one that names it.
- **≥ 1 negative / boundary case** (validation, error path, or an input limit)

### 2.2 Engineering requirements

These apply identically to both frameworks.

- The suite must run with **`make test FRAMEWORK=<yours> SEED=<your seed>`** (Docker) — that
  is how we will run it. Put that exact command in your `README.md`.
- **No fixed sleeps as a synchronisation mechanism.** Wait on state, not on the clock:
  - Cypress: no `cy.wait(<milliseconds>)` — use retrying `.should(…)` assertions
  - Playwright: no `page.waitForTimeout(<milliseconds>)` — use web-first
    `await expect(locator).toHaveText(…)` assertions
  - waiting on a *request* (`cy.intercept` / `page.route`) is fine and welcome
- **Leave retries off.** Both configs ship with `retries: 0` on purpose; don't turn them on
  to paper over flakiness.
- Tests must be **independent** and pass in any order, and the whole suite must behave
  identically (except your marked known-defect tests) on **three consecutive runs**. We will
  run it three times.
- Assert **behaviour and state**, not just that an element exists.
- Keep selectors intentional; centralise reusable steps.

### 2.3 `TEST_PLAN.md` (≈1 page)

- Scope: what you tested and what you consciously left out
- What you automated vs left manual, **and why**
- How you made the suite deterministic (state, latency, seed)
- Where the app was hard to test, and what you would ask engineering to change
- Your risk assessment (1.3)
- What you would do next with more time

---

## Explicit non-goals

Do **not**:

- fix the application code (report it, don't repair it)
- do performance, load, or security testing
- use a test framework other than the two provided (no WebdriverIO, Selenium, TestCafe…);
  picking between Cypress and Playwright is your call, replacing both is not
- chase 100% coverage or write a test per element
- set up CI (welcome as a bonus, not expected)

---

## Deliverables

A repository (or zip) containing:

1. `BUG_REPORT.md`
2. `UX_FINDINGS.md`
3. `TEST_PLAN.md`
4. Your automated suite (one framework)
5. A short `README.md` with **your seed**, **which framework you used**, the exact command
   to run the suite (`make test FRAMEWORK=… SEED=…` unless you changed the setup), and
   anything we need to know to reproduce your results

Optional: a 5-minute Loom walking us through your two most interesting findings.

---

## How you will be evaluated

Roughly, in order of weight: how many real defects you found and how reproducible your
reports are; the soundness of your severity/priority calls; the depth of your UX and
accessibility observations; the design, assertion quality and **determinism** of your
suite; and how clearly you communicate trade-offs and gaps. Which framework you chose is
**not** graded; how well you used it is.

We explicitly reward honesty: "I did not have time to cover X, here is the risk that
leaves" scores better than silence or padding.

Good luck — and tell us what you would push back on.
