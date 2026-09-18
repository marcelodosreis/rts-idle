---
name: code-simplification
description: Simplifies working code without changing behavior.
---

# Code Simplification

Use only when the code works but is unnecessarily complex or duplicated.

## Required process

1. Read project conventions, callers, tests, and recent history.
2. State the behavior that must remain identical.
3. Identify one concrete smell: duplication, dead code, unclear naming,
   nesting, or an abstraction with no current value.
4. Make one small change at a time.
5. Run affected tests after each logical change.
6. Compare the final diff for unrelated churn and verify typecheck/lint/build.

## Constraints

- Do not simplify code that is not understood.
- Do not remove error handling, tests, invariants, or boundary validation.
- Do not optimize for fewer lines; optimize for faster comprehension.
- Do not mix feature behavior changes with this refactor.
- Preserve public APIs, deterministic ordering, and serialization formats.

Use `.opencode/references/skills/operational-playbooks.md` for the shared
review and validation checklist.
