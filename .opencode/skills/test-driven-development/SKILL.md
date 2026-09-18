---
name: test-driven-development
description: Uses focused behavioral tests to drive safe implementation and regression fixes.
---

# Test-Driven Development

Use for new behavior, bug fixes, contracts, and risky refactors.

## Cycle

1. Discover the actual test commands and relevant fixture conventions.
2. Write the smallest behavioral test that fails for the missing behavior.
3. Implement the minimum change to pass it.
4. Refactor only after green, without changing the contract.
5. Run focused tests, then the risk-appropriate completion gate.

## Test selection

- pure logic: unit test;
- package flow: integration test;
- simulation across ticks: simulation/determinism test;
- wire contract: contract test;
- user-visible browser behavior: focused Playwright test;
- bug: permanent regression in the project-designated regression suite.

Prefer deterministic fixtures, real boundaries, meaningful assertions, and
concise failure messages. Avoid testing implementation details, broad mocks,
random time, or unbounded diagnostic output.

For browser work, list the target before execution:

```bash
pnpm run test:e2e:focused tests/e2e/<target>.spec.ts --list
```

Load `.opencode/references/skills/quality-checklists.md` for test design detail.
