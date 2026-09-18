# Task Packet Template

> Every implementation task should be representable by a small packet.
> Copy this template and fill in the sections.

---

## Task ID

`[MODULE]-[NUMBER]` — e.g., `ECONOMY-001`

## Objective

One sentence describing what this task achieves.

## Why

Why this task exists. What problem does it solve or what capability does it enable?

## Scope

Files/packages expected to change:

```
packages/simulation/src/economy/...
packages/simulation/src/systems/gathering-system.ts
packages/simulation/src/ecs/components.ts (add Cargo component)
tests/simulation/gathering.test.ts (new)
```

## Read First

Only files that should be read before starting:

```
packages/simulation/src/ecs/components.ts
packages/simulation/src/engine/simulation.ts
packages/simulation/src/systems/pipeline.ts
tests/fixtures/index.ts
```

## Relevant Contracts

Relevant invariants/specifications/ADRs (only if needed):

- ADR-001 (isolated simulation, single writer)
- `docs/simulation.md` §4 (system pipeline)

## Implementation Requirements

Exact behavioral requirements:

1. Worker unit can be assigned to a resource node
2. Gathering takes 1 second per cargo unit
3. Cargo capacity: 10 minerals per trip
4. minerals deposited at nearest friendly Base
5. Dead worker loses cargo
6. Deterministic: same seed + commands = same gathering pattern

## Non-Goals

Things explicitly forbidden for this task:

- Do NOT implement energy gathering (Phase 2 later task)
- Do NOT implement supply system
- Do NOT modify existing combat system
- Do NOT refactor unrelated systems

## Tests Required

Exact tests that must pass:

```
tests/simulation/gathering.test.ts
  - worker moves to resource node
  - cargo fills over time
  - worker returns to base when full
  - cargo deposited on arrival
  - dead worker loses cargo
  - deterministic across instances

tests/unit/cargo-component.test.ts
  - component encode/decode round-trip
  - component default values
```

## Validation Commands

```bash
pnpm run typecheck
pnpm run lint
pnpm run test:unit
pnpm run test:simulation
```

## Acceptance Criteria

Objective completion criteria:

- [ ] Worker gathers minerals from resource node
- [ ] Cargo accumulates over gathering time
- [ ] Worker returns to base when cargo full
- [ ] Minerals deposited at base
- [ ] Dead worker loses cargo
- [ ] Gathering is deterministic (same seed = same behavior)
- [ ] All tests pass
- [ ] Typecheck and lint pass

## Stop Conditions

Conditions under which the agent must stop rather than expanding scope:

- All acceptance criteria met
- All tests pass
- No related issues found during implementation
- Do NOT add energy gathering, supply, or other economy features

## Expected Output

What the agent must report when finished:

```md
## Result

PASS

## Implemented

- Worker resource gathering system
- Cargo component
- Gathering system in pipeline

## Tests

- gathering.test.ts: 6 tests passing
- cargo-component.test.ts: 2 tests passing

## Validation

- typecheck: PASS
- lint: PASS
- test:unit: PASS
- test:simulation: PASS

## Files Changed

- packages/simulation/src/ecs/components.ts — added Cargo component
- packages/simulation/src/systems/gathering-system.ts — new
- packages/simulation/src/systems/pipeline.ts — added gathering step
- tests/simulation/gathering.test.ts — new
- tests/unit/cargo-component.test.ts — new

## Architectural Changes

- Added gathering system to frozen pipeline (step 7, after movement)
```
