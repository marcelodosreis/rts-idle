---
name: spec-driven-development
description: Defines a feature contract before implementation.
---

# Spec-Driven Development

Use for new functionality or behavior that becomes a stable product contract.

## Gates

1. Confirm scope and affected boundaries.
2. Write objective, users, behavior, interfaces, constraints, non-goals,
   acceptance criteria, and failure cases.
3. Identify the minimum files and tests needed.
4. Resolve decisions before implementation.
5. Hand the spec to `incremental-implementation` and `test-driven-development`.

## Required contract sections

- objective and motivation;
- inputs, outputs, state transitions, and errors;
- architecture/package boundaries;
- deterministic and security constraints;
- playable surface for browser features;
- tests and validation commands;
- migration/compatibility impact;
- explicit non-goals.

Do not implement from an ambiguous spec or expand scope during implementation.
Use the task packet template for the compact form.
