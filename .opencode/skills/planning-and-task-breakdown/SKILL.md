---
name: planning-and-task-breakdown
description: Converts an approved objective into decision-complete implementation tasks.
---

# Planning and Task Breakdown

Use when the user requests planning, decomposition, or a task packet.

## Required plan

1. Inspect current state, architecture, and existing task packets.
2. State objective, success criteria, scope, non-goals, and constraints.
3. Map dependencies and identify the smallest vertical slices.
4. Define files to read/change, interfaces, tests, validation, and stop
   conditions for every task.
5. Identify risks, rollback points, and unresolved product decisions.

## Decision completeness

The implementer must not need to decide behavior, ownership, data shape,
validation, or test coverage. Ask the user only about choices that cannot be
derived from the repository.

Use `docs/ai/TASK_PACKET_TEMPLATE.md` and write the plan in the requested
planning location. Do not modify implementation files while planning.
