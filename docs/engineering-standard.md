# Engineering Standard — rts-idle

> **Source of truth for all future development.** Every agent working in this
> repository reads this document before touching code. It defines the module,
> file, naming, typing, testing, and determinism conventions the codebase is
> held to, and it is enforced by automated barriers (architecture tests, CI)
> and by the mandatory self-audit at the end of every change.

## 1. Architecture

- **Monorepo** (pnpm workspaces). Packages under `packages/`, applications under
  `apps/`, headless tooling under `tools/`.
- **Portable deterministic core.** `packages/simulation` imports no React, DOM,
  WebSocket, Node API, or renderer. It runs identically in Node, the browser,
  CLI tools, tests, replay, and fuzzing.
- **Server authority.** The server owns the simulation; clients send commands
  and render. No gameplay logic lives in the UI.
- **Single writer.** Only `step()` and the systems it invokes mutate GameState
  (authorized mutability exception — see §11). See
  `docs/architecture.md` and `docs/master-plan.md` for the full model.

## 2. Package organization

| Package | Responsibility | May import (`@rts/*`) |
|---|---|---|
| `shared` | Deterministic primitives: fixed point, xoshiro128**, entity/player IDs, grid layout | — |
| `game-data` | Declarative content: units, buildings, upgrades, maps | `shared` |
| `pathfinding` | Grid, incremental A*, spatial queries | `shared` |
| `protocol` | Versioned wire messages + runtime guards | `shared` |
| `simulation` | GameState, ECS, commands, systems, snapshots | `shared`, `game-data`, `pathfinding` |
| `ai` | Strategic/tactical decisions from observations | `shared`, `game-data`, `simulation` |
| `renderer` | PixiJS presentation: units, selection, ping, camera, terrain, effects | `shared`, `protocol`, `game-data` |
| `audio` | Audio cues | `shared` |
| `server` | Rooms, sessions, authority, transport | `shared`, `simulation`, `protocol`, `ai` |
| `web` | React screens, HUD, network client, input | `shared`, `protocol`, `renderer`, `audio`, `game-data` |
| `tools/*` | Headless execution, benchmark, balance | varies; never renderer/server |

**Enforcement:** `tests/architecture/package-dependencies.test.ts` scans every
source file's `@rts/*` imports and fails CI on a forbidden dependency. The
`simulation` package is additionally guarded by
`tests/architecture/simulation-isolation.test.ts`.

## 3. Module organization

- Group by **domain/feature**, not by type. Subdirectories name a cohesive
  responsibility (e.g. `commands/`, `engine/`, `canonical/`, `snapshot/`,
  `ecs/`).
- A module holds one cohesive responsibility. If a file contains two concepts
  that could evolve independently, split it — but never fragment for its own
  sake.

## 4. File responsibility

- **One public function per file is the preferred pattern.** A file may keep
  small private helpers that exist only to serve that function.
- Exception: a tightly-coupled pair (e.g. `CanonicalWriter`/`CanonicalReader`
  are each their own file; a cohesive class cluster may share a file when the
  biome `noExcessiveClassesPerFile` exception is deliberate).
- **Never create dumping grounds:** `utils.ts`, `helpers.ts`, `common.ts`,
  `misc.ts`, `shared.ts` with unrelated functions are forbidden.
- Source files stay below 400 lines (biome soft ceiling). Split at ~200–300
  lines when the file covers more than one responsibility.

## 5. Cohesion

- Everything in a module must share one clear responsibility. Ask: why is this
  here? Could it exist independently? Does the reader understand the module's
  purpose from its name and contents alone?
- If a function does not need its siblings, it likely belongs elsewhere.

## 6. Coupling

- Depend on **small explicit contracts**, not implementation details.
- Do not reach into another module's internals; use its public surface.
- Do not pass a giant object just to read one field — pass the value needed.
- Do not introduce interfaces/factories to "decouple" when there is no real
  consumer variation or testing need. Decoupling must solve a real problem.

