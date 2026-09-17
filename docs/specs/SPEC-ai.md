# Spec: AI

Module id: `ai`

## Objective

Strategic and tactical decisions from limited observations. Deterministic bot and Agent interface. Never mutates GameState directly.

## Commands

```bash
pnpm run test:unit
pnpm run test:simulation -- bot
pnpm run build
```

## Project Structure

```text
packages/ai/src/
├── contracts.ts
├── strategic/
├── tactical/
└── bot.ts
```

## Code Style

AI is a transformation `observation + memory → commands + nextMemory`. No access to hidden state. Deterministic.

## Testing Strategy

`tests/unit/agent-boundary.test.ts`, `tests/simulation/bot-*.test.ts`, self-play (phases 5/7). Fog-limited: the bot only sees what a player would see.

## Boundaries

- Always: consume `PlayerObservation`; produce `CommandIntent[]`.
- Ask first: allow access to GameState; change difficulty to grant resource/vision bonuses.
- Never: access RNG, enemy queues, global navigation, or the global hash.

## Success Criteria

- Decisions are reproducible for the same observation + memory.
- Self-play gate: ≥95% of 100 matches end by elimination.

## Open Questions

None.