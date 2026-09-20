# Context Map

Start with `CURRENT_STATE.md`, then read only the route matching the task.
Do not read the full repository, all ADRs, or `docs/master-plan.md` for a
normal implementation task.

| Task area | Read first | Add only when needed |
|---|---|---|
| Simulation | simulation engine/state, relevant system, `tests/simulation/` | `docs/simulation.md`, relevant ADR |
| Commands | `packages/shared/src/commands.ts`, command handler, contract tests | `docs/commands.md`, validation module |
| ECS | components, component store/world, lifecycle tests | ECS ADR |
| Determinism | snapshot/hash modules, RNG, determinism tests | determinism docs/ADR |
| Renderer | renderer orchestrator, relevant layer, unit tests | asset modules, focused E2E |
| Protocol | relevant protocol message, shared commands, protocol tests | protocol spec, session handler |
| Server | server entry, session, scenario catalog | server spec, simulation host |
| Web/HUD | match screen, relevant HUD, session hook | renderer integration, focused E2E |
| Game data | relevant map/types/stats modules | game-data spec, master plan section |
| Architecture | architecture tests | architecture docs, engineering standard §2 |
| Quality | `tasks/QUAL-*.md`, `docs/quality/postmortem-status.md` | `docs/postmortems/`, engineering standard |
| Documentation | engineering standard, architecture, relevant spec/ADR | master plan only for milestone work |

## Read rules

- Prefer `rg` and targeted line ranges.
- Read tests before implementation when behavior is unclear.
- Load a reference only when the selected skill or task packet requires it.
- Keep command output under roughly 4–8k tokens.