## 7. Reuse

- **Reuse real concepts, not accidental similarities.** Before writing new
  logic, search for an existing module that already does it: `gridPosition`,
  `tilesToFixed`, `createRulesIdentity`, `buildMoveCommand`,
  `worldWithOwners`, protocol guards.
- Centralize genuine duplication (constants, validations, transformations).
- Do not build a generic abstraction because two functions currently look
  alike; wait for real pressure.

## 8. Naming

- Names explain intent. Avoid `x/y/z/tmp/data/obj/item/result/value/thing/
  helper/manager/common` when a semantic name exists.
- No unnecessary abbreviations. `nextState0`, `mixedSeed`,
  `leftShiftedS1` beat `ns0`, `t`, `ns2`.
- Constants and types are visually distinct from values (UPPER_SNAKE for
  constants, PascalCase for types/classes, camelCase for functions/variables).

## 9. TypeScript

- Strict mode: `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`,
  `noImplicitOverride`, `noFallthroughCasesInSwitch`.
- **No `any`.** Use `unknown` at external boundaries and narrow it. A cast
  (`as`) must not hide a real problem; prefer validation that narrows
  (`typeof`/`instanceof` checks, literal unions).
- Model the domain with real types: `Fixed`, `EntityId`, `PlayerId`,
  `Phase`, `RulesIdentity`. Raw `number` for domain concepts is a defect.
- Explicit types on public APIs; let TypeScript infer local internals.
- `interface` for object shapes that extend/implement; `type` for unions and
  tuples. Prefer string-literal unions over `enum`.

## 10. Immutability

- `const` by default; `let` only when reassignment is required.
- Prefer pure functions and explicit transformation over mutation.
- The **single authorized exception**: mutation of private GameState inside
  `packages/simulation`, performed only by `step()` and the command systems it
  invokes. Nothing outside the simulation receives a write reference to
  GameState; observations and snapshots are independent copies.
- Outside the simulation core, mutation is not permitted without a documented,
  review-approved exception.

## 11. Pure functions & determinism

- Prefer pure functions for calculations, rules, simulation, RNG, combat,
  economy, state transformation, and validation.
- **Never** change: game rules, formulas, RNG math, serialization byte format,
  system order, id allocation, or the canonical stream — these are pinned by
  golden-vector, determinism, and snapshot-roundtrip tests.
- Forbidden inside the core: `Math.random`, `Date`, `performance.now`, timers,
  I/O, locale-dependent behavior, sorting without an explicit tie-break,
  async results influencing the tick.

## 12. Clarity of math and non-obvious logic (mandatory)

Any logic a reader cannot parse at a glance must be handled one of two ways:

1. **Extract to a named helper** that reveals intent (e.g. `gridPosition(i,
   columns, spacing)` instead of `(i % 64) * 256`), **or**
2. **Document the why** in a comment: the algorithm, invariant, or convention
   the code relies on (e.g. rejection sampling's anti-modulo-bias reason,
   integer-sqrt correction, canonical presence flags, formation spiral order).

A comment must explain *why*, never restate *what* the code says.

## 13. Error handling

- Handle errors at the correct layer. Never silently swallow errors; an
  intentional ignore must state why in a comment.
- Use specific, named errors (`CommandRejectedError`, `CanonicalError`) over
  generic `Error` where the failure mode matters.
- Validate at system boundaries with schema/runtime guards (`isMoveMessage`,
  `isSnapshotMessage`). Never cast untrusted input without validation.

## 14. Testing

- **Behavior over coverage.** Tests document behavior, invariants, and
  regressions — not percentages.
- Conventions: unit = isolated behavior, integration = module flows,
  simulation = state across ticks, determinism = hash equality, architecture =
  boundaries/imports, e2e = browser via Playwright, regression = `tests/e2e/
  regression-*.spec.ts` for browser bugs.
