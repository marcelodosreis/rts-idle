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

## Connection runtime lifecycle

The current transport (`apps/server/src/transport/client-connection.ts`) owns
one runtime per match and enforces:

- A running match advances one authoritative tick every `TICK_MS` (50 ms) and
  publishes snapshots/deltas through `SnapshotSender`.
- Disconnecting a running match keeps its authoritative ticker and runtime alive
  indefinitely by default (`DISCONNECTED_MATCH_RETENTION_MS = null`); reconnecting
  with the resume token rebinds the runtime. Deployments may configure a finite
  disconnected retention policy.
- A resume request must present the same canonical configuration fingerprint
  (scenario id, aggression, and map identity) that created the runtime.
  A mismatch is rejected with `resume configuration mismatch`; the client
  clears the token and performs one fresh handshake instead of silently
  resuming the wrong match.
- When a session reaches `FINISHED`, the ticker stops, the terminal state is
  published once, and the runtime stays resumable for
  `TERMINAL_RETENTION_MS` (60 s). A disconnect timer armed before the finish is
  cancelled so only the terminal policy controls the lifetime.
- At retention expiry the runtime is removed from the registry, every timer is
  cleared, and the connected socket is detached: it keeps its last snapshot but
  can no longer request resyncs or submit commands, and its resume token is
  rejected. Disposal is idempotent.
- An expired or unknown resume token is rejected with `unknown resume token`.
- A valid `match_release` request disposes the matching runtime immediately and
  returns `match_release_result`; releasing an unknown token is idempotent and
  returns `released: false`.

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
