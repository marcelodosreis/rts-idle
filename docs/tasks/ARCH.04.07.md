# Task: ARCH.04.07

- Objective: Enforce web naming, component ownership, and slice boundaries.
- Scope: Biome and architecture tests.
- Non-goals: Runtime behavior.

## Acceptance

- Convention tests and Biome reject violations outside generated UI.
- `pnpm run verify` and `pnpm run test:e2e:fast` pass.
