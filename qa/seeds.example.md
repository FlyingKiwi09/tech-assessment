# Candidate seed assignments

Copy this file to `seeds.md` (git-ignored) and keep it private — the seed determines which
Tier B defects a candidate gets. Do not reuse a seed for two candidates in the same round.

| Candidate | Seed | Tier B active | Framework | Sent | Received | Reviewer |
|---|---|---|---|---|---|---|
| _example_ | 7391 | `fx_b1`, `fx_b5`, `fx_b6` | both | 2026-07-31 | | |

Available seeds (verified mapping, from `homework-evaluation/bug-catalog.md`):

| Seed | Tier B active |
|---|---|
| 1000 | `fx_b1`, `fx_b2`, `fx_b5` |
| 1234 | `fx_b3`, `fx_b4`, `fx_b6` |
| 2417 | `fx_b1`, `fx_b4`, `fx_b6` |
| 3391 | `fx_b2`, `fx_b3`, `fx_b5` |
| 4820 | `fx_b2`, `fx_b3`, `fx_b4` |
| 5573 | `fx_b3`, `fx_b4`, `fx_b5` |
| 7391 | `fx_b1`, `fx_b5`, `fx_b6` |
| 9057 | `fx_b1`, `fx_b3`, `fx_b4` |

Note: `1000` is the app default (used when no `?seed=` is present), so prefer the others for
real candidates.

**Framework** records which scaffold(s) they were sent: `both` (the default — they pick),
`cypress`, or `playwright`. Set it at bundle time with
`make bundle SEED=… CANDIDATE=… FRAMEWORK=…`. Rows sent before the Playwright path existed
are `cypress`.
