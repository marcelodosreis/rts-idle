# Task Packet Template

Every implementation task should fit this compact packet.

## Task

- ID: `[MODULE]-[NUMBER]`
- Objective: one sentence describing the result.
- Why: problem solved or capability enabled.
- Scope: files/packages expected to change.
- Non-goals: explicit exclusions.

## Read first

List only the files required before implementation. Include relevant contracts,
ADRs, fixtures, and tests; do not list whole directories unless necessary.

## Contract

Describe exact inputs, outputs, state transitions, errors, invariants,
determinism requirements, compatibility impact, and user-visible behavior.
For browser work include route, natural interaction, and E2E target.

## Tests and validation

List exact tests and commands:

```bash
pnpm run verify:fast
pnpm run verify:simulation  # simulation/protocol tasks when applicable
pnpm run test:e2e:focused tests/e2e/<target>.spec.ts --list  # browser tasks
pnpm run test:e2e:focused tests/e2e/<target>.spec.ts
```

Expected E2E count: `[record the --list total here, if applicable]`

## Acceptance and stop conditions

- [ ] Each objective behavior is verified.
- [ ] Required tests and validation pass.
- [ ] No public API, architecture boundary, or deterministic contract regressed.
- [ ] Scope is complete; stop without unrelated cleanup or future features.

## Completion report

Report `PASS` or `BLOCKED`, implemented behavior, tests, validation status,
changed files, and architectural changes. Keep the report under 30 lines.
