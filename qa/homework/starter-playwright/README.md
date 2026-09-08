# Playwright starter — AceUp QA assessment

Minimal, working Playwright setup for the assignment. Extend it; you may restructure it
if you explain why in your `TEST_PLAN.md`.

The suite uses a small Page Object Model under `tests/pages/`. The page objects keep
selectors and booking mechanics out of test cases, while `BookingFormPage.bookSession`
accepts the coach, duration, date, and time as reusable inputs. Date and time default to
the next available option, and the helper validates the supported duration enum and the
seven-day date window.

There is a Cypress scaffold next door in `../starter-cypress/`. **Pick one** — do not
submit both.

## Run it (Docker — nothing to install)

From the **bundle root**, two levels up:

```bash
make test FRAMEWORK=playwright                                  # all specs, headless
make test FRAMEWORK=playwright SEED=1234                        # against your seed
make test FRAMEWORK=playwright ARGS="tests/e2e/smoke.spec.js"   # one spec
make test FRAMEWORK=playwright ARGS="--grep booking"            # by title
make test.open FRAMEWORK=playwright                             # UI mode (needs local Node 20+)
```

The container mounts this folder, so it always runs your current working copy.
**`make test FRAMEWORK=playwright` is what we run when reviewing your submission** — make
sure it passes there, and put that exact command in your `README.md`.

The runner image bakes in `npm ci`, so you never need a local `npm install` for the Docker
path. If you **add a dependency** to `package.json`, rebuild it once:

```bash
docker compose build playwright
```

## Run it natively (optional)

Needs Node 20+:

```bash
npm install
npx playwright install chromium   # one-time browser download
npm run pw:run                    # headless (serves ../../app for you)
npm run pw:open                   # UI mode
SEED=1234 npm run pw:run
```

Natively, `playwright.config.js` starts a static server for `../../app` itself via
`webServer`. In Docker, `BASE_URL` is set to the app container and that block is skipped —
keep using relative paths and `app.goto()` and it works both ways.

## Your seed

The suite reads it from the `seed` fixture, which `playwright.config.js` fills from
`process.env.SEED`. `make test SEED=…` and `SEED=… npm run pw:run` both set it; you can also
edit `use.seed` in `playwright.config.js`.

## What's provided

- `playwright.config.js` — `baseURL`, **`retries: 0`** (deliberate: we want to see a
  deterministic suite, not one propped up by retries), `workers: 1` and
  `fullyParallel: false` (raise them if you want, but say why in your `TEST_PLAN.md`),
  `forbidOnly: true`, `testIdAttribute: 'data-testid'` so `page.getByTestId()` matches the
  app, trace on failure, video off.
- `tests/support/fixtures.js` — an `app` fixture with:
  - `app.goto(path, query?)` — visits a page with your seed applied
  - `app.sessions()` — the app's own session state, for state-based assertions
  - `app.flag(name)` — reads a build flag
  - `app.reset()` — clears the app's `localStorage` keys (needs a reload to take effect)
- `tests/e2e/smoke.spec.js` — two passing tests so you can verify the setup.

## Things worth knowing

- The app stores booked sessions in `localStorage` (`aceup.state.<seed>`), so state
  survives page loads. Playwright gives each test a fresh browser context, so it does
  **not** survive between tests — but it does accumulate **within** one test, and across
  `page.reload()`. How you deal with that in a test suite is your call, and we would like
  to read your reasoning.
- The fake API adds 200–900 ms of latency to every request. Use web-first assertions
  (`await expect(locator).toHaveText(…)`) rather than timeouts.
- Some elements have `data-testid`, others do not. Note anywhere the app made you write
  a selector you are not happy with — that feedback is part of what we grade.
- `page.waitForTimeout()` is **not** an acceptable synchronisation mechanism here. There is
  exactly one legitimate use (proving that something never happens) and if you need it,
  say so in a comment.
