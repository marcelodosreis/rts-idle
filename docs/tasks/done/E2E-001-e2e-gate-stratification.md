# E2E-001 - E2E gate stratification

**Status:** done
**Phase:** Quality Hardening / Browser Validation
**Dependencies:** none

## Objective

Keep the complete Chromium and Firefox E2E gate intact while separating heavy
renderer benchmarks from functional browser feedback and running both CI gates
in parallel.

## Scope

- `package.json` - complete, functional, and performance E2E commands
- `tests/e2e/renderer-perf.spec.ts` - performance tag
- `.github/workflows/ci.yml` - parallel functional and performance jobs
- `README.md`, `CURRENT_STATE.md` - user-facing validation commands
- `docs/ai/EXECUTION_PROTOCOL.md` - operational gate guidance
- `docs/engineering-standard.md` - browser validation standard
- `docs/postmortems/2026-09-23-e2e-interaction-contention.md` - current prevention

## Contract

- `test:e2e:all` runs every E2E test in Chromium and Firefox with one worker.
- `test:e2e:fast` runs every E2E test except tests tagged `@perf`.
- `test:e2e:perf` runs only tests tagged `@perf` in Chromium and Firefox.
- The functional and performance CI jobs together cover the complete gate.
- No browser assertion or benchmark case is removed or weakened.

## Acceptance Criteria

- [x] Complete, functional, and performance commands are documented and real.
- [x] The performance benchmark is isolated by the `@perf` tag.
- [x] CI runs functional and performance gates as independent jobs.
- [x] Release waits for both E2E jobs.
- [x] Worker contention is bounded to one worker per gate.
- [x] `pnpm run verify` passes.
- [x] Focused functional, performance, and complete E2E gates pass.

## Validation

```bash
pnpm run test:e2e:fast
pnpm run test:e2e:perf
pnpm run test:e2e:all
pnpm run verify
git diff --check
```
