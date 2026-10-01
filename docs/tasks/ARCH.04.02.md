# Task: ARCH.04.02

- Objective: Normalize non-feature web filenames and route/page public APIs.
- Scope: `app`, `pages`, `routes`, and non-generated shared components.
- Non-goals: Feature behavior and generated `shared/ui` modules.

## Acceptance

- Source filenames are kebab-case and pages use named exports.
- Router lazy loading preserves all existing routes.
- `pnpm run verify:fast` passes.
