# Task: ARCH.04.09

## Task

- ID: `ARCH.04.09`
- Objective: Guard `/match` so gameplay can only be entered through an explicit Home navigation.
- Why: A direct URL or browser refresh should return to the start screen instead of opening or resuming gameplay implicitly.
- Scope: web route state, Home/Match navigation, match transition helpers, unit tests, browser E2E, and browser-entry documentation.
- Non-goals: authentication, server persistence, protocol changes, resume-token changes, or gameplay behavior.

## Read first

- `docs/engineering-standard.md`
- `docs/specs/SPEC-browser-client.md`
- `docs/tasks/done/ARCH.04.08.md`
- `apps/web/src/pages/home/home-page.tsx`
- `apps/web/src/pages/match/match-page.tsx`
- `apps/web/src/shared/transport/resume-token.ts`
- `tests/e2e/match/session-entry.spec.ts`

## Contract

- Home is the only valid producer of a match-entry navigation state.
- `Continue match`, `New match`, legacy query migration, and internal match
  transitions use the typed one-shot entry state.
- `MatchPage` accepts the entry state once and consumes it with a replace
  navigation before a refresh can reuse it.
- `/match` without the entry state redirects to `/` without opening gameplay
  transport. A missing stored session still uses the existing
  `match-required` notice when reached through a valid Home entry.
- A browser refresh after the entry state is consumed redirects to `/`. Home
  reads the existing `sessionStorage` record and offers `Continue match`.
- The entry state contains no resume token and is not an authentication or
  server-authority boundary. The server continues to validate resume tokens.
- The state is a typed React Router boundary value. Malformed or unrelated
  route state is rejected.
- The existing `match_release` and session-storage lifecycle remain unchanged.

## Design

- `match-entry-state.ts` owns the typed state shape and runtime guard.
- Home owns creation of valid entry state; MatchPage owns acceptance and
  one-time consumption.
- Match session actions route through the same navigation contract so scenario,
  aggression, sprite, and replacement transitions do not bypass the guard.
- The state guard uses `isRecord` and `field` at the browser boundary and a
  closed `as const` source value. No loose domain string or unsafe cast is
  introduced.

## Tests and validation

```bash
corepack pnpm --filter @rts/web run typecheck
corepack pnpm exec vitest run tests/unit/web/match-entry-state.test.ts
E2E_WEB_PORT=5174 E2E_SERVER_PORT=8081 corepack pnpm run test:e2e:focused tests/e2e/match/session-entry.spec.ts --list
E2E_WEB_PORT=5174 E2E_SERVER_PORT=8081 corepack pnpm run test:e2e:focused tests/e2e/match/session-entry.spec.ts
corepack pnpm run verify
```

Expected E2E count: `14` across Chromium and Firefox.

## Player-facing completion

- [x] The player can reach a match through Continue match or New match from Home.
- [x] The player is returned to Home after refreshing `/match`.
- [x] Direct `/match` navigation is blocked without opening gameplay transport.
- [x] The real server path is covered by browser E2E.

## Acceptance and stop conditions

- [x] Valid Home navigation remains functional for resume and new-match flows.
- [x] Direct and refreshed match routes redirect to Home.
- [x] Internal match transitions preserve the entry contract.
- [x] Required tests and validation pass.
- [x] No public API, server authority, or deterministic contract regressed.
- [x] Do not remove the entry marker without replacing this contract and its E2E coverage.

## Completion report

DONE. The route guard, session-entry regression coverage, browser-entry
documentation, and postmortem are complete. The 14-case Chromium/Firefox
session-entry suite passed, the related route/HUD/transport browser suite had
33 passing tests and 1 intentional skip, and `corepack pnpm run verify` passed.
