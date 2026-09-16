# Agent Skills (OpenCode) — rts-idle

This project is an RTS idle game. It uses engineering workflow skills installed under
`.opencode/skills/`, plus always-loaded rule packs under `.opencode/rules/`
(borrowed from ECC) and shared checklists under `.opencode/references/`.

## Core Rules

- If a task matches a skill, invoke it with the `skill` tool before acting.
- Skills are located in `.opencode/skills/<skill-name>/SKILL.md`.
- Follow the skill workflow strictly; do not partially apply it.
- Never skip required steps such as spec, plan, or test when a skill demands them.
- Project files live directly at the repo root — do not nest the project in subfolders.

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