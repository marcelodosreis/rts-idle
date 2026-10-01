# Spec: Protocol

Module id: `protocol`

## Objective

Versioned public messages for transport (WebSocket), room DTOs, commands, observations, replication, and errors. Does not couple the internal GameState to the protocol.

## Commands

```bash
pnpm run test:unit
pnpm run build
```

## Command and observation contracts

- `DEPOSIT { unitIds, buildingId }`: owned workers walk to an owned completed
  Castle and deposit their carried resources (Gold or Wood); the wire shape is
  validated by `isCommandMessage`.
- `SnapshotUnit.carrying?: boolean`: true while a worker holds cargo,
  independent of its front order.

## Project Structure

```text
packages/protocol/src/
├── index.ts
└── messages/
    ├── command.ts
    ├── error.ts
    ├── match.ts
    ├── snapshot.ts
    └── snapshot-guards.ts
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