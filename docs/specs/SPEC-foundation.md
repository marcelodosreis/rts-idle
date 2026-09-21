# Spec: Foundation

Module id: `foundation`

## Objective

The monorepo's workspace, build, tests, lint, and CI, with automated architecture barriers. The base for every other module.

## Commands

```bash
pnpm install
pnpm run typecheck
pnpm run lint
pnpm run test:unit
pnpm run test:architecture
pnpm run build
```

## Project Structure

See `docs/master-plan.md` (section 5). Foundation sets up `apps/`, `packages/`, `tools/`, `tests/`, and `docs/tasks/`.

## Code Style

Strict TypeScript, ESM, explicit APIs, no `any`, external immutability with a restricted exception for the simulation core.

## Testing Strategy

Vitest for unit/architecture; Playwright for E2E. See `docs/master-plan.md` (section 22).

## Boundaries

- Always: preserve `.opencode/`; install with `--frozen-lockfile` in CI; validate imports.
- Ask first: add dependencies, change CI, change the base tsconfig.
- Never: commit secrets, `node_modules`, generated artifacts.

## Success Criteria

- pnpm workspace recognized.
- Platform imports fail in the portable profile.
- An intentionally failing test returns a non-zero exit code.
- CI runs the gates; artifacts/secrets excluded.

## Open Questions

None.
