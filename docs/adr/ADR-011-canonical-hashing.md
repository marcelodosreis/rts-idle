# ADR-011 — Hashing cadence and portable encoding

Status: Accepted

## Context

ADR-002 decided the canonical form: explicit-schema byte serialization hashed
with portable SHA-256 (rejecting `JSON.stringify`). Two operational questions
remained: how often to hash, and whether the encoder can rely on platform
`TextEncoder`.

## Decision

Builds on **ADR-002** (canonical schema + SHA-256) and adds:

- **Checkpoint hashing, not per-tick hashing.** State hashes are computed at
  checkpoints (every 100 ticks) plus the final state. Per-tick hashing is
  CPU-bound at scale (ADR-009: ~7.5 ms/call at 10k entities), which at 20 t/s
  would burn ~15% of a core for no benefit.
- **Portable UTF-8 codec.** The canonical encoder hand-rolls UTF-8 encode/decode
  instead of relying on `TextEncoder`/`TextDecoder`, keeping the simulation
  runtime-agnostic in environments that lack DOM APIs.
- Cross-runtime determinism is a standing verification: the same fixture must
  produce identical per-tick hashes in Node and Chromium.

## Alternatives

- **Hash every tick** — rejected: cost at scale with no benefit at 20 t/s.
- **Use platform `TextEncoder`** — rejected: couples the portable core to a DOM
  API; the hand-rolled codec is deterministic and dependency-free.

## Consequences

- Checkpoint cadence is part of the replay format; divergence is located by
  re-executing between the last valid checkpoint and the first mismatch
  (ADR-006, master plan §19.4).
- The canonical schema remains versioned; changes require a version bump
  (ADR-006).

## Evidence

- `tests/e2e/determinism-browser.spec.ts` — Node ≡ Chromium, identical per-tick
  hashes (5 seeds × 400 ticks).
- `pnpm run benchmark` hash-cost column (~7.5 ms @10k).
- `packages/simulation/src/canonical/encoder.ts`, `snapshot/serialize.ts`.