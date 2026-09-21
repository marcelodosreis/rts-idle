# Task workspace

Task packets that are active or awaiting work stay directly under `docs/tasks/`.
When a task is complete and its validation gates have passed, move its packet
and any completed implementation plan to [`docs/tasks/done/`](done/). The packet
content is preserved; only its location changes.

`docs/tasks/todo.md` and `docs/ai/TASK_INDEX.md` remain the status indexes. They
should link to or name the archived packet when a completed task is recorded.
Do not move pending or in-progress work until its acceptance criteria and
required validation are complete.
