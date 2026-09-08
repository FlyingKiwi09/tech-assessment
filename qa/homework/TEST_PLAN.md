# Test Plan

## Scope

This plan covers the pre-release e2e tests for the AceUp Console: dashboard session
visibility, coach discovery, booking, My Sessions management, and AI coach chat. The
highest-value checks are:

- a booking is created with the selected coach/date/time and duration,
- rescheduling changes the existing booking rather than creating or losing
  one
- Ally Chat returns a usable response to a member message

The submitted automated suite uses Playwright and currently contains seven end-to-end
checks across booking, cancellation, and rescheduling. It uses build seed `7391`
and runs with:

```bash
make test FRAMEWORK=playwright SEED=7391
```

## Automated Versus Manual

Automated coverage focuses on repeatable state transitions and outcomes:

- a booking round trip, including persistence in My Sessions and the selected details;
- an aborted booking that must not create a session;
- slot availability after booking and cancellation;
- cancellation status and rescheduling, including an aborted reschedule.

These checks are automated because they are high-value regression paths. The suite verifies the
resulting session rather than trusting a success toast.

I have kept lower‑impact and lower‑risk flows manual for now, in order to prioritize higher‑risk areas.

However, the following are **still high‑risk and high‑priority candidates for automation**:

- **Date/time formats persisting across screens**
- **AI chat round‑trip validation**

## Testability Gaps

Some controls lack `data-testid` attributes, and a newly created booking has no visible stable identifier,
which makes it difficult to distinguish one session from another. I would
ask engineering to add stable IDs to all interactive controls and session rows, expose a
booking ID in the UI or test DOM.

For chat, I would request a documented response schema and controllable success, error, and
latency modes. I would also ask for a clock/timezone test hook. Those changes would make the remaining functional,
accessibility, and timezone checks more reliable without weakening their assertions.

## Risk Assessment

I would regression-test these three areas first on every release, in this order:

1. **Booking integrity** — highest impact and likely to affect many members. A wrong
   selected time, incorrect duration, duplicate booking, or stale availability can cause a
   member to miss a paid or important coaching session. Verify the selected slot across the
   booking confirmation and My Sessions, then verify availability and stored state.
2. **Rescheduling and cancellation** — high impact because these change an existing
   commitment. Verify that rescheduling preserves the booking identity and updates only the
   requested details; cancellation must update status, dashboard counts, and release the
   original slot without leaving misleading upcoming-session data.
3. **AI coach chat** — high likelihood of user interaction and trust impact. Verify that a
   message is sent once, the reply is associated with the correct conversation, loading and
   error states recover, and empty/overlong input is handled. A silent failure or misleading
   coaching response can make the primary product experience appear broken.

## Next With More Time

I would add dedicated chat tests with mocked success/error/slow responses, timezone and boundary-date cases, and a small cross-browser/mobile matrix.