- Deterministic tests only: fixed seeds from `tests/fixtures/seeds.ts`,
  shared world/command fixtures from `tests/fixtures/`, shared identity from
  `createRulesIdentity('test')`.
- Critical/canonical behavior must be pinned: golden vectors for the RNG and
  the serialized state hash.
- Every bug fix adds a permanent regression test that fails without the fix
  (see the Bug Response Protocol in `AGENTS.md`).

## 15. Dependencies

- Dependencies follow the package matrix (§2) and are enforced by tests.
- No new external dependency without justification. Prefer the standard
  library and existing workspace packages.
- Keep imports minimal; import what the module uses, nothing more.

## 16. Abstractions

- Every abstraction must earn its existence: does it reduce complexity, improve
  reuse, reduce coupling, represent a real concept, or improve testability?
- No speculative factories, artificial classes, or wrapper layers that only
  forward calls.

## 17. Refactoring

- Refactor in small, verifiable slices. After each logical group: run the
  focused tests, typecheck, and lint.
- Before refactoring critical/uncovered code, add characterization tests
  (golden values, roundtrips) and keep them green.
- Preserve the public surface of `@rts/*` packages; the public-API test
  (`tests/architecture/public-api.test.ts`) fails on removal or rename.
- Never refactor "for cleanliness" while changing behavior.

## 18. Definition of Done

A change is done only when all of the following hold:

- [ ] Behavior is correct and verified at runtime (tests/e2e, not just compile)
- [ ] New behavior is covered by tests that fail without the change
- [ ] Full validation passes: typecheck, lint, all test suites, build, e2e
- [ ] No public API of any `@rts/*` package was removed or renamed unintentionally
- [ ] No forbidden dependency was introduced (architecture tests pass)
- [ ] No duplication introduced; existing reusable modules reused
- [ ] Modules are cohesive; files have one clear responsibility
- [ ] Math/non-obvious logic is in a named helper or has a why-comment
- [ ] Naming is semantic; no `any`, no hiding casts
- [ ] Immutability respected outside the authorized simulation exception
- [ ] Docs updated (ADRs, architecture, engineering standard) when a decision
      changes
- [ ] `docs/agent-ledger.md` claims marked `done`

## 19. Rules for new code

1. Search for an existing module to reuse before writing anything new.
2. Create a cohesive module with one clear responsibility.
3. Prefer one public function per file; keep small private helpers local.
4. Minimize dependencies; respect the package matrix.
5. Write tests that document behavior (red-green-refactor).
6. Validate against this standard and the automated barriers.
7. Run the full validation gate before finishing.

## 20. Self-audit process (mandatory)

Before declaring any work complete, audit your own change:

1. Re-read the changed files as a stranger would: is intent clear from names?
2. Check cohesion: does each file have one responsibility?
3. Check coupling: minimal, explicit dependencies?
4. Check reuse: did you duplicate instead of reusing an existing module?
5. Check typing: domain types, no `any`, no hiding casts?
6. Check clarity: is every math/non-obvious block helper-named or why-commented?
7. Check determinism: nothing game-critical changed shape?
8. Run `pnpm run typecheck`, `pnpm run lint`, the focused tests, the full
   suite, `pnpm run build`, and the relevant e2e.
9. Fix every violation you find. Do not stop at the first pass.

## Enforcement summary

| Guard | What it catches |
|---|---|
| `tests/architecture/package-dependencies.test.ts` | Forbidden `@rts/*` import in any package |
| `tests/architecture/simulation-isolation.test.ts` | Platform imports inside the simulation |
| `tests/architecture/public-api.test.ts` | Removed/renamed public value exports |
| Biome (CI + pre-commit) | Formatting, `any`, unused code, naming/style |
| Husky pre-commit + commitlint | Style gate + conventional commits |
| CI | Typecheck, lint, 7 suites, build, e2e |
| Golden/determinism/replay tests | Accidental behavior or format drift |