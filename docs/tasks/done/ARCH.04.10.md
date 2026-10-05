# Task: ARCH.04.10

## Task

- ID: `ARCH.04.10`
- Objective: Return a finished match to Home before starting another match.
- Why: The result overlay currently waits for a release operation that can fail,
  leaving the New match action open and unable to start a new game.
- Scope: finished-match navigation, browser session cleanup, match-result E2E,
  browser-entry documentation, and bug tracking.
- Non-goals: active-match replacement behavior, protocol changes, simulation
  rules, server retention policy, or automatic dismissal of the result overlay.

## Read first

- `docs/engineering-standard.md`
- `docs/specs/SPEC-browser-client.md`
- `docs/tasks/done/ARCH.04.09.md`
- `apps/web/src/features/match/hooks/use-match-session.ts`
- `apps/web/src/features/match/components/match-overlay.tsx`
- `apps/web/src/pages/home/home-page.tsx`
- `apps/server/src/transport/client-connection.ts`
- `tests/e2e/match/hud-commands.spec.ts`

## Contract

- A `FINISHED` match keeps its result overlay visible until the player chooses
  `New match`.
- `New match` from a finished result clears the browser session state and
  navigates to `/` without waiting for `match_release`.
- Home must not offer `Continue match` for the finished session.
- `New match` from Home enters the existing `/match?new=1` flow through the
  typed Home entry state and starts a fresh server session.
- New match from an active session keeps its existing confirmation, release,
  error, and replacement behavior.
- The server's existing terminal retention disposes of the finished runtime;
  this task does not change server authority or retention.

## Design

- `useSessionActions` distinguishes finished-match navigation from active-match
  replacement using the existing `matchEndedRef`.
- Finished navigation clears the existing browser resume record and uses a
  replace navigation to Home. No new abstraction or protocol message is added.
- The regression uses the real server and the existing surrender/result flow so
  it verifies visible feedback, browser storage, route state, and fresh-session
  creation together.

## Tests and validation

```bash
E2E_WEB_PORT=5174 E2E_SERVER_PORT=8081 corepack pnpm run test:e2e:focused tests/e2e/match/hud-commands.spec.ts --list
E2E_WEB_PORT=5174 E2E_SERVER_PORT=8081 corepack pnpm run test:e2e:focused tests/e2e/match/hud-commands.spec.ts
corepack pnpm run verify
```

Expected focused E2E count: `6` across Chromium and Firefox.

## Player-facing completion

- [x] The result overlay remains visible after the match finishes.
- [x] The player can return to Home with `New match`.
- [x] Home hides `Continue match` for the finished session.
- [x] The player can start a fresh match from Home through the real server.

## Acceptance and stop conditions

- [x] Finished-match New match never remains blocked by release failure.
- [x] Active-match replacement behavior is unchanged.
- [x] Permanent browser regression coverage passes.
- [x] Required tests, build, architecture, and E2E validation pass.
- [x] No public API, server authority, or deterministic contract regressed.
- [x] Stop without changing terminal retention or unrelated match UX.

## Completion report

DONE. Finished-match `New match` clears the local terminal session and returns
to Home without waiting for `match_release`; Home then starts the next session
through the existing entry contract. The focused HUD command suite passed all
6 Chromium/Firefox cases and `corepack pnpm run verify` passed.
