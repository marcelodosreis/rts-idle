---
status: open
classe: presentation
barreira: null
regressao:
  - tests/e2e/laboratory/sprites-lab-responsive.spec.ts
---

# Browser Types Collapsed On Short Screens

## Summary

The Laboratory Browser sidebar collapsed its `Types` section on a 1440x656
viewport, leaving the category controls difficult to use on shorter monitors.

## Symptom

At desktop width with a short viewport, the asset list's minimum height consumed
most of the sidebar and the `Types` panel became too small.

## Root cause

The `Types` scroll area could shrink without a minimum height while the `Assets`
scroll area required `320px` at large breakpoints. The fixed header/footer content
and those competing flex constraints left insufficient space for category controls.

## What we missed

Responsive coverage tested desktop widths at a 900px viewport height but did not
cover a short desktop height such as 656px. The acceptance criteria checked
overflow and column placement, not minimum usable heights for both sidebar panels.

## Fix

The `Types` area now reserves at least `180px` and uses a bounded flex share.
The `Assets` area uses a `220px` minimum and consumes remaining space with
`flex-1` in `SidebarNav.tsx`.

## Regression

`tests/e2e/laboratory/sprites-lab-responsive.spec.ts` opens the Browser at 1440x656 and
asserts that both `Types` and `Assets` retain their minimum usable heights.

## Prevention

Short desktop viewport coverage now protects the sidebar's vertical allocation,
alongside the existing width and overflow checks.

## Verification

- `npx playwright test tests/e2e/laboratory/sprites-lab-responsive.spec.ts --project=chromium` — focused responsive tests passed.
- `npm run typecheck`
- `npm run lint`
- `git diff --check`
