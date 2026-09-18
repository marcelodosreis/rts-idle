---
name: frontend-ui-engineering
description: Builds accessible, responsive, production-quality browser UI and HUD work.
---

# Frontend UI Engineering

Use for screens, HUDs, renderer-facing UI, interactions, layout, or
accessibility changes.

## Workflow

1. Read the relevant screen, components, renderer contract, and E2E tests.
2. Reuse the existing design system and component patterns.
3. Define loading, empty, error, keyboard, focus, and responsive states.
4. Keep authoritative gameplay in server/simulation boundaries.
5. Implement the smallest accessible slice and add a focused browser test.
6. Validate typecheck, lint, focused E2E, and the appropriate completion gate.

## Non-negotiables

- semantic controls and accessible names;
- visible keyboard focus and logical tab order;
- no gameplay authority or mutable simulation state in presentation code;
- no unexplained magic styling or duplicated design tokens;
- no unbounded browser/test diagnostics.

Load `.opencode/references/skills/quality-checklists.md` for the UI checklist.
