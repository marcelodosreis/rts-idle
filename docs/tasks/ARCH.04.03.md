# Task: ARCH.04.03

- Objective: Organize the Match feature into the approved segments.
- Scope: `features/match`, its unit tests, and affected architecture paths.
- Non-goals: Match behavior, DOM, protocol, or renderer changes.

## Acceptance

- Match has an explicit public API and one component per non-generated file.
- Existing unit contracts pass from their new paths.
- `pnpm run verify:fast` passes.
