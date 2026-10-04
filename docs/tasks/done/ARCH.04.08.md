# Task: ARCH.04.08

## Task

- ID: `ARCH.04.08`
- Objective: Separate the browser start screen from gameplay and make match continuation, replacement, and release explicit.
- Why: Loading the root route currently creates a gameplay session implicitly, making refresh, abandonment, and session ownership ambiguous.
- Scope: Web routing, home and match pages, browser session persistence, release transport, server runtime lifecycle, protocol contracts, unit tests, and browser E2E.
- Non-goals: Authentication, multiplayer rooms, lobby matchmaking, persistent server storage, gameplay-rule changes, and visual redesign of the match screen.

## Read first

- `docs/engineering-standard.md`
- `docs/architecture.md`
- `docs/specs/SPEC-browser-client.md`
- `docs/specs/SPEC-session-server.md`
- `apps/web/src/routes/router.tsx`
- `apps/web/src/shared/transport/connection.ts`
- `apps/server/src/transport/client-connection.ts`
- `tests/e2e/match/session-entry.spec.ts`

## Contract

- `/` renders the start screen and never opens a gameplay WebSocket by itself.
- `/` with `scenario`, `aggression`, `sprites`, or `map` query parameters preserves the legacy direct-entry flow by redirecting to `/match?...&new=1`.
- `/match` resumes the valid browser session stored in `sessionStorage`; without one it redirects to `/?notice=match-required`.
- `/match?new=1` starts a new session. If a stored session exists, the client sends `match_release` first and only continues after the previous runtime is released.
- The start screen presents `Continue match` and `New match` when a session exists. New match requires confirmation and visibly reports release failure.
- Session storage uses `rts-idle.match-session`, version `1`, containing the resume token, match request, and sprite preference. The legacy `rts-idle.resume-token` key is mirrored and cleared during the transition.
- A successful initial match handshake persists the session and removes the transient `new=1` URL marker, so refresh cannot implicitly create another match.
- `match_release` accepts a resume token and returns whether a runtime was released; the server closes the release socket after the result.
- Running disconnected sessions retain their authoritative ticker indefinitely by default (`DISCONNECTED_MATCH_RETENTION_MS = null`), while terminal sessions retain for `TERMINAL_RETENTION_MS` and explicit release removes them immediately.
- Resume configuration fingerprints remain authoritative; mismatches and unknown tokens are rejected without creating a replacement runtime.

## Design

- `HomePage` owns start-screen decisions and confirmation UI; `MatchPage` owns route guards and launch selection; `useMatchSession` continues to own active gameplay lifecycle.
- Browser transport and storage remain in `shared/transport`; the protocol owns typed release messages and guards; the server remains the only runtime owner.
- Closed message types use explicit interfaces and runtime guards. No gameplay state or mutable simulation reference crosses the browser transport boundary.
- The change is a small route/lifecycle slice with dedicated release, URL-marker, and session-storage helpers rather than adding a generic navigation abstraction.

## Tests and validation

```bash
corepack pnpm run test:e2e:focused tests/e2e/match/session-entry.spec.ts --list
corepack pnpm run test:e2e:focused tests/e2e/match/session-entry.spec.ts
corepack pnpm run verify
```

Expected E2E count: `10` for `session-entry.spec.ts` across Chromium and Firefox.

## Player-facing completion

- [x] The player can reach the start screen at `/` without opening gameplay.
- [x] The player can continue or deliberately replace a stored match.
- [x] Progress, confirmation, missing-session, and release-error states are visible.
- [x] The real server path is covered by browser E2E.

## Acceptance and stop conditions

- [x] Each route and session transition is covered.
- [x] Existing route, HUD, transport recovery, and editor playtest flows remain covered.
- [x] Required repository verification and build gates pass.
- [x] No public API, architecture boundary, or deterministic contract regressed.
- [x] Stop without adding lobby, authentication, or unrelated gameplay work.

## Completion report

PASS. Implemented explicit `/` and `/match` entry lifecycle, versioned browser
session persistence, `match_release`, indefinite disconnected retention by
default, confirmation/error UI, and regression coverage. `verify` passed under
Node 24; the dedicated session-entry E2E passed 10/10 in Chromium and Firefox.
The serial `test:e2e:fast` fallback was attempted but exceeded its 20-minute
local timeout after an unrelated intermittent Firefox construction case; that
case passed in isolated Chromium and Firefox retries.
