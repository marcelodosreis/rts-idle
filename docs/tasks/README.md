# Task workspace

## Task IDs

Task IDs are hierarchical and self-describing. Product work uses
`P<phase>.<stage>.<substage>`; for example, `P3.01.02` means Phase 3, stage 1,
substage 2. A stage-level task may omit the substage, such as `P2.07`.

Cross-cutting tracks use the same shape with an explicit track prefix:
`QH.01.02` (quality hardening), `ARCH.01.01` (architecture), `DEP.01.01`
(deployment), `SCL.01.01` (scale), and `ED.01.01` (editor).

Do not create new IDs such as `NAV-001`, `BUILD-001`, or `QUAL-001`. The phase
or track must be visible in the ID without consulting another document.

Task packets that are active or awaiting work stay directly under `docs/tasks/`.
When a task is complete and its validation gates have passed, move its packet
and any completed implementation plan to [`docs/tasks/done/`](done/). The packet
content is preserved; only its location changes.

`docs/tasks/todo.md` and `docs/ai/TASK_INDEX.md` remain the status indexes. They
should link to or name the archived packet when a completed task is recorded.
Do not move pending or in-progress work until its acceptance criteria and
required validation are complete. A gameplay task is not complete until its
authoritative behavior, player-facing screen, natural interaction, visible
feedback, and browser E2E coverage are complete.
