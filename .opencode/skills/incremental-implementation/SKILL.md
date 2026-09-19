---
name: incremental-implementation
description: Implements approved work in small, reversible, validated slices.
---

# Incremental Implementation

Use after the scope/spec is clear and the affected files are identified.

## Cycle

1. Choose the smallest vertical slice with observable value.
2. Define its contract and affected tests.
3. Implement only that slice, keeping the tree compilable.
4. Run focused validation immediately.
5. Record the result and choose the next slice.

## Rules

- Prefer vertical slices over layer-first batches.
- Keep incomplete behavior behind safe defaults or explicit boundaries.
- Do not add speculative abstractions, unrelated cleanup, or broad refactors.
- Preserve rollback-friendly commits and existing public APIs.
- Stop when acceptance criteria pass; do not continue with “while here” work.

Before completion, use the repository gate appropriate to the changed risk.
See `.opencode/references/skills/operational-playbooks.md`.
