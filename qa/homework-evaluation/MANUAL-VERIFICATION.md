# Manual verification checklist (internal)

Purpose: confirm every planted defect reproduces before we send this to a candidate.

**All 8 functional defects are covered by automation — run that first (~1 min):**

```bash
cd tech-assessment/qa
node homework-evaluation/reference/logic-harness.mjs        # 24/24 expected

make start

# Cypress path — 11/11 expected on each seed
cp homework-evaluation/reference/verify.internal.cy.js homework/starter-cypress/cypress/e2e/
make test FRAMEWORK=cypress SEED=1000 ARGS="--spec cypress/e2e/verify.internal.cy.js"
make test FRAMEWORK=cypress SEED=1234 ARGS="--spec cypress/e2e/verify.internal.cy.js"
rm homework/starter-cypress/cypress/e2e/verify.internal.cy.js
rm -rf homework/starter-cypress/cypress/screenshots

# Playwright path — 8 passed + 3 skipped expected on each seed
cp homework-evaluation/reference/verify.internal.spec.js homework/starter-playwright/tests/e2e/
make test FRAMEWORK=playwright SEED=1000 ARGS="tests/e2e/verify.internal.spec.js"
make test FRAMEWORK=playwright SEED=1234 ARGS="tests/e2e/verify.internal.spec.js"
rm homework/starter-playwright/tests/e2e/verify.internal.spec.js
rm -rf homework/starter-playwright/test-results
```

Both browser harnesses cover the same 11 defects; run the Cypress one after any `app/`
change and **both** after any change to a scaffold or to the Docker setup. Playwright skips
the inactive Tier B cases where Cypress passes them fast — same meaning, different reporting.

If those are green, **every row in Parts 1 and 2 below is already verified** — keep them as
the written repro reference (they are the steps we use when grading a candidate's report),
and only re-walk them by hand if you changed the UI.

**Part 3 (UX/a11y) still needs a human** — keyboard, focus, contrast and viewport can't be
meaningfully asserted here. Budget ~10 minutes.

**Server:** `make start` from `tech-assessment/qa` (Docker; `make stop` when done)
**Reset between checks (browser console):**

```js
Object.keys(localStorage).filter(k => k.startsWith('aceup.')).forEach(k => localStorage.removeItem(k));
```

Two seeds cover all six Tier B defects:

- **Seed 1000** → `fx_b1`, `fx_b2`, `fx_b5`
- **Seed 1234** → `fx_b3`, `fx_b4`, `fx_b6`

Sanity check at any time: `Fx('fx_b3')` in the console returns the active state for the
current seed. Keep the console open throughout — **any uncaught JS error is a build bug on
our side**, not a planted defect.

---

## Part 1 — seed 1000

Open <http://127.0.0.1:4173/index.html?seed=1000>, reset storage, reload.

| # | Steps | Expect to see (defect present) | ✓ |
|---|---|---|---|
| A1 **✓ auto** | `booking.html?coach=c2` (Daniel Whitfield, UTC−5) → click an available time, note it (say **10:00 AM**) → Continue → modal shows the same time → Confirm | **My sessions** and the dashboard show **5:00 AM** (selected hour − 5) | ☐ |
| A2 | Reset → Booking (any coach) → pick a slot → Continue → click **Confirm booking** twice fast | **My sessions** lists **two** confirmed sessions, same coach/day/time | ☐ |
| A3 **✓ auto** | Reset → book a slot, note the hour → My sessions → **Cancel** → back to the same coach + day | that hour is still greyed out and unclickable, also after reload | ☐ |
| A4 | `chat.html` → type three spaces → Enter | an empty user bubble appears and Ally replies. Truly empty input does nothing | ☐ |
| A5 **✓ auto** | Reset → Booking → Continue → paste 400 characters into the notes field (no counter, no limit) → Confirm | My sessions shows the note cut at 280 chars, no warning | ☐ |
| B1 | `coaches.html` → Specialty = **Leadership** | "3 coaches found" but pager says **Page 1 of 3** and Next is enabled → Next shows non-Leadership coaches | ☐ |
| B2 **✓ auto** | Reset → book with **60 minutes** → My sessions shows "60 min" → **Reschedule** → pick another day/time → Save | row now reads **30 min**, no warning | ☐ |
| B5 **✓ auto** | Reset → Booking → Continue → guest = `alex@company` → Confirm | booking succeeds (session created) | ☐ |

Also confirm these are **not** active on seed 1000 (they belong to other seeds):
`Fx('fx_b3')`, `Fx('fx_b4')`, `Fx('fx_b6')` all return `false`.

---

## Part 2 — seed 1234

Open <http://127.0.0.1:4173/index.html?seed=1234>, reset storage, reload.

| # | Steps | Expect to see (defect present) | ✓ |
|---|---|---|---|
| B3 | Reset → complete **four** bookings in a row (the 4th request fails server-side) | 4th shows the toast **"Session booked!"** yet **My sessions has only 3** and the slot stays free | ☐ |
| B4 | `chat.html` → send **three** messages | on the 3rd, "Ally is typing…" never clears, input + send stay disabled, no error shown; only a reload recovers | ☐ |
| B6 **✓ auto** | Reset → book **two** sessions → Dashboard shows **2** → cancel one in My sessions → Dashboard | still shows **2** (also after reload) while the list and "Next session" are correct | ☐ |

---

## Part 3 — UX/a11y spot checks

| # | Check | Expect | ✓ |
|---|---|---|---|
| U1 | My sessions → click **Cancel** | cancels immediately, no confirmation, no undo | ☐ |
| U2 | Any toast | gone in ~1.2 s | ☐ |
| U3 | Booking → `Tab` through the page | slot tiles are never focused; cannot book by keyboard | ☐ |
| U4 | Booking → open the confirm modal → press `Escape`, click the backdrop, `Tab` repeatedly | modal never closes, focus escapes to the page behind it | ☐ |
| U5 | Booking → click a greyed-out time | nothing happens, no message | ☐ |
| U6 | Dashboard vs My sessions dates | `MM/DD/YYYY` vs `DD/MM/YYYY` | ☐ |
| U7 | Any screen | no timezone shown next to any time | ☐ |
| U8 | Coaches → Search = `zzzz` | "0 coaches found" and a blank area, no empty state | ☐ |
| U9 | Any list/grid while loading | no spinner or skeleton; content just appears after ~0.2–0.9 s | ☐ |
| U10 | Resize to 320 px wide | horizontal overflow, layout does not collapse | ☐ |

---

## Sign-off

| | |
|---|---|
| Verified by / date | |
| App commit | |
| `logic-harness.mjs` 24/24 | ☐ |
| All Tier A reproduce | ☐ |
| All Tier B reproduce (seeds 1000 + 1234) | ☐ |
| Cypress verifier green on both seeds | ☐ |
| Playwright verifier green on both seeds | ☐ |
| Both scaffolds' smoke specs pass (`make test FRAMEWORK=… `) | ☐ |
| No uncaught console errors on any screen | ☐ |
| Candidate bundle contains only `app/`, `homework/`, `docker/`, `Makefile`, `docker-compose.yml`, `START-HERE.md` (no `node_modules/`, no `homework-evaluation/`, no leftover `verify.internal.*`) | ☐ |
