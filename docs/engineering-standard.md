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

## Testing rules

- Unit tests cover pure logic; integration tests cover package flows;
  simulation/determinism tests cover ticks and hashes; contract tests cover
  wire/API boundaries; Playwright covers user-visible browser behavior.
- Use fixed fixtures and deterministic seeds.
- Every bug requires a regression test and the postmortem protocol in
  `AGENTS.md`.
- Run the smallest affected test first. Use `verify:fast`,
  `verify:simulation`, or a focused E2E during iteration.
- Run `pnpm run verify` at feature completion. Add the full Chromium + Firefox gate for
  browser/protocol changes, release, or CI.

## Completion checklist

- Behavior and regression coverage are verified.
- Typecheck, lint, relevant tests, build, and architecture barriers pass.
- No public API or forbidden dependency changed unintentionally.
- No unrelated formatting/generated churn remains.
- Documentation changes reflect stable contract decisions.

## Self-audit

Before completion, inspect the diff as a stranger: scope, cohesion, coupling,
typing, determinism, error handling, security, and test evidence.
