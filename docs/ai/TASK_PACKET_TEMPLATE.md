# Task Packet Template

Every implementation task should fit this compact packet.

## Task

- ID: `P<phase>.<stage>[.<substage>]` or `<TRACK>.<stage>[.<substage>]`
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
For gameplay work, include the screen, natural interaction, visible feedback,
blocked/error states, route, and E2E target. Backend-only gameplay delivery is
not an acceptable completion scope.

## Design

State how the change respects clean code and SOLID
(`docs/engineering-standard.md`): responsibilities split, interfaces and
dependency direction, and how domain strings are typed (registries, guards,
`assertNever`). Note the smallest files/functions touched and why.

## Tests and validation

List exact tests and commands:

```bash
pnpm run verify:fast
pnpm run verify:simulation  # simulation/protocol tasks when applicable
pnpm run test:e2e:focused tests/e2e/<target>.spec.ts --list  # browser tasks
pnpm run test:e2e:focused tests/e2e/<target>.spec.ts
```

Expected E2E count: `[record the --list total here, if applicable]`

## Player-facing completion

- [ ] The player can reach the feature through the intended screen.
- [ ] The player can perform the natural interaction.
- [ ] Progress, success, and blocked/error states are visible.
- [ ] The real server path is covered by browser E2E.

## Acceptance and stop conditions

- [ ] Each objective behavior is verified.
- [ ] Player-facing gameplay flow is complete, when applicable.
- [ ] Required tests and validation pass.
- [ ] No public API, architecture boundary, or deterministic contract regressed.
- [ ] Scope is complete; stop without unrelated cleanup or future features.

## Completion report

Report `PASS` or `BLOCKED`, implemented behavior, tests, validation status,
changed files, and architectural changes. Keep the report under 30 lines.
