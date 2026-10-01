# Agent Skills (OpenCode) — rts-idle

This project is an RTS idle game. It uses engineering workflow skills installed under
`.opencode/skills/`, plus always-loaded rule packs under `.opencode/rules/`
(borrowed from ECC) and shared checklists under `.opencode/references/`.

## Entry Requirement

**Start with `CURRENT_STATE.md`** for minimal operational context.
**Follow `docs/ai/EXECUTION_PROTOCOL.md`** for workflow.
**Read `docs/engineering-standard.md` before modifying code.** It remains the
project's engineering source of truth.

`docs/ai/EXECUTION_PROTOCOL.md` is the operational source for local commands.
Its mandatory preflight selects Node 24 from `.nvmrc`; Node 20 test results are
not valid project validation.

`docs/architecture.md` documents the current module layout and boundaries.
The automated barriers (`tests/architecture/package-dependencies.test.ts`,
`public-api.test.ts`, `simulation-isolation.test.ts`) are enforced by CI
and must stay green.

For context navigation, see `docs/ai/CONTEXT_MAP.md`.

## Mandatory Code Quality (every change, every package)

Clean code, SOLID, and strong typing are mandatory in **everything**:
`packages/*`, `apps/*`, `tools/*`, `tests/*`, config, and docs. The canonical
rules live in `docs/engineering-standard.md` ("Clean Code & SOLID" and "Typed
domain strings"). No exception beyond generated code
(`apps/web/src/shared/ui/**`, `tools/assets/src/curated.ts`, `*/dist`).

Enforcement is layered; all must pass:

- **Biome** (`pnpm run lint`): file ≤400 lines, function ≤50, params ≤5, no `any`.
- **Architecture guard** (`pnpm run test:architecture`): no `as string` /
  `as unknown` and no domain `Record<string, X>` outside the documented
  boundaries (`tests/architecture/typed-domain.test.ts`).
- **pre-commit** (`lint-staged`) and **pre-push** (`typecheck` + `lint` +
  `test:architecture`).
- **CI**: `lint`, `typecheck`, `test:architecture`, `verify`, and E2E jobs.
- **Review**: `code-review-and-quality` checks this bar before approval.

Never silence a violation by adding a `biome-ignore` or an allowlist entry
without a written justification; fix the code instead.

## Core Rules

- If a task matches a skill, invoke it with the `skill` tool before acting.
- Skills are located in `.opencode/skills/<skill-name>/SKILL.md`.
- Follow the skill workflow strictly; do not partially apply it.
- Never skip required steps such as spec, plan, or test when a skill demands them.
- Do not unilaterally narrow, reinterpret, or change the user's requested scope.
- Do not turn an existing requirement into a non-goal without explicit user approval.
- Gameplay tasks must be delivered as vertical slices: authoritative behavior,
  protocol/server path, player-facing screen, natural interaction, visible
  feedback, and browser E2E. Backend-only gameplay work remains in-progress.
- New task IDs must include their phase or cross-cutting track and stage, using
  `P<phase>.<stage>[.<substage>]` or `<TRACK>.<stage>[.<substage>]`; do not create
  new opaque IDs such as `NAV-001` or `QUAL-001`.
- If behavior, product scope, or a source-of-truth document is ambiguous, stop and ask
  before editing or implementing.
- Do not declare partial backend or simulation work complete when the requested
  user-visible flow is still unavailable.
- Before reporting PASS, compare the implementation against the original user request,
  not only against the agent-authored plan.
- When running the browser locally, reserve a unique development instance per agent:
  use `pnpm dev` for instance 1 and `pnpm dev:instance -- <N>` for additional
  instances. Do not reuse another agent's instance number or use the removed
  `dev:2` alias. See the parallel development instance table in `README.md`.
- Project files live directly at the repo root — do not nest the project in subfolders.
- For task breakdown, see `docs/ai/TASK_INDEX.md`.
- For task template, see `docs/ai/TASK_PACKET_TEMPLATE.md`.

## Intent → Skill Mapping

Map the user's intent to the matching skill automatically:

- Feature / new functionality → `spec-driven-development`, then `incremental-implementation` and `test-driven-development`
- Planning / breakdown → `planning-and-task-breakdown`
- Bug / failure / unexpected behavior → `debugging-and-error-recovery`
- Code review → `code-review-and-quality`
- Refactoring / simplification → `code-simplification`
- UI / HUD / game screens → `frontend-ui-engineering`
- New session / which skill applies → `using-agent-skills`

## Always-Loaded Rules

- `.opencode/rules/common/` — engineering standards (process, quality gates).
- `.opencode/rules/typescript/` — TypeScript/web standards for the game stack.

## References

Shared checklists referenced by skills live in `.opencode/references/`
(e.g. `definition-of-done.md`, `testing-patterns.md`, `accessibility-checklist.md`).

## Execution Model

For every request:

1. Determine if any skill applies (even a small chance).
2. Load the skill with `skill({ name: "<skill-name>" })`.
3. Follow the skill workflow exactly.
4. Only proceed to implementation once required steps are complete.

## Decision Authority

The user owns product scope and behavioral decisions. The agent may choose
implementation details only when they are directly specified by repository
contracts or the approved task packet. Before implementation, every task packet
must make explicit:

- the objective and complete user-visible flow;
- all supported variants, producers, inputs, and outputs;
- source-of-truth documents and conflicts between them;
- decisions still open and requiring user approval;
- acceptance tests for every supported variant;
- explicit non-goals, with a reason and approved follow-up when applicable.

If the original request, task packet, task index, master plan, and current
implementation disagree, report the conflict and ask. Never resolve it by
silently dropping a variant or declaring an incomplete vertical slice complete.

## Architecture: Authorized Mutability Exception (approved)

The project-wide immutability rule (`.opencode/rules/common/coding-style.md`) applies to all external boundaries. This project authorizes one **restricted exception**: mutation is permitted **inside the simulation core only** (`packages/simulation`), where there is exactly one writer — the deterministic `step()` execution.

Scope of the exception:

- Mutable state: private GameState owned by the simulation (`packages/simulation`), including deterministic navigation work it owns.
- Single writer: only `step()` and the internal systems it invokes may mutate that state.

Boundaries remain immutable:

- Commands are immutable.
- Observations are independent copies (no shared mutable buffers).
- Snapshots are independent copies.
- The ruleset catalog is read-only.
- The bot, renderer, and transport never receive write references to GameState.

This exception is a deliberate architecture decision (see `docs/master-plan.md` §8.5 and `docs/adr/`). It does not extend to other packages. Any request to widen the exception must go through architectural review.

## Bug Response Protocol (mandatory)

Every bug or malfunction — reported by a user, found by a test, fuzz, or code review — is closed through this protocol. No bug is ever closed with only a fix.

1. **Stop the line.** Do not add features on top of a known bug.
2. **Reproduce.** Reduce to the minimal failing case (seed + commands for simulation bugs).
3. **Diagnose.** Identify the root cause, not the symptom.
4. **Write a postmortem.** Create `docs/postmortems/YYYY-MM-DD-<slug>.md` using the template at `docs/postmortems/TEMPLATE.md`. It must document: symptom, root cause, **what we missed** (the process/test gap), fix, regression, prevention. Front-matter must include `status: open`, `classe`, `barreira`, and `regressao`.
5. **Add a permanent regression test** that fails without the fix and passes with it. Regressions are co-located in the suite that owns the affected behavior: pure logic in `tests/unit/`, simulation in `tests/simulation/`, browser behavior in `tests/e2e/`. There is no separate regression suite (see `docs/adr/ADR-016-co-located-regression-tests.md`).
6. **Fix the root cause.**
7. **Verify.** Run the focused test, the full suite, the build, and the original failing scenario.
8. **Register status.** Run `npx tsx tools/quality/postmortem-status.ts` to update the summary.

A bug fix without a postmortem and a regression test is not done. See `docs/master-plan.md` §39 and §71.

## Repository Hygiene

- Inspect `git status --short` before editing and preserve existing changes.
- Limit edits to files directly required by the task.
- Review `git diff --check` and the final diff before completion.
- All documentation and new content is written in English.
- Never write project artifacts to the machine temp directory (`/tmp`,
  `/var/folders`, `$TMPDIR`, `os.tmpdir()`, `mkdtemp`). Use the project-local
  `tmp/` directory at the repository root (gitignored); create it if missing and
  delete temporary files after the task.
