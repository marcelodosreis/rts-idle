# Engineering Standard — rts-idle

This is the project's technical source of truth. Read the relevant section
before changing code; do not load the entire document for a small task.

## Architecture

- The repository is a pnpm monorepo: `packages/`, `apps/`, `tools/`, `tests/`.
- Simulation is portable and deterministic; it imports no UI, transport, DOM,
  Node API, or renderer code.
- The server owns gameplay. Clients send commands and render observations.
- Only simulation `step()` and its systems mutate private `GameState`.
- Package dependency rules are enforced by architecture tests.

| Package | Responsibility | Allowed `@rts/*` imports |
|---|---|---|
| shared | deterministic primitives | none |
| game-data | declarative content | shared |
| pathfinding | grid and navigation | shared |
| protocol | wire messages and guards | shared |
| simulation | state, commands, systems, snapshots | shared, game-data, pathfinding |
| ai | decisions from observations | shared, game-data, simulation |
| renderer | PixiJS presentation | shared, protocol |
| server | authority, authored match content, and transport | shared, game-data, simulation, protocol, ai |
| web | UI, HUD, input, client | shared, protocol, renderer, audio |

## Code rules

- Organize by domain; keep modules cohesive and preferably below 400 lines.
- Use semantic names, strict TypeScript, no `any`, and validated external input.
- Prefer pure functions and immutable boundaries. The simulation mutability
  exception applies only to private state during `step()`.
- Preserve public APIs, canonical serialization, RNG math, system order, and
  deterministic tie-breaks unless the task explicitly changes the contract.
- Explain non-obvious algorithms with named helpers or a why-comment.
- Do not add speculative factories, generic utility dumping grounds, or new
  dependencies without justification.

### Web UI structure

`apps/web/src` uses kebab-case source filenames. React components use named
PascalCase exports, and each non-generated `.tsx` file exports one component.
Feature slices expose an explicit `index.ts` public API and use only the
segments they need: `components/` (React UI), `hooks/` (`use-*` hooks),
`services/` (stateful orchestration, controllers, I/O), `types/` (types and
typed registries), and `lib/` (pure helpers). Cross-slice imports use `@/` and
the target public API; relative imports are local to a slice. Generated
`apps/web/src/shared/ui/**` is exempt.

## Clean Code & SOLID

This section is the canonical source for code quality expectations. It applies
to every package and app; the always-loaded `.opencode/rules/common/coding-style.md`
mirrors the essentials for agents.

Clean code:

- Small, single-purpose functions (target ≤50 lines); files ≤400 lines
  (exempt: generated, vendored, and tests).
- Pure functions by default; no mutation outside the simulation `step()`
  exception. Prefer early returns over nesting.
- Named constants for every gameplay threshold, limit, or delay; no magic
  numbers. Decode functions fail closed on invalid input.
- No `any`; no speculative abstraction (YAGNI); extract only on real
  repetition (DRY).

SOLID, adapted to this repository:

- **SRP** — one responsibility per module, system, and command handler
  (validate vs mutate; project vs transport).
- **OCP** — extend by registering (a `ComponentType`, order tag, command
  variant, or `game-data` entry) instead of growing `if`/`switch` chains.
- **LSP** — every `ComponentType<T>` round-trips `encode`/`decode`; scenarios
  and spawns are interchangeable behind their contracts.
- **ISP** — narrow interfaces: handlers receive only the data they need;
  wire DTOs stay minimal.
- **DIP** — depend on pure helpers and ECS stores, not concrete globals.

### Typed domain strings

Domain string values are typed, never loose:

- Every closed set (command/order/message/event types, building types,
  statuses, unit kinds, order states, gather phases, tile/dressing/terrain
  kinds, input profiles, cancel reasons, routes, scenarios) is an `as const`
  registry with a derived union type, defined once.
- Runtime boundaries use type guards (`isRecord`/`field` from `@rts/shared`)
  that return typed values; no `as string`/`as unknown`, and no
  `Record<string, X>` for known key sets.
- Discriminated dispatch is exhaustive with `assertNever` from `@rts/shared`.

Exemptions (not "loose"): `data-testid`, CSS class strings, DOM event names,
user-facing labels, JSON field names inside guards, log/error messages, and
`Record<string, unknown>` used strictly to validate unknown input.

Enforcement: Biome runs the line/param/complexity rules; `tests/architecture/`
guards file length and the typed-domain policy (see `typed-domain.test.ts`).

## Testing rules

- Unit tests cover pure logic; integration tests cover package flows;
  simulation/determinism tests cover ticks and hashes; contract tests cover
  wire/API boundaries; Playwright covers user-visible browser behavior.
- Use fixed fixtures and deterministic seeds.
- Every bug requires a regression test and the postmortem protocol in
  `AGENTS.md`.
- Run the smallest affected test first. Use `verify:fast`,
  `verify:simulation`, or a focused E2E during iteration.
- Run `pnpm run verify` at feature completion. Use `pnpm run test:e2e:fast` for
  functional browser iteration, `pnpm run test:e2e:perf` for renderer benchmark
  changes, and `pnpm run test:e2e:all` for the complete Chromium + Firefox gate,
  release, or CI-equivalent validation.
- A gameplay capability is incomplete until the player can reach it through the
  intended screen, perform the natural interaction, see its progress/result and
  blocked states, and complete the real-server flow in Playwright. Simulation,
  protocol, or integration coverage alone cannot mark gameplay `done`.
- E2E must be deterministic by construction: never wait on wall-clock time
  (`waitForTimeout`), never measure an element while it animates, and never
  assert exact rendered positions or "nothing changed" over time. Poll an
  observable state, wait for authoritative ticks (`waitForTicks`), wait for a
  value to settle (`waitForStableRead`), and let `use.reducedMotion: 'reduce'`
  remove animation geometry. Use `waitForMatchReady`, never `getTick() > 0`.
- The browser gate runs with CI `retries: 0` so a retry pass cannot hide a
  flake. Prove stability by repeating only the curated subset with
  `pnpm run test:e2e:flaky`, not the whole suite.
- Every task ID must expose its phase or cross-cutting track and stage, using
  `P<phase>.<stage>[.<substage>]` or `<TRACK>.<stage>[.<substage>]`.

## Completion checklist

- Behavior and regression coverage are verified.
- Player-facing gameplay has screen, interaction, feedback, and E2E coverage.
- Typecheck, lint, relevant tests, build, and architecture barriers pass.
- No public API or forbidden dependency changed unintentionally.
- No unrelated formatting/generated churn remains.
- Documentation changes reflect stable contract decisions.

## Self-audit

Before completion, inspect the diff as a stranger: scope, cohesion, coupling,
typing, determinism, error handling, security, and test evidence.
