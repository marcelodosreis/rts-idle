# Spec: Session Server

Module id: `session-server`

## Objective

Rooms with four slots, the Room lifecycle, match authority, WebSocket transport, filtered replication, reconnect, and replay recording. A single Node service.

## Commands

```bash
pnpm run test:integration
pnpm run test:e2e:focused tests/e2e/<target>.spec.ts --list
pnpm run test:e2e:focused tests/e2e/<target>.spec.ts
pnpm run build
```

## Project Structure

```text
apps/server/src/
├── transport/
├── rooms/
├── sessions/
├── replication/
├── replay/
├── observability/
└── main.ts
```

## Code Style

Server authority. Commands are validated on the server; never trust the client. Rate limiting and backpressure.

## Testing Strategy

`tests/integration/room-*.test.ts`, `tests/integration/command-transport.test.ts`, `tests/integration/replication.test.ts`, `tests/integration/reconnect.test.ts`, E2E. See master plan (phase 6).

## Boundaries

- Always: validate Origin, schemas, size, membership, ownership.
- Ask first: move authority to the browser; process persistence.
- Never: expose tokens in logs; enqueue without limits.

## Success Criteria

- State changes only on the server.
- A delta equals the filtered snapshot.
- Reconnect keeps the slot and ownership.

## Open Questions

None.
