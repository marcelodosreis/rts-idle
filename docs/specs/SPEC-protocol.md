# Spec: Protocol

Module id: `protocol`

## Objective

Versioned public messages for transport (WebSocket), room DTOs, commands, observations, replication, and errors. Does not couple the internal GameState to the protocol.

## Commands

```bash
pnpm run test:unit
pnpm run build
```

## Project Structure

```text
packages/protocol/src/
├── envelope.ts
├── room.ts
├── commands.ts
├── observation.ts
├── replication.ts
└── errors.ts
```

## Code Style

Schema-based validation (Zod); discriminated unions; explicit versioning; no simulation imports.

## Testing Strategy

`tests/unit/protocol-*.test.ts` covers schemas, limits, versioning, and errors. See master plan (phase 6).

## Boundaries

- Always: validate schemas and size before handling a payload.
- Ask first: add messages; change versioning.
- Never: import internal GameState; trust client payload for identity.

## Success Criteria

- Versioned messages reject incompatible versions.
- Identity is bound to transport, not to the payload.

## Open Questions

None.