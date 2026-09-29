# Task ID Migration

Task IDs are phase-first and self-describing. New product tasks use
`P<phase>.<stage>[.<substage>]`; cross-cutting tasks use
`<TRACK>.<stage>[.<substage>]`.

The old names below are historical aliases only. They must not be used for new
tasks. Existing historical reports may retain an old alias when preserving the
original record, but active indexes and new packets use the canonical ID.

## Phase 2

| Historical alias | Canonical ID |
|---|---|
| ECONOMY-001 | P2.01.01 |
| ECONOMY-002 | P2.01.02 |
| ECONOMY-003 | P2.01.03 |
| ECONOMY-004 | P2.02.01 |
| ECONOMY-005 | P2.02.02 |
| VS-01B | P2.02.03 |
| ECONOMY-006 | P2.02.04 |
| BUILD-001 | P2.03.01 |
| ECONOMY-UI-002 | P2.03.02 |
| BUILD-002 | P2.04.01 |
| BUILD-003 | P2.04.02 |
| BUILD-005 | P2.05.01 |
| BUILD-004 | P2.06.01 |
| PROD-003 | P2.06.02 |
| PROD-001-002 | P2.07 |
| ECONOMY-UI-003 | P2.07.05 |
| ECONOMY-UI-001 | P2.01.04 |
| ECONOMY-UI-004 | P2.01.05 |
| ECONOMY-UI-005 | P2.02.05 |

## Phase 3

| Historical alias | Canonical ID |
|---|---|
| NAV-001 | P3.01.01 |
| NAV-002 | P3.01.02 |
| NAV-003 | P3.03.01 |
| NAV-004 | P3.04.01 |
| FOW-001 | P3.07.01 |
| FOW-002 | P3.08.01 |
| FOW-003 | P3.08.02 |
| COMBAT-001 | P3.10.01 |
| COMBAT-002 | P3.11.01 |

## Later Product Phases

| Historical alias | Canonical ID |
|---|---|
| CONTENT-001..005 | P4A.01..05 |
| AI-001..004 | P5.01..04 |
| ROOM-001..003 | P6.01..03 |
| NET-001..002 | P6.04..05 |
| P4B.01..10 | P4B.01..10 |
| P7.01..09 | P7.01..09 |
| P8.01..12 | P8.01..12 |
| P9.01..07 | P9.01..07 |

## Cross-Cutting Tracks

| Historical alias | Canonical ID |
|---|---|
| AUTH-005A..018 | ARCH.03.01..15 |
| WEB-ARCH-001 | ARCH.01.01 |
| INPUT-001 | ARCH.01.02 |
| RFC-001-PR1..PR6 | ARCH.02.01..06 |
| QUAL-000..024 | QH.00..24 |
| E2E-001 | QH.25 |
| EDITOR-001..041 | ED.01..11 |
| DEPLOY-001..009 | DEP.01..09 |
| SCALE-001..004 | SCL.01..04 |

## Migration Rules

- Active task filenames and headers use canonical IDs.
- Dependencies use canonical IDs.
- Historical postmortems and release reports may retain aliases with a link to
  this migration table.
- A canonical ID is not reused for a different behavior.
