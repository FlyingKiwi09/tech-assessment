# Plan — dual runner: Cypress **or** Playwright

**Status:** **implemented 2026-09-07** — see [§13 Implementation record](#13-implementation-record)
for what landed, what deviated, and the verification results. Everything above §13 is the
plan as written *before* the work; it is kept as-written so the deviations are legible.
**Goal:** let a QA candidate complete Part 2 of the homework in **either** Cypress or Playwright,
with identical difficulty, identical grading bars, and a single `make test` entry point.
**Companion to:** [`PLAN.md`](./PLAN.md) (original design rationale — unchanged by this)

---

## 1. Principles

1. **The app under test does not change.** Verified: `app/` contains zero references to
   Cypress, Playwright or any driver — only `data-testid` attributes and the `window.Fx` /
   `window.AceUpStore` globals, all framework-neutral. The 8 planted defects, the seed→Tier B
   map and `logic-harness.mjs` stay exactly as they are, so nothing already verified needs
   re-verifying at the app layer.
2. **Symmetry, not a default and an afterthought.** If one scaffold looks like the real one,
   candidates will read the other as a trap. Both get the same shape, the same smoke spec, the
   same README, the same first-class `make` target.
3. **One grading bar, expressed twice.** The rubric stays framework-neutral; a *framework
   equivalence table* tells the reviewer which construct means which. Areas 1–4 (recall,
   report quality, severity, UX/a11y) are untouched — they never mentioned a framework.
4. **Docker stays the only prerequisite** for both paths.

---

## 2. Decisions (recommendation → rationale, and the cost of the alternative)

| # | Decision | Recommendation | Alternative & why not |
|--:|---|---|---|
| D1 | Directory layout | `homework/starter-cypress/` + `homework/starter-playwright/` | Keeping `homework/starter/` as the Cypress one is less churn, but the asymmetry silently signals "Cypress is the one we actually want". |
| D2 | What ships to a candidate | **Both** scaffolds; candidate picks one and declares it. `make bundle FRAMEWORK=both\|cypress\|playwright`, default `both` | Bundling one forces *us* to guess their tool before they've said. Cost of shipping both: slightly more to read, and the brief must be unmistakable that they submit **one**. |
| D3 | `make test` dispatch | `make test FRAMEWORK=playwright SEED=…`, plus `make test.cypress` / `make test.playwright` aliases. With `FRAMEWORK` unset: use the only scaffold present; if both are present, **fail loudly** printing the two exact commands | Auto-detecting "which scaffold has real specs" is guessy and would silently run the wrong suite during grading. Making the candidate name their framework in their README is also signal. |
| D4 | Playwright deps in Docker | Small `docker/playwright.Dockerfile` `FROM mcr.microsoft.com/playwright:v1.63.0-noble` that bakes `npm ci` in; bind-mount the working copy with an anonymous volume over `/e2e/node_modules` | Entrypoint-time `npm ci` into a named volume needs no Dockerfile but re-installs unpredictably and needs the network on more runs. Baked = deterministic and offline after the first build. |
| D5 | Internal verifier | Port all 11 assertions to `verify.internal.spec.js` | Smoke-only leaves the Playwright path unproven — we'd be asking candidates to walk a road we never walked. ~150 lines, one-off. |
| D6 | Browser matrix | Chromium-only project by default, so runtimes and grading stay comparable; cross-engine becomes an explicit **bonus** | Enabling all three projects triples runtime and makes "3 identical runs" noisier for no extra signal. |

Both `mcr.microsoft.com/playwright:v1.63.0-noble` and `-jammy` tags exist and were confirmed
reachable; `@playwright/test` latest is **1.63.0**. Pin it.

---

## 3. The Playwright scaffold

```
homework/starter-playwright/
├── package.json            # @playwright/test 1.63.0 pinned, serve, scripts
├── package-lock.json       # COMMITTED (see §8 — npm ci needs it)
├── playwright.config.js
├── .gitignore              # test-results/, playwright-report/, blob-report/, .last-run.json
├── README.md               # mirror of the Cypress starter README
└── tests/
    ├── support/fixtures.js # the `cy.visitApp` equivalent
    └── e2e/smoke.spec.js   # same two passing tests as smoke.cy.js
```

### `playwright.config.js` — the parity-critical bits

```js
const { defineConfig } = require('@playwright/test');

const baseURL = process.env.BASE_URL || 'http://localhost:4173'; // Docker sets http://app

module.exports = defineConfig({
  testDir: './tests',
  // Retries are OFF on purpose: we want to see whether the suite is
  // deterministic, not whether retries can hide flakiness.
  retries: 0,
  workers: 1,            // parity with the single-threaded Cypress run
  fullyParallel: false,  //   raise these only if you explain why in TEST_PLAN.md
  forbidOnly: true,      // a stray test.only fails the run instead of hiding tests
  reporter: [['list']],  // never the html reporter with open: it would hang the container
  timeout: 30_000,
  expect: { timeout: 6000 },
  use: {
    baseURL,
    testIdAttribute: 'data-testid',
    actionTimeout: 6000,          // ≈ Cypress defaultCommandTimeout
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'off',
  },
  projects: [{ name: 'chromium', use: { browserName: 'chromium' } }],
  // Native path only — in Docker the app container already serves the app.
  webServer: process.env.BASE_URL ? undefined : {
    command: 'npx --yes serve -l 4173 ../../app',
    url: 'http://localhost:4173/index.html',
    reuseExistingServer: true,
  },
});
```

Three of these are non-obvious and will bite if skipped: `reporter: [['list']]` (the default
HTML reporter tries to serve a report and hangs the container), `testIdAttribute` (so
`getByTestId` matches the app's attribute), and the conditional `webServer` (so the same config
serves the native path and the Docker path).

### `tests/support/fixtures.js` — the `cy.visitApp` equivalent

```js
const base = require('@playwright/test');

exports.test = base.test.extend({
  seed: [process.env.SEED || '1000', { option: true }],
  app: async ({ page, seed }, use) => {
    await use({
      page,
      goto: (path, query = {}) =>
        page.goto(`${path}?${new URLSearchParams({ ...query, seed })}`),
      sessions: () => page.evaluate(() => window.AceUpStore.sessions()),
      flag: (name) => page.evaluate((n) => window.Fx(n), name),
      reset: () => page.evaluate(() => {
        Object.keys(localStorage)
          .filter((k) => k.startsWith('aceup.'))
          .forEach((k) => localStorage.removeItem(k));
      }),
    });
  },
});
exports.expect = base.expect;
```

`sessions()` / `flag()` are the `cy.window().then(w => w.AceUpStore…)` and `w.Fx(…)`
equivalents — the internal verifier needs both, so the candidate scaffold should expose them
too. `reset()` is *not* needed for between-test isolation (§6) but is needed inside a test.

---

## 4. Docker & Makefile

**`docker/playwright.Dockerfile`** (new)

```dockerfile
FROM mcr.microsoft.com/playwright:v1.63.0-noble
WORKDIR /e2e
COPY homework/starter-playwright/package.json homework/starter-playwright/package-lock.json ./
RUN npm ci --no-audit --no-fund
ENTRYPOINT ["npx", "playwright", "test"]
```

The `ENTRYPOINT` (not `command`) is deliberate: it makes
`docker compose run --rm playwright --grep booking` *append* args, matching how the existing
`cypress/included` service already handles `make test ARGS=…`.

**`docker-compose.yml`** — `app` unchanged. `cypress` service: mount path becomes
`./homework/starter-cypress`. New `playwright` service, same `profiles: ["test"]` and
`depends_on: app: service_healthy`:

```yaml
  playwright:
    build: { context: ., dockerfile: docker/playwright.Dockerfile }
    profiles: ["test"]
    depends_on: { app: { condition: service_healthy } }
    working_dir: /e2e
    volumes:
      - ./homework/starter-playwright:/e2e
      - /e2e/node_modules      # keeps the image's deps visible under the bind mount
    environment:
      BASE_URL: http://app
      SEED: ${SEED:-1000}
```

**`Makefile`** — `FRAMEWORK ?=` (deliberately empty), `seed-check` unchanged, plus:

- `test` → dispatch per D3
- `test.cypress` → today's `docker compose run --rm cypress $(ARGS)`
- `test.playwright` → `docker compose run --rm playwright $(ARGS)`
- `test.open` → branches: `cypress open` vs `playwright test --ui` (both still native-Node-only)
- `shell` → takes `FRAMEWORK`
- `clean` → also removes `test-results/`, `playwright-report/`, `blob-report/`, `.last-run.json`
- `help` → prints the framework line alongside the seed line

---

## 5. Candidate-facing doc changes

| File | Change |
|---|---|
| `homework/assignment.md` | §2 opener: extend **one** scaffold, `starter-cypress/` or `starter-playwright/`; pick the one you'd actually reach for and say why in `TEST_PLAN.md`; **do not submit both**. §2.2: rewrite the sleep ban framework-neutrally with both concrete forms. **New requirement:** known-defect tests must genuinely fail — no `test.fail()`, `test.fixme()`, `test.skip`, `.skip`. Non-goals: "migrate to another test framework (Cypress is a requirement)" → "use a framework other than the two provided". Deliverables README must state **framework, seed, exact command**. |
| `START-HERE.md` | New "Pick your framework" section; every `make test` example gains `FRAMEWORK=`; troubleshooting rows for the ~2.3 GB Playwright image pull, `docker compose build playwright` after a `package.json` change, and root-owned `test-results/`. |
| `homework/starter-cypress/README.md` | Commands gain `FRAMEWORK=cypress`; one line pointing at the Playwright sibling. |
| `homework/starter-playwright/README.md` | New, mirrors the Cypress one: Docker commands, native commands (`npx playwright install chromium` needed natively), how the seed reaches the suite (`SEED` env → `seed` fixture), what's provided, the `localStorage`/latency notes, the partial-`data-testid` feedback ask. |
| `app/README.md` | No change needed — it never mentions a framework. |

**Pre-existing ambiguity to fix while we're in there:** §2.1 says "6–10 **specs** total" and then
counts test *cases* ("≥3 happy paths", "≥2 regressions", "≥1 negative"). In Playwright "spec" =
file, in Cypress people use it both ways. Restate as **"6–10 test cases, in at most 5 files"**.

---

## 6. Grading parity — the part that actually needs care

### 6.1 `homework-evaluation/criteria.md`

- Header gains: candidate chose one framework; the bars below are identical; read constructs
  through the equivalence table.
- **Area 5** retitled "Automation suite design" (was "Cypress suite design"). Bars unchanged.
  Add a 4-level signal: *used their framework's idioms rather than transliterating the other
  one* — Playwright: web-first `expect(locator).toHaveText()` and `getByTestId`, not
  `waitForSelector` + manual polling; Cypress: `.should()` chains, not `.then()` spaghetti.
- **Areas 6, 7** get the equivalence table below. Bars unchanged.
- Grading procedure steps 5–6 (the greps) become framework-conditional.

**Framework equivalence table (new, goes in `criteria.md`):**

| Concern | Cypress | Playwright |
|---|---|---|
| Hard sleep (banned) | `cy.wait(<number>)` | `page.waitForTimeout(<number>)`, `await new Promise(r => setTimeout(r, n))` |
| Wait on state (wanted) | `.should(…)` retry-ability | web-first `await expect(locator).toHaveText/toHaveCount/…` |
| Retries must stay 0 | `retries` in config, `--retries` | `retries` in config, `--retries`, `test.describe.configure({ retries })` |
| Hiding a failure | `.skip`, `.only` | `test.skip`, `test.fixme`, **`test.fail`**, `test.only`, `test.describe.only`, `--grep-invert` |
| Between-test state | `testIsolation` (default **true**) clears `localStorage` | fresh browser context per test does the same |
| Reintroducing shared state | `testIsolation: false` | shared `storageState`, `test.describe.configure({ mode: 'serial' })`, a manually reused context |
| Order independence | spec/test order | `workers` > 1, `fullyParallel: true` |
| Network stubbing | `cy.intercept` | `page.route` |
| Reaching app globals | `cy.window().then(w => w.AceUpStore…)` | `page.evaluate(() => window.AceUpStore…)` |

**Greps, per framework:**

```bash
# Cypress
grep -rn "cy\.wait(\s*[0-9]" cypress/
grep -rn "\.skip\|\.only" cypress/

# Playwright
grep -rn "waitForTimeout\|setTimeout" tests/
grep -rn "test\.fail\|test\.fixme\|test\.skip\|\.only(" tests/
grep -rn "retries" playwright.config.js tests/
```

### 6.2 The two substantive rubric shifts

**(a) `test.fail()` is a new first-class red flag.** It is the Playwright construct that turns a
correctly-failing known-defect test into a **green** run — exactly the outcome Area 5's
"asserting the correct behaviour" criterion exists to detect, achieved without asserting
anything wrong. The brief must forbid it and the reviewer must grep for it. This is the single
most important addition in this plan.

**(b) Area 7's `localStorage` trap needs re-basing — and it is already inert on the Cypress
side.** The criteria say a suite that doesn't reset state "will fail on run 2", but Cypress e2e
`testIsolation` has defaulted to `true` since v12 (the scaffold doesn't override it), which
already clears `localStorage` before every test; Playwright's per-test browser context does the
same. So "wrote a `beforeEach` clear" was never the discriminator it reads as, and adding
Playwright doesn't weaken anything — it exposes something already true.
**Confirm first** with a throwaway two-test spec (test 1 books, test 2 asserts zero sessions),
then re-base Area 7 on what still discriminates:

- Did they **state** the isolation model and where it does *not* save them — accumulation
  within a single test, `page.reload()` / second `cy.visit`, the `aceup.seed` key surviving a
  partial clear, and (Playwright) a reused `storageState` or serial-mode describe?
- Are results **identical across three runs**, with known-defect failures failing consistently?
- Zero hard sleeps in either dialect.

**Bonus signals to add:** ran the suite on a second engine (`--project=webkit`) and *interpreted*
the difference rather than claiming coverage; used `page.route` / `cy.intercept` to force the
injected 4th-booking 500 deterministically instead of booking three times first.

### 6.3 `homework-evaluation/scorecard.md`

- Header: **Framework:** ☐ Cypress ☐ Playwright
- §2 title row 1: `npm install clean` → "`make test FRAMEWORK=… SEED=…` runs clean from a cold
  checkout"
- §2: `grep "cy.wait(<number>)"` row → "hard sleeps (see equivalence table)"; add a
  `test.fail` / `test.fixme` row
- §3: Area 5 retitled to match `criteria.md`

### 6.4 `homework-evaluation/reference/`

- `logic-harness.mjs` — **unchanged** (pure Node, no framework).
- `verify.internal.cy.js` — unchanged; stays the app's ground truth.
- `verify.internal.spec.js` — **new**, the 11-assertion Playwright port. The `fx_*` self-skip
  helper becomes `if (!(await app.flag('fx_b1'))) test.skip()`. The one intentional
  `cy.wait(2500)` in the B4 case becomes `page.waitForTimeout(2500)`, with the same
  "harness only: prove the state never recovers" comment.
- `reference/README.md` — third row in the harness table, run commands for both, plus the
  existing "never ship this into a bundle" rule extended to the new file. Also note that a
  *native* Playwright run needs `npx playwright install chromium` (the same footnote the
  stubbed local Cypress cache already has).

### 6.5 `homework-evaluation/MANUAL-VERIFICATION.md`

The "run this first" block gains the two Playwright commands; Part 3 (UX/a11y, human) is
unchanged. Sign-off gains: "Playwright verifier 11/11 on seeds 1000 + 1234".

---

## 7. `tools/bundle.sh` and the seed ledger

The bundler is the riskiest file to touch — it is the only thing standing between
`homework-evaluation/` and a candidate. Changes:

- **Allow-list** gains `docker/` (for `playwright.Dockerfile`). Keep it an allow-list.
- **`FRAMEWORK`** arg (`both` default, validated against `cypress|playwright|both`); copy only
  the requested scaffold(s); `die` on anything else.
- **New stamp targets:** `homework/starter-playwright/playwright.config.js`
  (`process.env.SEED || '1000'`) and `homework/starter-playwright/README.md`. Each gets its own
  `grep -q … || die` guard, matching the existing style — that guard is what catches a scaffold
  change silently breaking the stamp.
- **Prune** `node_modules/`, `test-results/`, `playwright-report/`, `blob-report/`,
  `.last-run.json` from both scaffolds (today it prunes only Cypress artefacts).
- **Extend** the final stale-seed sweep (`grep -rn '1234'`) to the new paths — it already
  globs `$STAGE/homework`, so the new scaffold is covered once it lives there, but the assertion
  message should name it.
- **Record the framework** in the ledger row.

`seeds.md` + `seeds.example.md`: new **Framework** column (`both` for most rows). Note the
existing 6-column-vs-2-column `awk` guard in `bundle.sh` keys on `NF>=7` — adding a column
shifts that to `NF>=8` **and shifts the seed field from `$3`**. Easy to miss; it would silently
stop detecting reused seeds.

`README.md` (internal): layout table gains `docker/`, both starters, the new verifier; "Sending
it out" and "Local run" gain `FRAMEWORK=`.

`PLAN.md`: append a short §9 recording the dual-runner decision and linking here, keeping
PLAN.md as the single narrative of *why the assessment is shaped this way*.

---

## 8. `package-lock.json` blocker

`homework/starter/.gitignore` currently ignores `package-lock.json`, so no lockfile is committed
(the file exists locally and only reaches candidates because `bundle.sh` does a `cp -R`). D4's
image build needs `npm ci`, which **requires** a committed lockfile. So:

- un-ignore `package-lock.json` in **both** scaffolds and commit them
- keep ignoring `node_modules/` and the artefact dirs

Without this, the Playwright image build is not reproducible.

---

## 9. Verification plan (definition of done)

1. `node homework-evaluation/reference/logic-harness.mjs` → **24/24** (regression guard: the app
   must be untouched).
2. `make start`; `make test FRAMEWORK=cypress SEED=1000` → smoke **2/2**; same for
   `FRAMEWORK=playwright`.
3. Copy each internal verifier into its scaffold; run **4 combinations** (2 frameworks ×
   seeds 1000, 1234) → **11/11** each. This is what proves the Playwright path can express
   every assertion we ask a candidate for.
4. Run each scaffold's smoke **3× consecutively** → byte-identical results. We impose this on
   candidates; we should pass it ourselves.
5. Confirm the isolation question from §6.2(b) with the throwaway two-test spec, in both
   frameworks, and record the answer in `criteria.md`.
6. `make bundle SEED=<unused> CANDIDATE=zz-test FRAMEWORK=both`; unzip and assert:
   no `homework-evaluation/`, no `seeds.md`, no `PLAN*.md`, no `tools/`, no `node_modules/`,
   no `verify.internal.*`; seed stamped in **all** targets; zero stale `1234`; `make test` green
   for both frameworks *from the unzipped directory*. Then remove the `zz-test` row from
   `seeds.md`. Repeat once with `FRAMEWORK=playwright` to prove single-framework bundling.
7. `make clean` removes every artefact dir from both scaffolds.

---

## 10. Phasing and effort

| Phase | Work | Est. |
|--:|---|---|
| 0 | Confirm D1–D6; rename `starter/` → `starter-cypress/`; fix §8 lockfile; everything still green | 0.5 h |
| 1 | Playwright scaffold, Dockerfile, compose service, Makefile dispatch → smoke green in Docker | 2–3 h |
| 2 | `verify.internal.spec.js` → 11/11 on both seeds | 2 h |
| 3 | Candidate docs: `assignment.md`, `START-HERE.md`, both starter READMEs | 1.5 h |
| 4 | Grading: `criteria.md` equivalence table + Area 5/7 rework, `scorecard.md`, `MANUAL-VERIFICATION.md`, `reference/README.md` | 1.5 h |
| 5 | `bundle.sh` + seed-ledger column (mind the `awk` field shift) + bundle smoke test | 1 h |
| — | **Total** | **~9–10 h** |

Phases 1 and 2 are the only ones that can fail in interesting ways. Phases 3–5 are mechanical
but 5 is the one where a mistake leaks the answer key, so it gets the §9.6 check.

---

## 11. Open questions

1. **D2 — both scaffolds, or one per candidate?** Recommendation is both (framework choice is
   itself signal, and it costs us nothing at bundle time). Cheap to reverse: it's one flag.
2. **D5 — full Playwright verifier port, or smoke-only?** Recommendation is full. Smoke-only
   saves ~2 h now and costs us the confidence that the Playwright path can express A2/B1/B3/B4
   at all.
3. **Does the framework choice belong in the brief or in the invitation email?** The seed already
   travels by email; framework could too, if we ever want to force one for a specific role.
4. **Timebox** stays 1 day. Choosing a framework adds no work for a candidate who already has
   one — but it does add a decision, and the brief should make it a 10-second decision.

---

## 12. Pre-existing findings surfaced by this review (worth fixing regardless)

- `criteria.md` Area 7's "fails on run 2" `localStorage` trap is very likely **inert** under
  Cypress's default `testIsolation: true` — §6.2(b).
- `assignment.md` §2.1 conflates "specs" (files) with test cases — §5.
- No committed lockfile in the starter scaffold — §8.
- `bundle.sh`'s duplicate-seed detector is positional (`NF>=7`, field `$3`) and will break
  silently the next time a column is added to `seeds.md` — §7.

---

## 13. Implementation record

Landed on `main` in one pass. All 12 sections above were implemented; the deviations below are
the parts reality argued with.

### Deviations from the plan

**1. Chromium cannot reach the app container — the one real surprise.** The plan assumed the
Playwright service would talk to nginx as `http://app`, exactly like the Cypress service. It
cannot: under Docker Desktop, Chromium's network process fails **every** request with
`ERR_CONNECTION_REFUSED` — the app container, a raw container IP, even `example.com` — while
`curl` from the same container returns 200 and WebKit from the *same image* loads
`http://app` fine. Loopback is unaffected. Diagnosis and dead ends, so nobody repeats them:

| Tried | Result |
|---|---|
| `--no-sandbox`, `chromiumSandbox: true/false`, `--cap-add=SYS_ADMIN`, `--user pwuser` | no change |
| `seccomp=unconfined`, `--ipc=host`, `--disable-seccomp-filter-sandbox`, `--no-zygote` | no change |
| `--disable-features=NetworkSandbox,NetworkServiceSandbox`, `--enable-features=NetworkServiceInProcess` | no change |
| `proxy: { server: 'direct://' }` | `ERR_PROXY_CONNECTION_FAILED` |
| raw `chrome-headless-shell` with Playwright's **exact** 42-arg command line | **works** — so it is not an argument |
| loopback under Playwright | **works** |

Fix: the `playwright` service uses `network_mode: "service:app"` and reaches the same nginx on
`http://localhost`. One line, no extra static server, identical server for both frameworks.
Recorded in `reference/README.md` so a future failure to connect gets checked there first.

**2. The `seeds.md` column-shift risk in §7 did not materialise.** `bug-catalog`'s duplicate-seed
detector keys on `NF>=7` and reads field `$3`; adding a **Framework** column as the *fourth*
column leaves Seed as the second, so `$3` is still the seed and a 7-column row still gives
`NF=9`. Left as-is, with a comment, plus a new post-insert guard that fails loudly if the
ledger row does not actually land.

**3. Two guards added that the plan did not call for**, both in `tools/bundle.sh`:
- it refuses to build if a `verify.internal.*` file is sitting in a scaffold (the bundler
  copies scaffolds wholesale, so a leftover verifier *would* ship the answer key)
- a single-framework bundle now also strips the unused **compose service**, not just the
  scaffold — otherwise a `FRAMEWORK=cypress` bundle kept a `playwright` service pointing at a
  `docker/` directory that had just been deleted

**4. The Playwright seed default lives in `playwright.config.js` (`use.seed`), not in the
fixture.** It started in `tests/support/fixtures.js`, which worked but hid the one value a
candidate is most likely to want to change — and put the bundler's stamp target somewhere
non-obvious. Moving it mirrors Cypress's `env.seed`: same place, same purpose, one stamp.

**5. §5's "6–10 specs" ambiguity fixed as planned**, now "6–10 test cases, across at most 5
files".

### Verification results

| Check | Result |
|---|---|
| `logic-harness.mjs` (app unchanged) | **24/24** |
| `verify.internal.cy.js`, seed 1000 / 1234 | **11/11** / **11/11** |
| `verify.internal.spec.js`, seed 1000 / 1234 | **8 passed + 3 correctly skipped** / same |
| Tier B activation matches the ledger per seed | yes — 1000 → B1/B2/B5, 1234 → B3/B4/B6, on both runners |
| Cypress smoke, 3 consecutive runs | identical (2/2 each) |
| Playwright smoke, 3 consecutive runs | identical (2/2 each) |
| State-isolation probe (book in test 1, assert 0 in test 2) | passes untouched on **both** — §6.2(b) confirmed |
| `make test` with both scaffolds and no `FRAMEWORK` | refuses, prints both commands, exits non-zero |
| Bundle `FRAMEWORK=both` | no `homework-evaluation/`, `seeds.md`, `PLAN*.md`, `tools/`, `node_modules/` or `verify.internal.*`; seed stamped in all 7 targets; no stale `1234`; both suites green from the unzipped dir |
| Bundle `FRAMEWORK=playwright` | Cypress scaffold **and** service dropped; `FRAMEWORK` stamped; bare `make test` green |
| Bundle `FRAMEWORK=cypress` | Playwright scaffold, service **and** `docker/` dropped; bare `make test` green |

`seeds.md` was restored after the bundle tests — the `zz-test` / `zz-pw` / `zz-cy` rows are gone
and seeds 9057, 3391 and 5573 remain unassigned.

### Still open

§11's questions 3 and 4 (whether the framework should ever be forced per role via the
invitation email; timebox unchanged at 1 day) are unchanged and unblocked — `FRAMEWORK=` on
`make bundle` is the mechanism if we ever want it. The dogfood pass in `PLAN.md` §7 step 10 is
still outstanding, and now has two paths to walk rather than one.
