# ADR-018 - Web feature architecture

Status: Accepted

Date: 2026-10-01

## Context

The web application had a feature-first top-level layout, but its feature
directories mixed React components, hooks, types, pure helpers, stateful
controllers, and transport orchestration. File names mixed PascalCase and
kebab-case; several files exported multiple components; and feature entry
points were inconsistent. This made ownership and import direction difficult
to infer.

## Decision

- Keep the existing `app/`, `pages/`, `routes/`, `features/`, and `shared/`
  top-level layers.
- Organize every feature slice with only the cohesive segments it needs:
  `components/`, `hooks/`, `services/`, `types/`, and `lib/`.
- Use kebab-case for every web source filename. Components keep named
  PascalCase exports; pages also use named exports.
- Keep exactly one React component export in every non-generated `.tsx` file.
- Expose every feature slice through an explicit `index.ts` public API.
  Cross-slice imports use that public API and the `@/` alias; relative imports
  remain local to a slice.
- Enforce the convention with Biome and web architecture tests. Generated
  `shared/ui/**` remains exempt.

## Alternatives

- Keep the current mixed layout - rejected: feature growth compounds unclear
  ownership and deep imports.
- Full Feature-Sliced Design - rejected: adding `widgets/` and `entities/`
  would introduce layers with no present ownership need.
- A generic `model/` segment - rejected: it obscures the difference between
  types, stateful services, and pure helpers.

## Consequences

- Feature code has predictable homes without introducing empty directories.
- Page composition depends only on feature public APIs.
- File paths change, so unit and architecture tests must update their imports.
- The change preserves runtime behavior, DOM structure, and E2E selectors.

## Evidence

- `tests/architecture/web-import-boundaries.test.ts`
- `tests/architecture/web-file-conventions.test.ts`
- `pnpm run verify`
- `pnpm run test:e2e:fast`
