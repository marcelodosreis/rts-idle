---
status: closed
classe: layout
barreira: null
regressao:
  - tests/e2e/responsive/hud-responsive.spec.ts
---

# Postmortem: HUD top bar controls overlap on 13" laptop viewports

Date: 2026-09-19

## Summary

On ~1280-1440px viewports (13" MacBook logical resolution), the top bar's
control cluster overlapped the centered resource stats, making the header
illegible. Presentation-only; no simulation impact.

## Symptom

The user reported that on a 13" MacBook the game page's top menu items were
"all mashed together". Controls (scenario select, aggression/sprites switches)
and resource chips (Mineral/Energy/Supply) rendered on top of each other.

## Root cause

`apps/web/src/hud/TopBar.tsx` positioned the left control cluster with
`absolute left-4 max-w-[52vw] flex-wrap`, while the resource stats were centered
in the header's normal flow. The left cluster's intrinsic width is ~750px
(brand + status + tick + scenario select + two labeled switches). At ~1280px,
`52vw ~ 665px` and at 1440px `52vw ~ 750px`, so the cluster wrapped to a second
line and, being `absolute`, did not push the header taller. It therefore
overlapped the still-centered stats and could spill vertically over the
battlefield. The header's `min-h-14` only reserved space for a single row.

## What we missed

The HUD E2E specs (`hud-commands`, `hud-unit-details`) only assert behavior
(commands fire, tooltips appear); none assert layout geometry. There was no
acceptance criterion for "HUD zones do not overlap or overflow at the target
desktop widths", so a purely visual regression was structurally invisible to
the suite. The layout relied on `absolute` + `min-h`, a combination that cannot
reserve space for wrapped content.

## Fix

- `apps/web/src/hud/TopBar.tsx`: removed the `absolute` positioning. Brand,
  controls, and stats are now three flex zones in one `flex-wrap` header
  (`gap-x-3 gap-y-2`), so they wrap to new rows instead of overlapping. Stats
  use `sm:ml-auto` to stay right-aligned on wide screens. Added `data-testid`
  hooks (`hud-topbar-brand`, `hud-topbar-controls`, `hud-topbar-stats`).
- `apps/web/src/hud/MatchHud.tsx`: footer `h-40` changed to `min-h-40` with
  `flex-wrap`.
- `apps/web/src/hud/SelectionPanel.tsx`: panel width `w-[22rem] max-w-[34vw]`
  changed to `w-full max-w-[22rem]`.
- `apps/web/src/hud/CommandBar.tsx`: command palette container now `flex-wrap`.

## Regression

`tests/e2e/responsive/hud-responsive.spec.ts` runs at 1280x800 and 1440x900 and asserts:
the document and footer have no horizontal overflow; the three top-bar zones do
not intersect pairwise; all zones stay inside the viewport; and Stop/Surrender/
scenario remain visible. It failed before the fix (`hud-topbar-brand overlaps
hud-topbar-stats`) and passes after.

## Prevention

- Permanent geometry regression test at the two target desktop viewports.
- New acceptance criterion in `docs/specs/SPEC-browser-client.md` ("HUD
  responsive layout") requiring no overlap/overflow at >=1280px.
- Rule: HUD chrome must not use `absolute` positioning for content that can
  wrap; reserve space via normal flow.

## Verification

- `pnpm run test:e2e:focused tests/e2e/responsive/hud-responsive.spec.ts --project=chromium`
- `pnpm run test:e2e:focused tests/e2e/match/hud-commands.spec.ts --project=chromium`
- `pnpm run test:e2e:focused tests/e2e/match/hud-unit-details.spec.ts --project=chromium`
- `pnpm run typecheck`
