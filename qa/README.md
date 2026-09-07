# QA take-home assessment (internal)

Take-home for the **QA Engineer** role: a purpose-built web app with planted defects, an
exploratory-testing + reporting brief, and an automation brief the candidate completes in
**either Cypress or Playwright** (their choice — see [`PLAN-dual-runner.md`](./PLAN-dual-runner.md)).
Candidate timebox is **1 day**.

## Layout

| Path | Ships to candidate? | What it is |
|---|:---:|---|
| `PLAN.md` | no | design rationale, defect design, build order |
| `PLAN-dual-runner.md` | no | why there are two scaffolds, and how the rubric stays framework-neutral |
| `START-HERE.md` | **yes** | candidate quickstart (Docker-only) |
| `Makefile` | **yes** | `make start` / `make test FRAMEWORK=…` / `make stop` |
| `docker-compose.yml` | **yes** | nginx app on :4173 + `cypress/included:15.8.1` and Playwright runners |
| `docker/playwright.Dockerfile` | **yes** | Playwright runner image (bakes `npm ci` in, so no local Node) |
| `app/` | **yes** | the system under test (static site, no backend, seed-driven) |
| `homework/assignment.md` | **yes** | the candidate brief |
| `homework/starter-cypress/` | **yes** (without `node_modules/`) | working Cypress scaffold |
| `homework/starter-playwright/` | **yes** (without `node_modules/`) | working Playwright scaffold |
| `homework-evaluation/bug-catalog.md` | **no** | ground truth: every planted defect + seed→defect map |
| `homework-evaluation/criteria.md` | **no** | rubric, weights, grading procedure |
| `homework-evaluation/scorecard.md` | **no** | fill-in scorecard |
| `homework-evaluation/MANUAL-VERIFICATION.md` | **no** | pre-send checklist |
| `tools/bundle.sh` | **no** | one-candidate bundler: stamps the seed in, records the assignment |
| `homework-evaluation/reference/` | **no** | verification harnesses: `logic-harness.mjs` (plain `node`), `verify.internal.cy.js` (Cypress) and `verify.internal.spec.js` (Playwright) |

## Sending it out

```bash
make bundle SEED=2417 CANDIDATE=candidateName                        # both scaffolds (default)
make bundle SEED=2417 CANDIDATE=candidateName FRAMEWORK=playwright   # force one
```

That is the whole hand-out path. It refuses to run without `SEED` and `CANDIDATE`, refuses
seed `1000` (the app default — a candidate with no seed lands on it silently), refuses a seed
already present in `seeds.md`, refuses a `FRAMEWORK` that is not `both`/`cypress`/`playwright`,
and refuses to build at all if an internal verifier has been left sitting in a scaffold. It
stamps the seed into `assignment.md`, `START-HERE.md`, the `Makefile`, `docker-compose.yml`
and both scaffold configs, appends the candidate's row to `seeds.md` (creating it from
`seeds.example.md` on first use), and writes the zip.

`FRAMEWORK=both` is the default and what we normally send — letting the candidate pick their
tool is itself signal, and the rubric grades both identically. Naming one drops the other
scaffold *and* its compose service, and stamps `FRAMEWORK` as the Makefile default so a bare
`make test` is correct for them.

Because the seed is stamped in, a bare `make start` is correct for that candidate — but
**still put the seed in the email**, and state it in the deliverables ask.

Pick the seed from the table in `homework-evaluation/bug-catalog.md`. If `app/` changed
since the last hand-out, verify it first:

```bash
node homework-evaluation/reference/logic-harness.mjs   # 24/24 expected
```

then walk the browser-only rows of `homework-evaluation/MANUAL-VERIFICATION.md`. If you
changed a **scaffold** or the Docker setup rather than `app/`, run the matching browser
verifier from `homework-evaluation/reference/README.md` instead.

In the email: the seed, the timebox (1 day), the deliverables list, and the deadline.

## Grading

Follow the procedure at the top of `homework-evaluation/criteria.md` (reproduce their bugs
from their steps → compute recall against their seed → run their suite three times → read
their test plan last), then fill in `scorecard.md`.

Note their framework first: `make test FRAMEWORK=<theirs> SEED=<their seed>`. The bars are
identical for both; the *framework equivalence table* in Area 7 says which construct means
what on each side, and Area 7 also carries the note on why "cleared `localStorage` in a
`beforeEach`" is no longer the discriminator it once looked like.

## Local run

Same commands the candidate gets:

```bash
make start SEED=1000                        # http://localhost:4173/index.html?seed=1000
make test  SEED=1000 FRAMEWORK=cypress
make test  SEED=1000 FRAMEWORK=playwright
make stop
```

The first Playwright run builds its image (pulls ~2.5 GB, then `npm ci`); later runs are
fast. Rebuild it with `docker compose build playwright` after changing that scaffold's
`package.json`.

Native fallback: `cd app && python3 -m http.server 4173 --bind 127.0.0.1`.
