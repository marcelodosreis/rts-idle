# Agent Skills (OpenCode) — rts-idle

This project is an RTS idle game. It uses engineering workflow skills installed under
`.opencode/skills/`, plus always-loaded rule packs under `.opencode/rules/`
(borrowed from ECC) and shared checklists under `.opencode/references/`.

## Entry Requirement

**Start with `CURRENT_STATE.md`** for minimal operational context.
**Follow `AI_EXECUTION_PROTOCOL.md`** for workflow.
**Read `docs/engineering-standard.md`** only when modifying code that touches
engineering invariants (simulation core, serialization, pipeline order).

`docs/architecture.md` documents the current module layout and boundaries.
The automated barriers (`tests/architecture/package-dependencies.test.ts`,
`public-api.test.ts`, `simulation-isolation.test.ts`) are enforced by CI
and must stay green.

For context navigation, see `docs/ai/CONTEXT_MAP.md`.

## Core Rules

- If a task matches a skill, invoke it with the `skill` tool before acting.
- Skills are located in `.opencode/skills/<skill-name>/SKILL.md`.
- Follow the skill workflow strictly; do not partially apply it.
- Never skip required steps such as spec, plan, or test when a skill demands them.
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
4. **Write a postmortem.** Create `docs/postmortems/YYYY-MM-DD-<slug>.md` using the template at `docs/postmortems/TEMPLATE.md`. It must document: symptom, root cause, **what we missed** (the process/test gap), fix, regression, prevention.
5. **Add a permanent regression test** that fails without the fix and passes with it. For simulation bugs, the regression lives in `tests/regression/`; for browser bugs, in `tests/e2e/`.
6. **Fix the root cause.**
7. **Verify.** Run the focused test, the full suite, the build, and the original failing scenario.

A bug fix without a postmortem and a regression test is not done. See `docs/master-plan.md` §39 and §71.

## Agent Coordination

Multiple agents work on this repo. Before editing any file, check `docs/agent-ledger.md`, claim the file, and never edit a file another agent has marked as in-flight.

File ownership:

| Area | Owner |
|---|---|
| `docs/adr/**`, `docs/game-design.md`, `docs/proposals/**`, `docs/agent-ledger.md` | Philosophy agent |
| `packages/**`, `apps/**`, `tools/**`, `tests/**`, `tasks/todo.md`, `.github/**` | Implementation agent |
| `master-plan.md` | Shared — structural edits only via a coordinated pass flagged in the ledger |
| `AGENTS.md`, `README.md` | Any agent, but claim in the ledger first |

Rules:

- Claim a file in `docs/agent-ledger.md` before editing; mark it `done` when finished.
- Never edit a file another agent has claimed as in-flight.
- All documentation and new content is written in English.
- Recommendations that cross territory (e.g. implementation tooling) are noted in the ledger, not applied directly.