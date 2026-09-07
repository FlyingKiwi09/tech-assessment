# Start here

**Prerequisite: Docker.** That's it — no Node, no npm, no Cypress or Playwright install.

```bash
make start          # app on http://localhost:4173
make test FRAMEWORK=cypress      # or FRAMEWORK=playwright — see below
make stop
```

`make` on its own lists every command.

## 1. Your seed

Your assignment email contains a **build seed**. Use it everywhere:

```bash
make start SEED=1234        # prints the URL with your seed applied
make test  SEED=1234 FRAMEWORK=cypress
```

Then open the URL it prints, e.g. <http://localhost:4173/index.html?seed=1234>.

The seed makes the app **deterministic**: same seed, same data, same behaviour, every run.
The app remembers it while you navigate, so it only needs to be on the first URL you open.
Always state your seed in your report.

## 2. Pick your framework

Part 2 of the assignment is an automated suite. Two working scaffolds are provided, and you
extend **exactly one**:

| Scaffold | Framework |
|---|---|
| `homework/starter-cypress/` | Cypress 15 |
| `homework/starter-playwright/` | Playwright 1.63 |

Pick the one you would actually reach for at work — we have no preference, and there is no
hidden bonus for either. Say which you picked and why in your `TEST_PLAN.md`, and put the
exact run command in your submission `README.md`. **Do not submit both.**

Every `make test` command takes `FRAMEWORK=cypress` or `FRAMEWORK=playwright`. Once you
delete the scaffold you are not using, you can drop the flag.

## 3. What to read

| File | What it is |
|---|---|
| `homework/assignment.md` | **the brief** — start here |
| `app/README.md` | the app under test: screens, how to reset your data |
| `homework/starter-cypress/README.md` | the Cypress scaffold, if that's your pick |
| `homework/starter-playwright/README.md` | the Playwright scaffold, if that's your pick |

## 4. Running the tests

```bash
make test FRAMEWORK=cypress                                        # all specs
make test FRAMEWORK=cypress ARGS="--spec cypress/e2e/booking.cy.js"
make test FRAMEWORK=playwright ARGS="tests/e2e/booking.spec.js"
make test FRAMEWORK=playwright ARGS="--grep booking"
make test FRAMEWORK=playwright SEED=1234
```

The container mounts your scaffold folder, so it runs **your** specs from your working copy —
nothing to rebuild between runs. The one exception: if you add a dependency to
`package.json` on the Playwright path, rebuild the runner image once with
`docker compose build playwright`.

Want an interactive runner? Docker can't open a GUI, so that one path needs Node 20+ locally:

```bash
make test.open FRAMEWORK=cypress       # npm install + cypress open, natively
make test.open FRAMEWORK=playwright    # npm install + playwright --ui, natively
```

Everything else works with Docker alone, and `make test FRAMEWORK=<yours>` is what we will
run when we review your submission.

## 5. Resetting your data

Booked sessions live in the browser's `localStorage`. To get back to a clean slate, run this
in the browser console:

```js
Object.keys(localStorage).filter(k => k.startsWith('aceup.')).forEach(k => localStorage.removeItem(k));
```

## 6. Troubleshooting

| Symptom | Fix |
|---|---|
| `port is already allocated` | something else uses 4173 — stop it, or change the port mapping in `docker-compose.yml` |
| Empty coach list / empty slot grid | you opened the HTML file directly; the app must be served over HTTP (`make start`) |
| First `make test FRAMEWORK=cypress` is slow | it's pulling the Cypress image once (~1 GB); later runs are fast |
| First `make test FRAMEWORK=playwright` is slow | it's pulling the Playwright image (~2.5 GB) and building the runner once; later runs are fast |
| Playwright can't find a package you just added | `docker compose build playwright` — the image bakes `npm ci` in |
| `make test` says it won't guess your framework | pass `FRAMEWORK=cypress` or `FRAMEWORK=playwright` |
| Screenshots / `test-results/` owned by `root` after a failed run | expected on Linux hosts; `make clean` removes them |

If something looks broken in the **tooling** (not in the app), tell us — that's feedback we
want, and it doesn't count against you.
