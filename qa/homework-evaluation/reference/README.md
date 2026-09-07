# Internal verification (do not ship to candidates)

Three harnesses, in increasing cost:

| Harness | Needs | Covers |
|---|---|---|
| `logic-harness.mjs` | plain `node` | API-layer defects: **A1, A3, A5, B2, B5, B6**, the deterministic failure injection (booking #4, chat #3), slot seeding, and that inactive flags behave correctly |
| `verify.internal.cy.js` | the Cypress runner | everything above **plus** the UI-layer defects that need a browser: **A2, A4, B1, B3, B4** |
| `verify.internal.spec.js` | the Playwright runner | the same 11 assertions, through the Playwright scaffold — this is what proves the Playwright path can express everything we ask a candidate for |

## Logic harness (fast, run this after any `app/` change)

```bash
cd tech-assessment/qa
node homework-evaluation/reference/logic-harness.mjs   # expect 24/24 checks passed
```

It loads `app/assets/js/{seed,flags,store,api}.js` in a VM with stubbed
`window`/`localStorage`/`fetch` and latency removed, and runs both seed 1000 and 1234.

## Browser harnesses (Docker — nothing to install locally)

Both assert that every planted defect still reproduces end-to-end. Tier B assertions
self-skip when the flag is not active for the seed under test.

```bash
cd tech-assessment/qa
make start

# Cypress
cp homework-evaluation/reference/verify.internal.cy.js homework/starter-cypress/cypress/e2e/
make test FRAMEWORK=cypress SEED=1000 ARGS="--spec cypress/e2e/verify.internal.cy.js"   # B1/B2/B5
make test FRAMEWORK=cypress SEED=1234 ARGS="--spec cypress/e2e/verify.internal.cy.js"   # B3/B4/B6
rm homework/starter-cypress/cypress/e2e/verify.internal.cy.js
rm -rf homework/starter-cypress/cypress/screenshots

# Playwright
cp homework-evaluation/reference/verify.internal.spec.js homework/starter-playwright/tests/e2e/
make test FRAMEWORK=playwright SEED=1000 ARGS="tests/e2e/verify.internal.spec.js"       # B1/B2/B5
make test FRAMEWORK=playwright SEED=1234 ARGS="tests/e2e/verify.internal.spec.js"       # B3/B4/B6
rm homework/starter-playwright/tests/e2e/verify.internal.spec.js
rm -rf homework/starter-playwright/test-results
```

Two seeds cover all six Tier B defects.

**Last run:**

| Harness | Seed 1000 | Seed 1234 |
|---|---|---|
| `logic-harness.mjs` | 24/24 | (same run) |
| `verify.internal.cy.js` | 11/11 passing | 11/11 passing |
| `verify.internal.spec.js` | 8 passing + 3 correctly skipped | 8 passing + 3 correctly skipped |

Cypress reports the inactive Tier B cases as fast passes (the flag check is inside the test
body); Playwright reports them as skips via `test.skip()`. Both mean the same thing — on each
seed, exactly the three Tier B defects in the ledger reproduce, and the other three do not.

**Always delete the spec from the starter afterwards** — it must never end up in a candidate
bundle. `tools/bundle.sh` copies the starters wholesale, so a leftover file *would* ship.

## Rules

- Never copy either verifier into a candidate bundle. Ship only `app/`, `homework/`,
  `docker/`, `Makefile`, `docker-compose.yml` and `START-HERE.md`.
- Re-run all three after any change to `app/` — together they are the regression suite for
  the assessment itself. After a change to either **scaffold** or to the Docker setup, re-run
  the corresponding browser harness too.
- `logic-harness.mjs` intentionally reads the app source directly, so it breaks loudly if the
  flag names or API shape change.

## Local environment notes

- The Cypress binaries cached under `~/Library/Caches/Cypress/*` on this machine are stubs
  (69 KB launcher, no Electron payload), so a *native* `npx cypress run` fails at startup.
  Use Docker, or repair the cache with `npx cypress install --force`.
- A *native* Playwright run needs `npx playwright install chromium` once. The Docker path
  needs nothing.
- **Why the `playwright` compose service uses `network_mode: "service:app"`.** Chromium's
  network process cannot reach a sibling container across the compose bridge under Docker
  Desktop — every request fails `ERR_CONNECTION_REFUSED` while `curl` from the same container
  succeeds, and WebKit in the same image works fine. Loopback is unaffected, so the service
  shares the app container's network namespace and talks to nginx on `http://localhost`.
  Cypress runs Electron and is not affected, which is why that service still uses
  `http://app`. If you ever see the Playwright suite fail to connect, check that
  `network_mode` is still there before suspecting the app.
